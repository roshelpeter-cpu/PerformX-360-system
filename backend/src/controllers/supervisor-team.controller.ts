import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors.js";
import {
  getSupervisorTeam,
  getSupervisorTeamMember,
} from "../services/supervisor-team.service.js";
import type { SupervisorTeamQuery } from "../validations/supervisor-team.validation.js";

export async function getMyTeam(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.id) {
      throw new AppError("Authentication required", 401);
    }

    const team = await getSupervisorTeam(
      req.user.id,
      req.query as unknown as SupervisorTeamQuery
    );
    res.status(200).json({ success: true, ...team });
  } catch (error) {
    next(error);
  }
}

export async function getMyTeamMember(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.id) {
      throw new AppError("Authentication required", 401);
    }
    const { employeeId } = req.params as { employeeId: string };
    const detail = await getSupervisorTeamMember(req.user.id, employeeId);
    res.status(200).json({ success: true, ...detail });
  } catch (error) {
    next(error);
  }
}
