// Status Badge
// Shared status labels for Appraisal Cycles and Meeting Management.
import { cn } from "@/lib/utils";
import type { AppraisalBatchStatus, AppraisalCycleStatus } from "@/features/hr/types";

const cycleStyles: Record<string, string> = {
  DRAFT: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200",
  UPCOMING: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200",
  ACTIVE: "bg-amber-100 text-amber-900 dark:bg-amber-400/20 dark:text-amber-200",
  COMPLETED: "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
  NOT_STARTED: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
  IN_PROGRESS: "bg-sky-50 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200",
  UNDER_REVIEW: "bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  ARCHIVED: "bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300",
  UNASSIGNED: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
  ASSIGNED: "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
  COMPLETE: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
  PARTIAL: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
  SUBMITTED: "bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200",
  PENDING_HR_REVIEW: "bg-orange-50 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200",
  PENDING_EMPLOYEE_REVIEW: "bg-orange-50 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200",
  CHANGES_REQUESTED_BY_HR: "bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-200",
  CHANGES_REQUESTED_BY_EMPLOYEE: "bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-200",
  UNDER_SUPERVISOR_REVISION: "bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  PENDING_HR_INTERVENTION: "bg-orange-50 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200",
  READY_FOR_ASSIGNMENT: "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
  SCHEDULED: "bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  CONFIRMED: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
  REQUESTED: "border border-amber-400 bg-transparent text-amber-800 dark:text-amber-200",
  PENDING: "bg-orange-50 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200",
  ACCEPTED: "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
  APPROVED: "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
  REJECTED: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300",
  RESCHEDULE_REQUESTED: "bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-200",
  RESCHEDULED: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200",
  SELF_REVIEW_PENDING: "bg-sky-50 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200",
  PEER_REVIEW_PENDING: "bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  SUPERVISOR_REVIEW_PENDING: "bg-orange-50 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200",
  WAITING_HR_REVIEW: "bg-orange-50 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200",
  REQUIRED: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300",
  DISCUSSION_PENDING: "bg-orange-50 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200",
  FAILED: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300",
  SHORTLISTED: "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
  RECOMMENDED: "bg-amber-50 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200",
  NOT_SELECTED: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
  RESPONDED: "bg-emerald-50 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200",
  CLOSED: "bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-300",
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
  ASSIGNED: "Assigned",
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
  READY_FOR_ASSIGNMENT: "Approved",
  SUBMITTED: "Waiting for Employee Approval",
  PENDING_HR_REVIEW: "Waiting for HR Approval",
  PENDING_EMPLOYEE_REVIEW: "Waiting for Employee Approval",
  CHANGES_REQUESTED_BY_HR: "HR Changes Requested",
  CHANGES_REQUESTED_BY_EMPLOYEE: "Changes Requested",
  UNDER_SUPERVISOR_REVISION: "Changes Requested",
  PENDING_HR_INTERVENTION: "Waiting for HR Approval",
  PLANNING_MEETING: "Planning Meeting",
  PDP_CREATION: "PDP Creation",
  PDP_APPROVED: "PDP Approved",
  PROGRESS_PERIOD: "Appraisal Period",
  SELF_REVIEW: "Self Review",
  PEER_REVIEW: "Peer Review",
  SUPERVISOR_REVIEW: "Supervisor Review",
  HR_EVALUATION: "HR Evaluation",
  RECOGNITION_PIP: "Results / PIP",
  CLOSURE: "Closed",
  CONFIGURATION: "Configuration",
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  SELF_REVIEW_PENDING: "Self Review Pending",
  PEER_REVIEW_PENDING: "Peer Review Pending",
  SUPERVISOR_REVIEW_PENDING: "Supervisor Review Pending",
  WAITING_HR_REVIEW: "Waiting HR Review",
  RECOMMENDED: "Recommended",
  SHORTLISTED: "Shortlisted",
  NOT_SELECTED: "Not Selected",
  REQUIRED: "PIP Required",
  DISCUSSION_PENDING: "Discussion Pending",
  FAILED: "Failed",
  RESPONDED: "Responded",
  CLOSED: "Closed",
  OUTSTANDING: "Outstanding",
  EXCEEDS_EXPECTATIONS: "Exceeds Expectations",
  MEETS_EXPECTATIONS: "Meets Expectations",
  NEEDS_IMPROVEMENT: "Needs Improvement",
  PIP_REQUIRED: "PIP Required",
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
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium tracking-wide",
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
