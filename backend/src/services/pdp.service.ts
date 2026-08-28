/**
 * PDP create / draft / dual-review / assignment workflow.
 * A supervisor may save drafts with fewer than 40 goals, but cannot submit
 * until at least 40 goals exist. Assignment is blocked until both the
 * employee and HR have approved.
 */
import {
  MeetingStatus,
  NotificationType,
  PdpEvidenceKind,
  PdpEvidenceStatus,
  PdpGoalStatus,
  PdpReviewKind,
  PdpStatus,
  Prisma,
  Role,
} from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/errors.js";
import { createNotification, notifyAllHrUsers } from "./notification.service.js";
import { createOtherMeeting, ensureFollowUpMeetingsForEmployee } from "./meeting.service.js";
import {
  MIN_PDP_GOALS,
  type CreatePdpInput,
  type PdpListQuery,
  type SavePdpDraftInput,
  type UpdateGoalProgressInput,
} from "../validations/pdp.validation.js";
import { evidenceFilePath } from "../lib/uploads.js";
import fs from "node:fs";

const SUPERVISOR_EDITABLE: PdpStatus[] = [
  PdpStatus.DRAFT,
  PdpStatus.CHANGES_REQUESTED_BY_EMPLOYEE,
  PdpStatus.CHANGES_REQUESTED_BY_HR,
  PdpStatus.UNDER_SUPERVISOR_REVISION,
  PdpStatus.PENDING_HR_INTERVENTION,
];

function hrReviewLabel(pdp: { status: PdpStatus; hrReviewedAt: Date | null }) {
  if (pdp.hrReviewedAt) return "Approved";
  if (pdp.status === PdpStatus.CHANGES_REQUESTED_BY_HR) return "Changes Requested";
  if (
    pdp.status === PdpStatus.SUBMITTED ||
    pdp.status === PdpStatus.PENDING_HR_REVIEW ||
    pdp.status === PdpStatus.PENDING_HR_INTERVENTION
  ) {
    return "Waiting";
  }
  return "Not Started";
}

function pdpBucket(pdp: { status: PdpStatus; employeeAgreedAt: Date | null; hrReviewedAt: Date | null }) {
  if (pdp.status === PdpStatus.DRAFT) return "draft";
  if (pdp.status === PdpStatus.COMPLETED) return "completed";
  if (
    pdp.status === PdpStatus.APPROVED ||
    pdp.status === PdpStatus.ASSIGNED ||
    pdp.status === PdpStatus.READY_FOR_ASSIGNMENT
  ) {
    return "approved";
  }
  if (
    pdp.status === PdpStatus.CHANGES_REQUESTED ||
    pdp.status === PdpStatus.CHANGES_REQUESTED_BY_EMPLOYEE ||
    pdp.status === PdpStatus.CHANGES_REQUESTED_BY_HR ||
    pdp.status === PdpStatus.UNDER_SUPERVISOR_REVISION
  ) {
    return "changes_requested";
  }
  if (!pdp.employeeAgreedAt) return "waiting_employee";
  if (!pdp.hrReviewedAt) return "waiting_hr";
  return "approved";
}

function progressPercent(goals: Array<{ progress: number }>) {
  if (goals.length === 0) return 0;
  return Math.round(goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length);
}

function displayStatus(pdp: {
  status: PdpStatus;
  employeeAgreedAt: Date | null;
  hrReviewedAt: Date | null;
}) {
  if (pdp.status === PdpStatus.SUBMITTED || pdp.status === PdpStatus.PENDING_EMPLOYEE_REVIEW || pdp.status === PdpStatus.PENDING_HR_REVIEW) {
    const waiting = [];
    if (!pdp.employeeAgreedAt) waiting.push("Waiting for Employee Evaluation");
    if (!pdp.hrReviewedAt) waiting.push("Waiting for HR Evaluation");
    return waiting.join(" · ") || "Submitted";
  }
  const labels: Record<PdpStatus, string> = {
    DRAFT: "Draft",
    SUBMITTED: "Submitted",
    APPROVED: "Approved",
    REJECTED: "Rejected",
    PENDING_HR_REVIEW: "Waiting for HR Evaluation",
    PENDING_EMPLOYEE_REVIEW: "Waiting for Employee Evaluation",
    CHANGES_REQUESTED: "Update Required",
    UNDER_SUPERVISOR_REVISION: "Update Required",
    PENDING_EMPLOYEE_REREVIEW: "Waiting for Employee Evaluation",
    PENDING_HR_INTERVENTION: "Redirected to HR",
    CHANGES_REQUESTED_BY_HR: "HR Changes Requested",
    CHANGES_REQUESTED_BY_EMPLOYEE: "Employee Changes Requested",
    READY_FOR_ASSIGNMENT: "Ready for Assignment",
    ASSIGNED: "Assigned",
    COMPLETED: "Completed",
  };
  return labels[pdp.status] ?? pdp.status;
}

