import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { fieldClass } from "@/features/hr/components/ActionMenu";
import {
  useEligibleWorkforceSupervisors,
  useReassignSupervisor,
} from "@/features/employees/hooks/useEmployees";
import type { WorkforceEmployee } from "@/features/employees/types";
import { OverlayModal } from "./OverlayModal";

interface Props {
  open: boolean;
  employee: WorkforceEmployee | null;
  onClose: () => void;
}

export default function ChangeSupervisorModal({ open, employee, onClose }: Props) {
  const eligible = useEligibleWorkforceSupervisors(employee?.id, open);
  const reassign = useReassignSupervisor();
  const isReassignment = Boolean(employee?.supervisor);
  const [newSupervisorId, setNewSupervisorId] = useState("");
  const [reason, setReason] = useState("");

  if (!employee) return null;
  const currentEmployee = employee;

  const options = (eligible.data ?? []).filter(
    (supervisor) => supervisor.id !== currentEmployee.supervisor?.id
  );
  const selected = options.find((supervisor) => supervisor.id === newSupervisorId);

  async function submit() {
    if (!selected) return;
    await reassign.mutateAsync({
      employeeId: currentEmployee.id,
      payload: {
        newSupervisorId: selected.id,
        reason: reason.trim() || undefined,
      },
    });
    setNewSupervisorId("");
    setReason("");
    onClose();
  }

  return (
    <OverlayModal
      open={open}
      title={isReassignment ? "Change Supervisor" : "Assign Supervisor"}
      subtitle={`${currentEmployee.name} · ${currentEmployee.employeeId}`}
      onClose={onClose}
    >
      <div className="space-y-4 text-sm">
        <div className="rounded-xl border border-stone-200 px-3 py-3 dark:border-stone-700">
          <p className="text-stone-500">Current supervisor</p>
          <p className="mt-1 font-medium text-stone-900 dark:text-stone-100">
            {currentEmployee.supervisor?.name ?? "Not assigned"}
          </p>
          <p className="mt-2 text-stone-500">
            Department: {currentEmployee.department?.name ?? "—"}
          </p>
        </div>
        <div className="space-y-1">
          <Label>New supervisor</Label>
          <select
            className={fieldClass}
            value={newSupervisorId}
            disabled={eligible.isLoading}
            onChange={(event) => setNewSupervisorId(event.target.value)}
          >
            <option value="">Select supervisor</option>
            {options.map((supervisor) => (
              <option key={supervisor.id} value={supervisor.id}>
                {supervisor.name} ({supervisor.employeeId})
              </option>
            ))}
          </select>
          {!eligible.isLoading && options.length === 0 ? (
            <p className="text-xs text-stone-500">
              No other supervisors are available in this department.
            </p>
          ) : null}
        </div>
        {isReassignment ? (
          <div className="space-y-1">
            <Label>Reason</Label>
            <textarea
              className="min-h-20 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            disabled={
              !newSupervisorId ||
              (isReassignment && !reason.trim()) ||
              reassign.isPending
            }
            onClick={submit}
          >
            {reassign.isPending ? "Saving…" : "Save assignment"}
          </Button>
        </div>
      </div>
    </OverlayModal>
  );
}
