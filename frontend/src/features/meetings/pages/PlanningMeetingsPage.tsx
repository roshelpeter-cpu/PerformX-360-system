import { useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Calendar, CheckCircle2, Clock3, Users } from "lucide-react";
import DashboardLayout from "@/app/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { MetricCard, MiniCalendar, PageHeader, surfaceClass } from "@/components/corporate/CorporateUi";
import { StatusBadge } from "@/features/hr/components/StatusBadge";
import { Pagination } from "@/features/hr/components/Pagination";
import { fieldClass } from "@/features/hr/components/ActionMenu";
import { formatDate, formatTimeRange } from "@/features/hr/utils/dates";
import { initials } from "@/features/employees/components/OverlayModal";
import { useAuthStore } from "@/store/authStore";
import { MeetingDetailCard, meetingDetailPath } from "../components/MeetingDetailCard";
import {
  usePlanningMeetings,
  useSchedulableEmployees,
  useSchedulePlanningMeeting,
} from "../hooks/useMeetings";
import type { PlanningMeeting, TeamPlanningStatus } from "../types";
import { cn } from "@/lib/utils";

function confirmLabel(value: string) {
  if (value === "ACCEPTED") return "Confirmed";
  if (value === "RESCHEDULE_REQUESTED") return "Reschedule requested";
  if (value === "REJECTED") return "Declined";
  return "Pending";
}

function statusLabel(value?: TeamPlanningStatus) {
  if (value === "completed") return "Completed";
  if (value === "awaiting_confirmation") return "Awaiting confirmation";
  if (value === "reschedule_requested") return "Reschedule requested";
  if (value === "needs_scheduling") return "Not scheduled";
  return "Scheduled";
}

export default function PlanningMeetingsPage() {
  const role = useAuthStore((state) => state.user?.role);
  if (role === "EMPLOYEE") return <EmployeePlanningView />;
  if (role === "SUPERVISOR") return <SupervisorPlanningView />;
  return <HrPlanningView />;
}

function HrPlanningView() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"upcoming" | "history" | "schedule">("upcoming");
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const listQuery = usePlanningMeetings({
    tab: tab === "schedule" ? "upcoming" : tab,
    from: from || undefined,
    to: to || undefined,
    page,
  });
  const data = listQuery.data;
  const employeesQuery = useSchedulableEmployees(tab === "schedule");
  const schedule = useSchedulePlanningMeeting();
  const [form, setForm] = useState({
    employeeId: "",
    date: "",
    time: "10:30",
    location: "Meeting Room A",
  });
  const calendarDays = useCalendar(data?.calendarDates);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Header
          role="HR"
          description="Schedule and track performance planning meetings. Notes are written by the supervisor after the meeting is completed."
          action={
            <Button type="button" onClick={() => setTab("schedule")}>
              Schedule Meeting
            </Button>
          }
        />
        <Stats data={data} />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-4">
            <Tabs
              tab={tab}
              onChange={(value) => {
                setTab(value);
                setPage(1);
              }}
              items={[
                ["upcoming", "Upcoming Meetings"],
                ["history", "Meeting History"],
                ["schedule", "Schedule Meeting"],
              ]}
            />
            {tab !== "schedule" ? (
              <div className="flex flex-wrap gap-3">
                <input type="date" className={`${fieldClass} w-40`} value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
                <input type="date" className={`${fieldClass} w-40`} value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
              </div>
            ) : null}
            {tab === "schedule" ? (
              <form
                className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"
                onSubmit={(event) => {
                  event.preventDefault();
                  schedule.mutate({
                    employeeId: form.employeeId,
                    scheduledAt: new Date(`${form.date}T${form.time}:00`).toISOString(),
                    location: form.location,
                  });
                }}
              >
                <p className="text-sm text-stone-500">
                  {(employeesQuery.data?.employees ?? []).filter((item) => item.planningStatus === "needs_scheduling").length}{" "}
                  employees still need a Performance Planning Meeting.
                </p>
                <select
                  className={fieldClass}
                  value={form.employeeId}
                  onChange={(event) => setForm((current) => ({ ...current, employeeId: event.target.value }))}
                  required
                >
                  <option value="">Select employee</option>
                  {(employeesQuery.data?.employees ?? [])
                    .filter((item) => item.planningStatus === "needs_scheduling")
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} ({item.employeeId}) · {item.batch.name}
                      </option>
                    ))}
                </select>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input type="date" className={fieldClass} value={form.date} onChange={(e) => setForm((c) => ({ ...c, date: e.target.value }))} required />
                  <input type="time" className={fieldClass} value={form.time} onChange={(e) => setForm((c) => ({ ...c, time: e.target.value }))} required />
                </div>
                <input className={fieldClass} value={form.location} onChange={(e) => setForm((c) => ({ ...c, location: e.target.value }))} placeholder="Location or meeting link" />
                <Button type="submit" disabled={schedule.isPending}>Schedule meeting</Button>
              </form>
            ) : (
              <MeetingTable
                loading={listQuery.isLoading}
                meetings={data?.meetings ?? []}
                page={data?.page}
                totalPages={data?.totalPages}
                total={data?.total}
                pageSize={data?.pageSize}
                onPageChange={setPage}
                onSelect={(meeting) => navigate(`/hr/meetings/planning/${meeting.id}`)}
              />
            )}
          </div>
          <Sidebar data={data} calendarDays={calendarDays} role="HR" />
        </div>
      </div>
    </DashboardLayout>
  );
}

