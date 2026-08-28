import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import {
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  FileText,
  Shield,
  Users,
} from "lucide-react";
import DashboardLayout from "@/app/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { notificationCategoryStyle } from "@/components/corporate/CorporateUi";
import { formatDate, formatDateTime, formatTimeRange } from "@/features/hr/utils/dates";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useMyNotifications,
} from "@/features/auth/hooks/useAuth";
import { cn } from "@/lib/utils";
import { MeetingDetailCard, meetingDetailPath } from "@/features/meetings/components/MeetingDetailCard";
import { getPlanningMeetingRequest } from "@/features/meetings/services/meetings.api";
import type { PlanningMeeting } from "@/features/meetings/types";
import { OverlayModal } from "@/features/employees/components/OverlayModal";
import { StatusBadge } from "@/features/hr/components/StatusBadge";
import { useAuthStore } from "@/store/authStore";

const TABS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "meetings", label: "Meetings" },
  { id: "pdp", label: "PDP" },
  { id: "reviews", label: "Reviews" },
  { id: "system", label: "System" },
  { id: "employee", label: "Employee" },
] as const;

const CATEGORY_ICONS = {
  meetings: CalendarDays,
  pdp: FileText,
  reviews: ClipboardList,
  system: Shield,
  employee: Users,
} as const;

