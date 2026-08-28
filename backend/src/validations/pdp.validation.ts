import { z } from "zod";

export const MIN_PDP_GOALS = 40;

export const pdpGoalInputSchema = z.object({
  id: z.string().trim().optional(),
  title: z.string().trim().min(3, "Goal title is required"),
  objective: z.string().trim().min(4, "Goal objective is required"),
  expectedOutcome: z.string().trim().optional(),
  developmentArea: z.string().trim().optional(),
  measurementKpi: z.string().trim().optional(),
  successCriteria: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  category: z.string().trim().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
  weightage: z.coerce.number().min(0).max(100).optional(),
  dueDate: z.coerce.date().optional().nullable(),
  startDate: z.coerce.date().optional().nullable(),
  sortOrder: z.coerce.number().int().optional(),
});

export const createPdpSchema = z.object({
  employeeId: z.string().trim().min(1),
  summary: z.string().trim().max(4000).optional(),
  goals: z.array(pdpGoalInputSchema).optional(),
});

export const savePdpDraftSchema = z.object({
  summary: z.string().trim().max(4000).optional(),
  goals: z.array(pdpGoalInputSchema),
});

export const pdpIdParamsSchema = z.object({
  pdpId: z.string().trim().min(1),
});

export const pdpListQuerySchema = z.object({
  status: z.string().trim().optional(),
  employeeId: z.string().trim().optional(),
  cycleId: z.string().trim().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(200).optional(),
});

export const pdpCommentSchema = z.object({
  message: z.string().trim().min(8, "Please describe the requested change"),
});

export const pdpRedirectSchema = z.object({
  reason: z.string().trim().min(8, "Explain why this issue is being redirected to HR"),
});

export type CreatePdpInput = z.infer<typeof createPdpSchema>;
export type SavePdpDraftInput = z.infer<typeof savePdpDraftSchema>;
export type PdpListQuery = z.infer<typeof pdpListQuerySchema>;
export type PdpCommentInput = z.infer<typeof pdpCommentSchema>;
export type PdpRedirectInput = z.infer<typeof pdpRedirectSchema>;

export const updateGoalProgressSchema = z.object({
  progress: z.coerce.number().int().min(0).max(100),
  notes: z.string().trim().max(4000).optional(),
  status: z.enum(["NOT_STARTED", "IN_PROGRESS", "UNDER_REVIEW", "COMPLETED"]).optional(),
});

export const pdpGoalParamsSchema = z.object({
  pdpId: z.string().trim().min(1),
  goalId: z.string().trim().min(1),
});

export const pdpEvidenceParamsSchema = z.object({
  evidenceId: z.string().trim().min(1),
});

export const pdpEvidenceKindSchema = z.enum(["DOCUMENT", "IMAGE", "CERTIFICATE", "SUPPORTING"]);

export const goalCommentSchema = z.object({
  message: z.string().trim().min(2, "Add a comment"),
});

export type UpdateGoalProgressInput = z.infer<typeof updateGoalProgressSchema>;
export type GoalCommentInput = z.infer<typeof goalCommentSchema>;
