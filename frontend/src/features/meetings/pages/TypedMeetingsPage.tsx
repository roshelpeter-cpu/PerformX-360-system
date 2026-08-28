import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/app/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { PageHeader, surfaceClass } from "@/components/corporate/CorporateUi";
import { StatusBadge } from "@/features/hr/components/StatusBadge";
import { fieldClass } from "@/features/hr/components/ActionMenu";
import { formatDate } from "@/features/hr/utils/dates";
import { useAuthStore } from "@/store/authStore";
import { meetingDetailPath } from "../components/MeetingDetailCard";
import {
  MeetingCalendarCard,
  MeetingRequestsPanel,
  MeetingStatCards,
  MeetingSummaryPanel,
  MeetingTabs,
  NextSevenDaysPanel,
  PlanningStyleTable,
  UpcomingMeetingsPanel,
} from "../components/MeetingWorkspace";
import {
  useFollowUpMeetings,
  useOtherMeetings,
  useScheduleFollowUpMeeting,
  useScheduleOtherMeeting,
} from "../hooks/useMeetings";

export default function TypedMeetingsPage({ kind }: { kind: "follow-up" | "other" }) {
  const role = useAuthStore((state) => state.user?.role) ?? "EMPLOYEE";
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [employeeId, setEmployeeId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pdpStartDate, setPdpStartDate] = useState("");
  const [tab, setTab] = useState(kind === "follow-up" ? "schedule" : "upcoming");
  const [showSchedule, setShowSchedule] = useState(false);
  const [applied, setApplied] = useState({ employeeId: "", from: "", to: "", pdpStartDate: "" });
  const [form, setForm] = useState({ date: "", time: "10:30", location: "Microsoft Teams", title: "" });
  const followUp = useFollowUpMeetings({
    page,
    employeeId: applied.employeeId,
    pdpStartDate: applied.pdpStartDate,
    from: applied.from,
    to: applied.to,
    tab: kind === "follow-up" ? (tab === "history" ? "history" : "schedule") : undefined,
  });
  const other = useOtherMeetings({
    page,
    employeeId: applied.employeeId,
    from: applied.from,
    to: applied.to,
    tab: tab === "history" ? "history" : "schedule",
  });
  const query = kind === "follow-up" ? followUp : other;
  const scheduleFollowUp = useScheduleFollowUpMeeting();
  const scheduleOther = useScheduleOtherMeeting();
  const data = query.data;
  const selected = data?.pdpEmployees?.find((item) => item.id === applied.employeeId);
  const title = kind === "follow-up" ? "Follow-up Meetings" : "Other Meetings";
  const crumbRole = role === "HR" ? "HR" : role === "SUPERVISOR" ? "Supervisor" : "Home";
  const canSchedule = role !== "EMPLOYEE";

  function applyFilters() {
    setApplied({ employeeId, from, to, pdpStartDate });
    setPage(1);
  }

  function exportRows() {
    const rows = data?.meetings ?? [];
    const csv = [
      ["Title", "Employee", "Date", "Status", "Location"].join(","),
      ...rows.map((meeting) =>
        [meeting.title, meeting.employee.name, meeting.scheduledAt, meeting.status, meeting.location ?? ""]
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${kind}-meetings.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          crumbs={`${crumbRole} / Meeting Management / ${title}`}
          title={title}
          description={
            kind === "follow-up"
              ? "System-generated follow-up meetings for employees based on approved PDPs."
              : "Issue-resolution and other meetings, including redirected PDP discussions."
          }
          action={
            canSchedule ? (
              <Button type="button" onClick={() => setShowSchedule(true)}>
                {kind === "follow-up" ? "Add additional meeting" : "Schedule Meeting"}
              </Button>
            ) : undefined
          }
        />

        <MeetingStatCards
          items={
            kind === "follow-up"
              ? [
                  { label: "Total Follow-up Meetings", value: data?.stats?.total ?? 0, accent: "orange" },
                  { label: "Completed Meetings", value: data?.stats?.completed ?? 0, accent: "green" },
                  { label: "Upcoming Meetings", value: data?.stats?.upcoming ?? 0, accent: "blue" },
                  { label: "Rescheduled Meetings", value: data?.stats?.rescheduled ?? 0, accent: "red" },
                ]
              : [
                  { label: "Upcoming Meetings", value: data?.stats?.upcoming ?? 0, accent: "blue", icon: "calendar" },
                  { label: "Completed Meetings", value: data?.stats?.completed ?? 0, accent: "green", icon: "check" },
                  { label: "Pending Requests", value: data?.confirmationQueue?.length ?? 0, accent: "orange", icon: "clock" },
                  { label: "Total Meetings", value: data?.stats?.total ?? 0, icon: "users" },
                ]
          }
        />

        {kind === "follow-up" ? (
          <section className={`${surfaceClass} p-5`}>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="text-sm">
                <span className="mb-1 block text-xs text-stone-500">Employee</span>
                <select className={fieldClass} value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
                  <option value="">All employees</option>
                  {(data?.pdpEmployees ?? []).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} ({item.employeeId})
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs text-stone-500">Appraisal Cycle</span>
                <select className={fieldClass} defaultValue="">
                  <option value="">{data?.cycle?.name ?? "Current appraisal cycle"}</option>
                </select>
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs text-stone-500">PDP / start date</span>
                <input type="date" className={fieldClass} value={pdpStartDate} onChange={(event) => setPdpStartDate(event.target.value)} />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-xs text-stone-500">Date filter</span>
                <input type="date" className={fieldClass} value={from} onChange={(event) => setFrom(event.target.value)} />
              </label>
            </div>
            <div className="mt-4 flex gap-2">
              <Button type="button" onClick={applyFilters}>
                Filter
              </Button>
              <Button type="button" variant="outline" onClick={exportRows}>
                Export
              </Button>
            </div>
          </section>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={applyFilters}>
              Filter
            </Button>
            <input type="date" className={`${fieldClass} w-40`} value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
            <input type="date" className={`${fieldClass} w-40`} value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
          </div>
        )}

        {kind === "follow-up" && selected ? (
          <section className="rounded-2xl border border-sky-100 bg-sky-50/70 p-5 dark:border-sky-900/40 dark:bg-sky-950/20">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-lg font-semibold">{selected.name}</p>
                <p className="text-sm text-stone-500">{selected.employeeId}</p>
                <div className="mt-3 flex items-center gap-2 text-sm">
                  <span className="text-stone-500">PDP status</span>
                  <StatusBadge status={selected.pdpStatus} />
                </div>
                <p className="mt-2 text-sm text-stone-600">Scheduled follow-up meetings: {selected.scheduledCount}</p>
              </div>
              <div className="text-sm">
                <p>
                  <span className="text-stone-500">Position / Department: </span>
                  {selected.jobTitle ?? "—"}
                  {selected.department ? ` · ${selected.department.name}` : ""}
                </p>
                <p className="mt-2">
                  <span className="text-stone-500">PDP starting date: </span>
                  {formatDate(selected.pdpStartDate)}
                </p>
                <p className="mt-2">
                  <span className="text-stone-500">Supervisor: </span>
                  {selected.supervisor?.name ?? "—"}
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {showSchedule && canSchedule ? (
          <form
            className={`${surfaceClass} space-y-3 p-5`}
            onSubmit={(event) => {
              event.preventDefault();
              const scheduledAt = new Date(`${form.date}T${form.time}:00`).toISOString();
              const targetEmployee = employeeId || applied.employeeId;
              if (kind === "follow-up") {
                scheduleFollowUp.mutate({ employeeId: targetEmployee, scheduledAt, location: form.location });
              } else {
                scheduleOther.mutate({
                  employeeId: targetEmployee,
                  scheduledAt,
                  location: form.location,
                  title: form.title || undefined,
                });
              }
              setShowSchedule(false);
              setTab(kind === "follow-up" ? "schedule" : "upcoming");
            }}
          >
            {kind === "other" ? (
              <input className={fieldClass} placeholder="Meeting title" value={form.title} onChange={(event) => setForm((c) => ({ ...c, title: event.target.value }))} />
            ) : null}
            <select className={fieldClass} value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} required>
              <option value="">Select employee</option>
              {(data?.pdpEmployees ?? []).map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.employeeId})
                </option>
              ))}
            </select>
            <div className="grid gap-3 sm:grid-cols-3">
              <input type="date" className={fieldClass} value={form.date} onChange={(event) => setForm((c) => ({ ...c, date: event.target.value }))} required />
              <input type="time" className={fieldClass} value={form.time} onChange={(event) => setForm((c) => ({ ...c, time: event.target.value }))} required />
              <input className={fieldClass} value={form.location} onChange={(event) => setForm((c) => ({ ...c, location: event.target.value }))} placeholder="Location or meeting link" />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={scheduleFollowUp.isPending || scheduleOther.isPending}>
                Save meeting
              </Button>
              <Button type="button" variant="outline" onClick={() => setShowSchedule(false)}>
                Cancel
              </Button>
            </div>
          </form>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-4">
            <MeetingTabs
              tab={tab}
              onChange={(value) => {
                setTab(value);
                setPage(1);
                if (kind === "other" && value === "schedule") setShowSchedule(true);
              }}
              items={
                kind === "follow-up"
                  ? [
                      ["schedule", "Follow-up Schedule"],
                      ["history", "Meeting History"],
                    ]
                  : [
                      ["upcoming", "Upcoming Meetings"],
                      ["history", "Meeting History"],
                      ...(canSchedule ? [["schedule", "Schedule Meeting"] as [string, string]] : []),
                    ]
              }
            />
            {tab === "schedule" && kind === "other" && canSchedule ? (
              <p className="text-sm text-stone-500">Use the schedule form above. Only the meeting creator can manage that meeting.</p>
            ) : (
              <PlanningStyleTable
              loading={query.isLoading}
              meetings={data?.meetings ?? []}
              page={data?.page}
              totalPages={data?.totalPages}
              total={data?.total}
              pageSize={data?.pageSize}
              onPageChange={setPage}
              onSelect={(meeting) => navigate(meetingDetailPath(role, meeting.id, meeting.type))}
              variant={kind}
            />
            )}
            {kind === "follow-up" && tab !== "history" ? (
              <div className={`${surfaceClass} flex flex-wrap items-center justify-between gap-3 p-4`}>
                <div>
                  <p className="text-sm font-medium">Additional follow-up meetings</p>
                  <p className="text-sm text-stone-500">
                    {(data?.meetings ?? []).some((item) => item.isAdditionalFollowUp)
                      ? `${(data?.meetings ?? []).filter((item) => item.isAdditionalFollowUp).length} additional meeting(s) in this view.`
                      : "No additional follow-up meetings."}
                  </p>
                </div>
                {canSchedule ? (
                  <Button type="button" variant="outline" onClick={() => setShowSchedule(true)}>
                    Add additional meeting
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
          <aside className="space-y-4">
            <MeetingCalendarCard dates={data?.calendarDates?.map((value) => String(value))} kind={kind === "follow-up" ? "followUp" : "other"} />
            {kind === "follow-up" ? (
              <>
                <UpcomingMeetingsPanel meetings={data?.meetings ?? []} role={role} />
                <MeetingRequestsPanel meetings={data?.confirmationQueue ?? []} role={role} />
                <MeetingSummaryPanel
                  scheduled={data?.stats?.scheduled ?? 0}
                  cancelled={data?.stats?.cancelled ?? 0}
                  completed={data?.stats?.completed ?? 0}
                  upcoming={data?.stats?.upcoming ?? 0}
                />
              </>
            ) : (
              <>
                <MeetingRequestsPanel meetings={data?.confirmationQueue ?? []} role={role} />
                <NextSevenDaysPanel meetings={data?.nextSevenDays ?? []} role={role} />
              </>
            )}
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}
