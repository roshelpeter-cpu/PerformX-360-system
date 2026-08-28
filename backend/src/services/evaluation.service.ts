import {
  AwardType,
  EvaluationStatus,
  NotificationType,
  PeerReviewStatus,
  PipStatus,
  PromotionStatus,
  ReviewRequestStatus,
  Role,
} from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/errors.js";
import { createNotification, notifyAllHrUsers } from "./notification.service.js";

export const SCORE_WEIGHTS = { self: 0.2, peer: 0.2, supervisor: 0.6 } as const;

export function performanceBand(score: number) {
  if (score >= 90) return "Outstanding";
  if (score >= 80) return "Exceeds Expectations";
  if (score >= 70) return "Meets Expectations";
  if (score >= 60) return "Needs Improvement";
  return "PIP Required";
}

export function bonusForBand(band: string) {
  if (band === "Outstanding") return 150000;
  if (band === "Exceeds Expectations") return 80000;
  if (band === "Meets Expectations") return 30000;
  return 0;
}

function awardLabel(type: AwardType | null | undefined) {
  if (type === "EMPLOYEE_OF_THE_CYCLE") return "Employee of the Cycle";
  if (type === "OUTSTANDING_PERFORMANCE") return "Outstanding Performance Award";
  if (type === "EXCELLENCE") return "Excellence Award";
  return null;
}

async function requireUser(userId: string) {
  const user = await prisma.employee.findUnique({
    where: { id: userId },
    select: { id: true, role: true, name: true, employeeId: true },
  });
  if (!user) throw new AppError("Authentication required", 401);
  return user;
}

async function activeCycle() {
  const cycle = await prisma.appraisalCycle.findFirst({ where: { status: "ACTIVE" } });
  if (!cycle) throw new AppError("There is no active appraisal cycle", 400);
  return cycle;
}

function calcFinal(self?: number | null, peer?: number | null, supervisor?: number | null) {
  const s = self ?? 0;
  const p = peer ?? 0;
  const v = supervisor ?? 0;
  const score = Number((s * SCORE_WEIGHTS.self + p * SCORE_WEIGHTS.peer + v * SCORE_WEIGHTS.supervisor).toFixed(2));
  const band = performanceBand(score);
  const bonus = bonusForBand(band);
  return {
    finalScore: score,
    performanceBand: band,
    bonusEligible: bonus > 0,
    bonusAmount: bonus,
    breakdown: {
      self: { score: s, weight: SCORE_WEIGHTS.self, contribution: Number((s * SCORE_WEIGHTS.self).toFixed(2)) },
      peer: { score: p, weight: SCORE_WEIGHTS.peer, contribution: Number((p * SCORE_WEIGHTS.peer).toFixed(2)) },
      supervisor: { score: v, weight: SCORE_WEIGHTS.supervisor, contribution: Number((v * SCORE_WEIGHTS.supervisor).toFixed(2)) },
    },
  };
}

const evalInclude = {
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
  approvedBy: { select: { id: true, name: true, employeeId: true } },
  cycle: { select: { id: true, name: true, status: true } },
  batch: { select: { id: true, name: true, batchNumber: true } },
  peerAssignments: {
    include: { reviewer: { select: { id: true, employeeId: true, name: true } } },
    orderBy: { createdAt: "asc" as const },
  },
  pipPlan: { include: { goals: { orderBy: { sortOrder: "asc" as const } } } },
  reviewRequests: { orderBy: { createdAt: "desc" as const } },
} as const;

async function pdpSnapshot(employeeId: string, cycleId: string) {
  const pdp = await prisma.personalDevelopmentPlan.findUnique({
    where: { cycleId_employeeId: { cycleId, employeeId } },
    include: {
      goals: { orderBy: { sortOrder: "asc" }, include: { evidence: true, comments: true } },
    },
  });
  if (!pdp) return null;
  return {
    id: pdp.id,
    status: pdp.status,
    summary: pdp.summary,
    progressPercent:
      pdp.goals.length === 0
        ? 0
        : Math.round(pdp.goals.reduce((sum, goal) => sum + goal.progress, 0) / pdp.goals.length),
    goals: pdp.goals.map((goal) => ({
      id: goal.id,
      title: goal.title,
      objective: goal.objective,
      dueDate: goal.dueDate,
      progress: goal.progress,
      status: goal.status,
      evidenceCount: goal.evidence.length,
      comments: goal.comments.map((item) => item.message),
    })),
  };
}

