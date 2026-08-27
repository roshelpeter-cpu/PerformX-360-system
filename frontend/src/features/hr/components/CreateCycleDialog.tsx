import { useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useCreateCycle,
  useWorkforceSummary,
} from "@/features/hr/hooks/useAppraisalCycles";
import {
  addOneYearIso,
  defaultBatchStartDates,
  formatDate,
} from "@/features/hr/utils/dates";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CreateCycleDialog({ open, onClose }: Props) {
  const createCycle = useCreateCycle();
  const workforce = useWorkforceSummary();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [batches, setBatches] = useState([
    { name: "Batch 1", description: "", startDate: "" },
    { name: "Batch 2", description: "", startDate: "" },
    { name: "Batch 3", description: "", startDate: "" },
  ]);
  const [error, setError] = useState("");

  const cycleEnd = useMemo(
    () => (startDate ? addOneYearIso(startDate) : ""),
    [startDate]
  );

  function reset() {
    setStep(1);
    setName("");
    setDescription("");
    setStartDate("");
    setBatches([
      { name: "Batch 1", description: "", startDate: "" },
      { name: "Batch 2", description: "", startDate: "" },
      { name: "Batch 3", description: "", startDate: "" },
    ]);
    setError("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function applyCycleStart(value: string) {
    setStartDate(value);
    if (!value) return;
    const defaults = defaultBatchStartDates(value);
    setBatches((current) =>
      current.map((batch, index) => ({
        ...batch,
        startDate: defaults[index] ?? batch.startDate,
      }))
    );
  }

  function nextFromDetails() {
    if (!name.trim() || !startDate) {
      setError("Cycle name and a valid start date are required.");
      return;
    }
    setError("");
    setStep(2);
  }

  function nextFromBatches() {
    if (batches.some((batch) => !batch.startDate || !batch.name.trim())) {
      setError("Each of the three batches needs a name and start date.");
      return;
    }
    setError("");
    setStep(3);
  }

  async function submit(confirm: boolean) {
    await createCycle.mutateAsync({
      name: name.trim(),
      description: description.trim() || null,
      startDate,
      confirm,
      batches: batches.map((batch) => ({
        name: batch.name.trim(),
        description: batch.description.trim() || null,
        startDate: batch.startDate,
      })),
    });
    handleClose();
  }

  const totals = workforce.data;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Create Appraisal Cycle"
      description={`Step ${step} of 3`}
      className="max-w-2xl"
    >
      {step === 1 ? (
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="cycle-name">Cycle name</Label>
            <Input
              id="cycle-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="2028 Annual Appraisal"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cycle-description">Description</Label>
            <textarea
              id="cycle-description"
              className="min-h-20 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cycle-start">Start date</Label>
            <Input
              id="cycle-start"
              type="date"
              value={startDate}
              onChange={(event) => applyCycleStart(event.target.value)}
            />
          </div>
          <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950">
            <p className="text-stone-500">Calculated end date</p>
            <p className="font-medium">
              {cycleEnd ? formatDate(cycleEnd) : "Select a start date"}
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Duration is exactly one year. Initial status is Draft.
            </p>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <p className="text-sm text-stone-500">
            Exactly three batches are required. Each batch lasts one year from its
            start date and the windows may overlap.
          </p>
          {batches.map((batch, index) => (
            <div
              key={index}
              className="space-y-3 rounded-lg border border-stone-200 p-3 dark:border-stone-700"
            >
              <p className="text-sm font-medium">Batch {index + 1}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Batch name</Label>
                  <Input
                    value={batch.name}
                    onChange={(event) =>
                      setBatches((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, name: event.target.value }
                            : item
                        )
                      )
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Start date</Label>
                  <Input
                    type="date"
                    value={batch.startDate}
                    onChange={(event) =>
                      setBatches((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, startDate: event.target.value }
                            : item
                        )
                      )
                    }
                  />
                </div>
              </div>
              <p className="text-xs text-stone-500">
                End date:{" "}
                {batch.startDate
                  ? formatDate(addOneYearIso(batch.startDate))
                  : "—"}
              </p>
              <div className="space-y-1">
                <Label>Description</Label>
                <Input
                  value={batch.description}
                  onChange={(event) =>
                    setBatches((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, description: event.target.value }
                          : item
                      )
                    )
                  }
                />
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4 text-sm">
          <div className="rounded-lg border border-stone-200 p-3 dark:border-stone-700">
            <p className="font-medium">{name}</p>
            <p className="mt-1 text-stone-500">{description || "No description"}</p>
            <p className="mt-2">
              {formatDate(startDate)} — {formatDate(cycleEnd)}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {batches.map((batch, index) => (
              <div
                key={index}
                className="rounded-lg border border-stone-200 p-3 dark:border-stone-700"
              >
                <p className="font-medium">{batch.name}</p>
                <p className="text-xs text-stone-500">
                  {formatDate(batch.startDate)} —{" "}
                  {formatDate(addOneYearIso(batch.startDate))}
                </p>
              </div>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <p>Total employees: {totals?.totalAssignableEmployees ?? "—"}</p>
            <p>Supervisors: {totals?.supervisorCount ?? "—"}</p>
            <p>Employees with batch: 0</p>
            <p>Employees without batch: {totals?.totalAssignableEmployees ?? "—"}</p>
            <p>Employees with supervisor: 0</p>
            <p>Employees without supervisor: {totals?.totalAssignableEmployees ?? "—"}</p>
          </div>
          <p className="text-xs text-stone-500">
            Existing employees can be assigned after the cycle is created. Confirming
            moves the cycle to Upcoming; it will not activate automatically.
          </p>
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-5 flex justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={step === 1 ? handleClose : () => setStep((value) => value - 1)}
        >
          {step === 1 ? "Cancel" : "Back"}
        </Button>
        {step === 1 ? (
          <Button type="button" onClick={nextFromDetails}>
            Continue
          </Button>
        ) : null}
        {step === 2 ? (
          <Button type="button" onClick={nextFromBatches}>
            Review
          </Button>
        ) : null}
        {step === 3 ? (
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={createCycle.isPending}
              onClick={() => submit(false)}
            >
              Save as Draft
            </Button>
            <Button
              type="button"
              disabled={createCycle.isPending}
              onClick={() => submit(true)}
            >
              Confirm Cycle
            </Button>
          </div>
        ) : null}
      </div>
    </Dialog>
  );
}
