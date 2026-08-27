import { Router } from "express";
import { authenticateUser } from "../middlewares/authenticate.js";
import { validateBody, validateParams, validateQuery } from "../middlewares/validate.js";
import {
  confirmMeeting,
  getMeeting,
  listEmployeesForScheduling,
  listMeetings,
  requestReschedule,
  reviewReschedule,
  saveNotes,
  scheduleMeeting,
} from "../controllers/meeting.controller.js";
import {
  confirmMeetingSchema,
  meetingIdParamsSchema,
  planningMeetingListQuerySchema,
  rescheduleRequestSchema,
  rescheduleReviewSchema,
  savePlanningNotesSchema,
  schedulePlanningMeetingSchema,
} from "../validations/meeting.validation.js";

const meetingRouter = Router();

meetingRouter.use(authenticateUser);

meetingRouter.get(
  "/planning",
  validateQuery(planningMeetingListQuerySchema),
  listMeetings
);
meetingRouter.get("/planning/employees", listEmployeesForScheduling);
meetingRouter.get(
  "/planning/:meetingId",
  validateParams(meetingIdParamsSchema),
  getMeeting
);
meetingRouter.post(
  "/planning",
  validateBody(schedulePlanningMeetingSchema),
  scheduleMeeting
);
meetingRouter.post(
  "/planning/:meetingId/confirm",
  validateParams(meetingIdParamsSchema),
  validateBody(confirmMeetingSchema),
  confirmMeeting
);
meetingRouter.post(
  "/planning/:meetingId/reschedule-request",
  validateParams(meetingIdParamsSchema),
  validateBody(rescheduleRequestSchema),
  requestReschedule
);
meetingRouter.post(
  "/planning/:meetingId/reschedule-review",
  validateParams(meetingIdParamsSchema),
  validateBody(rescheduleReviewSchema),
  reviewReschedule
);
meetingRouter.post(
  "/planning/:meetingId/notes",
  validateParams(meetingIdParamsSchema),
  validateBody(savePlanningNotesSchema),
  saveNotes
);

export default meetingRouter;