const pdpInclude = {
  employee: {
    select: {
      id: true,
      employeeId: true,
      name: true,
      jobTitle: true,
      department: { select: { id: true, name: true } },
    },
  },
  supervisor: { select: { id: true, employeeId: true, name: true } },
  cycle: { select: { id: true, name: true, status: true, startDate: true, endDate: true } },
  batch: { select: { id: true, name: true, batchNumber: true } },
  goals: { orderBy: { sortOrder: "asc" as const } },
  evidence: {
    orderBy: { createdAt: "desc" as const },
    include: {
      uploadedBy: { select: { id: true, employeeId: true, name: true } },
      goal: { select: { id: true, title: true } },
    },
  },
  PdpReviewComment: {
    orderBy: { createdAt: "desc" as const },
    include: {
      Employee: { select: { id: true, employeeId: true, name: true, role: true } },
    },
  },
  Meeting_PersonalDevelopmentPlan_disagreementMeetingIdToMeeting: {
    select: { id: true, title: true, status: true, scheduledAt: true, location: true },
  },
} as const;

function serializePdp(
  pdp: {
    id: string;
    status: PdpStatus;
    summary: string | null;
    employeeId: string;
    supervisorId: string | null;
    cycleId: string;
    batchId: string;
    createdAt: Date;
    updatedAt: Date;
    employeeAgreedAt: Date | null;
    hrReviewedAt: Date | null;
    approvedAt: Date | null;
    assignedAt: Date | null;
    employeeChangeRequest: string | null;
    hrChangeRequest: string | null;
    redirectedReason: string | null;
    employee: {
      id: string;
      employeeId: string;
      name: string;
      jobTitle: string | null;
      department: { id: string; name: string } | null;
    };
    supervisor: { id: string; employeeId: string; name: string } | null;
    cycle: { id: string; name: string; status: string; startDate?: Date; endDate?: Date };
    batch: { id: string; name: string; batchNumber: number };
    goals: Array<{
      id: string;
      title: string;
      objective: string;
      expectedOutcome: string | null;
      developmentArea: string | null;
      measurementKpi: string | null;
      successCriteria: string | null;
      notes: string | null;
      category: string | null;
      priority: string;
      weightage: number;
      dueDate: Date | null;
      startDate?: Date | null;
      progress: number;
      status: string;
      progressComments?: string | null;
      sortOrder: number;
    }>;
    evidence?: Array<{
      id: string;
      fileName: string;
      storedName: string;
      mimeType: string;
      kind: string;
      status: string;
      createdAt: Date;
      goalId: string;
      uploadedBy: { id: string; employeeId: string; name: string };
      goal: { id: string; title: string };
    }>;
    PdpReviewComment: Array<{
      id: string;
      kind: string;
      message: string;
      createdAt: Date;
      Employee: { id: string; employeeId: string; name: string; role: string };
    }>;
    Meeting_PersonalDevelopmentPlan_disagreementMeetingIdToMeeting: {
      id: string;
      title: string;
      status: string;
      scheduledAt: Date;
      location: string | null;
    } | null;
  },
  viewerRole: Role
) {
  const goalCount = pdp.goals.length;
  const canEdit =
    viewerRole === Role.SUPERVISOR && SUPERVISOR_EDITABLE.includes(pdp.status);
  const canSubmit =
    canEdit && goalCount >= MIN_PDP_GOALS && pdp.status !== PdpStatus.PENDING_HR_INTERVENTION;
  const canAssign =
    viewerRole === Role.SUPERVISOR &&
    (pdp.status === PdpStatus.READY_FOR_ASSIGNMENT ||
      (Boolean(pdp.employeeAgreedAt) && Boolean(pdp.hrReviewedAt) && pdp.status !== PdpStatus.ASSIGNED && pdp.status !== PdpStatus.COMPLETED));
  const canEmployeeReview =
    viewerRole === Role.EMPLOYEE &&
    !pdp.employeeAgreedAt &&
    (pdp.status === PdpStatus.SUBMITTED ||
      pdp.status === PdpStatus.PENDING_EMPLOYEE_REVIEW ||
      pdp.status === PdpStatus.PENDING_EMPLOYEE_REREVIEW);
  const canHrReview =
    viewerRole === Role.HR &&
    !pdp.hrReviewedAt &&
    (pdp.status === PdpStatus.SUBMITTED ||
      pdp.status === PdpStatus.PENDING_HR_REVIEW ||
      pdp.status === PdpStatus.PENDING_HR_INTERVENTION);
  const canRedirect =
    viewerRole === Role.SUPERVISOR &&
    pdp.status === PdpStatus.CHANGES_REQUESTED_BY_EMPLOYEE;
  const assigned =
    pdp.status === PdpStatus.ASSIGNED || pdp.status === PdpStatus.COMPLETED;
  const canUpdateProgress = viewerRole === Role.EMPLOYEE && assigned;
  const canUploadEvidence =
    (viewerRole === Role.EMPLOYEE && assigned) ||
    (viewerRole === Role.SUPERVISOR && Boolean(pdp.supervisorId));
  const daysRemaining = pdp.cycle.endDate
    ? Math.max(0, Math.ceil((new Date(pdp.cycle.endDate).getTime() - Date.now()) / 86_400_000))
    : null;

  return {
    id: pdp.id,
    status: pdp.status,
    displayStatus: displayStatus(pdp),
    bucket: pdpBucket(pdp),
    hrReviewStatus: hrReviewLabel(pdp),
    progressPercent: progressPercent(pdp.goals),
    daysRemaining,
    summary: pdp.summary,
    employee: pdp.employee,
    supervisor: pdp.supervisor,
    cycle: pdp.cycle,
    batch: pdp.batch,
    goalCount,
    minGoals: MIN_PDP_GOALS,
    canSubmitGoals: goalCount >= MIN_PDP_GOALS,
    employeeAgreedAt: pdp.employeeAgreedAt,
    hrReviewedAt: pdp.hrReviewedAt,
    approvedAt: pdp.approvedAt,
    assignedAt: pdp.assignedAt,
    employeeChangeRequest: pdp.employeeChangeRequest,
    hrChangeRequest: pdp.hrChangeRequest,
    redirectedReason: pdp.redirectedReason,
    disagreementMeeting: pdp.Meeting_PersonalDevelopmentPlan_disagreementMeetingIdToMeeting,
    goals: pdp.goals,
    evidence: (pdp.evidence ?? []).map((item) => ({
      id: item.id,
      fileName: item.fileName,
      storedName: item.storedName,
      mimeType: item.mimeType,
      kind: item.kind,
      status: item.status,
      createdAt: item.createdAt,
      goalId: item.goalId,
      relatedGoal: item.goal.title,
      uploadedBy: item.uploadedBy,
    })),
    comments: pdp.PdpReviewComment.map((item) => ({
      id: item.id,
      kind: item.kind,
      message: item.message,
      createdAt: item.createdAt,
      author: item.Employee,
    })),
    createdAt: pdp.createdAt,
    updatedAt: pdp.updatedAt,
    actions: {
      canEdit,
      canSubmit,
      canAssign,
      canEmployeeReview,
      canHrReview,
      canRedirect,
      canUpdateProgress,
      canUploadEvidence,
    },
  };
}

