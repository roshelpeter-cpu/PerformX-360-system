import {
  Building2,
  CalendarRange,
  Layers3,
  UserRound,
} from "lucide-react";
import { formatRoleLabel } from "@/constants/roles";
import { StatusBadge } from "@/features/hr/components/StatusBadge";
import { formatDate } from "@/features/hr/utils/dates";
import type { DashboardPayload } from "@/features/dashboard/services/dashboard.api";
import { cn } from "@/lib/utils";

export default function AppraisalSnapshotBanner({
  data,
}: {
  data: DashboardPayload;
}) {
  const { profile, cycle, batch, supervisor } = data;

  return (
    <section className="overflow-hidden rounded-3xl border border-stone-200/80 bg-white/90 shadow-[0_12px_40px_rgba(28,25,23,0.06)] dark:border-stone-800 dark:bg-stone-950/80">
      <div className="flex flex-col gap-4 border-b border-stone-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-stone-800">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-300">
            My Appraisal Snapshot
          </p>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-yellow-500 text-sm font-semibold text-stone-950">
              {profile.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-stone-900 dark:text-white">
                {profile.name}
              </h2>
              <p className="text-sm text-stone-500">
                {profile.employeeId} · {formatRoleLabel(profile.role)}
                {profile.jobTitle ? ` · ${profile.jobTitle}` : ""}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-0 sm:grid-cols-2 xl:grid-cols-4">
        <SnapshotCell
          icon={CalendarRange}
          iconClass="bg-violet-100 text-violet-700 dark:bg-violet-400/20 dark:text-violet-300"
          title="Appraisal Cycle"
          value={cycle?.name ?? "Not assigned"}
          badgeStatus={cycle?.status}
          detail={
            cycle
              ? `${formatDate(cycle.startDate)} – ${formatDate(cycle.endDate)}`
              : "No active cycle"
          }
        />
        <SnapshotCell
          icon={Layers3}
          iconClass="bg-sky-100 text-sky-700 dark:bg-sky-400/20 dark:text-sky-300"
          title="My Batch"
          value={batch?.name ?? "Not assigned"}
          detail={
            batch?.startDate && batch?.endDate
              ? `${formatDate(batch.startDate)} – ${formatDate(batch.endDate)}`
              : "Awaiting batch assignment"
          }
        />
        <SnapshotCell
          icon={UserRound}
          iconClass="bg-orange-100 text-orange-700 dark:bg-orange-400/20 dark:text-orange-300"
          title="My Supervisor"
          value={supervisor?.name ?? "Not assigned"}
          detail={
            supervisor
              ? [supervisor.jobTitle, supervisor.employeeId]
                  .filter(Boolean)
                  .join(" · ")
              : "Awaiting supervisor assignment"
          }
        />
        <SnapshotCell
          icon={Building2}
          iconClass="bg-emerald-100 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-300"
          title="Department"
          value={profile.department?.name ?? "Unassigned"}
          detail={[
            profile.role ? `Role: ${formatRoleLabel(profile.role)}` : null,
            profile.jobTitle ? `Designation: ${profile.jobTitle}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
          last
        />
      </div>
    </section>
  );
}

function SnapshotCell({
  icon: Icon,
  iconClass,
  title,
  value,
  detail,
  badgeStatus,
  last,
}: {
  icon: typeof CalendarRange;
  iconClass: string;
  title: string;
  value: string;
  detail: string;
  badgeStatus?: string;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 px-5 py-4",
        !last &&
          "border-b border-stone-100 sm:border-b-0 sm:border-r dark:border-stone-800"
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
          iconClass
        )}
      >
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-400">
          {title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-stone-900 dark:text-white">
            {value}
          </p>
          {badgeStatus === "ACTIVE" ? (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">
              In Progress
            </span>
          ) : badgeStatus ? (
            <StatusBadge status={badgeStatus} />
          ) : null}
        </div>
        <p className="mt-1 text-xs leading-5 text-stone-500">{detail}</p>
      </div>
    </div>
  );
}
