import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

export const surfaceClass =
  "rounded-2xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.06)] dark:border-stone-800 dark:bg-stone-900";

export const tableHeadClass =
  "border-y border-stone-100 text-[11px] uppercase tracking-wide text-stone-400 dark:border-stone-800";

export const tableRowClass =
  "border-b border-stone-50 transition-colors hover:bg-stone-50/80 dark:border-stone-800 dark:hover:bg-stone-950/50";

export const tableCellClass = "px-5 py-3.5";

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function PageHeader({
  crumbs,
  title,
  description,
  action,
}: {
  crumbs?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        {crumbs ? <p className="text-xs text-stone-500">{crumbs}</p> : null}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-stone-900 dark:text-white">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-500">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  accent,
  icon,
  highlight,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  accent?: "orange" | "green" | "blue" | "red" | "stone";
  icon?: ReactNode;
  highlight?: boolean;
}) {
  const bar = {
    orange: "bg-orange-500",
    green: "bg-emerald-600",
    blue: "bg-sky-600",
    red: "bg-rose-600",
    stone: "bg-stone-400",
  }[accent ?? "stone"];
  return (
    <div
      className={cn(
        surfaceClass,
        "relative overflow-hidden p-4",
        highlight && "ring-1 ring-orange-300"
      )}
    >
      <span className={cn("absolute inset-x-0 top-0 h-0.5", bar)} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
          <p
            className={cn(
              "mt-2 text-2xl font-semibold tabular-nums",
              highlight ? "text-orange-700 dark:text-orange-300" : "text-stone-900 dark:text-white"
            )}
          >
            {value}
          </p>
          {hint ? <p className="mt-1 text-xs text-stone-500">{hint}</p> : null}
        </div>
        {icon ? <div className="text-stone-400">{icon}</div> : null}
      </div>
    </div>
  );
}