function serialize(
  row: Awaited<ReturnType<typeof prisma.performanceEvaluation.findFirstOrThrow>> & {
    employee: { id: string; employeeId: string; name: string; jobTitle: string | null; department: { id: string; name: string } | null };
    supervisor: { id: string; employeeId: string; name: string } | null;
    approvedBy: { id: string; name: string; employeeId: string } | null;
    cycle: { id: string; name: string; status: string };
    batch: { id: string; name: string; batchNumber: number } | null;
    peerAssignments: Array<{
      id: string;
      status: PeerReviewStatus;
      score: number | null;
      comments: string | null;
      submittedAt: Date | null;
      reviewerId: string;
      reviewer: { id: string; employeeId: string; name: string };
    }>;
    pipPlan: {
      id: string;
      status: PipStatus;
      startDate: Date | null;
      endDate: Date | null;
      reviewPeriod: string | null;
      summary: string | null;
      assignedAt: Date | null;
      goals: Array<{ id: string; title: string; requiredActions: string; expectedOutcomes: string }>;
    } | null;
    reviewRequests: Array<{
      id: string;
      reason: string;
      comments: string | null;
      status: ReviewRequestStatus;
      hrResponse: string | null;
      createdAt: Date;
    }>;
  },
  viewer: { id: string; role: Role }
) {
  const hidePeers = viewer.role === Role.EMPLOYEE && viewer.id === row.employeeId;
  const submittedPeers = row.peerAssignments.filter((item) => item.status === "SUBMITTED");
  const totals = calcFinal(row.selfScore, row.peerScore, row.supervisorScore);
  return {
    id: row.id,
    status: row.status,
    employee: row.employee,
    supervisor: row.supervisor,
    cycle: row.cycle,
    batch: row.batch,
    selfOpenedAt: row.selfOpenedAt,
    selfScore: row.selfScore,
    selfComments: row.selfComments,
    selfGoalReviews: row.selfGoalReviews,
    selfSubmittedAt: row.selfSubmittedAt,
    peerScore: row.peerScore,
    peerSummary: row.peerSummary,
    peerCompletion: {
      total: row.peerAssignments.length,
      submitted: submittedPeers.length,
    },
    peers: hidePeers
      ? submittedPeers.map((item, index) => ({
          id: item.id,
          label: `Peer ${index + 1}`,
          score: item.score,
          comments: item.comments,
          submittedAt: item.submittedAt,
        }))
      : row.peerAssignments.map((item) => ({
          id: item.id,
          reviewerId: item.reviewer.id,
          reviewerName: item.reviewer.name,
          reviewerCode: item.reviewer.employeeId,
          status: item.status,
          score: item.score,
          comments: item.comments,
          submittedAt: item.submittedAt,
        })),
    supervisorScore: row.supervisorScore,
    supervisorComments: row.supervisorComments,
    strengths: row.strengths,
    improvementAreas: row.improvementAreas,
    developmentRecommendations: row.developmentRecommendations,
    promotionRecommended: row.promotionRecommended,
    supervisorSubmittedAt: row.supervisorSubmittedAt,
    hrComments: row.hrComments,
    hrApprovedAt: row.hrApprovedAt,
    approvedBy: row.approvedBy,
    ...totals,
    storedFinalScore: row.finalScore,
    storedBand: row.performanceBand,
    bonusEligible: row.status === "APPROVED" ? row.bonusEligible : totals.bonusEligible,
    bonusAmount: row.status === "APPROVED" ? row.bonusAmount : totals.bonusAmount,
    performanceBand: row.status === "APPROVED" ? row.performanceBand : totals.performanceBand,
    finalScore: row.status === "APPROVED" ? row.finalScore : totals.finalScore,
    promotionStatus: row.promotionStatus,
    awardType: row.awardType,
    awardLabel: awardLabel(row.awardType),
    awardConfirmed: row.awardConfirmed,
    pip: row.pipPlan,
    reviewRequests: row.reviewRequests,
    actions: {
      canOpenSelfReview: viewer.role === Role.HR && row.status === "NOT_STARTED",
      canSelfReview:
        viewer.role === Role.EMPLOYEE &&
        viewer.id === row.employeeId &&
        row.status === "SELF_REVIEW_PENDING",
      canAssignPeers: viewer.role === Role.HR && row.status !== "APPROVED",
      canSupervisorEvaluate:
        viewer.role === Role.SUPERVISOR &&
        row.supervisorId === viewer.id &&
        row.status === "SUPERVISOR_REVIEW_PENDING",
      canHrApprove: viewer.role === Role.HR && row.status === "WAITING_HR_REVIEW",
      canRequestReview: viewer.role === Role.EMPLOYEE && viewer.id === row.employeeId && row.status === "APPROVED",
    },
  };
}

async function ensureCycleEvaluations(cycleId: string) {
  const assignments = await prisma.employeeBatchAssignment.findMany({
    where: { cycleId, employee: { role: Role.EMPLOYEE } },
    select: { employeeId: true, batchId: true },
  });
  const supervisors = await prisma.employeeSupervisorAssignment.findMany({
    where: { cycleId },
    select: { employeeId: true, supervisorId: true },
  });
  const supervisorByEmployee = new Map(supervisors.map((row) => [row.employeeId, row.supervisorId]));
  if (!assignments.length) return;
  await prisma.performanceEvaluation.createMany({
    data: assignments.map((row) => ({
      employeeId: row.employeeId,
      cycleId,
      batchId: row.batchId,
      supervisorId: supervisorByEmployee.get(row.employeeId) ?? null,
    })),
    skipDuplicates: true,
  });
}

async function assertScope(
  user: { id: string; role: Role },
  evaluation: { employeeId: string; supervisorId: string | null }
) {
  if (user.role === Role.HR || user.role === Role.LEADERSHIP) return;
  if (user.role === Role.EMPLOYEE && evaluation.employeeId === user.id) return;
  if (user.role === Role.SUPERVISOR && evaluation.supervisorId === user.id) return;
  throw new AppError("You do not have access to this evaluation", 403);
}

