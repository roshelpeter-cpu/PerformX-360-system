import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { AppraisalCycle } from "@/features/hr/types";
import { formatDate } from "@/features/hr/utils/dates";
import {
  getBatchCurrentStageLabel,
  getBatchWorkflowStages,
  getCycleBatches,
} from "@/features/hr/utils/cycle-progress";
import { useStartBatchStage } from "@/features/hr/hooks/useAppraisalCycles";

export function BatchTimelineSlider({ cycle }: { cycle: AppraisalCycle }) {
  const batches = getCycleBatches(cycle);
  const [index, setIndex] = useState(0);
  const batch = batches[index];
  const startStage = useStartBatchStage(cycle.id);

  if (!batch) {
    return (
      <p className="text-sm text-stone-500">No batches are available yet.</p>
    );
  }

  const stages = getBatchWorkflowStages(batch);
  const NEXT_STAGE = {
    PROGRESS_PERIOD: { stage: "SELF_REVIEW", label: "Start Self Review" },
    SELF_REVIEW: { stage: "PEER_REVIEW", label: "Start Peer Review" },
    PEER_REVIEW: { stage: "SUPERVISOR_REVIEW", label: "Start Supervisor Review" },
    SUPERVISOR_REVIEW: { stage: "HR_EVALUATION", label: "Start HR Evaluation" },
    HR_EVALUATION: { stage: "RECOGNITION_PIP", label: "Start Recognition & PIP" },
    RECOGNITION_PIP: { stage: "CLOSURE", label: "Close batch" },
  } as const;
  const currentStageKey = batch.currentStage ?? batch.timeline?.currentStage;
  const nextStage =
    currentStageKey && currentStageKey in NEXT_STAGE
      ? NEXT_STAGE[currentStageKey as keyof typeof NEXT_STAGE]
      : undefined;

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 text-stone-600 disabled:opacity-40 dark:border-stone-700"
          disabled={index === 0}
          onClick={() => setIndex((value) => Math.max(0, value - 1))}
          aria-label="Previous batch"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-center">
          <p className="text-xs uppercase tracking-wide text-stone-400">
            Batch {batch.batchNumber} of {batches.length}
          </p>
          <h2 className="mt-1 text-lg font-semibold">{batch.name}</h2>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            Current stage: {getBatchCurrentStageLabel(batch)}
          </p>
          {cycle.status !== "COMPLETED" && nextStage ? (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={startStage.isPending}
                onClick={() =>
                  startStage.mutate({ batchId: batch.id, stage: nextStage.stage })
                }
              >
                {nextStage.label}
              </Button>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-stone-200 text-stone-600 disabled:opacity-40 dark:border-stone-700"
          disabled={index >= batches.length - 1}
          onClick={() => setIndex((value) => Math.min(batches.length - 1, value + 1))}
          aria-label="Next batch"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div
        key={batch.id}
        className="relative mt-8 animate-[fadeSlide_280ms_ease] pl-4 sm:pl-8"
      >
        <div className="absolute left-[27px] top-4 bottom-4 w-[2px] bg-stone-100 dark:bg-stone-800 sm:left-[43px]" />
        <ul className="relative space-y-8">
          {stages.map((stage, stageIndex) => {
            const isCompleted = stage.status === "completed";
            const isCurrent = stage.status === "current";
            return (
              <li key={stage.id} className="relative flex items-start gap-6">
                <div
                  className={cn(
                    "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold shadow-sm",
                    isCompleted
                      ? "bg-amber-500 text-white"
                      : isCurrent
                        ? "bg-amber-100 text-amber-700 ring-4 ring-amber-500/20 dark:bg-amber-900/40 dark:text-amber-400"
                        : "bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-500"
                  )}
                >
                  {stageIndex + 1}
                </div>
                <div className="flex-1 rounded-xl border border-stone-100 bg-stone-50/50 p-4 dark:border-stone-800/60 dark:bg-stone-950/30">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3
                      className={cn(
                        "text-sm font-medium",
                        isCompleted || isCurrent
                          ? "text-stone-900 dark:text-stone-100"
                          : "text-stone-500"
                      )}
                    >
                      {stage.title}
                    </h3>
                    <span
                      className={cn(
                        "inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                        isCompleted
                          ? "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
                          : isCurrent
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                            : "bg-stone-50 text-stone-400"
                      )}
                    >
                      {isCompleted ? "Completed" : isCurrent ? "Current" : "Upcoming"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
                    {stage.description}
                  </p>
                  <p className="mt-2 text-xs text-stone-500">
                    {stage.date ? formatDate(stage.date) : "Date follows actual workflow activity"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function BatchStageCards({ cycle }: { cycle: AppraisalCycle }) {
  const batches = getCycleBatches(cycle);
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {batches.map((batch) => (
        <div
          key={batch.id}
          className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900"
        >
          <p className="text-xs uppercase tracking-wide text-stone-400">
            {batch.name}
          </p>
          <p className="mt-2 text-sm font-semibold text-stone-900 dark:text-stone-50">
            Current stage
          </p>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
            {getBatchCurrentStageLabel(batch)}
          </p>
        </div>
      ))}
    </div>
  );
}