async function requireUser(userId: string) {
  const user = await prisma.employee.findUnique({
    where: { id: userId },
    select: { id: true, role: true, name: true, employeeId: true },
  });
  if (!user) throw new AppError("Authentication required", 401);
  return user;
}

async function getActiveCycle() {
  return prisma.appraisalCycle.findFirst({
    where: { status: "ACTIVE" },
    include: { batches: { orderBy: { batchNumber: "asc" } } },
  });
}

async function assertTeamMember(supervisorId: string, employeeId: string, cycleId: string) {
  const assigned = await prisma.employeeSupervisorAssignment.findFirst({
    where: { cycleId, supervisorId, employeeId },
  });
  if (!assigned) throw new AppError("This employee is not assigned to your team", 403);
}

async function loadPdp(pdpId: string) {
  const pdp = await prisma.personalDevelopmentPlan.findUnique({
    where: { id: pdpId },
    include: pdpInclude,
  });
  if (!pdp) throw new AppError("PDP not found", 404);
  return pdp;
}

function assertCanView(
  pdp: { employeeId: string; supervisorId: string | null },
  user: { id: string; role: Role }
) {
  if (user.role === Role.HR || user.role === Role.LEADERSHIP) return;
  if (user.role === Role.EMPLOYEE && pdp.employeeId === user.id) return;
  if (user.role === Role.SUPERVISOR && pdp.supervisorId === user.id) return;
  throw new AppError("You do not have access to this PDP", 403);
}

async function replaceGoals(
  pdpId: string,
  goals: SavePdpDraftInput["goals"]
) {
  await prisma.$transaction([
    prisma.pdpGoal.deleteMany({ where: { pdpId } }),
    prisma.pdpGoal.createMany({
      data: goals.map((goal, index) => ({
        pdpId,
        title: goal.title,
        objective: goal.objective,
        expectedOutcome: goal.expectedOutcome ?? null,
        developmentArea: goal.developmentArea ?? null,
        measurementKpi: goal.measurementKpi ?? null,
        successCriteria: goal.successCriteria ?? null,
        notes: goal.notes ?? null,
        category: goal.category ?? null,
        priority: goal.priority ?? "MEDIUM",
        weightage: goal.weightage ?? 0,
        dueDate: goal.dueDate ?? null,
        startDate: goal.startDate ?? null,
        sortOrder: goal.sortOrder ?? index,
      })),
    }),
  ]);
}

