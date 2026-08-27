import { Router } from "express";
import { authenticateUser } from "../middlewares/authenticate.js";
import { validateParams, validateQuery } from "../middlewares/validate.js";
import {
  getHistoryCycle,
  listHistoryCycles,
} from "../controllers/appraisal-history.controller.js";
import {
  appraisalHistoryCycleParamsSchema,
  appraisalHistoryQuerySchema,
} from "../validations/appraisal-history.validation.js";

const appraisalHistoryRouter = Router();

appraisalHistoryRouter.use(authenticateUser);

appraisalHistoryRouter.get(
  "/cycles",
  validateQuery(appraisalHistoryQuerySchema),
  listHistoryCycles
);
appraisalHistoryRouter.get(
  "/cycles/:cycleId",
  validateParams(appraisalHistoryCycleParamsSchema),
  validateQuery(appraisalHistoryQuerySchema),
  getHistoryCycle
);

export default appraisalHistoryRouter;
