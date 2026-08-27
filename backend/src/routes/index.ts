import { Router } from "express";
import authRouter from "./auth.routes.js";
import appraisalCycleRouter from "./appraisal-cycle.routes.js";
import dashboardRouter from "./dashboard.routes.js";
import employeeManagementRouter from "./employee-management.routes.js";
import supervisorTeamRouter from "./supervisor-team.routes.js";
import meetingRouter from "./meeting.routes.js";
import appraisalHistoryRouter from "./appraisal-history.routes.js";

const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/dashboard", dashboardRouter);
apiRouter.use("/supervisor", supervisorTeamRouter);
apiRouter.use("/hr/employees", employeeManagementRouter);
apiRouter.use("/hr/appraisal-cycles", appraisalCycleRouter);
apiRouter.use("/meetings", meetingRouter);
apiRouter.use("/appraisal-history", appraisalHistoryRouter);

export default apiRouter;
