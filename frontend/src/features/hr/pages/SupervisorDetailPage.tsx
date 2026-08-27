import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import DashboardLayout from "@/app/layouts/DashboardLayout";
import { EmptyState, fieldClass } from "@/features/hr/components/ActionMenu";
import { AssignmentHistoryDrawer } from "@/features/hr/components/AssignmentHistoryDrawer";
import ChangeSupervisorDialog from "@/features/hr/components/ChangeSupervisorDialog";
import { StatusBadge } from "@/features/hr/components/StatusBadge";
import {
  useAppraisalCycle,
  useSupervisorDetail,
} from "@/features/hr/hooks/useAppraisalCycles";
import type { CycleEmployeeRow } from "@/features/hr/types";
import { getCurrentWorkflowStageLabel } from "@/features/hr/utils/cycle-progress";
import { getBatchDisplayName } from "@/features/hr/utils/dates";

export default function SupervisorDetailPage() {
  const { cycleId, supervisorId } = useParams<{
    cycleId: string;
    supervisorId: string;
  }>();
  const cycleQuery = useAppraisalCycle(cycleId);
  const detailQuery = useSupervisorDetail(cycleId, supervisorId);
  const [selected, setSelected] = useState<CycleEmployeeRow | null>(null);
  const [historyEmployee, setHistoryEmployee] = useState<CycleEmployeeRow | null>(null);
  const [batchId, setBatchId] = useState("");
  const readOnly = cycleQuery.data?.status === "COMPLETED";
  const pdpLabel = cycleQuery.data
    ? getCurrentWorkflowStageLabel(cycleQuery.data)
    : "Planning";

  const employees = useMemo(() => {
    const rows = detailQuery.data?.employees ?? [];
    if (!batchId) return rows;
    return rows.filter((employee) => employee.batch?.id === batchId);
  }, [detailQuery.data?.employees, batchId]);

  const batchOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const employee of detailQuery.data?.employees ?? []) {
      if (employee.batch) {
        map.set(employee.batch.id, getBatchDisplayName(employee.batch));
      }
    }
    return Array.from(map.entries());
  }, [detailQuery.data?.employees]);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-5xl space-y-5">
        <Link
          to={`/hr/appraisal-cycles/${cycleId}/supervisors`}
          className="text-sm text-stone-500"
        >
          ← Back to supervisors
        </Link>

        {detailQuery.isLoading ? (
          <p className="text-sm text-stone-500">Loading supervisor…</p>
        ) : detailQuery.isError || !detailQuery.data ? (
          <EmptyState
            title="Unable to load supervisor detail."
            description="Return to the supervisor list and try again."
          />
        ) : (
          <>
            <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold">
                  {detailQuery.data.supervisor.name}
                </h1>
                <StatusBadge status="ACTIVE" />
              </div>
              <div className="mt-3 grid gap-2 text-sm text-stone-600 dark:text-stone-300 sm:grid-cols-2">
                <p>Supervisor ID: {detailQuery.data.supervisor.employeeId}</p>
                <p>Email: {detailQuery.data.supervisor.companyEmail ?? "—"}</p>
                <p>Department: {detailQuery.data.supervisor.department?.name ?? "—"}</p>
                <p>Current cycle: {detailQuery.data.cycle.name}</p>
                <p>Assigned employees: {detailQuery.data.employeeCount}</p>
                <p>Status: Active in this cycle</p>
              </div>
            </div>

            <div className="rounded-xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <h2 className="text-sm font-medium">Employees under supervisor</h2>
                <select
                  className={`${fieldClass} h-9 w-full sm:w-56`}
                  value={batchId}
                  onChange={(event) => setBatchId(event.target.value)}
                >
                  <option value="">All batches</option>
                  {batchOptions.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>
              {employees.length === 0 ? (
                <p className="mt-3 text-sm text-stone-500">
                  No employees match the selected batch filter.
                </p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-stone-200 text-xs text-stone-500 dark:border-stone-800">
                      <tr>
                        <th className="px-3 py-2">Employee</th>
                        <th className="px-3 py-2">Employee ID</th>
                        <th className="px-3 py-2">Department</th>
                        <th className="px-3 py-2">Batch</th>
                        <th className="px-3 py-2">PDP progress</th>
                        <th className="px-3 py-2">Status</th>
                        <th className="px-3 py-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {employees.map((employee) => (
                        <tr
                          key={employee.id}
                          className="border-b border-stone-100 dark:border-stone-800"
                        >
                          <td className="px-3 py-3 font-medium">{employee.name}</td>
                          <td className="px-3 py-3">{employee.employeeId}</td>
                          <td className="px-3 py-3">
                            {employee.department?.name ?? "—"}
                          </td>
                          <td className="px-3 py-3">
                            {employee.batch
                              ? getBatchDisplayName(employee.batch)
                              : "Not assigned"}
                          </td>
                          <td className="px-3 py-3">{pdpLabel}</td>
                          <td className="px-3 py-3">
                            <StatusBadge status={employee.assignmentStatus} />
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                className="text-sm font-medium text-stone-900 hover:underline disabled:opacity-50 dark:text-stone-100"
                                disabled={readOnly}
                                onClick={() => setSelected(employee)}
                              >
                                Reassign
                              </button>
                              <button
                                type="button"
                                className="text-sm text-stone-500 hover:text-stone-800"
                                onClick={() => setHistoryEmployee(employee)}
                              >
                                History
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <ChangeSupervisorDialog
        key={selected?.id ?? "supervisor"}
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        cycleId={cycleId ?? ""}
        employee={selected}
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
