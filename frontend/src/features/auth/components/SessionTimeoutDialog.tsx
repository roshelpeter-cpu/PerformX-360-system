import { Button } from "@/components/ui/button";

interface SessionTimeoutDialogProps {
  open: boolean;
  onStaySignedIn: () => void;
  isExtending?: boolean;
}

export default function SessionTimeoutDialog({
  open,
  onStaySignedIn,
  isExtending = false,
}: SessionTimeoutDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-timeout-title"
    >
      <div className="w-full max-w-md rounded-3xl border border-amber-200/30 bg-white p-6 shadow-2xl dark:border-amber-400/20 dark:bg-slate-900">
        <h2 id="session-timeout-title" className="text-lg font-semibold text-slate-900 dark:text-white">
          Session Expiring Soon
        </h2>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Your session will expire in 2 minutes due to inactivity.
        </p>
        <div className="mt-6 flex justify-end">
          <Button onClick={onStaySignedIn} disabled={isExtending}>
            {isExtending ? "Refreshing..." : "Stay Signed In"}
          </Button>
        </div>
      </div>
    </div>
  );
}
