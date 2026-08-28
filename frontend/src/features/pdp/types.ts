export const MIN_PDP_GOALS = 40;

export interface PdpGoal {
  id: string;
  title: string;
  objective: string;
  expectedOutcome: string | null;
  developmentArea: string | null;
  measurementKpi: string | null;
  successCriteria: string | null;
  notes: string | null;
  category: string | null;
  priority: string;
  weightage: number;
  dueDate: string | null;
  startDate?: string | null;
  progress: number;
  status: string;
  progressComments?: string | null;
  sortOrder: number;
}

export interface PdpEvidence {
  id: string;
  fileName: string;
  storedName: string;
  mimeType: string;
  kind: string;
  status: string;
  createdAt: string;
  goalId: string;
  relatedGoal: string;
  uploadedBy: { id: string; employeeId: string; name: string };
}

export interface PdpRecord {
  id: string;
  status: string;
  displayStatus: string;
  bucket?: string;
  hrReviewStatus?: string;
  progressPercent?: number;
  daysRemaining?: number | null;
  summary: string | null;
  employee: {
    id: string;
    employeeId: string;
    name: string;
    jobTitle: string | null;
    department: { id: string; name: string } | null;
  };
  supervisor: { id: string; employeeId: string; name: string } | null;
  cycle: { id: string; name: string; status: string; startDate?: string; endDate?: string };
  batch: { id: string; name: string; batchNumber: number };
  goalCount: number;
  minGoals: number;
  canSubmitGoals: boolean;
  employeeAgreedAt: string | null;
  hrReviewedAt: string | null;
  assignedAt: string | null;
  employeeChangeRequest: string | null;
  hrChangeRequest: string | null;
  redirectedReason: string | null;
  disagreementMeeting: {
    id: string;
    title: string;
    status: string;
    scheduledAt: string;
    location: string | null;
  } | null;
  goals: PdpGoal[];
  evidence?: PdpEvidence[];
  comments: Array<{
    id: string;
    kind: string;
    message: string;
    createdAt: string;
    author: { id: string; employeeId: string; name: string; role: string };
  }>;
  createdAt?: string;
  updatedAt?: string;
  actions: {
    canEdit: boolean;
    canSubmit: boolean;
    canAssign: boolean;
    canEmployeeReview: boolean;
    canHrReview: boolean;
    canRedirect: boolean;
    canUpdateProgress?: boolean;
    canUploadEvidence?: boolean;
  };
}

export type GoalDraft = {
  title: string;
  objective: string;
  developmentArea: string;
  expectedOutcome: string;
  startDate: string;
  dueDate: string;
  measurementKpi: string;
};

export const emptyGoal = (): GoalDraft => ({
  title: "",
  objective: "",
  developmentArea: "",
  expectedOutcome: "",
  startDate: "",
  dueDate: "",
  measurementKpi: "",
});
