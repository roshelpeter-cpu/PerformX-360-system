import { useMemo, useState } from "react";
import {
  Building2,
  Download,
  UserCheck,
  UserCog,
  Users,
} from "lucide-react";
import DashboardLayout from "@/app/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ActionMenu, fieldClass } from "@/features/hr/components/ActionMenu";
import { StatusBadge } from "@/features/hr/components/StatusBadge";
import ChangeBatchDialog from "@/features/hr/components/ChangeBatchDialog";
import ChangeSupervisorModal from "@/features/employees/components/ChangeSupervisorModal";
import { OverlayModal, initials } from "@/features/employees/components/OverlayModal";
import { useAppraisalCycle } from "@/features/hr/hooks/useAppraisalCycles";
import type { CycleEmployeeRow } from "@/features/hr/types";
import {
  useBatchEmployees,
  useEmployeeOverview,
  useHrUsers,
  useLeadershipUsers,
  useWorkforceSupervisor,
  useWorkforceSupervisors,
} from "@/features/employees/hooks/useEmployees";
import { employeesApi } from "@/features/employees/services/employees.api";
import type {
  EmployeeFilters,
  WorkforceEmployee,
  WorkforceTab,
} from "@/features/employees/types";
import { cn } from "@/lib/utils";

const TABS: Array<{ id: WorkforceTab; label: string }> = [
  { id: "employees", label: "Employees" },
  { id: "supervisors", label: "Supervisors" },
  { id: "hr", label: "HR" },
  { id: "leadership", label: "Leadership" },
];

const BATCH_ACCENTS = [
  "bg-amber-400",
  "bg-sky-500",
  "bg-orange-400",
];

const emptyFilters: EmployeeFilters = {
  search: "",
  departmentId: "",
  batchId: "",
};

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers, ...rows]
    .map((row) =>
      row.map((value) => `"${String(value).replaceAll("\"", "\"\"")}"`).join(",")
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function EmployeeAvatar({ name }: { name: string }) {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-900 dark:bg-amber-400/20 dark:text-amber-200">
      {initials(name)}
    </div>
  );
}

function toCycleRow(employee: WorkforceEmployee): CycleEmployeeRow {
  return {
    id: employee.id,
    employeeId: employee.employeeId,
    name: employee.name,
    role: employee.role,
    companyEmail: employee.companyEmail,
    department: employee.department,
    batch: employee.batch,
    supervisor: employee.supervisor,
    assignmentStatus: employee.status,
  };
}

