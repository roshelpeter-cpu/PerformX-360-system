import { useEffect, useMemo, useState } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock3,
  Users,
} from "lucide-react";
import DashboardLayout from "@/app/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/features/hr/components/StatusBadge";
import { Pagination } from "@/features/hr/components/Pagination";
import { fieldClass } from "@/features/hr/components/ActionMenu";
import { formatDateTime } from "@/features/hr/utils/dates";
import { OverlayModal, initials } from "@/features/employees/components/OverlayModal";
import { useAuthStore } from "@/store/authStore";
import { MeetingDetailCard } from "../components/MeetingDetailCard";
import {
  usePlanningMeetings,
  useSchedulableEmployees,
  useSchedulePlanningMeeting,
} from "../hooks/useMeetings";
import type { PlanningMeeting } from "../types";
import { cn } from "@/lib/utils";

export default function PlanningMeetingsPage() {
  const role = useAuthStore((state) => state.user?.role);
  const [tab, setTab] = useState<"upcoming" | "history" | "schedule">("upcoming");
  const [employeeId, setEmployeeId] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<PlanningMeeting | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Employees (and a supervisor looking at one person) must see the current
  // cycle meeting even when it is already completed — not only "upcoming".
  const queryTab =
    tab === "schedule"
      ? "upcoming"
      : tab === "history"
        ? "history"
        : role === "EMPLOYEE" || employeeId
          ? "all"
          : "upcoming";
  const listQuery = usePlanningMeetings({
    tab: queryTab,
    employeeId: employeeId || undefined,
    from: from || undefined,
    to: to || undefined,
    page,
  });
  const data = listQuery.data;
  const employeesQuery = useSchedulableEmployees(role === "HR" && tab === "schedule");
  const schedule = useSchedulePlanningMeeting();

  useEffect(() => {
    if (!selected) return;
    const fresh =
      data?.meetings.find((item) => item.id === selected.id) ??
      data?.nextSevenDays.find((item) => item.id === selected.id);
    if (!fresh) return;
    if (
      fresh.status !== selected.status ||
      fresh.employeeResponse !== selected.employeeResponse ||
      fresh.supervisorResponse !== selected.supervisorResponse ||
      Boolean(fresh.notes) !== Boolean(selected.notes) ||
      Boolean(fresh.pendingReschedule) !== Boolean(selected.pendingReschedule)
    ) {
      setSelected(fresh);
    }
  }, [data, selected]);
  const [form, setForm] = useState({
    employeeId: "",
    date: "",
    time: "10:30",
    location: "Meeting Room A",
  });

  const calendarDays = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const first = new Date(year, month, 1);
    const startWeekday = first.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const marked = new Set(
      (data?.calendarDates ?? []).map((value) => new Date(value).getDate())
    );
    return { year, month, startWeekday, daysInMonth, marked };
  }, [data?.calendarDates]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs text-stone-500">
              {role === "HR" ? "HR" : role === "SUPERVISOR" ? "Supervisor" : "Employee"}{" "}
              / Meeting Management / Performance Planning Meeting
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-stone-900 dark:text-white">
              Performance Planning Meeting
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-stone-500">
              {role === "HR"
                ? "Schedule and track performance planning meetings without joining as a participant."
                : role === "SUPERVISOR"
                  ? "Confirm, reschedule, and complete planning meetings for your team."
                  : "View your own performance planning meeting, status, and completed notes."}
            </p>
          </div>
          {role === "HR" ? (
            <Button type="button" onClick={() => setTab("schedule")}>
              Schedule Meeting
            </Button>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Summary icon={Calendar} label="Upcoming Meetings" value={data?.stats.upcoming ?? 0} hint="Not yet completed" />
          <Summary icon={CheckCircle2} label="Completed Meetings" value={data?.stats.completed ?? 0} hint="Saved in history" tone="ok" />
          <Summary icon={Clock3} label="Pending Requests" value={data?.stats.pendingRequests ?? 0} hint="Reschedule requests awaiting HR" tone="warn" />
          <Summary icon={Users} label="Total Meetings" value={data?.stats.total ?? 0} hint="Excluding cancelled" />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 border-b border-stone-200 dark:border-stone-800">
              {(["upcoming", "history", ...(role === "HR" ? (["schedule"] as const) : [])] as const).map(
                (item) => (
                  <button
                    key={item}
                    type="button"
                    className={cn(
                      "border-b-2 px-1 pb-3 text-sm capitalize",
                      tab === item
                        ? "border-stone-900 font-medium text-stone-900 dark:border-stone-100 dark:text-white"
                        : "border-transparent text-stone-500"
                    )}
                    onClick={() => {
                      setTab(item);
                      setPage(1);
                    }}
                  >
                    {item === "upcoming"
                      ? role === "EMPLOYEE"
                        ? "My Meeting"
                        : "Current Meetings"
                      : item === "history"
                        ? "Meeting History"
                        : "Schedule Meeting"}
                  </button>
                )
              )}
            </div>

            {role === "SUPERVISOR" && (data?.teamMembers.length ?? 0) > 0 ? (
              <select
                className={`${fieldClass} max-w-sm`}
                value={employeeId}
                onChange={(event) => {
                  setEmployeeId(event.target.value);
                  setPage(1);
                }}
                aria-label="Select employee"
              >
                <option value="">All assigned employees</option>
                {data?.teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.employeeId})
                  </option>
                ))}
              </select>
            ) : null}

            {tab !== "schedule" ? (
              <div className="flex flex-wrap gap-3">
                <input
                  type="date"
                  className={`${fieldClass} w-40`}
                  value={from}
                  onChange={(event) => setFrom(event.target.value)}
                  aria-label="From date"
                />
                <input
                  type="date"
                  className={`${fieldClass} w-40`}
                  value={to}
                  onChange={(event) => setTo(event.target.value)}
                  aria-label="To date"
                />
              </div>
            ) : null}

            {tab === "schedule" && role === "HR" ? (
              <form
                className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"
                onSubmit={(event) => {
                  event.preventDefault();
                  const scheduledAt = new Date(`${form.date}T${form.time}:00`);
                  schedule.mutate({
                    employeeId: form.employeeId,
                    scheduledAt: scheduledAt.toISOString(),
                    location: form.location,
                  });
                }}
              >
                <select
                  className={fieldClass}
                  value={form.employeeId}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, employeeId: event.target.value }))
                  }
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
                  <input
                    type="date"
                    className={fieldClass}
                    value={form.date}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, date: event.target.value }))
                    }
                    required
                  />
                  <input
                    type="time"
                    className={fieldClass}
                    value={form.time}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, time: event.target.value }))
                    }
                    required
                  />
                </div>
                <input
                  className={fieldClass}
                  value={form.location}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, location: event.target.value }))
                  }
                  placeholder="Location or link"
                />
                <Button type="submit" disabled={schedule.isPending}>
                  Schedule meeting
                </Button>
              </form>
            ) : listQuery.isLoading ? (
              <p className="text-sm text-stone-500">Loading meetings…</p>
            ) : (data?.meetings.length ?? 0) === 0 ? (
              <p className="text-sm text-stone-500">No meetings in this view.</p>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-stone-200 text-[11px] uppercase tracking-wide text-stone-400 dark:border-stone-800">
                    <tr>
                      <th className="px-4 py-3">Meeting Title</th>
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Participants</th>
                      <th className="px-4 py-3">Date & Time</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Location/Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.meetings.map((meeting) => (
                      <tr
                        key={meeting.id}
                        className="cursor-pointer border-b border-stone-100 hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-950"
                        onClick={() => setSelected(meeting)}
                      >
                        <td className="px-4 py-3 font-medium">{meeting.title}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold dark:bg-stone-800">
                              {initials(meeting.employee.name)}
                            </span>
                            <div>
                              <p>{meeting.employee.name}</p>
                              <p className="text-xs text-stone-500">
                                {meeting.employee.employeeId}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex -space-x-1">
                            {meeting.participants.map((item) => (
                              <span
                                key={item.id}
                                className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-200 text-[10px] font-semibold dark:bg-stone-700"
                                title={`${item.name}: ${confirmLabel(item.response)}`}
                              >
                                {item.initials}
                              </span>
                            ))}
                          </div>
                          <p className="mt-1 text-[11px] text-stone-500">
                            Emp: {confirmLabel(meeting.employeeResponse)} · Sup:{" "}
                            {confirmLabel(meeting.supervisorResponse)}
                          </p>
                        </td>
                        <td className="px-4 py-3">{formatDateTime(meeting.scheduledAt)}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={meeting.status} />
                        </td>
                        <td className="px-4 py-3">{meeting.location ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data ? (
                  <div className="px-4 pb-4">
                    <Pagination
                      page={data.page}
                      totalPages={data.totalPages}
                      total={data.total}
                      pageSize={data.pageSize}
                      itemLabel="meetings"
                      onPageChange={setPage}
                    />
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <section className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
              <p className="text-sm font-medium">This Month</p>
              <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-stone-500">
                {["S", "M", "T", "W", "T", "F", "S"].map((day) => (
                  <span key={day}>{day}</span>
                ))}
                {Array.from({ length: calendarDays.startWeekday }).map((_, index) => (
                  <span key={`empty-${index}`} />
                ))}
                {Array.from({ length: calendarDays.daysInMonth }).map((_, index) => {
                  const day = index + 1;
                  const marked = calendarDays.marked.has(day);
                  return (
                    <span
                      key={day}
                      className={cn(
                        "flex h-8 items-center justify-center rounded-full",
                        marked
                          ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950"
                          : ""
                      )}
                    >
                      {day}
                    </span>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
              <p className="text-sm font-medium">Meeting requests</p>
              <div className="mt-3 space-y-3">
                {(data?.meetings ?? [])
                  .filter((item) => item.status !== "COMPLETED")
                  .slice(0, 3)
                  .map((meeting) => (
                    <div
                      key={meeting.id}
                      className="rounded-xl border border-stone-200 p-3 dark:border-stone-800"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                        {role === "HR"
                          ? "Awaiting participant confirmation"
                          : "Meeting confirmation required"}
                      </p>
                      <p className="mt-1 text-sm font-medium">{meeting.title}</p>
                      <p className="mt-1 text-xs text-stone-500">
                        Employee: {confirmLabel(meeting.employeeResponse)}
                      </p>
                      <p className="text-xs text-stone-500">
                        Supervisor: {confirmLabel(meeting.supervisorResponse)}
                      </p>
                      <StatusBadge status={meeting.status} />
                      <Button
                        type="button"
                        size="sm"
                        className="mt-2"
                        onClick={() => setSelected(meeting)}
                      >
                        View
                      </Button>
                    </div>
                  ))}
              </div>
            </section>

            <section className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
              <p className="text-sm font-medium">Next 7 Days</p>
              <div className="mt-3 space-y-2">
                {(data?.nextSevenDays ?? []).map((meeting) => (
                  <button
                    key={meeting.id}
                    type="button"
                    className="block w-full rounded-xl px-2 py-2 text-left hover:bg-stone-50 dark:hover:bg-stone-950"
                    onClick={() => setSelected(meeting)}
                  >
                    <p className="text-xs text-stone-500">
                      {formatDateTime(meeting.scheduledAt)}
                    </p>
                    <p className="text-sm font-medium">{meeting.title}</p>
                  </button>
                ))}
                {(data?.nextSevenDays.length ?? 0) === 0 ? (
                  <p className="text-sm text-stone-500">No meetings in the next 7 days.</p>
                ) : null}
              </div>
            </section>
          </aside>
        </div>
      </div>

      <OverlayModal
        open={Boolean(selected)}
        title={selected?.title ?? "Meeting"}
        subtitle={selected ? formatDateTime(selected.scheduledAt) : undefined}
        onClose={() => setSelected(null)}
        wide
      >
        {selected ? <MeetingDetailCard meeting={selected} role={role ?? "EMPLOYEE"} /> : null}
      </OverlayModal>
    </DashboardLayout>
  );
}

function confirmLabel(value: string) {
  if (value === "ACCEPTED") return "Confirmed";
  if (value === "RESCHEDULE_REQUESTED") return "Reschedule requested";
  if (value === "REJECTED") return "Declined";
  return "Pending";
}

function Summary({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: typeof Calendar;
  label: string;
  value: number;
  hint: string;
  tone?: "ok" | "warn";
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-stone-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
          <p className="mt-1 text-xs text-stone-500">{hint}</p>
        </div>
        <Icon
          className={cn(
            "h-5 w-5",
            tone === "ok" && "text-emerald-600",
            tone === "warn" && "text-amber-600",
            !tone && "text-stone-400"
          )}
        />
      </div>
    </div>
  );
}

