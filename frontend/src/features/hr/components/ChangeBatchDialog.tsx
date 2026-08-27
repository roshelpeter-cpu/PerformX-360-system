import { useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useChangeBatch } from "@/features/hr/hooks/useAppraisalCycles";
import type { AppraisalBatch, CycleEmployeeRow } from "@/features/hr/types";
import { getBatchDisplayName, hasBatchStarted } from "@/features/hr/utils/dates";
import { fieldClass } from "@/features/hr/components/ActionMenu";

interface Props {
  open: boolean;
  onClose: () => void;
  cycleId: string;
  employee: CycleEmployeeRow | null;
  batches: AppraisalBatch[];
  readOnly?: boolean;
}

export default function ChangeBatchDialog({
  open,
  onClose,
  cycleId,
  employee,
  batches,
  readOnly = false,
}: Props) {
  const changeBatch = useChangeBatch(cycleId);
  const isReassignment = Boolean(employee?.batch);
  const [newBatchId, setNewBatchId] = useState("");
  const [reason, setReason] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(
    () => new Date().toISOString().slice(0, 10)
  );
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<"form" | "review" | "started">("form");

  if (!employee) return null;

  const currentEmployee = employee;
  const options = batches.filter((batch) => batch.id !== currentEmployee.batch?.id);
  const selected = batches.find((batch) => batch.id === newBatchId);
  const started = selected ? hasBatchStarted(selected.startDate) : false;

  async function submit(acknowledgeStarted = false) {
    if (readOnly || !selected) return;
    await changeBatch.mutateAsync({
      employeeId: currentEmployee.id,
      payload: {
        newBatchId: selected.id,
        reason: reason.trim() || undefined,
        effectiveDate: effectiveDate || undefined,
        acknowledgeStarted,
        evidenceFile: file,
      },
    });
    onClose();
  }

  function continueFromForm() {
    if (!newBatchId) return;
    if (isReassignment && !reason.trim()) return;
    if (started) {
      setStep("started");
      return;
    }
    setStep("review");
  }

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isReassignment ? "Reassign appraisal batch" : "Assign batch"}
      description="The current assignment is preserved in history."
    >
      {step === "form" ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-stone-200 px-3 py-2 text-sm dark:border-stone-700">
            <p>
              {currentEmployee.name} · {currentEmployee.employeeId}
            </p>
            <p className="text-stone-500">
              {currentEmployee.department?.name ?? "No department"}
            </p>
            <p className="mt-1">
              Current batch:{" "}
              {currentEmployee.batch ? getBatchDisplayName(currentEmployee.batch) : "Not assigned"}
            </p>
          </div>
          <div className="space-y-1">
            <Label>New batch</Label>
            <select
              className={fieldClass}
              value={newBatchId}
              disabled={readOnly}
              onChange={(event) => setNewBatchId(event.target.value)}
            >
              <option value="">Select batch</option>
              {options.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {getBatchDisplayName(batch)}
                </option>
              ))}
            </select>
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
              disabled={readOnly || !newBatchId || (isReassignment && !reason.trim())}
              onClick={continueFromForm}
            >
              {isReassignment ? "Review change" : "Confirm assignment"}
            </Button>
          </div>
        </div>
      ) : null}

      {step === "started" ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-500/40 dark:bg-amber-400/10">
            <p className="font-medium">This batch has already started.</p>
            <p className="mt-1">
              Adding this employee may require an exceptional assignment.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={changeBatch.isPending}
              onClick={() => submit(true)}
            >
              Confirm assignment anyway
            </Button>
          </div>
        </div>
      ) : null}

      {step === "review" ? (
        <div className="space-y-4 text-sm">
          <p>
            {currentEmployee.name} will move from{" "}
            {currentEmployee.batch ? getBatchDisplayName(currentEmployee.batch) : "Not assigned"} to{" "}
            {selected ? getBatchDisplayName(selected) : "—"}.
          </p>
          {reason ? <p>Reason: {reason}</p> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setStep("form")}>
              Back
            </Button>
            <Button
              type="button"
              disabled={changeBatch.isPending}
              onClick={() => submit(false)}
            >
              {changeBatch.isPending ? "Saving…" : "Confirm change"}
            </Button>
          </div>
        </div>
      ) : null}
    </Drawer>
  );
}
