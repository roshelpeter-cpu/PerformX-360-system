/**
 * Performance Planning Meeting workflows.
 *
 * HR schedules and manages times. Supervisors and employees confirm or
 * request a reschedule. Only the supervisor writes meeting notes, and notes
 * are stored only after the meeting is marked completed.
 */
import {
  MeetingParticipantResponse,
  MeetingParticipantRole,
  MeetingStatus,
  MeetingType,
  NotificationType,
  PdpStatus,
  Prisma,
  RescheduleRequestStatus,
  Role,
} from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/errors.js";
import { createNotification, notifyAllHrUsers } from "./notification.service.js";
import type {
  MeetingCalendarQuery,
  PlanningMeetingListQuery,
  RescheduleRequestInput,
  RescheduleReviewInput,
  SavePlanningNotesInput,
  SchedulePlanningMeetingInput,
  ScheduleTypedMeetingInput,
} from "../validations/meeting.validation.js";

const ACTIVE_MEETING_STATUSES: MeetingStatus[] = [
  MeetingStatus.REQUESTED,
  MeetingStatus.SCHEDULED,
  MeetingStatus.RESCHEDULED,
  MeetingStatus.PENDING,
  MeetingStatus.CONFIRMED,
  MeetingStatus.RESCHEDULE_REQUESTED,
];

const OPEN_MEETING_STATUSES: MeetingStatus[] = [
  ...ACTIVE_MEETING_STATUSES,
  MeetingStatus.COMPLETED,
];

