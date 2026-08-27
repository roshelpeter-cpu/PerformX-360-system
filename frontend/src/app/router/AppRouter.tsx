import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AuthBootstrap from "@/features/auth/components/AuthBootstrap";
import ProtectedRoute from "@/features/auth/components/ProtectedRoute";
import GuestRoute from "@/features/auth/components/GuestRoute";
import LoginPage from "@/features/auth/pages/LoginPage";
import ForgotPasswordPage from "@/features/auth/pages/ForgotPasswordPage";
import EmployeeDashboardPage from "@/features/dashboard/pages/EmployeeDashboardPage";
import SupervisorDashboardPage from "@/features/dashboard/pages/SupervisorDashboardPage";
import MyTeamPage from "@/features/supervisor/pages/MyTeamPage";
import TeamMemberDetailPage from "@/features/supervisor/pages/TeamMemberDetailPage";
import PlanningMeetingsPage from "@/features/meetings/pages/PlanningMeetingsPage";
import NotificationsPage from "@/features/notifications/pages/NotificationsPage";
import HrDashboardPage from "@/features/dashboard/pages/HrDashboardPage";
import LeadershipDashboardPage from "@/features/dashboard/pages/LeadershipDashboardPage";
import EmployeesPage from "@/features/employees/pages/EmployeesPage";
import AppraisalCyclesPage from "@/features/hr/pages/AppraisalCyclesPage";
import AppraisalCycleDetailPage from "@/features/hr/pages/AppraisalCycleDetailPage";
import BatchDetailPage from "@/features/hr/pages/BatchDetailPage";
import SupervisorsPage from "@/features/hr/pages/SupervisorsPage";
import SupervisorDetailPage from "@/features/hr/pages/SupervisorDetailPage";
import { useAuthStore } from "@/store/authStore";
import { getDashboardPathForRole } from "@/constants/roles";

function RootRedirect() {
  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  if (!isInitialized) {
    return null;
  }

  if (user) {
    return <Navigate to={getDashboardPathForRole(user.role)} replace />;
  }

  return <Navigate to="/login" replace />;
}

function AppRouter() {
  return (
    <BrowserRouter>
      <AuthBootstrap>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
          <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />

          <Route
            path="/employee/dashboard"
            element={
              <ProtectedRoute allowedRoles={["EMPLOYEE"]}>
                <EmployeeDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/supervisor/dashboard"
            element={
              <ProtectedRoute allowedRoles={["SUPERVISOR"]}>
                <SupervisorDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/supervisor/my-team"
            element={
              <ProtectedRoute allowedRoles={["SUPERVISOR"]}>
                <MyTeamPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/supervisor/my-team/:employeeId"
            element={
              <ProtectedRoute allowedRoles={["SUPERVISOR"]}>
                <TeamMemberDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr/meetings/planning"
            element={
              <ProtectedRoute allowedRoles={["HR"]}>
                <PlanningMeetingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/supervisor/meetings/planning"
            element={
              <ProtectedRoute allowedRoles={["SUPERVISOR"]}>
                <PlanningMeetingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/employee/meetings/planning"
            element={
              <ProtectedRoute allowedRoles={["EMPLOYEE"]}>
                <PlanningMeetingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute allowedRoles={["EMPLOYEE", "SUPERVISOR", "HR", "LEADERSHIP"]}>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr/dashboard"
            element={
              <ProtectedRoute allowedRoles={["HR"]}>
                <HrDashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr/employees"
            element={
              <ProtectedRoute allowedRoles={["HR"]}>
                <EmployeesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr/appraisal-cycles"
            element={
              <ProtectedRoute allowedRoles={["HR"]}>
                <AppraisalCyclesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr/appraisal-cycles/:cycleId"
            element={
              <ProtectedRoute allowedRoles={["HR"]}>
                <AppraisalCycleDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr/appraisal-cycles/:cycleId/batches/:batchId"
            element={
              <ProtectedRoute allowedRoles={["HR"]}>
                <BatchDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr/appraisal-cycles/:cycleId/supervisors"
            element={
              <ProtectedRoute allowedRoles={["HR"]}>
                <SupervisorsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/hr/appraisal-cycles/:cycleId/supervisors/:supervisorId"
            element={
              <ProtectedRoute allowedRoles={["HR"]}>
                <SupervisorDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/leadership/dashboard"
            element={
              <ProtectedRoute allowedRoles={["LEADERSHIP"]}>
                <LeadershipDashboardPage />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthBootstrap>
    </BrowserRouter>
  );
}

export default AppRouter;
