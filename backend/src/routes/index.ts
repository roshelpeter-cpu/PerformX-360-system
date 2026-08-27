import { Router } from "express";
import authRouter from "./auth.routes.js";
import appraisalCycleRouter from "./appraisal-cycle.routes.js";
import dashboardRouter from "./dashboard.routes.js";

const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/hr/appraisal-cycles", appraisalCycleRouter);

export default apiRouter;
