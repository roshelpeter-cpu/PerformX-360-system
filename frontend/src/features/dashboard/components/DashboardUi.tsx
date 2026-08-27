import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DashboardHero({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-stone-200/80 bg-white/90 p-6 shadow-[0_20px_60px_rgba(28,25,23,0.08)] dark:border-stone-700/70 dark:bg-stone-950/80">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700 dark:text-amber-300">
        {eyebrow}
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-stone-900 dark:text-white">
        {title}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-400">
        {description}
      </p>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      <p className="text-xs uppercase tracking-wider text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-stone-900 dark:text-white">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-stone-500">{hint}</p> : null}
    </div>
  );
}

export function Panel({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-stone-200/80 bg-white/90 p-6 dark:border-stone-800 dark:bg-stone-950/70",
        className
      )}
    >
      <h2 className="text-lg font-semibold text-stone-900 dark:text-white">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function DashboardLoading() {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-10 text-sm text-stone-500 dark:border-stone-800 dark:bg-stone-900">
      Loading dashboard...
    </div>
  );
}

export function DashboardError({ message }: { message: string }) {
  return (
    <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
      {message}
    </div>
  );
}
