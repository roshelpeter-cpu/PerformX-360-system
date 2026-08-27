import { Link } from "react-router-dom";
import { Users, UserCircle2 } from "lucide-react";
import { StatusBadge } from "@/features/hr/components/StatusBadge";
import type { AppraisalCycle } from "@/features/hr/types";
import { formatDate } from "@/features/hr/utils/dates";

interface Props {
  cycle: AppraisalCycle;
  hideHeader?: boolean;
}

export function CycleBatchesSection({ cycle, hideHeader = false }: Props) {
  const batches = cycle.batches || [];

  return (
    <div className={hideHeader ? "space-y-3" : "space-y-4 rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"}>
      {!hideHeader ? (
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
            Cycle Batches
          </h2>
          <Link
            to={`/hr/appraisal-cycles/${cycle.id}?tab=batches`}
            className="text-sm font-medium text-stone-900 hover:underline dark:text-stone-100"
          >
            View All
          </Link>
        </div>
      ) : null}

      {batches.length === 0 ? (
        <p className="text-sm text-stone-500">No batches defined.</p>
      ) : (
        <div className="space-y-3">
          {batches.map((batch) => (
            <Link
              key={batch.id}
              to={`/hr/appraisal-cycles/${cycle.id}/batches/${batch.id}`}
              className="block rounded-xl border border-stone-100 bg-stone-50/70 p-4 transition-colors hover:border-stone-200 dark:border-stone-800 dark:bg-stone-950/30 dark:hover:border-stone-700"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-stone-900 dark:text-stone-50">
                    {batch.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-stone-500">
                    {formatDate(batch.startDate)} — {formatDate(batch.endDate)}
                  </p>
                </div>
                <StatusBadge status={batch.status} />
              </div>
              <div className="mt-3 flex items-center gap-4 text-xs text-stone-500">
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {batch.employeeCount ?? 0} employees
                </span>
                <span className="flex items-center gap-1.5">
                  <UserCircle2 className="h-3.5 w-3.5" />
                  {batch.supervisorCount ?? 0} supervisors
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