export async function listPdps(userId: string, query: PdpListQuery = {}) {
  const user = await requireUser(userId);
  const cycle = query.cycleId
    ? await prisma.appraisalCycle.findUnique({ where: { id: query.cycleId } })
    : await getActiveCycle();
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 50;
  const where: Prisma.PersonalDevelopmentPlanWhereInput = {
    ...(cycle ? { cycleId: cycle.id } : {}),
  };

  if (user.role === Role.EMPLOYEE) where.employeeId = user.id;
  else if (user.role === Role.SUPERVISOR) where.supervisorId = user.id;
  if (query.employeeId && user.role !== Role.EMPLOYEE) where.employeeId = query.employeeId;
  if (query.search) {
    where.employee = {
      OR: [
        { name: { contains: query.search, mode: "insensitive" } },
        { employeeId: { contains: query.search, mode: "insensitive" } },
      ],
    };
  }

  const statsWhere: Prisma.PersonalDevelopmentPlanWhereInput = { ...where };
  if (query.status === "draft") where.status = PdpStatus.DRAFT;
  else if (query.status === "completed") where.status = PdpStatus.COMPLETED;
  else if (query.status === "approved") {
    where.status = {
      in: [PdpStatus.APPROVED, PdpStatus.ASSIGNED, PdpStatus.READY_FOR_ASSIGNMENT],
    };
  } else if (query.status === "waiting_employee") {
    where.employeeAgreedAt = null;
    where.status = {
      in: [PdpStatus.SUBMITTED, PdpStatus.PENDING_EMPLOYEE_REVIEW, PdpStatus.PENDING_EMPLOYEE_REREVIEW],
    };
  } else if (query.status === "waiting_hr") {
    where.hrReviewedAt = null;
    where.status = {
      in: [PdpStatus.SUBMITTED, PdpStatus.PENDING_HR_REVIEW, PdpStatus.PENDING_HR_INTERVENTION],
    };
  } else if (query.status && query.status !== "all") {
    where.status = query.status as PdpStatus;
  }

  const [total, rows, statsRows] = await Promise.all([
    prisma.personalDevelopmentPlan.count({ where }),
    prisma.personalDevelopmentPlan.findMany({
      where,
      include: pdpInclude,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.personalDevelopmentPlan.findMany({
      where: statsWhere,
      select: { status: true, employeeAgreedAt: true, hrReviewedAt: true },
    }),
  ]);

  const stats = {
    all: statsRows.length,
    draft: 0,
    waitingEmployee: 0,
    waitingHr: 0,
    approved: 0,
    completed: 0,
    changesRequested: 0,
  };
  for (const row of statsRows) {
    const bucket = pdpBucket(row);
    if (bucket === "draft") stats.draft += 1;
    else if (bucket === "waiting_employee") stats.waitingEmployee += 1;
    else if (bucket === "waiting_hr") stats.waitingHr += 1;
    else if (bucket === "approved") stats.approved += 1;
    else if (bucket === "completed") stats.completed += 1;
    else if (bucket === "changes_requested") stats.changesRequested += 1;
  }

  let team: Array<{
    id: string;
    employeeId: string;
    name: string;
    jobTitle: string | null;
    department: { id: string; name: string } | null;
    pdp: ReturnType<typeof serializePdp> | null;
  }> = [];

  if (user.role === Role.SUPERVISOR && cycle) {
    const members = await prisma.employeeSupervisorAssignment.findMany({
      where: { cycleId: cycle.id, supervisorId: user.id, employee: { role: Role.EMPLOYEE } },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            name: true,
            jobTitle: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { employee: { name: "asc" } },
    });
    const byEmployee = new Map(rows.map((row) => [row.employeeId, row]));
    const extraIds = members
      .map((m) => m.employee.id)
      .filter((id) => !byEmployee.has(id));
    const extraPdps =
      extraIds.length > 0
        ? await prisma.personalDevelopmentPlan.findMany({
            where: { cycleId: cycle.id, employeeId: { in: extraIds } },
            include: pdpInclude,
          })
        : [];
    for (const pdp of extraPdps) byEmployee.set(pdp.employeeId, pdp);
    team = members.map((row) => ({
      ...row.employee,
      pdp: byEmployee.has(row.employee.id)
        ? serializePdp(byEmployee.get(row.employee.id) as Parameters<typeof serializePdp>[0], user.role)
        : null,
    }));
  }

  return {
    cycle: cycle ? { id: cycle.id, name: cycle.name, status: cycle.status } : null,
    stats,
    pdps: rows.map((row) => serializePdp(row, user.role)),
    team,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize) || 1),
  };
}

export async function getPdp(userId: string, pdpId: string) {
  const user = await requireUser(userId);
  const pdp = await loadPdp(pdpId);
  assertCanView(pdp, user);
  return serializePdp(pdp, user.role);
}

export async function getMyPdp(userId: string) {
  const user = await requireUser(userId);
  if (user.role !== Role.EMPLOYEE) throw new AppError("Only employees use My PDP", 403);
  const cycle = await getActiveCycle();
  if (!cycle) return { pdp: null, cycle: null };
  const pdp = await prisma.personalDevelopmentPlan.findUnique({
    where: { cycleId_employeeId: { cycleId: cycle.id, employeeId: user.id } },
    include: pdpInclude,
  });
  return {
    cycle: { id: cycle.id, name: cycle.name, status: cycle.status },
    pdp: pdp ? serializePdp(pdp, user.role) : null,
  };
}

