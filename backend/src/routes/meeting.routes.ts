import { Router } from "express";
import { authenticateUser } from "../middlewares/authenticate.js";
import { validateBody, validateParams, validateQuery } from "../middlewares/validate.js";
import {
  confirmMeeting,
  confirmMeetingByHr,
  getCalendar,
  getMeeting,
  listEmployeesForScheduling,
  listFollowUpMeetings,
  listMeetings,
  listOtherMeetings,
  requestReschedule,
  reviewReschedule,
  saveNotes,
  scheduleFollowUpMeeting,
  scheduleMeeting,
  scheduleOtherMeetingRecord,
} from "../controllers/meeting.controller.js";
import {
  confirmMeetingSchema,
  meetingCalendarQuerySchema,
  meetingIdParamsSchema,
  otherMeetingListQuerySchema,
  planningMeetingListQuerySchema,
  rescheduleRequestSchema,
  rescheduleReviewSchema,
  savePlanningNotesSchema,
  schedulePlanningMeetingSchema,
  scheduleTypedMeetingSchema,
} from "../validations/meeting.validation.js";

const meetingRouter = Router();

meetingRouter.use(authenticateUser);

meetingRouter.get(
  "/planning",
  validateQuery(planningMeetingListQuerySchema),
  listMeetings
);
meetingRouter.get("/planning/employees", listEmployeesForScheduling);
meetingRouter.get("/calendar", validateQuery(meetingCalendarQuerySchema), getCalendar);
meetingRouter.get(
  "/follow-up",
  validateQuery(otherMeetingListQuerySchema),
  listFollowUpMeetings
);
meetingRouter.post(
  "/follow-up",
  validateBody(scheduleTypedMeetingSchema),
  scheduleFollowUpMeeting
);
meetingRouter.get(
  "/other",
  validateQuery(otherMeetingListQuerySchema),
  listOtherMeetings
);
meetingRouter.post(
  "/other",
  validateBody(scheduleTypedMeetingSchema),
  scheduleOtherMeetingRecord
);
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
  "/planning/:meetingId/hr-confirm",
  validateParams(meetingIdParamsSchema),
  confirmMeetingByHr
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
