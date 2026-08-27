import type { Request, Response, NextFunction } from "express";
import { getDashboardForUser } from "../services/dashboard.service.js";
import { AppError } from "../utils/errors.js";

export async function getMyDashboard(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.id) {
      throw new AppError("Authentication required", 401);
    }

    const dashboard = await getDashboardForUser(req.user.id);
    res.status(200).json({ success: true, dashboard });
  } catch (error) {
    next(error);
  }
}
