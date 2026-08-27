// Appraisal Cycles Page
// Lists cycles. Confirm/activate/complete/delete remain on the cycle detail page.

import { useMemo, useState, type ReactNode } from "react";
import {
  Eye,
  Plus,
  ChevronRight,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Users2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "@/app/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ActiveCycleSummaryCard from "@/features/hr/components/ActiveCycleSummaryCard";
import { fieldClass } from "@/features/hr/components/ActionMenu";
import CreateCycleDialog from "@/features/hr/components/CreateCycleDialog";
import { StatusBadge } from "@/features/hr/components/StatusBadge";
import { SupervisorsInSection } from "@/features/hr/components/SupervisorsInSection";
import {
  useAppraisalCycles,
  useCurrentAppraisalCycle,
  useHistoricalCycles,
  useWorkforceSummary,
} from "@/features/hr/hooks/useAppraisalCycles";
import { formatCompactDateRange, formatDate } from "@/features/hr/utils/dates";

const TABS = [
  "All Cycles",
  "Active Cycles",
  "Upcoming Cycles",
  "Completed Cycles",
] as const;

const PAGE_SIZE = 5;

export default function AppraisalCyclesPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [year, setYear] = useState("ALL");
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("All Cycles");
  const navigate = useNavigate();

  const allCyclesQuery = useAppraisalCycles();
  const currentQuery = useCurrentAppraisalCycle();
  const historyQuery = useHistoricalCycles();
  const workforceQuery = useWorkforceSummary();

  const allCycles = allCyclesQuery.data ?? [];
  const current = currentQuery.data;
  const history = historyQuery.data ?? [];
  const workforce = workforceQuery.data;

  const years = useMemo(() => {
    return Array.from(new Set(allCycles.map((cycle) => cycle.year))).sort(
      (a, b) => b - a
    );
  }, [allCycles]);

  const counts = {
    active: workforce?.activeCycles ?? 0,
    upcoming: workforce?.upcomingCycles ?? 0,
    completed: workforce?.completedCycles ?? 0,
    employees: workforce?.employeesInCycles ?? 0,
  };

  const displayedCycles = useMemo(() => {
    let filtered = allCycles;
    if (activeTab === "Active Cycles") {
      filtered = filtered.filter((cycle) => cycle.status === "ACTIVE");
    } else if (activeTab === "Upcoming Cycles") {
      filtered = filtered.filter((cycle) => cycle.status === "UPCOMING");
    } else if (activeTab === "Completed Cycles") {
      filtered = filtered.filter((cycle) => cycle.status === "COMPLETED");
    }

    if (status !== "ALL") {
      filtered = filtered.filter((cycle) => cycle.status === status);
    }
    if (year !== "ALL") {
      filtered = filtered.filter((cycle) => String(cycle.year) === year);
    }
    if (search.trim()) {
      const needle = search.toLowerCase();
      filtered = filtered.filter((cycle) =>
        cycle.name.toLowerCase().includes(needle)
      );
    }
    return filtered;
  }, [allCycles, activeTab, status, search, year]);

  const totalPages = Math.max(1, Math.ceil(displayedCycles.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedCycles = displayedCycles.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  function changeTab(tab: (typeof TABS)[number]) {
    setActiveTab(tab);
    setPage(1);
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-[1400px] space-y-6">
        <nav className="flex items-center space-x-2 text-sm text-stone-500">
          <Link to="/hr/dashboard" className="hover:text-stone-900">
            HR
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span>Appraisal Management</span>
          <ChevronRight className="h-4 w-4" />
          <span className="font-medium text-stone-900 dark:text-stone-100">
            Appraisal Cycles
          </span>
        </nav>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50">
              Appraisal Cycles
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              Create, manage and monitor appraisal cycles across the organization.
            </p>
          </div>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create New Cycle
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            icon={<CalendarDays className="h-6 w-6" />}
            iconClass="bg-amber-100 text-amber-600 dark:bg-amber-900/30"
            value={counts.active}
            label="Active Cycles"
            hint="Currently running"
          />
          <SummaryCard
            icon={<CalendarCheck className="h-6 w-6" />}
            iconClass="bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
            value={counts.upcoming}
            label="Upcoming Cycle"
            hint="Starting soon"
          />
          <SummaryCard
            icon={<CheckCircle2 className="h-6 w-6" />}
            iconClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30"
            value={counts.completed}
            label="Completed Cycles"
            hint="This year"
          />
          <SummaryCard
            icon={<Users2 className="h-6 w-6" />}
            iconClass="bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
            value={counts.employees}
            label="Employees in Cycles"
            hint="Across all cycles"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="flex flex-col rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900 lg:col-span-2">
            <div className="border-b border-stone-200 px-2 pt-2 dark:border-stone-800">
              <div className="flex overflow-x-auto">
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => changeTab(tab)}
                    className={`whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors ${
                      activeTab === tab
                        ? "border-b-2 border-amber-400 text-stone-900 dark:text-white"
                        : "text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col justify-end gap-3 p-4 sm:flex-row sm:items-center">
              <select
                className={`${fieldClass} h-9 w-32`}
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
              </select>
              <select
                className={`${fieldClass} h-9 w-32`}
                value={year}
                onChange={(event) => {
                  setYear(event.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">All Years</option>
                {years.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <div className="relative w-full sm:w-56">
                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search"
                  className="h-9 w-full"
                />
              </div>
            </div>

            <div className="overflow-x-auto px-4 pb-4">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-stone-100 text-xs font-medium text-stone-500 dark:border-stone-800">
                  <tr>
                    <th className="px-3 py-3 font-medium">Cycle Name</th>
                    <th className="px-3 py-3 font-medium">Year</th>
                    <th className="px-3 py-3 font-medium">Period</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                    <th className="px-3 py-3 font-medium">Employees</th>
                    <th className="px-3 py-3 font-medium">Start Date</th>
                    <th className="px-3 py-3 font-medium">End Date</th>
                    <th className="px-3 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allCyclesQuery.isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-stone-500">
                        Loading cycles...
                      </td>
                    </tr>
                  ) : allCyclesQuery.isError ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-red-600">
                        Unable to load appraisal cycles from the server.
                      </td>
                    </tr>
                  ) : pagedCycles.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-stone-500">
                        {activeTab === "Completed Cycles"
                          ? "No completed cycles."
                          : "No cycles found."}
                      </td>
                    </tr>
                  ) : (
                    pagedCycles.map((cycle) => {
                      const assigned =
                        cycle.summary.fullyAssignedCount ??
                        cycle.summary.totalEmployeesAssigned;
                      const total = cycle.summary.totalAssignableEmployees;
                      const percent =
                        cycle.summary.assignmentCompletionPercent ??
                        (total > 0 ? Math.round((assigned / total) * 100) : 0);
                      const colorDot =
                        cycle.status === "ACTIVE"
                          ? "bg-amber-400"
                          : cycle.status === "COMPLETED"
                            ? "bg-emerald-500"
                            : "bg-stone-400";
                      return (
                        <tr
                          key={cycle.id}
                          className="border-b border-stone-50 last:border-0 dark:border-stone-800/50"
                        >
                          <td className="px-3 py-4">
                            <div className="flex items-center gap-2">
                              <div className={`h-2 w-2 rounded-full ${colorDot}`} />
                              <div>
                                <p className="font-semibold text-stone-900 dark:text-stone-100">
                                  {cycle.name}
                                </p>
                                <p className="text-xs text-stone-500">
                                  {cycle.description?.substring(0, 40)}
                                  {cycle.description && cycle.description.length > 40
                                    ? "..."
                                    : ""}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4 text-stone-600 dark:text-stone-300">
                            {cycle.year}
                          </td>
                          <td className="px-3 py-4 text-stone-600 dark:text-stone-300">
                            {formatCompactDateRange(cycle.startDate, cycle.endDate)}
                          </td>
                          <td className="px-3 py-4">
                            <StatusBadge status={cycle.status} />
                          </td>
                          <td className="px-3 py-4">
                            <div className="w-24">
                              <p className="text-xs font-medium text-stone-700 dark:text-stone-300">
                                {assigned} / {total}
                              </p>
                              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                                <div
                                  className={`h-full ${colorDot}`}
                                  style={{ width: `${percent}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-4 text-stone-600 dark:text-stone-300">
                            {formatDate(cycle.startDate)}
                          </td>
                          <td className="px-3 py-4 text-stone-600 dark:text-stone-300">
                            {formatDate(cycle.endDate)}
                          </td>
                          <td className="px-3 py-4 text-right">
                            <Link
                              to={`/hr/appraisal-cycles/${cycle.id}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 text-stone-500 hover:bg-stone-50 dark:border-stone-700 dark:hover:bg-stone-800"
                              aria-label={`View ${cycle.name}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-stone-100 p-4 text-sm text-stone-500 dark:border-stone-800">
              <span>
                Showing{" "}
                {displayedCycles.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} to{" "}
                {Math.min(currentPage * PAGE_SIZE, displayedCycles.length)} of{" "}
                {displayedCycles.length} cycles
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  <ChevronRight className="h-4 w-4 rotate-180" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-stone-900 bg-stone-900 text-white dark:border-stone-100 dark:bg-stone-100 dark:text-stone-950"
                >
                  {currentPage}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            {currentQuery.isLoading ? (
              <div className="rounded-2xl border border-stone-200 bg-white p-6 text-stone-500 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                Loading current cycle...
              </div>
            ) : current ? (
              <>
                <ActiveCycleSummaryCard cycle={current} />
              </>
            ) : (
              <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center text-sm text-stone-500 shadow-sm dark:border-stone-800 dark:bg-stone-900">
                No active cycle.
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <button
            type="button"
            disabled={!current}
            onClick={() => {
              if (current) navigate(`/hr/appraisal-cycles/${current.id}/supervisors`);
            }}
            className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white text-left shadow-sm transition hover:border-amber-300 dark:border-stone-800 dark:bg-stone-900 disabled:cursor-default"
          >
            <div className="flex items-center justify-between border-b border-stone-50 p-5 pb-4 dark:border-stone-800/50">
              <h3 className="font-semibold text-stone-900 dark:text-stone-100">
                Supervisors & Employees in Cycle
              </h3>
              <span className="inline-flex h-8 items-center rounded-lg border border-stone-300 px-3 text-xs font-medium dark:border-stone-600">
                View All
              </span>
            </div>
            <div className="max-h-80 flex-1 overflow-y-auto p-5">
              {current ? (
                <SupervisorsInSection cycle={current} hideHeader />
              ) : (
                <p className="text-sm text-stone-500">No active cycle data.</p>
              )}
            </div>
            <div className="mt-auto border-t border-stone-50 p-4 px-5 dark:border-stone-800/50">
              <span className="flex items-center text-sm font-medium text-stone-900">
                Manage Supervisors <ChevronRight className="ml-1 h-4 w-4" />
              </span>
            </div>
          </button>

          <div className="flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center justify-between border-b border-stone-50 p-5 pb-4 dark:border-stone-800/50">
              <h3 className="font-semibold text-stone-900 dark:text-stone-100">
                Cycle History
              </h3>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium"
                onClick={() => changeTab("Completed Cycles")}
              >
                View All
              </Button>
            </div>
            <div className="max-h-80 flex-1 overflow-y-auto p-5">
              <div className="space-y-4">
                {historyQuery.isLoading ? (
                  <p className="text-sm text-stone-500">Loading history...</p>
                ) : history.length === 0 ? (
                  <p className="text-sm text-stone-500">No history.</p>
                ) : (
                  history.slice(0, 4).map((item) => (
                    <Link
                      key={item.id}
                      to={`/hr/appraisal-cycles/${item.id}`}
                      className="flex items-center justify-between border-b border-stone-50 pb-3 last:border-0 dark:border-stone-800/50"
                    >
                      <div>
                        <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                          {item.name}
                        </p>
                        <p className="text-xs text-stone-500">
                          {formatCompactDateRange(item.startDate, item.endDate)}
                        </p>
                      </div>
                      <StatusBadge status={item.status} />
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <CreateCycleDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </DashboardLayout>
  );
}

function SummaryCard({
  icon,
  iconClass,
  value,
  label,
  hint,
}: {
  icon: ReactNode;
  iconClass: string;
  value: number;
  label: string;
  hint: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-800 dark:bg-stone-900">
      <div className={`rounded-full p-3 ${iconClass}`}>{icon}</div>
      <div>
        <div className="text-2xl font-bold text-stone-900 dark:text-stone-100">{value}</div>
        <div className="text-sm font-medium text-stone-900 dark:text-stone-200">{label}</div>
        <div className="text-xs text-stone-500">{hint}</div>
      </div>
    </div>
  );
}
