import { useState, type ReactNode } from "react";
import { NavLink, Link } from "react-router-dom";
import {
  Bell,
  CalendarRange,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Users,
} from "lucide-react";
import ThemeToggle from "@/components/common/ThemeToggle";
import { Button } from "@/components/ui/button";
import { formatRoleLabel, getDashboardPathForRole } from "@/constants/roles";
import SessionTimeoutDialog from "@/features/auth/components/SessionTimeoutDialog";
import { useLogout, useMyNotifications } from "@/features/auth/hooks/useAuth";
import { useSessionTimeout } from "@/features/auth/hooks/useSessionTimeout";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
}

function navSectionsForRole(role: string | undefined) {
  const dashboard = {
    label: "Dashboard",
    to: role ? getDashboardPathForRole(role as "EMPLOYEE" | "SUPERVISOR" | "HR" | "LEADERSHIP") : "/",
    icon: LayoutDashboard,
    end: true,
  };
  const notifications = {
    label: "Notifications",
    to: "/notifications",
    icon: Bell,
    end: true,
  };
  const planningMeetings = {
    label: "Performance Planning Meetings",
    to:
      role === "HR"
        ? "/hr/meetings/planning"
        : role === "SUPERVISOR"
          ? "/supervisor/meetings/planning"
          : "/employee/meetings/planning",
    icon: CalendarRange,
    end: false,
  };

  if (role === "HR") {
    return [
      { heading: "Dashboard", items: [dashboard] },
      {
        heading: "Employee Management",
        items: [{ label: "Employees", to: "/hr/employees", icon: Users, end: true }],
      },
      {
        heading: "Performance Management",
        items: [
          { label: "Appraisal Cycles", to: "/hr/appraisal-cycles", icon: CalendarRange, end: false },
        ],
      },
      {
        heading: "Meeting Management",
        items: [planningMeetings],
      },
      { heading: "Alerts", items: [notifications] },
    ];
  }

  if (role === "SUPERVISOR") {
    return [
      { heading: "MAIN", items: [dashboard] },
      {
        heading: "TEAM MANAGEMENT",
        items: [{ label: "My Team", to: "/supervisor/my-team", icon: Users, end: true }],
      },
      {
        heading: "Meeting Management",
        items: [planningMeetings],
      },
      { heading: "Alerts", items: [notifications] },
    ];
  }

  if (role === "EMPLOYEE") {
    return [
      { heading: "", items: [dashboard] },
      {
        heading: "Meeting Management",
        items: [planningMeetings],
      },
      { heading: "Alerts", items: [notifications] },
    ];
  }

  return [{ heading: "", items: [dashboard, notifications] }];
}

