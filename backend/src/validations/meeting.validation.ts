import { z } from "zod";

export const startBatchStageSchema = z.object({
  stage: z.enum([
    "SELF_REVIEW",
    "PEER_REVIEW",
    "SUPERVISOR_REVIEW",
    "HR_EVALUATION",
    "RECOGNITION_PIP",
    "CLOSURE",
  ]),
});

export type StartBatchStageInput = z.infer<typeof startBatchStageSchema>;

export const planningMeetingListQuerySchema = z.object({
  tab: z.enum(["upcoming", "history", "all"]).optional(),
  employeeId: z.string().trim().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const meetingIdParamsSchema = z.object({
  meetingId: z.string().trim().min(1, "Meeting ID is required"),
});

export const schedulePlanningMeetingSchema = z.object({
  employeeId: z.string().trim().min(1, "Employee is required"),
  scheduledAt: z.coerce.date(),
  endAt: z.coerce.date().optional(),
  location: z.string().trim().max(200).optional(),
  description: z.string().trim().max(2000).optional(),
});

export const confirmMeetingSchema = z.object({
  message: z.string().trim().max(1000).optional(),
});

export const rescheduleRequestSchema = z.object({
  reason: z.string().trim().min(8, "Please explain why a reschedule is needed"),
  requestedStart: z.coerce.date().optional(),
  requestedEnd: z.coerce.date().optional(),
});

export const rescheduleReviewSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  reviewNote: z.string().trim().max(1000).optional(),
  scheduledAt: z.coerce.date().optional(),
  endAt: z.coerce.date().optional(),
});

export const savePlanningNotesSchema = z.object({
  discussionSummary: z.string().trim().min(10, "Add a discussion summary"),
  decisionsMade: z.string().trim().min(4, "Add the decisions made"),
  keyPoints: z.string().trim().optional(),
  actionItems: z.string().trim().optional(),
  nextSteps: z.string().trim().optional(),
  additionalComments: z.string().trim().optional(),
  // History-aware planning fields — supervisor records previous-cycle discussion.
  previousAppraisalReviewed: z.string().trim().optional(),
  previousAppraisalFindings: z.string().trim().optional(),
  employeeStrengths: z.string().trim().optional(),
  employeeWeaknesses: z.string().trim().optional(),
  performanceObservations: z.string().trim().optional(),
  agreedOutcomes: z.string().trim().optional(),
});

export type PlanningMeetingListQuery = z.infer<typeof planningMeetingListQuerySchema>;
export type SchedulePlanningMeetingInput = z.infer<typeof schedulePlanningMeetingSchema>;
export type ConfirmMeetingInput = z.infer<typeof confirmMeetingSchema>;
export type RescheduleRequestInput = z.infer<typeof rescheduleRequestSchema>;
export type RescheduleReviewInput = z.infer<typeof rescheduleReviewSchema>;
export type SavePlanningNotesInput = z.infer<typeof savePlanningNotesSchema>;
