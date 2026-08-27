import { z } from "zod";

export const appraisalHistoryQuerySchema = z.object({
  employeeId: z.string().trim().optional(),
});

export const appraisalHistoryCycleParamsSchema = z.object({
  cycleId: z.string().trim().min(1, "Cycle ID is required"),
});

export type AppraisalHistoryQuery = z.infer<typeof appraisalHistoryQuerySchema>;
