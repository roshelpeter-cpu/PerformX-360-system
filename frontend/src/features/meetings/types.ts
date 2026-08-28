export type MeetingParticipantResponse =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "RESCHEDULE_REQUESTED";

export type MeetingStatus =
  | "REQUESTED"
  | "SCHEDULED"
  | "RESCHEDULED"
  | "COMPLETED"
  | "CANCELLED"
  | "PENDING"
  | "CONFIRMED"
  | "RESCHEDULE_REQUESTED";

export type TeamPlanningStatus =
  | "completed"
  | "scheduled"
  | "needs_scheduling"
  | "awaiting_confirmation"
  | "reschedule_requested";

export interface MeetingNotes {
  discussionSummary: string;
  keyPoints: string;
  decisionsMade: string;
  actionItems: string;
  nextSteps: string;
  additionalComments: string | null;
    previousAppraisalReviewed: string | null;
    previousAppraisalFindings: string | null;
    previousAppraisalOutcome?: string | null;
    previousPerformance?: string | null;
    keyAchievements?: string | null;
    previousPdpReviewed: string | null;
    previousPdpCompletion?: string | null;
    completedGoals?: string | null;
    incompleteGoals?: string | null;
    carriedForward?: string | null;
  employeeStrengths: string | null;
  employeeWeaknesses: string | null;
  departmentObjectives: string | null;
  companyObjectives: string | null;
  developmentNeeds: string | null;
  performanceObservations: string | null;
  agreedOutcomes: string | null;
  updatedAt: string;
}

export interface PreviousAppraisalSnapshot {
  cycle: { id: string; name: string; startDate: string; endDate: string };
  outcome: {
    overallResult: string;
    ratingBand: string | null;
    overallScore: number | null;
    awardTitle: string | null;
    bonusAmount: number | null;
    promotionTitle: string | null;
    pipRequired: boolean;
    pipSummary: string | null;
  } | null;
  pdp: {
    status: string;
    summary: string | null;
    goals: Array<{
      id: string;
      title: string;
      objective: string;
      progress: number;
      status: string;
    }>;
  } | null;
  reviews: Array<{ kind: string; score: number | null; comments: string | null }>;
}

export interface PlanningMeeting {
  id: string;
  type: string;
  followUpSlot?: number | null;
  isAdditionalFollowUp?: boolean;
  title: string;
  description: string | null;
  status: MeetingStatus;
  scheduledAt: string;
  endAt: string;
  location: string | null;
  createdAt: string;
  bothConfirmed?: boolean;
  employee: {
    id: string;
    employeeId: string;
    name: string;
    jobTitle: string | null;
    department: { id: string; name: string } | null;
  };
  supervisor: {
    id: string;
    employeeId: string;
    name: string;
    jobTitle: string | null;
  } | null;
  createdBy: { id: string; employeeId: string; name: string };
  batch: {
    id: string;
    name: string;
    batchNumber: number;
    currentStage: string;
  } | null;
  cycle: { id: string; name: string; status: string } | null;
  participants: Array<{
    id: string;
    employeeId: string;
    code: string;
    name: string;
    role: string;
    initials: string;
    response: MeetingParticipantResponse;
    respondedAt: string | null;
  }>;
  employeeResponse: MeetingParticipantResponse;
  supervisorResponse: MeetingParticipantResponse;
  pendingReschedule: {
    id: string;
    reason: string;
    requestedStart: string | null;
    requestedEnd: string | null;
    requester: { id: string; employeeId: string; name: string };
    createdAt: string;
  } | null;
  notes: MeetingNotes | null;
  previousAppraisal?: PreviousAppraisalSnapshot | null;
  actions: {
    canConfirm: boolean;
    canRequestReschedule: boolean;
    canAddNotes: boolean;
    canReviewReschedule: boolean;
    canHrConfirm?: boolean;
  };
}

export interface PlanningMeetingsResponse {
  success: true;
  cycle: { id: string; name: string; status: string } | null;
  stats: {
    upcoming: number;
    completed: number;
    pendingRequests: number;
    total: number;
    needsScheduling?: number;
  };
  teamMembers: Array<{
    id: string;
    employeeId: string;
    name: string;
    jobTitle?: string | null;
    planningStatus?: TeamPlanningStatus;
    meeting?: PlanningMeeting | null;
  }>;
  meetings: PlanningMeeting[];
  confirmationQueue?: PlanningMeeting[];
  nextSevenDays: PlanningMeeting[];
  calendarDates: string[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface SchedulableEmployee {
  id: string;
  employeeId: string;
  name: string;
  jobTitle: string | null;
  department: string | null;
  batch: { id: string; name: string; batchNumber: number; currentStage: string };
  supervisor: { id: string; employeeId: string; name: string } | null;
  currentStage: string;
  planningStatus: "completed" | "scheduled" | "needs_scheduling";
  scheduledAt: string | null;
}
