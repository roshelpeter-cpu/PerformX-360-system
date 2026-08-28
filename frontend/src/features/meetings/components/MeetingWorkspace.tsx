import { Link } from "react-router-dom";
import { Calendar, CheckCircle2, Clock3, MapPin, MoreHorizontal, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetricCard, MiniCalendar, surfaceClass } from "@/components/corporate/CorporateUi";
import { StatusBadge } from "@/features/hr/components/StatusBadge";
import { Pagination } from "@/features/hr/components/Pagination";
import { formatDate, formatTimeRange } from "@/features/hr/utils/dates";
import { initials } from "@/features/employees/components/OverlayModal";
import { cn } from "@/lib/utils";
import { useConfirmPlanningMeeting, useConfirmPlanningMeetingByHr } from "../hooks/useMeetings";
import type { PlanningMeeting } from "../types";
import { meetingDetailPath } from "./MeetingDetailCard";

export function confirmLabel(value: string) {
  if (value === "ACCEPTED") return "Confirmed";
  if (value === "RESCHEDULE_REQUESTED") return "Reschedule requested";
  if (value === "REJECTED") return "Declined";
  return "Pending";
}

export function requestKind(meeting: PlanningMeeting) {
  if (meeting.status === "RESCHEDULE_REQUESTED" || meeting.pendingReschedule) {
    return "Reschedule requested";
  }
  if (meeting.bothConfirmed && meeting.status !== "CONFIRMED") {
    return "Meeting confirmation required";
  }
  if (meeting.employeeResponse === "PENDING" || meeting.supervisorResponse === "PENDING") {
    return "Participant confirmation still pending";
  }
  return "Meeting-related request";
}

export function MeetingStatCards({
  items,
}: {
  items: Array<{ label: string; value: number; accent?: "orange" | "green" | "blue" | "red"; icon?: "calendar" | "check" | "clock" | "users" }>;
}) {
  const icon = {
    calendar: <Calendar className="h-5 w-5" />,
    check: <CheckCircle2 className="h-5 w-5" />,
    clock: <Clock3 className="h-5 w-5" />,
    users: <Users className="h-5 w-5" />,
  };
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <MetricCard
          key={item.label}
          label={item.label}
          value={item.value}
          accent={item.accent}
          icon={item.icon ? icon[item.icon] : undefined}
        />
      ))}
    </div>
  );
}

