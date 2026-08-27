import { apiRequest } from "@/services/api/client";
import type {
  DirectoryUser,
  EmployeeFilters,
  ReassignSupervisorPayload,
  WorkforceEmployee,
  WorkforceOverview,
  WorkforceSupervisor,
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

const filterQuery = (filters: EmployeeFilters = {}) =>
  toQuery({
    search: filters.search,
    departmentId: filters.departmentId,
    batchId: filters.batchId,
    supervisorId: filters.supervisorId,
    status: filters.status,
    role: filters.role,
    page: filters.page,
    pageSize: filters.pageSize,
  });

export const employeesApi = {
  getOverview: (filters: EmployeeFilters = {}) =>
    apiRequest<{ success: true } & WorkforceOverview>(
      `/hr/employees/overview${filterQuery(filters)}`
    ),

  listEmployees: (filters: EmployeeFilters = {}) =>
    apiRequest<{
      success: true;
      employees: WorkforceEmployee[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
      cycle: { id: string; name: string; status: string } | null;
    }>(`/hr/employees${filterQuery(filters)}`),

  listBatchEmployees: (batchId: string, filters: EmployeeFilters = {}) =>
    apiRequest<{
      success: true;
      batch: { id: string; batchNumber: number; name: string; startLabel: string };
      employees: WorkforceEmployee[];
      total: number;
      cycle: { id: string; name: string; status: string } | null;
    }>(`/hr/employees/batches/${batchId}${filterQuery(filters)}`),

  listSupervisors: (filters: EmployeeFilters = {}) =>
    apiRequest<{
      success: true;
      supervisors: WorkforceSupervisor[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
      cycle: { id: string; name: string; status: string } | null;
    }>(`/hr/employees/supervisors${filterQuery(filters)}`),

  getSupervisor: (supervisorId: string, filters: EmployeeFilters = {}) =>
    apiRequest<{
      success: true;
      supervisor: DirectoryUser;
      employeeCount: number;
      employees: WorkforceEmployee[];
      cycle: { id: string; name: string; status: string } | null;
    }>(`/hr/employees/supervisors/${supervisorId}${filterQuery(filters)}`),

  listHr: (filters: EmployeeFilters = {}) =>
    apiRequest<{
      success: true;
      users: DirectoryUser[];
      total: number;
    }>(`/hr/employees/hr${filterQuery(filters)}`),

  listLeadership: (filters: EmployeeFilters = {}) =>
    apiRequest<{
      success: true;
      users: DirectoryUser[];
      total: number;
    }>(`/hr/employees/leadership${filterQuery(filters)}`),

  getEmployee: (employeeId: string) =>
    apiRequest<{
      success: true;
      employee: WorkforceEmployee;
      cycle: { id: string; name: string; status: string } | null;
    }>(`/hr/employees/${employeeId}`),

  listEligibleSupervisors: (employeeId: string) =>
    apiRequest<{ success: true; supervisors: DirectoryUser[] }>(
      `/hr/employees/${employeeId}/eligible-supervisors`
    ),

  reassignSupervisor: (employeeId: string, payload: ReassignSupervisorPayload) =>
    apiRequest<{
      success: true;
      employee: WorkforceEmployee;
    }>(`/hr/employees/${employeeId}/supervisor`, {
      method: "POST",
      body: payload,
    }),
};
