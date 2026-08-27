import { prisma } from "../lib/prisma.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";
import { notifyAllHrUsers } from "./notification.service.js";

export async function assertNotAuthLocked(employeeDbId: string) {
  const lock = await prisma.authLock.findUnique({
    where: { employeeId: employeeDbId },
  });

  if (!lock) {
    return;
  }

  if (lock.lockedUntil > new Date()) {
    const minutesRemaining = Math.ceil(
      (lock.lockedUntil.getTime() - Date.now()) / 60000
    );
    throw new AppError(
      `Your account is temporarily locked due to repeated unauthorized access attempts. Try again in ${minutesRemaining} minute(s).`,
      403,
      "AUTH_LOCKED"
    );
  }

  // Lock expired — remove it automatically.
  await prisma.authLock.delete({ where: { employeeId: employeeDbId } });
}

export async function recordUnauthorizedAccessAttempt(params: {
  employeeDbId: string;
  employeePublicId: string;
  employeeName: string;
  attemptedRoute: string;
}) {
  await prisma.unauthorizedAccessAttempt.create({
    data: {
      employeeId: params.employeeDbId,
      attemptedRoute: params.attemptedRoute,
    },
  });

  await prisma.securityEvent.create({
    data: {
      employeeId: params.employeeDbId,
      type: "UNAUTHORIZED_ACCESS",
      description: `Unauthorized route access attempt: ${params.attemptedRoute}`,
      metadata: { attemptedRoute: params.attemptedRoute },
    },
  });

  const windowStart = new Date(Date.now() - 15 * 60 * 1000);
  const recentAttempts = await prisma.unauthorizedAccessAttempt.count({
    where: {
      employeeId: params.employeeDbId,
      createdAt: { gte: windowStart },
    },
  });

  if (recentAttempts <= env.maxUnauthorizedAttempts) {
    return {
      locked: false as const,
      attemptCount: recentAttempts,
      maxAttempts: env.maxUnauthorizedAttempts,
    };
  }

  const lockedUntil = new Date(
    Date.now() + env.authLockDurationMinutes * 60 * 1000
  );

  await prisma.authLock.upsert({
    where: { employeeId: params.employeeDbId },
    update: {
      lockedUntil,
      reason: "Repeated unauthorized route access attempts",
    },
    create: {
      employeeId: params.employeeDbId,
      lockedUntil,
      reason: "Repeated unauthorized route access attempts",
    },
  });

  await prisma.securityEvent.create({
    data: {
      employeeId: params.employeeDbId,
      type: "AUTH_LOCK",
      description:
        "Temporary authentication lock applied after repeated unauthorized access attempts",
      metadata: {
        lockedUntil: lockedUntil.toISOString(),
        attemptCount: recentAttempts,
      },
    },
  });

  await notifyAllHrUsers({
    type: "SECURITY_WARNING",
    title: "Security Warning — Unauthorized Access Attempts",
    message: `${params.employeeName} (${params.employeePublicId}) triggered a temporary authentication lock after repeated unauthorized route access attempts.`,
    subjectEmployeeId: params.employeeDbId,
    metadata: {
      employeeId: params.employeePublicId,
      attemptedRoute: params.attemptedRoute,
      attemptCount: recentAttempts,
      lockedUntil: lockedUntil.toISOString(),
    },
  });

  return {
    locked: true as const,
    lockedUntil,
    attemptCount: recentAttempts,
    maxAttempts: env.maxUnauthorizedAttempts,
  };
}

export async function clearUnauthorizedAttempts(employeeDbId: string) {
  await prisma.unauthorizedAccessAttempt.deleteMany({
    where: { employeeId: employeeDbId },
  });
}
