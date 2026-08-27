import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import DashboardLayout from "@/app/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, fieldClass } from "@/features/hr/components/ActionMenu";
import { Pagination } from "@/features/hr/components/Pagination";
import { StatusBadge } from "@/features/hr/components/StatusBadge";
import { SummaryStat } from "@/features/hr/components/SummaryStat";
import {
  useCycleSupervisors,
  useDepartments,
} from "@/features/hr/hooks/useAppraisalCycles";

export default function SupervisorsPage() {
  const { cycleId } = useParams<{ cycleId: string }>();
  const departments = useDepartments();
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [page, setPage] = useState(1);
  const query = useCycleSupervisors(cycleId, {
    search: search || undefined,
    departmentId: departmentId || undefined,
    grouped: false,
    assignedOnly: true,
    page,
    pageSize: 12,
  });
  const stats = query.data?.stats;
  const supervisors = query.data?.supervisors ?? [];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-5">
        <Link
          to="/hr/appraisal-cycles"
          className="text-sm text-stone-500"
        >
          ← Back to Appraisal Cycle Management
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">Supervisors</h1>
          <p className="mt-1 text-sm text-stone-500">
            Supervisors grouped by department, with the employees they manage in this cycle.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryStat label="Total supervisors" value={stats?.totalSupervisors ?? 0} />
          <SummaryStat label="Total employees" value={stats?.totalEmployees ?? 0} />
          <SummaryStat
            label="Average employees per supervisor"
            value={stats?.averageEmployeesPerSupervisor ?? 0}
          />
        </div>

        <div className="rounded-xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1">
              <Label>Search</Label>
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Supervisor name or ID"
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
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => {
              setSearch("");
              setDepartmentId("");
              setPage(1);
            }}
          >
            Clear filters
          </Button>

          {query.isLoading ? (
            <p className="mt-4 text-sm text-stone-500">Loading supervisors…</p>
          ) : supervisors.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                title="No supervisors match your filters."
                description="Try another department or clear the search."
              />
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-stone-200 text-xs text-stone-500 dark:border-stone-800">
                  <tr>
                    <th className="px-3 py-2">Supervisor</th>
                    <th className="px-3 py-2">Employee ID</th>
                    <th className="px-3 py-2">Department</th>
                    <th className="px-3 py-2">Employees managed</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {supervisors.map((supervisor) => (
                    <tr
                      key={supervisor.id}
                      className="border-b border-stone-100 dark:border-stone-800"
                    >
                      <td className="px-3 py-3 font-medium">{supervisor.name}</td>
                      <td className="px-3 py-3">{supervisor.employeeId}</td>
                      <td className="px-3 py-3">{supervisor.department?.name ?? "—"}</td>
                      <td className="px-3 py-3">{supervisor.employeeCount}</td>
                      <td className="px-3 py-3">
                        <StatusBadge status={supervisor.status ?? "ACTIVE"} />
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          to={`/hr/appraisal-cycles/${cycleId}/supervisors/${supervisor.id}`}
                          className="text-sm font-medium text-stone-900 hover:underline dark:text-stone-100"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Pagination
                page={query.data?.page ?? 1}
                totalPages={query.data?.totalPages ?? 1}
                total={query.data?.total ?? 0}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
