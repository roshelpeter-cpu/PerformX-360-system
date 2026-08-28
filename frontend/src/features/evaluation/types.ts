export type EvaluationStatus =
  | "NOT_STARTED"
  | "SELF_REVIEW_PENDING"
  | "PEER_REVIEW_PENDING"
  | "SUPERVISOR_REVIEW_PENDING"
  | "WAITING_HR_REVIEW"
  | "APPROVED";

export type EvaluationRecord = {
  id: string;
  status: EvaluationStatus;
  employee: {
    id: string;
    employeeId: string;
    name: string;
    jobTitle: string | null;
    department: { id: string; name: string } | null;
  };
  supervisor: { id: string; employeeId: string; name: string } | null;
  cycle: { id: string; name: string; status: string };
  batch: { id: string; name: string; batchNumber: number } | null;
  selfScore: number | null;
  selfComments: string | null;
  selfGoalReviews: unknown;
  selfSubmittedAt: string | null;
  peerScore: number | null;
  peerSummary: string | null;
  peerCompletion: { total: number; submitted: number };
  peers: Array<{
    id: string;
    label?: string;
    reviewerId?: string;
    reviewerName?: string;
    reviewerCode?: string;
    status?: string;
    score: number | null;
    comments: string | null;
    submittedAt: string | null;
  }>;
  supervisorScore: number | null;
  supervisorComments: string | null;
  strengths: string | null;
  improvementAreas: string | null;
  developmentRecommendations: string | null;
  promotionRecommended: boolean;
  supervisorSubmittedAt: string | null;
  hrComments: string | null;
  hrApprovedAt: string | null;
  approvedBy: { id: string; name: string; employeeId: string } | null;
  breakdown: {
    self: { score: number; weight: number; contribution: number };
    peer: { score: number; weight: number; contribution: number };
    supervisor: { score: number; weight: number; contribution: number };
  };
  finalScore: number | null;
  performanceBand: string | null;
  bonusEligible: boolean;
  bonusAmount: number | null;
  promotionStatus: string;
  awardType: string | null;
  awardLabel: string | null;
  awardConfirmed: boolean;
  pip: {
    id: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    reviewPeriod: string | null;
    summary: string | null;
    assignedAt: string | null;
    goals: Array<{ id: string; title: string; requiredActions: string; expectedOutcomes: string }>;
  } | null;
  reviewRequests: Array<{
    id: string;
    reason: string;
    comments: string | null;
    status: string;
    hrResponse: string | null;
    createdAt: string;
  }>;
  actions: {
    canOpenSelfReview: boolean;
    canSelfReview: boolean;
    canAssignPeers: boolean;
    canSupervisorEvaluate: boolean;
    canHrApprove: boolean;
    canRequestReview: boolean;
  };
};

export type PdpSnapshot = {
  id: string;
  status: string;
  summary: string | null;
  progressPercent: number;
  goals: Array<{
    id: string;
    title: string;
    objective: string;
    dueDate: string | null;
    progress: number;
    status: string;
    evidenceCount: number;
    comments: string[];
  }>;
} | null;
