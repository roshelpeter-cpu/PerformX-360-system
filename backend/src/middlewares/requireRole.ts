import type { Request, Response, NextFunction } from "express";
import type { AppRole } from "../constants/roles.js";
import { AppError } from "../utils/errors.js";

/**
 * Restrict a route to one or more database roles.
 * The backend remains the final authority for authorization — never rely on frontend route hiding alone.
 * Appraisal Cycle mutations require HR through this helper.
 */
export function requireRole(...allowedRoles: AppRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(new AppError("Authentication required", 401));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new AppError("You do not have permission to access this resource", 403));
      return;
    }

    next();
  };
}
