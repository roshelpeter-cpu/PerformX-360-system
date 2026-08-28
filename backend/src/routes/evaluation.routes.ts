import { Router } from "express";
import { authenticateUser } from "../middlewares/authenticate.js";
import { validateBody, validateParams, validateQuery } from "../middlewares/validate.js";
import {
  assignPeersRecord,
  createReviewRequestRecord,
  getEvaluationRecord,
  getMyEvaluationRecord,
  hrApproveRecord,
  leadershipAnalyticsRecord,
  listEvaluationRecords,
  listPeerReviewRecords,
  listPeersRecord,
  listPipRecords,
  listReviewRequestRecords,
  openSelfReviewRecord,
  reportingRecord,
  respondReviewRequestRecord,
  savePipRecord,
  saveSelfReviewRecord,
  saveSupervisorEvalRecord,
  submitPeerReviewRecord,
  updateRecognitionRecord,
} from "../controllers/evaluation.controller.js";
import {
  assignPeersSchema,
  assignmentIdParamsSchema,
  evaluationIdParamsSchema,
  evaluationListQuerySchema,
  hrApproveSchema,
  peerReviewSchema,
  pipSchema,
  requestIdParamsSchema,
  reviewRequestResponseSchema,
  reviewRequestSchema,
  selfReviewSchema,
  supervisorEvalSchema,
} from "../validations/evaluation.validation.js";

const evaluationRouter = Router();
evaluationRouter.use(authenticateUser);

evaluationRouter.get("/", validateQuery(evaluationListQuerySchema), listEvaluationRecords);
evaluationRouter.get("/me", getMyEvaluationRecord);
evaluationRouter.get("/peers/assigned", listPeerReviewRecords);
evaluationRouter.get("/peers/eligible", listPeersRecord);
evaluationRouter.get("/pips", listPipRecords);
evaluationRouter.get("/review-requests", listReviewRequestRecords);
evaluationRouter.get("/analytics", validateQuery(evaluationListQuerySchema), leadershipAnalyticsRecord);
evaluationRouter.get("/reports", validateQuery(evaluationListQuerySchema), reportingRecord);
evaluationRouter.post("/review-requests", validateBody(reviewRequestSchema), createReviewRequestRecord);
evaluationRouter.post(
  "/review-requests/:requestId/respond",
  validateParams(requestIdParamsSchema),
  validateBody(reviewRequestResponseSchema),
  respondReviewRequestRecord
);
evaluationRouter.post(
  "/peer-reviews/:assignmentId",
  validateParams(assignmentIdParamsSchema),
  validateBody(peerReviewSchema),
  submitPeerReviewRecord
);
evaluationRouter.get("/:evaluationId", validateParams(evaluationIdParamsSchema), getEvaluationRecord);
evaluationRouter.post("/:evaluationId/open-self-review", validateParams(evaluationIdParamsSchema), openSelfReviewRecord);
evaluationRouter.put(
  "/:evaluationId/self-review",
  validateParams(evaluationIdParamsSchema),
  validateBody(selfReviewSchema),
  saveSelfReviewRecord
);
evaluationRouter.post(
  "/:evaluationId/peers",
  validateParams(evaluationIdParamsSchema),
  validateBody(assignPeersSchema),
  assignPeersRecord
);
evaluationRouter.put(
  "/:evaluationId/supervisor",
  validateParams(evaluationIdParamsSchema),
  validateBody(supervisorEvalSchema),
  saveSupervisorEvalRecord
);
evaluationRouter.post(
  "/:evaluationId/approve",
  validateParams(evaluationIdParamsSchema),
  validateBody(hrApproveSchema),
  hrApproveRecord
);
evaluationRouter.put(
  "/:evaluationId/recognition",
  validateParams(evaluationIdParamsSchema),
  validateBody(hrApproveSchema),
  updateRecognitionRecord
);
evaluationRouter.put(
  "/:evaluationId/pip",
  validateParams(evaluationIdParamsSchema),
  validateBody(pipSchema),
  savePipRecord
);

export default evaluationRouter;