export default function DashboardLayout({ children }: Props) {
  const user = useAuthStore((state) => state.user);
  const logout = useLogout();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { showWarning, staySignedIn, isExtending } = useSessionTimeout(
    Boolean(user)
  );
  const notificationsQuery = useMyNotifications(Boolean(user));
  const notifications = notificationsQuery.data?.notifications ?? [];
  const unreadCount = notificationsQuery.data?.unreadCount ?? 0;
  const sections = navSectionsForRole(user?.role);

  return (
    <div className="min-h-screen bg-[#f7f4ef] text-stone-900 dark:bg-[#0c0a09] dark:text-stone-100">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            "sticky top-0 hidden h-screen shrink-0 border-r border-stone-200 bg-white/90 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90 md:flex md:flex-col",
            sidebarCollapsed ? "w-20" : "w-72"
          )}
        >
          <div className="flex items-center justify-between border-b border-stone-200 px-4 py-5 dark:border-stone-800">
            {!sidebarCollapsed ? (
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-amber-700 dark:text-amber-300">
                  Altrium
                </p>
                <p className="font-semibold">PerformX 360°</p>
              </div>
            ) : (
              <span className="mx-auto text-sm font-semibold text-amber-600">PX</span>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed((value) => !value)}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          </div>

          <nav className="flex-1 space-y-5 overflow-y-auto p-4">
            {sections.map((section) => (
              <div key={section.heading || "main"} className="space-y-2">
                {!sidebarCollapsed && section.heading ? (
                  <p className="px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400">
                    {section.heading}
                  </p>
                ) : null}
                {section.items.map((item) => (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2 text-sm",
                        isActive
                          ? user?.role === "HR"
                            ? "bg-amber-100 font-medium text-stone-900 dark:bg-amber-400 dark:text-stone-950"
                            : "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-950"
                          : "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-900"
                      )
                    }
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!sidebarCollapsed ? <span>{item.label}</span> : null}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/90 backdrop-blur dark:border-stone-800 dark:bg-stone-950/90">
            <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  aria-label="Open menu"
                >
                  <Menu className="h-4 w-4" />
                </Button>
                <div className="relative hidden max-w-md flex-1 sm:block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                  <input
                    type="search"
                    placeholder="Search employees, cycle..."
                    className="h-10 w-full rounded-xl border border-stone-200 bg-stone-50 pl-10 pr-4 text-sm dark:border-stone-700 dark:bg-stone-950"
                    aria-label="Search"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <ThemeToggle />
                <div className="relative">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Notifications"
                    title="Notifications"
                    onClick={() => setNotificationsOpen((value) => !value)}
                  >
                    <Bell className="h-4 w-4" />
                  </Button>
                  {unreadCount > 0 ? (
                    <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : null}
                  {notificationsOpen ? (
                    <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-stone-200 bg-white p-3 shadow-xl dark:border-stone-700 dark:bg-stone-900">
                      <p className="px-2 text-sm font-medium">Notifications</p>
                      <div className="mt-2 max-h-80 space-y-2 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <p className="px-2 py-4 text-sm text-stone-500">
                            No notifications yet.
                          </p>
                        ) : (
                          notifications.slice(0, 8).map((item) => (
                            <div
                              key={item.id}
                              className="rounded-xl px-2 py-2 text-sm"
                            >
                              <p className="font-medium">{item.title}</p>
                              <p className="mt-1 text-xs text-stone-500">
                                {item.message}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                      <Link
                        to="/notifications"
                        className="mt-2 block rounded-xl px-2 py-2 text-sm text-stone-600 hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
                        onClick={() => setNotificationsOpen(false)}
                      >
                        View all notifications
                      </Link>
                    </div>
                  ) : null}
                </div>

                <div className="relative">
                  <button
                    type="button"
                    className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-3 py-2 text-left dark:border-stone-700 dark:bg-stone-900"
                    onClick={() => setProfileOpen((value) => !value)}
                    aria-expanded={profileOpen}
                    aria-haspopup="menu"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-yellow-500 text-sm font-semibold text-stone-950">
                      {user?.name?.charAt(0) ?? "U"}
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-sm font-medium">{user?.name}</p>
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        {user ? formatRoleLabel(user.role) : "User"}
                      </p>
                    </div>
                    <ChevronDown className="hidden h-4 w-4 sm:block" />
                  </button>

                  {profileOpen ? (
                    <div
                      className="absolute right-0 mt-2 w-56 rounded-2xl border border-stone-200 bg-white p-2 shadow-xl dark:border-stone-700 dark:bg-stone-900"
                      role="menu"
                    >
                      <div className="border-b border-stone-100 px-3 py-2 dark:border-stone-800">
                        <p className="text-sm font-medium">{user?.name}</p>
                        <p className="text-xs text-stone-500">{user?.employeeId}</p>
                      </div>
                      <button
                        type="button"
                        className="mt-2 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        onClick={() => logout.mutate()}
                        role="menuitem"
                      >
                        <LogOut className="h-4 w-4" />
                        Logout
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>

      <SessionTimeoutDialog
        open={showWarning}
        onStaySignedIn={staySignedIn}
        isExtending={isExtending}
      />
    </div>
  );
}
