import { formatDate } from "@/features/hr/utils/dates";
import DashboardLayout from "@/app/layouts/DashboardLayout";
import { StatusBadge } from "@/features/hr/components/StatusBadge";
import { useMyDashboard } from "@/features/dashboard/hooks/useDashboard";
import {
  DashboardError,
  DashboardHero,
  DashboardLoading,
  Panel,
  StatCard,
} from "@/features/dashboard/components/DashboardUi";

export default function LeadershipDashboardPage() {
  const query = useMyDashboard();
  const data = query.data;

  return (
    <DashboardLayout>
      {query.isLoading ? <DashboardLoading /> : null}
      {query.isError ? (
        <DashboardError message="Unable to load leadership insights. Please try again." />
      ) : null}
      {data ? (
        <div className="space-y-6">
          <DashboardHero
            eyebrow="Leadership workspace"
            title="Organisation performance overview"
            description="A read-only view of appraisal cycles, workforce coverage, and department size."
          />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Assignable people"
              value={data.workforce?.totalAssignableEmployees ?? 0}
            />
            <StatCard
              label="Supervisors"
              value={data.workforce?.supervisorCount ?? 0}
            />
            <StatCard
              label="Active cycles"
              value={data.workforce?.activeCycles ?? 0}
            />
            <StatCard
              label="Departments"
              value={data.workforce?.departmentCount ?? 0}
            />
          </div>

          <Panel title="Appraisal cycles">
            {data.cycles && data.cycles.length > 0 ? (
              <ul className="space-y-3">
                {data.cycles.map((cycle) => (
                  <li
                    key={cycle.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 px-4 py-3 dark:border-stone-800"
                  >
                    <div>
                      <p className="font-medium text-stone-900 dark:text-white">
                        {cycle.name}
                      </p>
                      <p className="text-sm text-stone-500">
                        {formatDate(cycle.startDate)} — {formatDate(cycle.endDate)}
                      </p>
                    </div>
                    <StatusBadge status={cycle.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-stone-500">No appraisal cycles yet.</p>
            )}
          </Panel>

          <Panel title="Departments">
            {data.departments && data.departments.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {data.departments.map((department) => (
                  <div
                    key={department.id}
                    className="rounded-2xl border border-stone-200 px-4 py-3 dark:border-stone-800"
                  >
                    <p className="font-medium text-stone-900 dark:text-white">
                      {department.name}
                    </p>
                    <p className="mt-1 text-sm text-stone-500">
                      {department.employeeCount} people
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-stone-500">No departments found.</p>
            )}
          </Panel>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