function groupByDay<T extends { id: string; createdAt: string }>(items: T[]) {
  const groups: Array<{ label: string; items: T[] }> = [];
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  for (const item of items) {
    const date = new Date(item.createdAt);
    let label = date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    if (date.toDateString() === today.toDateString()) label = "TODAY";
    else if (date.toDateString() === yesterday.toDateString()) label = "YESTERDAY";
    const existing = groups.find((group) => group.label === label);
    if (existing) existing.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}

function evaluationPathForRole(role: string | undefined, evaluationId: string) {
  if (role === "HR") return `/hr/evaluations/${evaluationId}`;
  if (role === "SUPERVISOR") return `/supervisor/evaluations/${evaluationId}`;
  return `/employee/results`;
}

function pdpPathForRole(role: string | undefined, pdpId: string) {
  if (role === "HR") return `/hr/pdp/${pdpId}`;
  if (role === "SUPERVISOR") return `/supervisor/pdp/${pdpId}`;
  return `/employee/pdp`;
}

export default function NotificationsPage() {
  const role = useAuthStore((state) => state.user?.role);
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all");
  const query = useMyNotifications(true, tab);
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();
  const notifications = query.data?.notifications ?? [];
  const counts = query.data?.counts;
  const [meeting, setMeeting] = useState<PlanningMeeting | null>(null);
  const grouped = useMemo(() => groupByDay(notifications), [notifications]);
  const meetingIds = useMemo(() => {
    const ids = new Set<string>();
    for (const item of notifications) {
      const meetingId = (item.metadata as { meetingId?: string } | null)?.meetingId;
      if (meetingId) ids.add(meetingId);
    }
    return [...ids];
  }, [notifications]);
  const meetingResults = useQueries({
    queries: meetingIds.map((meetingId) => ({
      queryKey: ["meetings", "planning", "detail", meetingId],
      queryFn: () => getPlanningMeetingRequest(meetingId),
      staleTime: 30_000,
      retry: false,
    })),
  });
  const meetingsById = useMemo(() => {
    const map = new Map<string, PlanningMeeting>();
    for (const result of meetingResults) {
      if (result.data?.meeting) map.set(result.data.meeting.id, result.data.meeting);
    }
    return map;
  }, [meetingResults]);

  return (
    <DashboardLayout>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-stone-900 dark:text-white">Notifications</h1>
              <p className="mt-1 text-sm text-stone-500">
                Stay updated with important activities across the organization.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
              <Check className="h-4 w-4" />
              Mark all as read
            </Button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-b border-stone-200 pb-3 dark:border-stone-800">
            {TABS.map((item) => {
              const count =
                item.id === "all" ? counts?.all : item.id === "unread" ? counts?.unread : counts?.[item.id];
              return (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-2 border-b-2 px-3 py-2 text-sm",
                    tab === item.id
                      ? "border-stone-900 font-medium text-stone-900 dark:border-stone-100 dark:text-white"
                      : "border-transparent text-stone-500 hover:text-stone-800"
                  )}
                  onClick={() => setTab(item.id)}
                >
                  {item.label}
                  {count ? (
                    <span className="rounded-full bg-stone-100 px-1.5 text-[11px] font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                      {count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="mt-5 space-y-6">
            {query.isLoading ? (
              <p className="text-sm text-stone-500">Loading notifications…</p>
            ) : notifications.length === 0 ? (
              <p className="text-sm text-stone-500">No notifications in this view.</p>
            ) : (
              grouped.map((group) => (
                <section key={group.label}>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">{group.label}</p>
                  <div className="mt-3 space-y-3">
                    {group.items.map((item) => {
                      const metadata = (item.metadata ?? {}) as {
                        meetingId?: string;
                        pdpId?: string;
                        evaluationId?: string;
                        assignmentId?: string;
                        requestId?: string;
                      };
                      const linkedMeeting = metadata.meetingId ? meetingsById.get(metadata.meetingId) : undefined;
                      const category = (item.category ?? "employee") as keyof typeof CATEGORY_ICONS;
                      const catStyle = notificationCategoryStyle(category);
                      const CategoryIcon = CATEGORY_ICONS[category] ?? Bell;
                      const pdpId = metadata.pdpId;
                      const isPdpSubmitted = item.type === "PDP_SUBMITTED" || item.type === "PDP_HR_FEEDBACK";
                      const isPdpApproved = item.type === "PDP_ASSIGNED" || item.title.toLowerCase().includes("approved");

                      return (
                        <article
                          key={item.id}
                          className={cn(
                            "rounded-2xl border border-stone-200 bg-white p-5 shadow-[0_1px_2px_rgba(28,25,23,0.04)] dark:border-stone-800 dark:bg-stone-900",
                            item.status === "UNREAD" && "ring-1 ring-stone-200 dark:ring-stone-700"
                          )}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", catStyle.bg)}>
                                <CategoryIcon className={cn("h-5 w-5", catStyle.icon)} />
                              </span>
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-medium text-stone-900 dark:text-white">{item.title}</p>
                                  {item.status === "UNREAD" ? (
                                    <span className="h-2 w-2 rounded-full bg-stone-400" />
                                  ) : null}
                                </div>
                                <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{item.message}</p>
                                <p className="mt-2 text-xs capitalize text-stone-400">
                                  {category} · {formatDateTime(item.createdAt)}
                                </p>
                              </div>
                            </div>
                          </div>

                          {linkedMeeting && linkedMeeting.status !== "COMPLETED" ? (
                            <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50/80 p-4 dark:border-stone-700 dark:bg-stone-950/50">
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                                Meeting confirmation required
                              </p>
                              <p className="mt-1 text-sm font-medium">{linkedMeeting.title}</p>
                              <p className="text-xs text-stone-500">
                                {formatDate(linkedMeeting.scheduledAt)} · {formatTimeRange(linkedMeeting.scheduledAt, linkedMeeting.endAt)}
                              </p>
                              <p className="mt-1 text-xs">
                                Employee: {linkedMeeting.employee.name} — {linkedMeeting.employeeResponse === "ACCEPTED" ? "Confirmed" : "Pending"}
                              </p>
                              <p className="text-xs">
                                Supervisor: {linkedMeeting.supervisor?.name ?? "—"} — {linkedMeeting.supervisorResponse === "ACCEPTED" ? "Confirmed" : "Pending"}
                              </p>
                              <StatusBadge className="mt-2" status={linkedMeeting.status} />
                              <div className="mt-3">
                                <MeetingDetailCard meeting={linkedMeeting} role={role ?? "EMPLOYEE"} showNotesForm={false} />
                              </div>
                            </div>
                          ) : null}

                          <div className="mt-4 flex flex-wrap gap-2">
                            {item.status === "UNREAD" ? (
                              <Button type="button" size="sm" variant="outline" onClick={() => markRead.mutate(item.id)}>
                                Mark as read
                              </Button>
                            ) : null}
                            {metadata.meetingId && linkedMeeting ? (
                              <Link to={meetingDetailPath(role ?? "EMPLOYEE", linkedMeeting.id, linkedMeeting.type)}>
                                <Button type="button" size="sm" variant="outline">View Meeting</Button>
                              </Link>
                            ) : metadata.meetingId ? (
                              <Button type="button" size="sm" variant="outline" onClick={async () => {
                                const response = await getPlanningMeetingRequest(metadata.meetingId!);
                                setMeeting(response.meeting);
                              }}>
                                View Meeting
                              </Button>
                            ) : null}
                            {pdpId && isPdpSubmitted && (role === "HR" || role === "SUPERVISOR") ? (
                              <Link to={pdpPathForRole(role, pdpId)}>
                                <Button type="button" size="sm">Review PDP</Button>
                              </Link>
                            ) : null}
                            {pdpId && (isPdpApproved || item.category === "pdp") && !isPdpSubmitted ? (
                              <Link to={pdpPathForRole(role, pdpId)}>
                                <Button type="button" size="sm" variant="outline">View PDP</Button>
                              </Link>
                            ) : null}
                            {metadata.evaluationId ? (
                              <Link to={evaluationPathForRole(role, metadata.evaluationId)}>
                                <Button type="button" size="sm" variant="outline">
                                  Open evaluation
                                </Button>
                              </Link>
                            ) : null}
                            {item.type === "PEER_REVIEW_ASSIGNED" && role === "EMPLOYEE" ? (
                              <Link to="/employee/peer-reviews">
                                <Button type="button" size="sm" variant="outline">
                                  Open peer review
                                </Button>
                              </Link>
                            ) : null}
                            {item.type === "APPRAISAL_REVIEW_REQUESTED" && role === "HR" ? (
                              <Link to="/hr/review-requests">
                                <Button type="button" size="sm" variant="outline">
                                  Review requests
                                </Button>
                              </Link>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              ))
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_1px_2px_rgba(28,25,23,0.04)] dark:border-stone-800 dark:bg-stone-900">
            <p className="text-sm font-medium">Notification Summary</p>
            <div className="mt-3 grid grid-cols-1 gap-2 text-sm">
              <Stat icon={Bell} label="Unread" value={counts?.unread ?? 0} />
              <Stat icon={CheckCircle2} label="Total Notifications" value={counts?.all ?? 0} />
              <Stat icon={CalendarDays} label="Meeting Related" value={counts?.meetings ?? 0} />
              <Stat icon={FileText} label="PDP Related" value={counts?.pdp ?? 0} />
              <Stat icon={ClipboardList} label="Reviews" value={counts?.reviews ?? 0} />
              <Stat icon={Users} label="Employee Related" value={counts?.employee ?? 0} />
              <Stat icon={Shield} label="System Alerts" value={counts?.system ?? 0} />
            </div>
          </section>
          <section className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
            <p className="text-sm font-medium">Quick Filters</p>
            <div className="mt-3 flex flex-col gap-1">
              {TABS.filter((item) => item.id !== "all").map((item) => {
                const count =
                  item.id === "unread" ? counts?.unread : counts?.[item.id as keyof typeof counts];
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={cn(
                      "flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-stone-50 dark:hover:bg-stone-950",
                      tab === item.id && "bg-stone-50 font-medium dark:bg-stone-950"
                    )}
                    onClick={() => setTab(item.id)}
                  >
                    <span>{item.label}</span>
                    {count ? <span className="text-xs text-stone-400">{count}</span> : null}
                  </button>
                );
              })}
            </div>
          </section>
        </aside>
      </div>

      <OverlayModal open={Boolean(meeting)} title={meeting?.title ?? "Meeting"} onClose={() => setMeeting(null)} wide>
        {meeting ? <MeetingDetailCard meeting={meeting} role={role ?? "EMPLOYEE"} /> : null}
      </OverlayModal>
    </DashboardLayout>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Bell; label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-stone-100 px-3 py-2.5 dark:border-stone-800">
      <div className="flex items-center gap-2 text-stone-600 dark:text-stone-300">
        <Icon className="h-4 w-4 text-stone-400" />
        <span>{label}</span>
      </div>
      <span className="font-semibold tabular-nums text-stone-900 dark:text-white">{value}</span>
    </div>
  );
}
