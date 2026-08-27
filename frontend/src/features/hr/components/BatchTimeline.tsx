import { cn } from "@/lib/utils";
import type { AppraisalBatch } from "@/features/hr/types";
import { formatDate } from "@/features/hr/utils/dates";

export function BatchTimeline({ batch }: { batch: AppraisalBatch }) {
  const status = batch.status;
  const steps = [
    { key: "start", label: "Start", date: batch.startDate, active: true },
    {
      key: "mid",
      label: status === "FINISHED" ? "Finished" : "Ongoing",
      date: status === "UPCOMING" ? null : status === "FINISHED" ? batch.endDate : "Current",
      active: status !== "UPCOMING",
    },
    {
      key: "end",
      label: "End",
      date: batch.endDate,
      active: status === "FINISHED",
    },
  ];

  return (
    <div className="flex items-center gap-2 text-xs text-stone-500">
      {steps.map((step, index) => (
        <div key={step.key} className="flex items-center gap-2">
          <div>
            <p className={cn(step.active ? "font-medium text-stone-800 dark:text-stone-200" : "")}>
              {step.label}
            </p>
            <p>{step.date === "Current" ? "Current" : formatDate(step.date)}</p>
          </div>
          {index < steps.length - 1 ? (
            <span className="text-stone-300 dark:text-stone-600">→</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}
