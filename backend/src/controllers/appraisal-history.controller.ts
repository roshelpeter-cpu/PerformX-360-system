/**
 * Employee/supervisor appraisal history HTTP handlers.
 * Employees may only request their own cycles; supervisors pass employeeId.
 */
import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors.js";
import {
  getHistoricalCycleDetail,
  listHistoricalCycles,
} from "../services/appraisal-history.service.js";
import type { AppraisalHistoryQuery } from "../validations/appraisal-history.validation.js";

export async function listHistoryCycles(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.id) throw new AppError("Authentication required", 401);
    const query = req.query as unknown as AppraisalHistoryQuery;
    const data = await listHistoricalCycles(req.user.id, query.employeeId);
    res.status(200).json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
}

export async function getHistoryCycle(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.id) throw new AppError("Authentication required", 401);
    const query = req.query as unknown as AppraisalHistoryQuery;
    const data = await getHistoricalCycleDetail(
      req.user.id,
      String(req.params.cycleId),
      query.employeeId
    );
    res.status(200).json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
}
