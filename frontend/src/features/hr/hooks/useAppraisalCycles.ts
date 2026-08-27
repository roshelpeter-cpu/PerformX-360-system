// Appraisal Cycle hooks
// React Query wrappers for cycle listing, lifecycle actions, assignments,
// and draft-cycle deletion.

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiClientError } from "@/services/api/client";
import { appraisalCycleApi } from "../services/appraisal-cycle.api";
import type {
  ChangeBatchPayload,
  ChangeSupervisorPayload,
  CreateCyclePayload,
  EmployeeFilters,
  HistoryFilters,
  SupervisorFilters,
} from "../types";

const keys = {
  all: ["appraisal-cycles"] as const,
  list: (filters?: object) => [...keys.all, "list", filters ?? {}] as const,
  current: () => [...keys.all, "current"] as const,
  history: () => [...keys.all, "history"] as const,
  workforce: () => [...keys.all, "workforce"] as const,
  detail: (id: string) => [...keys.all, "detail", id] as const,
  batch: (cycleId: string, batchId: string) =>
    [...keys.all, "batch", cycleId, batchId] as const,
  employees: (id: string, filters: object) =>
    [...keys.all, "employees", id, filters] as const,
  supervisors: (id: string, filters: object) =>
    [...keys.all, "supervisors", id, filters] as const,
  supervisorDetail: (cycleId: string, supervisorId: string) =>
    [...keys.all, "supervisor", cycleId, supervisorId] as const,
  assignmentHistory: (id: string, filters: object) =>
    [...keys.all, "assignment-history", id, filters] as const,
  departments: () => [...keys.all, "departments"] as const,
  readiness: (id: string) => [...keys.all, "readiness", id] as const,
  eligibleSupervisors: (cycleId: string, employeeId: string) =>
    [...keys.all, "eligible-supervisors", cycleId, employeeId] as const,
};

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

export function useAppraisalCycles(filters?: {
  search?: string;
  status?: string;
  year?: number;
}) {
  return useQuery({
    queryKey: keys.list(filters),
    queryFn: async () => (await appraisalCycleApi.listCycles(filters)).cycles,
  });
}

export function useCurrentAppraisalCycle() {
  return useQuery({
    queryKey: keys.current(),
    queryFn: async () => (await appraisalCycleApi.getCurrent()).cycle,
  });
}

export function useHistoricalCycles() {
  return useQuery({
    queryKey: keys.history(),
    queryFn: async () => (await appraisalCycleApi.getHistoryCycles()).cycles,
  });
}

export function useWorkforceSummary() {
  return useQuery({
    queryKey: keys.workforce(),
    queryFn: async () => (await appraisalCycleApi.getWorkforce()).workforce,
  });
}

export function useAppraisalCycle(id: string | undefined) {
  return useQuery({
    queryKey: keys.detail(id ?? ""),
    queryFn: async () => (await appraisalCycleApi.getCycle(id!)).cycle,
    enabled: Boolean(id),
  });
}

export function useBatchDetail(cycleId: string | undefined, batchId: string | undefined) {
  return useQuery({
    queryKey: keys.batch(cycleId ?? "", batchId ?? ""),
    queryFn: async () => (await appraisalCycleApi.getBatch(cycleId!, batchId!)).batch,
    enabled: Boolean(cycleId && batchId),
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: keys.departments(),
    queryFn: async () => (await appraisalCycleApi.listDepartments()).departments,
  });
}

export function useCycleEmployees(
  cycleId: string | undefined,
  filters: EmployeeFilters
) {
  return useQuery({
    queryKey: keys.employees(cycleId ?? "", filters),
    queryFn: async () => appraisalCycleApi.listEmployees(cycleId!, filters),
    enabled: Boolean(cycleId),
  });
}

export function useCycleSupervisors(
  cycleId: string | undefined,
  filters: SupervisorFilters
) {
  return useQuery({
    queryKey: keys.supervisors(cycleId ?? "", filters),
    queryFn: async () => appraisalCycleApi.listSupervisors(cycleId!, filters),
    enabled: Boolean(cycleId),
  });
}

export function useSupervisorDetail(
  cycleId: string | undefined,
  supervisorId: string | undefined
) {
  return useQuery({
    queryKey: keys.supervisorDetail(cycleId ?? "", supervisorId ?? ""),
    queryFn: async () => {
      const result = await appraisalCycleApi.getSupervisor(cycleId!, supervisorId!);
      return {
        cycle: result.cycle,
        supervisor: result.supervisor,
        employeeCount: result.employeeCount,
        employees: result.employees,
      };
    },
    enabled: Boolean(cycleId && supervisorId),
  });
}

export function useAssignmentHistory(
  cycleId: string | undefined,
  filters: HistoryFilters
) {
  return useQuery({
    queryKey: keys.assignmentHistory(cycleId ?? "", filters),
    queryFn: async () => appraisalCycleApi.getAssignmentHistory(cycleId!, filters),
    enabled: Boolean(cycleId),
  });
}

