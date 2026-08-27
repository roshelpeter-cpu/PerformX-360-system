import {
  AppraisalCycleStatus,
  BatchWorkflowStage,
  MeetingStatus,
  MeetingType,
  PdpStatus,
} from "../../generated/prisma/client.js";

export const BATCH_STAGE_DEFINITIONS = [
  {
    id: BatchWorkflowStage.CONFIGURATION,
    title: "Cycle & Batch Configuration",
    description: "HR configures the cycle, batches, and employee assignments.",
  },
  {
    id: BatchWorkflowStage.PLANNING_MEETING,
    title: "Planning Meeting",
    description: "HR, supervisor, and employee complete the performance planning meeting.",
  },
  {
    id: BatchWorkflowStage.PDP_CREATION,
    title: "PDP Creation",
    description: "Supervisors create Personal Development Plans for employees in this batch.",
  },
  {
    id: BatchWorkflowStage.PDP_APPROVED,
    title: "PDP Approved",
    description: "PDPs for employees in this batch have been approved.",
  },
  {
    id: BatchWorkflowStage.PROGRESS_PERIOD,
    title: "Progress Period",
    description: "Employees work against the approved PDP during the progress window.",
  },
  {
    id: BatchWorkflowStage.SELF_REVIEW,
    title: "Self Review Period",
    description: "HR has opened the self-review window for this batch.",
  },
  {
    id: BatchWorkflowStage.PEER_REVIEW,
    title: "Peer Review Period",
    description: "HR has opened the peer-review window for this batch.",
  },
  {
    id: BatchWorkflowStage.SUPERVISOR_REVIEW,
    title: "Supervisor Review Period",
    description: "HR has opened the supervisor-review window for this batch.",
  },
  {
    id: BatchWorkflowStage.HR_EVALUATION,
    title: "HR Evaluation Period",
    description: "Final scores are calculated after supervisor review is complete.",
  },
  {
    id: BatchWorkflowStage.RECOGNITION_PIP,
    title: "Recognition & PIP Period",
    description: "Final appraisal is approved and recognition or PIP work begins.",
  },
  {
    id: BatchWorkflowStage.CLOSURE,
    title: "Closure",
    description: "HR has closed this batch.",
  },
] as const;

const STAGE_ORDER = BATCH_STAGE_DEFINITIONS.map((stage) => stage.id);

export function stageIndex(stage: BatchWorkflowStage) {
  return STAGE_ORDER.indexOf(stage);
}

export interface BatchActivitySnapshot {
  cycleStatus: AppraisalCycleStatus;
  employeeCount: number;
  completedPlanningMeetings: number;
  pdpCount: number;
  approvedPdpCount: number;
  selfReviewStartedAt: Date | null;
  peerReviewStartedAt: Date | null;
  supervisorReviewStartedAt: Date | null;
  hrEvaluationStartedAt: Date | null;
  recognitionStartedAt: Date | null;
  closedAt: Date | null;
  /// Persisted batch.currentStage. Used when activity counts would otherwise
  /// keep every batch at Planning Meeting (e.g. staggered demo progress).
  storedStage?: BatchWorkflowStage | null | undefined;
}

