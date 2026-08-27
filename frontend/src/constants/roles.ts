import type { UserRole } from "@/features/auth/types";

export const ROLE_DASHBOARD_PATHS: Record<UserRole, string> = {
  EMPLOYEE: "/employee/dashboard",
  SUPERVISOR: "/supervisor/dashboard",
  HR: "/hr/dashboard",
  LEADERSHIP: "/leadership/dashboard",
};

export function getDashboardPathForRole(role: UserRole): string {
  return ROLE_DASHBOARD_PATHS[role];
}

export function formatRoleLabel(role: UserRole): string {
  switch (role) {
    case "EMPLOYEE":
      return "Employee";
    case "SUPERVISOR":
      return "Supervisor";
    case "HR":
      return "HR";
    case "LEADERSHIP":
      return "Leadership";
    default:
      return role;
  }
}