export async function createPdp(userId: string, input: CreatePdpInput) {
  const user = await requireUser(userId);
  if (user.role !== Role.SUPERVISOR) throw new AppError("Only supervisors can create a PDP", 403);
  const cycle = await getActiveCycle();
  if (!cycle) throw new AppError("There is no active appraisal cycle", 400);
  await assertTeamMember(user.id, input.employeeId, cycle.id);

  const existing = await prisma.personalDevelopmentPlan.findUnique({
    where: { cycleId_employeeId: { cycleId: cycle.id, employeeId: input.employeeId } },
  });
  if (existing) throw new AppError("This employee already has a PDP for the current cycle", 400);

  const assignment = await prisma.employeeBatchAssignment.findUnique({
    where: { cycleId_employeeId: { cycleId: cycle.id, employeeId: input.employeeId } },
  });
  if (!assignment) throw new AppError("Assign the employee to a batch before creating a PDP", 400);

  const planningMeeting = await prisma.meeting.findFirst({
    where: {
      employeeId: input.employeeId,
      cycleId: cycle.id,
      type: "PERFORMANCE_PLANNING",
      status: MeetingStatus.COMPLETED,
    },
    select: { id: true },
  });

  const created = await prisma.personalDevelopmentPlan.create({
    data: {
      employeeId: input.employeeId,
      supervisorId: user.id,
      createdById: user.id,
      cycleId: cycle.id,
      batchId: assignment.batchId,
      status: PdpStatus.DRAFT,
      summary: input.summary ?? null,
      planningMeetingId: planningMeeting?.id ?? null,
      goals: {
        create: (input.goals ?? []).map((goal, index) => ({
          title: goal.title,
          objective: goal.objective,
          expectedOutcome: goal.expectedOutcome ?? null,
          developmentArea: goal.developmentArea ?? null,
          measurementKpi: goal.measurementKpi ?? null,
          successCriteria: goal.successCriteria ?? null,
          notes: goal.notes ?? null,
          category: goal.category ?? null,
          priority: goal.priority ?? "MEDIUM",
          weightage: goal.weightage ?? 0,
          dueDate: goal.dueDate ?? null,
          startDate: goal.startDate ?? null,
          sortOrder: goal.sortOrder ?? index,
        })),
      },
    },
    include: pdpInclude,
  });

  return serializePdp(created, user.role);
}

export async function savePdpDraft(userId: string, pdpId: string, input: SavePdpDraftInput) {
  const user = await requireUser(userId);
  if (user.role !== Role.SUPERVISOR) throw new AppError("Only supervisors can update a PDP draft", 403);
  const pdp = await loadPdp(pdpId);
  if (pdp.supervisorId !== user.id) throw new AppError("You can only edit PDPs for your team", 403);
  if (!SUPERVISOR_EDITABLE.includes(pdp.status)) {
    throw new AppError("This PDP cannot be edited in its current status", 400);
  }

  await prisma.personalDevelopmentPlan.update({
    where: { id: pdpId },
    data: {
      summary: input.summary ?? pdp.summary,
      status:
        pdp.status === PdpStatus.DRAFT
          ? PdpStatus.DRAFT
          : PdpStatus.UNDER_SUPERVISOR_REVISION,
    },
  });
  await replaceGoals(pdpId, input.goals);
  const updated = await loadPdp(pdpId);
  return serializePdp(updated, user.role);
}

export async function submitPdp(userId: string, pdpId: string) {
  const user = await requireUser(userId);
  if (user.role !== Role.SUPERVISOR) throw new AppError("Only the supervisor can submit a PDP", 403);
  const pdp = await loadPdp(pdpId);
  if (pdp.supervisorId !== user.id) throw new AppError("You can only submit PDPs for your team", 403);
  if (pdp.goals.length < MIN_PDP_GOALS) {
    throw new AppError(`A PDP needs at least ${MIN_PDP_GOALS} goals before it can be submitted`, 400);
  }
  if (!SUPERVISOR_EDITABLE.includes(pdp.status) && pdp.status !== PdpStatus.UNDER_SUPERVISOR_REVISION) {
    throw new AppError("This PDP cannot be submitted in its current status", 400);
  }

  const updated = await prisma.personalDevelopmentPlan.update({
    where: { id: pdpId },
    data: {
      status: PdpStatus.SUBMITTED,
      employeeAgreedAt: null,
      hrReviewedAt: null,
    },
    include: pdpInclude,
  });

  await Promise.all([
    createNotification({
      type: NotificationType.PDP_SUBMITTED,
      title: "PDP submitted for review",
      message: `${user.name} submitted a PDP for ${pdp.employee.name}. Please review the goals and approve or request changes.`,
      recipientId: pdp.employeeId,
      subjectEmployeeId: pdp.employeeId,
      metadata: { pdpId },
    }),
    notifyAllHrUsers({
      type: NotificationType.PDP_SUBMITTED,
      title: "PDP submitted for review",
      message: `${user.name} submitted a PDP for ${pdp.employee.name}. Please review it in PDP Management.`,
      subjectEmployeeId: pdp.employeeId,
      metadata: { pdpId },
    }),
  ]);

  await prisma.employeeCycleProgress.upsert({
    where: { cycleId_employeeId: { cycleId: pdp.cycleId, employeeId: pdp.employeeId } },
    create: {
      employeeId: pdp.employeeId,
      cycleId: pdp.cycleId,
      batchId: pdp.batchId,
      currentStage: "PDP_CREATION",
      pdpCreatedAt: new Date(),
      pdpSentAt: new Date(),
    },
    update: { pdpSentAt: new Date() },
  });

  return serializePdp(updated, user.role);
}

