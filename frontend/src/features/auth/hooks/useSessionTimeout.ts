import { useCallback, useEffect, useRef, useState } from "react";
import { useExtendSession, useLogout } from "@/features/auth/hooks/useAuth";

const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
const WARNING_BEFORE_MS = 2 * 60 * 1000;
const WARNING_AT_MS = SESSION_TIMEOUT_MS - WARNING_BEFORE_MS;

const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart"] as const;

export function useSessionTimeout(enabled: boolean) {
  const [showWarning, setShowWarning] = useState(false);
  const warningTimerRef = useRef<number | null>(null);
  const logoutTimerRef = useRef<number | null>(null);
  const lastActivityRef = useRef<number>(Date.now());
  const extendSession = useExtendSession();
  const logout = useLogout();

  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) {
      window.clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
    if (logoutTimerRef.current) {
      window.clearTimeout(logoutTimerRef.current);
      logoutTimerRef.current = null;
    }
  }, []);

  const scheduleTimers = useCallback(() => {
    clearTimers();
    lastActivityRef.current = Date.now();
    setShowWarning(false);

    warningTimerRef.current = window.setTimeout(() => {
      setShowWarning(true);
      logoutTimerRef.current = window.setTimeout(() => {
        logout.mutate();
        toastAfterAutoLogout();
      }, WARNING_BEFORE_MS);
    }, WARNING_AT_MS);
  }, [clearTimers, logout]);

  const staySignedIn = useCallback(async () => {
    try {
      await extendSession.mutateAsync();
      scheduleTimers();
    } catch {
      logout.mutate();
    }
  }, [extendSession, logout, scheduleTimers]);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      setShowWarning(false);
      return;
    }

    scheduleTimers();

    const handleActivity = () => {
      if (showWarning) {
        return;
      }
      const now = Date.now();
      if (now - lastActivityRef.current < 1000) {
        return;
      }
      scheduleTimers();
    };

    ACTIVITY_EVENTS.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
    };
  }, [enabled, showWarning, scheduleTimers, clearTimers]);

  return {
    showWarning,
    staySignedIn,
    isExtending: extendSession.isPending,
  };
}

function toastAfterAutoLogout() {
  import("sonner").then(({ toast }) => {
    toast.message("Session expired", {
      description: "You were signed out after 30 minutes of inactivity.",
    });
  });
}
