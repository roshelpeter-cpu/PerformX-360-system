import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/errors.js";
import {
  getCurrentAppraisalCycle,
  getWorkforceSummary,
  listAppraisalCycles,
} from "./appraisal-cycle.service.js";
import {
  getNotificationsForUser,
  getUnreadNotificationCount,
} from "./notification.service.js";
import { getEmployeeAppraisalProgress } from "./appraisal-progress.service.js";
import { MeetingStatus, MeetingType, PdpStatus, Role } from "../../generated/prisma/client.js";

function serializeEmployee(employee: {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  companyEmail: string;
  jobTitle: string | null;
  department: { id: string; name: string } | null;
}) {
  return {
    id: employee.id,
    employeeId: employee.employeeId,
    name: employee.name,
    role: employee.role,
    companyEmail: employee.companyEmail,
    jobTitle: employee.jobTitle,
    department: employee.department,
  };
}

async function loadActiveAssignment(employeeDbId: string) {
  const activeCycle = await prisma.appraisalCycle.findFirst({
    where: { status: "ACTIVE" },
    include: {
      batches: { orderBy: { batchNumber: "asc" } },
    },
  });

  if (!activeCycle) {
    return {
      cycle: null,
      batch: null,
      supervisor: null,
    };
  }

  const [batchAssignment, supervisorAssignment] = await Promise.all([
    prisma.employeeBatchAssignment.findUnique({
      where: {
        cycleId_employeeId: {
          cycleId: activeCycle.id,
          employeeId: employeeDbId,
        },
      },
      include: {
        batch: true,
      },
    }),
    prisma.employeeSupervisorAssignment.findUnique({
      where: {
        cycleId_employeeId: {
          cycleId: activeCycle.id,
          employeeId: employeeDbId,
        },
      },
      include: {
        supervisor: {
          select: {
            id: true,
            employeeId: true,
            name: true,
            jobTitle: true,
            companyEmail: true,
          },
        },
      },
    }),
  ]);

  return {
    cycle: {
      id: activeCycle.id,
      name: activeCycle.name,
      status: activeCycle.status,
      startDate: activeCycle.startDate,
      endDate: activeCycle.endDate,
      description: activeCycle.description,
    },
    batch: batchAssignment?.batch
      ? {
          id: batchAssignment.batch.id,
          name: batchAssignment.batch.name,
          batchNumber: batchAssignment.batch.batchNumber,
          status: batchAssignment.batch.status,
          currentStage: batchAssignment.batch.currentStage,
          startDate: batchAssignment.batch.startDate,
          endDate: batchAssignment.batch.endDate,
        }
      : null,
    supervisor: supervisorAssignment?.supervisor ?? null,
  };
}

