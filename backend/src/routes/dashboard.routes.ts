import { Router } from "express";
import { authenticateUser } from "../middlewares/authenticate.js";
import { getMyDashboard } from "../controllers/dashboard.controller.js";

const dashboardRouter = Router();

dashboardRouter.use(authenticateUser);
dashboardRouter.get("/me", getMyDashboard);

export default dashboardRouter;
