import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function OverlayModal({
  open,
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-stone-950/40 backdrop-blur-sm"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative z-10 flex max-h-[88vh] w-full flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl dark:border-stone-700 dark:bg-[#1c1917]",
          wide ? "max-w-5xl" : "max-w-lg"
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby="overlay-modal-title"
      >
        <div className="flex items-start justify-between gap-4 px-6 py-5">
          <div>
            <h2
              id="overlay-modal-title"
              className="text-2xl font-semibold text-stone-900 dark:text-white"
            >
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
                {subtitle}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="text-sm text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">{children}</div>
      </div>
    </div>
  );
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
