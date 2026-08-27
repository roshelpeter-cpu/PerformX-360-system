import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors.js";
import type { EmployeeListQuery } from "../validations/employee-management.validation.js";
import {
  getEmployeeOverview,
  getWorkforceEmployee,
  getWorkforceSupervisorDetail,
  listBatchEmployees,
  listEligibleSupervisorsForEmployee,
  listHrUsers,
  listLeadershipUsers,
  listWorkforceEmployees,
  listWorkforceSupervisors,
  reassignEmployeeBatch,
  reassignEmployeeSupervisor,
} from "../services/employee-management.service.js";

function requireUserId(req: Request): string {
  if (!req.user?.id) {
    throw new AppError("Authentication required", 401);
  }
  return req.user.id;
}

export async function getOverview(req: Request, res: Response, next: NextFunction) {
  try {
    const overview = await getEmployeeOverview(
      req.query as unknown as EmployeeListQuery
    );
    res.status(200).json({ success: true, ...overview });
  } catch (error) {
    next(error);
  }
}

export async function listEmployees(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await listWorkforceEmployees(
      req.query as unknown as EmployeeListQuery
    );
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getBatchEmployees(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { batchId } = req.params as { batchId: string };
    const result = await listBatchEmployees(
      batchId,
      req.query as unknown as EmployeeListQuery
    );
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function listSupervisors(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await listWorkforceSupervisors(
      req.query as unknown as EmployeeListQuery
    );
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getSupervisor(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { supervisorId } = req.params as { supervisorId: string };
    const result = await getWorkforceSupervisorDetail(
      supervisorId,
      req.query as unknown as EmployeeListQuery
    );
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function listHr(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await listHrUsers(req.query as unknown as EmployeeListQuery);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function listLeadership(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = await listLeadershipUsers(
      req.query as unknown as EmployeeListQuery
    );
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getEmployee(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { employeeId } = req.params as { employeeId: string };
    const result = await getWorkforceEmployee(employeeId);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function getEligibleSupervisors(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { employeeId } = req.params as { employeeId: string };
    const supervisors = await listEligibleSupervisorsForEmployee(employeeId);
    res.status(200).json({ success: true, supervisors });
  } catch (error) {
    next(error);
  }
}

export async function changeSupervisor(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { employeeId } = req.params as { employeeId: string };
    const changedById = requireUserId(req);
    const result = await reassignEmployeeSupervisor(
      employeeId,
      req.body as {
        newSupervisorId: string;
        reason?: string | null;
        effectiveDate?: string | null;
      },
      changedById
    );
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function changeBatch(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { employeeId } = req.params as { employeeId: string };
    const changedById = requireUserId(req);
    const result = await reassignEmployeeBatch(
      employeeId,
      req.body as {
        newBatchId: string;
        reason?: string | null;
        effectiveDate?: string | null;
        acknowledgeStarted?: boolean;
      },
      changedById
    );
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}
