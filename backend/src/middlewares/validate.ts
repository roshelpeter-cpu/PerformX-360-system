import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";
import { AppError } from "../utils/errors.js";

// Express 5 exposes req.query as a getter with no setter. Assigning
// `req.query = parsed` throws and was aborting every validated GET
// (cycle list, supervisors, employees, history) before the handler ran.
function replaceRequestField(
  req: Request,
  field: "body" | "params" | "query",
  value: unknown
) {
  Object.defineProperty(req, field, {
    configurable: true,
    enumerable: true,
    writable: true,
    value,
  });
}

export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues[0]?.message ?? "Invalid request body";
      next(new AppError(message, 400));
      return;
    }
    replaceRequestField(req, "body", result.data);
    next();
  };
}

export function validateParams<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const message =
        result.error.issues[0]?.message ?? "Invalid route parameters";
      next(new AppError(message, 400));
      return;
    }
    replaceRequestField(req, "params", result.data);
    next();
  };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const message =
        result.error.issues[0]?.message ?? "Invalid query parameters";
      next(new AppError(message, 400));
      return;
    }
    replaceRequestField(req, "query", result.data);
    next();
  };
}