export async function listEvaluations(
  userId: string,
  query: { status?: string; search?: string; page?: number; pageSize?: number } = {}
) {
  const user = await requireUser(userId);
  if (user.role === Role.EMPLOYEE) {
    return getMyEvaluation(userId).then((result) => ({
      cycle: result.evaluation?.cycle ?? null,
      stats: {
        all: result.evaluation ? 1 : 0,
        notStarted: 0,
        selfPending: 0,
        peerPending: 0,
        supervisorPending: 0,
        waitingHr: 0,
        approved: 0,
      },
      evaluations: result.evaluation ? [result.evaluation] : [],
      page: 1,
      pageSize: 25,
      total: result.evaluation ? 1 : 0,
      totalPages: 1,
    }));
  }
  const cycle = await activeCycle();
  await ensureCycleEvaluations(cycle.id);
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 25;
  const where: Record<string, unknown> = { cycleId: cycle.id };
  if (user.role === Role.SUPERVISOR) where.supervisorId = user.id;
  if (query.status && query.status !== "all") where.status = query.status;
  if (query.search) {
    where.employee = {
      OR: [
        { name: { contains: query.search, mode: "insensitive" } },
        { employeeId: { contains: query.search, mode: "insensitive" } },
      ],
    };
  }
  const [total, rows, statsRows] = await Promise.all([
    prisma.performanceEvaluation.count({ where }),
    prisma.performanceEvaluation.findMany({
      where,
      include: evalInclude,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.performanceEvaluation.groupBy({
      by: ["status"],
      where: {
        cycleId: cycle.id,
        ...(user.role === Role.SUPERVISOR ? { supervisorId: user.id } : {}),
      },
      _count: true,
    }),
  ]);
  const stats = {
    all: statsRows.reduce((sum, row) => sum + row._count, 0),
    notStarted: 0,
    selfPending: 0,
    peerPending: 0,
    supervisorPending: 0,
    waitingHr: 0,
    approved: 0,
  };
  for (const row of statsRows) {
    if (row.status === "NOT_STARTED") stats.notStarted = row._count;
    if (row.status === "SELF_REVIEW_PENDING") stats.selfPending = row._count;
    if (row.status === "PEER_REVIEW_PENDING") stats.peerPending = row._count;
    if (row.status === "SUPERVISOR_REVIEW_PENDING") stats.supervisorPending = row._count;
    if (row.status === "WAITING_HR_REVIEW") stats.waitingHr = row._count;
    if (row.status === "APPROVED") stats.approved = row._count;
  }
  return {
    cycle: { id: cycle.id, name: cycle.name },
    stats,
    evaluations: rows.map((row) => serialize(row, user)),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize) || 1),
  };
}

export async function getEvaluation(userId: string, evaluationId: string) {
  const user = await requireUser(userId);
  const row = await prisma.performanceEvaluation.findUnique({
    where: { id: evaluationId },
    include: evalInclude,
  });
  if (!row) throw new AppError("Evaluation not found", 404);
  await assertScope(user, row);
  return {
    evaluation: serialize(row, user),
    pdp: await pdpSnapshot(row.employeeId, row.cycleId),
  };
}

export async function getMyEvaluation(userId: string) {
  const user = await requireUser(userId);
  if (user.role !== Role.EMPLOYEE) throw new AppError("Only employees have a personal evaluation", 403);
  const cycle = await activeCycle();
  await ensureCycleEvaluations(cycle.id);
  const row = await prisma.performanceEvaluation.findUnique({
    where: { cycleId_employeeId: { cycleId: cycle.id, employeeId: user.id } },
    include: evalInclude,
  });
  return {
    evaluation: row ? serialize(row, user) : null,
    pdp: await pdpSnapshot(user.id, cycle.id),
  };
}

export async function openSelfReview(userId: string, evaluationId: string) {
  const user = await requireUser(userId);
  if (user.role !== Role.HR) throw new AppError("Only HR can open self-review", 403);
  const row = await prisma.performanceEvaluation.update({
    where: { id: evaluationId },
    data: { status: EvaluationStatus.SELF_REVIEW_PENDING, selfOpenedAt: new Date() },
    include: evalInclude,
  });
  await createNotification({
    type: NotificationType.SELF_REVIEW_OPENED,
    title: "Self review opened",
    message: `Your self-review for ${row.cycle.name} is now open.`,
    recipientId: row.employeeId,
    subjectEmployeeId: row.employeeId,
    metadata: { evaluationId },
  });
  return serialize(row, user);
}

export async function saveSelfReview(
  userId: string,
  evaluationId: string,
  input: { score: number; comments: string; goalReviews?: unknown; submit?: boolean }
) {
  const user = await requireUser(userId);
  const row = await prisma.performanceEvaluation.findUnique({ where: { id: evaluationId } });
  if (!row) throw new AppError("Evaluation not found", 404);
  if (user.role !== Role.EMPLOYEE || row.employeeId !== user.id) throw new AppError("You can only complete your own self-review", 403);
  if (row.status !== EvaluationStatus.SELF_REVIEW_PENDING) throw new AppError("Self-review is not open for editing", 400);
  const updated = await prisma.performanceEvaluation.update({
    where: { id: evaluationId },
    data: {
      selfScore: input.score,
      selfComments: input.comments,
      ...(input.goalReviews !== undefined ? { selfGoalReviews: input.goalReviews as object } : {}),
      selfDraftSavedAt: new Date(),
      ...(input.submit
        ? {
            selfSubmittedAt: new Date(),
            status: EvaluationStatus.PEER_REVIEW_PENDING,
          }
        : {}),
    } as never,
    include: evalInclude,
  });
  if (input.submit) {
    if (updated.supervisorId) {
      await createNotification({
        type: NotificationType.SELF_REVIEW_SUBMITTED,
        title: "Self-review submitted",
        message: `${updated.employee.name} submitted their self-review.`,
        recipientId: updated.supervisorId,
        subjectEmployeeId: updated.employeeId,
        metadata: { evaluationId },
      });
    }
    await notifyAllHrUsers({
      type: NotificationType.SELF_REVIEW_SUBMITTED,
      title: "Self-review submitted",
      message: `${updated.employee.name} submitted their self-review.`,
      subjectEmployeeId: updated.employeeId,
      metadata: { evaluationId },
    });
  }
  return serialize(updated, user);
}

