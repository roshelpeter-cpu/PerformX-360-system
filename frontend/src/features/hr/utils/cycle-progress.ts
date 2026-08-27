// Appraisal Cycle progress helpers
// Maps batch workflow stages to the HR timeline used on cycle pages.
import type { AppraisalBatch, AppraisalCycle, BatchTimelineStage } from "@/features/hr/types";

export const BATCH_STAGE_FALLBACK: BatchTimelineStage[] = [
  {
    id: "CONFIGURATION",
    title: "Cycle & Batch Configuration",
    description: "HR configures the cycle, batches, and employee assignments.",
    status: "current",
    date: null,
    progress: 20,
  },
  {
    id: "PLANNING_MEETING",
    title: "Planning Meeting",
    description: "Performance planning meetings for this batch.",
    status: "pending",
    date: null,
    progress: 0,
  },
  {
    id: "PDP_CREATION",
    title: "PDP Creation",
    description: "Supervisors create Personal Development Plans.",
    status: "pending",
    date: null,
    progress: 0,
  },
  {
    id: "PDP_APPROVED",
    title: "PDP Approved",
    description: "PDPs for this batch have been approved.",
    status: "pending",
    date: null,
    progress: 0,
  },
  {
    id: "PROGRESS_PERIOD",
    title: "Progress Period",
    description: "Employees work against the approved PDP.",
    status: "pending",
    date: null,
    progress: 0,
  },
  {
    id: "SELF_REVIEW",
    title: "Self Review Period",
    description: "Self-review window for this batch.",
    status: "pending",
    date: null,
    progress: 0,
  },
  {
    id: "PEER_REVIEW",
    title: "Peer Review Period",
    description: "Peer-review window for this batch.",
    status: "pending",
    date: null,
    progress: 0,
  },
  {
    id: "SUPERVISOR_REVIEW",
    title: "Supervisor Review Period",
    description: "Supervisor-review window for this batch.",
    status: "pending",
    date: null,
    progress: 0,
  },
  {
    id: "HR_EVALUATION",
    title: "HR Evaluation Period",
    description: "Final score calculation and HR evaluation.",
    status: "pending",
    date: null,
    progress: 0,
  },
  {
    id: "RECOGNITION_PIP",
    title: "Recognition & PIP Period",
    description: "Recognition or PIP work after final approval.",
    status: "pending",
    date: null,
    progress: 0,
  },
  {
    id: "CLOSURE",
    title: "Closure",
    description: "HR has closed this batch.",
    status: "pending",
    date: null,
    progress: 0,
  },
];

export function getCycleBatches(cycle: AppraisalCycle): AppraisalBatch[] {
  const batches = cycle.summary?.batches?.length ? cycle.summary.batches : cycle.batches;
  return [...batches].sort((a, b) => a.batchNumber - b.batchNumber);
}

export function getBatchWorkflowStages(batch: AppraisalBatch): BatchTimelineStage[] {
  if (batch.timeline?.stages?.length) return batch.timeline.stages;
  return BATCH_STAGE_FALLBACK.map((stage, index) => ({
    ...stage,
    status: index === 0 ? "current" : "pending",
  }));
}

export function getBatchCurrentStageLabel(batch: AppraisalBatch) {
  return (
    batch.currentStageLabel ??
    batch.timeline?.currentStageLabel ??
    getBatchWorkflowStages(batch).find((stage) => stage.status === "current")?.title ??
    "Cycle & Batch Configuration"
  );
}

export function getCurrentWorkflowStageLabel(cycle: AppraisalCycle) {
  const batches = getCycleBatches(cycle);
  if (batches[0]) return getBatchCurrentStageLabel(batches[0]);
  return "Cycle & Batch Configuration";
}
