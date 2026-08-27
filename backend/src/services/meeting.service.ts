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
  Prisma,
  RescheduleRequestStatus,
  Role,
} from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/errors.js";
import { createNotification, notifyAllHrUsers } from "./notification.service.js";
import type {
  PlanningMeetingListQuery,
  RescheduleRequestInput,
  RescheduleReviewInput,
  SavePlanningNotesInput,
  SchedulePlanningMeetingInput,
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

  return {
    id: meeting.id,
    type: meeting.type,
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
    // Notes are only returned after the meeting is completed.
    notes: completed
      ? meeting.notes
        ? {
            discussionSummary: meeting.notes.discussionSummary,
            keyPoints: meeting.notes.keyPoints,
            decisionsMade: meeting.notes.decisionsMade,
            actionItems: meeting.notes.actionItems,
            nextSteps: meeting.notes.nextSteps,
            additionalComments: meeting.notes.additionalComments,
            previousAppraisalReviewed: meeting.planningReview?.previousAppraisalReviewed ?? null,
            previousAppraisalFindings: meeting.planningReview?.previousAppraisalFindings ?? null,
            employeeStrengths: meeting.planningReview?.employeeStrengths ?? null,
            employeeWeaknesses: meeting.planningReview?.employeeWeaknesses ?? null,
            performanceObservations: meeting.planningReview?.performanceObservations ?? null,
            agreedOutcomes: meeting.planningReview?.agreedOutcomes ?? null,
            updatedAt: meeting.notes.updatedAt,
          }
        : null
      : null,
    actions: {
      canConfirm,
      canRequestReschedule,
      canAddNotes,
      canReviewReschedule,
    },
  };
}

async function loadMeeting(meetingId: string) {
  const meeting = await prisma.meeting.findUnique({
    where: { id: meetingId },
    include: meetingInclude,
  });
  if (!meeting || meeting.type !== MeetingType.PERFORMANCE_PLANNING) {
    throw new AppError("Performance planning meeting not found", 404);
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

  const teamMembers =
    user.role === Role.SUPERVISOR && cycle
      ? await prisma.employeeSupervisorAssignment.findMany({
          where: { cycleId: cycle.id, supervisorId: user.id },
          include: {
            employee: {
              select: { id: true, employeeId: true, name: true },
            },
          },
          orderBy: { employee: { name: "asc" } },
        })
      : [];

  return {
    cycle: cycle
      ? { id: cycle.id, name: cycle.name, status: cycle.status }
      : null,
    stats: {
      upcoming: upcomingCount,
      completed: completedCount,
      pendingRequests,
      total: upcomingCount + completedCount,
    },
    teamMembers: teamMembers.map((row) => row.employee),
    meetings: meetings.map((meeting) =>
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
  return serializeMeeting(meeting, user.id, user.role);
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

  const cycle = await getActiveCycle();
  if (!cycle) throw new AppError("There is no active appraisal cycle", 400);

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
    await prisma.meeting.update({
      where: { id: meetingId },
      data: { status: MeetingStatus.CONFIRMED },
    });
    await notifyMeetingParties({
      type: NotificationType.MEETING_CONFIRMED,
      title: "Meeting confirmed",
      message: `${meeting.title} has been confirmed by all participants.`,
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
        previousAppraisalFindings: input.previousAppraisalFindings ?? "",
        employeeStrengths: input.employeeStrengths ?? "",
        employeeWeaknesses: input.employeeWeaknesses ?? "",
        performanceObservations: input.performanceObservations ?? "",
        agreedOutcomes: input.agreedOutcomes ?? "",
        decisionsMade: input.decisionsMade,
        additionalComments: input.additionalComments ?? "",
      },
      update: {
        updatedById: user.id,
        previousAppraisalReviewed: input.previousAppraisalReviewed ?? "",
        previousAppraisalFindings: input.previousAppraisalFindings ?? "",
        employeeStrengths: input.employeeStrengths ?? "",
        employeeWeaknesses: input.employeeWeaknesses ?? "",
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
