import { useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useChangeSupervisor,
  useEligibleSupervisors,
} from "@/features/hr/hooks/useAppraisalCycles";
import type { CycleEmployeeRow } from "@/features/hr/types";
import { getBatchDisplayName } from "@/features/hr/utils/dates";
import { fieldClass } from "@/features/hr/components/ActionMenu";

interface Props {
  open: boolean;
  onClose: () => void;
  cycleId: string;
  employee: CycleEmployeeRow | null;
  readOnly?: boolean;
}

export default function ChangeSupervisorDialog({
  open,
  onClose,
  cycleId,
  employee,
  readOnly = false,
}: Props) {
  const changeSupervisor = useChangeSupervisor(cycleId);
  const eligible = useEligibleSupervisors(cycleId, employee?.id, open);
  const isReassignment = Boolean(employee?.supervisor);
  const [newSupervisorId, setNewSupervisorId] = useState("");
  const [reason, setReason] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [file, setFile] = useState<File | null>(null);
  const [review, setReview] = useState(false);

  if (!employee) return null;

  const currentEmployee = employee;
  const options = (eligible.data ?? []).filter(
    (supervisor) => supervisor.id !== currentEmployee.supervisor?.id
  );
  const selected = options.find((supervisor) => supervisor.id === newSupervisorId);

  async function submit() {
    if (readOnly || !selected) return;
    await changeSupervisor.mutateAsync({
      employeeId: currentEmployee.id,
      payload: {
        newSupervisorId: selected.id,
        reason: reason.trim() || undefined,
        effectiveDate: effectiveDate || undefined,
        evidenceFile: file,
      },
    });
    onClose();
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isReassignment ? "Reassign supervisor" : "Assign supervisor"}
      description="Only supervisors in the employee's department are listed. The previous assignment is kept in history."
    >
      {!review ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700">
            <p>
              {currentEmployee.name} · {currentEmployee.employeeId}
            </p>
            <p className="text-stone-500">
              {currentEmployee.department?.name ?? "No department"}
            </p>
            <p>
              Current supervisor:{" "}
              {currentEmployee.supervisor ? currentEmployee.supervisor.name : "Not assigned"}
            </p>
            <p>
              Current batch:{" "}
              {currentEmployee.batch ? getBatchDisplayName(currentEmployee.batch) : "Not assigned"}
            </p>
          </div>
          <div className="space-y-1">
            <Label>New supervisor</Label>
            <select
              className={fieldClass}
              value={newSupervisorId}
              disabled={readOnly || eligible.isLoading}
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
            <>
              <div className="space-y-1">
                <Label>Reason</Label>
                <textarea
                  className="min-h-20 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950"
                  value={reason}
                  disabled={readOnly}
                  onChange={(event) => setReason(event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Supporting evidence</Label>
                <Input
                  type="file"
                  disabled={readOnly}
                  onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                />
              </div>
              <div className="space-y-1">
                <Label>Effective date</Label>
                <Input
                  type="date"
                  value={effectiveDate}
                  disabled={readOnly}
                  onChange={(event) => setEffectiveDate(event.target.value)}
                />
              </div>
            </>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                readOnly ||
                !newSupervisorId ||
                (isReassignment && !reason.trim())
              }
              onClick={() => (isReassignment ? setReview(true) : submit())}
            >
              {isReassignment ? "Review change" : "Confirm assignment"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 text-sm">
          <p>
            {currentEmployee.name} will move from{" "}
            {currentEmployee.supervisor?.name ?? "Not assigned"} to {selected?.name}.
          </p>
          <p>Reason: {reason}</p>
          <p>Effective date: {effectiveDate || "Immediate"}</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setReview(false)}>
              Back
            </Button>
            <Button
              type="button"
              disabled={changeSupervisor.isPending}
              onClick={submit}
            >
              {changeSupervisor.isPending ? "Saving…" : "Confirm change"}
            </Button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
