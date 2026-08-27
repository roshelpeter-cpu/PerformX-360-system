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

export interface PlanningMeeting {
  id: string;
  type: string;
  title: string;
  description: string | null;
  status: MeetingStatus;
  scheduledAt: string;
  endAt: string;
  location: string | null;
  createdAt: string;
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
  notes: {
    discussionSummary: string;
    keyPoints: string;
    decisionsMade: string;
    actionItems: string;
    nextSteps: string;
    additionalComments: string | null;
    previousAppraisalReviewed: string | null;
    previousAppraisalFindings: string | null;
    employeeStrengths: string | null;
    employeeWeaknesses: string | null;
    performanceObservations: string | null;
    agreedOutcomes: string | null;
    updatedAt: string;
  } | null;
  actions: {
    canConfirm: boolean;
    canRequestReschedule: boolean;
    canAddNotes: boolean;
    canReviewReschedule: boolean;
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
  };
  teamMembers: Array<{ id: string; employeeId: string; name: string }>;
  meetings: PlanningMeeting[];
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
