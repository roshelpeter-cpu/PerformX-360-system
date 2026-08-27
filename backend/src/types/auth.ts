import type { AppRole } from "../constants/roles.js";

export interface AuthenticatedUser {
  id: string;
  employeeId: string;
  name: string;
  role: AppRole;
  companyEmail: string;
  department: string | null;
}

export interface LoginResult {
  user: AuthenticatedUser;
  token: string;
}
