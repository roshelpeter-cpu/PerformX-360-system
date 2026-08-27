export type WorkforceTab = "employees" | "supervisors" | "hr" | "leadership";
export type AssignmentStatus = "ASSIGNED" | "PARTIAL" | "UNASSIGNED";

export interface DepartmentRef {
  id: string;
  name: string;
}

export interface SupervisorRef {
  id: string;
  employeeId: string;
  name: string;
}

export interface BatchRef {
  id: string;
  batchNumber: number;
  name: string;
  startDate?: string;
  startLabel?: string;
}

export interface WorkforceEmployee {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  jobTitle?: string | null;
  companyEmail: string;
  department: DepartmentRef | null;
  batch: BatchRef | null;
  supervisor: SupervisorRef | null;
  status: AssignmentStatus | string;
}

export interface WorkforceBatch {
  id: string;
  batchNumber: number;
  name: string;
  startLabel: string;
  employeeCount: number;
  percentOfEmployees: number;
  preview: WorkforceEmployee[];
}

export interface WorkforceOverview {
  cycle: { id: string; name: string; status: string } | null;
  stats: {
    totalEmployees: number;
    filteredEmployees: number;
    assignedEmployees: number;
    assignedPercent: number;
    supervisorCount: number;
    departmentCount: number;
  };
  batches: WorkforceBatch[];
  departments: DepartmentRef[];
}

export interface WorkforceSupervisor {
  id: string;
  employeeId: string;
  name: string;
  jobTitle?: string | null;
  companyEmail: string;
  department: DepartmentRef | null;
  employeeCount: number;
  status: string;
}

export interface DirectoryUser {
  id: string;
  employeeId: string;
  name: string;
  jobTitle?: string | null;
  companyEmail: string;
  department: DepartmentRef | null;
  role: string;
}

export interface EmployeeFilters {
  search?: string;
  departmentId?: string;
  batchId?: string;
  supervisorId?: string;
  status?: string;
  role?: string;
  page?: number;
  pageSize?: number;
}

export interface ReassignSupervisorPayload {
  newSupervisorId: string;
  reason?: string;
  effectiveDate?: string;
}
