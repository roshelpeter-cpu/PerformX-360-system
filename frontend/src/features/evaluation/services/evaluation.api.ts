import { apiRequest } from "@/services/api/client";
import type { EvaluationRecord, PdpSnapshot } from "../types";

export function listEvaluationsRequest(params?: { status?: string; search?: string; page?: number; pageSize?: number }) {
  const search = new URLSearchParams();
  if (params?.status) search.set("status", params.status);
  if (params?.search) search.set("search", params.search);
  if (params?.page) search.set("page", String(params.page));
  if (params?.pageSize) search.set("pageSize", String(params.pageSize));
  const qs = search.toString();
  return apiRequest<{
    success: true;
    cycle: { id: string; name: string } | null;
    stats: {
      all: number;
      notStarted: number;
      selfPending: number;
      peerPending: number;
      supervisorPending: number;
      waitingHr: number;
      approved: number;
    };
    evaluations: EvaluationRecord[];
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  }>(`/evaluations${qs ? `?${qs}` : ""}`);
}

export function getEvaluationRequest(evaluationId: string) {
  return apiRequest<{ success: true; evaluation: EvaluationRecord; pdp: PdpSnapshot }>(
    `/evaluations/${evaluationId}`
  );
}

export function getMyEvaluationRequest() {
  return apiRequest<{ success: true; evaluation: EvaluationRecord | null; pdp: PdpSnapshot }>("/evaluations/me");
}

export function openSelfReviewRequest(evaluationId: string) {
  return apiRequest<{ success: true; evaluation: EvaluationRecord }>(`/evaluations/${evaluationId}/open-self-review`, {
    method: "POST",
    body: {},
  });
}

export function saveSelfReviewRequest(
  evaluationId: string,
  body: { score: number; comments: string; goalReviews?: unknown; submit?: boolean }
) {
  return apiRequest<{ success: true; evaluation: EvaluationRecord }>(`/evaluations/${evaluationId}/self-review`, {
    method: "PUT",
    body,
  });
}

export function assignPeersRequest(evaluationId: string, reviewerIds: string[]) {
  return apiRequest<{ success: true; evaluation: EvaluationRecord }>(`/evaluations/${evaluationId}/peers`, {
    method: "POST",
    body: { reviewerIds },
  });
}

export function listAssignedPeerReviewsRequest() {
  return apiRequest<{
    success: true;
    reviews: Array<{
      id: string;
      status: string;
      score: number | null;
      comments: string | null;
      evaluationId: string;
      employee: EvaluationRecord["employee"];
      cycle: { id: string; name: string };
    }>;
  }>("/evaluations/peers/assigned");
}

export function submitPeerReviewRequest(assignmentId: string, body: { score: number; comments: string }) {
  return apiRequest<{ success: true }>(`/evaluations/peer-reviews/${assignmentId}`, { method: "POST", body });
}

export function saveSupervisorEvalRequest(
  evaluationId: string,
  body: {
    score: number;
    comments: string;
    strengths: string;
    improvementAreas: string;
    developmentRecommendations: string;
    promotionRecommended?: boolean;
    submit?: boolean;
  }
) {
  return apiRequest<{ success: true; evaluation: EvaluationRecord }>(`/evaluations/${evaluationId}/supervisor`, {
    method: "PUT",
    body,
  });
}

export function hrApproveRequest(
  evaluationId: string,
  body: { hrComments?: string; promotionStatus?: string; awardType?: string | null; awardConfirmed?: boolean }
) {
  return apiRequest<{ success: true; evaluation: EvaluationRecord }>(`/evaluations/${evaluationId}/approve`, {
    method: "POST",
    body,
  });
}

export function updateRecognitionRequest(
  evaluationId: string,
  body: { promotionStatus?: string; awardType?: string | null; awardConfirmed?: boolean }
) {
  return apiRequest<{ success: true; evaluation: EvaluationRecord }>(`/evaluations/${evaluationId}/recognition`, {
    method: "PUT",
    body,
  });
}

export function savePipRequest(
  evaluationId: string,
  body: {
    summary: string;
    reviewPeriod: string;
    startDate?: string;
    endDate?: string;
    assign?: boolean;
    status?: string;
    goals: Array<{ title: string; requiredActions: string; expectedOutcomes: string }>;
  }
) {
  return apiRequest<{ success: true; evaluation: EvaluationRecord }>(`/evaluations/${evaluationId}/pip`, {
    method: "PUT",
    body,
  });
}

export function listPipsRequest() {
  return apiRequest<{ success: true; pips: Array<Record<string, unknown>> }>("/evaluations/pips");
}

export function createReviewRequestRequest(body: { reason: string; comments?: string }) {
  return apiRequest<{ success: true; request: { id: string } }>("/evaluations/review-requests", {
    method: "POST",
    body,
  });
}

export function listReviewRequestsRequest() {
  return apiRequest<{ success: true; requests: Array<Record<string, unknown>> }>("/evaluations/review-requests");
}

export function respondReviewRequestRequest(requestId: string, body: { status: string; hrResponse: string }) {
  return apiRequest<{ success: true }>(`/evaluations/review-requests/${requestId}/respond`, {
    method: "POST",
    body,
  });
}

export function listEligiblePeersRequest() {
  return apiRequest<{
    success: true;
    employees: Array<{ id: string; employeeId: string; name: string; jobTitle: string | null }>;
  }>("/evaluations/peers/eligible");
}

export function leadershipAnalyticsRequest(params?: { cycleId?: string; departmentId?: string }) {
  const search = new URLSearchParams();
  if (params?.cycleId) search.set("cycleId", params.cycleId);
  if (params?.departmentId) search.set("departmentId", params.departmentId);
  const qs = search.toString();
  return apiRequest<Record<string, unknown>>(`/evaluations/analytics${qs ? `?${qs}` : ""}`);
}

export function reportingRowsRequest(params?: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const qs = search.toString();
  return apiRequest<{
    success: true;
    cycles: Array<{ id: string; name: string; status: string }>;
    departments: Array<{ id: string; name: string }>;
    rows: Array<Record<string, string | number | null>>;
  }>(`/evaluations/reports${qs ? `?${qs}` : ""}`);
}