export function useActivationReadiness(
  cycleId: string | undefined,
  enabled: boolean
) {
  return useQuery({
    queryKey: keys.readiness(cycleId ?? ""),
    queryFn: async () =>
      (await appraisalCycleApi.getActivationReadiness(cycleId!)).readiness,
    enabled: Boolean(cycleId) && enabled,
  });
}

export function useEligibleSupervisors(
  cycleId: string | undefined,
  employeeId: string | undefined,
  enabled: boolean
) {
  return useQuery({
    queryKey: keys.eligibleSupervisors(cycleId ?? "", employeeId ?? ""),
    queryFn: async () =>
      (await appraisalCycleApi.listEligibleSupervisors(cycleId!, employeeId!))
        .supervisors,
    enabled: Boolean(cycleId && employeeId) && enabled,
  });
}

function useInvalidateCycles() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: keys.all });
}

export function useCreateCycle() {
  const invalidate = useInvalidateCycles();
  return useMutation({
    mutationFn: (payload: CreateCyclePayload) =>
      appraisalCycleApi.createCycle(payload),
    onSuccess: (_data, variables) => {
      invalidate();
      toast.success(
        variables.confirm
          ? "Appraisal cycle confirmed and moved to Upcoming."
          : "Appraisal cycle created as Draft."
      );
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Failed to create cycle"));
    },
  });
}

export function useUpdateCycle(cycleId: string) {
  const invalidate = useInvalidateCycles();
  return useMutation({
    mutationFn: (payload: Partial<CreateCyclePayload>) =>
      appraisalCycleApi.updateCycle(cycleId, payload),
    onSuccess: () => {
      invalidate();
      toast.success("Cycle updated");
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Failed to update cycle"));
    },
  });
}

export function useStartBatchStage(cycleId: string) {
  const invalidate = useInvalidateCycles();
  return useMutation({
    mutationFn: ({
      batchId,
      stage,
    }: {
      batchId: string;
      stage:
        | "SELF_REVIEW"
        | "PEER_REVIEW"
        | "SUPERVISOR_REVIEW"
        | "HR_EVALUATION"
        | "RECOGNITION_PIP"
        | "CLOSURE";
    }) => appraisalCycleApi.startBatchStage(cycleId, batchId, stage),
    onSuccess: () => {
      invalidate();
      toast.success("Batch stage updated");
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Unable to start that batch stage."));
    },
  });
}

export function useConfirmCycle() {
  const invalidate = useInvalidateCycles();
  return useMutation({
    mutationFn: (id: string) => appraisalCycleApi.confirmCycle(id),
    onSuccess: () => {
      invalidate();
      toast.success("Appraisal cycle confirmed and moved to Upcoming.");
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Failed to confirm cycle"));
    },
  });
}

export function useActivateCycle() {
  const invalidate = useInvalidateCycles();
  return useMutation({
    mutationFn: (id: string) => appraisalCycleApi.activateCycle(id),
    onSuccess: () => {
      invalidate();
      toast.success("Appraisal cycle is now Active.");
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Failed to activate cycle"));
    },
  });
}

export function useCompleteCycle() {
  const invalidate = useInvalidateCycles();
  return useMutation({
    mutationFn: (id: string) => appraisalCycleApi.completeCycle(id),
    onSuccess: () => {
      invalidate();
      toast.success("Appraisal cycle completed and moved to History.");
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Failed to complete cycle"));
    },
  });
}

export function useDeleteCycle() {
  const invalidate = useInvalidateCycles();
  return useMutation({
    mutationFn: (id: string) => appraisalCycleApi.deleteCycle(id),
    onSuccess: () => {
      invalidate();
      toast.success("Draft appraisal cycle deleted.");
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Failed to delete cycle"));
    },
  });
}

export function useChangeBatch(cycleId: string) {
  const invalidate = useInvalidateCycles();
  return useMutation({
    mutationFn: ({
      employeeId,
      payload,
    }: {
      employeeId: string;
      payload: ChangeBatchPayload;
    }) => appraisalCycleApi.changeBatch(cycleId, employeeId, payload),
    onSuccess: () => {
      invalidate();
      toast.success("Employee batch updated successfully.");
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Failed to change batch"));
    },
  });
}

export function useChangeSupervisor(cycleId: string) {
  const invalidate = useInvalidateCycles();
  return useMutation({
    mutationFn: ({
      employeeId,
      payload,
    }: {
      employeeId: string;
      payload: ChangeSupervisorPayload;
    }) => appraisalCycleApi.changeSupervisor(cycleId, employeeId, payload),
    onSuccess: () => {
      invalidate();
      toast.success("Employee supervisor updated successfully.");
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Failed to change supervisor"));
    },
  });
}
