import { z } from "zod";

export const supervisorTeamQuerySchema = z.object({
  search: z.string().trim().optional(),
  departmentId: z.string().trim().optional(),
  batchId: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const supervisorTeamMemberParamsSchema = z.object({
  employeeId: z.string().trim().min(1, "Employee ID is required"),
});

export type SupervisorTeamQuery = z.infer<typeof supervisorTeamQuerySchema>;
