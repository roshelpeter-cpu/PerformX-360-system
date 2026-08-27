// Authentication middleware
// Verifies the session cookie and attaches the authenticated employee to the request.

import type { Request, Response, NextFunction } from "express";
import { cookieName, verifyToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/errors.js";
import type { AuthenticatedUser } from "../types/auth.js";

function mapEmployeeToUser(employee: {
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

// Verify JWT from the HTTP-only cookie — JavaScript on the client cannot read this token directly.
// Appraisal Cycle mutations reuse this middleware; do not bypass it for HR routes.
export async function authenticateUser(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    const token = req.cookies?.[cookieName] as string | undefined;
    if (!token) {
      throw new AppError("Authentication required", 401);
    }

    const payload = verifyToken(token);
    const employee = await prisma.employee.findUnique({
      where: { id: payload.sub },
      include: { department: true },
    });

    if (!employee) {
      throw new AppError("Authentication required", 401);
    }

    req.tokenPayload = payload;
    req.user = mapEmployeeToUser(employee);
    next();
  } catch (error) {
    if (error instanceof AppError) {
      next(error);
      return;
    }
    next(new AppError("Authentication required", 401));
  }
}

export async function optionalAuthenticateUser(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  const token = req.cookies?.[cookieName] as string | undefined;
  if (!token) {
    next();
    return;
  }

  try {
    const payload = verifyToken(token);
    const employee = await prisma.employee.findUnique({
      where: { id: payload.sub },
      include: { department: true },
    });

    if (employee) {
      req.tokenPayload = payload;
      req.user = mapEmployeeToUser(employee);
    }
  } catch {
    // Ignore invalid/expired tokens for optional auth.
  }

  next();
}
