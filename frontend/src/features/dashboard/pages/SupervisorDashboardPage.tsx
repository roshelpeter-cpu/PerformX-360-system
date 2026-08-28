import { Link } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  CheckCircle2,
  FileText,
  Users,
} from "lucide-react";
import DashboardLayout from "@/app/layouts/DashboardLayout";
import { useMyDashboard } from "@/features/dashboard/hooks/useDashboard";
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
import { DashboardError, DashboardLoading } from "@/features/dashboard/components/DashboardUi";
import { meetingDetailPath } from "@/features/meetings/components/MeetingDetailCard";

export default function SupervisorDashboardPage() {
  const query = useMyDashboard();
  const data = query.data;
  const overview = data?.overview;
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
      {query.isLoading ? <DashboardLoading /> : null}
      {query.isError ? (
        <DashboardError message="Unable to load your team dashboard. Please try again." />
      ) : null}
      {data ? (
        <div className="space-y-6">
          <PageHeader
            title={`Welcome back, ${data.profile.name}! 👋`}
            description="Track your team's PDP progress, meetings, and pending actions."
          />

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <MetricCard
              label="Team Members"
              value={overview?.totalEmployees ?? data.teamCount ?? 0}
              icon={<Users className="h-5 w-5" />}
            />
            <MetricCard
              label="PDPs in Progress"
              value={overview?.pdpsInProgress ?? 0}
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
              accent="green"
              icon={<CheckCircle2 className="h-5 w-5" />}
            />
            <MetricCard
              label="Overall Progress"
              value={`${overview?.overallProgress ?? 0}%`}
              hint="Team PDP completion"
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
                  <h2 className="text-base font-semibold">Team PDP Status</h2>
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
                title="Upcoming Team Meetings"
                action={
                  <Link to="/supervisor/meetings/calendar" className="text-sm text-stone-500 hover:underline">
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
                        <th className={tableCellClass}>Type</th>
                        <th className={tableCellClass}>Participants</th>
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
                              to={meetingDetailPath("SUPERVISOR", meeting.id, meeting.type)}
                              className="font-medium hover:underline"
                            >
                              {meeting.title}
                            </Link>
                          </td>
                          <td className={tableCellClass}>{meetingTypeLabel(meeting.type)}</td>
                          <td className={tableCellClass}>
                            <AvatarStack names={meeting.participants.map((item) => item.name)} />
                          </td>
                          <td className={tableCellClass}>
                            <StatusBadge status={meeting.status} />
                          </td>
                        </tr>
                      ))}
                      {(overview?.upcomingMeetings.length ?? 0) === 0 ? (
                        <tr>
                          <td className="px-5 py-8 text-sm text-stone-500" colSpan={6}>
                            No upcoming meetings for your team.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </SectionCard>

              <QuickActionBar
                actions={[
                  { label: "Create PDP", to: "/supervisor/pdp" },
                  { label: "Follow-up Meetings", to: "/supervisor/meetings/follow-up", variant: "outline" },
                  { label: "My Team", to: "/supervisor/my-team", variant: "outline" },
                ]}
              />
            </div>

            <aside className="space-y-4">
              <MiniCalendar marked={marked} />
              <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_1px_2px_rgba(28,25,23,0.06)] dark:border-stone-800 dark:bg-stone-900">
                <p className="text-sm font-medium">Upcoming Tasks</p>
                <div className="mt-3 space-y-1 text-sm">
                  <TaskRow label="PDPs awaiting employee approval" count={overview?.pdpStatus.waitingEmployee ?? 0} to="/supervisor/pdp" />
                  <TaskRow label="PDP change requests" count={overview?.tasks.changeRequests ?? 0} to="/supervisor/pdp" />
                  <TaskRow label="Reschedule requests" count={overview?.tasks.rescheduleRequests ?? 0} to="/supervisor/meetings/planning" />
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
