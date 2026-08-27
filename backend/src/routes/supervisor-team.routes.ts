import { Router } from "express";
import { authenticateUser } from "../middlewares/authenticate.js";
import { requireRole } from "../middlewares/requireRole.js";
import { validateParams, validateQuery } from "../middlewares/validate.js";
import { ROLES } from "../constants/roles.js";
import { getMyTeam, getMyTeamMember } from "../controllers/supervisor-team.controller.js";
import {
  supervisorTeamMemberParamsSchema,
  supervisorTeamQuerySchema,
} from "../validations/supervisor-team.validation.js";

const supervisorTeamRouter = Router();

supervisorTeamRouter.use(authenticateUser, requireRole(ROLES.SUPERVISOR));

supervisorTeamRouter.get(
  "/my-team",
  validateQuery(supervisorTeamQuerySchema),
  getMyTeam
);
supervisorTeamRouter.get(
  "/my-team/:employeeId",
  validateParams(supervisorTeamMemberParamsSchema),
  getMyTeamMember
);

export default supervisorTeamRouter;
