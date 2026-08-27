import { z } from "zod";

export const loginSchema = z.object({
  employeeId: z.string().trim().min(1, "Employee ID is required"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  employeeId: z.string().trim().min(1, "Employee ID is required"),
});

export const hrResetPasswordParamsSchema = z.object({
  employeeId: z.string().trim().min(1, "Employee ID is required"),
});

export const reportUnauthorizedSchema = z.object({
  attemptedRoute: z.string().trim().min(1, "Attempted route is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ReportUnauthorizedInput = z.infer<typeof reportUnauthorizedSchema>;
