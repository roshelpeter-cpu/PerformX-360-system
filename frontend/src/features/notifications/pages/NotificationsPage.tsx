// Personal notification inbox. Each signed-in user only sees their own recipientId rows.
import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { Bell, CalendarDays, CheckCircle2, FileText, Shield, Users } from "lucide-react";
import DashboardLayout from "@/app/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/features/hr/utils/dates";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useMyNotifications,
} from "@/features/auth/hooks/useAuth";
import { cn } from "@/lib/utils";
import { OverlayModal } from "@/features/employees/components/OverlayModal";
import { MeetingDetailCard } from "@/features/meetings/components/MeetingDetailCard";
import { getPlanningMeetingRequest } from "@/features/meetings/services/meetings.api";
import type { PlanningMeeting } from "@/features/meetings/types";
import { useAuthStore } from "@/store/authStore";

const TABS = [
  { id: "all", label: "All" },
  { id: "unread", label: "Unread" },
  { id: "meetings", label: "Meetings" },
  { id: "pdp", label: "PDP" },
  { id: "reviews", label: "Reviews" },
  { id: "system", label: "System" },
  { id: "employee", label: "Employee Related" },
] as const;

function groupByDay<T extends { id: string; createdAt: string }>(items: T[]) {
  const groups: Array<{ label: string; items: T[] }> = [];
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  for (const item of items) {
    const date = new Date(item.createdAt);
    let label = date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    if (date.toDateString() === today.toDateString()) label = "TODAY";
    else if (date.toDateString() === yesterday.toDateString()) label = "YESTERDAY";
    const existing = groups.find((group) => group.label === label);
    if (existing) existing.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
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

  async function openMeeting(meetingId: string) {
    const response = await getPlanningMeetingRequest(meetingId);
    setMeeting(response.meeting);
  }

  return (
    <DashboardLayout>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-stone-900 dark:text-white">
                Notifications
              </h1>
              <p className="mt-1 text-sm text-stone-500">
                Stay updated with important activities across the organization.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
            >
              Mark all as read
            </Button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-b border-stone-200 pb-3 dark:border-stone-800">
            {TABS.map((item) => {
              const count =
                item.id === "all"
                  ? counts?.all
                  : item.id === "unread"
                    ? counts?.unread
                    : counts?.[item.id];
              return (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm",
                    tab === item.id
                      ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950"
                      : "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-900"
                  )}
                  onClick={() => setTab(item.id)}
                >
                  {item.label}
                  {count ? ` (${count})` : ""}
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
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                    {group.label}
                  </p>
                  <div className="mt-3 space-y-3">
                    {group.items.map((item) => {
                      const metadata = (item.metadata ?? {}) as { meetingId?: string };
                      const linkedMeeting = metadata.meetingId
                        ? meetingsById.get(metadata.meetingId)
                        : undefined;
                      return (
                        <article
                          key={item.id}
                          className={cn(
                            "rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900",
                            item.status === "UNREAD" && "border-stone-300 dark:border-stone-600"
                          )}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                {item.status === "UNREAD" ? (
                                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                                ) : null}
                                <p className="font-medium text-stone-900 dark:text-white">
                                  {item.title}
                                </p>
                              </div>
                              <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
                                {item.message}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-stone-400">
                                {formatDateTime(item.createdAt)}
                              </p>
                              <span className="mt-1 inline-flex rounded-md bg-stone-100 px-2 py-0.5 text-[11px] dark:bg-stone-800">
                                {item.category}
                              </span>
                            </div>
                          </div>
                          {linkedMeeting ? (
                            <div className="mt-3">
                              <MeetingDetailCard
                                meeting={linkedMeeting}
                                role={role ?? "EMPLOYEE"}
                                showNotesForm={false}
                              />
                            </div>
                          ) : null}
                          <div className="mt-3 flex flex-wrap gap-2">
                            {item.status === "UNREAD" ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => markRead.mutate(item.id)}
                              >
                                Mark as read
                              </Button>
                            ) : null}
                            {metadata.meetingId && !linkedMeeting ? (
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => openMeeting(metadata.meetingId!)}
                              >
                                View meeting
                              </Button>
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
          <section className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
            <p className="text-sm font-medium">Notification summary</p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <Stat icon={Bell} label="Unread" value={counts?.unread ?? 0} />
              <Stat icon={CheckCircle2} label="Total" value={counts?.all ?? 0} />
              <Stat icon={CalendarDays} label="Meetings" value={counts?.meetings ?? 0} />
              <Stat icon={FileText} label="PDP" value={counts?.pdp ?? 0} />
              <Stat icon={Users} label="Employee" value={counts?.employee ?? 0} />
              <Stat icon={Shield} label="System" value={counts?.system ?? 0} />
            </div>
          </section>
        </aside>
      </div>

      <OverlayModal
        open={Boolean(meeting)}
        title={meeting?.title ?? "Meeting"}
        onClose={() => setMeeting(null)}
        wide
      >
        {meeting ? (
          <MeetingDetailCard meeting={meeting} role={role ?? "EMPLOYEE"} />
        ) : null}
      </OverlayModal>
    </DashboardLayout>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Bell;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-stone-200 px-3 py-2 dark:border-stone-800">
      <Icon className="h-4 w-4 text-stone-400" />
      <p className="mt-2 text-lg font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-stone-500">{label}</p>
    </div>
  );
}
