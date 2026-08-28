import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import {
  confirmPlanningMeetingByHrRequest,
  confirmPlanningMeetingRequest,
  getPlanningMeetingRequest,
  listFollowUpMeetingsRequest,
  listOtherMeetingsRequest,
  listPlanningMeetingsRequest,
  listSchedulableEmployeesRequest,
  getMeetingCalendarRequest,
  requestPlanningRescheduleRequest,
  reviewPlanningRescheduleRequest,
  savePlanningNotesRequest,
  scheduleFollowUpMeetingRequest,
  scheduleOtherMeetingRequest,
  schedulePlanningMeetingRequest,
} from "../services/meetings.api";

export function usePlanningMeetings(filters: {
  tab?: "upcoming" | "history" | "all";
  employeeId?: string;
  from?: string;
  to?: string;
  page?: number;
}) {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: ["meetings", "planning", userId, filters],
    queryFn: () => listPlanningMeetingsRequest({ ...filters, pageSize: 10 }),
    enabled: Boolean(userId),
  });
}

export function usePlanningMeeting(meetingId?: string) {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: ["meetings", "planning", "detail", userId, meetingId],
    queryFn: () => getPlanningMeetingRequest(meetingId!),
    enabled: Boolean(userId && meetingId),
  });
}

export function useSchedulableEmployees(enabled = false) {
  return useQuery({
    queryKey: ["meetings", "planning", "employees"],
    queryFn: listSchedulableEmployeesRequest,
    enabled,
  });
}

function invalidateMeetings(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["meetings"] });
  queryClient.invalidateQueries({ queryKey: ["auth", "notifications"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  queryClient.invalidateQueries({ queryKey: ["supervisor", "my-team"] });
}

export function useSchedulePlanningMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: schedulePlanningMeetingRequest,
    onSuccess: () => {
      invalidateMeetings(queryClient);
      toast.success("Planning meeting scheduled");
    },
  });
}

export function useConfirmPlanningMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: confirmPlanningMeetingRequest,
    onSuccess: () => {
      invalidateMeetings(queryClient);
      toast.success("Meeting confirmed");
    },
  });
}

export function useRequestPlanningReschedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      meetingId,
      ...body
    }: {
      meetingId: string;
      reason: string;
      requestedStart?: string;
      requestedEnd?: string;
    }) => requestPlanningRescheduleRequest(meetingId, body),
    onSuccess: () => {
      invalidateMeetings(queryClient);
      toast.success("Reschedule request sent to HR");
    },
  });
}

export function useReviewPlanningReschedule() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      meetingId,
      ...body
    }: {
      meetingId: string;
      decision: "APPROVED" | "REJECTED";
      reviewNote?: string;
      scheduledAt?: string;
    }) => reviewPlanningRescheduleRequest(meetingId, body),
    onSuccess: () => {
      invalidateMeetings(queryClient);
      toast.success("Reschedule request updated");
    },
  });
}

export function useConfirmPlanningMeetingByHr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: confirmPlanningMeetingByHrRequest,
    onSuccess: () => {
      invalidateMeetings(queryClient);
      toast.success("Meeting confirmed");
    },
  });
}

export function useFollowUpMeetings(filters: {
  page?: number;
  employeeId?: string;
  cycleId?: string;
  pdpStartDate?: string;
  from?: string;
  to?: string;
  status?: string;
  tab?: string;
} = {}) {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: ["meetings", "follow-up", userId, filters],
    queryFn: () => listFollowUpMeetingsRequest({ ...filters, page: filters.page ?? 1 }),
    enabled: Boolean(userId),
  });
}

export function useOtherMeetings(filters: {
  page?: number;
  employeeId?: string;
  cycleId?: string;
  pdpStartDate?: string;
  from?: string;
  to?: string;
  status?: string;
  tab?: string;
} = {}) {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: ["meetings", "other", userId, filters],
    queryFn: () => listOtherMeetingsRequest({ ...filters, page: filters.page ?? 1 }),
    enabled: Boolean(userId),
  });
}

export function useMeetingCalendar(params: {
  year?: number;
  month?: number;
  type?: string;
  status?: string;
  date?: string;
}) {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: ["meetings", "calendar", userId, params],
    queryFn: () => getMeetingCalendarRequest(params),
    enabled: Boolean(userId),
  });
}

export function useScheduleFollowUpMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: scheduleFollowUpMeetingRequest,
    onSuccess: () => {
      invalidateMeetings(queryClient);
      toast.success("Follow-up meeting scheduled");
    },
  });
}

export function useScheduleOtherMeeting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: scheduleOtherMeetingRequest,
    onSuccess: () => {
      invalidateMeetings(queryClient);
      toast.success("Meeting scheduled");
    },
  });
}

export function useSavePlanningNotes() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      meetingId,
      ...body
    }: {
      meetingId: string;
      discussionSummary: string;
      decisionsMade: string;
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
      additionalComments?: string;
      agreedOutcomes?: string;
    }) => savePlanningNotesRequest(meetingId, body),
    onSuccess: () => {
      invalidateMeetings(queryClient);
      toast.success("Meeting notes saved and meeting marked completed");
    },
  });
}
