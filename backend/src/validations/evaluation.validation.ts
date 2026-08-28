import { z } from "zod";

export const evaluationListQuerySchema = z.object({
  status: z.string().trim().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
  cycleId: z.string().trim().optional(),
  departmentId: z.string().trim().optional(),
  band: z.string().trim().optional(),
  supervisorId: z.string().trim().optional(),
  employeeId: z.string().trim().optional(),
});

export const evaluationIdParamsSchema = z.object({
  evaluationId: z.string().trim().min(1),
});

export const selfReviewSchema = z.object({
  score: z.coerce.number().min(0).max(100),
  comments: z.string().trim().min(8),
  goalReviews: z.unknown().optional(),
  submit: z.boolean().optional(),
});

export const assignPeersSchema = z.object({
  reviewerIds: z.array(z.string().trim().min(1)).min(1),
});

export const peerReviewSchema = z.object({
  score: z.coerce.number().min(0).max(100),
  comments: z.string().trim().min(8),
});

export const supervisorEvalSchema = z.object({
  score: z.coerce.number().min(0).max(100),
  comments: z.string().trim().min(8),
  strengths: z.string().trim().min(4),
  improvementAreas: z.string().trim().min(4),
  developmentRecommendations: z.string().trim().min(4),
  promotionRecommended: z.boolean().optional(),
  submit: z.boolean().optional(),
});

export const hrApproveSchema = z.object({
  hrComments: z.string().trim().optional(),
  promotionStatus: z.enum(["NONE", "RECOMMENDED", "UNDER_REVIEW", "SHORTLISTED", "APPROVED", "NOT_SELECTED"]).optional(),
  awardType: z.enum(["EMPLOYEE_OF_THE_CYCLE", "OUTSTANDING_PERFORMANCE", "EXCELLENCE"]).nullable().optional(),
  awardConfirmed: z.boolean().optional(),
});

export const pipSchema = z.object({
  summary: z.string().trim().min(8),
  reviewPeriod: z.string().trim().min(2),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  assign: z.boolean().optional(),
  status: z.enum(["REQUIRED", "DISCUSSION_PENDING", "DRAFT", "ACTIVE", "COMPLETED", "FAILED", "ASSIGNED"]).optional(),
  goals: z.array(
    z.object({
      title: z.string().trim().min(3),
      requiredActions: z.string().trim().min(4),
      expectedOutcomes: z.string().trim().min(4),
    })
  ),
});

export const reviewRequestSchema = z.object({
  reason: z.string().trim().min(8),
  comments: z.string().trim().optional(),
});

export const reviewRequestResponseSchema = z.object({
  status: z.enum(["PENDING", "UNDER_REVIEW", "RESPONDED", "CLOSED"]),
  hrResponse: z.string().trim().min(4),
});

export const assignmentIdParamsSchema = z.object({
  assignmentId: z.string().trim().min(1),
});

export const requestIdParamsSchema = z.object({
  requestId: z.string().trim().min(1),
});