function SupervisorPlanningView() {
  const navigate = useNavigate();
  const [employeeId, setEmployeeId] = useState("");
  const listQuery = usePlanningMeetings({ tab: "all", employeeId: employeeId || undefined, page: 1 });
  const data = listQuery.data;
  const members = data?.teamMembers ?? [];
  const selected = employeeId ? members.find((item) => item.id === employeeId) : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Header
          role="Supervisor"
          description="View each team member's Performance Planning Meeting, confirm attendance, request a reschedule, and complete meeting notes."
        />
        <Stats data={data} />
        <select
          className={`${fieldClass} max-w-sm`}
          value={employeeId}
          onChange={(event) => setEmployeeId(event.target.value)}
          aria-label="Select employee"
        >
          <option value="">All assigned employees</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name} ({member.employeeId})
            </option>
          ))}
        </select>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(selected ? [selected] : members).map((member) => {
            const meeting = member.meeting;
            return (
              <button
                key={member.id}
                type="button"
                className="rounded-2xl border border-stone-200 bg-white p-4 text-left dark:border-stone-800 dark:bg-stone-900"
                onClick={() => {
                  if (meeting) navigate(`/supervisor/meetings/planning/${meeting.id}`);
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{member.name}</p>
                    <p className="text-xs text-stone-500">{member.employeeId}</p>
                  </div>
                  <StatusBadge status={meeting?.status ?? "PENDING"} />
                </div>
                <p className="mt-3 text-sm text-stone-500">{statusLabel(member.planningStatus)}</p>
                {meeting ? (
                  <p className="mt-2 text-sm">
                    {formatDate(meeting.scheduledAt)} · {formatTimeRange(meeting.scheduledAt, meeting.endAt)}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-stone-500">No planning meeting scheduled yet.</p>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}

function EmployeePlanningView() {
  const currentQuery = usePlanningMeetings({ tab: "all", page: 1 });
  const historyQuery = usePlanningMeetings({ tab: "history", page: 1 });
  const current = (currentQuery.data?.meetings ?? []).find(
    (item) => item.cycle?.status === "ACTIVE" || item.status !== "COMPLETED"
  ) ?? currentQuery.data?.meetings[0];
  const history = (historyQuery.data?.meetings ?? []).filter((item) => item.id !== current?.id);
  const role = "EMPLOYEE";

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Header role="Employee" description="View your Performance Planning Meeting for the current appraisal cycle and previous meeting records." />
        <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="text-lg font-semibold">Current Appraisal Cycle Performance Planning Meeting</h2>
          {currentQuery.isLoading ? (
            <p className="mt-3 text-sm text-stone-500">Loading meeting…</p>
          ) : current ? (
            <div className="mt-4">
              <MeetingDetailCard meeting={current} role={role} />
            </div>
          ) : (
            <p className="mt-3 text-sm text-stone-500">No Performance Planning Meeting has been scheduled for the current cycle yet.</p>
          )}
        </section>
        <section className="rounded-2xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
          <h2 className="text-lg font-semibold">Meeting History</h2>
          <div className="mt-4 space-y-3">
            {history.map((meeting) => (
              <Link
                key={meeting.id}
                to={meetingDetailPath(role, meeting.id)}
                className="block rounded-xl border border-stone-200 px-4 py-3 dark:border-stone-800"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{meeting.title}</p>
                  <StatusBadge status={meeting.status} />
                </div>
                <p className="mt-1 text-sm text-stone-500">
                  {meeting.cycle?.name ?? "Previous cycle"} · {formatDate(meeting.scheduledAt)}
                </p>
              </Link>
            ))}
            {history.length === 0 ? (
              <p className="text-sm text-stone-500">No previous planning meetings are stored yet.</p>
            ) : null}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}

function Header({
  role,
  description,
  action,
}: {
  role: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <PageHeader
      crumbs={`${role} / Meeting Management / Performance Planning Meeting`}
      title="Performance Planning Meeting"
      description={description}
      action={action}
    />
  );
}

function Stats({ data }: { data: ReturnType<typeof usePlanningMeetings>["data"] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Upcoming Meetings" value={data?.stats.upcoming ?? 0} hint="Not yet completed" accent="blue" icon={<Calendar className="h-5 w-5" />} />
      <MetricCard label="Completed Meetings" value={data?.stats.completed ?? 0} hint="Saved in history" accent="green" icon={<CheckCircle2 className="h-5 w-5" />} />
      <MetricCard label="Pending Requests" value={data?.stats.pendingRequests ?? 0} hint="Reschedule requests awaiting HR" accent="orange" icon={<Clock3 className="h-5 w-5" />} />
      <MetricCard
        label="Total Meetings"
        value={data?.stats.total ?? 0}
        hint={data?.stats.needsScheduling ? `${data.stats.needsScheduling} still unscheduled` : "Excluding cancelled"}
        icon={<Users className="h-5 w-5" />}
      />
    </div>
  );
}

function MeetingTable({
  loading,
  meetings,
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onSelect,
}: {
  loading: boolean;
  meetings: PlanningMeeting[];
  page?: number;
  totalPages?: number;
  total?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onSelect: (meeting: PlanningMeeting) => void;
}) {
  if (loading) return <p className="text-sm text-stone-500">Loading meetings…</p>;
  if (meetings.length === 0) return <p className="text-sm text-stone-500">No meetings in this view.</p>;
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-stone-200 text-[11px] uppercase tracking-wide text-stone-400 dark:border-stone-800">
          <tr>
            <th className="px-4 py-3">Meeting Title</th>
            <th className="px-4 py-3">Employee</th>
            <th className="px-4 py-3">Participants</th>
            <th className="px-4 py-3">Date & Time</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Location / Link</th>
          </tr>
        </thead>
        <tbody>
          {meetings.map((meeting) => (
            <tr
              key={meeting.id}
              className="cursor-pointer border-b border-stone-100 hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-950"
              onClick={() => onSelect(meeting)}
            >
              <td className="px-4 py-3 font-medium">{meeting.title}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-200 text-xs font-semibold dark:bg-stone-800">
                    {initials(meeting.employee.name)}
                  </span>
                  <div>
                    <p>{meeting.employee.name}</p>
                    <p className="text-xs text-stone-500">{meeting.employee.employeeId}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex -space-x-1">
                  {meeting.participants.map((item) => (
                    <span key={item.id} className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-200 text-[10px] font-semibold dark:bg-stone-700" title={`${item.name}: ${confirmLabel(item.response)}`}>
                      {item.initials}
                    </span>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-stone-500">
                  Emp: {confirmLabel(meeting.employeeResponse)} · Sup: {confirmLabel(meeting.supervisorResponse)}
                </p>
              </td>
              <td className="px-4 py-3">
                <p>{formatDate(meeting.scheduledAt)}</p>
                <p className="text-xs text-stone-500">{formatTimeRange(meeting.scheduledAt, meeting.endAt)}</p>
              </td>
              <td className="px-4 py-3"><StatusBadge status={meeting.status} /></td>
              <td className="max-w-[160px] truncate px-4 py-3">{meeting.location ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {page && totalPages && total !== undefined ? (
        <div className="px-4 pb-4">
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} itemLabel="meetings" onPageChange={onPageChange} />
        </div>
      ) : null}
    </div>
  );
}

function Sidebar({
  data,
  calendarDays,
  role,
}: {
  data: ReturnType<typeof usePlanningMeetings>["data"];
  calendarDays: ReturnType<typeof useCalendar>;
  role: string;
}) {
  const marked = new Map<number, Array<"planning" | "followUp" | "other">>();
  for (const day of calendarDays.marked) {
    marked.set(day, ["planning"]);
  }
  const queue = data?.confirmationQueue?.length ? data.confirmationQueue : (data?.meetings ?? []).filter((item) => item.status !== "COMPLETED").slice(0, 3);
  return (
    <aside className="space-y-4">
      <MiniCalendar marked={marked} />
      <section className={`${surfaceClass} p-4`}>
        <p className="text-sm font-medium">Meeting Requests & Messages</p>
        <div className="mt-3 space-y-3">
          {queue.map((meeting) => (
            <div key={meeting.id} className="rounded-xl border border-stone-200 p-3 dark:border-stone-800">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                Meeting confirmation required
              </p>
              <p className="mt-1 text-sm font-medium">{meeting.title}</p>
              <p className="mt-1 text-xs text-stone-500">Employee: {confirmLabel(meeting.employeeResponse)}</p>
              <p className="text-xs text-stone-500">Supervisor: {confirmLabel(meeting.supervisorResponse)}</p>
              <div className="mt-2 flex items-center gap-2">
                <StatusBadge status={meeting.status} />
                {meeting.bothConfirmed && meeting.status !== "CONFIRMED" ? (
                  <span className="text-[11px] text-stone-500">Awaiting HR Confirmation</span>
                ) : null}
              </div>
              <Link to={meetingDetailPath(role, meeting.id)}>
                <Button type="button" size="sm" className="mt-2" variant="outline">View</Button>
              </Link>
            </div>
          ))}
          {queue.length === 0 ? <p className="text-sm text-stone-500">No pending meeting requests.</p> : null}
        </div>
      </section>
      <section className={`${surfaceClass} p-4`}>
        <p className="text-sm font-medium">Next 7 days</p>
        <div className="mt-3 space-y-2">
          {(data?.nextSevenDays ?? []).map((meeting) => (
            <Link key={meeting.id} to={meetingDetailPath(role, meeting.id)} className="block rounded-xl px-2 py-2 hover:bg-stone-50 dark:hover:bg-stone-950">
              <p className="text-xs text-stone-500">{formatDate(meeting.scheduledAt)} · {formatTimeRange(meeting.scheduledAt, meeting.endAt)}</p>
              <p className="text-sm font-medium">{meeting.title}</p>
            </Link>
          ))}
          {(data?.nextSevenDays.length ?? 0) === 0 ? <p className="text-sm text-stone-500">No meetings in the next 7 days.</p> : null}
        </div>
      </section>
    </aside>
  );
}

function Tabs({
  tab,
  onChange,
  items,
}: {
  tab: string;
  onChange: (value: "upcoming" | "history" | "schedule") => void;
  items: Array<[string, string]>;
}) {
  return (
    <div className="flex flex-wrap gap-4 border-b border-stone-200 dark:border-stone-800">
      {items.map(([id, label]) => (
        <button
          key={id}
          type="button"
          className={cn("border-b-2 px-1 pb-3 text-sm", tab === id ? "border-stone-900 font-medium text-stone-900 dark:border-stone-100 dark:text-white" : "border-transparent text-stone-500")}
          onClick={() => onChange(id as "upcoming" | "history" | "schedule")}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function useCalendar(dates?: string[]) {
  return useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const first = new Date(year, month, 1);
    const marked = new Set((dates ?? []).filter((value) => new Date(value).getMonth() === month).map((value) => new Date(value).getDate()));
    return { startWeekday: first.getDay(), daysInMonth: new Date(year, month + 1, 0).getDate(), marked: [...marked], today: now.getDate() };
  }, [dates]);
}
