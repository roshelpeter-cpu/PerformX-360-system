export const ROLES = {
  EMPLOYEE: "EMPLOYEE",
  SUPERVISOR: "SUPERVISOR",
  HR: "HR",
  LEADERSHIP: "LEADERSHIP",
} as const;

export type AppRole = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES: AppRole[] = [
  ROLES.EMPLOYEE,
  ROLES.SUPERVISOR,
  ROLES.HR,
  ROLES.LEADERSHIP,
];
