import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import DashboardLayout from "@/app/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, fieldClass } from "@/features/hr/components/ActionMenu";
import ChangeBatchDialog from "@/features/hr/components/ChangeBatchDialog";
import ChangeSupervisorDialog from "@/features/hr/components/ChangeSupervisorDialog";
import { AssignmentHistoryDrawer } from "@/features/hr/components/AssignmentHistoryDrawer";
import { Pagination } from "@/features/hr/components/Pagination";
import { StatusBadge } from "@/features/hr/components/StatusBadge";
import { SummaryStat } from "@/features/hr/components/SummaryStat";
import {
  useAppraisalCycle,
  useBatchDetail,
  useCycleEmployees,
  useCycleSupervisors,
  useDepartments,
} from "@/features/hr/hooks/useAppraisalCycles";
import type { CycleEmployeeRow } from "@/features/hr/types";
import { formatDate, getBatchDisplayName } from "@/features/hr/utils/dates";

export default function BatchDetailPage() {
  const { cycleId, batchId } = useParams<{ cycleId: string; batchId: string }>();
  const isUnassigned = batchId === "unassigned";
  const cycleQuery = useAppraisalCycle(cycleId);
  const batchQuery = useBatchDetail(cycleId, isUnassigned ? undefined : batchId);
  const departments = useDepartments();
  const supervisorsQuery = useCycleSupervisors(cycleId, { grouped: true });
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [supervisorId, setSupervisorId] = useState("");
  const [status, setStatus] = useState(isUnassigned ? "NEEDS_ASSIGNMENT" : "ALL");
  const [page, setPage] = useState(1);
  const [batchEmployee, setBatchEmployee] = useState<CycleEmployeeRow | null>(null);
  const [supervisorEmployee, setSupervisorEmployee] = useState<CycleEmployeeRow | null>(null);
  const [historyEmployee, setHistoryEmployee] = useState<CycleEmployeeRow | null>(null);

  const employeesQuery = useCycleEmployees(cycleId, {
    search: search || undefined,
    departmentId: departmentId || undefined,
    supervisorId: supervisorId || undefined,
    batchId: isUnassigned ? undefined : batchId,
    assignmentStatus: status === "ALL" ? undefined : status,
    page,
    pageSize: 20,
  });

  const cycle = cycleQuery.data;
  const batch = batchQuery.data;
  const readOnly = cycle?.status === "COMPLETED";
  const supervisorOptions =
    supervisorsQuery.data?.groups?.flatMap((group) => group.supervisors) ?? [];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-5">
        <Link
          to={`/hr/appraisal-cycles/${cycleId}?tab=batches`}
          className="text-sm text-stone-500"
        >
          ← Back to batches
        </Link>

        {isUnassigned ? (
          <div>
            <h1 className="text-2xl font-semibold">Needs assignment</h1>
            <p className="mt-1 text-sm text-stone-500">
              Employees without a batch or supervisor in this cycle.
            </p>
          </div>
        ) : batchQuery.isLoading ? (
          <p className="text-sm text-stone-500">Loading batch…</p>
        ) : !batch ? (
          <EmptyState title="Batch not found." description="Return to the cycle and try again." />
        ) : (
          <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold">{getBatchDisplayName(batch)}</h1>
              <StatusBadge status={batch.status} />
            </div>
            <p className="mt-1 text-sm text-stone-500">
              Batch {batch.batchNumber} · {formatDate(batch.startDate)} — {formatDate(batch.endDate)}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <SummaryStat label="Total employees" value={batch.employeeCount} />
              <SummaryStat label="Assigned supervisors" value={batch.supervisorCount ?? 0} />
              <SummaryStat
                label="Without supervisor"
                value={batch.employeesWithoutSupervisor ?? 0}
                warn
              />
            </div>
          </div>
        )}

        <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1">
              <Label>Search</Label>
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Employee name or ID"
              />
            </div>
            <div className="space-y-1">
              <Label>Department</Label>
              <select
                className={fieldClass}
                value={departmentId}
                onChange={(event) => {
                  setDepartmentId(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All</option>
                {(departments.data ?? []).map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Supervisor</Label>
              <select
                className={fieldClass}
                value={supervisorId}
                onChange={(event) => {
                  setSupervisorId(event.target.value);
                  setPage(1);
                }}
              >
                <option value="">All</option>
                {supervisorOptions.map((supervisor) => (
                  <option key={supervisor.id} value={supervisor.id}>
                    {supervisor.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <select
                className={fieldClass}
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value);
                  setPage(1);
                }}
              >
                <option value="ALL">All</option>
                <option value="COMPLETE">Assigned</option>
                <option value="NEEDS_ASSIGNMENT">Needs assignment</option>
                <option value="NO_BATCH">No batch</option>
                <option value="NO_SUPERVISOR">No supervisor</option>
              </select>
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => {
              setSearch("");
              setDepartmentId("");
              setSupervisorId("");
              setStatus(isUnassigned ? "NEEDS_ASSIGNMENT" : "ALL");
              setPage(1);
            }}
          >
            Clear filters
          </Button>

          {employeesQuery.isLoading ? (
            <p className="mt-4 text-sm text-stone-500">Loading employees…</p>
          ) : (employeesQuery.data?.employees.length ?? 0) === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="No employees match the selected filters."
                description="Clear filters or choose another batch."
              />
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-stone-200 text-xs text-stone-500 dark:border-stone-800">
                  <tr>
                    <th className="px-3 py-2">Employee</th>
                    <th className="px-3 py-2">Employee ID</th>
                    <th className="px-3 py-2">Department</th>
                    <th className="px-3 py-2">Supervisor</th>
                    <th className="px-3 py-2">Assignment status</th>
                    <th className="px-3 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employeesQuery.data!.employees.map((employee) => (
                    <tr
                      key={employee.id}
                      className="border-b border-stone-100 dark:border-stone-800"
                    >
                      <td className="px-3 py-3 font-medium">{employee.name}</td>
                      <td className="px-3 py-3">{employee.employeeId}</td>
                      <td className="px-3 py-3">{employee.department?.name ?? "—"}</td>
                      <td className="px-3 py-3">
                        {employee.supervisor?.name ?? "Not assigned"}
                      </td>
                      <td className="px-3 py-3">{employee.assignmentStatus}</td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={readOnly}
                            onClick={() => setBatchEmployee(employee)}
                          >
                            {employee.batch ? "Change batch" : "Assign batch"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={readOnly}
                            onClick={() => setSupervisorEmployee(employee)}
                          >
                            {employee.supervisor ? "Reassign supervisor" : "Assign supervisor"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setHistoryEmployee(employee)}
                          >
                            View history
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination
                page={employeesQuery.data!.page}
                totalPages={employeesQuery.data!.totalPages}
                total={employeesQuery.data!.total}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      </div>

      <ChangeBatchDialog
        key={batchEmployee?.id ?? "batch"}
        open={Boolean(batchEmployee)}
        onClose={() => setBatchEmployee(null)}
        cycleId={cycleId ?? ""}
        employee={batchEmployee}
        batches={cycle?.batches ?? []}
        readOnly={readOnly}
      />
      <ChangeSupervisorDialog
        key={supervisorEmployee?.id ?? "supervisor"}
        open={Boolean(supervisorEmployee)}
        onClose={() => setSupervisorEmployee(null)}
        cycleId={cycleId ?? ""}
        employee={supervisorEmployee}
        readOnly={readOnly}
      />
      <AssignmentHistoryDrawer
        open={Boolean(historyEmployee)}
        onClose={() => setHistoryEmployee(null)}
        cycleId={cycleId ?? ""}
        employeeId={historyEmployee?.employeeId}
        employeeName={historyEmployee?.name}
      />
    </DashboardLayout>
  );
}
