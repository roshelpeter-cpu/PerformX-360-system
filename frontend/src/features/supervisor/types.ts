export interface TeamDepartment {
  id: string;
  name: string;
}

export interface TeamBatch {
  id: string;
  batchNumber: number;
  name: string;
  startDate?: string;
  endDate?: string;
}

export interface TeamMember {
  id: string;
  employeeId: string;
  name: string;
  role: string;
  jobTitle: string | null;
  companyEmail: string;
  department: TeamDepartment | null;
  batch: TeamBatch | null;
  pdp: {
    id: string;
    status: string;
    progress?: number | null;
  } | null;
  currentStage?: string;
  currentStageLabel?: string;
  planningMeetingCompleted?: boolean;
  status: string;
}

export interface MyTeamResponse {
  success: true;
  cycle: {
    id: string;
    name: string;
    status: string;
    startDate: string;
    endDate: string;
  } | null;
  stats: {
    teamSize: number;
    activePdps: number;
    avgPdpProgress?: number;
    planningMeetingsCompleted?: number;
    completedReviews: number;
  };
  batches: TeamBatch[];
  departments: TeamDepartment[];
  employees: TeamMember[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface MyTeamFilters {
  search?: string;
  departmentId?: string;
  batchId?: string;
  page?: number;
  pageSize?: number;
}
