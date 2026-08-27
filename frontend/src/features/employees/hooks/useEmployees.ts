import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiClientError } from "@/services/api/client";
import { employeesApi } from "../services/employees.api";
import type { EmployeeFilters, ReassignSupervisorPayload } from "../types";

const keys = {
  all: ["employee-management"] as const,
  overview: (filters: object) => [...keys.all, "overview", filters] as const,
  employees: (filters: object) => [...keys.all, "employees", filters] as const,
  batch: (batchId: string, filters: object) =>
    [...keys.all, "batch", batchId, filters] as const,
  supervisors: (filters: object) => [...keys.all, "supervisors", filters] as const,
  supervisor: (id: string) => [...keys.all, "supervisor", id] as const,
  hr: (filters: object) => [...keys.all, "hr", filters] as const,
  leadership: (filters: object) => [...keys.all, "leadership", filters] as const,
  eligible: (employeeId: string) => [...keys.all, "eligible", employeeId] as const,
};

function errorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiClientError) return error.message;
  if (error instanceof Error) return error.message;
  return fallback;
}

export function useEmployeeOverview(filters: EmployeeFilters, enabled = true) {
  return useQuery({
    queryKey: keys.overview(filters),
    queryFn: () => employeesApi.getOverview(filters),
    enabled,
  });
}

export function useWorkforceEmployees(filters: EmployeeFilters, enabled = true) {
  return useQuery({
    queryKey: keys.employees(filters),
    queryFn: () => employeesApi.listEmployees(filters),
    enabled,
  });
}

export function useBatchEmployees(
  batchId: string | undefined,
  filters: EmployeeFilters,
  enabled = true
) {
  return useQuery({
    queryKey: keys.batch(batchId ?? "", filters),
    queryFn: () => employeesApi.listBatchEmployees(batchId!, filters),
    enabled: Boolean(batchId) && enabled,
  });
}

export function useWorkforceSupervisors(filters: EmployeeFilters, enabled = true) {
  return useQuery({
    queryKey: keys.supervisors(filters),
    queryFn: () => employeesApi.listSupervisors(filters),
    enabled,
  });
}

export function useWorkforceSupervisor(
  supervisorId: string | undefined,
  enabled = true
) {
  return useQuery({
    queryKey: keys.supervisor(supervisorId ?? ""),
    queryFn: () => employeesApi.getSupervisor(supervisorId!),
    enabled: Boolean(supervisorId) && enabled,
  });
}

export function useHrUsers(filters: EmployeeFilters, enabled = true) {
  return useQuery({
    queryKey: keys.hr(filters),
    queryFn: () => employeesApi.listHr(filters),
    enabled,
  });
}

export function useLeadershipUsers(filters: EmployeeFilters, enabled = true) {
  return useQuery({
    queryKey: keys.leadership(filters),
    queryFn: () => employeesApi.listLeadership(filters),
    enabled,
  });
}

export function useEligibleWorkforceSupervisors(
  employeeId: string | undefined,
  enabled = true
) {
  return useQuery({
    queryKey: keys.eligible(employeeId ?? ""),
    queryFn: async () =>
      (await employeesApi.listEligibleSupervisors(employeeId!)).supervisors,
    enabled: Boolean(employeeId) && enabled,
  });
}

export function useReassignSupervisor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      employeeId,
      payload,
    }: {
      employeeId: string;
      payload: ReassignSupervisorPayload;
    }) => employeesApi.reassignSupervisor(employeeId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.all });
      queryClient.invalidateQueries({ queryKey: ["appraisal-cycles"] });
      toast.success("Supervisor assignment updated.");
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Unable to change supervisor."));
    },
  });
}
