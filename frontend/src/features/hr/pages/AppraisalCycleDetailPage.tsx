// Appraisal Cycle Detail Page
// HR workspace for one cycle: batches, assignments, timeline, and
// draft-only deletion. Confirmed cycles never expose a delete action.
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import DashboardLayout from "@/app/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fieldClass, EmptyState } from "@/features/hr/components/ActionMenu";
import ChangeBatchDialog from "@/features/hr/components/ChangeBatchDialog";
import ChangeSupervisorDialog from "@/features/hr/components/ChangeSupervisorDialog";
import {
  ActivateCycleDialog,
  CompleteCycleDialog,
  ConfirmCycleDialog,
  DeleteDraftCycleDialog,
} from "@/features/hr/components/CycleActionDialogs";
import { DetailedTimelineTab } from "@/features/hr/components/DetailedTimelineTab";
import { Pagination } from "@/features/hr/components/Pagination";
import { StatusBadge } from "@/features/hr/components/StatusBadge";
import { SummaryStat } from "@/features/hr/components/SummaryStat";
import {
  useAppraisalCycle,
  useAssignmentHistory,
  useCycleEmployees,
  useCycleSupervisors,
  useDepartments,
  useUpdateCycle,
} from "@/features/hr/hooks/useAppraisalCycles";
import type { CycleEmployeeRow } from "@/features/hr/types";
import {
  addOneYearIso,
  formatDate,
  getBatchDisplayName,
  toDateInputValue,
} from "@/features/hr/utils/dates";
import { API_BASE_URL } from "@/services/api/client";
import { cn } from "@/lib/utils";

type Tab = "overview" | "batches" | "supervisors" | "timeline" | "history" | "settings";

