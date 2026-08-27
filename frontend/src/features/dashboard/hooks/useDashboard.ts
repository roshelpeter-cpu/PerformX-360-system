import { useQuery } from "@tanstack/react-query";
import { getMyDashboardRequest } from "../services/dashboard.api";

export function useMyDashboard() {
  return useQuery({
    queryKey: ["dashboard", "me"],
    queryFn: async () => (await getMyDashboardRequest()).dashboard,
  });
}
