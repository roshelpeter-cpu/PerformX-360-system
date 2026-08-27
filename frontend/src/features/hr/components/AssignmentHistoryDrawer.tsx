// Appraisal Cycle assignment history
// Shows batch and supervisor change history for an employee in a cycle.
import { Drawer } from "@/components/ui/drawer";
import { useAssignmentHistory } from "@/features/hr/hooks/useAppraisalCycles";
import { formatDateTime } from "@/features/hr/utils/dates";

export function AssignmentHistoryDrawer({
  open,
  onClose,
  cycleId,
  employeeId,
  employeeName,
}: {
  open: boolean;
  onClose: () => void;
  cycleId: string;
  employeeId?: string;
  employeeName?: string;
}) {
  const query = useAssignmentHistory(cycleId, {
    employeeId,
    page: 1,
    pageSize: 20,
  });
  const entries = query.data?.entries ?? [];

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Assignment history"
      description={
        employeeName
          ? `Batch and supervisor changes for ${employeeName}.`
          : "Batch and supervisor changes in this cycle."
      }
    >
      {query.isLoading ? (
        <p className="text-sm text-stone-500">Loading history…</p>
      ) : entries.length === 0 ? (
        <p className="text-sm text-stone-500">No assignment changes recorded.</p>
      ) : (
        <div className="space-y-3">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl border border-stone-200 p-3 text-sm dark:border-stone-700"
            >
              <p className="font-medium text-stone-900 dark:text-stone-100">
                {entry.changeType === "BATCH"
                  ? "Batch reassignment"
                  : "Supervisor reassignment"}
              </p>
              <p className="mt-1 text-stone-600 dark:text-stone-300">
                {entry.previousLabel} → {entry.newLabel}
              </p>
              <p className="mt-1 text-xs text-stone-500">{entry.reason}</p>
              <p className="mt-2 text-xs text-stone-400">
                {formatDateTime(entry.changedAt)} · {entry.changedBy.name}
              </p>
            </div>
          ))}
        </div>
      )}
    </Drawer>
  );
}
