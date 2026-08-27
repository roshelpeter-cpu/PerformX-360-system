export type UserRole = "EMPLOYEE" | "SUPERVISOR" | "HR" | "LEADERSHIP";

export interface AuthUser {
  id: string;
  employeeId: string;
  name: string;
  role: UserRole;
  companyEmail: string;
  department: string | null;
}

export interface LoginCredentials {
  employeeId: string;
  password: string;
}

export interface ForgotPasswordPayload {
  employeeId: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  code?: string;
}

export interface LoginResponse {
  success: true;
  user: AuthUser;
}

export interface MeResponse {
  success: true;
  user: AuthUser;
}

export interface ForgotPasswordResponse {
  success: true;
  title: string;
  message: string;
}
