import { Link } from "react-router-dom";
import DashboardLayout from "@/app/layouts/DashboardLayout";
import ActiveCycleSummaryCard from "@/features/hr/components/ActiveCycleSummaryCard";
import { StatusBadge } from "@/features/hr/components/StatusBadge";
import { formatDateTime } from "@/features/hr/utils/dates";
import {
  useCurrentAppraisalCycle,
  useWorkforceSummary,
} from "@/features/hr/hooks/useAppraisalCycles";
import { useMyDashboard } from "@/features/dashboard/hooks/useDashboard";
import { usePlanningMeetings } from "@/features/meetings/hooks/useMeetings";
import {
  DashboardError,
  DashboardHero,
  DashboardLoading,
  Panel,
  StatCard,
} from "@/features/dashboard/components/DashboardUi";
import type { AppraisalCycle } from "@/features/hr/types";

export default function HrDashboardPage() {
  const dashboardQuery = useMyDashboard();
  const workforceQuery = useWorkforceSummary();
  const currentQuery = useCurrentAppraisalCycle();
  // Reuse the planning-meetings API so the HR home page shows current PPM status.
  const planningQuery = usePlanningMeetings({ tab: "all", page: 1 });
  const workforce = workforceQuery.data;
  const current = currentQuery.data as AppraisalCycle | null | undefined;
  const data = dashboardQuery.data;
  const planning = planningQuery.data;

  const loading =
    dashboardQuery.isLoading || workforceQuery.isLoading || currentQuery.isLoading;

  return (
    <DashboardLayout>
      {loading ? <DashboardLoading /> : null}
      {dashboardQuery.isError ? (
        <DashboardError message="Unable to load the HR dashboard. Please try again." />
      ) : null}
      {data ? (
        <div className="space-y-6">
          <DashboardHero
            eyebrow="HR workspace"
            title="Appraisal Cycle Management"
            description="Monitor workforce coverage, the active cycle, and password-reset requests. Open the full cycle workspace to create, assign, and advance batches."
          />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Assignable people"
              value={workforce?.totalAssignableEmployees ?? 0}
            />
            <StatCard
              label="Supervisors"
              value={workforce?.supervisorCount ?? 0}
            />
            <StatCard
              label="Active cycles"
              value={workforce?.activeCycles ?? 0}
            />
            <StatCard
              label="Pending password resets"
              value={data.pendingPasswordResets ?? 0}
              hint="Submitted through Contact HR"
            />
          </div>

          {current ? <ActiveCycleSummaryCard cycle={current} /> : (
            <Panel title="Current cycle">
              <p className="text-sm text-stone-500">
                No active appraisal cycle. Create or activate one from cycle management.
              </p>
            </Panel>
          )}

          <Panel title="Performance Planning Meetings">
            <div className="grid gap-3 sm:grid-cols-3">
              <StatCard label="Upcoming" value={planning?.stats.upcoming ?? 0} />
              <StatCard label="Completed" value={planning?.stats.completed ?? 0} />
              <StatCard
                label="Pending requests"
                value={planning?.stats.pendingRequests ?? 0}
              />
            </div>
            <div className="mt-4 space-y-2">
              {(planning?.meetings ?? []).slice(0, 4).map((meeting) => (
                <div
                  key={meeting.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 px-3 py-2 dark:border-stone-800"
                >
                  <div>
                    <p className="text-sm font-medium">{meeting.title}</p>
                    <p className="text-xs text-stone-500">
                      {formatDateTime(meeting.scheduledAt)}
                    </p>
                  </div>
                  <StatusBadge status={meeting.status} />
                </div>
              ))}
            </div>
            <Link
              to="/hr/meetings/planning"
              className="mt-4 inline-flex h-11 items-center justify-center rounded-xl border border-stone-300 px-5 text-sm font-medium dark:border-stone-700"
            >
              Manage planning meetings
            </Link>
          </Panel>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/hr/appraisal-cycles"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-stone-900 px-5 text-sm font-medium text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-950 dark:hover:bg-white"
            >
              Open appraisal cycles
            </Link>
          </div>

          <Panel title="Recent HR notifications">
            {data.notifications.length === 0 ? (
              <p className="text-sm text-stone-500">No notifications yet.</p>
            ) : (
              <ul className="space-y-3">
                {data.notifications.map((item) => (
                  <li
                    key={item.id}
                    className="rounded-2xl border border-stone-200 px-4 py-3 dark:border-stone-800"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-stone-900 dark:text-white">
                        {item.title}
                      </p>
                      <span className="text-xs uppercase tracking-wider text-stone-500">
                        {item.status === "UNREAD" ? "Unread" : "Read"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
                      {item.message}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
