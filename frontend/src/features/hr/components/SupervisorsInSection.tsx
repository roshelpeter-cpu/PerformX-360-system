// Appraisal Cycle supervisors list
// Shows supervisors assigned inside the selected appraisal cycle.
import { Link } from "react-router-dom";
import { UserCircle2 } from "lucide-react";
import type { AppraisalCycle } from "@/features/hr/types";
import { useCycleSupervisors } from "@/features/hr/hooks/useAppraisalCycles";

interface Props {
  cycle: AppraisalCycle;
  hideHeader?: boolean;
}

export function SupervisorsInSection({ cycle, hideHeader = false }: Props) {
  const query = useCycleSupervisors(cycle.id, {
    page: 1,
    pageSize: 6,
    assignedOnly: true,
  });
  const supervisors = query.data?.supervisors ?? [];

  return (
    <div className={hideHeader ? "space-y-3" : "space-y-4 rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"}>
      {!hideHeader ? (
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
            Supervisors & Employees in Cycle
          </h2>
          <Link
            to={`/hr/appraisal-cycles/${cycle.id}/supervisors`}
            className="text-sm font-medium text-stone-900 hover:underline dark:text-stone-100"
          >
            View All
          </Link>
        </div>
      ) : null}

      {query.isLoading ? (
        <p className="text-sm text-stone-500">Loading supervisors...</p>
      ) : query.isError ? (
        <p className="text-sm text-red-600">Unable to load supervisors.</p>
      ) : supervisors.length === 0 ? (
        <p className="text-sm text-stone-500">No supervisors assigned yet.</p>
      ) : (
        <div className="space-y-3">
          {supervisors.map((supervisor) => (
            <Link
              key={supervisor.id}
              to={`/hr/appraisal-cycles/${cycle.id}/supervisors/${supervisor.id}`}
              className="flex items-center gap-3 rounded-xl border border-stone-100 bg-stone-50/70 p-3 transition-colors hover:border-stone-200 dark:border-stone-800 dark:bg-stone-950/30 dark:hover:border-stone-700"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                <UserCircle2 className="h-6 w-6" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold text-stone-900 dark:text-stone-50">
                  {supervisor.name}
                </h3>
                <p className="truncate text-xs text-stone-500">
                  {supervisor.department?.name || "No Department"} ·{" "}
                  {supervisor.employeeCount} employees
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