export async function assignPeers(userId: string, evaluationId: string, reviewerIds: string[]) {
  const user = await requireUser(userId);
  if (user.role !== Role.HR) throw new AppError("Only HR can assign peer reviewers", 403);
  const evaluation = await prisma.performanceEvaluation.findUnique({ where: { id: evaluationId } });
  if (!evaluation) throw new AppError("Evaluation not found", 404);
  const unique = [...new Set(reviewerIds)].filter((id) => id !== evaluation.employeeId);
  await prisma.$transaction([
    prisma.peerReviewAssignment.deleteMany({ where: { evaluationId, status: PeerReviewStatus.PENDING } }),
    ...unique.map((reviewerId) =>
      prisma.peerReviewAssignment.upsert({
        where: { evaluationId_reviewerId: { evaluationId, reviewerId } },
        update: {},
        create: { evaluationId, reviewerId },
      })
    ),
  ]);
  for (const reviewerId of unique) {
    await createNotification({
      type: NotificationType.PEER_REVIEW_ASSIGNED,
      title: "Peer review assigned",
      message: "You have been assigned a confidential peer review.",
      recipientId: reviewerId,
      subjectEmployeeId: evaluation.employeeId,
      metadata: { evaluationId },
    });
  }
  const row = await prisma.performanceEvaluation.findUniqueOrThrow({ where: { id: evaluationId }, include: evalInclude });
  return serialize(row, user);
}

export async function listAssignedPeerReviews(userId: string) {
  const user = await requireUser(userId);
  const rows = await prisma.peerReviewAssignment.findMany({
    where: { reviewerId: user.id },
    include: { evaluation: { include: evalInclude } },
    orderBy: { createdAt: "desc" },
  });
  return {
    reviews: rows.map((item) => ({
      id: item.id,
      status: item.status,
      score: item.score,
      comments: item.comments,
      evaluationId: item.evaluationId,
      employee: item.evaluation.employee,
      cycle: item.evaluation.cycle,
    })),
  };
}

export async function submitPeerReview(
  userId: string,
  assignmentId: string,
  input: { score: number; comments: string }
) {
  const user = await requireUser(userId);
  const assignment = await prisma.peerReviewAssignment.findUnique({
    where: { id: assignmentId },
    include: { evaluation: true },
  });
  if (!assignment || assignment.reviewerId !== user.id) throw new AppError("Peer review not found", 404);
  if (assignment.status === PeerReviewStatus.SUBMITTED) throw new AppError("This peer review is already submitted", 400);
  await prisma.peerReviewAssignment.update({
    where: { id: assignmentId },
    data: { status: PeerReviewStatus.SUBMITTED, score: input.score, comments: input.comments, submittedAt: new Date() },
  });
  const all = await prisma.peerReviewAssignment.findMany({ where: { evaluationId: assignment.evaluationId } });
  const submitted = all.filter((item) => item.status === PeerReviewStatus.SUBMITTED);
  const peerScore =
    submitted.length === 0
      ? null
      : Number((submitted.reduce((sum, item) => sum + (item.score ?? 0), 0) / submitted.length).toFixed(2));
  const peerSummary = submitted.map((item, index) => `Peer ${index + 1}: ${item.comments ?? ""}`).join("\n");
  const allDone = submitted.length === all.length && all.length > 0;
  await prisma.performanceEvaluation.update({
    where: { id: assignment.evaluationId },
    data: {
      peerScore,
      peerSummary,
      ...(allDone && assignment.evaluation.status === EvaluationStatus.PEER_REVIEW_PENDING
        ? { status: EvaluationStatus.SUPERVISOR_REVIEW_PENDING }
        : {}),
    },
  });
  if (assignment.evaluation.supervisorId && allDone) {
    await createNotification({
      type: NotificationType.SUPERVISOR_EVALUATION_READY,
      title: "Supervisor evaluation ready",
      message: "Peer reviews are complete. You can now evaluate your team member.",
      recipientId: assignment.evaluation.supervisorId,
      subjectEmployeeId: assignment.evaluation.employeeId,
      metadata: { evaluationId: assignment.evaluationId },
    });
  }
  await notifyAllHrUsers({
    type: NotificationType.PEER_REVIEW_SUBMITTED,
    title: "Peer review submitted",
    message: "A peer review was submitted.",
    subjectEmployeeId: assignment.evaluation.employeeId,
    metadata: { evaluationId: assignment.evaluationId },
  });
  return listAssignedPeerReviews(userId);
}

