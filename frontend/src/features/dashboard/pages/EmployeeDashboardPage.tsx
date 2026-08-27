import { formatDate } from "@/features/hr/utils/dates";
import DashboardLayout from "@/app/layouts/DashboardLayout";
import { useMyDashboard } from "@/features/dashboard/hooks/useDashboard";
import AppraisalSnapshotBanner from "@/features/dashboard/components/AppraisalSnapshotBanner";
import { AppraisalProgressDetails } from "@/features/dashboard/components/AppraisalProgressDetails";
import { AppraisalTimelineCard } from "@/features/dashboard/components/AppraisalTimelineCard";
import {
  DashboardError,
  DashboardHero,
  DashboardLoading,
  Panel,
} from "@/features/dashboard/components/DashboardUi";

export default function EmployeeDashboardPage() {
  const query = useMyDashboard();
  const data = query.data;

  return (
    <DashboardLayout>
      {query.isLoading ? <DashboardLoading /> : null}
      {query.isError ? (
        <DashboardError message="Unable to load your dashboard. Please try again." />
      ) : null}
      {data ? (
        <div className="space-y-6">
          <DashboardHero
            eyebrow="Employee workspace"
            title={`Welcome back, ${data.profile.name}`}
            description="Review your current appraisal assignment, supervisor, and recent notifications."
          />

          <AppraisalSnapshotBanner data={data} />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            {data.progress ? (
              <AppraisalTimelineCard
                currentStageLabel={data.progress.currentStageLabel}
                stages={data.progress.stages}
              />
            ) : (
              <Panel title="Current appraisal cycle">
                {data.cycle ? (
                  <div className="space-y-3 text-sm text-stone-600 dark:text-stone-300">
                    <p className="text-lg font-semibold text-stone-900 dark:text-white">
                      {data.cycle.name}
                    </p>
                    <p>
                      {formatDate(data.cycle.startDate)} — {formatDate(data.cycle.endDate)}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-stone-500">
                    There is no active appraisal cycle assigned to you yet.
                  </p>
                )}
              </Panel>
            )}

            {data.progress ? (
              <AppraisalProgressDetails progress={data.progress} />
            ) : (
              <Panel title="Recent notifications">
                {data.notifications.length === 0 ? (
                  <p className="text-sm text-stone-500">No notifications yet.</p>
                ) : (
                  <ul className="space-y-3">
                    {data.notifications.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-2xl border border-stone-200 px-4 py-3 dark:border-stone-800"
                      >
                        <p className="text-sm font-medium text-stone-900 dark:text-white">
                          {item.title}
                        </p>
                        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
                          {item.message}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </Panel>
            )}
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
