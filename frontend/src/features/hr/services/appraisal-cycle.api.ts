// Appraisal Cycle API
// Frontend client for HR appraisal-cycle management, including draft deletion.

import { apiRequest } from "@/services/api/client";
import type {
  ActivationReadiness,
  AppraisalBatch,
  AppraisalCycle,
  ChangeBatchPayload,
  ChangeSupervisorPayload,
  CreateCyclePayload,
  EmployeeFilters,
  EmployeeRef,
  HistoryFilters,
  PaginatedEmployees,
  PaginatedHistory,
  SupervisorDetail,
  SupervisorFilters,
  SupervisorListResult,
} from "../types";

function toQuery(params: Record<string, string | number | boolean | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "" || value === false) continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

function assignmentFormData(
  payload: ChangeBatchPayload | ChangeSupervisorPayload
) {
  const form = new FormData();
  if ("newBatchId" in payload) form.set("newBatchId", payload.newBatchId);
  if ("newSupervisorId" in payload) {
    form.set("newSupervisorId", payload.newSupervisorId);
  }
  if (payload.reason) form.set("reason", payload.reason);
  if (payload.effectiveDate) form.set("effectiveDate", payload.effectiveDate);
  if (payload.acknowledgeStarted) form.set("acknowledgeStarted", "true");
  if (payload.evidenceFile) form.set("evidence", payload.evidenceFile);
  return form;
}

