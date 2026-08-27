import { cn } from "@/lib/utils";
import { formatDate } from "@/features/hr/utils/dates";

export interface TimelineStageView {
  id: string;
  title: string;
  description: string;
  status: "completed" | "current" | "pending";
  date?: string | null;
}

export function AppraisalTimelineCard({
  currentStageLabel,
  stages,
  compact = false,
}: {
  currentStageLabel: string;
  stages: TimelineStageView[];
  compact?: boolean;
}) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
            Appraisal timeline
          </p>
          <h2 className="mt-1 text-base font-semibold text-stone-900 dark:text-white">
            Current stage: {currentStageLabel}
          </h2>
        </div>
      </div>
      <ol className={cn("relative mt-5 space-y-4", compact && "space-y-3")}>
        <div className="absolute left-[15px] top-2 bottom-2 w-px bg-stone-200 dark:bg-stone-800" />
        {stages.map((stage) => {
          const done = stage.status === "completed";
          const current = stage.status === "current";
          return (
            <li key={stage.id} className="relative flex gap-3 pl-1">
              <span
                className={cn(
                  "relative z-10 mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full ring-4 ring-white dark:ring-stone-900",
                  done
                    ? "bg-amber-500"
                    : current
                      ? "bg-amber-100 ring-amber-200 dark:bg-amber-400 dark:ring-amber-900/40"
                      : "bg-stone-200 dark:bg-stone-700"
                )}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      done || current
                        ? "text-stone-900 dark:text-stone-100"
                        : "text-stone-400"
                    )}
                  >
                    {stage.title}
                  </p>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-medium",
                      done
                        ? "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
                        : current
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"
                          : "bg-stone-50 text-stone-400 dark:bg-stone-950"
                    )}
                  >
                    {done ? "Completed" : current ? "Current" : "Upcoming"}
                  </span>
                </div>
                {!compact ? (
                  <p className="mt-0.5 text-xs text-stone-500">{stage.description}</p>
                ) : null}
                {stage.date ? (
                  <p className="mt-0.5 text-xs text-stone-400">{formatDate(stage.date)}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
