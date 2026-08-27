import type { Request, Response, NextFunction } from "express";
import { isAppError } from "../utils/errors.js";

// Translate known domain errors into API messages. Unexpected Prisma or
// runtime failures stay generic so raw database errors never reach HR users.
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (isAppError(error)) {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      ...(error.code ? { code: error.code } : {}),
    });
    return;
  }

  const code =
    typeof error === "object" && error && "code" in error
      ? String((error as { code?: string }).code)
      : "";
  if (code === "P1017" || code === "P1001") {
    console.error("Database connection error:", error);
    res.status(503).json({
      success: false,
      message:
        "The database is temporarily unavailable. Start local PostgreSQL and try again.",
      code,
    });
    return;
  }

  console.error("Unexpected server error:", error);
  res.status(500).json({
    success: false,
    message: "An unexpected error occurred",
  });
}