function defaultEndAt(start: Date, existing?: Date) {
  if (existing && existing > start) return existing;
  return new Date(start.getTime() + 60 * 60 * 1000);
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

async function requireUser(userId: string) {
  const user = await prisma.employee.findUnique({
    where: { id: userId },
    select: {
      id: true,
      employeeId: true,
      name: true,
      role: true,
      jobTitle: true,
    },
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

const meetingInclude = {
  employee: {
    select: {
      id: true,
      employeeId: true,
      name: true,
      jobTitle: true,
      department: { select: { id: true, name: true } },
    },
  },
  supervisor: {
    select: { id: true, employeeId: true, name: true, jobTitle: true },
  },
  createdBy: {
    select: { id: true, employeeId: true, name: true },
  },
  batch: {
    select: { id: true, name: true, batchNumber: true, currentStage: true },
  },
  cycle: {
    select: { id: true, name: true, status: true },
  },
  participants: {
    include: {
      employee: {
        select: { id: true, employeeId: true, name: true, role: true },
      },
    },
  },
  rescheduleRequests: {
    orderBy: { createdAt: "desc" as const },
    take: 5,
    include: {
      requester: { select: { id: true, employeeId: true, name: true } },
    },
  },
  notes: true,
  planningReview: true,
} satisfies Prisma.MeetingInclude;

type MeetingRecord = Prisma.MeetingGetPayload<{ include: typeof meetingInclude }>;

function serializeMeeting(meeting: MeetingRecord, viewerId: string, viewerRole: Role) {
  const completed = meeting.status === MeetingStatus.COMPLETED;
  const employeeParticipant = meeting.participants.find(
    (item) => item.participantRole === MeetingParticipantRole.EMPLOYEE
  );
  const supervisorParticipant = meeting.participants.find(
    (item) => item.participantRole === MeetingParticipantRole.SUPERVISOR
  );
  const ownParticipation = meeting.participants.find(
    (item) => item.employeeId === viewerId
  );
  const pendingReschedule = meeting.rescheduleRequests.find(
    (item) => item.status === RescheduleRequestStatus.PENDING
  );
  const review = meeting.planningReview;
  const bothConfirmed =
    employeeParticipant?.response === MeetingParticipantResponse.ACCEPTED &&
    supervisorParticipant?.response === MeetingParticipantResponse.ACCEPTED;

  const canConfirm =
    !completed &&
    (viewerRole === Role.EMPLOYEE || viewerRole === Role.SUPERVISOR) &&
    ownParticipation?.response === MeetingParticipantResponse.PENDING;

  const canRequestReschedule =
    !completed &&
    (viewerRole === Role.EMPLOYEE || viewerRole === Role.SUPERVISOR) &&
    Boolean(ownParticipation) &&
    ownParticipation?.response !== MeetingParticipantResponse.RESCHEDULE_REQUESTED;

  const canAddNotes =
    viewerRole === Role.SUPERVISOR &&
    meeting.supervisorId === viewerId &&
    (completed || ACTIVE_MEETING_STATUSES.includes(meeting.status));

  const canReviewReschedule =
    viewerRole === Role.HR && Boolean(pendingReschedule);

  const canHrConfirm =
    viewerRole === Role.HR &&
    !completed &&
    bothConfirmed &&
    meeting.status !== MeetingStatus.CONFIRMED;

  const canManage = meeting.createdById === viewerId && !completed;

  return {
    id: meeting.id,
    type: meeting.type,
    followUpSlot: meeting.followUpSlot,
    isAdditionalFollowUp: meeting.isAdditionalFollowUp,
    title: meeting.title,
    description: meeting.description,
    status: meeting.status,
    scheduledAt: meeting.scheduledAt,
    endAt: meeting.endAt,
    location: meeting.location,
    createdAt: meeting.createdAt,
    employee: meeting.employee,
    supervisor: meeting.supervisor,
    createdBy: meeting.createdBy,
    batch: meeting.batch,
    cycle: meeting.cycle,
    participants: meeting.participants.map((item) => ({
      id: item.id,
      employeeId: item.employee.id,
      code: item.employee.employeeId,
      name: item.employee.name,
      role: item.participantRole,
      initials: initials(item.employee.name),
      response: item.response,
      respondedAt: item.respondedAt,
    })),
    employeeResponse: employeeParticipant?.response ?? "PENDING",
    supervisorResponse: supervisorParticipant?.response ?? "PENDING",
    pendingReschedule: pendingReschedule
      ? {
          id: pendingReschedule.id,
          reason: pendingReschedule.reason,
          requestedStart: pendingReschedule.requestedStart,
          requestedEnd: pendingReschedule.requestedEnd,
          requester: pendingReschedule.requester,
          createdAt: pendingReschedule.createdAt,
        }
      : null,
    bothConfirmed,
    notes: completed
      ? meeting.notes || review
        ? {
            discussionSummary: meeting.notes?.discussionSummary ?? "",
            keyPoints: meeting.notes?.keyPoints ?? "",
            decisionsMade: meeting.notes?.decisionsMade ?? review?.decisionsMade ?? "",
            actionItems: meeting.notes?.actionItems ?? "",
            nextSteps: meeting.notes?.nextSteps ?? "",
            previousAppraisalReviewed: review?.previousAppraisalReviewed ?? null,
            previousAppraisalFindings: review?.previousAppraisalFindings ?? null,
            previousAppraisalOutcome: review?.previousAppraisalObservations ?? null,
            previousPerformance: review?.performanceObservations ?? null,
            keyAchievements: review?.previousAppraisalFindings ?? null,
            previousPdpReviewed:
              [review?.previousPdpObjectives, review?.previousPdpProgress, review?.previousPdpObservations]
                .filter(Boolean)
                .join("\n") || null,
            previousPdpCompletion: review?.previousPdpProgress ?? null,
            completedGoals: review?.previousPdpCompleted ?? null,
            incompleteGoals: review?.previousPdpIncomplete ?? null,
            carriedForward: review?.continueFromPreviousPdp ?? null,
            employeeStrengths: review?.employeeStrengths ?? null,
            employeeWeaknesses: review?.employeeWeaknesses ?? null,
            departmentObjectives: review?.departmentObjectivesNotes ?? null,
            companyObjectives: review?.companyObjectivesNotes ?? null,
            developmentNeeds: review?.developmentNeedsSummary ?? null,
            performanceObservations: review?.performanceObservations ?? null,
            agreedOutcomes: review?.agreedOutcomes ?? null,
            additionalComments: meeting.notes?.additionalComments ?? review?.additionalComments ?? null,
            updatedAt: meeting.notes?.updatedAt ?? review?.updatedAt ?? meeting.updatedAt,
          }
        : null
      : null,
    actions: {
      canConfirm,
      canRequestReschedule,
      canAddNotes,
      canReviewReschedule,
      canHrConfirm,
      canManage,
    },
  };
}

async function loadMeeting(meetingId: string) {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: meetingInclude,
  });
  if (!meeting) {
    throw new AppError("Meeting not found", 404);
  }
  return meeting;
}

async function assertCanViewMeeting(
  meeting: MeetingRecord,
  user: { id: string; role: Role }
) {
  if (user.role === Role.HR || user.role === Role.LEADERSHIP) return;
  if (user.role === Role.EMPLOYEE && meeting.employeeId === user.id) return;
  if (user.role === Role.SUPERVISOR && meeting.supervisorId === user.id) return;
  throw new AppError("You do not have access to this meeting", 403);
}

async function notifyMeetingParties(options: {
  type: NotificationType;
  title: string;
  message: string;
  meetingId: string;
  employeeId: string;
  supervisorId: string | null;
  extraRecipientIds?: string[];
  notifyHr?: boolean;
}) {
  const recipientIds = new Set<string>(options.extraRecipientIds ?? []);
  recipientIds.add(options.employeeId);
  if (options.supervisorId) recipientIds.add(options.supervisorId);

  await Promise.all(
    [...recipientIds].map((recipientId) =>
      createNotification({
        type: options.type,
        title: options.title,
        message: options.message,
        recipientId,
        subjectEmployeeId: options.employeeId,
        metadata: { meetingId: options.meetingId },
      })
    )
  );

  if (options.notifyHr) {
    await notifyAllHrUsers({
      type: options.type,
      title: options.title,
      message: options.message,
      subjectEmployeeId: options.employeeId,
      metadata: { meetingId: options.meetingId },
    });
  }
}

export async function listPlanningMeetings(
  userId: string,
  query: PlanningMeetingListQuery = {}
) {
  const user = await requireUser(userId);
  const cycle = await getActiveCycle();
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  const tab = query.tab ?? "all";

  const where: Prisma.MeetingWhereInput = {
    type: MeetingType.PERFORMANCE_PLANNING,
    status: { not: MeetingStatus.CANCELLED },
  };

  if (cycle && tab !== "history") {
    where.cycleId = cycle.id;
  }

  if (user.role === Role.EMPLOYEE) {
    where.employeeId = user.id;
  } else if (user.role === Role.SUPERVISOR) {
    if (query.employeeId) {
      const assigned = cycle
        ? await prisma.employeeSupervisorAssignment.findFirst({
            where: {
              cycleId: cycle.id,
              supervisorId: user.id,
              employeeId: query.employeeId,
            },
          })
        : null;
      if (!assigned) {
        throw new AppError("This employee is not assigned to your team.", 404);
      }
      where.employeeId = query.employeeId;
    } else {
      where.supervisorId = user.id;
    }
  } else if (query.employeeId) {
    where.employeeId = query.employeeId;
  }

  if (tab === "upcoming") {
    where.status = { in: ACTIVE_MEETING_STATUSES };
  } else if (tab === "history") {
    where.status = MeetingStatus.COMPLETED;
  }

  if (query.from || query.to) {
    where.scheduledAt = {
      ...(query.from ? { gte: new Date(query.from) } : {}),
      ...(query.to ? { lte: new Date(query.to) } : {}),
    };
  }

  const [total, meetings, upcomingCount, completedCount, pendingRequests] =
    await Promise.all([
      prisma.meeting.count({ where }),
      prisma.meeting.findMany({
        where,
        include: meetingInclude,
        orderBy: { scheduledAt: tab === "history" ? "desc" : "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.meeting.count({
        where: {
          ...where,
          status: { in: ACTIVE_MEETING_STATUSES },
        },
      }),
      prisma.meeting.count({
        where: { ...where, status: MeetingStatus.COMPLETED },
      }),
      prisma.meetingRescheduleRequest.count({
        where: {
          status: RescheduleRequestStatus.PENDING,
          meeting: {
            type: MeetingType.PERFORMANCE_PLANNING,
            status: { not: MeetingStatus.CANCELLED },
            ...(user.role === Role.SUPERVISOR ? { supervisorId: user.id } : {}),
            ...(user.role === Role.EMPLOYEE ? { employeeId: user.id } : {}),
            ...(cycle && user.role === Role.HR ? { cycleId: cycle.id } : {}),
          },
        },
      }),
    ]);

  const upcomingMeetings = await prisma.meeting.findMany({
    where: {
      type: MeetingType.PERFORMANCE_PLANNING,
      status: { in: ACTIVE_MEETING_STATUSES },
      scheduledAt: {
        gte: new Date(),
        lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      ...(user.role === Role.EMPLOYEE ? { employeeId: user.id } : {}),
      ...(user.role === Role.SUPERVISOR ? { supervisorId: user.id } : {}),
      ...(cycle && user.role === Role.HR ? { cycleId: cycle.id } : {}),
    },
    include: meetingInclude,
    orderBy: { scheduledAt: "asc" },
    take: 8,
  });

  const calendarMeetings = await prisma.meeting.findMany({
    where: {
      type: MeetingType.PERFORMANCE_PLANNING,
      status: { in: OPEN_MEETING_STATUSES },
      ...(user.role === Role.EMPLOYEE ? { employeeId: user.id } : {}),
      ...(user.role === Role.SUPERVISOR ? { supervisorId: user.id } : {}),
      ...(cycle && user.role === Role.HR ? { cycleId: cycle.id } : {}),
    },
    select: { scheduledAt: true, status: true },
  });

  const teamRows =
    user.role === Role.SUPERVISOR && cycle
      ? await prisma.employeeSupervisorAssignment.findMany({
          where: { cycleId: cycle.id, supervisorId: user.id, employee: { role: Role.EMPLOYEE } },
          include: {
            employee: {
              select: { id: true, employeeId: true, name: true, jobTitle: true },
            },
          },
          orderBy: { employee: { name: "asc" } },
        })
      : [];

  const teamMeetings =
    teamRows.length > 0 && cycle
      ? await prisma.meeting.findMany({
          where: {
            cycleId: cycle.id,
            type: MeetingType.PERFORMANCE_PLANNING,
            employeeId: { in: teamRows.map((row) => row.employee.id) },
            status: { not: MeetingStatus.CANCELLED },
          },
          include: meetingInclude,
        })
      : [];
  const teamMeetingByEmployee = new Map(
    teamMeetings.map((item) => [item.employeeId, item])
  );

  let needsScheduling = 0;
  if (user.role === Role.HR && cycle) {
    const assignedCount = await prisma.employeeBatchAssignment.count({
      where: { cycleId: cycle.id, employee: { role: Role.EMPLOYEE } },
    });
    const scheduledCount = await prisma.meeting.count({
      where: {
        cycleId: cycle.id,
        type: MeetingType.PERFORMANCE_PLANNING,
        status: { not: MeetingStatus.CANCELLED },
      },
    });
    needsScheduling = Math.max(0, assignedCount - scheduledCount);
  }

  const confirmationQueueRows = await prisma.meeting.findMany({
    where: {
      type: MeetingType.PERFORMANCE_PLANNING,
      status: { in: ACTIVE_MEETING_STATUSES },
      ...(user.role === Role.EMPLOYEE ? { employeeId: user.id } : {}),
      ...(user.role === Role.SUPERVISOR ? { supervisorId: user.id } : {}),
      ...(cycle && user.role === Role.HR ? { cycleId: cycle.id } : {}),
    },
    include: meetingInclude,
    orderBy: { scheduledAt: "asc" },
    take: 12,
  });
  const confirmationQueue = confirmationQueueRows
    .filter(
      (item) =>
        item.status === MeetingStatus.RESCHEDULE_REQUESTED ||
        item.participants.some((p) => p.response === MeetingParticipantResponse.PENDING) ||
        (item.participants
          .filter(
            (p) =>
              p.participantRole === MeetingParticipantRole.EMPLOYEE ||
              p.participantRole === MeetingParticipantRole.SUPERVISOR
          )
          .every((p) => p.response === MeetingParticipantResponse.ACCEPTED) &&
          item.status !== MeetingStatus.CONFIRMED)
    )
    .slice(0, 5);

  return {
    cycle: cycle
      ? { id: cycle.id, name: cycle.name, status: cycle.status }
      : null,
    stats: {
      upcoming: upcomingCount,
      completed: completedCount,
      pendingRequests,
      total: upcomingCount + completedCount,
      needsScheduling,
    },
    teamMembers: teamRows.map((row) => {
      const meeting = teamMeetingByEmployee.get(row.employee.id);
      let planningStatus:
        | "completed"
        | "scheduled"
        | "needs_scheduling"
        | "awaiting_confirmation"
        | "reschedule_requested" = "needs_scheduling";
      if (meeting?.status === MeetingStatus.COMPLETED) planningStatus = "completed";
      else if (meeting?.status === MeetingStatus.RESCHEDULE_REQUESTED) {
        planningStatus = "reschedule_requested";
      } else if (meeting) {
        const emp = meeting.participants.find(
          (item) => item.participantRole === MeetingParticipantRole.EMPLOYEE
        );
        const sup = meeting.participants.find(
          (item) => item.participantRole === MeetingParticipantRole.SUPERVISOR
        );
        planningStatus =
          emp?.response === MeetingParticipantResponse.ACCEPTED &&
          sup?.response === MeetingParticipantResponse.ACCEPTED
            ? "awaiting_confirmation"
            : "scheduled";
      }
      return {
        ...row.employee,
        planningStatus,
        meeting: meeting ? serializeMeeting(meeting, user.id, user.role) : null,
      };
    }),
    meetings: meetings.map((meeting) =>
      serializeMeeting(meeting, user.id, user.role)
    ),
    confirmationQueue: confirmationQueue.map((meeting) =>
      serializeMeeting(meeting, user.id, user.role)
    ),
    nextSevenDays: upcomingMeetings.map((meeting) =>
      serializeMeeting(meeting, user.id, user.role)
    ),
    calendarDates: calendarMeetings.map((item) => item.scheduledAt),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize) || 1),
  };
}

export async function getPlanningMeeting(userId: string, meetingId: string) {
  const user = await requireUser(userId);
  const meeting = await loadMeeting(meetingId);
  await assertCanViewMeeting(meeting, user);
  const serialized = serializeMeeting(meeting, user.id, user.role);
  const previousAppraisal = await loadPreviousAppraisal(
    meeting.employeeId,
    meeting.cycleId
  );
  return { ...serialized, previousAppraisal };
}

export async function listSchedulableEmployees(userId: string) {
  const user = await requireUser(userId);
  if (user.role !== Role.HR) {
    throw new AppError("Only HR can schedule performance planning meetings", 403);
  }

  const cycle = await getActiveCycle();
  if (!cycle) {
    return { cycle: null, employees: [] };
  }

  const assignments = await prisma.employeeBatchAssignment.findMany({
    where: {
      cycleId: cycle.id,
      employee: { role: Role.EMPLOYEE },
    },
    include: {
      employee: {
        select: {
          id: true,
          employeeId: true,
          name: true,
          jobTitle: true,
          department: { select: { name: true } },
        },
      },
      batch: {
        select: { id: true, name: true, batchNumber: true, currentStage: true },
      },
    },
    orderBy: { employee: { name: "asc" } },
  });

  const [meetings, supervisors, progressRows] = await Promise.all([
    prisma.meeting.findMany({
      where: {
        cycleId: cycle.id,
        type: MeetingType.PERFORMANCE_PLANNING,
        status: { not: MeetingStatus.CANCELLED },
      },
      select: { employeeId: true, status: true, scheduledAt: true },
    }),
    prisma.employeeSupervisorAssignment.findMany({
      where: { cycleId: cycle.id },
      include: {
        supervisor: { select: { id: true, employeeId: true, name: true } },
      },
    }),
    prisma.employeeCycleProgress.findMany({
      where: { cycleId: cycle.id },
      select: { employeeId: true, currentStage: true },
    }),
  ]);

  const meetingByEmployee = new Map(meetings.map((item) => [item.employeeId, item]));
  const supervisorByEmployee = new Map(
    supervisors.map((item) => [item.employeeId, item.supervisor])
  );
  const stageByEmployee = new Map(
    progressRows.map((item) => [item.employeeId, item.currentStage])
  );

  return {
    cycle: { id: cycle.id, name: cycle.name },
    employees: assignments.map((row) => {
      const meeting = meetingByEmployee.get(row.employee.id);
      let planningStatus: "completed" | "scheduled" | "needs_scheduling" = "needs_scheduling";
      if (meeting?.status === MeetingStatus.COMPLETED) planningStatus = "completed";
      else if (meeting) planningStatus = "scheduled";
      return {
        id: row.employee.id,
        employeeId: row.employee.employeeId,
        name: row.employee.name,
        jobTitle: row.employee.jobTitle,
        department: row.employee.department?.name ?? null,
        batch: row.batch,
        supervisor: supervisorByEmployee.get(row.employee.id) ?? null,
        currentStage: stageByEmployee.get(row.employee.id) ?? row.batch.currentStage,
        planningStatus,
        scheduledAt: meeting?.scheduledAt ?? null,
      };
    }),
  };
}

export async function schedulePlanningMeeting(
  userId: string,
  input: SchedulePlanningMeetingInput
) {
  const user = await requireUser(userId);
  if (user.role !== Role.HR) {
    throw new AppError("Only HR can schedule performance planning meetings", 403);
  }

  const cycle = input.cycleId
    ? await prisma.appraisalCycle.findUnique({ where: { id: input.cycleId } })
    : await getActiveCycle();
  if (!cycle || (cycle.status !== "ACTIVE" && cycle.status !== "UPCOMING")) {
    throw new AppError("Select a current or upcoming appraisal cycle", 400);
  }

  const assignment = await prisma.employeeBatchAssignment.findUnique({
    where: {
      cycleId_employeeId: { cycleId: cycle.id, employeeId: input.employeeId },
    },
    include: {
      employee: { select: { id: true, name: true, employeeId: true, role: true } },
      batch: true,
    },
  });
  if (!assignment || assignment.employee.role !== Role.EMPLOYEE) {
    throw new AppError("Employee is not assigned to the active cycle", 400);
  }

  const supervisorAssignment = await prisma.employeeSupervisorAssignment.findUnique({
    where: {
      cycleId_employeeId: { cycleId: cycle.id, employeeId: input.employeeId },
    },
  });
  if (!supervisorAssignment) {
    throw new AppError("Assign a supervisor before scheduling this meeting", 400);
  }

  const existing = await prisma.meeting.findFirst({
    where: {
      employeeId: input.employeeId,
      cycleId: cycle.id,
      type: MeetingType.PERFORMANCE_PLANNING,
      status: { not: MeetingStatus.CANCELLED },
    },
  });
  if (existing?.status === MeetingStatus.COMPLETED) {
    throw new AppError("This employee already has a completed planning meeting", 400);
  }
  if (existing && ACTIVE_MEETING_STATUSES.includes(existing.status)) {
    throw new AppError("This employee already has a scheduled planning meeting", 400);
  }

  const scheduledAt = input.scheduledAt;
  const endAt = defaultEndAt(scheduledAt, input.endAt);
  const title = `Performance Planning Meeting — ${assignment.employee.name}`;

  const meeting = await prisma.meeting.create({
    data: {
      type: MeetingType.PERFORMANCE_PLANNING,
      title,
      description: input.description ?? "Performance planning meeting for the current appraisal cycle.",
      employeeId: assignment.employee.id,
      supervisorId: supervisorAssignment.supervisorId,
      createdById: user.id,
      cycleId: cycle.id,
      batchId: assignment.batchId,
      scheduledAt,
      endAt,
      location: input.location ?? "Meeting Room A",
      status: MeetingStatus.SCHEDULED,
      participants: {
        create: [
          {
            employeeId: assignment.employee.id,
            participantRole: MeetingParticipantRole.EMPLOYEE,
            response: MeetingParticipantResponse.PENDING,
          },
          {
            employeeId: supervisorAssignment.supervisorId,
            participantRole: MeetingParticipantRole.SUPERVISOR,
            response: MeetingParticipantResponse.PENDING,
          },
        ],
      },
    },
    include: meetingInclude,
  });

  await notifyMeetingParties({
    type: NotificationType.MEETING_INVITATION,
    title: "Meeting confirmation required",
    message: `${title} has been scheduled. Please confirm attendance or request a reschedule.`,
    meetingId: meeting.id,
    employeeId: assignment.employee.id,
    supervisorId: supervisorAssignment.supervisorId,
    notifyHr: true,
  });

  return serializeMeeting(meeting, user.id, user.role);
}

export async function confirmPlanningMeeting(
  userId: string,
  meetingId: string,
  message?: string
) {
  const user = await requireUser(userId);
  if (user.role === Role.HR) {
    throw new AppError("HR does not confirm meetings as a participant", 403);
  }

  const meeting = await loadMeeting(meetingId);
  await assertCanViewMeeting(meeting, user);

  if (meeting.status === MeetingStatus.COMPLETED) {
    throw new AppError("This meeting has already been completed", 400);
  }

  const participant = meeting.participants.find((item) => item.employeeId === user.id);
  if (!participant) {
    throw new AppError("You are not a participant in this meeting", 403);
  }

  await prisma.meetingParticipant.update({
    where: { id: participant.id },
    data: {
      response: MeetingParticipantResponse.ACCEPTED,
      respondedAt: new Date(),
      responseMessage: message ?? null,
    },
  });

  const refreshed = await loadMeeting(meetingId);
  const allAccepted = refreshed.participants
    .filter((item) =>
      item.participantRole === MeetingParticipantRole.EMPLOYEE ||
      item.participantRole === MeetingParticipantRole.SUPERVISOR
    )
    .every((item) => item.response === MeetingParticipantResponse.ACCEPTED);

  if (allAccepted) {
    await notifyMeetingParties({
      type: NotificationType.MEETING_ALL_ACCEPTED,
      title: "Meeting confirmation required",
      message: `${meeting.title} has been confirmed by the employee and supervisor. HR confirmation is still required.`,
      meetingId,
      employeeId: meeting.employeeId,
      supervisorId: meeting.supervisorId,
      notifyHr: true,
    });
  } else {
    await notifyMeetingParties({
      type: NotificationType.MEETING_RESPONSE,
      title: "Meeting response received",
      message: `${user.name} confirmed ${meeting.title}.`,
      meetingId,
      employeeId: meeting.employeeId,
      supervisorId: meeting.supervisorId,
      extraRecipientIds: [user.id],
    });
  }

  const updated = await loadMeeting(meetingId);
  return serializeMeeting(updated, user.id, user.role);
}

export async function requestPlanningReschedule(
  userId: string,
  meetingId: string,
  input: RescheduleRequestInput
) {
  const user = await requireUser(userId);
  if (user.role === Role.HR) {
    throw new AppError("HR reviews reschedule requests rather than submitting them", 403);
  }

  const meeting = await loadMeeting(meetingId);
  await assertCanViewMeeting(meeting, user);

  if (meeting.status === MeetingStatus.COMPLETED) {
    throw new AppError("A completed meeting cannot be rescheduled this way", 400);
  }

  const participant = meeting.participants.find((item) => item.employeeId === user.id);
  if (!participant) {
    throw new AppError("You are not a participant in this meeting", 403);
  }

  await prisma.$transaction([
    prisma.meetingParticipant.update({
      where: { id: participant.id },
      data: {
        response: MeetingParticipantResponse.RESCHEDULE_REQUESTED,
        respondedAt: new Date(),
        responseMessage: input.reason,
      },
    }),
    prisma.meeting.update({
      where: { id: meetingId },
      data: { status: MeetingStatus.RESCHEDULE_REQUESTED },
    }),
    prisma.meetingRescheduleRequest.create({
      data: {
        meetingId,
        requesterId: user.id,
        reason: input.reason,
        requestedStart: input.requestedStart ?? null,
        requestedEnd: input.requestedEnd ?? null,
        status: RescheduleRequestStatus.PENDING,
      },
    }),
  ]);

  await notifyMeetingParties({
    type: NotificationType.MEETING_RESCHEDULE_REQUEST,
    title: "Reschedule requested",
    message: `${user.name} requested a reschedule for ${meeting.title}.`,
    meetingId,
    employeeId: meeting.employeeId,
    supervisorId: meeting.supervisorId,
    notifyHr: true,
  });

  const updated = await loadMeeting(meetingId);
  return serializeMeeting(updated, user.id, user.role);
}

export async function reviewPlanningReschedule(
  userId: string,
  meetingId: string,
  input: RescheduleReviewInput
) {
  const user = await requireUser(userId);
  if (user.role !== Role.HR) {
    throw new AppError("Only HR can approve or reject reschedule requests", 403);
  }

  const meeting = await loadMeeting(meetingId);
  const pending = meeting.rescheduleRequests.find(
    (item) => item.status === RescheduleRequestStatus.PENDING
  );
  if (!pending) {
    throw new AppError("There is no pending reschedule request for this meeting", 400);
  }

  if (input.decision === "REJECTED") {
    await prisma.$transaction([
      prisma.meetingRescheduleRequest.update({
        where: { id: pending.id },
        data: {
          status: RescheduleRequestStatus.REJECTED,
          reviewedById: user.id,
          reviewedAt: new Date(),
          reviewNote: input.reviewNote ?? null,
        },
      }),
      prisma.meeting.update({
        where: { id: meetingId },
        data: { status: MeetingStatus.SCHEDULED },
      }),
      ...meeting.participants.map((item) =>
        prisma.meetingParticipant.update({
          where: { id: item.id },
          data: {
            response: MeetingParticipantResponse.PENDING,
            respondedAt: null,
            responseMessage: null,
          },
        })
      ),
    ]);
  } else {
    const scheduledAt = input.scheduledAt ?? pending.requestedStart ?? meeting.scheduledAt;
    const endAt = defaultEndAt(scheduledAt, input.endAt ?? pending.requestedEnd ?? undefined);
    await prisma.$transaction([
      prisma.meetingRescheduleRequest.update({
        where: { id: pending.id },
        data: {
          status: RescheduleRequestStatus.APPROVED,
          reviewedById: user.id,
          reviewedAt: new Date(),
          reviewNote: input.reviewNote ?? null,
        },
      }),
      prisma.meeting.update({
        where: { id: meetingId },
        data: {
          previousScheduledAt: meeting.scheduledAt,
          previousEndAt: meeting.endAt,
          scheduledAt,
          endAt,
          status: MeetingStatus.RESCHEDULED,
        },
      }),
      ...meeting.participants.map((item) =>
        prisma.meetingParticipant.update({
          where: { id: item.id },
          data: {
            response: MeetingParticipantResponse.PENDING,
            respondedAt: null,
            responseMessage: null,
          },
        })
      ),
    ]);
  }

  await notifyMeetingParties({
    type: NotificationType.MEETING_RESCHEDULED,
    title:
      input.decision === "APPROVED"
        ? "Meeting rescheduled"
        : "Reschedule request declined",
    message:
      input.decision === "APPROVED"
        ? `${meeting.title} has been moved to a new time. Please confirm the updated invitation.`
        : `HR declined the reschedule request for ${meeting.title}. Please confirm the original time.`,
    meetingId,
    employeeId: meeting.employeeId,
    supervisorId: meeting.supervisorId,
  });

  const updated = await loadMeeting(meetingId);
  return serializeMeeting(updated, user.id, user.role);
}

export async function savePlanningMeetingNotes(
  userId: string,
  meetingId: string,
  input: SavePlanningNotesInput
) {
  const user = await requireUser(userId);
  if (user.role !== Role.SUPERVISOR) {
    throw new AppError("Only the assigned supervisor can add meeting notes", 403);
  }

  const meeting = await loadMeeting(meetingId);
  if (meeting.type !== MeetingType.PERFORMANCE_PLANNING) {
    throw new AppError("Detailed notes are recorded on Performance Planning Meetings", 400);
  }
  if (meeting.supervisorId !== user.id) {
    throw new AppError("You can only add notes for employees you supervise", 403);
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.meetingNotes.upsert({
      where: { meetingId },
      create: {
        meetingId,
        createdById: user.id,
        discussionSummary: input.discussionSummary,
        decisionsMade: input.decisionsMade,
        keyPoints: input.keyPoints ?? "",
        actionItems: input.actionItems ?? "",
        nextSteps: input.nextSteps ?? "",
        additionalComments: input.additionalComments ?? null,
      },
      update: {
        discussionSummary: input.discussionSummary,
        decisionsMade: input.decisionsMade,
        keyPoints: input.keyPoints ?? "",
        actionItems: input.actionItems ?? "",
        nextSteps: input.nextSteps ?? "",
        additionalComments: input.additionalComments ?? null,
      },
    }),
    prisma.planningMeetingReview.upsert({
      where: { meetingId },
      create: {
        meetingId,
        updatedById: user.id,
        previousAppraisalReviewed: input.previousAppraisalReviewed ?? "",
        previousAppraisalFindings: input.previousAppraisalFindings ?? input.keyAchievements ?? "",
        previousAppraisalObservations: [
          input.previousAppraisalOutcome,
          input.previousPerformance,
        ]
          .filter(Boolean)
          .join("\n"),
        previousPdpObjectives: input.previousPdpReviewed ?? "",
        previousPdpProgress: input.previousPdpCompletion ?? input.previousPdpReviewed ?? "",
        previousPdpCompleted: input.completedGoals ?? "",
        previousPdpIncomplete: input.incompleteGoals ?? "",
        continueFromPreviousPdp: input.carriedForward ?? "",
        employeeStrengths: input.employeeStrengths ?? "",
        employeeWeaknesses: input.employeeWeaknesses ?? "",
        departmentObjectivesNotes: input.departmentObjectives ?? "",
        companyObjectivesNotes: input.companyObjectives ?? "",
        developmentNeedsSummary: input.developmentNeeds ?? "",
        performanceObservations: input.performanceObservations ?? "",
        agreedOutcomes: input.agreedOutcomes ?? "",
        decisionsMade: input.decisionsMade,
        additionalComments: input.additionalComments ?? "",
      },
      update: {
        updatedById: user.id,
        previousAppraisalReviewed: input.previousAppraisalReviewed ?? "",
        previousAppraisalFindings: input.previousAppraisalFindings ?? input.keyAchievements ?? "",
        previousAppraisalObservations: [
          input.previousAppraisalOutcome,
          input.previousPerformance,
        ]
          .filter(Boolean)
          .join("\n"),
        previousPdpObjectives: input.previousPdpReviewed ?? "",
        previousPdpProgress: input.previousPdpCompletion ?? input.previousPdpReviewed ?? "",
        previousPdpCompleted: input.completedGoals ?? "",
        previousPdpIncomplete: input.incompleteGoals ?? "",
        continueFromPreviousPdp: input.carriedForward ?? "",
        employeeStrengths: input.employeeStrengths ?? "",
        employeeWeaknesses: input.employeeWeaknesses ?? "",
        departmentObjectivesNotes: input.departmentObjectives ?? "",
        companyObjectivesNotes: input.companyObjectives ?? "",
        developmentNeedsSummary: input.developmentNeeds ?? "",
        performanceObservations: input.performanceObservations ?? "",
        agreedOutcomes: input.agreedOutcomes ?? "",
        decisionsMade: input.decisionsMade,
        additionalComments: input.additionalComments ?? "",
      },
    }),
    prisma.meeting.update({
      where: { id: meetingId },
      data: { status: MeetingStatus.COMPLETED },
    }),
  ]);

  if (meeting.cycleId) {
    await prisma.employeeCycleProgress.upsert({
      where: {
        cycleId_employeeId: {
          cycleId: meeting.cycleId,
          employeeId: meeting.employeeId,
        },
      },
      create: {
        employeeId: meeting.employeeId,
        cycleId: meeting.cycleId,
        batchId: meeting.batchId,
        currentStage: "PDP_CREATION",
        planningMeetingCompletedAt: now,
      },
      update: {
        planningMeetingCompletedAt: now,
        currentStage: "PDP_CREATION",
      },
    });
  }

  await notifyMeetingParties({
    type: NotificationType.MEETING_COMPLETED,
    title: "Planning meeting completed",
    message: `${meeting.title} has been completed. Meeting notes are now available.`,
    meetingId,
    employeeId: meeting.employeeId,
    supervisorId: meeting.supervisorId,
    notifyHr: true,
  });

  const updated = await loadMeeting(meetingId);
  return serializeMeeting(updated, user.id, user.role);
}

async function loadPreviousAppraisal(employeeId: string, cycleId: string | null) {
  if (!cycleId) return null;
  const current = await prisma.appraisalCycle.findUnique({
    where: { id: cycleId },
    select: { startDate: true },
  });
  if (!current) return null;
  const previous = await prisma.appraisalCycle.findFirst({
    where: {
      status: "COMPLETED",
      startDate: { lt: current.startDate, gte: new Date("2023-01-01") },
      OR: [
        { appraisalOutcomes: { some: { employeeId } } },
        { pdps: { some: { employeeId } } },
      ],
    },
    orderBy: { startDate: "desc" },
    select: { id: true, name: true, startDate: true, endDate: true },
  });
  if (!previous) return null;

  const [outcome, pdp, reviews] = await Promise.all([
    prisma.appraisalOutcome.findUnique({
      where: { cycleId_employeeId: { cycleId: previous.id, employeeId } },
    }),
    prisma.personalDevelopmentPlan.findUnique({
      where: { cycleId_employeeId: { cycleId: previous.id, employeeId } },
      include: { goals: { orderBy: { sortOrder: "asc" }, take: 12 } },
    }),
    prisma.appraisalReview.findMany({
      where: { cycleId: previous.id, employeeId },
      orderBy: { completedAt: "asc" },
    }),
  ]);

  return {
    cycle: previous,
    outcome: outcome
      ? {
          overallResult: outcome.overallResult,
          ratingBand: outcome.ratingBand,
          overallScore: outcome.overallScore,
          awardTitle: outcome.awardTitle,
          bonusAmount: outcome.bonusAmount,
          promotionTitle: outcome.promotionTitle,
          pipRequired: outcome.pipRequired,
          pipSummary: outcome.pipSummary,
        }
      : null,
    pdp: pdp
      ? {
          status: pdp.status,
          summary: pdp.summary,
          goals: pdp.goals.map((goal) => ({
            id: goal.id,
            title: goal.title,
            objective: goal.objective,
            progress: goal.progress,
            status: goal.status,
          })),
        }
      : null,
    reviews: reviews.map((review) => ({
      kind: review.kind,
      score: review.score,
      comments: review.comments,
    })),
  };
}

export async function confirmPlanningMeetingByHr(userId: string, meetingId: string) {
  const user = await requireUser(userId);
  if (user.role !== Role.HR) {
    throw new AppError("Only HR can confirm a scheduled planning meeting", 403);
  }

  const meeting = await loadMeeting(meetingId);
  const employeeAccepted =
    meeting.participants.find(
      (item) => item.participantRole === MeetingParticipantRole.EMPLOYEE
    )?.response === MeetingParticipantResponse.ACCEPTED;
  const supervisorAccepted =
    meeting.participants.find(
      (item) => item.participantRole === MeetingParticipantRole.SUPERVISOR
    )?.response === MeetingParticipantResponse.ACCEPTED;

  if (!employeeAccepted || !supervisorAccepted) {
    throw new AppError("Both the employee and supervisor must confirm first", 400);
  }
  if (meeting.status === MeetingStatus.COMPLETED) {
    throw new AppError("This meeting has already been completed", 400);
  }

  await prisma.meeting.update({
    where: { id: meetingId },
    data: { status: MeetingStatus.CONFIRMED },
  });

  await notifyMeetingParties({
    type: NotificationType.MEETING_CONFIRMED,
    title: "Meeting confirmed",
    message: `HR confirmed ${meeting.title}.`,
    meetingId,
    employeeId: meeting.employeeId,
    supervisorId: meeting.supervisorId,
  });

  const updated = await loadMeeting(meetingId);
  return serializeMeeting(updated, user.id, user.role);
}

export async function listTypedMeetings(
  userId: string,
  types: MeetingType[],
  query: {
    page?: number;
    pageSize?: number;
    employeeId?: string;
    cycleId?: string;
    pdpStartDate?: string;
    from?: string;
    to?: string;
    status?: string;
    tab?: "schedule" | "history" | "all";
  } = {}
) {
  const user = await requireUser(userId);
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 10;
  const now = new Date();
  const cycle = query.cycleId
    ? await prisma.appraisalCycle.findUnique({ where: { id: query.cycleId } })
    : await getActiveCycle();
  const where: Prisma.MeetingWhereInput = {
    type: { in: types },
  };
  if (user.role === Role.EMPLOYEE) where.employeeId = user.id;
  else if (user.role === Role.SUPERVISOR) where.supervisorId = user.id;
  if (query.employeeId) where.employeeId = query.employeeId;
  if (cycle) where.cycleId = cycle.id;
  if (query.status) where.status = query.status as MeetingStatus;
  if (query.from || query.to) {
    where.scheduledAt = {
      ...(query.from ? { gte: new Date(query.from) } : {}),
      ...(query.to ? { lte: new Date(query.to) } : {}),
    };
  }
  if (query.tab === "history") {
    where.status = { in: [MeetingStatus.COMPLETED, MeetingStatus.CANCELLED] };
  } else if (query.tab === "schedule") {
    where.status = { in: ACTIVE_MEETING_STATUSES };
  }

  const statsWhere: Prisma.MeetingWhereInput = {
    type: { in: types },
    ...(user.role === Role.EMPLOYEE ? { employeeId: user.id } : {}),
    ...(user.role === Role.SUPERVISOR ? { supervisorId: user.id } : {}),
    ...(query.employeeId ? { employeeId: query.employeeId } : {}),
    ...(cycle ? { cycleId: cycle.id } : {}),
  };

  const pdpWhere: Prisma.PersonalDevelopmentPlanWhereInput = {
    status: { in: [PdpStatus.ASSIGNED, PdpStatus.COMPLETED, PdpStatus.READY_FOR_ASSIGNMENT, PdpStatus.APPROVED] },
    ...(cycle ? { cycleId: cycle.id } : {}),
    ...(user.role === Role.SUPERVISOR ? { supervisorId: user.id } : {}),
    ...(user.role === Role.EMPLOYEE ? { employeeId: user.id } : {}),
  };
  if (query.pdpStartDate) {
    const start = new Date(`${query.pdpStartDate}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    pdpWhere.OR = [
      { assignedAt: { gte: start, lt: end } },
      { AND: [{ assignedAt: null }, { createdAt: { gte: start, lt: end } }] },
    ];
  }

  const pdpRows = await prisma.personalDevelopmentPlan.findMany({
    where: pdpWhere,
    select: {
      id: true,
      status: true,
      assignedAt: true,
      createdAt: true,
      employeeId: true,
      supervisorId: true,
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
      cycle: { select: { id: true, name: true } },
    },
    orderBy: { employee: { name: "asc" } },
  });
  const seenEmployees = new Set<string>();
  const pdpEmployees = pdpRows.filter((item) => {
    if (seenEmployees.has(item.employeeId)) return false;
    seenEmployees.add(item.employeeId);
    return true;
  });
  if (query.pdpStartDate && !query.employeeId) {
    const ids = pdpEmployees.map((item) => item.employeeId);
    where.employeeId = { in: ids.length > 0 ? ids : ["__none__"] };
    statsWhere.employeeId = where.employeeId;
  }

  const [total, meetings, allForStats] = await Promise.all([
    prisma.meeting.count({ where }),
    prisma.meeting.findMany({
      where,
      include: meetingInclude,
      orderBy: { scheduledAt: query.tab === "history" ? "desc" : "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.meeting.findMany({
      where: statsWhere,
      select: {
        id: true,
        status: true,
        scheduledAt: true,
        employeeId: true,
        followUpSlot: true,
      },
    }),
  ]);

  const stats = {
    total: allForStats.length,
    completed: allForStats.filter((item) => item.status === MeetingStatus.COMPLETED).length,
    upcoming: allForStats.filter(
      (item) =>
        item.scheduledAt >= now &&
        item.status !== MeetingStatus.COMPLETED &&
        item.status !== MeetingStatus.CANCELLED
    ).length,
    cancelled: allForStats.filter((item) => item.status === MeetingStatus.CANCELLED).length,
    rescheduled: allForStats.filter(
      (item) =>
        item.status === MeetingStatus.RESCHEDULED ||
        item.status === MeetingStatus.RESCHEDULE_REQUESTED
    ).length,
    scheduled: allForStats.filter((item) => item.status === MeetingStatus.SCHEDULED).length,
  };

  const selectedEmployee = query.employeeId
    ? pdpEmployees.find((item) => item.employeeId === query.employeeId) ?? null
    : null;

  return {
    meetings: meetings.map((meeting) => serializeMeeting(meeting, user.id, user.role)),
    stats,
    pdpEmployees: pdpEmployees.map((item) => ({
      ...item.employee,
      pdpStatus: item.status,
      pdpStartDate: item.assignedAt ?? item.createdAt,
      supervisor: item.supervisor,
      cycle: item.cycle,
      scheduledCount: allForStats.filter((row) => row.employeeId === item.employeeId).length,
    })),
    selectedEmployee: selectedEmployee
      ? {
          ...selectedEmployee.employee,
          pdpStatus: selectedEmployee.status,
          pdpStartDate: selectedEmployee.assignedAt ?? selectedEmployee.createdAt,
          supervisor: selectedEmployee.supervisor,
          cycle: selectedEmployee.cycle,
        }
      : null,
    calendarDates: allForStats.map((item) => item.scheduledAt),
    cycle: cycle ? { id: cycle.id, name: cycle.name, status: cycle.status } : null,
    confirmationQueue: (
      await prisma.meeting.findMany({
        where: {
          type: { in: types },
          status: { in: ACTIVE_MEETING_STATUSES },
          ...(user.role === Role.EMPLOYEE ? { employeeId: user.id } : {}),
          ...(user.role === Role.SUPERVISOR ? { supervisorId: user.id } : {}),
          ...(cycle ? { cycleId: cycle.id } : {}),
        },
        include: meetingInclude,
        orderBy: { scheduledAt: "asc" },
        take: 8,
      })
    )
      .filter(
        (item) =>
          item.status === MeetingStatus.RESCHEDULE_REQUESTED ||
          item.participants.some((p) => p.response === MeetingParticipantResponse.PENDING)
      )
      .slice(0, 4)
      .map((meeting) => serializeMeeting(meeting, user.id, user.role)),
    nextSevenDays: (
      await prisma.meeting.findMany({
        where: {
          type: { in: types },
          status: { in: ACTIVE_MEETING_STATUSES },
          scheduledAt: { gte: now, lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) },
          ...(user.role === Role.EMPLOYEE ? { employeeId: user.id } : {}),
          ...(user.role === Role.SUPERVISOR ? { supervisorId: user.id } : {}),
          ...(cycle ? { cycleId: cycle.id } : {}),
        },
        include: meetingInclude,
        orderBy: { scheduledAt: "asc" },
        take: 8,
      })
    ).map((meeting) => serializeMeeting(meeting, user.id, user.role)),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize) || 1),
  };
}

export async function createOtherMeeting(options: {
  employeeId: string;
  supervisorId: string;
  createdById: string;
  cycleId?: string | null;
  batchId?: string | null;
  title: string;
  description: string;
  scheduledAt: Date;
  location?: string;
}) {
  const endAt = defaultEndAt(options.scheduledAt);
  return prisma.meeting.create({
    data: {
      type: MeetingType.OTHER,
      title: options.title,
      description: options.description,
      employeeId: options.employeeId,
      supervisorId: options.supervisorId,
      createdById: options.createdById,
      cycleId: options.cycleId ?? null,
      batchId: options.batchId ?? null,
      scheduledAt: options.scheduledAt,
      endAt,
      location: options.location ?? "Meeting Room B",
      status: MeetingStatus.SCHEDULED,
      participants: {
        create: [
          {
            employeeId: options.employeeId,
            participantRole: MeetingParticipantRole.EMPLOYEE,
          },
          {
            employeeId: options.supervisorId,
            participantRole: MeetingParticipantRole.SUPERVISOR,
          },
        ],
      },
    },
  });
}

export async function ensureFollowUpMeetingsForEmployee(options: {
  employeeId: string;
  supervisorId: string;
  createdById: string;
  cycleId: string;
  batchId: string;
  startDate: Date;
  count?: number;
}) {
  const existing = await prisma.meeting.count({
    where: {
      employeeId: options.employeeId,
      cycleId: options.cycleId,
      type: MeetingType.FOLLOW_UP,
    },
  });
  if (existing > 0) return { created: 0 };

  const count = options.count ?? 5;
  const first = new Date(options.startDate);
  first.setHours(10, 30, 0, 0);
  for (let slot = 1; slot <= count; slot += 1) {
    const scheduledAt = new Date(first);
    scheduledAt.setMonth(scheduledAt.getMonth() + (slot - 1));
    const endAt = defaultEndAt(scheduledAt);
    await prisma.meeting.create({
      data: {
        type: MeetingType.FOLLOW_UP,
        title: `Follow-up Meeting ${slot}`,
        employeeId: options.employeeId,
        supervisorId: options.supervisorId,
        createdById: options.createdById,
        cycleId: options.cycleId,
        batchId: options.batchId,
        followUpSlot: slot,
        scheduledAt,
        endAt,
        location: "Microsoft Teams",
        status: MeetingStatus.SCHEDULED,
        participants: {
          create: [
            { employeeId: options.employeeId, participantRole: MeetingParticipantRole.EMPLOYEE },
            { employeeId: options.supervisorId, participantRole: MeetingParticipantRole.SUPERVISOR },
          ],
        },
      },
    });
  }
  await notifyMeetingParties({
    type: NotificationType.FOLLOW_UP_SCHEDULED,
    title: "Follow-up meetings scheduled",
    message: `${count} follow-up meetings were scheduled after the PDP was assigned.`,
    meetingId: "",
    employeeId: options.employeeId,
    supervisorId: options.supervisorId,
    notifyHr: true,
  });
  return { created: count };
}

export async function scheduleTypedMeeting(
  userId: string,
  type: MeetingType,
  input: ScheduleTypedMeetingInput
) {
  const user = await requireUser(userId);
  if (user.role !== Role.HR && user.role !== Role.SUPERVISOR) {
    throw new AppError("Only HR or a supervisor can schedule this meeting", 403);
  }
  const cycle = await getActiveCycle();
  if (!cycle) throw new AppError("There is no active appraisal cycle", 400);

  if (user.role === Role.SUPERVISOR) {
    const assigned = await prisma.employeeSupervisorAssignment.findFirst({
      where: { cycleId: cycle.id, supervisorId: user.id, employeeId: input.employeeId },
    });
    if (!assigned) throw new AppError("This employee is not assigned to your team", 403);
  }

  const supervisorAssignment = await prisma.employeeSupervisorAssignment.findUnique({
    where: { cycleId_employeeId: { cycleId: cycle.id, employeeId: input.employeeId } },
  });
  const supervisorId = supervisorAssignment?.supervisorId ?? (user.role === Role.SUPERVISOR ? user.id : null);
  if (!supervisorId) throw new AppError("Assign a supervisor before scheduling this meeting", 400);

  const batchAssignment = await prisma.employeeBatchAssignment.findUnique({
    where: { cycleId_employeeId: { cycleId: cycle.id, employeeId: input.employeeId } },
  });

  if (type === MeetingType.FOLLOW_UP) {
    const pdp = await prisma.personalDevelopmentPlan.findUnique({
      where: { cycleId_employeeId: { cycleId: cycle.id, employeeId: input.employeeId } },
    });
    if (!pdp) {
      throw new AppError("Follow-up meetings can only be created for employees with a PDP", 400);
    }
  }

  const lastSlot =
    type === MeetingType.FOLLOW_UP
      ? (
          await prisma.meeting.aggregate({
            where: { employeeId: input.employeeId, cycleId: cycle.id, type: MeetingType.FOLLOW_UP },
            _max: { followUpSlot: true },
          })
        )._max.followUpSlot ?? 0
      : null;
  const slot = lastSlot === null ? null : lastSlot + 1;
  const scheduledAt = input.scheduledAt;
  const endAt = defaultEndAt(scheduledAt, input.endAt);
  const employee = await prisma.employee.findUnique({
    where: { id: input.employeeId },
    select: { name: true },
  });

  const created = await prisma.meeting.create({
    data: {
      type,
      title:
        input.title ??
        (type === MeetingType.FOLLOW_UP
          ? `Follow-up Meeting ${slot}`
          : `Other Meeting — ${employee?.name ?? "Employee"}`),
      description: input.description ?? null,
      employeeId: input.employeeId,
      supervisorId,
      createdById: user.id,
      cycleId: cycle.id,
      batchId: batchAssignment?.batchId ?? null,
      followUpSlot: slot,
      isAdditionalFollowUp: type === MeetingType.FOLLOW_UP,
      scheduledAt,
      endAt,
      location: input.location ?? (type === MeetingType.FOLLOW_UP ? "Microsoft Teams" : "Meeting Room B"),
      status: MeetingStatus.SCHEDULED,
      participants: {
        create: [
          { employeeId: input.employeeId, participantRole: MeetingParticipantRole.EMPLOYEE },
          { employeeId: supervisorId, participantRole: MeetingParticipantRole.SUPERVISOR },
        ],
      },
    },
    include: meetingInclude,
  });

  await notifyMeetingParties({
    type: type === MeetingType.FOLLOW_UP ? NotificationType.FOLLOW_UP_SCHEDULED : NotificationType.MEETING_INVITATION,
    title: created.title,
    message: `${created.title} was scheduled.`,
    meetingId: created.id,
    employeeId: created.employeeId,
    supervisorId: created.supervisorId,
    notifyHr: true,
  });

  return serializeMeeting(created, user.id, user.role);
}

export async function getMeetingCalendar(userId: string, query: MeetingCalendarQuery = {}) {
  const user = await requireUser(userId);
  const now = new Date();
  const year = query.year ?? now.getFullYear();
  const month = query.month ?? now.getMonth() + 1;
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  const where: Prisma.MeetingWhereInput = {
    scheduledAt: { gte: start, lt: end },
  };
  if (user.role === Role.EMPLOYEE) where.employeeId = user.id;
  else if (user.role === Role.SUPERVISOR) where.supervisorId = user.id;
  if (query.type && query.type !== "all") where.type = query.type as MeetingType;
  if (query.status && query.status !== "all") where.status = query.status as MeetingStatus;

  const meetings = await prisma.meeting.findMany({
    where,
    include: meetingInclude,
    orderBy: { scheduledAt: "asc" },
  });

  const allScoped: Prisma.MeetingWhereInput = {
    ...(user.role === Role.EMPLOYEE ? { employeeId: user.id } : {}),
    ...(user.role === Role.SUPERVISOR ? { supervisorId: user.id } : {}),
  };
  const [monthAll, totalAll, upcoming, completed, cancelled, participantRows] = await Promise.all([
    prisma.meeting.count({ where: { ...allScoped, scheduledAt: { gte: start, lt: end } } }),
    prisma.meeting.count({ where: allScoped }),
    prisma.meeting.count({
      where: {
        ...allScoped,
        scheduledAt: { gte: now },
        status: { notIn: [MeetingStatus.COMPLETED, MeetingStatus.CANCELLED] },
      },
    }),
    prisma.meeting.count({ where: { ...allScoped, status: MeetingStatus.COMPLETED } }),
    prisma.meeting.count({ where: { ...allScoped, status: MeetingStatus.CANCELLED } }),
    prisma.meetingParticipant.findMany({
      where: { meeting: allScoped },
      select: { response: true },
    }),
  ]);
  const accepted = participantRows.filter((item) => item.response === MeetingParticipantResponse.ACCEPTED).length;
  const attendanceRate = participantRows.length
    ? Math.round((accepted / participantRows.length) * 1000) / 10
    : 0;

  const selectedDate = query.date ? new Date(query.date) : null;
  const dayMeetings = selectedDate
    ? meetings.filter((item) => item.scheduledAt.toDateString() === selectedDate.toDateString())
    : [];

  const byDay = new Map<number, { planning: number; followUp: number; other: number }>();
  for (const meeting of meetings) {
    const day = meeting.scheduledAt.getDate();
    const current = byDay.get(day) ?? { planning: 0, followUp: 0, other: 0 };
    if (meeting.type === MeetingType.PERFORMANCE_PLANNING) current.planning += 1;
    else if (meeting.type === MeetingType.FOLLOW_UP) current.followUp += 1;
    else current.other += 1;
    byDay.set(day, current);
  }

  return {
    year,
    month,
    stats: {
      total: totalAll,
      monthTotal: monthAll,
      upcoming,
      completed,
      cancelled,
      attendanceRate,
      participantCount: participantRows.length,
    },
    days: [...byDay.entries()].map(([day, counts]) => ({
      day,
      total: counts.planning + counts.followUp + counts.other,
      ...counts,
    })),
    meetings: meetings.map((meeting) => serializeMeeting(meeting, user.id, user.role)),
    selectedDateMeetings: dayMeetings.map((meeting) => serializeMeeting(meeting, user.id, user.role)),
    upcomingMeetings: meetings
      .filter(
        (item) =>
          item.scheduledAt >= now &&
          item.status !== MeetingStatus.COMPLETED &&
          item.status !== MeetingStatus.CANCELLED
      )
      .slice(0, 8)
      .map((meeting) => serializeMeeting(meeting, user.id, user.role)),
  };
}

