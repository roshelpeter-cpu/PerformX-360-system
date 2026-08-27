import { z } from "zod";

const optionalDateString = z
  .string()
  .trim()
  .optional()
  .nullable()
  .refine(
    (value) => !value || !Number.isNaN(Date.parse(value)),
    "Invalid date"
  );

export const employeeListQuerySchema = z.object({
  search: z.string().trim().optional(),
  departmentId: z.string().trim().optional(),
  batchId: z.string().trim().optional(),
  supervisorId: z.string().trim().optional(),
  status: z
    .enum(["ALL", "ASSIGNED", "PARTIAL", "UNASSIGNED"])
    .optional(),
  role: z.enum(["EMPLOYEE", "SUPERVISOR", "HR", "LEADERSHIP"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(1000).optional(),
});

export const employeeIdParamsSchema = z.object({
  employeeId: z.string().trim().min(1, "Employee ID is required"),
});

export const batchIdParamsSchema = z.object({
  batchId: z.string().trim().min(1, "Batch ID is required"),
});

export const supervisorIdParamsSchema = z.object({
  supervisorId: z.string().trim().min(1, "Supervisor ID is required"),
});

export const reassignSupervisorSchema = z.object({
  newSupervisorId: z.string().trim().min(1, "New supervisor is required"),
  reason: z.string().trim().max(2000).optional().nullable(),
  effectiveDate: optionalDateString,
});

export const reassignBatchSchema = z.object({
  newBatchId: z.string().trim().min(1, "New batch is required"),
  reason: z.string().trim().max(2000).optional().nullable(),
  effectiveDate: optionalDateString,
  acknowledgeStarted: z
    .union([z.boolean(), z.literal("true"), z.literal("false")])
    .optional()
    .transform((value) => value === true || value === "true"),
});

export type EmployeeListQuery = z.infer<typeof employeeListQuerySchema>;
export type ReassignSupervisorInput = z.infer<typeof reassignSupervisorSchema>;
export type ReassignBatchInput = z.infer<typeof reassignBatchSchema>;