export async function getDashboardForUser(userId: string) {
  const employee = await prisma.employee.findUnique({
    where: { id: userId },
    include: { department: true },
  });

  if (!employee) {
    throw new AppError("Authentication required", 401);
  }

  const [notifications, unreadCount] = await Promise.all([
    getNotificationsForUser(employee.id, 8),
    getUnreadNotificationCount(employee.id),
  ]);

  const profile = serializeEmployee(employee);
  const assignment = await loadActiveAssignment(employee.id);

  if (employee.role === "EMPLOYEE") {
    const progress = await getEmployeeAppraisalProgress(employee.id);
    return {
      role: employee.role,
      profile,
      ...assignment,
      progress,
      notifications,
      unreadCount,
    };
  }

  if (employee.role === "SUPERVISOR") {
    const team = assignment.cycle
      ? await prisma.employeeSupervisorAssignment.findMany({
          where: {
            cycleId: assignment.cycle.id,
            supervisorId: employee.id,
          },
          include: {
            employee: {
              include: {
                department: true,
                batchAssignments: {
                  where: { cycleId: assignment.cycle.id },
                  include: { batch: true },
                },
              },
            },
          },
          orderBy: { employee: { name: "asc" } },
        })
      : [];

    return {
      role: employee.role,
      profile,
      ...assignment,
      teamCount: team.length,
      team: team.map((row) => ({
        id: row.employee.id,
        employeeId: row.employee.employeeId,
        name: row.employee.name,
        jobTitle: row.employee.jobTitle,
        companyEmail: row.employee.companyEmail,
        department: row.employee.department,
        batch: row.employee.batchAssignments[0]?.batch
          ? {
              id: row.employee.batchAssignments[0].batch.id,
              name: row.employee.batchAssignments[0].batch.name,
              batchNumber: row.employee.batchAssignments[0].batch.batchNumber,
            }
          : null,
      })),
      notifications,
      unreadCount,
      overview: await buildWorkspaceOverview(employee.id, Role.SUPERVISOR),
    };
  }

  const [workforce, cycles, pendingResets] = await Promise.all([
    getWorkforceSummary(),
    listAppraisalCycles(),
    prisma.passwordResetRequest.count({ where: { status: "PENDING" } }),
  ]);

  if (employee.role === "HR") {
    const currentCycle = await getCurrentAppraisalCycle();
    const overview = await buildWorkspaceOverview(employee.id, Role.HR);
    return {
      role: employee.role,
      profile,
      workforce,
      currentCycle,
      cycles: cycles.slice(0, 6),
      pendingPasswordResets: pendingResets,
      overview,
      notifications,
      unreadCount,
    };
  }

  const departmentCounts = await prisma.department.findMany({
    select: {
      id: true,
      name: true,
      _count: { select: { employees: true } },
    },
    orderBy: { name: "asc" },
  });

  return {
    role: employee.role,
    profile,
    workforce,
    cycles: cycles.slice(0, 8),
    departments: departmentCounts.map((department) => ({
      id: department.id,
      name: department.name,
      employeeCount: department._count.employees,
    })),
    notifications,
    unreadCount,
  };
}

