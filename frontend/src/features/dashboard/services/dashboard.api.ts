import { apiRequest } from "@/services/api/client";

export interface DashboardProfile {
  id: string;
  employeeId: string;
  name: string;
  role: "EMPLOYEE" | "SUPERVISOR" | "HR" | "LEADERSHIP";
  companyEmail: string;
  jobTitle: string | null;
  department: { id: string; name: string } | null;
}

export interface DashboardNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  status: "UNREAD" | "READ";
  createdAt: string;
}

export interface DashboardCycle {
  id: string;
  name: string;
  status: string;
  startDate: string;
  endDate: string;
  description?: string | null;
}

export interface DashboardBatch {
  id: string;
  name: string;
  batchNumber: number;
  status?: string;
  currentStage?: string;
  startDate?: string;
  endDate?: string;
}

export interface AppraisalStageView {
  id: string;
  title: string;
  description: string;
  status: "completed" | "current" | "pending";
  date: string | null;
}

export interface EmployeeAppraisalProgress {
  cycle: DashboardCycle | null;
  batch: DashboardBatch | null;
  supervisor: {
    id: string;
    employeeId: string;
    name: string;
    jobTitle: string | null;
    companyEmail: string;
  } | null;
  currentStage: string;
  currentStageLabel: string;
  stages: AppraisalStageView[];
  planningMeetingCompleted: boolean;
  followUpMeetingsCompleted: number;
  pdp: {
    id: string;
    status: string;
    created: boolean;
    sentToEmployee: boolean;
    approvalPending: boolean;
    approved: boolean;
    approvedAt: string | null;
  } | null;
  reviews: {
    selfReview: "not_started" | "active" | "completed";
    peerReview: "not_started" | "active" | "completed";
    supervisorReview: "not_started" | "active" | "completed";
    hrEvaluation: "not_started" | "active" | "completed";
  };
  outcome: {
    overallResult: string;
    ratingBand: string | null;
    overallScore: number | null;
    resultsIssued: boolean;
    resultsIssuedAt: string | null;
    awardReceived: boolean;
    awardTitle: string | null;
    awardDescription: string | null;
    pipRequired: boolean;
    pipStatus: string;
    pipSummary: string | null;
    supervisorComments: string | null;
    bonusAwarded?: boolean;
    bonusAmount?: number | null;
    bonusNotes?: string | null;
    promotionRecommended?: boolean;
    promotionTitle?: string | null;
    promotionNotes?: string | null;
  } | null;
}

export interface DashboardTeamMember {
  id: string;
  employeeId: string;
  name: string;
  jobTitle: string | null;
  companyEmail: string;
  department: { id: string; name: string } | null;
  batch: { id: string; name: string; batchNumber: number } | null;
}

export interface DashboardOverview {
  totalEmployees: number;
  pdpsInProgress: number;
  meetingsToday: number;
  completedMeetings: number;
  overallProgress: number;
  meetingsByType: {
    planning: number;
    followUp: number;
    other: number;
    cancelled: number;
    total: number;
  };
  pdpStatus: {
    draft: number;
    waitingEmployee: number;
    waitingHr: number;
    approved: number;
    completed: number;
  };
  upcomingMeetings: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    scheduledAt: string;
    endAt: string;
    location: string | null;
    employee: { id: string; name: string; employeeId: string };
    supervisor: { id: string; name: string } | null;
    participants: Array<{ id: string; name: string }>;
  }>;
  calendarDates: Array<{ date: string; type: string }>;
  tasks: {
    waitingHr: number;
    changeRequests: number;
    rescheduleRequests: number;
    needsScheduling: number;
  };
}

export interface DashboardPayload {
  role: DashboardProfile["role"];
  profile: DashboardProfile;
  cycle?: DashboardCycle | null;
  batch?: DashboardBatch | null;
  supervisor?: {
    id: string;
    employeeId: string;
    name: string;
    jobTitle: string | null;
    companyEmail: string;
  } | null;
  team?: DashboardTeamMember[];
  teamCount?: number;
  workforce?: {
    totalAssignableEmployees: number;
    supervisorCount: number;
    departmentCount: number;
    employeesInCycles: number;
    activeCycles: number;
    upcomingCycles: number;
    completedCycles: number;
    draftCycles: number;
  };
  currentCycle?: unknown;
  cycles?: Array<{
    id: string;
    name: string;
    status: string;
    startDate: string;
    endDate: string;
    year?: number;
    employeeCount?: number;
    supervisorCount?: number;
  }>;
  departments?: Array<{ id: string; name: string; employeeCount: number }>;
  pendingPasswordResets?: number;
  overview?: DashboardOverview;
  notifications: DashboardNotification[];
  unreadCount: number;
  progress?: EmployeeAppraisalProgress;
}

export async function getMyDashboardRequest() {
  return apiRequest<{ success: true; dashboard: DashboardPayload }>(
    "/dashboard/me"
  );
}
