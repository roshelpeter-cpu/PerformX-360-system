import { prisma } from "../lib/prisma.js";
import { signToken } from "../lib/jwt.js";
import { AppError } from "../utils/errors.js";
import {
  generateSecurePassword,
  hashPassword,
  verifyPassword,
} from "../utils/password.js";
import type { AuthenticatedUser, LoginResult } from "../types/auth.js";
import {
  assertNotAuthLocked,
  clearUnauthorizedAttempts,
  recordUnauthorizedAccessAttempt,
} from "./security.service.js";
import { notifyAllHrUsers, createNotification } from "./notification.service.js";
import { sendPasswordResetEmail } from "./email.service.js";

function mapEmployee(employee: {
  id: string;
  employeeId: string;
  name: string;
  role: AuthenticatedUser["role"];
  companyEmail: string;
  department: { name: string } | null;
}): AuthenticatedUser {
  return {
    id: employee.id,
    employeeId: employee.employeeId,
    name: employee.name,
    role: employee.role,
    companyEmail: employee.companyEmail,
    department: employee.department?.name ?? null,
  };
}

export async function loginUser(
  employeeId: string,
  password: string
): Promise<LoginResult> {
  const employee = await prisma.employee.findUnique({
    where: { employeeId },
    include: { department: true },
  });

  if (!employee) {
    throw new AppError("Employee ID not found.", 404, "EMPLOYEE_NOT_FOUND");
  }

  await assertNotAuthLocked(employee.id);

  const passwordValid = await verifyPassword(password, employee.passwordHash);
  if (!passwordValid) {
    await prisma.securityEvent.create({
      data: {
        employeeId: employee.id,
        type: "LOGIN_FAILED",
        description: "Incorrect password during login attempt",
      },
    });
    throw new AppError("Incorrect password.", 401, "INCORRECT_PASSWORD");
  }

  // Successful login clears prior unauthorized-route attempt counters.
  await clearUnauthorizedAttempts(employee.id);

  const user = mapEmployee(employee);
  const token = signToken({
    sub: employee.id,
    employeeId: employee.employeeId,
    role: employee.role,
  });

  return { user, token };
}

export async function getCurrentUser(userId: string): Promise<AuthenticatedUser> {
  const employee = await prisma.employee.findUnique({
    where: { id: userId },
    include: { department: true },
  });

  if (!employee) {
    throw new AppError("Authentication required", 401);
  }

  return mapEmployee(employee);
}

export async function createForgotPasswordRequest(employeeId: string) {
  const employee = await prisma.employee.findUnique({
    where: { employeeId },
  });

  if (!employee) {
    // Do not reveal whether the employee exists on this endpoint.
    return { created: false };
  }

  await prisma.passwordResetRequest.create({
    data: {
      employeeId: employee.id,
      status: "PENDING",
    },
  });

  await notifyAllHrUsers({
    type: "PASSWORD_RESET_REQUEST",
    title: "Password Reset Request",
    message: `${employee.name} (${employee.employeeId}) requested a password reset.`,
    subjectEmployeeId: employee.id,
    metadata: {
      employeeId: employee.employeeId,
      employeeName: employee.name,
      requestType: "PASSWORD_RESET",
      status: "PENDING",
      requestedAt: new Date().toISOString(),
    },
  });

  return { created: true };
}

export async function hrResetEmployeePassword(targetEmployeeId: string) {
  const employee = await prisma.employee.findUnique({
    where: { employeeId: targetEmployeeId },
  });

  if (!employee) {
    throw new AppError("Employee not found", 404);
  }

  const plainPassword = generateSecurePassword();
  const passwordHash = await hashPassword(plainPassword);

  await prisma.employee.update({
    where: { id: employee.id },
    data: { passwordHash },
  });

  await prisma.passwordResetRequest.updateMany({
    where: {
      employeeId: employee.id,
      status: "PENDING",
    },
    data: {
      status: "HANDLED",
      handledAt: new Date(),
    },
  });

  await prisma.securityEvent.create({
    data: {
      employeeId: employee.id,
      type: "PASSWORD_RESET",
      description: "Password reset performed by HR",
    },
  });

  const emailResult = await sendPasswordResetEmail({
    to: employee.companyEmail,
    employeeName: employee.name,
    employeeId: employee.employeeId,
    newPassword: plainPassword,
  });

  await createNotification({
    type: "PASSWORD_RESET_COMPLETE",
    title: "Password Reset Completed",
    message: `Password reset completed for ${employee.name} (${employee.employeeId}).`,
    subjectEmployeeId: employee.id,
    metadata: {
      employeeId: employee.employeeId,
      emailSent: emailResult.sent,
    },
  });

  // Plaintext password exists only in memory during this response cycle — never stored in PostgreSQL.
  return {
    employeeId: employee.employeeId,
    emailSent: emailResult.sent,
    emailReason: emailResult.reason,
  };
}

export async function reportUnauthorizedRouteAccess(params: {
  employeeDbId: string;
  employeePublicId: string;
  employeeName: string;
  attemptedRoute: string;
}) {
  return recordUnauthorizedAccessAttempt(params);
}

export async function extendUserSession(userId: string): Promise<LoginResult> {
  const employee = await prisma.employee.findUnique({
    where: { id: userId },
    include: { department: true },
  });

  if (!employee) {
    throw new AppError("Authentication required", 401);
  }

  const user = mapEmployee(employee);
  const token = signToken({
    sub: employee.id,
    employeeId: employee.employeeId,
    role: employee.role,
  });

  return { user, token };
}
