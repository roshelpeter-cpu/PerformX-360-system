import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors.js";
import {
  assignPeers,
  createReviewRequest,
  getEvaluation,
  getMyEvaluation,
  hrApproveEvaluation,
  leadershipAnalytics,
  listAssignedPeerReviews,
  listEligiblePeers,
  listEvaluations,
  listPips,
  listReviewRequests,
  openSelfReview,
  reportingRows,
  respondToReviewRequest,
  savePip,
  saveSelfReview,
  saveSupervisorEvaluation,
  submitPeerReview,
  updateRecognition,
} from "../services/evaluation.service.js";

function userId(req: Request) {
  if (!req.user?.id) throw new AppError("Authentication required", 401);
  return req.user.id;
}

function param(req: Request, name: string) {
  const value = req.params[name];
  if (typeof value !== "string" || !value) throw new AppError("Invalid route parameters", 400);
  return value;
}

export async function listEvaluationRecords(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(200).json({ success: true, ...(await listEvaluations(userId(req), req.query as never)) });
  } catch (error) {
    next(error);
  }
}

export async function getMyEvaluationRecord(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(200).json({ success: true, ...(await getMyEvaluation(userId(req))) });
  } catch (error) {
    next(error);
  }
}

export async function getEvaluationRecord(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(200).json({ success: true, ...(await getEvaluation(userId(req), param(req, "evaluationId"))) });
  } catch (error) {
    next(error);
  }
}

export async function openSelfReviewRecord(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(200).json({ success: true, evaluation: await openSelfReview(userId(req), param(req, "evaluationId")) });
  } catch (error) {
    next(error);
  }
}

export async function saveSelfReviewRecord(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(200).json({ success: true, evaluation: await saveSelfReview(userId(req), param(req, "evaluationId"), req.body) });
  } catch (error) {
    next(error);
  }
}

export async function assignPeersRecord(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(200).json({ success: true, evaluation: await assignPeers(userId(req), param(req, "evaluationId"), req.body.reviewerIds) });
  } catch (error) {
    next(error);
  }
}

export async function listPeerReviewRecords(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(200).json({ success: true, ...(await listAssignedPeerReviews(userId(req))) });
  } catch (error) {
    next(error);
  }
}

export async function submitPeerReviewRecord(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(200).json({ success: true, ...(await submitPeerReview(userId(req), param(req, "assignmentId"), req.body)) });
  } catch (error) {
    next(error);
  }
}

export async function saveSupervisorEvalRecord(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(200).json({
      success: true,
      evaluation: await saveSupervisorEvaluation(userId(req), param(req, "evaluationId"), req.body),
    });
  } catch (error) {
    next(error);
  }
}

export async function hrApproveRecord(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(200).json({ success: true, evaluation: await hrApproveEvaluation(userId(req), param(req, "evaluationId"), req.body) });
  } catch (error) {
    next(error);
  }
}

export async function updateRecognitionRecord(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(200).json({ success: true, evaluation: await updateRecognition(userId(req), param(req, "evaluationId"), req.body) });
  } catch (error) {
    next(error);
  }
}

export async function savePipRecord(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(200).json({ success: true, evaluation: await savePip(userId(req), param(req, "evaluationId"), req.body) });
  } catch (error) {
    next(error);
  }
}

export async function listPipRecords(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(200).json({ success: true, ...(await listPips(userId(req))) });
  } catch (error) {
    next(error);
  }
}

export async function createReviewRequestRecord(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(201).json({ success: true, request: await createReviewRequest(userId(req), req.body) });
  } catch (error) {
    next(error);
  }
}

export async function listReviewRequestRecords(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(200).json({ success: true, ...(await listReviewRequests(userId(req))) });
  } catch (error) {
    next(error);
  }
}

export async function respondReviewRequestRecord(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(200).json({ success: true, request: await respondToReviewRequest(userId(req), param(req, "requestId"), req.body) });
  } catch (error) {
    next(error);
  }
}

export async function listPeersRecord(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(200).json({ success: true, ...(await listEligiblePeers(userId(req))) });
  } catch (error) {
    next(error);
  }
}

export async function leadershipAnalyticsRecord(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(200).json({ success: true, ...(await leadershipAnalytics(userId(req), req.query as never)) });
  } catch (error) {
    next(error);
  }
}

export async function reportingRecord(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(200).json({ success: true, ...(await reportingRows(userId(req), req.query as never)) });
  } catch (error) {
    next(error);
  }
}