async function maybeMarkReady(pdpId: string) {
  const pdp = await prisma.personalDevelopmentPlan.findUnique({ where: { id: pdpId } });
  if (!pdp?.employeeAgreedAt || !pdp.hrReviewedAt) return pdp;
  return prisma.personalDevelopmentPlan.update({
    where: { id: pdpId },
    data: {
      status: PdpStatus.READY_FOR_ASSIGNMENT,
      approvedAt: new Date(),
    },
  });
}

export async function employeeReviewPdp(
  userId: string,
  pdpId: string,
  decision: "APPROVE" | "REQUEST_CHANGES",
  message?: string
) {
  const user = await requireUser(userId);
  const pdp = await loadPdp(pdpId);
  if (user.role !== Role.EMPLOYEE || pdp.employeeId !== user.id) {
    throw new AppError("You can only review your own PDP", 403);
  }
  if (pdp.employeeAgreedAt) throw new AppError("You have already approved this PDP", 400);

  if (decision === "APPROVE") {
    await prisma.personalDevelopmentPlan.update({
      where: { id: pdpId },
      data: {
        employeeAgreedAt: new Date(),
        employeeChangeRequest: null,
        status: pdp.hrReviewedAt ? PdpStatus.READY_FOR_ASSIGNMENT : PdpStatus.SUBMITTED,
      },
    });
    await prisma.pdpReviewComment.create({
      data: {
        pdpId,
        authorId: user.id,
        kind: PdpReviewKind.EMPLOYEE_AGREEMENT,
        message: message?.trim() || "Employee approved the PDP.",
      },
    });
    await maybeMarkReady(pdpId);
    if (pdp.supervisorId) {
      await createNotification({
        type: NotificationType.PDP_EMPLOYEE_RESPONSE,
        title: "Employee approved the PDP",
        message: `${pdp.employee.name} approved their PDP.`,
        recipientId: pdp.supervisorId,
        subjectEmployeeId: pdp.employeeId,
        metadata: { pdpId },
      });
    }
  } else {
    if (!message || message.trim().length < 8) {
      throw new AppError("Describe the changes you are requesting", 400);
    }
    await prisma.personalDevelopmentPlan.update({
      where: { id: pdpId },
      data: {
        status: PdpStatus.CHANGES_REQUESTED_BY_EMPLOYEE,
        employeeAgreedAt: null,
        employeeChangeRequest: message.trim(),
      },
    });
    await prisma.pdpReviewComment.create({
      data: {
        pdpId,
        authorId: user.id,
        kind: PdpReviewKind.EMPLOYEE_CHANGE_REQUEST,
        message: message.trim(),
      },
    });
    if (pdp.supervisorId) {
      await createNotification({
        type: NotificationType.PDP_CHANGES_REQUESTED,
        title: "Employee requested PDP changes",
        message: `${pdp.employee.name} requested changes to their PDP: ${message.trim()}`,
        recipientId: pdp.supervisorId,
        subjectEmployeeId: pdp.employeeId,
        metadata: { pdpId },
      });
    }
  }

  return serializePdp(await loadPdp(pdpId), user.role);
}

export async function hrReviewPdp(
  userId: string,
  pdpId: string,
  decision: "APPROVE" | "REQUEST_CHANGES",
  message?: string
) {
  const user = await requireUser(userId);
  if (user.role !== Role.HR) throw new AppError("Only HR can complete this review", 403);
  const pdp = await loadPdp(pdpId);

  if (decision === "APPROVE") {
    await prisma.personalDevelopmentPlan.update({
      where: { id: pdpId },
      data: {
        hrReviewedAt: new Date(),
        hrChangeRequest: null,
        redirectedReason: null,
        status: pdp.employeeAgreedAt ? PdpStatus.READY_FOR_ASSIGNMENT : PdpStatus.SUBMITTED,
      },
    });
    await prisma.pdpReviewComment.create({
      data: {
        pdpId,
        authorId: user.id,
        kind: PdpReviewKind.HR_SUGGESTION,
        message: message?.trim() || "HR approved the PDP.",
      },
    });
    await maybeMarkReady(pdpId);
    if (pdp.supervisorId) {
      await createNotification({
        type: NotificationType.PDP_HR_FEEDBACK,
        title: "HR approved the PDP",
        message: `HR approved the PDP for ${pdp.employee.name}.`,
        recipientId: pdp.supervisorId,
        subjectEmployeeId: pdp.employeeId,
        metadata: { pdpId },
      });
    }
  } else {
    if (!message || message.trim().length < 8) {
      throw new AppError("Describe the changes HR is requesting", 400);
    }
    await prisma.personalDevelopmentPlan.update({
      where: { id: pdpId },
      data: {
        status: PdpStatus.CHANGES_REQUESTED_BY_HR,
        hrReviewedAt: null,
        hrChangeRequest: message.trim(),
      },
    });
    await prisma.pdpReviewComment.create({
      data: {
        pdpId,
        authorId: user.id,
        kind: PdpReviewKind.HR_CHANGE_REQUEST,
        message: message.trim(),
      },
    });
    if (pdp.supervisorId) {
      await createNotification({
        type: NotificationType.PDP_CHANGES_REQUESTED,
        title: "HR requested PDP changes",
        message: `HR requested changes to the PDP for ${pdp.employee.name}: ${message.trim()}`,
        recipientId: pdp.supervisorId,
        subjectEmployeeId: pdp.employeeId,
        metadata: { pdpId },
      });
    }
  }

  return serializePdp(await loadPdp(pdpId), user.role);
}

