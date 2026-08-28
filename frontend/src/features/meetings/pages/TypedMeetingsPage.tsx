import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "@/app/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  AvatarStack,
  FilterTabs,
  MetricCard,
  MiniCalendar,
  PageHeader,
  meetingTypeLabel,
  surfaceClass,
} from "@/components/corporate/CorporateUi";
import { StatusBadge } from "@/features/hr/components/StatusBadge";
import { Pagination } from "@/features/hr/components/Pagination";
import { fieldClass } from "@/features/hr/components/ActionMenu";
import { formatDate, formatTimeRange } from "@/features/hr/utils/dates";
import { useAuthStore } from "@/store/authStore";
import { meetingDetailPath } from "../components/MeetingDetailCard";
import {
  useFollowUpMeetings,
  useOtherMeetings,
  usePlanningMeetings,
  useScheduleFollowUpMeeting,
  useScheduleOtherMeeting,
} from "../hooks/useMeetings";
import type { PlanningMeeting } from "../types";

export default function TypedMeetingsPage({ kind }: { kind: "follow-up" | "other" }) {
  const role = useAuthStore((state) => state.user?.role) ?? "EMPLOYEE";
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [employeeId, setEmployeeId] = useState("");
  const [cycleId, setCycleId] = useState("");
  const [pdpStartDate, setPdpStartDate] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("");
  const [tab, setTab] = useState<"schedule" | "history">("schedule");
  const [showSchedule, setShowSchedule] = useState(false);
  const [form, setForm] = useState({ date: "", time: "10:30", location: "Microsoft Teams", title: "" });
  const followUp = useFollowUpMeetings({ page, employeeId, cycleId, pdpStartDate, from, to, status, tab });
  const other = useOtherMeetings({ page, employeeId, cycleId, pdpStartDate, from, to, status, tab: tab === "history" ? "history" : "all" });
  const planningQueue = usePlanningMeetings({ tab: "upcoming", page: 1 });
  const query = kind === "follow-up" ? followUp : other;
  const scheduleFollowUp = useScheduleFollowUpMeeting();
  const scheduleOther = useScheduleOtherMeeting();
  const data = query.data;
  const selected = data?.pdpEmployees?.find((item) => item.id === employeeId);
  const title = kind === "follow-up" ? "Follow-up Meetings" : "Other Meetings";
  const crumbs = `${role === "HR" ? "HR" : role === "SUPERVISOR" ? "Supervisor" : "Employee"} / Meeting Management / ${title}`;

  const marked = new Map<number, Array<"planning" | "followUp" | "other">>();
  for (const value of data?.calendarDates ?? []) {
    const date = new Date(value);
    if (date.getMonth() !== new Date().getMonth()) continue;
    const current = marked.get(date.getDate()) ?? [];
    current.push(kind === "follow-up" ? "followUp" : "other");
    marked.set(date.getDate(), current);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <PageHeader
            crumbs={crumbs}
            title={title}
            description={
              kind === "follow-up"
                ? "Follow-up meetings exist only for employees with an active PDP. HR sees the organisation; supervisors see their own team."
                : "Issue-resolution and other meetings, including redirected PDP discussions."
            }
          />
          {role !== "EMPLOYEE" ? (
            <Button type="button" onClick={() => setShowSchedule((value) => !value)}>
              {kind === "follow-up" ? "Add additional meeting" : "Schedule Meeting"}
            </Button>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label={kind === "follow-up" ? "Total Follow-up Meetings" : "Total Meetings"} value={data?.stats?.total ?? 0} accent="orange" />
          <MetricCard label="Completed Meetings" value={data?.stats?.completed ?? 0} accent="green" />
          <MetricCard label="Upcoming Meetings" value={data?.stats?.upcoming ?? 0} accent="blue" />
          <MetricCard
            label={kind === "follow-up" ? "Rescheduled Meetings" : "Cancelled Meetings"}
            value={kind === "follow-up" ? data?.stats?.rescheduled ?? 0 : data?.stats?.cancelled ?? 0}
            accent="red"
          />
        </div>

        <section className={`${surfaceClass} p-4`}>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
            <select className={fieldClass} value={employeeId} onChange={(event) => { setEmployeeId(event.target.value); setPage(1); }}>
              <option value="">All employees</option>
              {(data?.pdpEmployees ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.employeeId})
                </option>
              ))}
            </select>
            <select className={fieldClass} value={cycleId} onChange={(event) => { setCycleId(event.target.value); setPage(1); }} aria-label="Appraisal cycle">
              <option value="">{data?.cycle?.name ?? "Current appraisal cycle"}</option>
            </select>
            <input type="date" className={fieldClass} value={pdpStartDate} onChange={(event) => { setPdpStartDate(event.target.value); setPage(1); }} aria-label="PDP start date" />
            <input type="date" className={fieldClass} value={from} onChange={(event) => setFrom(event.target.value)} aria-label="From date" />
            <input type="date" className={fieldClass} value={to} onChange={(event) => setTo(event.target.value)} aria-label="To date" />
            <select className={fieldClass} value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="">All statuses</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="CONFIRMED">Confirmed</option>
              <option value="COMPLETED">Completed</option>
              <option value="RESCHEDULED">Rescheduled</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div className="mt-3">
            <Button type="button" variant="outline" onClick={() => setPage(1)}>Filter</Button>
          </div>
          {kind === "follow-up" && role !== "EMPLOYEE" ? (
            <p className="mt-3 text-xs text-stone-500">
              Only employees with an approved or assigned PDP appear here. Follow-up meetings are not created without a PDP.
            </p>
          ) : null}
        </section>

        {showSchedule && role !== "EMPLOYEE" ? (
          <form
            className={`${surfaceClass} space-y-3 p-5`}
            onSubmit={(event) => {
              event.preventDefault();
              const scheduledAt = new Date(`${form.date}T${form.time}:00`).toISOString();
              if (kind === "follow-up") {
                scheduleFollowUp.mutate({ employeeId, scheduledAt, location: form.location });
              } else {
                scheduleOther.mutate({
                  employeeId,
                  scheduledAt,
                  location: form.location,
                  title: form.title || undefined,
                });
              }
              setShowSchedule(false);
            }}
          >
            {kind === "other" ? (
              <input className={fieldClass} placeholder="Meeting title" value={form.title} onChange={(event) => setForm((c) => ({ ...c, title: event.target.value }))} />
            ) : null}
            <div className="grid gap-3 sm:grid-cols-3">
              <input type="date" className={fieldClass} value={form.date} onChange={(event) => setForm((c) => ({ ...c, date: event.target.value }))} required />
              <input type="time" className={fieldClass} value={form.time} onChange={(event) => setForm((c) => ({ ...c, time: event.target.value }))} required />
              <input className={fieldClass} value={form.location} onChange={(event) => setForm((c) => ({ ...c, location: event.target.value }))} placeholder="Location or meeting link" />
            </div>
            <Button type="submit" disabled={!employeeId || scheduleFollowUp.isPending || scheduleOther.isPending}>
              Save meeting
            </Button>
          </form>
        ) : null}

        {selected ? (
          <section className="rounded-2xl border border-sky-100 bg-sky-50/70 p-5 dark:border-sky-900/40 dark:bg-sky-950/20">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-lg font-semibold">{selected.name} ({selected.employeeId})</p>
                <p className="text-sm text-stone-500">{selected.jobTitle ?? "—"} · {selected.department?.name ?? "—"}</p>
              </div>
              <StatusBadge status={selected.pdpStatus} />
            </div>
            <div className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-400">PDP Start Date</p>
                <p className="mt-1 font-medium">{formatDate(selected.pdpStartDate)}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-400">Scheduled follow-up meetings</p>
                <p className="mt-1 font-medium">{selected.scheduledCount}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-stone-400">Supervisor</p>
                <p className="mt-1 font-medium">{selected.supervisor?.name ?? "—"}</p>
              </div>
            </div>
          </section>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-4">
            <FilterTabs
              value={tab}
              onChange={(value) => { setTab(value); setPage(1); }}
              items={[
                { id: "schedule", label: kind === "follow-up" ? "Follow-up Schedule" : "Meetings" },
                { id: "history", label: "Meeting History" },
              ]}
            />
            <MeetingTable
              loading={query.isLoading}
              meetings={data?.meetings ?? []}
              kind={kind}
              page={data?.page}
              totalPages={data?.totalPages}
              total={data?.total}
              pageSize={data?.pageSize}
              onPageChange={setPage}
              onSelect={(meeting) => navigate(meetingDetailPath(role, meeting.id, meeting.type))}
            />
          </div>
          <aside className="space-y-4">
            <MiniCalendar marked={marked} />
            <section className={`${surfaceClass} p-4`}>
              <p className="text-sm font-medium">Upcoming Meetings</p>
              <div className="mt-3 space-y-2">
                {(data?.meetings ?? []).slice(0, 4).map((meeting) => (
                  <Link key={meeting.id} to={meetingDetailPath(role, meeting.id, meeting.type)} className="block rounded-xl border border-stone-100 p-3 dark:border-stone-800">
                    <p className="text-xs text-stone-500">{formatDate(meeting.scheduledAt)}</p>
                    <p className="text-sm font-medium">{meeting.title}</p>
                    <p className="text-xs text-stone-500">{formatTimeRange(meeting.scheduledAt, meeting.endAt)}</p>
                    <StatusBadge className="mt-2" status={meeting.status} />
                  </Link>
                ))}
                {(data?.meetings.length ?? 0) === 0 ? <p className="text-sm text-stone-500">No upcoming meetings.</p> : null}
              </div>
            </section>
            <section className={`${surfaceClass} p-4`}>
              <p className="text-sm font-medium">Meeting Requests & Messages</p>
              <div className="mt-3 space-y-3">
                {(planningQueue.data?.confirmationQueue ?? []).slice(0, 3).map((meeting) => (
                  <Link
                    key={meeting.id}
                    to={meetingDetailPath(role, meeting.id, meeting.type)}
                    className="block rounded-xl border border-stone-200 p-3 hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-950"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                      Reschedule / confirmation
                    </p>
                    <p className="mt-1 text-sm font-medium">{meeting.title}</p>
                    <StatusBadge className="mt-2" status={meeting.status} />
                  </Link>
                ))}
                {(planningQueue.data?.confirmationQueue?.length ?? 0) === 0 ? (
                  <p className="text-sm text-stone-500">No participant requests or messages yet.</p>
                ) : null}
              </div>
            </section>
            <section className={`${surfaceClass} p-4`}>
              <p className="text-sm font-medium">Meeting Summary</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <SummaryStat label="Total scheduled" value={data?.stats?.scheduled ?? 0} />
                <SummaryStat label="Completed" value={data?.stats?.completed ?? 0} />
                <SummaryStat label="Cancelled" value={data?.stats?.cancelled ?? 0} />
                <SummaryStat label="Upcoming" value={data?.stats?.upcoming ?? 0} />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}

function MeetingTable({
  loading,
  meetings,
  kind,
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onSelect,
}: {
  loading: boolean;
  meetings: PlanningMeeting[];
  kind: "follow-up" | "other";
  page?: number;
  totalPages?: number;
  total?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onSelect: (meeting: PlanningMeeting) => void;
}) {
  if (loading) return <p className="text-sm text-stone-500">Loading meetings…</p>;
  return (
    <div className={`${surfaceClass} overflow-x-auto`}>
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-stone-100 text-[11px] uppercase tracking-wide text-stone-400 dark:border-stone-800">
          <tr>
            {kind === "follow-up" ? <th className="px-5 py-3">Meeting No.</th> : <th className="px-5 py-3">Meeting Title</th>}
            {kind === "follow-up" ? <th className="px-5 py-3">Employee</th> : null}
            {kind === "other" ? <th className="px-5 py-3">Meeting Type</th> : null}
            <th className="px-5 py-3">Date and Time</th>
            <th className="px-5 py-3">Status</th>
            <th className="px-5 py-3">Participants</th>
            {kind === "other" ? <th className="px-5 py-3">Host</th> : null}
            <th className="px-5 py-3">Location / Link</th>
            <th className="px-5 py-3">Action</th>
          </tr>
        </thead>
        <tbody>
          {meetings.map((meeting) => (
            <tr key={meeting.id} className="cursor-pointer border-b border-stone-50 hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-950" onClick={() => onSelect(meeting)}>
              {kind === "follow-up" ? (
                <td className="px-5 py-3 font-medium">{meeting.followUpSlot ? `Meeting ${meeting.followUpSlot}` : meeting.title}</td>
              ) : (
                <td className="px-5 py-3 font-medium">{meeting.title}</td>
              )}
              {kind === "follow-up" ? (
                <td className="px-5 py-3">
                  <p className="font-medium">{meeting.employee.name}</p>
                  <p className="text-xs text-stone-500">{meeting.employee.employeeId}</p>
                </td>
              ) : null}
              {kind === "other" ? <td className="px-5 py-3">{meetingTypeLabel(meeting.type)}</td> : null}
              <td className="px-5 py-3">
                <p>{formatDate(meeting.scheduledAt)}</p>
                <p className="text-xs text-stone-500">{formatTimeRange(meeting.scheduledAt, meeting.endAt)}</p>
              </td>
              <td className="px-5 py-3"><StatusBadge status={meeting.status} /></td>
              <td className="px-5 py-3">
                <AvatarStack names={
                  meeting.participants.length
                    ? meeting.participants.map((item) => item.name)
                    : [meeting.employee.name, meeting.supervisor?.name].filter((name): name is string => Boolean(name))
                } />
              </td>
              {kind === "other" ? <td className="px-5 py-3">{meeting.createdBy.name}</td> : null}
              <td className="px-5 py-3">{meeting.location ?? "—"}</td>
              <td className="px-5 py-3 text-stone-500">Open</td>
            </tr>
          ))}
        </tbody>
      </table>
      {meetings.length === 0 ? <p className="px-5 py-8 text-sm text-stone-500">No meetings in this view.</p> : null}
      {page && totalPages && total !== undefined ? (
        <div className="px-5 pb-4">
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} itemLabel="meetings" onPageChange={onPageChange} />
        </div>
      ) : null}
    </div>
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