export const appraisalCycleApi = {
  listCycles: (filters?: { search?: string; status?: string; year?: number }) =>
    apiRequest<{ success: true; cycles: AppraisalCycle[] }>(
      `/hr/appraisal-cycles${toQuery(filters ?? {})}`
    ),

  getCurrent: () =>
    apiRequest<{ success: true; cycle: AppraisalCycle | null }>(
      "/hr/appraisal-cycles/current"
    ),

  getHistoryCycles: () =>
    apiRequest<{ success: true; cycles: AppraisalCycle[] }>(
      "/hr/appraisal-cycles/history"
    ),

  getWorkforce: () =>
    apiRequest<{
      success: true;
      workforce: {
        totalAssignableEmployees: number;
        supervisorCount: number;
        departmentCount: number;
        employeesInCycles: number;
        activeCycles: number;
        upcomingCycles: number;
        completedCycles: number;
        draftCycles: number;
      };
    }>("/hr/appraisal-cycles/workforce"),

  getCycle: (id: string) =>
    apiRequest<{ success: true; cycle: AppraisalCycle }>(
      `/hr/appraisal-cycles/${id}`
    ),

  createCycle: (payload: CreateCyclePayload) =>
    apiRequest<{ success: true; cycle: AppraisalCycle }>(
      "/hr/appraisal-cycles",
      { method: "POST", body: payload }
    ),

  updateCycle: (id: string, payload: Partial<CreateCyclePayload>) =>
    apiRequest<{ success: true; cycle: AppraisalCycle }>(
      `/hr/appraisal-cycles/${id}`,
      { method: "PATCH", body: payload }
    ),

  confirmCycle: (id: string) =>
    apiRequest<{ success: true; cycle: AppraisalCycle }>(
      `/hr/appraisal-cycles/${id}/confirm`,
      { method: "POST" }
    ),

  getActivationReadiness: (id: string) =>
    apiRequest<{ success: true; readiness: ActivationReadiness }>(
      `/hr/appraisal-cycles/${id}/activation-readiness`
    ),

  activateCycle: (id: string) =>
    apiRequest<{ success: true; cycle: AppraisalCycle }>(
      `/hr/appraisal-cycles/${id}/activate`,
      { method: "POST" }
    ),

  completeCycle: (id: string) =>
    apiRequest<{ success: true; cycle: AppraisalCycle }>(
      `/hr/appraisal-cycles/${id}/complete`,
      { method: "POST" }
    ),

  deleteCycle: (id: string) =>
    apiRequest<{ success: true; id: string; deleted: true }>(
      `/hr/appraisal-cycles/${id}`,
      { method: "DELETE" }
    ),

  getBatch: (cycleId: string, batchId: string) =>
    apiRequest<{ success: true; batch: AppraisalBatch }>(
      `/hr/appraisal-cycles/${cycleId}/batches/${batchId}`
    ),

  updateBatch: (
    cycleId: string,
    batchId: string,
    payload: { name?: string; description?: string | null; startDate: string }
  ) =>
    apiRequest<{ success: true; batch: AppraisalBatch }>(
      `/hr/appraisal-cycles/${cycleId}/batches/${batchId}`,
      { method: "PATCH", body: payload }
    ),

  startBatchStage: (
    cycleId: string,
    batchId: string,
    stage:
      | "SELF_REVIEW"
      | "PEER_REVIEW"
      | "SUPERVISOR_REVIEW"
      | "HR_EVALUATION"
      | "RECOGNITION_PIP"
      | "CLOSURE"
  ) =>
    apiRequest<{ success: true; cycle: AppraisalCycle }>(
      `/hr/appraisal-cycles/${cycleId}/batches/${batchId}/start-stage`,
      { method: "POST", body: { stage } }
    ),

  listDepartments: () =>
    apiRequest<{
      success: true;
      departments: Array<{
        id: string;
        name: string;
        _count: { employees: number };
      }>;
    }>("/hr/appraisal-cycles/departments"),

  listEmployees: (cycleId: string, filters: EmployeeFilters) =>
    apiRequest<{ success: true } & PaginatedEmployees>(
      `/hr/appraisal-cycles/${cycleId}/employees${toQuery({
        search: filters.search,
        departmentId: filters.departmentId,
        batchId: filters.batchId,
        supervisorId: filters.supervisorId,
        assignmentStatus: filters.assignmentStatus,
        page: filters.page,
        pageSize: filters.pageSize,
      })}`
    ),

  changeBatch: (
    cycleId: string,
    employeeId: string,
    payload: ChangeBatchPayload
  ) =>
    apiRequest<{ success: true; assignment: unknown }>(
      `/hr/appraisal-cycles/${cycleId}/employees/${employeeId}/batch`,
      { method: "POST", body: assignmentFormData(payload) }
    ),

  listSupervisors: (cycleId: string, filters: SupervisorFilters) =>
    apiRequest<{ success: true } & SupervisorListResult>(
      `/hr/appraisal-cycles/${cycleId}/supervisors${toQuery({
        search: filters.search,
        departmentId: filters.departmentId,
        grouped: filters.grouped,
        assignedOnly: filters.assignedOnly,
        page: filters.page,
        pageSize: filters.pageSize,
      })}`
    ),

  getSupervisor: (cycleId: string, supervisorId: string) =>
    apiRequest<{ success: true } & SupervisorDetail>(
      `/hr/appraisal-cycles/${cycleId}/supervisors/${supervisorId}`
    ),

  changeSupervisor: (
    cycleId: string,
    employeeId: string,
    payload: ChangeSupervisorPayload
  ) =>
    apiRequest<{ success: true; assignment: unknown }>(
      `/hr/appraisal-cycles/${cycleId}/employees/${employeeId}/supervisor`,
      { method: "POST", body: assignmentFormData(payload) }
    ),

  listEligibleSupervisors: (cycleId: string, employeeId: string) =>
    apiRequest<{ success: true; supervisors: EmployeeRef[] }>(
      `/hr/appraisal-cycles/${cycleId}/employees/${employeeId}/eligible-supervisors`
    ),

  getAssignmentHistory: (cycleId: string, filters: HistoryFilters) =>
    apiRequest<{ success: true } & PaginatedHistory>(
      `/hr/appraisal-cycles/${cycleId}/assignment-history${toQuery({
        search: filters.search,
        employeeId: filters.employeeId,
        departmentId: filters.departmentId,
        changeType: filters.changeType,
        previousBatchId: filters.previousBatchId,
        newBatchId: filters.newBatchId,
        previousSupervisorId: filters.previousSupervisorId,
        newSupervisorId: filters.newSupervisorId,
        changedById: filters.changedById,
        from: filters.from,
        to: filters.to,
        page: filters.page,
        pageSize: filters.pageSize,
      })}`
    ),
};