export async function redirectPdpToHr(userId: string, pdpId: string, reason: string) {
  const user = await requireUser(userId);
  if (user.role !== Role.SUPERVISOR) throw new AppError("Only the supervisor can redirect a PDP issue", 403);
  const pdp = await loadPdp(pdpId);
  if (pdp.supervisorId !== user.id) throw new AppError("You can only redirect PDPs for your team", 403);
  if (pdp.status !== PdpStatus.CHANGES_REQUESTED_BY_EMPLOYEE) {
    throw new AppError("Redirect is only available after the employee requests changes", 400);
  }

  const scheduledAt = new Date();
  scheduledAt.setDate(scheduledAt.getDate() + 3);
  scheduledAt.setHours(5, 0, 0, 0);

  const meeting = await createOtherMeeting({
    employeeId: pdp.employeeId,
    supervisorId: user.id,
    createdById: user.id,
    cycleId: pdp.cycleId,
    batchId: pdp.batchId,
    title: `PDP Issue Meeting — ${pdp.employee.name}`,
    description: reason,
    scheduledAt,
  });

  await prisma.personalDevelopmentPlan.update({
    where: { id: pdpId },
    data: {
      status: PdpStatus.PENDING_HR_INTERVENTION,
      redirectedReason: reason,
      disagreementMeetingId: meeting.id,
    },
  });
  await prisma.pdpReviewComment.create({
    data: {
      pdpId,
      authorId: user.id,
      kind: PdpReviewKind.SUPERVISOR_REDIRECT,
      message: reason,
    },
  });

  await notifyAllHrUsers({
    type: NotificationType.PDP_REDIRECTED,
    title: "PDP issue redirected to HR",
    message: `${user.name} redirected a PDP change request for ${pdp.employee.name}. A meeting was created under Other Meetings.`,
    subjectEmployeeId: pdp.employeeId,
    metadata: { pdpId, meetingId: meeting.id },
  });

  return serializePdp(await loadPdp(pdpId), user.role);
}

export async function assignPdp(userId: string, pdpId: string) {
  const user = await requireUser(userId);
  if (user.role !== Role.SUPERVISOR) throw new AppError("Only the supervisor can assign a PDP", 403);
  const pdp = await loadPdp(pdpId);
  if (pdp.supervisorId !== user.id) throw new AppError("You can only assign PDPs for your team", 403);
  if (!pdp.employeeAgreedAt || !pdp.hrReviewedAt) {
    throw new AppError("Both the employee and HR must approve before the PDP can be assigned", 400);
  }

  const updated = await prisma.personalDevelopmentPlan.update({
    where: { id: pdpId },
    data: {
      status: PdpStatus.ASSIGNED,
      assignedAt: new Date(),
      approvedAt: pdp.approvedAt ?? new Date(),
      approvedById: user.id,
    },
    include: pdpInclude,
  });

  await prisma.employeeCycleProgress.upsert({
    where: { cycleId_employeeId: { cycleId: pdp.cycleId, employeeId: pdp.employeeId } },
    create: {
      employeeId: pdp.employeeId,
      cycleId: pdp.cycleId,
      batchId: pdp.batchId,
      currentStage: "PDP_APPROVED",
      pdpApprovedAt: new Date(),
    },
    update: {
      currentStage: "PDP_APPROVED",
      pdpApprovedAt: new Date(),
    },
  });

  await Promise.all([
    createNotification({
      type: NotificationType.PDP_ASSIGNED,
      title: "PDP assigned",
      message: `Your PDP for ${pdp.cycle.name} has been assigned.`,
      recipientId: pdp.employeeId,
      subjectEmployeeId: pdp.employeeId,
      metadata: { pdpId },
    }),
    notifyAllHrUsers({
      type: NotificationType.PDP_ASSIGNED,
      title: "PDP assigned",
      message: `The PDP for ${pdp.employee.name} has been assigned.`,
      subjectEmployeeId: pdp.employeeId,
      metadata: { pdpId },
    }),
  ]);

  if (pdp.supervisorId) {
    await ensureFollowUpMeetingsForEmployee({
      employeeId: pdp.employeeId,
      supervisorId: pdp.supervisorId,
      createdById: user.id,
      cycleId: pdp.cycleId,
      batchId: pdp.batchId,
      startDate: updated.assignedAt ?? new Date(),
    });
  }

  return serializePdp(updated, user.role);
}

