import { Router } from "express";
import { authenticateUser } from "../middlewares/authenticate.js";
import { requireRole } from "../middlewares/requireRole.js";
import { validateBody, validateParams, validateQuery } from "../middlewares/validate.js";
import { ROLES } from "../constants/roles.js";
import {
  changeBatch,
  changeSupervisor,
  getBatchEmployees,
  getEligibleSupervisors,
  getEmployee,
  getOverview,
  getSupervisor,
  listEmployees,
  listHr,
  listLeadership,
  listSupervisors,
} from "../controllers/employee-management.controller.js";
import {
  batchIdParamsSchema,
  employeeIdParamsSchema,
  employeeListQuerySchema,
  reassignBatchSchema,
  reassignSupervisorSchema,
  supervisorIdParamsSchema,
} from "../validations/employee-management.validation.js";

const employeeManagementRouter = Router();

employeeManagementRouter.use(authenticateUser, requireRole(ROLES.HR));

employeeManagementRouter.get(
  "/overview",
  validateQuery(employeeListQuerySchema),
  getOverview
);
employeeManagementRouter.get(
  "/",
  validateQuery(employeeListQuerySchema),
  listEmployees
);
employeeManagementRouter.get(
  "/batches/:batchId",
  validateParams(batchIdParamsSchema),
  validateQuery(employeeListQuerySchema),
  getBatchEmployees
);
employeeManagementRouter.get(
  "/supervisors",
  validateQuery(employeeListQuerySchema),
  listSupervisors
);
employeeManagementRouter.get(
  "/supervisors/:supervisorId",
  validateParams(supervisorIdParamsSchema),
  validateQuery(employeeListQuerySchema),
  getSupervisor
);
employeeManagementRouter.get(
  "/hr",
  validateQuery(employeeListQuerySchema),
  listHr
);
employeeManagementRouter.get(
  "/leadership",
  validateQuery(employeeListQuerySchema),
  listLeadership
);
employeeManagementRouter.get(
  "/:employeeId/eligible-supervisors",
  validateParams(employeeIdParamsSchema),
  getEligibleSupervisors
);
employeeManagementRouter.post(
  "/:employeeId/supervisor",
  validateParams(employeeIdParamsSchema),
  validateBody(reassignSupervisorSchema),
  changeSupervisor
);
employeeManagementRouter.post(
  "/:employeeId/batch",
  validateParams(employeeIdParamsSchema),
  validateBody(reassignBatchSchema),
  changeBatch
);
employeeManagementRouter.get(
  "/:employeeId",
  validateParams(employeeIdParamsSchema),
  getEmployee
);

export default employeeManagementRouter;
