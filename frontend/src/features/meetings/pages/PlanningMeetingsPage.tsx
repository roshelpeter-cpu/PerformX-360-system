import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/app/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/corporate/CorporateUi";
import { fieldClass } from "@/features/hr/components/ActionMenu";
import { useAuthStore } from "@/store/authStore";
import { meetingDetailPath } from "../components/MeetingDetailCard";
import {
  MeetingCalendarCard,
  MeetingRequestsPanel,
  MeetingStatCards,
  MeetingTabs,
  NextSevenDaysPanel,
  PlanningStyleTable,
} from "../components/MeetingWorkspace";
import {
  usePlanningMeetings,
  useSchedulableEmployees,
  useSchedulePlanningMeeting,
} from "../hooks/useMeetings";

export default function PlanningMeetingsPage() {
  const role = useAuthStore((state) => state.user?.role) ?? "EMPLOYEE";
  const navigate = useNavigate();
  const [tab, setTab] = useState<"upcoming" | "history" | "schedule">("upcoming");
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState({ from: "", to: "" });
  const listQuery = usePlanningMeetings({
    tab: tab === "schedule" ? "upcoming" : tab,
    from: applied.from || undefined,
    to: applied.to || undefined,
    page,
  });
  const data = listQuery.data;
  const employeesQuery = useSchedulableEmployees(tab === "schedule" && role === "HR");
  const schedule = useSchedulePlanningMeeting();
  const [form, setForm] = useState({
    employeeId: "",
    date: "",
    time: "10:30",
    location: "Meeting Room A, Head Office",
  });
  const crumbRole = role === "HR" ? "HR" : role === "SUPERVISOR" ? "Supervisor" : "Home";
  const tabs = useMemo(() => {
    const items: Array<[string, string]> = [
      ["upcoming", "Upcoming Meetings"],
      ["history", "Meeting History"],
    ];
    if (role === "HR") items.push(["schedule", "Schedule Meeting"]);
    return items;
  }, [role]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          crumbs={`${crumbRole} / Meeting Management / Performance Planning Meeting`}
          title="Performance Planning Meeting"
          description="Schedule and track performance planning meetings. Notes are written by the supervisor after the meeting is completed."
          action={
            role === "HR" ? (
              <Button type="button" onClick={() => setTab("schedule")}>
                Schedule Meeting
              </Button>
            ) : undefined
          }
        />
        <MeetingStatCards
          items={[
            { label: "Upcoming Meetings", value: data?.stats.upcoming ?? 0, accent: "blue", icon: "calendar" },
            { label: "Completed Meetings", value: data?.stats.completed ?? 0, accent: "green", icon: "check" },
            { label: "Pending Requests", value: data?.stats.pendingRequests ?? 0, accent: "orange", icon: "clock" },
            { label: "Total Meetings", value: data?.stats.total ?? 0, icon: "users" },
          ]}
        />
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-4">
            <MeetingTabs
              tab={tab}
              onChange={(value) => {
                setTab(value as typeof tab);
                setPage(1);
              }}
              items={tabs}
            />
            {tab !== "schedule" ? (
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="outline" onClick={() => { setApplied({ from, to }); setPage(1); }}>
                  Filter
                </Button>
                <input type="date" className={`${fieldClass} w-40`} value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
                <input type="date" className={`${fieldClass} w-40`} value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
              </div>
            ) : null}
            {tab === "schedule" && role === "HR" ? (
              <form
                className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900"
                onSubmit={(event) => {
                  event.preventDefault();
                  schedule.mutate({
                    employeeId: form.employeeId,
                    scheduledAt: new Date(`${form.date}T${form.time}:00`).toISOString(),
                    location: form.location,
                  });
                  setTab("upcoming");
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
                <Button type="submit" disabled={schedule.isPending}>
                  Schedule meeting
                </Button>
              </form>
            ) : (
              <PlanningStyleTable
                loading={listQuery.isLoading}
                meetings={data?.meetings ?? []}
                page={data?.page}
                totalPages={data?.totalPages}
                total={data?.total}
                pageSize={data?.pageSize}
                onPageChange={setPage}
                onSelect={(meeting) => navigate(meetingDetailPath(role, meeting.id, meeting.type))}
              />
            )}
          </div>
          <aside className="space-y-4">
            <MeetingCalendarCard dates={data?.calendarDates} kind="planning" />
            <MeetingRequestsPanel meetings={data?.confirmationQueue ?? []} role={role} />
            <NextSevenDaysPanel meetings={data?.nextSevenDays ?? []} role={role} />
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}
