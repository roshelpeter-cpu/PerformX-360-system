import { Router } from "express";
import {
  extendSession,
  forgotPassword,
  hrNotifications,
  hrResetPassword,
  login,
  logout,
  me,
  myNotifications,
  readAllNotifications,
  readNotification,
  reportUnauthorizedAccess,
} from "../controllers/auth.controller.js";
import { authenticateUser } from "../middlewares/authenticate.js";
import { requireRole } from "../middlewares/requireRole.js";
import { validateBody, validateParams } from "../middlewares/validate.js";
import {
  forgotPasswordSchema,
  hrResetPasswordParamsSchema,
  loginSchema,
  reportUnauthorizedSchema,
} from "../validations/auth.validation.js";
import { ROLES } from "../constants/roles.js";

const authRouter = Router();

authRouter.post("/login", validateBody(loginSchema), login);
authRouter.post("/logout", logout);
authRouter.get("/me", authenticateUser, me);
authRouter.get("/notifications", authenticateUser, myNotifications);
authRouter.post(
  "/notifications/read-all",
  authenticateUser,
  readAllNotifications
);
authRouter.post(
  "/notifications/:id/read",
  authenticateUser,
  readNotification
);
authRouter.post(
  "/forgot-password",
  validateBody(forgotPasswordSchema),
  forgotPassword
);
authRouter.post("/extend-session", authenticateUser, extendSession);
authRouter.post(
  "/report-unauthorized",
  authenticateUser,
  validateBody(reportUnauthorizedSchema),
  reportUnauthorizedAccess
);

// HR-only endpoints — backend authorization is enforced here, not only in the frontend.
authRouter.post(
  "/hr/reset-password/:employeeId",
  authenticateUser,
  requireRole(ROLES.HR),
  validateParams(hrResetPasswordParamsSchema),
  hrResetPassword
);
authRouter.get(
  "/hr/notifications",
  authenticateUser,
  requireRole(ROLES.HR),
  hrNotifications
);

export default authRouter;
