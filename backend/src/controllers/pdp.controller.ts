import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors.js";
import {
  addPdpEvidence,
  assignPdp,
  addGoalComment,
  createPdp,
  downloadPdpEvidence,
  employeeReviewPdp,
  getMyPdp,
  getPdp,
  hrReviewPdp,
  listPdps,
  redirectPdpToHr,
  reviewPdpEvidence,
  savePdpDraft,
  submitPdp,
  updateGoalProgress,
} from "../services/pdp.service.js";
import type {
  CreatePdpInput,
  PdpCommentInput,
  PdpListQuery,
  PdpRedirectInput,
  SavePdpDraftInput,
  GoalCommentInput,
  UpdateGoalProgressInput,
} from "../validations/pdp.validation.js";

export async function listPdpRecords(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw new AppError("Authentication required", 401);
    const data = await listPdps(req.user.id, req.query as unknown as PdpListQuery);
    res.status(200).json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
}

export async function getMyPdpRecord(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw new AppError("Authentication required", 401);
    const data = await getMyPdp(req.user.id);
    res.status(200).json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
}

export async function getPdpRecord(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw new AppError("Authentication required", 401);
    const pdp = await getPdp(req.user.id, String(req.params.pdpId));
    res.status(200).json({ success: true, pdp });
  } catch (error) {
    next(error);
  }
}

export async function createPdpRecord(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw new AppError("Authentication required", 401);
    const pdp = await createPdp(req.user.id, req.body as CreatePdpInput);
    res.status(201).json({ success: true, pdp });
  } catch (error) {
    next(error);
  }
}

export async function savePdpDraftRecord(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw new AppError("Authentication required", 401);
    const pdp = await savePdpDraft(
      req.user.id,
      String(req.params.pdpId),
      req.body as SavePdpDraftInput
    );
    res.status(200).json({ success: true, pdp });
  } catch (error) {
    next(error);
  }
}

export async function submitPdpRecord(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw new AppError("Authentication required", 401);
    const pdp = await submitPdp(req.user.id, String(req.params.pdpId));
    res.status(200).json({ success: true, pdp });
  } catch (error) {
    next(error);
  }
}

export async function employeeReviewPdpRecord(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw new AppError("Authentication required", 401);
    const body = req.body as PdpCommentInput & { decision: "APPROVE" | "REQUEST_CHANGES" };
    const pdp = await employeeReviewPdp(
      req.user.id,
      String(req.params.pdpId),
      body.decision,
      body.message
    );
    res.status(200).json({ success: true, pdp });
  } catch (error) {
    next(error);
  }
}

export async function hrReviewPdpRecord(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw new AppError("Authentication required", 401);
    const body = req.body as PdpCommentInput & { decision: "APPROVE" | "REQUEST_CHANGES" };
    const pdp = await hrReviewPdp(
      req.user.id,
      String(req.params.pdpId),
      body.decision,
      body.message
    );
    res.status(200).json({ success: true, pdp });
  } catch (error) {
    next(error);
  }
}

export async function redirectPdpRecord(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw new AppError("Authentication required", 401);
    const body = req.body as PdpRedirectInput;
    const pdp = await redirectPdpToHr(req.user.id, String(req.params.pdpId), body.reason);
    res.status(200).json({ success: true, pdp });
  } catch (error) {
    next(error);
  }
}

export async function assignPdpRecord(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw new AppError("Authentication required", 401);
    const pdp = await assignPdp(req.user.id, String(req.params.pdpId));
    res.status(200).json({ success: true, pdp });
  } catch (error) {
    next(error);
  }
}

export async function updateGoalProgressRecord(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw new AppError("Authentication required", 401);
    const pdp = await updateGoalProgress(
      req.user.id,
      String(req.params.pdpId),
      String(req.params.goalId),
      req.body as UpdateGoalProgressInput
    );
    res.status(200).json({ success: true, pdp });
  } catch (error) {
    next(error);
  }
}

export async function uploadPdpEvidenceRecord(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw new AppError("Authentication required", 401);
    const file = req.file;
    if (!file) throw new AppError("Choose a file to upload", 400);
    const kind = typeof req.body?.kind === "string" ? req.body.kind : "SUPPORTING";
    const pdp = await addPdpEvidence(
      req.user.id,
      String(req.params.pdpId),
      String(req.params.goalId),
      file,
      kind
    );
    res.status(201).json({ success: true, pdp });
  } catch (error) {
    next(error);
  }
}

export async function downloadPdpEvidenceRecord(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw new AppError("Authentication required", 401);
    const file = await downloadPdpEvidence(req.user.id, String(req.params.evidenceId));
    res.download(file.fullPath, file.fileName);
  } catch (error) {
    next(error);
  }
}

export async function addGoalCommentRecord(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw new AppError("Authentication required", 401);
    const body = req.body as GoalCommentInput;
    const pdp = await addGoalComment(
      req.user.id,
      String(req.params.pdpId),
      String(req.params.goalId),
      body.message
    );
    res.status(201).json({ success: true, pdp });
  } catch (error) {
    next(error);
  }
}

export async function reviewPdpEvidenceRecord(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user?.id) throw new AppError("Authentication required", 401);
    const pdp = await reviewPdpEvidence(req.user.id, String(req.params.evidenceId));
    res.status(200).json({ success: true, pdp });
  } catch (error) {
    next(error);
  }
}
