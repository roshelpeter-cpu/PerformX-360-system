import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { StatusBadge } from "@/features/hr/components/StatusBadge";
import { CycleProgress } from "@/features/hr/components/CycleProgress";
import type { AppraisalCycle } from "@/features/hr/types";
import { formatDate } from "@/features/hr/utils/dates";
import { getCycleBatches } from "@/features/hr/utils/cycle-progress";

interface Props {
  cycle: AppraisalCycle;
}

export default function ActiveCycleSummaryCard({ cycle }: Props) {
  const { summary } = cycle;
  const batches = getCycleBatches(cycle);
  const [batchIndex, setBatchIndex] = useState(0);
  const batch = batches[batchIndex] ?? batches[0];
  const assigned =
    summary.fullyAssignedCount ?? summary.totalEmployeesAssigned;
  const total = summary.totalAssignableEmployees;
  const percent =
    summary.assignmentCompletionPercent ??
    (total > 0 ? Math.round((assigned / total) * 100) : 0);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Current Cycle Overview
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-50">
              {cycle.name}
            </h2>
            <StatusBadge status={cycle.status} />
          </div>
          <p className="mt-1 text-sm text-stone-500">
            Period: {formatDate(cycle.startDate)} — {formatDate(cycle.endDate)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-stone-50 p-3 dark:bg-stone-950/50">
          <p className="text-xs text-stone-500">Batches</p>
          <p className="mt-1 text-lg font-semibold">{cycle.batches.length}</p>
        </div>
        <div className="rounded-xl bg-stone-50 p-3 dark:bg-stone-950/50">
          <p className="text-xs text-stone-500">Supervisors</p>
          <p className="mt-1 text-lg font-semibold">{summary.supervisorCount}</p>
        </div>
        <div className="col-span-2 rounded-xl bg-stone-50 p-3 dark:bg-stone-950/50">
          <p className="text-xs text-stone-500">Assigned employees</p>
          <p className="mt-1 text-lg font-semibold">
            {assigned} / {total}
          </p>
          <p className="mt-1 text-xs text-stone-500">
            Employees with a valid batch and supervisor assignment
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
            Assignment completion
          </span>
          <span className="text-sm font-bold text-stone-900 dark:text-stone-50">
            {assigned} of {total}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
          <div
            className="h-full rounded-full bg-amber-500 transition-all duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
            Batch timeline
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-stone-200 text-stone-600 disabled:opacity-40 dark:border-stone-700"
              disabled={batchIndex === 0}
              onClick={() => setBatchIndex((value) => Math.max(0, value - 1))}
              aria-label="Previous batch"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-16 text-center text-xs font-medium text-stone-600 dark:text-stone-300">
              {batch ? `Batch ${batch.batchNumber}` : "—"}
            </span>
            <button
              type="button"
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-stone-200 text-stone-600 disabled:opacity-40 dark:border-stone-700"
              disabled={batchIndex >= batches.length - 1}
              onClick={() => setBatchIndex((value) => Math.min(batches.length - 1, value + 1))}
              aria-label="Next batch"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
        {batch ? (
          <div key={batch.id} className="max-h-72 overflow-y-auto pr-1 animate-[fadeSlide_280ms_ease]">
            <CycleProgress batch={batch} compact />
          </div>
        ) : (
          <p className="text-sm text-stone-500">No batches yet.</p>
        )}
      </div>

      <Link
        to={`/hr/appraisal-cycles/${cycle.id}`}
        className="mt-5 inline-flex h-9 w-full items-center justify-center rounded-lg bg-stone-900 px-4 text-sm font-medium text-white transition-colors hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-950 dark:hover:bg-white"
      >
        View Cycle Details
      </Link>
    </div>
  );
}