export function FilterTabs<T extends string>({
  value,
  onChange,
  items,
}: {
  value: T;
  onChange: (value: T) => void;
  items: Array<{ id: T; label: string; count?: number }>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm",
            value === item.id
              ? "border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-950"
              : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300"
          )}
        >
          {item.label}
          {typeof item.count === "number" ? (
            <span
              className={cn(
                "rounded-full px-1.5 text-[11px] font-semibold",
                value === item.id ? "bg-white/20" : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
              )}
            >
              {item.count}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

export function ProgressBar({
  value,
  tone = "stone",
}: {
  value: number;
  tone?: "stone" | "orange" | "green" | "blue";
}) {
  const color = {
    stone: "bg-stone-700",
    orange: "bg-orange-500",
    green: "bg-emerald-600",
    blue: "bg-sky-600",
  }[tone];
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
      <div className={cn("h-full rounded-full", color)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function AvatarStack({
  names,
}: {
  names: string[];
}) {
  return (
    <div className="flex -space-x-1">
      {names.slice(0, 4).map((name) => (
        <span
          key={name}
          title={name}
          className="flex h-7 w-7 items-center justify-center rounded-full border border-white bg-stone-200 text-[10px] font-semibold dark:border-stone-900 dark:bg-stone-700"
        >
          {initials(name)}
        </span>
      ))}
    </div>
  );
}

export function MiniCalendar({
  marked,
  selected,
  onSelect,
}: {
  marked?: Map<number, Array<"planning" | "followUp" | "other">>;
  selected?: number;
  onSelect?: (day: number) => void;
}) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = first.getDay();
  const today = now.getDate();
  return (
    <div className={cn(surfaceClass, "p-4")}>
      <p className="text-sm font-medium">
        {now.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
      </p>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] text-stone-400">
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <span key={`${day}-${index}`}>{day}</span>
        ))}
        {Array.from({ length: startWeekday }).map((_, index) => (
          <span key={`empty-${index}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;
          const dots = marked?.get(day) ?? [];
          const isToday = today === day;
          const isSelected = selected === day;
          return (
            <button
              key={day}
              type="button"
              onClick={() => onSelect?.(day)}
              className={cn(
                "flex h-9 flex-col items-center justify-center rounded-lg text-xs",
                isSelected && "bg-amber-100 font-semibold dark:bg-amber-400/20",
                isToday && !isSelected && "ring-1 ring-stone-900 dark:ring-stone-100"
              )}
            >
              {day}
              {dots.length > 0 ? (
                <span className="mt-0.5 flex gap-0.5">
                  {dots.slice(0, 3).map((kind) => (
                    <span
                      key={kind}
                      className={cn(
                        "h-1 w-1 rounded-full",
                        kind === "planning" && "bg-orange-500",
                        kind === "followUp" && "bg-sky-600",
                        kind === "other" && "bg-emerald-600"
                      )}
                    />
                  ))}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DonutChart({
  total,
  slices,
}: {
  total: number;
  slices: Array<{ label: string; value: number; color: string }>;
}) {
  const data = slices.map((item) => ({ name: item.label, value: item.value, color: item.color }));
  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="relative h-48 w-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={58} outerRadius={80} paddingAngle={2} stroke="none">
              {data.map((item) => (
                <Cell key={item.name} fill={item.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-2xl font-semibold tabular-nums">{total}</p>
          <p className="text-[11px] uppercase tracking-wide text-stone-400">Total Meetings</p>
        </div>
      </div>
      <div className="min-w-[220px] space-y-3 text-sm">
        {slices.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
              <span>{item.label}</span>
            </div>
            <span className="tabular-nums text-stone-500">
              {item.value} · {total ? Math.round((item.value / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function meetingTypeLabel(type?: string) {
  if (type === "PERFORMANCE_PLANNING") return "Performance Planning";
  if (type === "FOLLOW_UP") return "Follow-up";
  if (type === "PDP_DISAGREEMENT") return "Other Meeting";
  if (type === "OTHER") return "Other Meeting";
  return type?.replaceAll("_", " ") ?? "Meeting";
}

export function meetingTypeDot(type?: string) {
  if (type === "PERFORMANCE_PLANNING") return "bg-orange-500";
  if (type === "FOLLOW_UP") return "bg-sky-600";
  return "bg-emerald-600";
}

export function DataTable({
  children,
  emptyMessage,
  isEmpty,
}: {
  children: ReactNode;
  emptyMessage?: string;
  isEmpty?: boolean;
}) {
  return (
    <div className={`${surfaceClass} overflow-x-auto`}>
      <table className="min-w-full text-left text-sm">{children}</table>
      {isEmpty && emptyMessage ? (
        <p className="px-5 py-8 text-sm text-stone-500">{emptyMessage}</p>
      ) : null}
    </div>
  );
}

export function QuickActionBar({
  actions,
}: {
  actions: Array<{ label: string; to: string; variant?: "primary" | "outline" }>;
}) {
  return (
    <section className={`${surfaceClass} p-4`}>
      <p className="mb-3 text-sm font-medium text-stone-700 dark:text-stone-200">Quick Actions</p>
      <div className="flex flex-wrap gap-2">
        {actions.map((action) =>
          action.variant === "outline" ? (
            <Link
              key={action.to}
              to={action.to}
              className="inline-flex h-9 items-center rounded-lg border border-stone-300 bg-white px-4 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-950"
            >
              {action.label}
            </Link>
          ) : (
            <Link
              key={action.to}
              to={action.to}
              className="inline-flex h-9 items-center rounded-lg bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-950 dark:hover:bg-white"
            >
              {action.label}
            </Link>
          )
        )}
      </div>
    </section>
  );
}

export function SectionCard({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(surfaceClass, className)}>
      <div className="flex items-center justify-between px-5 py-4">
        <h2 className="text-base font-semibold text-stone-900 dark:text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function notificationCategoryStyle(category: string) {
  const styles: Record<string, { bg: string; icon: string }> = {
    meetings: { bg: "bg-sky-50 dark:bg-sky-950/30", icon: "text-sky-600 dark:text-sky-400" },
    pdp: { bg: "bg-orange-50 dark:bg-orange-950/30", icon: "text-orange-600 dark:text-orange-400" },
    reviews: { bg: "bg-amber-50 dark:bg-amber-950/30", icon: "text-amber-700 dark:text-amber-400" },
    system: { bg: "bg-violet-50 dark:bg-violet-950/30", icon: "text-violet-600 dark:text-violet-400" },
    employee: { bg: "bg-emerald-50 dark:bg-emerald-950/30", icon: "text-emerald-600 dark:text-emerald-400" },
  };
  return styles[category] ?? { bg: "bg-stone-50 dark:bg-stone-950", icon: "text-stone-500" };
}
