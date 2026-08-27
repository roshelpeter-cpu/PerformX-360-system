import { useEffect } from "react";
import type { ReactNode } from "react";
import { useAuthBootstrap } from "@/features/auth/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";

interface AuthBootstrapProps {
  children: ReactNode;
}

export default function AuthBootstrap({ children }: AuthBootstrapProps) {
  const query = useAuthBootstrap();
  const setInitialized = useAuthStore((state) => state.setInitialized);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  useEffect(() => {
    if (query.isSuccess) {
      setInitialized(true);
      return;
    }

    if (query.isError) {
      clearAuth();
      setInitialized(true);
    }
  }, [query.isSuccess, query.isError, setInitialized, clearAuth]);

  if (!query.isFetched && !query.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Loading Altrium PerformX 360°...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