export function deriveBatchStage(
  snapshot: BatchActivitySnapshot
): BatchWorkflowStage {
  if (
    snapshot.closedAt ||
    snapshot.cycleStatus === AppraisalCycleStatus.COMPLETED
  ) {
    return BatchWorkflowStage.CLOSURE;
  }

  let derived: BatchWorkflowStage;
  if (snapshot.recognitionStartedAt) {
    derived = BatchWorkflowStage.RECOGNITION_PIP;
  } else if (snapshot.hrEvaluationStartedAt) {
    derived = BatchWorkflowStage.HR_EVALUATION;
  } else if (snapshot.supervisorReviewStartedAt) {
    derived = BatchWorkflowStage.SUPERVISOR_REVIEW;
  } else if (snapshot.peerReviewStartedAt) {
    derived = BatchWorkflowStage.PEER_REVIEW;
  } else if (snapshot.selfReviewStartedAt) {
    derived = BatchWorkflowStage.SELF_REVIEW;
  } else {
    const allPdpsApproved =
      snapshot.employeeCount > 0 &&
      snapshot.approvedPdpCount >= snapshot.employeeCount;
    const allPdpsCreated =
      snapshot.employeeCount > 0 && snapshot.pdpCount >= snapshot.employeeCount;
    const planningComplete =
      snapshot.employeeCount > 0 &&
      snapshot.completedPlanningMeetings >= snapshot.employeeCount;

    if (allPdpsApproved) derived = BatchWorkflowStage.PROGRESS_PERIOD;
    else if (allPdpsCreated) derived = BatchWorkflowStage.PDP_APPROVED;
    else if (snapshot.pdpCount > 0 || snapshot.approvedPdpCount > 0 || planningComplete) {
      derived = BatchWorkflowStage.PDP_CREATION;
    } else if (snapshot.cycleStatus === AppraisalCycleStatus.DRAFT) {
      derived = BatchWorkflowStage.CONFIGURATION;
    } else {
      derived = BatchWorkflowStage.PLANNING_MEETING;
    }
  }

  return laterStage(derived, snapshot.storedStage);
}

function laterStage(
  derived: BatchWorkflowStage,
  stored?: BatchWorkflowStage | null
): BatchWorkflowStage {
  if (!stored) return derived;
  return stageIndex(stored) > stageIndex(derived) ? stored : derived;
}

export function buildBatchTimeline(
  snapshot: BatchActivitySnapshot,
  dates: Partial<Record<BatchWorkflowStage, Date | null>> = {}
) {
  const current = deriveBatchStage(snapshot);
  const currentIndex = stageIndex(current);
  const cycleComplete =
    snapshot.cycleStatus === AppraisalCycleStatus.COMPLETED ||
    Boolean(snapshot.closedAt);

  return {
    currentStage: cycleComplete ? BatchWorkflowStage.CLOSURE : current,
    currentStageLabel: cycleComplete
      ? (BATCH_STAGE_DEFINITIONS[stageIndex(BatchWorkflowStage.CLOSURE)]?.title ??
        "Closure")
      : BATCH_STAGE_DEFINITIONS[currentIndex]?.title ?? current,
    stages: BATCH_STAGE_DEFINITIONS.map((stage, index) => {
      let status: "completed" | "current" | "pending" = "pending";
      if (cycleComplete) {
        status = "completed";
      } else if (index < currentIndex) {
        status = "completed";
      } else if (index === currentIndex) {
        status = "current";
      }

      return {
        id: stage.id,
        title: stage.title,
        description: stage.description,
        status,
        date: dates[stage.id] ?? null,
        progress: status === "completed" ? 100 : status === "current" ? 40 : 0,
      };
    }),
  };
}

export const HR_STARTED_STAGES: BatchWorkflowStage[] = [
  BatchWorkflowStage.SELF_REVIEW,
  BatchWorkflowStage.PEER_REVIEW,
  BatchWorkflowStage.SUPERVISOR_REVIEW,
  BatchWorkflowStage.HR_EVALUATION,
  BatchWorkflowStage.RECOGNITION_PIP,
  BatchWorkflowStage.CLOSURE,
];

export const NEXT_HR_STAGE: Partial<Record<BatchWorkflowStage, BatchWorkflowStage>> = {
  [BatchWorkflowStage.PROGRESS_PERIOD]: BatchWorkflowStage.SELF_REVIEW,
  [BatchWorkflowStage.SELF_REVIEW]: BatchWorkflowStage.PEER_REVIEW,
  [BatchWorkflowStage.PEER_REVIEW]: BatchWorkflowStage.SUPERVISOR_REVIEW,
  [BatchWorkflowStage.SUPERVISOR_REVIEW]: BatchWorkflowStage.HR_EVALUATION,
  [BatchWorkflowStage.HR_EVALUATION]: BatchWorkflowStage.RECOGNITION_PIP,
  [BatchWorkflowStage.RECOGNITION_PIP]: BatchWorkflowStage.CLOSURE,
};

export { MeetingStatus, MeetingType, PdpStatus };
