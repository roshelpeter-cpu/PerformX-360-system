import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import {
  getHistoryCycleRequest,
  listHistoryCyclesRequest,
} from "../services/history.api";

export function useHistoryCycles(employeeId?: string, enabled = true) {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: ["appraisal-history", "cycles", userId, employeeId],
    queryFn: () => listHistoryCyclesRequest(employeeId),
    enabled: Boolean(userId) && enabled,
  });
}

export function useHistoryCycle(
  cycleId: string | undefined,
  employeeId?: string
) {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: ["appraisal-history", "cycle", userId, employeeId, cycleId],
    queryFn: () => getHistoryCycleRequest(cycleId!, employeeId),
    enabled: Boolean(userId && cycleId),
  });
}
