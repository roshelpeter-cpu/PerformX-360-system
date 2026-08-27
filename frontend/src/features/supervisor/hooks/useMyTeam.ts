import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { getMyTeamRequest, getTeamMemberRequest } from "../services/my-team.api";
import type { MyTeamFilters } from "../types";

export function useMyTeam(filters: MyTeamFilters) {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: ["supervisor", "my-team", userId, filters],
    queryFn: () => getMyTeamRequest(filters),
    enabled: Boolean(userId),
    placeholderData: keepPreviousData,
  });
}

export function useTeamMember(employeeId: string | undefined) {
  const userId = useAuthStore((state) => state.user?.id);
  return useQuery({
    queryKey: ["supervisor", "my-team", userId, "member", employeeId],
    queryFn: () => getTeamMemberRequest(employeeId!),
    enabled: Boolean(userId && employeeId),
  });
}
