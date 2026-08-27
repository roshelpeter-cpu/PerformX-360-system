import { cn } from "@/lib/utils";
import type { AppraisalBatch } from "@/features/hr/types";
import { formatDate } from "@/features/hr/utils/dates";
import {
  getBatchCurrentStageLabel,
  getBatchWorkflowStages,
} from "@/features/hr/utils/cycle-progress";

export function CycleProgress({
  batch,
  compact = false,
}: {
  batch: AppraisalBatch;
  compact?: boolean;
}) {
  const stages = getBatchWorkflowStages(batch);

  return (
    <div className={compact ? "" : "mt-2"}>
      <p className="mb-4 text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
        {batch.name}: {getBatchCurrentStageLabel(batch)}
      </p>
      <div className="flex flex-col gap-4">
        {stages.map((stage, index) => {
          const isCompleted = stage.status === "completed";
          const isCurrent = stage.status === "current";

          return (
            <div key={stage.id} className="relative flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    isCompleted
                      ? "bg-amber-500 text-white"
                      : isCurrent
                        ? "bg-amber-100 text-amber-700 ring-2 ring-amber-500 dark:bg-amber-900/30 dark:text-amber-400"
                        : "bg-stone-100 text-stone-400 dark:bg-stone-800"
                  )}
                >
                  {index + 1}
                </div>
                {index < stages.length - 1 ? (
                  <div
                    className={cn(
                      "mt-1 w-0.5 flex-1 min-h-6 rounded-full",
                      isCompleted ? "bg-amber-500" : "bg-stone-100 dark:bg-stone-800"
                    )}
                  />
                ) : null}
              </div>
              <div className="pb-2">
                <p
                  className={cn(
                    "text-sm font-medium",
                    isCompleted || isCurrent
                      ? "text-stone-900 dark:text-stone-100"
                      : "text-stone-500"
                  )}
                >
                  {stage.title}
                </p>
                <p className="mt-0.5 text-xs text-stone-500">
                  {stage.date ? formatDate(stage.date) : isCurrent ? "Current" : "—"}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
