import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import DashboardLayout from "@/app/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  AvatarStack,
  MetricCard,
  PageHeader,
  meetingTypeDot,
  meetingTypeLabel,
  surfaceClass,
} from "@/components/corporate/CorporateUi";
import { StatusBadge } from "@/features/hr/components/StatusBadge";
import { fieldClass } from "@/features/hr/components/ActionMenu";
import { formatDate, formatTimeRange } from "@/features/hr/utils/dates";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { meetingDetailPath } from "../components/MeetingDetailCard";
import { useMeetingCalendar } from "../hooks/useMeetings";

export default function MeetingCalendarPage() {
  const role = useAuthStore((state) => state.user?.role) ?? "EMPLOYEE";
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const selectedDate = `${year}-${String(month).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`;
  const query = useMeetingCalendar({ year, month, type, status, date: selectedDate });
  const data = query.data;
  const daysInMonth = new Date(year, month, 0).getDate();
  const startWeekday = new Date(year, month - 1, 1).getDay();
  const dayMap = useMemo(() => new Map((data?.days ?? []).map((item) => [item.day, item])), [data?.days]);
  const selectedMeetings = (data?.meetings ?? []).filter((item) => new Date(item.scheduledAt).getDate() === selectedDay);
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });

  function shift(delta: number) {
    const next = new Date(year, month - 1 + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth() + 1);
    setSelectedDay(1);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <PageHeader
            crumbs="Home / Meeting Calendar"
            title="Meeting Calendar"
            description="Review organisation meetings by month, type, and status."
          />
          {role === "HR" ? (
            <Link to="/hr/meetings/planning">
              <Button>+ Schedule Meeting</Button>
            </Link>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Total Meetings" value={data?.stats.total ?? 0} />
          <MetricCard label="Upcoming Meetings" value={data?.stats.upcoming ?? 0} accent="blue" />
          <MetricCard label="Completed Meetings" value={data?.stats.completed ?? 0} accent="green" />
          <MetricCard label="Cancelled Meetings" value={data?.stats.cancelled ?? 0} accent="red" />
          <MetricCard
            label="Attendance Rate"
            value={`${data?.stats.attendanceRate ?? 0}%`}
            hint={`${data?.stats.participantCount ?? 0} participants`}
          />
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-6">
            <section className={`${surfaceClass} p-5`}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button type="button" size="icon" variant="outline" onClick={() => shift(-1)} aria-label="Previous month">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <h2 className="min-w-[160px] text-center text-lg font-semibold">{monthLabel}</h2>
                  <Button type="button" size="icon" variant="outline" onClick={() => shift(1)} aria-label="Next month">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth() + 1); setSelectedDay(now.getDate()); }}>
                    Today
                  </Button>
                </div>
                <div className="flex gap-2">
                  <select className={`${fieldClass} w-48`} value={type} onChange={(event) => setType(event.target.value)}>
                    <option value="all">Meeting Type</option>
                    <option value="PERFORMANCE_PLANNING">Performance Planning</option>
                    <option value="FOLLOW_UP">Follow-up</option>
                    <option value="OTHER">Other Meeting</option>
                  </select>
                  <select className={`${fieldClass} w-40`} value={status} onChange={(event) => setStatus(event.target.value)}>
                    <option value="all">Status</option>
                    <option value="SCHEDULED">Scheduled</option>
                    <option value="CONFIRMED">Confirmed</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs text-stone-400">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}
                {Array.from({ length: startWeekday }).map((_, index) => <span key={`empty-${index}`} />)}
                {Array.from({ length: daysInMonth }).map((_, index) => {
                  const day = index + 1;
                  const counts = dayMap.get(day);
                  const isSelected = selectedDay === day;
                  const isToday = year === now.getFullYear() && month === now.getMonth() + 1 && day === now.getDate();
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setSelectedDay(day)}
                      className={cn(
                        "min-h-20 rounded-xl border p-2 text-left",
                        isSelected ? "border-amber-300 bg-amber-50 dark:bg-amber-400/10" : "border-stone-100 dark:border-stone-800",
                        isToday && "ring-1 ring-stone-900 dark:ring-stone-100"
                      )}
                    >
                      <span className="text-sm font-medium text-stone-800 dark:text-stone-100">{day}</span>
                      {counts?.total ? <p className="mt-1 text-[11px] text-stone-500">{counts.total} Meetings</p> : null}
                      <span className="mt-2 flex gap-1">
                        {counts?.planning ? <span className="h-1.5 w-1.5 rounded-full bg-orange-500" /> : null}
                        {counts?.followUp ? <span className="h-1.5 w-1.5 rounded-full bg-sky-600" /> : null}
                        {counts?.other ? <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-stone-500">
                <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-orange-500" /> Performance Planning</span>
                <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-sky-600" /> Follow-up</span>
                <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-600" /> Other Meeting</span>
              </div>
            </section>

            <section className={surfaceClass}>
              <div className="px-5 py-4">
                <h2 className="text-base font-semibold">
                  Meetings on {formatDate(selectedDate)} ({selectedMeetings.length})
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-y border-stone-100 text-[11px] uppercase tracking-wide text-stone-400 dark:border-stone-800">
                    <tr>
                      <th className="px-5 py-3">Time</th>
                      <th className="px-5 py-3">Meeting Title</th>
                      <th className="px-5 py-3">Meeting Type</th>
                      <th className="px-5 py-3">Participants</th>
                      <th className="px-5 py-3">Host</th>
                      <th className="px-5 py-3">Location</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedMeetings.map((meeting) => (
                      <tr key={meeting.id} className="border-b border-stone-50 dark:border-stone-800">
                        <td className="px-5 py-3">{formatTimeRange(meeting.scheduledAt, meeting.endAt)}</td>
                        <td className="px-5 py-3">
                          <Link to={meetingDetailPath(role, meeting.id, meeting.type)} className="font-medium hover:underline">
                            {meeting.title}
                          </Link>
                          <p className="text-xs text-stone-500">{meeting.employee.name}</p>
                        </td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-2">
                            <span className={cn("h-2 w-2 rounded-full", meetingTypeDot(meeting.type))} />
                            {meetingTypeLabel(meeting.type)}
                          </span>
                        </td>
                        <td className="px-5 py-3"><AvatarStack names={meeting.participants.map((item) => item.name)} /></td>
                        <td className="px-5 py-3">{meeting.createdBy.name}</td>
                        <td className="px-5 py-3">{meeting.location ?? "—"}</td>
                        <td className="px-5 py-3"><StatusBadge status={meeting.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {selectedMeetings.length === 0 ? <p className="px-5 py-8 text-sm text-stone-500">No meetings on this date.</p> : null}
              </div>
            </section>
          </div>

          <aside className="space-y-4">
            <section className={`${surfaceClass} p-4`}>
              <p className="text-sm font-medium">Upcoming Meetings</p>
              <div className="mt-3 space-y-3">
                {(data?.upcomingMeetings ?? []).map((meeting) => (
                  <Link key={meeting.id} to={meetingDetailPath(role, meeting.id, meeting.type)} className="block rounded-xl border border-stone-100 p-3 dark:border-stone-800">
                    <p className="text-xs text-stone-500">{formatDate(meeting.scheduledAt)}</p>
                    <p className="mt-1 text-sm font-medium">{meeting.title}</p>
                    <p className="text-xs text-stone-500">{formatTimeRange(meeting.scheduledAt, meeting.endAt)}</p>
                    <p className="mt-1 text-xs text-orange-700">{meetingTypeLabel(meeting.type)}</p>
                    <StatusBadge className="mt-2" status={meeting.status} />
                  </Link>
                ))}
                {(data?.upcomingMeetings.length ?? 0) === 0 ? <p className="text-sm text-stone-500">No upcoming meetings this month.</p> : null}
              </div>
            </section>
            <section className={`${surfaceClass} p-4`}>
              <p className="text-sm font-medium">Meeting Statistics</p>
              <p className="mt-1 text-xs text-stone-400">This month</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <Stat label="Total" value={data?.stats.monthTotal ?? data?.stats.total ?? 0} />
                <Stat label="Completed" value={data?.stats.completed ?? 0} />
                <Stat label="Upcoming" value={data?.stats.upcoming ?? 0} />
                <Stat label="Cancelled" value={data?.stats.cancelled ?? 0} />
                <Stat label="Attendance" value={`${data?.stats.attendanceRate ?? 0}%`} />
              </div>
            </section>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-stone-100 px-3 py-2 dark:border-stone-800">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="mt-1 font-semibold tabular-nums">{value}</p>
    </div>
  );
}