export async function saveSupervisorEvaluation(
  userId: string,
  evaluationId: string,
  input: {
    score: number;
    comments: string;
    strengths: string;
    improvementAreas: string;
    developmentRecommendations: string;
    promotionRecommended?: boolean;
    submit?: boolean;
  }
) {
  const user = await requireUser(userId);
  const row = await prisma.performanceEvaluation.findUnique({ where: { id: evaluationId } });
  if (!row) throw new AppError("Evaluation not found", 404);
  if (user.role !== Role.SUPERVISOR || row.supervisorId !== user.id) {
    throw new AppError("You can only evaluate employees on your team", 403);
  }
  if (row.status !== EvaluationStatus.SUPERVISOR_REVIEW_PENDING) {
    throw new AppError("Supervisor evaluation is not open", 400);
  }
  const updated = await prisma.performanceEvaluation.update({
    where: { id: evaluationId },
    data: {
      supervisorScore: input.score,
      supervisorComments: input.comments,
      strengths: input.strengths,
      improvementAreas: input.improvementAreas,
      developmentRecommendations: input.developmentRecommendations,
      promotionRecommended: Boolean(input.promotionRecommended),
      promotionStatus: input.promotionRecommended ? PromotionStatus.RECOMMENDED : PromotionStatus.NONE,
      ...(input.submit
        ? { supervisorSubmittedAt: new Date(), status: EvaluationStatus.WAITING_HR_REVIEW }
        : {}),
    },
    include: evalInclude,
  });
  if (input.submit) {
    await notifyAllHrUsers({
      type: NotificationType.SUPERVISOR_EVALUATION_SUBMITTED,
      title: "Supervisor evaluation submitted",
      message: `${user.name} submitted the supervisor evaluation for ${updated.employee.name}.`,
      subjectEmployeeId: updated.employeeId,
      metadata: { evaluationId },
    });
  }
  return serialize(updated, user);
}

export async function hrApproveEvaluation(
  userId: string,
  evaluationId: string,
  input: { hrComments?: string; promotionStatus?: PromotionStatus; awardType?: AwardType | null; awardConfirmed?: boolean }
) {
  const user = await requireUser(userId);
  if (user.role !== Role.HR) throw new AppError("Only HR can approve appraisals", 403);
  const row = await prisma.performanceEvaluation.findUnique({ where: { id: evaluationId }, include: evalInclude });
  if (!row) throw new AppError("Evaluation not found", 404);
  if (row.status !== EvaluationStatus.WAITING_HR_REVIEW) throw new AppError("This appraisal is not waiting for HR review", 400);
  const totals = calcFinal(row.selfScore, row.peerScore, row.supervisorScore);
  const pipNeeded = totals.performanceBand === "PIP Required";
  const approved = await prisma.performanceEvaluation.update({
    where: { id: evaluationId },
    data: {
      status: EvaluationStatus.APPROVED,
      hrComments: input.hrComments ?? null,
      hrApprovedAt: new Date(),
      hrApprovedById: user.id,
      finalScore: totals.finalScore,
      performanceBand: totals.performanceBand,
      bonusEligible: totals.bonusEligible,
      bonusAmount: totals.bonusAmount,
      promotionStatus: input.promotionStatus ?? row.promotionStatus,
      awardType: input.awardType === undefined ? row.awardType : input.awardType,
      awardConfirmed: Boolean(input.awardConfirmed ?? row.awardConfirmed),
    } as never,
    include: evalInclude,
  });
  await prisma.appraisalOutcome.upsert({
    where: { cycleId_employeeId: { cycleId: approved.cycleId, employeeId: approved.employeeId } },
    create: {
      employeeId: approved.employeeId,
      cycleId: approved.cycleId,
      batchId: approved.batchId,
      evaluationId: approved.id,
      overallResult: totals.performanceBand,
      ratingBand: totals.performanceBand,
      overallScore: totals.finalScore,
      supervisorComments: approved.supervisorComments,
      developmentRecommendations: approved.developmentRecommendations,
      areasForImprovement: approved.improvementAreas,
      resultsIssuedAt: new Date(),
      awardReceived: approved.awardConfirmed,
      awardTitle: awardLabel(approved.awardType),
      pipRequired: pipNeeded,
      pipStatus: pipNeeded ? PipStatus.REQUIRED : PipStatus.NONE,
      bonusAwarded: totals.bonusEligible,
      bonusAmount: totals.bonusAmount,
      promotionRecommended: approved.promotionRecommended,
      promotionStatus: approved.promotionStatus,
      selfScore: approved.selfScore,
      peerScore: approved.peerScore,
      supervisorScore: approved.supervisorScore,
      hrComments: approved.hrComments,
    },
    update: {
      evaluationId: approved.id,
      overallResult: totals.performanceBand,
      ratingBand: totals.performanceBand,
      overallScore: totals.finalScore,
      resultsIssuedAt: new Date(),
      bonusAwarded: totals.bonusEligible,
      bonusAmount: totals.bonusAmount,
      pipRequired: pipNeeded,
      pipStatus: pipNeeded ? PipStatus.REQUIRED : PipStatus.NONE,
      awardReceived: approved.awardConfirmed,
      awardTitle: awardLabel(approved.awardType),
      promotionStatus: approved.promotionStatus,
      selfScore: approved.selfScore,
      peerScore: approved.peerScore,
      supervisorScore: approved.supervisorScore,
      hrComments: approved.hrComments,
    },
  });
  if (pipNeeded && !approved.pipPlan && approved.supervisorId) {
    await prisma.pipPlan.create({
      data: {
        evaluationId: approved.id,
        employeeId: approved.employeeId,
        supervisorId: approved.supervisorId,
        cycleId: approved.cycleId,
        status: PipStatus.REQUIRED,
      },
    });
    if (approved.supervisorId) {
      await createNotification({
        type: NotificationType.PIP_REQUIRED,
        title: "PIP required",
        message: `${approved.employee.name} requires a Performance Improvement Plan.`,
        recipientId: approved.supervisorId,
        subjectEmployeeId: approved.employeeId,
        metadata: { evaluationId },
      });
    }
  }
  await createNotification({
    type: NotificationType.APPRAISAL_APPROVED,
    title: "Final appraisal approved",
    message: `Your ${approved.cycle.name} appraisal is approved. View your final results.`,
    recipientId: approved.employeeId,
    subjectEmployeeId: approved.employeeId,
    metadata: { evaluationId },
  });
  const fresh = await prisma.performanceEvaluation.findUniqueOrThrow({ where: { id: evaluationId }, include: evalInclude });
  return serialize(fresh, user);
}

