import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import {
  assignPdpRequest,
  createPdpRequest,
  employeeReviewPdpRequest,
  getMyPdpRequest,
  getPdpRequest,
  hrReviewPdpRequest,
  listPdpsRequest,
  redirectPdpRequest,
  reviewPdpEvidenceRequest,
  savePdpDraftRequest,
  submitPdpRequest,
  updateGoalProgressRequest,
  uploadPdpEvidenceRequest,
  addGoalCommentRequest,
} from "../services/pdp.api";
import type { GoalDraft } from "../types";

function invalidate(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["pdp"] });
  queryClient.invalidateQueries({ queryKey: ["auth", "notifications"] });
  queryClient.invalidateQueries({ queryKey: ["dashboard"] });
}

export function usePdpList(params?: { status?: string; search?: string; page?: number }) {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({
    queryKey: ["pdp", "list", userId, params],
    queryFn: () => listPdpsRequest(params),
    enabled: Boolean(userId),
  });
}

export function usePdp(pdpId?: string) {
  return useQuery({
    queryKey: ["pdp", "detail", pdpId],
    queryFn: () => getPdpRequest(pdpId!),
    enabled: Boolean(pdpId),
  });
}

export function useMyPdp() {
  const userId = useAuthStore((s) => s.user?.id);
  return useQuery({ queryKey: ["pdp", "me", userId], queryFn: getMyPdpRequest, enabled: Boolean(userId) });
}

export function useCreatePdp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPdpRequest,
    onSuccess: () => {
      invalidate(queryClient);
      toast.success("PDP draft created");
    },
  });
}

export function useSavePdpDraft() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pdpId, goals, summary }: { pdpId: string; goals: GoalDraft[]; summary?: string }) =>
      savePdpDraftRequest(pdpId, { goals, summary }),
    onSuccess: () => {
      invalidate(queryClient);
      toast.success("Draft saved");
    },
  });
}

export function useSubmitPdp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitPdpRequest,
    onSuccess: () => {
      invalidate(queryClient);
      toast.success("PDP submitted for employee approval");
    },
  });
}

export function useEmployeeReviewPdp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pdpId, ...body }: { pdpId: string; decision: "APPROVE" | "REQUEST_CHANGES"; message?: string }) =>
      employeeReviewPdpRequest(pdpId, body),
    onSuccess: () => {
      invalidate(queryClient);
      toast.success("Your PDP review was saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useHrReviewPdp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pdpId, ...body }: { pdpId: string; decision: "APPROVE" | "REQUEST_CHANGES"; message?: string }) =>
      hrReviewPdpRequest(pdpId, body),
    onSuccess: (result) => {
      invalidate(queryClient);
      toast.success(result.pdp.status === "ASSIGNED" ? "PDP approved and assigned" : "HR review saved");
    },
    onError: (error: Error) => toast.error(error.message),
  });
}

export function useRedirectPdp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pdpId, reason }: { pdpId: string; reason: string }) => redirectPdpRequest(pdpId, reason),
    onSuccess: () => {
      invalidate(queryClient);
      toast.success("Issue redirected to HR. An Other Meeting was created.");
    },
  });
}

export function useAssignPdp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assignPdpRequest,
    onSuccess: () => {
      invalidate(queryClient);
      toast.success("PDP assigned to the employee");
    },
  });
}

export function useUpdateGoalProgress() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      pdpId,
      goalId,
      ...body
    }: {
      pdpId: string;
      goalId: string;
      progress: number;
      notes?: string;
      status?: string;
    }) => updateGoalProgressRequest(pdpId, goalId, body),
    onSuccess: () => {
      invalidate(queryClient);
      toast.success("Goal progress updated");
    },
  });
}

export function useUploadPdpEvidence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      pdpId,
      goalId,
      file,
      kind,
    }: {
      pdpId: string;
      goalId: string;
      file: File;
      kind: string;
    }) => uploadPdpEvidenceRequest(pdpId, goalId, file, kind),
    onSuccess: () => {
      invalidate(queryClient);
      toast.success("Evidence uploaded");
    },
  });
}

export function useReviewPdpEvidence() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reviewPdpEvidenceRequest,
    onSuccess: () => {
      invalidate(queryClient);
      toast.success("Evidence marked as reviewed");
    },
  });
}

export function useAddGoalComment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pdpId, goalId, message }: { pdpId: string; goalId: string; message: string }) =>
      addGoalCommentRequest(pdpId, goalId, message),
    onSuccess: () => {
      invalidate(queryClient);
      toast.success("Comment added");
    },
  });
}
