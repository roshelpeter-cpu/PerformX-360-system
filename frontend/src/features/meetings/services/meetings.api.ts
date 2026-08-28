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

export function confirmPlanningMeetingByHrRequest(meetingId: string) {
  return apiRequest<{ success: true; meeting: PlanningMeeting }>(
    `/meetings/planning/${meetingId}/hr-confirm`,
    { method: "POST", body: {} }
  );
}

export function listFollowUpMeetingsRequest(params: {
  page?: number;
  employeeId?: string;
  cycleId?: string;
  pdpStartDate?: string;
  from?: string;
  to?: string;
  status?: string;
  tab?: string;
} = {}) {
  return apiRequest<{
    success: true;
    meetings: PlanningMeeting[];
    stats?: {
      total: number;
      completed: number;
      upcoming: number;
      cancelled: number;
      rescheduled: number;
      scheduled: number;
    };
    pdpEmployees?: Array<{
      id: string;
      employeeId: string;
      name: string;
      jobTitle: string | null;
      department: { id: string; name: string } | null;
      pdpStatus: string;
      pdpStartDate: string;
      supervisor: { id: string; employeeId: string; name: string } | null;
      scheduledCount: number;
    }>;
    calendarDates?: string[];
    cycle?: { id: string; name: string; status: string } | null;
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  }>(`/meetings/follow-up${toQuery(params)}`);
}

export function listOtherMeetingsRequest(params: {
  page?: number;
  employeeId?: string;
  cycleId?: string;
  pdpStartDate?: string;
  from?: string;
  to?: string;
  status?: string;
  tab?: string;
} = {}) {
  return apiRequest<{
    success: true;
    meetings: PlanningMeeting[];
    stats?: {
      total: number;
      completed: number;
      upcoming: number;
      cancelled: number;
      rescheduled: number;
      scheduled: number;
    };
    pdpEmployees?: Array<{
      id: string;
      employeeId: string;
      name: string;
      jobTitle: string | null;
      department: { id: string; name: string } | null;
      pdpStatus: string;
      pdpStartDate: string;
      supervisor: { id: string; employeeId: string; name: string } | null;
      scheduledCount: number;
    }>;
    calendarDates?: string[];
    cycle?: { id: string; name: string; status: string } | null;
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  }>(`/meetings/other${toQuery(params)}`);
}

export function getMeetingCalendarRequest(params: {
  year?: number;
  month?: number;
  type?: string;
  status?: string;
  date?: string;
}) {
  return apiRequest<{
    success: true;
    year: number;
    month: number;
    stats: {
      total: number;
      monthTotal?: number;
      upcoming: number;
      completed: number;
      cancelled: number;
      attendanceRate: number;
      participantCount: number;
    };
    days: Array<{ day: number; total: number; planning: number; followUp: number; other: number }>;
    meetings: PlanningMeeting[];
    selectedDateMeetings: PlanningMeeting[];
    upcomingMeetings: PlanningMeeting[];
  }>(`/meetings/calendar${toQuery(params)}`);
}

export function scheduleFollowUpMeetingRequest(body: {
  employeeId: string;
  scheduledAt: string;
  location?: string;
}) {
  return apiRequest<{ success: true; meeting: PlanningMeeting }>("/meetings/follow-up", {
    method: "POST",
    body,
  });
}

export function scheduleOtherMeetingRequest(body: {
  employeeId: string;
  scheduledAt: string;
  location?: string;
  title?: string;
  description?: string;
}) {
  return apiRequest<{ success: true; meeting: PlanningMeeting }>("/meetings/other", {
    method: "POST",
    body,
  });
}

export function savePlanningNotesRequest(
  meetingId: string,
  body: {
    discussionSummary: string;
    decisionsMade: string;
    keyPoints?: string;
    additionalComments?: string;
    previousAppraisalReviewed: string;
    previousPdpReviewed: string;
    employeeStrengths: string;
    employeeWeaknesses: string;
    departmentObjectives: string;
    companyObjectives: string;
    developmentNeeds: string;
    previousAppraisalFindings?: string;
    completedGoals?: string;
    incompleteGoals?: string;
    carriedForward?: string;
    performanceObservations?: string;
    agreedOutcomes?: string;
  }
) {
  return apiRequest<{ success: true; meeting: PlanningMeeting }>(
    `/meetings/planning/${meetingId}/notes`,
    { method: "POST", body }
  );
}
