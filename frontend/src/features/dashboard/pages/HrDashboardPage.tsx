import { Link } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  Users,
} from "lucide-react";
import DashboardLayout from "@/app/layouts/DashboardLayout";
import {
  AvatarStack,
  DonutChart,
  MetricCard,
  MiniCalendar,
  PageHeader,
  ProgressBar,
  QuickActionBar,
  SectionCard,
  meetingTypeLabel,
  tableCellClass,
  tableHeadClass,
  tableRowClass,
} from "@/components/corporate/CorporateUi";
import { StatusBadge } from "@/features/hr/components/StatusBadge";
import { formatDate, formatDateTime, formatTimeRange } from "@/features/hr/utils/dates";
import { useMyDashboard } from "@/features/dashboard/hooks/useDashboard";
import { DashboardError, DashboardLoading } from "@/features/dashboard/components/DashboardUi";
import { useAuthStore } from "@/store/authStore";
import { meetingDetailPath } from "@/features/meetings/components/MeetingDetailCard";

export default function HrDashboardPage() {
  const dashboardQuery = useMyDashboard();
  const user = useAuthStore((state) => state.user);
  const data = dashboardQuery.data;
  const overview = data?.overview;
  const cycleName =
    (data?.currentCycle as { name?: string } | null | undefined)?.name ?? data?.cycle?.name;
  const pdpTotal =
    (overview?.pdpStatus.draft ?? 0) +
    (overview?.pdpStatus.waitingEmployee ?? 0) +
    (overview?.pdpStatus.waitingHr ?? 0) +
    (overview?.pdpStatus.approved ?? 0) +
    (overview?.pdpStatus.completed ?? 0);
  const marked = new Map<number, Array<"planning" | "followUp" | "other">>();
  for (const item of overview?.calendarDates ?? []) {
    const date = new Date(item.date);
    if (date.getMonth() !== new Date().getMonth()) continue;
    const kind =
      item.type === "PERFORMANCE_PLANNING" ? "planning" : item.type === "FOLLOW_UP" ? "followUp" : "other";
    const current = marked.get(date.getDate()) ?? [];
    if (!current.includes(kind)) current.push(kind);
    marked.set(date.getDate(), current);
  }

  return (
    <DashboardLayout>
      {dashboardQuery.isLoading ? <DashboardLoading /> : null}
      {dashboardQuery.isError ? (
        <DashboardError message="Unable to load the HR dashboard. Please try again." />
      ) : null}
      {data ? (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <PageHeader
              title={`Welcome back, ${user?.name ?? "HR Administrator"}! 👋`}
              description="Here's what's happening with performance management today."
            />
            {cycleName ? (
              <div className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium shadow-sm dark:border-stone-700 dark:bg-stone-900">
                {cycleName}
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              label="Total Employees"
              value={overview?.totalEmployees ?? data.workforce?.totalAssignableEmployees ?? 0}
              hint="+5 this month"
              icon={<Users className="h-5 w-5" />}
            />
            <MetricCard
              label="PDPs in Progress"
              value={overview?.pdpsInProgress ?? 0}
              hint={
                overview?.totalEmployees
                  ? `${Math.round(((overview.pdpsInProgress ?? 0) / Math.max(overview.totalEmployees, 1)) * 100)}% of total`
                  : undefined
              }
              accent="orange"
              icon={<FileText className="h-5 w-5" />}
            />
            <MetricCard
              label="Meetings Today"
              value={overview?.meetingsToday ?? 0}
              accent="blue"
              icon={<CalendarDays className="h-5 w-5" />}
            />
            <MetricCard
              label="Completed Meetings"
              value={overview?.completedMeetings ?? 0}
              hint="This cycle"
              accent="green"
              icon={<CheckCircle2 className="h-5 w-5" />}
            />
            <MetricCard
              label="Overall Progress"
              value={`${overview?.overallProgress ?? 0}%`}
              hint="+7% vs last cycle"
              icon={<LayoutDashboard className="h-5 w-5" />}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-[0_1px_2px_rgba(28,25,23,0.06)] dark:border-stone-800 dark:bg-stone-900">
                  <h2 className="text-base font-semibold">Meetings Overview</h2>
                  <div className="mt-4">
                    <DonutChart
                      total={overview?.meetingsByType.total ?? 0}
                      slices={[
                        { label: "Performance Planning", value: overview?.meetingsByType.planning ?? 0, color: "#ea580c" },
                        { label: "Follow-up Meetings", value: overview?.meetingsByType.followUp ?? 0, color: "#059669" },
                        { label: "Other Meetings", value: overview?.meetingsByType.other ?? 0, color: "#0284c7" },
                        { label: "Cancelled Meetings", value: overview?.meetingsByType.cancelled ?? 0, color: "#e11d48" },
                      ]}
                    />
                  </div>
                </section>
                <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-[0_1px_2px_rgba(28,25,23,0.06)] dark:border-stone-800 dark:bg-stone-900">
                  <h2 className="text-base font-semibold">PDP Status Overview</h2>
                  <div className="mt-5 space-y-4">
                    {(
                      [
                        ["Draft", overview?.pdpStatus.draft ?? 0, "stone"],
                        ["Waiting Employee Approval", overview?.pdpStatus.waitingEmployee ?? 0, "orange"],
                        ["Waiting HR Approval", overview?.pdpStatus.waitingHr ?? 0, "orange"],
                        ["Approved", overview?.pdpStatus.approved ?? 0, "green"],
                        ["Completed", overview?.pdpStatus.completed ?? 0, "blue"],
                      ] as Array<[string, number, "stone" | "orange" | "green" | "blue"]>
                    ).map(([label, count, tone]) => (
                      <div key={String(label)}>
                        <div className="mb-1 flex items-center justify-between text-sm">
                          <span>{label}</span>
                          <span className="tabular-nums text-stone-500">
                            {count} · {pdpTotal ? Math.round((Number(count) / pdpTotal) * 100) : 0}%
                          </span>
                        </div>
                        <ProgressBar value={pdpTotal ? (Number(count) / pdpTotal) * 100 : 0} tone={tone} />
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <SectionCard
                title="Upcoming Meetings"
                action={
                  <Link to="/hr/meetings/calendar" className="text-sm text-stone-500 hover:underline">
                    View all
                  </Link>
                }
              >
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className={tableHeadClass}>
                      <tr>
                        <th className={tableCellClass}>Date</th>
                        <th className={tableCellClass}>Time</th>
                        <th className={tableCellClass}>Meeting Title</th>
                        <th className={tableCellClass}>Meeting Type</th>
                        <th className={tableCellClass}>Participants</th>
                        <th className={tableCellClass}>Location / Link</th>
                        <th className={tableCellClass}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(overview?.upcomingMeetings ?? []).map((meeting) => (
                        <tr key={meeting.id} className={tableRowClass}>
                          <td className={tableCellClass}>{formatDate(meeting.scheduledAt)}</td>
                          <td className={tableCellClass}>{formatTimeRange(meeting.scheduledAt, meeting.endAt)}</td>
                          <td className={tableCellClass}>
                            <Link
                              to={meetingDetailPath("HR", meeting.id, meeting.type)}
                              className="font-medium hover:underline"
                            >
                              {meeting.title}
                            </Link>
                          </td>
                          <td className={tableCellClass}>{meetingTypeLabel(meeting.type)}</td>
                          <td className={tableCellClass}>
                            <AvatarStack names={meeting.participants.map((item) => item.name)} />
                          </td>
                          <td className={tableCellClass}>{meeting.location ?? "—"}</td>
                          <td className={tableCellClass}>
                            <StatusBadge status={meeting.status} />
                          </td>
                        </tr>
                      ))}
                      {(overview?.upcomingMeetings.length ?? 0) === 0 ? (
                        <tr>
                          <td className="px-5 py-8 text-sm text-stone-500" colSpan={7}>
                            No upcoming meetings.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </SectionCard>

              <QuickActionBar
                actions={[
                  { label: "Schedule Meeting", to: "/hr/meetings/planning" },
                  { label: "View Reports", to: "/hr/appraisal-cycles", variant: "outline" },
                  { label: "Employee Dashboard", to: "/hr/employees", variant: "outline" },
                ]}
              />
            </div>

            <aside className="space-y-4">
              <MiniCalendar marked={marked} />
              <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_1px_2px_rgba(28,25,23,0.06)] dark:border-stone-800 dark:bg-stone-900">
                <p className="text-sm font-medium">Upcoming Tasks</p>
                <div className="mt-3 space-y-1 text-sm">
                  <TaskRow label="Review PDPs waiting for approval" count={overview?.tasks.waitingHr ?? 0} to="/hr/pdp" />
                  <TaskRow label="Review PDP change requests" count={overview?.tasks.changeRequests ?? 0} to="/hr/pdp" />
                  <TaskRow label="Schedule pending follow-up meetings" count={overview?.tasks.needsScheduling ?? 0} to="/hr/meetings/follow-up" />
                  <TaskRow label="Review reschedule requests" count={overview?.tasks.rescheduleRequests ?? 0} to="/hr/meetings/planning" />
                </div>
              </section>
              <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_1px_2px_rgba(28,25,23,0.06)] dark:border-stone-800 dark:bg-stone-900">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Recent Notifications</p>
                  <Link to="/notifications" className="text-xs text-stone-500 hover:underline">
                    View all
                  </Link>
                </div>
                <div className="mt-3 space-y-3">
                  {data.notifications.slice(0, 5).map((item) => (
                    <Link
                      key={item.id}
                      to="/notifications"
                      className="flex gap-2 rounded-xl px-1 py-1 text-sm hover:bg-stone-50 dark:hover:bg-stone-950"
                    >
                      <Bell className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-xs text-stone-500">{formatDateTime(item.createdAt)}</p>
                      </div>
                    </Link>
                  ))}
                  {data.notifications.length === 0 ? (
                    <p className="text-sm text-stone-500">No recent activity.</p>
                  ) : null}
                </div>
              </section>
            </aside>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}

function TaskRow({ label, count, to }: { label: string; count: number; to: string }) {
  return (
    <Link to={to} className="flex items-center justify-between rounded-xl px-2 py-2 hover:bg-stone-50 dark:hover:bg-stone-950">
      <span>{label}</span>
      <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-semibold tabular-nums dark:bg-stone-800">
        {count}
      </span>
    </Link>
  );
}
