// Appraisal Cycle Controller
// HTTP handlers for HR appraisal-cycle creation, lifecycle, assignments,
// and draft-only deletion.

import fs from "node:fs";
import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors.js";
import { evidenceFilePath } from "../lib/uploads.js";
import {
  activateAppraisalCycle,
  completeAppraisalCycle,
  confirmAppraisalCycle,
  createAppraisalCycle,
  deleteDraftAppraisalCycle,
  getActivationReadiness,
  getAppraisalCycleById,
  getBatchDetail,
  getCurrentAppraisalCycle,
  getWorkforceSummary,
  listAppraisalCycles,
  listDepartments,
  listHistoricalCycles,
  updateAppraisalBatch,
  updateAppraisalCycle,
  startBatchStage,
} from "../services/appraisal-cycle.service.js";
import {
  changeEmployeeBatch,
  changeEmployeeSupervisor,
  getAssignmentHistory,
  getSupervisorDetail,
  listCycleEmployees,
  listCycleSupervisors,
  listDepartmentSupervisors,
} from "../services/appraisal-assignment.service.js";
import type {
  AssignmentHistoryQuery,
  ChangeBatchInput,
  ChangeSupervisorInput,
  CreateCycleInput,
  CycleListQuery,
  EmployeeAssignmentQuery,
  SupervisorQuery,
  UpdateBatchInput,
  UpdateCycleInput,
} from "../validations/appraisal-cycle.validation.js";

function requireUserId(req: Request): string {
  if (!req.user?.id) {
    throw new AppError("Authentication required", 401);
  }
  return req.user.id;
}

function evidenceFromRequest(req: Request) {
  const file = req.file;
  if (!file) return null;
  return { filename: file.filename, originalName: file.originalname };
}

export async function listCycles(req: Request, res: Response, next: NextFunction) {
  try {
    const cycles = await listAppraisalCycles(
      req.query as unknown as CycleListQuery
    );
    res.status(200).json({ success: true, cycles });
  } catch (error) {
    next(error);
  }
}

export async function getCurrentCycle(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const cycle = await getCurrentAppraisalCycle();
    res.status(200).json({ success: true, cycle });
  } catch (error) {
    next(error);
  }
}

export async function getHistoryCycles(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const cycles = await listHistoricalCycles();
    res.status(200).json({ success: true, cycles });
  } catch (error) {
    next(error);
  }
}

export async function getWorkforce(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const workforce = await getWorkforceSummary();
    res.status(200).json({ success: true, workforce });
  } catch (error) {
    next(error);
  }
}

export async function getCycle(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const cycle = await getAppraisalCycleById(id);
    res.status(200).json({ success: true, cycle });
  } catch (error) {
    next(error);
  }
}

export async function createCycle(req: Request, res: Response, next: NextFunction) {
  try {
    const createdById = requireUserId(req);
    const cycle = await createAppraisalCycle(
      req.body as CreateCycleInput,
      createdById
    );
    res.status(201).json({ success: true, cycle });
  } catch (error) {
    next(error);
  }
}

export async function updateCycle(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const cycle = await updateAppraisalCycle(id, req.body as UpdateCycleInput);
    res.status(200).json({ success: true, cycle });
  } catch (error) {
    next(error);
  }
}

export async function confirmCycle(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const cycle = await confirmAppraisalCycle(id);
    res.status(200).json({ success: true, cycle });
  } catch (error) {
    next(error);
  }
}

export async function getActivationPreview(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params as { id: string };
    const readiness = await getActivationReadiness(id);
    res.status(200).json({ success: true, readiness });
  } catch (error) {
    next(error);
  }
}

export async function activateCycle(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params as { id: string };
    const cycle = await activateAppraisalCycle(id);
    res.status(200).json({ success: true, cycle });
  } catch (error) {
    next(error);
  }
}

export async function completeCycle(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params as { id: string };
    const cycle = await completeAppraisalCycle(id);
    res.status(200).json({ success: true, cycle });
  } catch (error) {
    next(error);
  }
}

export async function deleteCycle(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params as { id: string };
    const result = await deleteDraftAppraisalCycle(id);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function updateBatch(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, batchId } = req.params as { id: string; batchId: string };
    const batch = await updateAppraisalBatch(
      id,
      batchId,
      req.body as UpdateBatchInput
    );
    res.status(200).json({ success: true, batch });
  } catch (error) {
    next(error);
  }
}

export async function getBatch(req: Request, res: Response, next: NextFunction) {
  try {
    const { id, batchId } = req.params as { id: string; batchId: string };
    const batch = await getBatchDetail(id, batchId);
    res.status(200).json({ success: true, batch });
  } catch (error) {
    next(error);
  }
}

export async function startBatch(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id, batchId } = req.params as { id: string; batchId: string };
    const cycle = await startBatchStage(
      id,
      batchId,
      (req.body as { stage: import("../../generated/prisma/client.js").BatchWorkflowStage }).stage
    );
    res.status(200).json({ success: true, cycle });
  } catch (error) {
    next(error);
  }
}

export async function getDepartments(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const departments = await listDepartments();
    res.status(200).json({ success: true, departments });
  } catch (error) {
    next(error);
  }
}

export async function getCycleEmployees(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params as { id: string };
    const result = await listCycleEmployees(
      id,
      req.query as unknown as EmployeeAssignmentQuery
    );
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function changeBatch(req: Request, res: Response, next: NextFunction) {
  try {
    const changedById = requireUserId(req);
    const { id, employeeId } = req.params as { id: string; employeeId: string };
    const assignment = await changeEmployeeBatch(
      id,
      employeeId,
      req.body as ChangeBatchInput,
      changedById,
      evidenceFromRequest(req)
    );
    res.status(200).json({ success: true, assignment });
  } catch (error) {
    next(error);
  }
}

export async function getSupervisors(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params as { id: string };
    const result = await listCycleSupervisors(
      id,
      req.query as unknown as SupervisorQuery
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
    const { id, supervisorId } = req.params as {
      id: string;
      supervisorId: string;
    };
    const detail = await getSupervisorDetail(id, supervisorId);
    res.status(200).json({ success: true, ...detail });
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
    const changedById = requireUserId(req);
    const { id, employeeId } = req.params as { id: string; employeeId: string };
    const assignment = await changeEmployeeSupervisor(
      id,
      employeeId,
      req.body as ChangeSupervisorInput,
      changedById,
      evidenceFromRequest(req)
    );
    res.status(200).json({ success: true, assignment });
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
    const { id, employeeId } = req.params as { id: string; employeeId: string };
    const supervisors = await listDepartmentSupervisors(id, employeeId);
    res.status(200).json({ success: true, supervisors });
  } catch (error) {
    next(error);
  }
}

export async function getHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = req.params as { id: string };
    const history = await getAssignmentHistory(
      id,
      req.query as unknown as AssignmentHistoryQuery
    );
    res.status(200).json({ success: true, ...history });
  } catch (error) {
    next(error);
  }
}

export async function downloadEvidence(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { filename } = req.params as { filename: string };
    const fullPath = evidenceFilePath(filename);
    if (!fs.existsSync(fullPath)) {
      throw new AppError("Evidence file not found", 404);
    }
    res.download(fullPath, filename);
  } catch (error) {
    next(error);
  }
}
