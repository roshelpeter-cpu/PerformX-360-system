import { prisma } from "../lib/prisma.js";
import type { NotificationType, Prisma } from "../../generated/prisma/client.js";

export async function createNotification(params: {
  type: NotificationType;
  title: string;
  message: string;
  recipientId?: string;
  subjectEmployeeId?: string;
  metadata?: Record<string, unknown>;
}) {
  return prisma.notification.create({
    data: {
      type: params.type,
      title: params.title,
      message: params.message,
      ...(params.recipientId ? { recipientId: params.recipientId } : {}),
      ...(params.subjectEmployeeId
        ? { subjectEmployeeId: params.subjectEmployeeId }
        : {}),
      ...(params.metadata
        ? { metadata: params.metadata as Prisma.InputJsonValue }
        : {}),
    },
  });
}

export async function notifyAllHrUsers(params: {
  type: NotificationType;
  title: string;
  message: string;
  subjectEmployeeId?: string;
  metadata?: Record<string, unknown>;
}) {
  const hrUsers = await prisma.employee.findMany({
    where: { role: "HR" },
    select: { id: true },
  });

  if (hrUsers.length === 0) {
    // Store a general notification without a specific recipient if no HR users exist yet.
    return createNotification({
      type: params.type,
      title: params.title,
      message: params.message,
      ...(params.subjectEmployeeId
        ? { subjectEmployeeId: params.subjectEmployeeId }
        : {}),
      ...(params.metadata ? { metadata: params.metadata } : {}),
    });
  }

  return prisma.$transaction(
    hrUsers.map((hr) =>
      prisma.notification.create({
        data: {
          type: params.type,
          title: params.title,
          message: params.message,
          recipientId: hr.id,
          ...(params.subjectEmployeeId
            ? { subjectEmployeeId: params.subjectEmployeeId }
            : {}),
          ...(params.metadata
            ? { metadata: params.metadata as Prisma.InputJsonValue }
            : {}),
        },
      })
    )
  );
}

export async function getHrNotifications(limit = 20) {
  return prisma.notification.findMany({
    where: {
      OR: [{ recipient: { role: "HR" } }, { recipientId: null }],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      subjectEmployee: {
        select: {
          employeeId: true,
          name: true,
        },
      },
    },
  });
}

const MEETING_TYPES: NotificationType[] = [
  "MEETING_INVITATION",
  "MEETING_RESPONSE",
  "MEETING_RESCHEDULE_REQUEST",
  "MEETING_ALL_ACCEPTED",
  "MEETING_RESCHEDULED",
  "MEETING_CONFIRMED",
  "MEETING_COMPLETED",
  "FOLLOW_UP_SCHEDULED",
  "FOLLOW_UP_REMINDER",
  "FOLLOW_UP_RESCHEDULE_REQUEST",
];

const PDP_TYPES: NotificationType[] = [
  "PDP_APPROVED",
  "PDP_SUBMITTED",
  "PDP_HR_FEEDBACK",
  "PDP_EMPLOYEE_RESPONSE",
  "PDP_CHANGES_REQUESTED",
  "PDP_INTERVENTION_REQUIRED",
  "PDP_ASSIGNED",
  "PDP_REDIRECTED",
];

const REVIEW_TYPES: NotificationType[] = [
  "SELF_REVIEW_STARTED",
  "BATCH_STAGE_CHANGED",
  "SELF_REVIEW_OPENED",
  "SELF_REVIEW_SUBMITTED",
  "PEER_REVIEW_ASSIGNED",
  "PEER_REVIEW_SUBMITTED",
  "SUPERVISOR_EVALUATION_READY",
  "SUPERVISOR_EVALUATION_SUBMITTED",
  "APPRAISAL_APPROVED",
  "APPRAISAL_REVIEW_REQUESTED",
  "APPRAISAL_REVIEW_RESPONDED",
  "PROMOTION_UPDATED",
  "AWARD_CONFIRMED",
  "PIP_REQUIRED",
  "PIP_ASSIGNED",
];

const SYSTEM_TYPES: NotificationType[] = [
  "PASSWORD_RESET_REQUEST",
  "SECURITY_WARNING",
  "PASSWORD_RESET_COMPLETE",
];

export type NotificationCategory =
  | "all"
  | "unread"
  | "meetings"
  | "pdp"
  | "reviews"
  | "system"
  | "employee";

function categoryWhere(
  category?: NotificationCategory
): Prisma.NotificationWhereInput {
  if (!category || category === "all") return {};
  if (category === "unread") return { status: "UNREAD" };
  if (category === "meetings") return { type: { in: MEETING_TYPES } };
  if (category === "pdp") return { type: { in: PDP_TYPES } };
  if (category === "reviews") return { type: { in: REVIEW_TYPES } };
  if (category === "system") return { type: { in: SYSTEM_TYPES } };
  return { subjectEmployeeId: { not: null } };
}

export function notificationCategory(
  type: NotificationType
): Exclude<NotificationCategory, "all" | "unread"> {
  if (MEETING_TYPES.includes(type)) return "meetings";
  if (PDP_TYPES.includes(type)) return "pdp";
  if (REVIEW_TYPES.includes(type)) return "reviews";
  if (SYSTEM_TYPES.includes(type)) return "system";
  return "employee";
}

export async function getNotificationsForUser(
  userId: string,
  limit = 50,
  category?: NotificationCategory
) {
  // Personal inbox only — recipientId must match the signed-in user.
  return prisma.notification.findMany({
    where: {
      recipientId: userId,
      ...categoryWhere(category),
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
    include: {
      subjectEmployee: {
        select: {
          employeeId: true,
          name: true,
        },
      },
    },
  });
}

export async function getUnreadNotificationCount(userId: string) {
  return prisma.notification.count({
    where: {
      recipientId: userId,
      status: "UNREAD",
    },
  });
}

export async function getNotificationCounts(userId: string) {
  const [all, unread, meetings, pdp, reviews, system, employee] =
    await Promise.all([
      prisma.notification.count({ where: { recipientId: userId } }),
      getUnreadNotificationCount(userId),
      prisma.notification.count({
        where: { recipientId: userId, type: { in: MEETING_TYPES } },
      }),
      prisma.notification.count({
        where: { recipientId: userId, type: { in: PDP_TYPES } },
      }),
      prisma.notification.count({
        where: { recipientId: userId, type: { in: REVIEW_TYPES } },
      }),
      prisma.notification.count({
        where: { recipientId: userId, type: { in: SYSTEM_TYPES } },
      }),
      prisma.notification.count({
        where: { recipientId: userId, subjectEmployeeId: { not: null } },
      }),
    ]);

  return { all, unread, meetings, pdp, reviews, system, employee };
}

export async function markNotificationRead(
  notificationId: string,
  userId: string
) {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      recipientId: userId,
    },
  });

  if (!notification) {
    throw new Error("Notification not found");
  }

  return prisma.notification.update({
    where: {
      id: notificationId,
    },
    data: {
      status: "READ",
    },
  });
}

export async function markAllNotificationsRead(userId: string) {
  return prisma.notification.updateMany({
    where: {
      recipientId: userId,
      status: "UNREAD",
    },
    data: {
      status: "READ",
    },
  });
}