export async function updateRecognition(
  userId: string,
  evaluationId: string,
  input: { promotionStatus?: PromotionStatus; awardType?: AwardType | null; awardConfirmed?: boolean }
) {
  const user = await requireUser(userId);
  if (user.role !== Role.HR) throw new AppError("Only HR can update recognition", 403);
  const row = await prisma.performanceEvaluation.update({
    where: { id: evaluationId },
    data: {
      ...(input.promotionStatus ? { promotionStatus: input.promotionStatus } : {}),
      ...(input.awardType !== undefined ? { awardType: input.awardType } : {}),
      ...(input.awardConfirmed !== undefined ? { awardConfirmed: input.awardConfirmed } : {}),
    },
    include: evalInclude,
  });
  if (input.promotionStatus) {
    await createNotification({
      type: NotificationType.PROMOTION_UPDATED,
      title: "Promotion status updated",
      message: `Your promotion status is now ${input.promotionStatus.replaceAll("_", " ").toLowerCase()}.`,
      recipientId: row.employeeId,
      subjectEmployeeId: row.employeeId,
      metadata: { evaluationId },
    });
  }
  if (input.awardConfirmed) {
    await createNotification({
      type: NotificationType.AWARD_CONFIRMED,
      title: "Award confirmed",
      message: `You have been confirmed for ${awardLabel(row.awardType) ?? "an award"}.`,
      recipientId: row.employeeId,
      subjectEmployeeId: row.employeeId,
      metadata: { evaluationId },
    });
  }
  return serialize(row, user);
}

export async function savePip(
  userId: string,
  evaluationId: string,
  input: {
    summary: string;
    reviewPeriod: string;
    startDate?: string;
    endDate?: string;
    status?: PipStatus;
    assign?: boolean;
    goals: Array<{ title: string; requiredActions: string; expectedOutcomes: string }>;
  }
) {
  const user = await requireUser(userId);
  const evaluation = await prisma.performanceEvaluation.findUnique({ where: { id: evaluationId } });
  if (!evaluation) throw new AppError("Evaluation not found", 404);
  if (user.role === Role.SUPERVISOR && evaluation.supervisorId !== user.id) {
    throw new AppError("You can only manage PIPs for your team", 403);
  }
  if (user.role !== Role.HR && user.role !== Role.SUPERVISOR) throw new AppError("Not allowed", 403);
  if (!evaluation.supervisorId) throw new AppError("Assign a supervisor before creating a PIP", 400);
  const existing = await prisma.pipPlan.findUnique({ where: { evaluationId } });
  const status = input.assign ? PipStatus.ACTIVE : input.status ?? PipStatus.DRAFT;
  const pip = existing
    ? await prisma.pipPlan.update({
        where: { id: existing.id },
        data: {
          summary: input.summary,
          reviewPeriod: input.reviewPeriod,
          ...(input.startDate ? { startDate: new Date(input.startDate) } : {}),
          ...(input.endDate ? { endDate: new Date(input.endDate) } : {}),
          status,
          assignedAt: input.assign ? new Date() : existing.assignedAt,
        } as never,
      })
    : await prisma.pipPlan.create({
        data: {
          evaluationId,
          employeeId: evaluation.employeeId,
          supervisorId: evaluation.supervisorId,
          cycleId: evaluation.cycleId,
          summary: input.summary,
          reviewPeriod: input.reviewPeriod,
          ...(input.startDate ? { startDate: new Date(input.startDate) } : {}),
          ...(input.endDate ? { endDate: new Date(input.endDate) } : {}),
          status,
          ...(input.assign ? { assignedAt: new Date() } : {}),
        } as never,
      });
  await prisma.pipGoal.deleteMany({ where: { pipId: pip.id } });
  if (input.goals.length) {
    await prisma.pipGoal.createMany({
      data: input.goals.map((goal, index) => ({ ...goal, pipId: pip.id, sortOrder: index })),
    });
  }
  if (input.assign) {
    await createNotification({
      type: NotificationType.PIP_ASSIGNED,
      title: "PIP assigned",
      message: "A Performance Improvement Plan has been assigned to you.",
      recipientId: evaluation.employeeId,
      subjectEmployeeId: evaluation.employeeId,
      metadata: { evaluationId, pipId: pip.id },
    });
  }
  const row = await prisma.performanceEvaluation.findUniqueOrThrow({ where: { id: evaluationId }, include: evalInclude });
  return serialize(row, user);
}

