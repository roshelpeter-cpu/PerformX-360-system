import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { getMyDashboardRequest } from "../services/dashboard.api";

export function useMyDashboard() {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: ["dashboard", "me", userId],
    queryFn: async () => (await getMyDashboardRequest()).dashboard,
    enabled: Boolean(userId),
  });
}