export function MeetingTabs({
  tab,
  onChange,
  items,
}: {
  tab: string;
  onChange: (value: string) => void;
  items: Array<[string, string]>;
}) {
  return (
    <div className="flex flex-wrap gap-4 border-b border-stone-200 dark:border-stone-800">
      {items.map(([id, label]) => (
        <button
          key={id}
          type="button"
          className={cn(
            "border-b-2 px-1 pb-3 text-sm",
            tab === id
              ? "border-stone-900 font-medium text-stone-900 dark:border-stone-100 dark:text-white"
              : "border-transparent text-stone-500"
          )}
          onClick={() => onChange(id)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function PlanningStyleTable({
  loading,
  meetings,
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onSelect,
  variant = "planning",
}: {
  loading: boolean;
  meetings: PlanningMeeting[];
  page?: number;
  totalPages?: number;
  total?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onSelect: (meeting: PlanningMeeting) => void;
  variant?: "planning" | "follow-up" | "other";
}) {
  if (loading) return <p className="text-sm text-stone-500">Loading meetings…</p>;
  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-stone-200 text-[11px] uppercase tracking-wide text-stone-400 dark:border-stone-800">
          <tr>
            {variant === "follow-up" ? <th className="px-4 py-3">Meeting No.</th> : <th className="px-4 py-3">Meeting Title</th>}
            {variant !== "follow-up" ? <th className="px-4 py-3">Employee</th> : null}
            {variant === "follow-up" ? <th className="px-4 py-3">Planned Date & Time</th> : <th className="px-4 py-3">Participants</th>}
            {variant === "follow-up" ? <th className="px-4 py-3">Status</th> : <th className="px-4 py-3">Date & Time</th>}
            {variant === "follow-up" ? <th className="px-4 py-3">Participants</th> : <th className="px-4 py-3">Status</th>}
            <th className="px-4 py-3">Location / Link</th>
            {variant !== "planning" ? <th className="px-4 py-3" /> : null}
          </tr>
        </thead>
        <tbody>
          {meetings.map((meeting) => (
            <tr
              key={meeting.id}
              className="cursor-pointer border-b border-stone-100 hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-950"
              onClick={() => onSelect(meeting)}
            >
              <td className="px-4 py-3 font-medium">
                {variant === "follow-up"
                  ? meeting.followUpSlot
                    ? `Meeting ${meeting.followUpSlot}`
                    : meeting.title
                  : meeting.title}
              </td>
              {variant !== "follow-up" ? (
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-200 text-xs font-semibold text-stone-800">
                      {initials(meeting.employee.name)}
                    </span>
                    <div>
                      <p>{meeting.employee.name}</p>
                      <p className="text-xs text-stone-500">{meeting.employee.employeeId}</p>
                    </div>
                  </div>
                </td>
              ) : null}
              {variant === "follow-up" ? (
                <td className="px-4 py-3">
                  <p>{formatDate(meeting.scheduledAt)}</p>
                  <p className="text-xs text-stone-500">{formatTimeRange(meeting.scheduledAt, meeting.endAt)}</p>
                </td>
              ) : (
                <td className="px-4 py-3">
                  <div className="flex -space-x-1">
                    {meeting.participants.map((item) => (
                      <span
                        key={item.id}
                        className="flex h-7 w-7 items-center justify-center rounded-full border border-white bg-stone-200 text-[10px] font-semibold dark:border-stone-900 dark:bg-stone-700"
                        title={`${item.name}: ${confirmLabel(item.response)}`}
                      >
                        {item.initials}
                      </span>
                    ))}
                  </div>
                </td>
              )}
              {variant === "follow-up" ? (
                <td className="px-4 py-3">
                  <StatusBadge status={meeting.status} />
                </td>
              ) : (
                <td className="px-4 py-3">
                  <p>{formatDate(meeting.scheduledAt)}</p>
                  <p className="text-xs text-stone-500">{formatTimeRange(meeting.scheduledAt, meeting.endAt)}</p>
                </td>
              )}
              {variant === "follow-up" ? (
                <td className="px-4 py-3">
                  <p className="text-sm">{meeting.employee.name}</p>
                  <p className="text-xs text-stone-500">{meeting.supervisor?.name ?? "—"}</p>
                </td>
              ) : (
                <td className="px-4 py-3">
                  <StatusBadge status={meeting.status} />
                </td>
              )}
              <td className="max-w-[180px] px-4 py-3">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-stone-400" />
                  <span className="truncate">{meeting.location ?? "—"}</span>
                </span>
              </td>
              {variant !== "planning" ? (
                <td className="px-4 py-3 text-stone-400">
                  <MoreHorizontal className="h-4 w-4" />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
      {meetings.length === 0 ? <p className="px-5 py-8 text-sm text-stone-500">No meetings in this view.</p> : null}
      {page && totalPages && total !== undefined ? (
        <div className="px-4 pb-4">
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} itemLabel="meetings" onPageChange={onPageChange} />
        </div>
      ) : null}
    </div>
  );
}

export function MeetingRequestsPanel({
  meetings,
  role,
}: {
  meetings: PlanningMeeting[];
  role: string;
}) {
  const confirm = useConfirmPlanningMeeting();
  const hrConfirm = useConfirmPlanningMeetingByHr();
  return (
    <section className={`${surfaceClass} p-4`}>
      <p className="text-sm font-medium">Meeting Requests & Messages</p>
      <p className="mt-1 text-xs text-stone-500">Confirmations, pending participant responses, and reschedule requests.</p>
      <div className="mt-3 space-y-3">
        {meetings.slice(0, 3).map((meeting) => (
          <div key={meeting.id} className="rounded-xl border border-sky-200 bg-sky-50/60 p-3 dark:border-sky-900/40 dark:bg-sky-950/20">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">{requestKind(meeting)}</p>
            <p className="mt-1 text-sm font-medium">{meeting.title}</p>
            <p className="mt-1 text-xs text-stone-500">Employee: {confirmLabel(meeting.employeeResponse)}</p>
            <p className="text-xs text-stone-500">Supervisor: {confirmLabel(meeting.supervisorResponse)}</p>
            <div className="mt-2">
              <StatusBadge status={meeting.status} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {meeting.actions.canHrConfirm ? (
                <Button type="button" size="sm" disabled={hrConfirm.isPending} onClick={() => hrConfirm.mutate(meeting.id)}>
                  Confirm Meeting
                </Button>
              ) : null}
              {meeting.actions.canConfirm ? (
                <Button type="button" size="sm" disabled={confirm.isPending} onClick={() => confirm.mutate(meeting.id)}>
                  Confirm Meeting
                </Button>
              ) : null}
              <Link to={meetingDetailPath(role, meeting.id, meeting.type)}>
                <Button type="button" size="sm" variant="outline">
                  View
                </Button>
              </Link>
            </div>
          </div>
        ))}
        {meetings.length === 0 ? <p className="text-sm text-stone-500">No participant requests or messages yet.</p> : null}
      </div>
      <Link to="/notifications" className="mt-3 inline-block text-sm text-stone-500 hover:underline">
        View all
      </Link>
    </section>
  );
}

export function NextSevenDaysPanel({ meetings, role }: { meetings: PlanningMeeting[]; role: string }) {
  return (
    <section className={`${surfaceClass} p-4`}>
      <p className="text-sm font-medium">Next 7 Days</p>
      <div className="mt-3 space-y-2">
        {meetings.map((meeting) => (
          <Link key={meeting.id} to={meetingDetailPath(role, meeting.id, meeting.type)} className="block rounded-xl px-2 py-2 hover:bg-stone-50 dark:hover:bg-stone-950">
            <p className="text-xs text-stone-500">
              {formatDate(meeting.scheduledAt)} · {formatTimeRange(meeting.scheduledAt, meeting.endAt)}
            </p>
            <p className="text-sm font-medium">{meeting.title}</p>
          </Link>
        ))}
        {meetings.length === 0 ? <p className="text-sm text-stone-500">No meetings in the next 7 days.</p> : null}
      </div>
    </section>
  );
}

export function UpcomingMeetingsPanel({ meetings, role }: { meetings: PlanningMeeting[]; role: string }) {
  return (
    <section className={`${surfaceClass} p-4`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Upcoming Meetings</p>
        <Link to="/notifications" className="text-xs text-stone-500 hover:underline">
          View All
        </Link>
      </div>
      <div className="mt-3 space-y-2">
        {meetings.slice(0, 5).map((meeting) => (
          <Link
            key={meeting.id}
            to={meetingDetailPath(role, meeting.id, meeting.type)}
            className="block rounded-xl border border-stone-100 p-3 dark:border-stone-800"
          >
            <p className="text-sm font-medium">{meeting.title}</p>
            <p className="mt-1 text-xs text-stone-500">
              {formatDate(meeting.scheduledAt)} · {formatTimeRange(meeting.scheduledAt, meeting.endAt)}
            </p>
            <StatusBadge className="mt-2" status={meeting.status} />
          </Link>
        ))}
        {meetings.length === 0 ? <p className="text-sm text-stone-500">No upcoming meetings.</p> : null}
      </div>
    </section>
  );
}

export function MeetingSummaryPanel({
  scheduled,
  cancelled,
  completed,
  upcoming,
}: {
  scheduled: number;
  cancelled: number;
  completed: number;
  upcoming: number;
}) {
  return (
    <section className={`${surfaceClass} p-4`}>
      <p className="text-sm font-medium">Meeting Summary</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <SummaryStat label="Total scheduled" value={scheduled} />
        <SummaryStat label="Cancelled" value={cancelled} />
        <SummaryStat label="Completed" value={completed} />
        <SummaryStat label="Upcoming" value={upcoming} />
      </div>
    </section>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-stone-100 px-3 py-2 dark:border-stone-800">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function MeetingCalendarCard({
  dates,
  kind = "planning",
}: {
  dates?: string[];
  kind?: "planning" | "followUp" | "other";
}) {
  const marked = new Map<number, Array<"planning" | "followUp" | "other">>();
  const month = new Date().getMonth();
  for (const value of dates ?? []) {
    const date = new Date(value);
    if (date.getMonth() !== month) continue;
    const current = marked.get(date.getDate()) ?? [];
    current.push(kind);
    marked.set(date.getDate(), current);
  }
  return <MiniCalendar marked={marked} heading="This month" />;
}
