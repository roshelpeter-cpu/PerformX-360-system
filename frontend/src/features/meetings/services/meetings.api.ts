import { apiRequest } from "@/services/api/client";
import type {
  PlanningMeeting,
  PlanningMeetingsResponse,
  SchedulableEmployee,
} from "../types";

function toQuery(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function listPlanningMeetingsRequest(filters: {
  tab?: "upcoming" | "history" | "all";
  employeeId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}) {
  return apiRequest<PlanningMeetingsResponse>(
    `/meetings/planning${toQuery(filters)}`
  );
}

export function getPlanningMeetingRequest(meetingId: string) {
  return apiRequest<{ success: true; meeting: PlanningMeeting }>(
    `/meetings/planning/${meetingId}`
  );
}

export function listSchedulableEmployeesRequest() {
  return apiRequest<{
    success: true;
    employees: SchedulableEmployee[];
  }>("/meetings/planning/employees");
}

export function schedulePlanningMeetingRequest(body: {
  employeeId: string;
  scheduledAt: string;
  endAt?: string;
  location?: string;
  description?: string;
}) {
  return apiRequest<{ success: true; meeting: PlanningMeeting }>(
    "/meetings/planning",
    { method: "POST", body }
  );
}

export function confirmPlanningMeetingRequest(meetingId: string) {
  return apiRequest<{ success: true; meeting: PlanningMeeting }>(
    `/meetings/planning/${meetingId}/confirm`,
    { method: "POST", body: {} }
  );
}

export function requestPlanningRescheduleRequest(
  meetingId: string,
  body: { reason: string; requestedStart?: string; requestedEnd?: string }
) {
  return apiRequest<{ success: true; meeting: PlanningMeeting }>(
    `/meetings/planning/${meetingId}/reschedule-request`,
    { method: "POST", body }
  );
}

export function reviewPlanningRescheduleRequest(
  meetingId: string,
  body: {
    decision: "APPROVED" | "REJECTED";
    reviewNote?: string;
    scheduledAt?: string;
    endAt?: string;
  }
) {
  return apiRequest<{ success: true; meeting: PlanningMeeting }>(
    `/meetings/planning/${meetingId}/reschedule-review`,
    { method: "POST", body }
  );
}

export function savePlanningNotesRequest(
  meetingId: string,
  body: {
    discussionSummary: string;
    decisionsMade: string;
    keyPoints?: string;
    additionalComments?: string;
    previousAppraisalReviewed?: string;
    previousAppraisalFindings?: string;
    employeeStrengths?: string;
    employeeWeaknesses?: string;
    performanceObservations?: string;
    agreedOutcomes?: string;
  }
) {
  return apiRequest<{ success: true; meeting: PlanningMeeting }>(
    `/meetings/planning/${meetingId}/notes`,
    { method: "POST", body }
  );
}