export async function listPips(userId: string) {
  const user = await requireUser(userId);
  const where =
    user.role === Role.EMPLOYEE
      ? { employeeId: user.id }
      : user.role === Role.SUPERVISOR
        ? { supervisorId: user.id }
        : {};
  const rows = await prisma.pipPlan.findMany({
    where,
    include: {
      goals: { orderBy: { sortOrder: "asc" } },
      employee: { select: { id: true, employeeId: true, name: true, jobTitle: true } },
      supervisor: { select: { name: true } },
      evaluation: { select: { id: true, finalScore: true, performanceBand: true, status: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
  return { pips: rows };
}

export async function createReviewRequest(userId: string, input: { reason: string; comments?: string }) {
  const user = await requireUser(userId);
  if (user.role !== Role.EMPLOYEE) throw new AppError("Only employees can request an appraisal review", 403);
  const cycle = await activeCycle();
  const evaluation = await prisma.performanceEvaluation.findUnique({
    where: { cycleId_employeeId: { cycleId: cycle.id, employeeId: user.id } },
  });
  if (!evaluation || evaluation.status !== EvaluationStatus.APPROVED) {
    throw new AppError("You can request a review only after the appraisal is approved", 400);
  }
  const request = await prisma.appraisalReviewRequest.create({
    data: {
      evaluationId: evaluation.id,
      employeeId: user.id,
      cycleId: cycle.id,
      reason: input.reason,
      comments: input.comments ?? null,
    },
  });
  await notifyAllHrUsers({
    type: NotificationType.APPRAISAL_REVIEW_REQUESTED,
    title: "Appraisal review requested",
    message: `${user.name} requested an appraisal review.`,
    subjectEmployeeId: user.id,
    metadata: { evaluationId: evaluation.id, requestId: request.id },
  });
  return request;
}

export async function listReviewRequests(userId: string) {
  const user = await requireUser(userId);
  if (user.role === Role.HR) {
    return {
      requests: await prisma.appraisalReviewRequest.findMany({
        include: {
          employee: { select: { id: true, employeeId: true, name: true } },
          evaluation: { select: { id: true, finalScore: true, performanceBand: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
    };
  }
  if (user.role === Role.EMPLOYEE) {
    return {
      requests: await prisma.appraisalReviewRequest.findMany({
        where: { employeeId: user.id },
        include: { evaluation: { select: { id: true, finalScore: true, performanceBand: true } } },
        orderBy: { createdAt: "desc" },
      }),
    };
  }
  throw new AppError("Not allowed", 403);
}

export async function respondToReviewRequest(
  userId: string,
  requestId: string,
  input: { status: ReviewRequestStatus; hrResponse: string }
) {
  const user = await requireUser(userId);
  if (user.role !== Role.HR) throw new AppError("Only HR can respond", 403);
  const request = await prisma.appraisalReviewRequest.update({
    where: { id: requestId },
    data: {
      status: input.status,
      hrResponse: input.hrResponse,
      respondedAt: new Date(),
      respondedById: user.id,
    },
  });
  await createNotification({
    type: NotificationType.APPRAISAL_REVIEW_RESPONDED,
    title: "Appraisal review response",
    message: "HR responded to your appraisal review request.",
    recipientId: request.employeeId,
    subjectEmployeeId: request.employeeId,
    metadata: { requestId, evaluationId: request.evaluationId },
  });
  return request;
}

export async function listEligiblePeers(userId: string) {
  const user = await requireUser(userId);
  if (user.role !== Role.HR) throw new AppError("Only HR can list peer reviewers", 403);
  const employees = await prisma.employee.findMany({
    where: { role: Role.EMPLOYEE },
    select: { id: true, employeeId: true, name: true, jobTitle: true },
    orderBy: { name: "asc" },
    take: 300,
  });
  return { employees };
}

export async function leadershipAnalytics(userId: string, query: { cycleId?: string; departmentId?: string } = {}) {
  const user = await requireUser(userId);
  if (user.role !== Role.LEADERSHIP && user.role !== Role.HR) {
    throw new AppError("Analytics are available to leadership and HR", 403);
  }
  const cycle = query.cycleId
    ? await prisma.appraisalCycle.findUnique({ where: { id: query.cycleId } })
    : await prisma.appraisalCycle.findFirst({ where: { status: "ACTIVE" } });
  const where = {
    ...(cycle ? { cycleId: cycle.id } : {}),
    ...(query.departmentId ? { employee: { departmentId: query.departmentId } } : {}),
  };
  const evaluations = await prisma.performanceEvaluation.findMany({
    where,
    include: {
      employee: { select: { departmentId: true, department: { select: { id: true, name: true } } } },
    },
  });
  const approved = evaluations.filter((item) => item.status === EvaluationStatus.APPROVED);
  const bandCount = (band: string) => approved.filter((item) => item.performanceBand === band).length;
  const departments = await prisma.department.findMany({ select: { id: true, name: true } });
  const departmentStats = departments.map((department) => {
    const rows = approved.filter((item) => item.employee.departmentId === department.id);
    const scores = rows.map((item) => item.finalScore ?? 0);
    return {
      id: department.id,
      name: department.name,
      employees: rows.length,
      average: scores.length ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)) : 0,
      highest: scores.length ? Math.max(...scores) : 0,
      lowest: scores.length ? Math.min(...scores) : 0,
      completion: evaluations.filter((item) => item.employee.departmentId === department.id).length
        ? Math.round(
            (rows.length / evaluations.filter((item) => item.employee.departmentId === department.id).length) * 100
          )
        : 0,
    };
  });
  const batches = await prisma.appraisalBatch.findMany({
    where: cycle ? { cycleId: cycle.id } : {},
    select: { id: true, name: true, currentStage: true, status: true },
  });
  const pips = await prisma.pipPlan.findMany({ where: cycle ? { cycleId: cycle.id } : {} });
  const pdps = await prisma.personalDevelopmentPlan.findMany({
    where: cycle ? { cycleId: cycle.id } : {},
    include: { goals: { select: { progress: true, status: true, dueDate: true } } },
  });
  const goals = pdps.flatMap((item) => item.goals);
  const cycles = await prisma.appraisalCycle.findMany({
    orderBy: { startDate: "asc" },
    select: { id: true, name: true, status: true },
  });
  return {
    cycle: cycle ? { id: cycle.id, name: cycle.name } : null,
    cycles,
    overview: {
      totalEmployees: evaluations.length,
      activeCycles: cycles.filter((item) => item.status === "ACTIVE").length,
      completedAppraisals: approved.length,
      pendingAppraisals: evaluations.length - approved.length,
      completionRate: evaluations.length ? Math.round((approved.length / evaluations.length) * 100) : 0,
    },
    bands: {
      Outstanding: bandCount("Outstanding"),
      "Exceeds Expectations": bandCount("Exceeds Expectations"),
      "Meets Expectations": bandCount("Meets Expectations"),
      "Needs Improvement": bandCount("Needs Improvement"),
      "PIP Required": bandCount("PIP Required"),
    },
    departments: departmentStats,
    promotions: {
      recommended: evaluations.filter((item) => item.promotionStatus === PromotionStatus.RECOMMENDED).length,
      shortlisted: evaluations.filter((item) => item.promotionStatus === PromotionStatus.SHORTLISTED).length,
      approved: evaluations.filter((item) => item.promotionStatus === PromotionStatus.APPROVED).length,
    },
    pips: {
      required: pips.filter((item) => item.status === PipStatus.REQUIRED).length,
      active: pips.filter((item) => item.status === PipStatus.ACTIVE).length,
      completed: pips.filter((item) => item.status === PipStatus.COMPLETED).length,
      failed: pips.filter((item) => item.status === PipStatus.FAILED).length,
    },
    pdp: {
      averageCompletion: goals.length ? Math.round(goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length) : 0,
      completedGoals: goals.filter((goal) => goal.status === "COMPLETED").length,
      inProgressGoals: goals.filter((goal) => goal.status === "IN_PROGRESS").length,
      overdueGoals: goals.filter((goal) => goal.dueDate && goal.dueDate < new Date() && goal.status !== "COMPLETED").length,
    },
    reviews: {
      self: evaluations.filter((item) => item.selfSubmittedAt).length,
      peer: evaluations.filter((item) => (item.peerScore ?? 0) > 0).length,
      supervisor: evaluations.filter((item) => item.supervisorSubmittedAt).length,
      approved: approved.length,
    },
    batches: batches.map((batch) => ({
      id: batch.id,
      name: batch.name,
      stage: batch.currentStage,
      status: batch.status,
    })),
    trends: await Promise.all(
      cycles.map(async (item) => {
        const rows = await prisma.performanceEvaluation.findMany({
          where: { cycleId: item.id, status: EvaluationStatus.APPROVED },
          select: { finalScore: true },
        });
        const scores = rows.map((row) => row.finalScore ?? 0);
        return {
          id: item.id,
          name: item.name,
          status: item.status,
          completed: rows.length,
          average: scores.length ? Number((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)) : 0,
        };
      })
    ),
  };
}

export async function reportingRows(
  userId: string,
  query: { departmentId?: string; cycleId?: string; band?: string; supervisorId?: string; employeeId?: string } = {}
) {
  const user = await requireUser(userId);
  if (user.role !== Role.HR && user.role !== Role.LEADERSHIP) throw new AppError("Reports are limited to HR and leadership", 403);
  const rows = await prisma.performanceEvaluation.findMany({
    where: {
      ...(query.cycleId ? { cycleId: query.cycleId } : {}),
      ...(query.supervisorId ? { supervisorId: query.supervisorId } : {}),
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      ...(query.band ? { performanceBand: query.band } : {}),
      ...(query.departmentId ? { employee: { departmentId: query.departmentId } } : {}),
    },
    include: {
      employee: {
        select: {
          name: true,
          employeeId: true,
          jobTitle: true,
          department: { select: { name: true } },
        },
      },
      supervisor: { select: { name: true } },
      cycle: { select: { name: true } },
      batch: { select: { name: true } },
      pipPlan: { select: { status: true } },
    },
    orderBy: { employee: { name: "asc" } },
  });
  const [cycles, departments] = await Promise.all([
    prisma.appraisalCycle.findMany({ orderBy: { startDate: "desc" }, select: { id: true, name: true, status: true } }),
    prisma.department.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return {
    cycles,
    departments,
    rows: rows.map((row) => ({
      employee: row.employee.name,
      employeeId: row.employee.employeeId,
      department: row.employee.department?.name ?? "",
      jobTitle: row.employee.jobTitle ?? "",
      supervisor: row.supervisor?.name ?? "",
      cycle: row.cycle.name,
      batch: row.batch?.name ?? "",
      status: row.status,
      selfScore: row.selfScore,
      peerScore: row.peerScore,
      supervisorScore: row.supervisorScore,
      finalScore: row.finalScore,
      band: row.performanceBand,
      bonusAmount: row.bonusAmount,
      promotionStatus: row.promotionStatus,
      award: awardLabel(row.awardType),
      pipStatus: row.pipPlan?.status ?? "",
    })),
  };
}
