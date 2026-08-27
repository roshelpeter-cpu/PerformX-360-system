import { apiRequest } from "@/services/api/client";
import type { EmployeeAppraisalProgress } from "@/features/dashboard/services/dashboard.api";

export interface HistoryCycle {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  description: string | null;
}

export interface HistoryDetail {
  cycle: HistoryCycle;
  progress: EmployeeAppraisalProgress;
  pdp: {
    id: string;
    status: string;
    summary: string | null;
    approvedAt: string | null;
    employeeAgreedAt: string | null;
    goals: Array<{
      id: string;
      title: string;
      objective: string;
      progress: number;
      status: string;
    }>;
  } | null;
  meetings: Array<{
    id: string;
    type: string;
    title: string;
    status: string;
    scheduledAt: string;
    endAt: string;
    location: string | null;
    supervisor: { id: string; name: string; employeeId: string } | null;
    notes: {
      discussionSummary: string;
      decisionsMade: string;
      keyPoints: string;
      additionalComments: string | null;
    } | null;
  }>;
  reviews: Array<{
    id: string;
    kind: string;
    score: number | null;
    comments: string | null;
    completedAt: string;
    reviewer: { id: string; name: string; employeeId: string } | null;
  }>;
}

function toQuery(employeeId?: string) {
  return employeeId ? `?employeeId=${encodeURIComponent(employeeId)}` : "";
}

export function listHistoryCyclesRequest(employeeId?: string) {
  return apiRequest<{ success: true; employeeId: string; cycles: HistoryCycle[] }>(
    `/appraisal-history/cycles${toQuery(employeeId)}`
  );
}

export function getHistoryCycleRequest(cycleId: string, employeeId?: string) {
  return apiRequest<{ success: true } & HistoryDetail>(
    `/appraisal-history/cycles/${cycleId}${toQuery(employeeId)}`
  );
}
