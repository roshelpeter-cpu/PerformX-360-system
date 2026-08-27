import { apiRequest } from "@/services/api/client";
import type { EmployeeAppraisalProgress } from "@/features/dashboard/services/dashboard.api";
import type { MyTeamFilters, MyTeamResponse } from "../types";

function toQuery(params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export function getMyTeamRequest(filters: MyTeamFilters = {}) {
  return apiRequest<MyTeamResponse>(
    `/supervisor/my-team${toQuery({
      search: filters.search,
      departmentId: filters.departmentId,
      batchId: filters.batchId,
      page: filters.page,
      pageSize: filters.pageSize,
    })}`
  );
}

export function getTeamMemberRequest(employeeId: string) {
  return apiRequest<{
    success: true;
    cycle: MyTeamResponse["cycle"];
    employee: {
      id: string;
      employeeId: string;
      name: string;
      role: string;
      jobTitle: string | null;
      companyEmail: string;
      department: { id: string; name: string } | null;
    };
    progress: EmployeeAppraisalProgress;
  }>(`/supervisor/my-team/${employeeId}`);
}
