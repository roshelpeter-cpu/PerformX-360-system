import { apiRequest } from "@/services/api/client";
import type { GoalDraft, PdpRecord } from "../types";

export function listPdpsRequest(params?: { status?: string; search?: string; cycleId?: string; page?: number }) {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.search) search.set("search", params.search);
  if (params?.cycleId) search.set("cycleId", params.cycleId);
  if (params?.page) search.set("page", String(params.page));
  search.set("pageSize", "50");
  const qs = search.toString();
  return apiRequest<{
    success: true;
    pdps: PdpRecord[];
    stats?: {
      all: number;
      draft: number;
      waitingEmployee: number;
      waitingHr: number;
      approved: number;
      completed: number;
      changesRequested: number;
    };
    team: Array<{
      id: string;
      employeeId: string;
      name: string;
      jobTitle: string | null;
      department?: { id: string; name: string } | null;
      pdp: PdpRecord | null;
    }>;
    cycle: { id: string; name: string; status: string } | null;
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  }>(`/pdp${qs ? `?${qs}` : ""}`);
}

export function getPdpRequest(pdpId: string) {
  return apiRequest<{ success: true; pdp: PdpRecord }>(`/pdp/${pdpId}`);
}

export function getMyPdpRequest() {
  return apiRequest<{ success: true; pdp: PdpRecord | null }>("/pdp/me");
}

export function createPdpRequest(employeeId: string) {
  return apiRequest<{ success: true; pdp: PdpRecord }>("/pdp", {
    method: "POST",
    body: { employeeId, goals: [] },
  });
}

export function savePdpDraftRequest(pdpId: string, body: { summary?: string; goals: GoalDraft[] }) {
  return apiRequest<{ success: true; pdp: PdpRecord }>(`/pdp/${pdpId}/draft`, {
    method: "PUT",
    body: {
      summary: body.summary,
      goals: body.goals.map((goal) => ({
        ...goal,
        startDate: goal.startDate || undefined,
        dueDate: goal.dueDate || undefined,
      })),
    },
  });
}

export function submitPdpRequest(pdpId: string) {
  return apiRequest<{ success: true; pdp: PdpRecord }>(`/pdp/${pdpId}/submit`, { method: "POST", body: {} });
}

export function employeeReviewPdpRequest(
  pdpId: string,
  body: { decision: "APPROVE" | "REQUEST_CHANGES"; message?: string }
) {
  return apiRequest<{ success: true; pdp: PdpRecord }>(`/pdp/${pdpId}/employee-review`, {
    method: "POST",
    body,
  });
}

export function hrReviewPdpRequest(
  pdpId: string,
  body: { decision: "APPROVE" | "REQUEST_CHANGES"; message?: string }
) {
  return apiRequest<{ success: true; pdp: PdpRecord }>(`/pdp/${pdpId}/hr-review`, {
    method: "POST",
    body,
  });
}

export function redirectPdpRequest(pdpId: string, reason: string) {
  return apiRequest<{ success: true; pdp: PdpRecord }>(`/pdp/${pdpId}/redirect`, {
    method: "POST",
    body: { reason },
  });
}

export function assignPdpRequest(pdpId: string) {
  return apiRequest<{ success: true; pdp: PdpRecord }>(`/pdp/${pdpId}/assign`, { method: "POST", body: {} });
}

export function updateGoalProgressRequest(
  pdpId: string,
  goalId: string,
  body: { progress: number; notes?: string; status?: string }
) {
  return apiRequest<{ success: true; pdp: PdpRecord }>(`/pdp/${pdpId}/goals/${goalId}/progress`, {
    method: "PUT",
    body,
  });
}

export function uploadPdpEvidenceRequest(pdpId: string, goalId: string, file: File, kind: string) {
  const form = new FormData();
  form.append("evidence", file);
  form.append("kind", kind);
  return apiRequest<{ success: true; pdp: PdpRecord }>(`/pdp/${pdpId}/goals/${goalId}/evidence`, {
    method: "POST",
    body: form,
  });
}

export function reviewPdpEvidenceRequest(evidenceId: string) {
  return apiRequest<{ success: true; pdp: PdpRecord }>(`/pdp/evidence/${evidenceId}/review`, {
    method: "POST",
    body: {},
  });
}
