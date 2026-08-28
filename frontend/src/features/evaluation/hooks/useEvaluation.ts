import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import {
  assignPeersRequest,
  createReviewRequestRequest,
  getEvaluationRequest,
  getMyEvaluationRequest,
  hrApproveRequest,
  leadershipAnalyticsRequest,
  listAssignedPeerReviewsRequest,
  listEligiblePeersRequest,
  listEvaluationsRequest,
  listPipsRequest,
  listReviewRequestsRequest,
  openSelfReviewRequest,
  reportingRowsRequest,
  respondReviewRequestRequest,
  savePipRequest,
  saveSelfReviewRequest,
  saveSupervisorEvalRequest,
  submitPeerReviewRequest,
  updateRecognitionRequest,
} from "../services/evaluation.api";

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["evaluations"] });
  queryClient.invalidateQueries({ queryKey: ["auth", "notifications"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
}

export function useEvaluationList(params?: { status?: string; search?: string; page?: number; pageSize?: number }) {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: ["evaluations", "list", userId, params],
    queryFn: () => listEvaluationsRequest(params),
    enabled: Boolean(userId),
  });
}

export function useEvaluation(evaluationId?: string) {
  return useQuery({
    queryKey: ["evaluations", "detail", evaluationId],
    queryFn: () => getEvaluationRequest(evaluationId!),
    enabled: Boolean(evaluationId),
  });
}

export function useMyEvaluation() {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: ["evaluations", "me", userId],
    queryFn: getMyEvaluationRequest,
    enabled: Boolean(userId),
  });
}

export function useOpenSelfReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: openSelfReviewRequest,
    onSuccess: () => {
      invalidate(queryClient);
      toast.success("Self-review opened");
    },
  });
}

export function useSaveSelfReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      evaluationId,
      ...body
    }: {
      evaluationId: string;
      score: number;
      comments: string;
      goalReviews?: unknown;
      submit?: boolean;
    }) => saveSelfReviewRequest(evaluationId, body),
    onSuccess: (_data, variables) => {
      invalidate(queryClient);
      toast.success(variables.submit ? "Self-review submitted" : "Draft saved");
    },
  });
}

export function useAssignPeers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ evaluationId, reviewerIds }: { evaluationId: string; reviewerIds: string[] }) =>
      assignPeersRequest(evaluationId, reviewerIds),
    onSuccess: () => {
      invalidate(queryClient);
      toast.success("Peer reviewers updated");
    },
  });
}

export function useAssignedPeerReviews() {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: ["evaluations", "peer-assigned", userId],
    queryFn: listAssignedPeerReviewsRequest,
    enabled: Boolean(userId),
  });
}

export function useSubmitPeerReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ assignmentId, score, comments }: { assignmentId: string; score: number; comments: string }) =>
      submitPeerReviewRequest(assignmentId, { score, comments }),
    onSuccess: () => {
      invalidate(queryClient);
      toast.success("Peer review submitted");
    },
  });
}

export function useSaveSupervisorEval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      evaluationId,
      ...body
    }: {
      evaluationId: string;
      score: number;
      comments: string;
      strengths: string;
      improvementAreas: string;
      developmentRecommendations: string;
      promotionRecommended?: boolean;
      submit?: boolean;
    }) => saveSupervisorEvalRequest(evaluationId, body),
    onSuccess: (_data, variables) => {
      invalidate(queryClient);
      toast.success(variables.submit ? "Supervisor evaluation submitted" : "Draft saved");
    },
  });
}

export function useHrApprove() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      evaluationId,
      ...body
    }: {
      evaluationId: string;
      hrComments?: string;
      promotionStatus?: string;
      awardType?: string | null;
      awardConfirmed?: boolean;
    }) => hrApproveRequest(evaluationId, body),
    onSuccess: () => {
      invalidate(queryClient);
      toast.success("Appraisal approved");
    },
  });
}

export function useUpdateRecognition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      evaluationId,
      ...body
    }: {
      evaluationId: string;
      promotionStatus?: string;
      awardType?: string | null;
      awardConfirmed?: boolean;
    }) => updateRecognitionRequest(evaluationId, body),
    onSuccess: () => {
      invalidate(queryClient);
      toast.success("Recognition updated");
    },
  });
}

export function useSavePip() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ evaluationId, ...body }: { evaluationId: string } & Parameters<typeof savePipRequest>[1]) =>
      savePipRequest(evaluationId, body),
    onSuccess: () => {
      invalidate(queryClient);
      toast.success("PIP saved");
    },
  });
}

export function usePipList() {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({ queryKey: ["evaluations", "pips", userId], queryFn: listPipsRequest, enabled: Boolean(userId) });
}

export function useReviewRequests() {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: ["evaluations", "review-requests", userId],
    queryFn: listReviewRequestsRequest,
    enabled: Boolean(userId),
  });
}

export function useCreateReviewRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createReviewRequestRequest,
    onSuccess: () => {
      invalidate(queryClient);
      toast.success("Appraisal review requested");
    },
  });
}

export function useRespondReviewRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, ...body }: { requestId: string; status: string; hrResponse: string }) =>
      respondReviewRequestRequest(requestId, body),
    onSuccess: () => {
      invalidate(queryClient);
      toast.success("Response sent");
    },
  });
}

export function useEligiblePeers() {
  return useQuery({ queryKey: ["evaluations", "eligible-peers"], queryFn: listEligiblePeersRequest });
}

export function useLeadershipAnalytics(params?: { cycleId?: string; departmentId?: string }) {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: ["evaluations", "analytics", userId, params],
    queryFn: () => leadershipAnalyticsRequest(params),
    enabled: Boolean(userId),
  });
}

export function useReporting(params?: Record<string, string | undefined>) {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: ["evaluations", "reports", userId, params],
    queryFn: () => reportingRowsRequest(params),
    enabled: Boolean(userId),
  });
}
