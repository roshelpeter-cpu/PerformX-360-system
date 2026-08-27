// Appraisal Cycle types
// Shared TypeScript models for HR cycle listing, batches, assignments,
// and draft-cycle deletion.

export type AppraisalCycleStatus =
  | "DRAFT"
  | "UPCOMING"
  | "ACTIVE"
  | "COMPLETED";

export type AppraisalBatchStatus = "UPCOMING" | "ONGOING" | "FINISHED";
export type AssignmentStatus = "COMPLETE" | "PARTIAL" | "UNASSIGNED";

export interface DepartmentRef {
  id: string;
  name: string;
}

export interface EmployeeRef {
  id: string;
  employeeId: string;
  name: string;
  companyEmail?: string;
  role?: string;
  department?: DepartmentRef | null;
}

export interface BatchRef {
  id: string;
  batchNumber: number;
  name: string;
  startDate?: string;
  endDate?: string;
}

export interface BatchTimelineStage {
  id: string;
  title: string;
  description: string;
  status: "completed" | "current" | "pending";
  date: string | null;
  progress: number;
}

export interface BatchTimeline {
  currentStage: string;
  currentStageLabel: string;
  stages: BatchTimelineStage[];
}

export interface AppraisalBatch extends BatchRef {
  description: string | null;
  startDate: string;
  endDate: string;
  status: AppraisalBatchStatus;
  currentStage?: string;
  currentStageLabel?: string;
  timeline?: BatchTimeline | null;
  employeeCount: number;
  supervisorCount?: number;
  employeesWithoutSupervisor?: number;
}

export interface CycleSummary {
  totalAssignableEmployees: number;
  totalEmployeesAssigned: number;
  fullyAssignedCount?: number;
  assignmentCompletionPercent?: number;
  employeesWithoutBatch: number;
  employeesWithoutSupervisor: number;
  supervisorCount: number;
  batches: AppraisalBatch[];
}

export interface AppraisalCycle {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  year: number;
  status: AppraisalCycleStatus;
  confirmedAt?: string | null;
  activatedAt?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: EmployeeRef;
  batches: AppraisalBatch[];
  summary: CycleSummary;
  batchCount?: number;
  employeeCount?: number;
  supervisorCount?: number;
}

export interface CycleEmployeeRow {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  companyEmail: string;
  department: DepartmentRef | null;
  batch: BatchRef | null;
  supervisor: { id: string; employeeId: string; name: string } | null;
  assignmentStatus: AssignmentStatus | string;
}

export interface PaginatedEmployees {
  employees: CycleEmployeeRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SupervisorCard {
  id: string;
  employeeId: string;
  name: string;
  companyEmail: string;
  department: DepartmentRef | null;
  employeeCount: number;
  status?: string;
}

export interface SupervisorGroup {
  department: DepartmentRef | null;
  supervisors: SupervisorCard[];
}

export interface SupervisorListResult {
  grouped: boolean;
  groups?: SupervisorGroup[];
  supervisors?: SupervisorCard[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  stats: {
    totalSupervisors: number;
    totalEmployees: number;
    averageEmployeesPerSupervisor: number;
  };
}

export interface SupervisorDetail {
  cycle: { id: string; name: string; status: AppraisalCycleStatus };
  supervisor: EmployeeRef;
  employeeCount: number;
  employees: CycleEmployeeRow[];
}

export interface HistoryEntry {
  id: string;
  changeType: "BATCH" | "SUPERVISOR";
  changedAt: string;
  effectiveDate: string | null;
  reason: string;
  evidence: string | null;
  evidenceName: string | null;
  employee: EmployeeRef & { department?: DepartmentRef | null };
  previousLabel: string;
  newLabel: string;
  changedBy: EmployeeRef;
}

export interface PaginatedHistory {
  entries: HistoryEntry[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ActivationReadiness {
  cycle: { id: string; name: string; status: AppraisalCycleStatus };
  canActivate: boolean;
  errors: string[];
  summary: CycleSummary;
  missingBatch: EmployeeRef[];
  missingSupervisor: EmployeeRef[];
  crossDepartmentCount: number;
  conflictingActiveCycle: { id: string; name: string } | null;
}

export interface CreateCyclePayload {
  name: string;
  description?: string | null;
  startDate: string;
  confirm?: boolean;
  batches?: Array<{
    name?: string;
    description?: string | null;
    startDate: string;
  }>;
}

export interface ChangeAssignmentPayload {
  reason?: string;
  effectiveDate?: string;
  acknowledgeStarted?: boolean;
  evidenceFile?: File | null;
}

export interface ChangeBatchPayload extends ChangeAssignmentPayload {
  newBatchId: string;
}

export interface ChangeSupervisorPayload extends ChangeAssignmentPayload {
  newSupervisorId: string;
}

export interface EmployeeFilters {
  search?: string;
  departmentId?: string;
  batchId?: string;
  supervisorId?: string;
  assignmentStatus?: string;
  page?: number;
  pageSize?: number;
}

export interface SupervisorFilters {
  search?: string;
  departmentId?: string;
  grouped?: boolean;
  assignedOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface HistoryFilters {
  search?: string;
  employeeId?: string;
  departmentId?: string;
  changeType?: string;
  previousBatchId?: string;
  newBatchId?: string;
  previousSupervisorId?: string;
  newSupervisorId?: string;
  changedById?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}
