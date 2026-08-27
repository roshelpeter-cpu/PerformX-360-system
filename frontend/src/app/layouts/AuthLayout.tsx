// Auth Layout
// Shared full-page shell for login and forgot-password screens.

import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

export default function AuthLayout({ children }: Props) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f4ef] text-stone-900 dark:bg-[#0c0a09] dark:text-stone-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(251,191,36,0.16),transparent_36%)] dark:bg-[radial-gradient(circle_at_18%_20%,rgba(251,191,36,0.14),transparent_32%)]" />
      <div className="relative z-10">{children}</div>
    </main>
  );
}
