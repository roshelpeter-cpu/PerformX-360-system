// Summary statistic card
// Compact metric tile used by Appraisal Cycle detail and meeting pages.
import { cn } from "@/lib/utils";

export function SummaryStat({
  label,
  value,
  warn,
  className,
}: {
  label: string;
  value: number | string;
  warn?: boolean;
  className?: string;
}) {
  const numeric = typeof value === "number" ? value : Number(value);
  const highlight = Boolean(warn && numeric > 0);

  return (
    <div
      className={cn(
        "rounded-xl border bg-white px-4 py-3 dark:bg-stone-900",
        highlight
          ? "border-amber-300 dark:border-amber-500/40"
          : "border-stone-200 dark:border-stone-800",
        className
      )}
    >
      <p className="text-xs text-stone-500">{label}</p>
      <p
        className={cn(
          "mt-1 text-xl font-semibold tabular-nums",
          highlight ? "text-amber-800 dark:text-amber-200" : "text-stone-900 dark:text-stone-50"
        )}
      >
        {value}
      </p>
    </div>
  );
}
