import { Router } from "express";
import { authenticateUser } from "../middlewares/authenticate.js";
import { validateBody, validateParams, validateQuery } from "../middlewares/validate.js";
import {
  assignPdpRecord,
  createPdpRecord,
  downloadPdpEvidenceRecord,
  employeeReviewPdpRecord,
  getMyPdpRecord,
  getPdpRecord,
  hrReviewPdpRecord,
  listPdpRecords,
  redirectPdpRecord,
  reviewPdpEvidenceRecord,
  savePdpDraftRecord,
  submitPdpRecord,
  updateGoalProgressRecord,
  uploadPdpEvidenceRecord,
} from "../controllers/pdp.controller.js";
import {
  createPdpSchema,
  pdpCommentSchema,
  pdpEvidenceParamsSchema,
  pdpGoalParamsSchema,
  pdpIdParamsSchema,
  pdpListQuerySchema,
  pdpRedirectSchema,
  savePdpDraftSchema,
  updateGoalProgressSchema,
} from "../validations/pdp.validation.js";
import { z } from "zod";
import { optionalEvidenceUpload } from "../middlewares/upload.js";

const reviewDecisionSchema = pdpCommentSchema.extend({
  decision: z.enum(["APPROVE", "REQUEST_CHANGES"]),
}).partial({ message: true }).superRefine((value, ctx) => {
  if (value.decision === "REQUEST_CHANGES" && (!value.message || value.message.trim().length < 8)) {
    ctx.addIssue({
      code: "custom",
      message: "Describe the requested changes",
      path: ["message"],
    });
  }
});

const pdpRouter = Router();
pdpRouter.use(authenticateUser);

pdpRouter.get("/", validateQuery(pdpListQuerySchema), listPdpRecords);
pdpRouter.get("/me", getMyPdpRecord);
pdpRouter.get(
  "/evidence/:evidenceId",
  validateParams(pdpEvidenceParamsSchema),
  downloadPdpEvidenceRecord
);
pdpRouter.post(
  "/evidence/:evidenceId/review",
  validateParams(pdpEvidenceParamsSchema),
  reviewPdpEvidenceRecord
);
pdpRouter.get("/:pdpId", validateParams(pdpIdParamsSchema), getPdpRecord);
pdpRouter.post("/", validateBody(createPdpSchema), createPdpRecord);
pdpRouter.put(
  "/:pdpId/draft",
  validateParams(pdpIdParamsSchema),
  validateBody(savePdpDraftSchema),
  savePdpDraftRecord
);
pdpRouter.post("/:pdpId/submit", validateParams(pdpIdParamsSchema), submitPdpRecord);
pdpRouter.post(
  "/:pdpId/employee-review",
  validateParams(pdpIdParamsSchema),
  validateBody(reviewDecisionSchema),
  employeeReviewPdpRecord
);
pdpRouter.post(
  "/:pdpId/hr-review",
  validateParams(pdpIdParamsSchema),
  validateBody(reviewDecisionSchema),
  hrReviewPdpRecord
);
pdpRouter.post(
  "/:pdpId/redirect",
  validateParams(pdpIdParamsSchema),
  validateBody(pdpRedirectSchema),
  redirectPdpRecord
);
pdpRouter.post("/:pdpId/assign", validateParams(pdpIdParamsSchema), assignPdpRecord);
pdpRouter.put(
  "/:pdpId/goals/:goalId/progress",
  validateParams(pdpGoalParamsSchema),
  validateBody(updateGoalProgressSchema),
  updateGoalProgressRecord
);
pdpRouter.post(
  "/:pdpId/goals/:goalId/evidence",
  validateParams(pdpGoalParamsSchema),
  optionalEvidenceUpload,
  uploadPdpEvidenceRecord
);

export default pdpRouter;
