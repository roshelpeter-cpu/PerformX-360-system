import { Link, useParams } from "react-router-dom";
import DashboardLayout from "@/app/layouts/DashboardLayout";
import { formatRoleLabel } from "@/constants/roles";
import { AppraisalProgressDetails } from "@/features/dashboard/components/AppraisalProgressDetails";
import { AppraisalTimelineCard } from "@/features/dashboard/components/AppraisalTimelineCard";
import { AppraisalHistoryPanel } from "@/features/history/components/AppraisalHistoryPanel";
import { useTeamMember } from "@/features/supervisor/hooks/useMyTeam";
import type { UserRole } from "@/features/auth/types";

export default function TeamMemberDetailPage() {
  const { employeeId } = useParams<{ employeeId: string }>();
  const query = useTeamMember(employeeId);
  const data = query.data;

  return (
    <DashboardLayout>
      {query.isLoading ? (
        <p className="text-sm text-stone-500">Loading employee appraisal details…</p>
      ) : null}
      {query.isError ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
          <p className="text-sm text-red-600">
            This employee is not on your team, or the record could not be loaded.
          </p>
          <Link to="/supervisor/my-team" className="mt-3 inline-block text-sm hover:underline">
            Back to My Team
          </Link>
        </div>
      ) : null}
      {data ? (
        <div className="space-y-6">
          <div>
            <Link
              to="/supervisor/my-team"
              className="text-sm text-stone-500 hover:text-stone-800"
            >
              ← My Team
            </Link>
            <h1 className="mt-2 text-2xl font-semibold text-stone-900 dark:text-white">
              {data.employee.name}
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              Appraisal progress for the current cycle.
            </p>
          </div>

          <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
            <h2 className="text-sm font-semibold text-stone-900 dark:text-white">
              Personal information
            </h2>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
              <Info label="Employee" value={data.employee.name} />
              <Info label="Employee ID" value={data.employee.employeeId} />
              <Info
                label="Department"
                value={data.employee.department?.name ?? "—"}
              />
              <Info
                label="Role"
                value={
                  data.employee.jobTitle ??
                  formatRoleLabel(data.employee.role as UserRole)
                }
              />
              <Info
                label="Assigned supervisor"
                value={
                  data.progress.supervisor
                    ? `${data.progress.supervisor.name} (${data.progress.supervisor.employeeId})`
                    : "—"
                }
              />
              <Info label="Email" value={data.employee.companyEmail} />
            </dl>
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <AppraisalTimelineCard
              currentStageLabel={data.progress.currentStageLabel}
              stages={data.progress.stages}
            />
            <AppraisalProgressDetails progress={data.progress} />
          </div>

          <AppraisalHistoryPanel employeeId={data.employee.id} />
        </div>
      ) : null}
    </DashboardLayout>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-stone-400">{label}</dt>
      <dd className="mt-1 font-medium text-stone-900 dark:text-stone-100">{value}</dd>
    </div>
  );
}
