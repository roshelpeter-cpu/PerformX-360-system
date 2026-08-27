/**
 * Performance Planning Meeting HTTP handlers.
 * HR schedules and reviews reschedules; employees/supervisors confirm as participants.
 */
import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors.js";
import {
  confirmPlanningMeeting,
  getPlanningMeeting,
  listPlanningMeetings,
  listSchedulableEmployees,
  requestPlanningReschedule,
  reviewPlanningReschedule,
  savePlanningMeetingNotes,
  schedulePlanningMeeting,
} from "../services/meeting.service.js";
import type {
  ConfirmMeetingInput,
  PlanningMeetingListQuery,
  RescheduleRequestInput,
  RescheduleReviewInput,
  SavePlanningNotesInput,
  SchedulePlanningMeetingInput,
} from "../validations/meeting.validation.js";

export async function listMeetings(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.id) throw new AppError("Authentication required", 401);
    const data = await listPlanningMeetings(
      req.user.id,
      req.query as unknown as PlanningMeetingListQuery
    );
    res.status(200).json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
}

export async function listEmployeesForScheduling(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.id) throw new AppError("Authentication required", 401);
    const data = await listSchedulableEmployees(req.user.id);
    res.status(200).json({ success: true, ...data });
  } catch (error) {
    next(error);
  }
}

export async function getMeeting(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.id) throw new AppError("Authentication required", 401);
    const meeting = await getPlanningMeeting(
      req.user.id,
      String(req.params.meetingId)
    );
    res.status(200).json({ success: true, meeting });
  } catch (error) {
    next(error);
  }
}

export async function scheduleMeeting(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.id) throw new AppError("Authentication required", 401);
    const meeting = await schedulePlanningMeeting(
      req.user.id,
      req.body as SchedulePlanningMeetingInput
    );
    res.status(201).json({ success: true, meeting });
  } catch (error) {
    next(error);
  }
}

export async function confirmMeeting(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.id) throw new AppError("Authentication required", 401);
    const body = req.body as ConfirmMeetingInput;
    const meeting = await confirmPlanningMeeting(
      req.user.id,
      String(req.params.meetingId),
      body.message
    );
    res.status(200).json({ success: true, meeting });
  } catch (error) {
    next(error);
  }
}

export async function requestReschedule(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.id) throw new AppError("Authentication required", 401);
    const meeting = await requestPlanningReschedule(
      req.user.id,
      String(req.params.meetingId),
      req.body as RescheduleRequestInput
    );
    res.status(200).json({ success: true, meeting });
  } catch (error) {
    next(error);
  }
}

export async function reviewReschedule(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.id) throw new AppError("Authentication required", 401);
    const meeting = await reviewPlanningReschedule(
      req.user.id,
      String(req.params.meetingId),
      req.body as RescheduleReviewInput
    );
    res.status(200).json({ success: true, meeting });
  } catch (error) {
    next(error);
  }
}

export async function saveNotes(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.id) throw new AppError("Authentication required", 401);
    const meeting = await savePlanningMeetingNotes(
      req.user.id,
      String(req.params.meetingId),
      req.body as SavePlanningNotesInput
    );
    res.status(200).json({ success: true, meeting });
  } catch (error) {
    next(error);
  }
}