function EmployeeTable({
  employees,
  showSupervisor,
  onChangeBatch,
  onChangeSupervisor,
}: {
  employees: WorkforceEmployee[];
  showSupervisor?: boolean;
  onChangeBatch?: (employee: WorkforceEmployee) => void;
  onChangeSupervisor?: (employee: WorkforceEmployee) => void;
}) {
  return (
    <table className="min-w-full text-left text-sm">
      <thead className="border-b border-stone-200 text-[11px] font-medium uppercase tracking-wide text-stone-400 dark:border-stone-800">
        <tr>
          <th className="px-3 py-2">Employee</th>
          <th className="px-3 py-2">Employee ID</th>
          <th className="px-3 py-2">Department</th>
          {showSupervisor ? <th className="px-3 py-2">Supervisor</th> : null}
          <th className="px-3 py-2">Status</th>
          <th className="px-3 py-2" />
        </tr>
      </thead>
      <tbody>
        {employees.map((employee) => (
          <tr
            key={employee.id}
            className="border-b border-stone-100 dark:border-stone-800"
          >
            <td className="px-3 py-3">
              <div className="flex items-center gap-3">
                {!showSupervisor ? <EmployeeAvatar name={employee.name} /> : null}
                <span className="font-medium text-stone-900 dark:text-stone-100">
                  {employee.name}
                </span>
              </div>
            </td>
            <td className="px-3 py-3 text-stone-700 dark:text-stone-300">
              {employee.employeeId}
            </td>
            <td className="px-3 py-3 text-stone-700 dark:text-stone-300">
              {employee.department?.name ?? "—"}
            </td>
            {showSupervisor ? (
              <td className="px-3 py-3 text-stone-700 dark:text-stone-300">
                {employee.supervisor?.name ?? "Not assigned"}
              </td>
            ) : null}
            <td className="px-3 py-3">
              <StatusBadge status={employee.status} />
            </td>
            <td className="px-3 py-3 text-right">
              {onChangeBatch || onChangeSupervisor ? (
                <ActionMenu
                  items={[
                    {
                      // HR asked for Change Batch as the first action.
                      label: employee.batch ? "Change Batch" : "Assign Batch",
                      hidden: !onChangeBatch,
                      onClick: () => onChangeBatch?.(employee),
                    },
                    {
                      label: employee.supervisor
                        ? "Change Supervisor"
                        : "Assign Supervisor",
                      hidden: !onChangeSupervisor,
                      onClick: () => onChangeSupervisor?.(employee),
                    },
                  ]}
                />
              ) : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function EmployeesPage() {
  const [tab, setTab] = useState<WorkforceTab>("employees");
  const [draft, setDraft] = useState<EmployeeFilters>(emptyFilters);
  const [applied, setApplied] = useState<EmployeeFilters>(emptyFilters);
  const [openBatchId, setOpenBatchId] = useState<string | undefined>();
  const [openSupervisorId, setOpenSupervisorId] = useState<string | undefined>();
  const [selectedEmployee, setSelectedEmployee] =
    useState<WorkforceEmployee | null>(null);
  const [batchEmployee, setBatchEmployee] = useState<WorkforceEmployee | null>(null);

  const overview = useEmployeeOverview(applied);
  const cycleQuery = useAppraisalCycle(overview.data?.cycle?.id);
  const supervisors = useWorkforceSupervisors(
    { ...applied, pageSize: 500 },
    tab === "supervisors"
  );
  const hrUsers = useHrUsers({ ...applied, pageSize: 100 }, tab === "hr");
  const leadership = useLeadershipUsers(
    { ...applied, pageSize: 100 },
    tab === "leadership"
  );
  const batchDetail = useBatchEmployees(openBatchId, applied, Boolean(openBatchId));
  const supervisorDetail = useWorkforceSupervisor(
    openSupervisorId,
    Boolean(openSupervisorId)
  );

  const cycleName = overview.data?.cycle?.name ?? "Current appraisal cycle";
  const stats = overview.data?.stats;
  const departments = overview.data?.departments ?? [];
  const batches = useMemo(() => {
    const items = overview.data?.batches ?? [];
    if (!applied.batchId) return items;
    return items.filter((batch) => batch.id === applied.batchId);
  }, [overview.data?.batches, applied.batchId]);
  const visibleEmployeeCount = useMemo(() => {
    if (tab !== "employees") return stats?.filteredEmployees ?? 0;
    if (!applied.batchId) return stats?.filteredEmployees ?? stats?.totalEmployees ?? 0;
    return batches.reduce((sum, batch) => sum + batch.employeeCount, 0);
  }, [tab, applied.batchId, stats, batches]);

  function applyFilters() {
    setApplied({ ...draft });
  }

  function resetFilters() {
    setDraft(emptyFilters);
    setApplied(emptyFilters);
  }

  async function exportCurrent() {
    if (tab === "employees") {
      const result = await employeesApi.listEmployees({
        ...applied,
        role: "EMPLOYEE",
        page: 1,
        pageSize: 1000,
      });
      downloadCsv(
        "employees.csv",
        ["Employee", "Employee ID", "Department", "Supervisor", "Status", "Batch"],
        result.employees.map((employee) => [
          employee.name,
          employee.employeeId,
          employee.department?.name ?? "",
          employee.supervisor?.name ?? "",
          employee.status,
          employee.batch?.name ?? "",
        ])
      );
      return;
    }
    if (tab === "supervisors") {
      const result = await employeesApi.listSupervisors({
        ...applied,
        pageSize: 1000,
      });
      downloadCsv(
        "supervisors.csv",
        ["Supervisor", "Supervisor ID", "Department", "Assigned employees"],
        result.supervisors.map((supervisor) => [
          supervisor.name,
          supervisor.employeeId,
          supervisor.department?.name ?? "",
          String(supervisor.employeeCount),
        ])
      );
      return;
    }
    const result =
      tab === "hr"
        ? await employeesApi.listHr(applied)
        : await employeesApi.listLeadership(applied);
    downloadCsv(
      `${tab}.csv`,
      ["Name", "Employee ID", "Department", "Role"],
      result.users.map((user) => [
        user.name,
        user.employeeId,
        user.department?.name ?? "",
        user.jobTitle ?? user.role,
      ])
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900 dark:text-white">
              All Employees
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              View and manage all employee profiles across the organization.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={exportCurrent}>
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>

        <div className="border-b border-stone-200 dark:border-stone-800">
          <div className="flex gap-6">
            {TABS.map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={cn(
                    "-mb-px border-b-2 pb-3 text-sm",
                    active
                      ? "border-stone-900 font-medium text-stone-900 dark:border-white dark:text-amber-300"
                      : "border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                  )}
                  onClick={() => setTab(item.id)}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            label="Total Employees"
            value={stats?.totalEmployees ?? 0}
            hint={cycleName}
            icon={Users}
            iconClass="bg-orange-100 text-orange-700 dark:bg-amber-400/20 dark:text-amber-300"
          />
          <StatTile
            label="Assigned Employees"
            value={stats?.assignedEmployees ?? 0}
            hint={`${stats?.assignedPercent ?? 0}% of total`}
            icon={UserCheck}
            iconClass="bg-emerald-100 text-emerald-700 dark:bg-emerald-400/20 dark:text-emerald-300"
          />
          <StatTile
            label="Supervisors"
            value={stats?.supervisorCount ?? 0}
            hint="Managing assigned employees"
            icon={UserCog}
            iconClass="bg-sky-100 text-sky-700 dark:bg-sky-400/20 dark:text-sky-300"
          />
          <StatTile
            label="Departments"
            value={stats?.departmentCount ?? 0}
            hint="Across organisation"
            icon={Building2}
            iconClass="bg-violet-100 text-violet-700 dark:bg-violet-400/20 dark:text-violet-300"
          />
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900 lg:flex-row lg:items-center">
          <p className="shrink-0 text-sm font-medium text-stone-700 dark:text-stone-200">
            {tab === "supervisors"
              ? `Total Supervisors: ${supervisors.data?.total ?? 0}`
              : tab === "hr"
                ? `Total HR: ${hrUsers.data?.total ?? 0}`
                : tab === "leadership"
                  ? `Total Leadership: ${leadership.data?.total ?? 0}`
                  : `Total Employees: ${visibleEmployeeCount}`}
          </p>
          <div
            className={cn(
              "grid flex-1 gap-3 md:grid-cols-2",
              tab === "employees" ? "xl:grid-cols-3" : "xl:grid-cols-2"
            )}
          >
            {tab === "employees" ? (
              <select
                className={fieldClass}
                value={draft.batchId ?? ""}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, batchId: event.target.value }))
                }
                aria-label="View by Appraisal Batch"
              >
                <option value="">View by Appraisal Batch</option>
                {(overview.data?.batches ?? []).map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.name}
                  </option>
                ))}
              </select>
            ) : null}
            <select
              className={fieldClass}
              value={draft.departmentId ?? ""}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  departmentId: event.target.value,
                }))
              }
              aria-label="All Departments"
            >
              <option value="">All Departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
            <input
              className={fieldClass}
              value={draft.search ?? ""}
              onChange={(event) =>
                setDraft((current) => ({ ...current, search: event.target.value }))
              }
              placeholder="Search by employee name or employee ID"
              aria-label="Search by employee name or employee ID"
            />
          </div>
          <div className="flex shrink-0 gap-2">
            <Button type="button" onClick={applyFilters}>
              Filter
            </Button>
            <Button type="button" variant="outline" onClick={resetFilters}>
              Reset
            </Button>
          </div>
        </div>

        {tab === "employees" ? (
          overview.isLoading ? (
            <p className="text-sm text-stone-500">Loading employees…</p>
          ) : overview.isError ? (
            <p className="text-sm text-red-600">Unable to load employees from the database.</p>
          ) : (
            <div className="space-y-4">
              {batches.map((batch) => (
                <section
                  key={batch.id}
                  className="overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900"
                >
                  <div className={cn("h-1.5", BATCH_ACCENTS[(batch.batchNumber - 1) % 3] ?? "bg-amber-400")} />
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-semibold text-stone-900 dark:text-white">
                          {batch.name}
                        </h2>
                        <p className="mt-0.5 text-sm text-stone-500">
                          {batch.startLabel} · {batch.percentOfEmployees}% of employees
                        </p>
                      </div>
                      <p className="text-xl font-semibold tabular-nums text-stone-900 dark:text-white">
                        {batch.employeeCount}
                      </p>
                    </div>
                    <div className="mt-4 overflow-x-auto">
                      <EmployeeTable
                        employees={batch.preview}
                        onChangeBatch={setBatchEmployee}
                        onChangeSupervisor={setSelectedEmployee}
                      />
                    </div>
                    <button
                      type="button"
                      className="mt-4 text-sm font-medium text-stone-700 hover:underline dark:text-stone-200"
                      onClick={() => setOpenBatchId(batch.id)}
                    >
                      View all {batch.employeeCount} employees →
                    </button>
                  </div>
                </section>
              ))}

              <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-sky-900/40 dark:bg-sky-950/20">
                <h2 className="text-sm font-semibold text-stone-900 dark:text-white">
                  About Appraisal Batches
                </h2>
                <p className="mt-2 text-sm leading-6 text-stone-600 dark:text-stone-300">
                  Employees are assigned to a batch when the appraisal cycle is set up
                  and remain in that batch unless HR changes the assignment.
                </p>
              </section>
            </div>
          )
        ) : null}

        {tab === "supervisors" ? (
          supervisors.isLoading ? (
            <p className="text-sm text-stone-500">Loading supervisors…</p>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-stone-200 text-[11px] font-medium uppercase tracking-wide text-stone-400 dark:border-stone-800">
                  <tr>
                    <th className="px-4 py-3">Supervisor</th>
                    <th className="px-4 py-3">Supervisor ID</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Assigned employees</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {(supervisors.data?.supervisors ?? []).map((supervisor) => (
                    <tr
                      key={supervisor.id}
                      className="border-b border-stone-100 dark:border-stone-800"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <EmployeeAvatar name={supervisor.name} />
                          <span className="font-medium">{supervisor.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{supervisor.employeeId}</td>
                      <td className="px-4 py-3">
                        {supervisor.department?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3">{supervisor.employeeCount}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={supervisor.status} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <ActionMenu
                          items={[
                            {
                              label: "View assigned employees",
                              onClick: () => setOpenSupervisorId(supervisor.id),
                            },
                          ]}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}

        {tab === "hr" || tab === "leadership" ? (
          (tab === "hr" ? hrUsers.isLoading : leadership.isLoading) ? (
            <p className="text-sm text-stone-500">Loading users…</p>
          ) : (
            <DirectoryTable
              users={(tab === "hr" ? hrUsers.data?.users : leadership.data?.users) ?? []}
            />
          )
        ) : null}
      </div>

      <OverlayModal
        open={Boolean(openBatchId)}
        title={batchDetail.data?.batch.name ?? "Batch"}
        subtitle={`${batchDetail.data?.total ?? 0} employees in this batch`}
        onClose={() => setOpenBatchId(undefined)}
        wide
      >
        {batchDetail.isLoading ? (
          <p className="text-sm text-stone-500">Loading employees…</p>
        ) : (
          <EmployeeTable
            employees={batchDetail.data?.employees ?? []}
            showSupervisor
            onChangeBatch={setBatchEmployee}
            onChangeSupervisor={setSelectedEmployee}
          />
        )}
      </OverlayModal>

      <OverlayModal
        open={Boolean(openSupervisorId)}
        title={supervisorDetail.data?.supervisor.name ?? "Supervisor"}
        subtitle={`${supervisorDetail.data?.employeeCount ?? 0} employees assigned`}
        onClose={() => setOpenSupervisorId(undefined)}
        wide
      >
        {supervisorDetail.isLoading ? (
          <p className="text-sm text-stone-500">Loading employees…</p>
        ) : (
          <EmployeeTable
            employees={supervisorDetail.data?.employees ?? []}
            showSupervisor
            onChangeBatch={setBatchEmployee}
            onChangeSupervisor={setSelectedEmployee}
          />
        )}
      </OverlayModal>

      <ChangeBatchDialog
        key={batchEmployee?.id ?? "batch"}
        open={Boolean(batchEmployee)}
        onClose={() => setBatchEmployee(null)}
        cycleId={overview.data?.cycle?.id ?? ""}
        employee={batchEmployee ? toCycleRow(batchEmployee) : null}
        batches={cycleQuery.data?.batches ?? []}
      />
      <ChangeSupervisorModal
        key={selectedEmployee?.id ?? "supervisor"}
        open={Boolean(selectedEmployee)}
        employee={selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
      />
    </DashboardLayout>
  );
}

function StatTile({
  label,
  value,
  hint,
  icon: Icon,
  iconClass,
}: {
  label: string;
  value: number;
  hint: string;
  icon: typeof Users;
  iconClass: string;
}) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-3.5 dark:border-stone-800 dark:bg-stone-900">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xl font-semibold tabular-nums text-stone-900 dark:text-white">
            {value}
          </p>
          <p className="mt-2 text-sm font-medium text-stone-800 dark:text-stone-200">
            {label}
          </p>
          <p className="mt-1 text-xs text-stone-500">{hint}</p>
        </div>
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-full",
            iconClass
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function DirectoryTable({
  users,
}: {
  users: Array<{
    id: string;
    name: string;
    employeeId: string;
    jobTitle?: string | null;
    department: { name: string } | null;
  }>;
}) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-stone-200 text-[11px] font-medium uppercase tracking-wide text-stone-400 dark:border-stone-800">
          <tr>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Employee ID</th>
            <th className="px-4 py-3">Department</th>
            <th className="px-4 py-3">Role</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr
              key={user.id}
              className="border-b border-stone-100 dark:border-stone-800"
            >
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <EmployeeAvatar name={user.name} />
                  <span className="font-medium">{user.name}</span>
                </div>
              </td>
              <td className="px-4 py-3">{user.employeeId}</td>
              <td className="px-4 py-3">{user.department?.name ?? "—"}</td>
              <td className="px-4 py-3">{user.jobTitle ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