export default function AppraisalCycleDetailPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) || "overview";
  const cycleQuery = useAppraisalCycle(cycleId);
  const cycle = cycleQuery.data;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activateOpen, setActivateOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const navigate = useNavigate();

  if (cycleQuery.isLoading) {
    return (
      <DashboardLayout>
        <p className="text-sm text-stone-500">Loading cycle…</p>
      </DashboardLayout>
    );
  }

  if (cycleQuery.isError || !cycle || !cycleId) {
    return (
      <DashboardLayout>
        <EmptyState
          title="Unable to load this appraisal cycle."
          description="The cycle may have been removed or the request failed."
          action={
            <Link to="/hr/appraisal-cycles" className="text-sm text-stone-700 hover:underline dark:text-stone-200">
              Back to Appraisal Cycles
            </Link>
          }
        />
      </DashboardLayout>
    );
  }

  const readOnly = cycle.status === "COMPLETED";
  const canEditConfig = cycle.status === "DRAFT";

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link to="/hr/appraisal-cycles" className="text-sm text-stone-500 hover:text-stone-800">
              ← Appraisal Cycles
            </Link>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">{cycle.name}</h1>
              <StatusBadge status={cycle.status} />
            </div>
            <p className="mt-1 text-sm text-stone-500">
              {formatDate(cycle.startDate)} — {formatDate(cycle.endDate)}
            </p>
            {cycle.description ? (
              <p className="mt-2 max-w-3xl text-sm text-stone-600 dark:text-stone-300">
                {cycle.description}
              </p>
            ) : null}
            {readOnly ? (
              <p className="mt-2 text-xs text-stone-500">
                This historical cycle is read-only.
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {cycle.status === "DRAFT" ? (
              <Button type="button" onClick={() => setConfirmOpen(true)}>
                Confirm Cycle
              </Button>
            ) : null}
            {cycle.status === "DRAFT" ? (
              <Button
                type="button"
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/40"
                onClick={() => setDeleteOpen(true)}
              >
                Delete
              </Button>
            ) : null}
            {cycle.status === "UPCOMING" ? (
              <Button type="button" onClick={() => setActivateOpen(true)}>
                Activate Cycle
              </Button>
            ) : null}
            {cycle.status === "ACTIVE" ? (
              <Button type="button" variant="outline" onClick={() => setCompleteOpen(true)}>
                Complete Cycle
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap gap-1 border-b border-stone-200 dark:border-stone-800">
          {(
            [
              ["overview", "Overview"],
              ["batches", "Batches"],
              ["supervisors", "Supervisors"],
              ["timeline", "Timeline"],
              ["history", "Assignment History"],
              ["settings", "Settings"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setParams({ tab: key })}
              className={cn(
                "rounded-t-lg px-4 py-2 text-sm",
                tab === key
                  ? "bg-white font-medium text-stone-900 dark:bg-stone-900 dark:text-stone-50"
                  : "text-stone-500 hover:text-stone-800"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "overview" ? <OverviewTab cycleId={cycleId} /> : null}
        {tab === "batches" ? <BatchesTab cycleId={cycleId} readOnly={readOnly} /> : null}
        {tab === "supervisors" ? <SupervisorsTab cycleId={cycleId} /> : null}
        {tab === "timeline" ? <DetailedTimelineTab cycle={cycle} /> : null}
        {tab === "history" ? <HistoryTab cycleId={cycleId} /> : null}
        {tab === "settings" ? <SettingsTab cycleId={cycleId} canEditConfig={canEditConfig} /> : null}
      </div>

      <ConfirmCycleDialog cycle={cycle} open={confirmOpen} onClose={() => setConfirmOpen(false)} />
      <ActivateCycleDialog cycle={cycle} open={activateOpen} onClose={() => setActivateOpen(false)} />
      <CompleteCycleDialog cycle={cycle} open={completeOpen} onClose={() => setCompleteOpen(false)} />
      <DeleteDraftCycleDialog
        cycle={cycle}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => navigate("/hr/appraisal-cycles")}
      />
    </DashboardLayout>
  );
}

export function SettingsTab({ cycleId, canEditConfig }: { cycleId: string; canEditConfig: boolean; }) {
  const cycleQuery = useAppraisalCycle(cycleId);
  const cycle = cycleQuery.data;
  const updateCycle = useUpdateCycle(cycleId);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [batchStarts, setBatchStarts] = useState<string[]>([]);

  if (!cycle) return null;
  const currentCycle = cycle;

  function startEdit() {
    setName(currentCycle.name);
    setDescription(currentCycle.description ?? "");
    setStartDate(toDateInputValue(currentCycle.startDate));
    setBatchStarts(currentCycle.batches.map((batch) => toDateInputValue(batch.startDate)));
    setEditing(true);
  }

  async function save() {
    await updateCycle.mutateAsync({
      name,
      description,
      startDate,
      batches: currentCycle.batches.map((batch, index) => ({
        name: batch.name,
        description: batch.description,
        startDate: batchStarts[index] ?? toDateInputValue(batch.startDate),
      })),
    });
    setEditing(false);
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Cycle configuration</h2>
          {canEditConfig && !editing ? (
            <Button type="button" size="sm" variant="outline" onClick={startEdit}>
              Edit draft
            </Button>
          ) : null}
        </div>
        {editing ? (
          <div className="mt-4 space-y-3">
            <div className="space-y-1">
              <Label>Cycle name</Label>
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <textarea
                className="min-h-20 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-950"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Start date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
              <p className="text-xs text-stone-500">
                End date: {startDate ? formatDate(addOneYearIso(startDate)) : "—"}
              </p>
            </div>
            {cycle.batches.map((batch, index) => (
              <div key={batch.id} className="grid gap-2 sm:grid-cols-2">
                <p className="text-sm font-medium">{getBatchDisplayName(batch)}</p>
                <Input
                  type="date"
                  value={batchStarts[index] ?? ""}
                  onChange={(event) =>
                    setBatchStarts((current) =>
                      current.map((value, itemIndex) =>
                        itemIndex === index ? event.target.value : value
                      )
                    )
                  }
                />
              </div>
            ))}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              <Button type="button" onClick={save} disabled={updateCycle.isPending}>
                Save
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-stone-500">
            {canEditConfig
              ? "Click 'Edit draft' to change the cycle parameters before confirming."
              : "Cycle configuration cannot be changed after confirmation."}
          </p>
        )}
      </div>
    </div>
  );
}

function OverviewTab({ cycleId }: { cycleId: string }) {
  const cycleQuery = useAppraisalCycle(cycleId);
  const cycle = cycleQuery.data;

  if (!cycle) return null;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryStat
          label="Cycle period"
          value={`${formatDate(cycle.startDate)} — ${formatDate(cycle.endDate)}`}
        />
        <SummaryStat label="Total batches" value={cycle.batches.length} />
        <SummaryStat label="Employees" value={cycle.summary.totalEmployeesAssigned} />
        <SummaryStat label="Supervisors" value={cycle.summary.supervisorCount} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
            <h2 className="text-sm font-medium">Description</h2>
            <p className="mt-3 text-sm text-stone-600 dark:text-stone-300">
              {cycle.description || "No description provided."}
            </p>
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-stone-500">Start date</dt>
                <dd>{formatDate(cycle.startDate)}</dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500">End date</dt>
                <dd>{formatDate(cycle.endDate)}</dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500">Confirmed</dt>
                <dd>{formatDate(cycle.confirmedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500">Activated</dt>
                <dd>{formatDate(cycle.activatedAt)}</dd>
              </div>
            </dl>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryStat label="Assignable employees" value={cycle.summary.totalAssignableEmployees} />
            <SummaryStat label="Without batch" value={cycle.summary.employeesWithoutBatch} warn />
            <SummaryStat
              label="Without supervisor"
              value={cycle.summary.employeesWithoutSupervisor}
              warn
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function BatchesTab({ cycleId, readOnly }: { cycleId: string; readOnly: boolean }) {
  const cycleQuery = useAppraisalCycle(cycleId);
  const cycle = cycleQuery.data;
  const unassignedQuery = useCycleEmployees(cycleId, {
    assignmentStatus: "NEEDS_ASSIGNMENT",
    page: 1,
    pageSize: 10,
  });
  const [batchEmployee, setBatchEmployee] = useState<CycleEmployeeRow | null>(null);
  const [supervisorEmployee, setSupervisorEmployee] = useState<CycleEmployeeRow | null>(null);

  if (!cycle) return null;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        {cycle.batches.map((batch) => (
          <div
            key={batch.id}
            className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{getBatchDisplayName(batch)}</p>
              <StatusBadge status={batch.status} />
            </div>
            <p className="mt-1 text-xs text-stone-500">
              {formatDate(batch.startDate)} — {formatDate(batch.endDate)}
            </p>
            <p className="mt-3 text-sm">{batch.employeeCount} employees</p>
            <Link
              to={`/hr/appraisal-cycles/${cycleId}/batches/${batch.id}`}
              className="mt-3 inline-flex h-8 items-center rounded-lg border border-stone-300 px-3 text-xs font-medium hover:bg-stone-50 dark:border-stone-600"
            >
              View All Employees
            </Link>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-medium">Needs assignment</h2>
            <p className="text-xs text-stone-500">
              Employees without batch: {cycle.summary.employeesWithoutBatch} · without
              supervisor: {cycle.summary.employeesWithoutSupervisor}
            </p>
          </div>
          <Link
            to={`/hr/appraisal-cycles/${cycleId}/batches/unassigned`}
            className="text-sm text-stone-900 hover:underline dark:text-stone-100"
          >
            View all
          </Link>
        </div>
        {unassignedQuery.isLoading ? (
          <p className="mt-3 text-sm text-stone-500">Loading…</p>
        ) : (unassignedQuery.data?.employees.length ?? 0) === 0 ? (
          <p className="mt-3 text-sm text-stone-500">All employees currently have assignments.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs text-stone-500">
                <tr>
                  <th className="px-2 py-2">Employee</th>
                  <th className="px-2 py-2">Employee ID</th>
                  <th className="px-2 py-2">Department</th>
                  <th className="px-2 py-2">Batch</th>
                  <th className="px-2 py-2">Supervisor</th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {unassignedQuery.data!.employees.map((employee) => (
                  <tr key={employee.id} className="border-t border-stone-100 dark:border-stone-800">
                    <td className="px-2 py-2 font-medium">{employee.name}</td>
                    <td className="px-2 py-2">{employee.employeeId}</td>
                    <td className="px-2 py-2">{employee.department?.name ?? "—"}</td>
                    <td className="px-2 py-2">
                      {employee.batch ? getBatchDisplayName(employee.batch) : "Not assigned"}
                    </td>
                    <td className="px-2 py-2">{employee.supervisor?.name ?? "Not assigned"}</td>
                    <td className="px-2 py-2">
                      <div className="flex gap-2">
                        {!employee.batch ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={readOnly}
                            onClick={() => setBatchEmployee(employee)}
                          >
                            Assign batch
                          </Button>
                        ) : null}
                        {!employee.supervisor ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={readOnly}
                            onClick={() => setSupervisorEmployee(employee)}
                          >
                            Assign supervisor
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ChangeBatchDialog
        key={batchEmployee?.id ?? "batch"}
        open={Boolean(batchEmployee)}
        onClose={() => setBatchEmployee(null)}
        cycleId={cycleId}
        employee={batchEmployee}
        batches={cycle.batches}
        readOnly={readOnly}
      />
      <ChangeSupervisorDialog
        key={supervisorEmployee?.id ?? "supervisor"}
        open={Boolean(supervisorEmployee)}
        onClose={() => setSupervisorEmployee(null)}
        cycleId={cycleId}
        employee={supervisorEmployee}
        readOnly={readOnly}
      />
    </div>
  );
}

function SupervisorsTab({ cycleId }: { cycleId: string }) {
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const departments = useDepartments();
  const supervisorsQuery = useCycleSupervisors(cycleId, {
    search: search || undefined,
    departmentId: departmentId || undefined,
    grouped: true,
    assignedOnly: true,
  });

  const groups = supervisorsQuery.data?.groups ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900 sm:flex-row sm:items-end">
        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Search</Label>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Supervisor name or ID"
            />
          </div>
          <div className="space-y-1">
            <Label>Department</Label>
            <select
              className={fieldClass}
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
            >
              <option value="">All</option>
              {(departments.data ?? []).map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setSearch("");
              setDepartmentId("");
            }}
          >
            Clear filters
          </Button>
        </div>
      </div>

      {supervisorsQuery.isLoading ? (
        <p className="text-sm text-stone-500">Loading supervisors…</p>
      ) : groups.length === 0 ? (
        <EmptyState
          title="No supervisors match your filters."
          description="Try another department or clear the search."
        />
      ) : (
        groups.map((group) => (
          <div key={group.department?.id ?? "none"} className="space-y-2">
            <h2 className="text-xs font-medium uppercase tracking-wide text-stone-500">
              {group.department?.name ?? "Unassigned"}
            </h2>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {group.supervisors.slice(0, 6).map((supervisor) => (
                <Link
                  key={supervisor.id}
                  to={`/hr/appraisal-cycles/${cycleId}/supervisors/${supervisor.id}`}
                  className="rounded-xl border border-stone-200 bg-white px-4 py-3 dark:border-stone-800 dark:bg-stone-900"
                >
                  <p className="text-sm font-medium">{supervisor.name}</p>
                  <p className="text-xs text-stone-500">{supervisor.employeeId}</p>
                  <p className="mt-2 text-sm">{supervisor.employeeCount} employees</p>
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function HistoryTab({ cycleId }: { cycleId: string }) {
  const cycleQuery = useAppraisalCycle(cycleId);
  const departments = useDepartments();
  const [filters, setFilters] = useState({
    search: "",
    departmentId: "",
    changeType: "ALL",
    from: "",
    to: "",
    page: 1,
  });
  const applied = useMemo(
    () => ({
      search: filters.search || undefined,
      departmentId: filters.departmentId || undefined,
      changeType: filters.changeType === "ALL" ? undefined : filters.changeType,
      from: filters.from || undefined,
      to: filters.to || undefined,
      page: filters.page,
      pageSize: 20,
    }),
    [filters]
  );
  const historyQuery = useAssignmentHistory(cycleId, applied);
  const data = historyQuery.data;

  return (
    <div className="space-y-4 rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Input
          placeholder="Employee or ID"
          value={filters.search}
          onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value, page: 1 }))}
        />
        <select
          className={fieldClass}
          value={filters.departmentId}
          onChange={(event) =>
            setFilters((current) => ({ ...current, departmentId: event.target.value, page: 1 }))
          }
        >
          <option value="">All departments</option>
          {(departments.data ?? []).map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
        <select
          className={fieldClass}
          value={filters.changeType}
          onChange={(event) =>
            setFilters((current) => ({ ...current, changeType: event.target.value, page: 1 }))
          }
        >
          <option value="ALL">All change types</option>
          <option value="BATCH">Batch</option>
          <option value="SUPERVISOR">Supervisor</option>
        </select>
        <Input
          type="date"
          value={filters.from}
          onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value, page: 1 }))}
        />
        <Input
          type="date"
          value={filters.to}
          onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value, page: 1 }))}
        />
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            setFilters({
              search: "",
              departmentId: "",
              changeType: "ALL",
              from: "",
              to: "",
              page: 1,
            })
          }
        >
          Clear filters
        </Button>
      </div>

      {historyQuery.isLoading ? (
        <p className="text-sm text-stone-500">Loading history…</p>
      ) : (data?.entries.length ?? 0) === 0 ? (
        <EmptyState
          title="No assignment changes have been recorded."
          description="Batch and supervisor changes will appear here."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-stone-200 text-xs text-stone-500 dark:border-stone-800">
              <tr>
                <th className="px-2 py-2">Date/Time</th>
                <th className="px-2 py-2">Employee</th>
                <th className="px-2 py-2">Employee ID</th>
                <th className="px-2 py-2">Department</th>
                <th className="px-2 py-2">Change type</th>
                <th className="px-2 py-2">Previous</th>
                <th className="px-2 py-2">New</th>
                <th className="px-2 py-2">Reason</th>
                <th className="px-2 py-2">Changed by</th>
                <th className="px-2 py-2">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {data!.entries.map((entry) => (
                <tr key={entry.id} className="border-b border-stone-100 dark:border-stone-800">
                  <td className="px-2 py-2 whitespace-nowrap">
                    {new Date(entry.changedAt).toLocaleString()}
                  </td>
                  <td className="px-2 py-2">{entry.employee.name}</td>
                  <td className="px-2 py-2">{entry.employee.employeeId}</td>
                  <td className="px-2 py-2">{entry.employee.department?.name ?? "—"}</td>
                  <td className="px-2 py-2">
                    {entry.changeType === "BATCH" ? "Batch reassignment" : "Supervisor reassignment"}
                  </td>
                  <td className="px-2 py-2">{entry.previousLabel}</td>
                  <td className="px-2 py-2">{entry.newLabel}</td>
                  <td className="px-2 py-2">{entry.reason}</td>
                  <td className="px-2 py-2">{entry.changedBy.name}</td>
                  <td className="px-2 py-2">
                    {entry.evidence ? (
                      <a
                        className="text-stone-900 hover:underline dark:text-stone-100"
                        href={`${API_BASE_URL}/hr/appraisal-cycles/evidence/${entry.evidence}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {entry.evidenceName ?? "File"}
                      </a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination
            page={data!.page}
            totalPages={data!.totalPages}
            total={data!.total}
            onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
          />
        </div>
      )}
      {cycleQuery.data?.status === "COMPLETED" ? (
        <p className="text-xs text-stone-500">
          Historical assignment records remain available and cannot be deleted.
        </p>
      ) : null}
    </div>
  );
}
