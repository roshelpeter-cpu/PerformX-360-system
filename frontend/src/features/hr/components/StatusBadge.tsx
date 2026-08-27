// Status Badge
// Shared status labels for Appraisal Cycles and Meeting Management.
import { cn } from "@/lib/utils";
import type { AppraisalBatchStatus, AppraisalCycleStatus } from "@/features/hr/types";

const cycleStyles: Record<string, string> = {
  DRAFT: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200",
  UPCOMING: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200",
  ACTIVE: "bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200",
  COMPLETED: "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
  ARCHIVED: "bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300",
  UNASSIGNED: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
  SCHEDULED: "bg-amber-400 text-stone-950",
  CONFIRMED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
  REQUESTED: "border border-amber-400 bg-transparent text-amber-800 dark:text-amber-200",
  PENDING: "bg-orange-50 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200",
  ACCEPTED: "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
  REJECTED: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300",
  UNDER_REVIEW: "bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  RESCHEDULE_REQUESTED: "bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-200",
  RESCHEDULED: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200",
  CANCELLED: "bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300",
};

const batchStyles: Record<AppraisalBatchStatus, string> = {
  UPCOMING: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
  ONGOING: "bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200",
  FINISHED: "bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300",
};

const labels: Record<string, string> = {
  DRAFT: "Draft",
  UPCOMING: "Upcoming",
  ACTIVE: "Active",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
  ONGOING: "Ongoing",
  FINISHED: "Finished",
  UNASSIGNED: "Unassigned",
  COMPLETE: "Assigned",
  PARTIAL: "Partial",
  SCHEDULED: "Scheduled",
  CONFIRMED: "Confirmed",
  REQUESTED: "Requested",
  PENDING: "Pending Response",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  UNDER_REVIEW: "Under HR Review",
  APPROVED: "Approved",
  RESCHEDULE_REQUESTED: "Reschedule Requested",
  RESCHEDULED: "Rescheduled",
  CANCELLED: "Cancelled",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const style =
    cycleStyles[status] ??
    batchStyles[status as AppraisalBatchStatus] ??
    "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium tracking-wide",
        style,
        className
      )}
    >
      {labels[status] ?? status}
    </span>
  );
}

export function cycleStatusLabel(status: AppraisalCycleStatus | string) {
  return labels[status] ?? status;
}
