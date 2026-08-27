import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Link } from "react-router-dom";
import DashboardLayout from "@/app/layouts/DashboardLayout";
import { formatRoleLabel } from "@/constants/roles";
import { StatusBadge } from "@/features/hr/components/StatusBadge";
import { Pagination } from "@/features/hr/components/Pagination";
import { fieldClass } from "@/features/hr/components/ActionMenu";
import { useMyTeam } from "@/features/supervisor/hooks/useMyTeam";
import type { TeamMember } from "@/features/supervisor/types";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/features/auth/types";

const PAGE_SIZE = 10;

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function batchLabel(member: TeamMember) {
  if (!member.batch) return "Unassigned";
  if (!member.batch.startDate) return member.batch.name;
  const month = new Date(member.batch.startDate).toLocaleDateString("en-US", {
    month: "short",
  });
  return `${member.batch.name} (${month})`;
}

function PdpCell({ member }: { member: TeamMember }) {
  if (!member.pdp) {
    return <span className="text-stone-400">—</span>;
  }

  const progress = member.pdp.progress ?? 0;
  const showPercent = progress > 0;
  const label = showPercent ? `${progress}%` : member.pdp.status.replaceAll("_", " ");

  return (
    <div className="min-w-[8rem]">
      <p className="text-xs font-medium uppercase tracking-wide text-stone-600 dark:text-stone-300">
        {label}
      </p>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800">
        <div
          className="h-full rounded-full bg-amber-500 dark:bg-amber-400"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}

export default function MyTeamPage() {
  const [search, setSearch] = useState("");
  const [batchId, setBatchId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [page, setPage] = useState(1);

  const filters = useMemo(
    () => ({
      search: search.trim() || undefined,
      batchId: batchId || undefined,
      departmentId: departmentId || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
    [search, batchId, departmentId, page]
  );

  const query = useMyTeam(filters);
  const data = query.data;
  const stats = data?.stats;

  function changeFilter<T>(setter: (value: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <p className="text-xs text-stone-500">Home / My Team</p>
          <h1 className="mt-2 text-2xl font-semibold text-stone-900 dark:text-white">
            My Team
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Employees assigned to you in the current appraisal cycle.
            {data?.cycle ? ` ${data.cycle.name}.` : ""}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Total team size" value={stats?.teamSize ?? 0} />
          <KpiCard
            label="Active PDPs"
            value={stats?.activePdps ?? 0}
            highlight
          />
          <KpiCard
            label="Avg. PDP progress"
            value={`${stats?.avgPdpProgress ?? 0}%`}
          />
          <KpiCard
            label="Completed reviews"
            value={stats?.completedReviews ?? 0}
          />
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <input
              className={`${fieldClass} pl-9`}
              value={search}
              onChange={(event) => changeFilter(setSearch, event.target.value)}
              placeholder="Search team members..."
              aria-label="Search team members"
            />
          </div>
          <select
            className={`${fieldClass} lg:w-48`}
            value={batchId}
            onChange={(event) => changeFilter(setBatchId, event.target.value)}
            aria-label="All Batches"
          >
            <option value="">All Batches</option>
            {(data?.batches ?? []).map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.name}
              </option>
            ))}
          </select>
          <select
            className={`${fieldClass} lg:w-52`}
            value={departmentId}
            onChange={(event) =>
              changeFilter(setDepartmentId, event.target.value)
            }
            aria-label="All Departments"
          >
            <option value="">All Departments</option>
            {(data?.departments ?? []).map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
          {query.isLoading ? (
            <p className="p-6 text-sm text-stone-500">Loading your team…</p>
          ) : query.isError ? (
            <p className="p-6 text-sm text-red-600">
              Unable to load your assigned employees. Please try again.
            </p>
          ) : (data?.employees.length ?? 0) === 0 ? (
            <p className="p-6 text-sm text-stone-500">
              {data?.stats.teamSize
                ? "No team members match the current filters."
                : "No employees are assigned to you in the current appraisal cycle."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-stone-200 text-[11px] font-medium uppercase tracking-wide text-stone-400 dark:border-stone-800">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Role / Department</th>
                    <th className="px-4 py-3">Appraisal Batch</th>
                    <th className="px-4 py-3">PDP</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.employees.map((member) => (
                    <tr
                      key={member.id}
                      className="border-b border-stone-100 dark:border-stone-800"
                    >
                      <td className="px-4 py-3">
                        <Link
                          to={`/supervisor/my-team/${member.id}`}
                          className="flex items-center gap-3 hover:opacity-80"
                        >
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-900 dark:bg-amber-400/20 dark:text-amber-200">
                            {initials(member.name)}
                          </div>
                          <div>
                            <p className="font-medium text-stone-900 dark:text-white">
                              {member.name}
                            </p>
                            <p className="text-xs text-stone-500">
                              {member.employeeId}
                            </p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-stone-800 dark:text-stone-200">
                          {formatRoleLabel(member.role as UserRole)}
                        </p>
                        <p className="text-xs text-stone-500">
                          {member.department?.name ?? "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-stone-700 dark:text-stone-300">
                        {batchLabel(member)}
                      </td>
                      <td className="px-4 py-3">
                        <PdpCell member={member} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={member.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data && data.total > 0 ? (
            <div className="border-t border-stone-200 px-4 pb-4 dark:border-stone-800">
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                total={data.total}
                pageSize={data.pageSize}
                itemLabel="employees"
                onPageChange={setPage}
              />
            </div>
          ) : null}
        </div>
      </div>
    </DashboardLayout>
  );
}

function KpiCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number | string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-white p-4 dark:bg-stone-900",
        highlight
          ? "border-amber-300 dark:border-amber-500/50"
          : "border-stone-200 dark:border-stone-800"
      )}
    >
      <p className="text-xs uppercase tracking-wider text-stone-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-stone-900 dark:text-white">
        {value}
      </p>
    </div>
  );
}
