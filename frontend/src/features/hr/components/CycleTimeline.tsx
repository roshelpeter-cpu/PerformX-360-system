import { cn } from "@/lib/utils";
import type { AppraisalCycle } from "@/features/hr/types";
import { formatDate } from "@/features/hr/utils/dates";

const STEPS = [
  { key: "DRAFT", title: "Draft", description: "Cycle created" },
  { key: "UPCOMING", title: "Upcoming", description: "Cycle confirmed" },
  { key: "ACTIVE", title: "Active", description: "Cycle activated" },
  { key: "COMPLETED", title: "Completed", description: "Cycle finished" },
] as const;

const ORDER = ["DRAFT", "UPCOMING", "ACTIVE", "COMPLETED"] as const;

export function CycleTimeline({ cycle }: { cycle: AppraisalCycle }) {
  const currentIndex = ORDER.indexOf(cycle.status);

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
      <h2 className="text-sm font-medium text-stone-900 dark:text-stone-50">
        Cycle progress timeline
      </h2>
      <p className="mt-1 text-xs text-stone-500">
        Appraisal cycle lifecycle only. Future modules such as PDP and reviews are not shown.
      </p>
      <ol className="mt-5 grid gap-4 sm:grid-cols-4">
        {STEPS.map((step, index) => {
          const reached = index <= currentIndex;
          const current = index === currentIndex;
          const date =
            step.key === "DRAFT"
              ? cycle.createdAt
              : step.key === "UPCOMING"
                ? cycle.confirmedAt
                : step.key === "ACTIVE"
                  ? cycle.activatedAt
                  : cycle.completedAt;

          return (
            <li key={step.key} className="relative">
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "mt-0.5 flex h-3 w-3 shrink-0 rounded-full",
                    reached ? "bg-amber-500" : "bg-stone-300 dark:bg-stone-600",
                    current && "ring-4 ring-amber-200 dark:ring-amber-500/20"
                  )}
                />
                <div>
                  <p className={cn("text-sm", reached ? "font-medium" : "text-stone-500")}>
                    {step.title}
                  </p>
                  <p className="text-xs text-stone-500">{step.description}</p>
                  <p className="mt-1 text-xs text-stone-400">
                    {date ? formatDate(date) : current ? "Current" : "—"}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
