// Shared pagination
// Used by Appraisal Cycle employee lists and Meeting Management tables.
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  totalPages,
  total,
  onPageChange,
  pageSize,
  itemLabel,
}: {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  itemLabel?: string;
}) {
  if (total === 0) return null;

  const from = pageSize ? (page - 1) * pageSize + 1 : null;
  const to = pageSize ? Math.min(page * pageSize, total) : null;
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1).slice(
    Math.max(0, page - 3),
    Math.max(0, page - 3) + 5
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-sm text-stone-500">
      <p>
        {from && to && itemLabel
          ? `Showing ${from} to ${to} of ${total} ${itemLabel}`
          : `Page ${page} of ${totalPages} · ${total} records`}
      </p>
      <div className="flex flex-wrap items-center gap-1">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        {pages.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            className={cn(
              "h-8 min-w-8 rounded-lg px-2 text-sm",
              item === page
                ? "bg-stone-900 font-medium text-white dark:bg-stone-100 dark:text-stone-950"
                : "border border-stone-300 text-stone-700 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-800"
            )}
          >
            {item}
          </button>
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
