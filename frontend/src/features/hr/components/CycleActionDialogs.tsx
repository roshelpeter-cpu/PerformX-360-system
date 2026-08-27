// Appraisal cycle action dialogs
// Confirm, activate, complete, and delete-draft flows. Delete is only
// offered for true DRAFT cycles.

import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  useActivateCycle,
  useActivationReadiness,
  useCompleteCycle,
  useConfirmCycle,
  useDeleteCycle,
} from "@/features/hr/hooks/useAppraisalCycles";
import type { AppraisalCycle } from "@/features/hr/types";

export function ConfirmCycleDialog({
  cycle,
  open,
  onClose,
}: {
  cycle: AppraisalCycle;
  open: boolean;
  onClose: () => void;
}) {
  const confirmCycle = useConfirmCycle();
  const summary = cycle.summary;
  const incomplete =
    summary.employeesWithoutBatch > 0 || summary.employeesWithoutSupervisor > 0;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Confirm cycle"
      description="Cycle confirmed. This cycle is ready to be activated."
    >
      <div className="space-y-3 text-sm">
        <p className="font-medium">{cycle.name}</p>
        <p>3 batches · {summary.totalAssignableEmployees} employees</p>
        {incomplete ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-500/40 dark:bg-amber-400/10">
            <p>
              {summary.employeesWithoutBatch} employees have no batch.{" "}
              {summary.employeesWithoutSupervisor} employees have no supervisor.
            </p>
            <p className="mt-1 text-xs">
              Confirming is allowed. Activation will be blocked until assignments are complete.
            </p>
          </div>
        ) : (
          <p>All required assignments are currently complete.</p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={confirmCycle.isPending}
            onClick={async () => {
              await confirmCycle.mutateAsync(cycle.id);
              onClose();
            }}
          >
            {confirmCycle.isPending ? "Confirming…" : "Confirm cycle"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export function ActivateCycleDialog({
  cycle,
  open,
  onClose,
}: {
  cycle: AppraisalCycle;
  open: boolean;
  onClose: () => void;
}) {
  const activateCycle = useActivateCycle();
  const readiness = useActivationReadiness(cycle.id, open);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Activate ${cycle.name}?`}
      description="The cycle will become ACTIVE. Only one active cycle is allowed."
    >
      {readiness.isLoading ? (
        <p className="text-sm text-stone-500">Checking readiness…</p>
      ) : readiness.data && !readiness.data.canActivate ? (
        <div className="space-y-3 text-sm">
          <p className="font-medium">Cannot activate cycle.</p>
          <ul className="list-disc space-y-1 pl-5 text-stone-600 dark:text-stone-300">
            {readiness.data.errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
          <p>
            {readiness.data.missingBatch.length} employees have no batch.{" "}
            {readiness.data.missingSupervisor.length} employees have no supervisor.
          </p>
          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={onClose}>
              Review assignments
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 text-sm">
          <p>All required batch and supervisor assignments are complete.</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={activateCycle.isPending || !readiness.data?.canActivate}
              onClick={async () => {
                await activateCycle.mutateAsync(cycle.id);
                onClose();
              }}
            >
              {activateCycle.isPending ? "Activating…" : "Activate cycle"}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

export function CompleteCycleDialog({
  cycle,
  open,
  onClose,
}: {
  cycle: AppraisalCycle;
  open: boolean;
  onClose: () => void;
}) {
  const completeCycle = useCompleteCycle();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Complete cycle"
      description="Completing this appraisal cycle will make it historical and read-only."
    >
      <div className="space-y-3 text-sm">
        <p>{cycle.name}</p>
        <p>
          Batches: {cycle.batches.length} · Employees:{" "}
          {cycle.summary.totalEmployeesAssigned} · Supervisors:{" "}
          {cycle.summary.supervisorCount}
        </p>
        <p className="text-stone-500">
          Cycle configuration, employee assignments, supervisor assignments and
          batch information will become read-only.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={completeCycle.isPending}
            onClick={async () => {
              await completeCycle.mutateAsync(cycle.id);
              onClose();
            }}
          >
            {completeCycle.isPending ? "Completing…" : "Complete cycle"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

export function DeleteDraftCycleDialog({
  cycle,
  open,
  onClose,
  onDeleted,
}: {
  cycle: AppraisalCycle;
  open: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const deleteCycle = useDeleteCycle();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Delete draft cycle"
      description="This permanently removes the draft cycle and its draft-only configuration from the database."
    >
      <div className="space-y-3 text-sm">
        <p className="font-medium">{cycle.name}</p>
        <p>
          Only Draft cycles can be deleted. Confirmed, active, completed, or closed
          cycles cannot be deleted.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Keep cycle
          </Button>
          <Button
            type="button"
            className="bg-red-700 text-white hover:bg-red-800 dark:bg-red-700 dark:text-white dark:hover:bg-red-600"
            disabled={deleteCycle.isPending}
            onClick={async () => {
              await deleteCycle.mutateAsync(cycle.id);
              onClose();
              onDeleted?.();
            }}
          >
            {deleteCycle.isPending ? "Deleting…" : "Delete draft"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