export async function updateGoalProgress(
  userId: string,
  pdpId: string,
  goalId: string,
  input: UpdateGoalProgressInput
) {
  const user = await requireUser(userId);
  const pdp = await loadPdp(pdpId);
  assertCanView(pdp, user);
  if (user.role !== Role.EMPLOYEE || pdp.employeeId !== user.id) {
    throw new AppError("Only the employee can update goal progress", 403);
  }
  if (pdp.status !== PdpStatus.ASSIGNED && pdp.status !== PdpStatus.COMPLETED) {
    throw new AppError("Progress can be updated after the PDP is assigned", 400);
  }
  const goal = pdp.goals.find((item) => item.id === goalId);
  if (!goal) throw new AppError("Goal not found", 404);

  const nextStatus =
    input.status ??
    (input.progress >= 100
      ? PdpGoalStatus.COMPLETED
      : input.progress > 0
        ? PdpGoalStatus.IN_PROGRESS
        : PdpGoalStatus.NOT_STARTED);

  await prisma.pdpGoal.update({
    where: { id: goalId },
    data: {
      progress: input.progress,
      progressComments: input.notes ?? goal.progressComments,
      status: nextStatus,
    },
  });
  return serializePdp(await loadPdp(pdpId), user.role);
}

export async function addPdpEvidence(
  userId: string,
  pdpId: string,
  goalId: string,
  file: Express.Multer.File,
  kind: string
) {
  const user = await requireUser(userId);
  const pdp = await loadPdp(pdpId);
  assertCanView(pdp, user);
  if (user.role !== Role.EMPLOYEE || pdp.employeeId !== user.id) {
    throw new AppError("Only the employee can upload evidence for their PDP", 403);
  }
  if (pdp.status !== PdpStatus.ASSIGNED && pdp.status !== PdpStatus.COMPLETED) {
    throw new AppError("Evidence can be uploaded after the PDP is assigned", 400);
  }
  if (!pdp.goals.some((item) => item.id === goalId)) throw new AppError("Goal not found", 404);

  await prisma.pdpEvidence.create({
    data: {
      pdpId,
      goalId,
      uploadedById: user.id,
      fileName: file.originalname,
      storedName: file.filename,
      mimeType: file.mimetype,
      kind: (kind as PdpEvidenceKind) || PdpEvidenceKind.SUPPORTING,
      status: PdpEvidenceStatus.SUBMITTED,
    },
  });

  if (pdp.supervisorId) {
    await createNotification({
      type: NotificationType.PDP_EMPLOYEE_RESPONSE,
      title: "PDP evidence uploaded",
      message: `${pdp.employee.name} uploaded evidence for a PDP goal.`,
      recipientId: pdp.supervisorId,
      subjectEmployeeId: pdp.employeeId,
      metadata: { pdpId, goalId },
    });
  }

  return serializePdp(await loadPdp(pdpId), user.role);
}

export async function downloadPdpEvidence(userId: string, evidenceId: string) {
  const user = await requireUser(userId);
  const evidence = await prisma.pdpEvidence.findUnique({
    where: { id: evidenceId },
    include: { pdp: { select: { employeeId: true, supervisorId: true } } },
  });
  if (!evidence) throw new AppError("Evidence not found", 404);
  if (user.role === Role.EMPLOYEE && evidence.pdp.employeeId !== user.id) {
    throw new AppError("You do not have access to this file", 403);
  }
  if (user.role === Role.SUPERVISOR && evidence.pdp.supervisorId !== user.id) {
    throw new AppError("You do not have access to this file", 403);
  }
  const fullPath = evidenceFilePath(evidence.storedName);
  if (!fs.existsSync(fullPath)) throw new AppError("Evidence file not found", 404);
  return { fullPath, fileName: evidence.fileName };
}

export async function reviewPdpEvidence(userId: string, evidenceId: string) {
  const user = await requireUser(userId);
  if (user.role !== Role.SUPERVISOR && user.role !== Role.HR) {
    throw new AppError("Only a supervisor or HR can review evidence", 403);
  }
  const evidence = await prisma.pdpEvidence.findUnique({
    where: { id: evidenceId },
    include: { pdp: true },
  });
  if (!evidence) throw new AppError("Evidence not found", 404);
  if (user.role === Role.SUPERVISOR && evidence.pdp.supervisorId !== user.id) {
    throw new AppError("You can only review evidence for your team", 403);
  }
  await prisma.pdpEvidence.update({
    where: { id: evidenceId },
    data: { status: PdpEvidenceStatus.REVIEWED },
  });
  return serializePdp(await loadPdp(evidence.pdpId), user.role);
}
