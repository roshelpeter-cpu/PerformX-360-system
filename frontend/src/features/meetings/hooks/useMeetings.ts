import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import {
  confirmPlanningMeetingRequest,
  listPlanningMeetingsRequest,
  listSchedulableEmployeesRequest,
  requestPlanningRescheduleRequest,
  reviewPlanningRescheduleRequest,
  savePlanningNotesRequest,
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
      previousAppraisalReviewed?: string;
      previousAppraisalFindings?: string;
      employeeStrengths?: string;
      employeeWeaknesses?: string;
      performanceObservations?: string;
      agreedOutcomes?: string;
    }) => savePlanningNotesRequest(meetingId, body),
    onSuccess: () => {
      invalidateMeetings(queryClient);
      toast.success("Meeting notes saved and meeting marked completed");
    },
  });
}