async function buildWorkspaceOverview(userId: string, role: Role) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay.getTime() + 86_400_000);
  const meetingScope =
    role === Role.SUPERVISOR ? { supervisorId: userId } : role === Role.EMPLOYEE ? { employeeId: userId } : {};
  const activeCycle = await prisma.appraisalCycle.findFirst({
    where: { status: "ACTIVE" },
    select: { id: true },
  });
  const pdpScope = {
    ...(role === Role.SUPERVISOR ? { supervisorId: userId } : {}),
    ...(activeCycle ? { cycleId: activeCycle.id } : {}),
  };

  const [
    totalEmployees,
    meetings,
    pdps,
    waitingHr,
    changeRequests,
    rescheduleRequests,
    activePdpsNeedingFollowUp,
  ] = await Promise.all([
    role === Role.HR
      ? prisma.employee.count({ where: { role: Role.EMPLOYEE } })
      : prisma.employeeSupervisorAssignment.count({
          where: { supervisorId: userId, cycle: { status: "ACTIVE" } },
        }),
    prisma.meeting.findMany({
      where: meetingScope,
      select: {
        id: true,
        type: true,
        status: true,
        title: true,
        scheduledAt: true,
        endAt: true,
        location: true,
        employee: { select: { id: true, name: true, employeeId: true } },
        supervisor: { select: { id: true, name: true } },
        participants: {
          include: { employee: { select: { name: true } } },
        },
      },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.personalDevelopmentPlan.findMany({
      where: pdpScope,
      select: { status: true, employeeAgreedAt: true, hrReviewedAt: true },
    }),
    prisma.personalDevelopmentPlan.count({
      where: {
        ...pdpScope,
        hrReviewedAt: null,
        status: { in: [PdpStatus.SUBMITTED, PdpStatus.PENDING_HR_REVIEW, PdpStatus.PENDING_HR_INTERVENTION] },
      },
    }),
    prisma.personalDevelopmentPlan.count({
      where: {
        ...pdpScope,
        status: {
          in: [
            PdpStatus.CHANGES_REQUESTED,
            PdpStatus.CHANGES_REQUESTED_BY_EMPLOYEE,
            PdpStatus.CHANGES_REQUESTED_BY_HR,
          ],
        },
      },
    }),
    prisma.meetingRescheduleRequest.count({
      where: {
        status: "PENDING",
        meeting: meetingScope,
      },
    }),
    prisma.personalDevelopmentPlan.findMany({
      where: {
        ...pdpScope,
        status: { in: [PdpStatus.ASSIGNED, PdpStatus.APPROVED, PdpStatus.READY_FOR_ASSIGNMENT] },
      },
      select: { employeeId: true },
    }),
  ]);

  const followUpEmployeeRows =
    activePdpsNeedingFollowUp.length === 0
      ? []
      : await prisma.meeting.findMany({
          where: {
            type: MeetingType.FOLLOW_UP,
            employeeId: { in: activePdpsNeedingFollowUp.map((item) => item.employeeId) },
            ...(activeCycle ? { cycleId: activeCycle.id } : {}),
            status: { not: MeetingStatus.CANCELLED },
          },
          distinct: ["employeeId"],
          select: { employeeId: true },
        });
  const employeesWithFollowUps = new Set(followUpEmployeeRows.map((item) => item.employeeId));
  const needsScheduling = activePdpsNeedingFollowUp.filter(
    (item) => !employeesWithFollowUps.has(item.employeeId)
  ).length;

  const meetingsToday = meetings.filter(
    (item) => item.scheduledAt >= startOfDay && item.scheduledAt < endOfDay
  ).length;
  const completedMeetings = meetings.filter((item) => item.status === MeetingStatus.COMPLETED).length;
  const cancelledMeetings = meetings.filter((item) => item.status === MeetingStatus.CANCELLED).length;
  const planning = meetings.filter((item) => item.type === MeetingType.PERFORMANCE_PLANNING).length;
  const followUp = meetings.filter((item) => item.type === MeetingType.FOLLOW_UP).length;
  const other = meetings.filter(
    (item) => item.type === MeetingType.OTHER || item.type === MeetingType.PDP_DISAGREEMENT
  ).length;
  const pdpCounts = {
    draft: 0,
    waitingEmployee: 0,
    waitingHr: 0,
    approved: 0,
    completed: 0,
  };
  for (const pdp of pdps) {
    if (pdp.status === PdpStatus.DRAFT) pdpCounts.draft += 1;
    else if (pdp.status === PdpStatus.COMPLETED) pdpCounts.completed += 1;
    else if (
      pdp.status === PdpStatus.APPROVED ||
      pdp.status === PdpStatus.ASSIGNED ||
      pdp.status === PdpStatus.READY_FOR_ASSIGNMENT
    ) {
      pdpCounts.approved += 1;
    } else if (!pdp.employeeAgreedAt) pdpCounts.waitingEmployee += 1;
    else if (!pdp.hrReviewedAt) pdpCounts.waitingHr += 1;
    else pdpCounts.approved += 1;
  }
  const pdpsInProgress = pdps.filter(
    (item) => item.status !== PdpStatus.DRAFT && item.status !== PdpStatus.COMPLETED
  ).length;
  const overallProgress =
    pdps.length === 0 ? 0 : Math.round(((pdpCounts.approved + pdpCounts.completed) / pdps.length) * 100);

  const upcomingMeetings = meetings
    .filter(
      (item) =>
        item.scheduledAt >= now &&
        item.status !== MeetingStatus.COMPLETED &&
        item.status !== MeetingStatus.CANCELLED
    )
    .slice(0, 6)
    .map((item) => ({
      id: item.id,
      title: item.title,
      type: item.type,
      status: item.status,
      scheduledAt: item.scheduledAt,
      endAt: item.endAt,
      location: item.location,
      employee: item.employee,
      supervisor: item.supervisor,
      participants: item.participants.map((row) => ({
        id: row.id,
        name: row.employee.name,
      })),
    }));

  return {
    totalEmployees,
    pdpsInProgress,
    meetingsToday,
    completedMeetings,
    overallProgress,
    meetingsByType: {
      planning,
      followUp,
      other,
      cancelled: cancelledMeetings,
      total: meetings.length,
    },
    pdpStatus: pdpCounts,
    upcomingMeetings,
    calendarDates: meetings.map((item) => ({
      date: item.scheduledAt,
      type: item.type,
    })),
    tasks: {
      waitingHr,
      changeRequests,
      rescheduleRequests,
      needsScheduling,
    },
  };
}
