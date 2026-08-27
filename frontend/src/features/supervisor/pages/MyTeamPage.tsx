import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import DashboardLayout from "@/app/layouts/DashboardLayout";
import { formatRoleLabel } from "@/constants/roles";
import { StatusBadge } from "@/features/hr/components/StatusBadge";
import { Pagination } from "@/features/hr/components/Pagination";
import { fieldClass } from "@/features/hr/components/ActionMenu";
import { OverlayModal, initials as avatarInitials } from "@/features/employees/components/OverlayModal";
import { AppraisalProgressDetails } from "@/features/dashboard/components/AppraisalProgressDetails";
import { AppraisalTimelineCard } from "@/features/dashboard/components/AppraisalTimelineCard";
import { AppraisalHistoryPanel } from "@/features/history/components/AppraisalHistoryPanel";
import { useMyTeam, useTeamMember } from "@/features/supervisor/hooks/useMyTeam";
import type { TeamMember } from "@/features/supervisor/types";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/features/auth/types";

// Keep the list to identity + current stage. Full details open in the popup.

const PAGE_SIZE = 10;

function initials(name: string) {
  return avatarInitials(name);
}

function batchLabel(member: TeamMember) {
  if (!member.batch) return "Unassigned";
  if (!member.batch.startDate) return member.batch.name;
  const month = new Date(member.batch.startDate).toLocaleDateString("en-US", {
    month: "short",
  });
  return `${member.batch.name} (${month})`;
}

export default function MyTeamPage() {
  const [search, setSearch] = useState("");
  const [batchId, setBatchId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detailQuery = useTeamMember(selectedId ?? undefined);

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
            label="Planning meetings done"
            value={stats?.planningMeetingsCompleted ?? 0}
            highlight
          />
          <KpiCard
            label="Active PDPs"
            value={stats?.activePdps ?? 0}
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
                    <th className="px-4 py-3">Current stage</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.employees.map((member) => (
                    <tr
                      key={member.id}
                      className="cursor-pointer border-b border-stone-100 hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-950"
                      onClick={() => setSelectedId(member.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-900 dark:bg-stone-800 dark:text-amber-200">
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
                        </div>
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
                      <td className="px-4 py-3 text-stone-700 dark:text-stone-300">
                        {member.currentStageLabel ?? member.status.replaceAll("_", " ")}
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

      <OverlayModal
        open={Boolean(selectedId)}
        title={detailQuery.data?.employee.name ?? "Employee details"}
        subtitle="Full appraisal details for the selected team member."
        onClose={() => setSelectedId(null)}
        wide
      >
        {detailQuery.isLoading ? (
          <p className="text-sm text-stone-500">Loading employee details…</p>
        ) : detailQuery.data ? (
          <div className="space-y-5">
            <section className="rounded-2xl border border-stone-200 p-4 dark:border-stone-800">
              <h3 className="text-sm font-semibold">Personal / employee information</h3>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
                <Info label="Employee" value={detailQuery.data.employee.name} />
                <Info label="Employee ID" value={detailQuery.data.employee.employeeId} />
                <Info
                  label="Email"
                  value={detailQuery.data.employee.companyEmail}
                />
                <Info
                  label="Department"
                  value={detailQuery.data.employee.department?.name ?? "—"}
                />
                <Info
                  label="Role"
                  value={
                    detailQuery.data.employee.jobTitle ??
                    formatRoleLabel(detailQuery.data.employee.role as UserRole)
                  }
                />
                <Info
                  label="Current cycle"
                  value={detailQuery.data.progress.cycle?.name ?? "—"}
                />
                <Info
                  label="Assigned batch"
                  value={
                    detailQuery.data.progress.batch
                      ? `${detailQuery.data.progress.batch.name} (Batch ${detailQuery.data.progress.batch.batchNumber})`
                      : "—"
                  }
                />
                <Info
                  label="Assigned supervisor"
                  value={
                    detailQuery.data.progress.supervisor
                      ? `${detailQuery.data.progress.supervisor.name} (${detailQuery.data.progress.supervisor.employeeId})`
                      : "—"
                  }
                />
                <Info
                  label="Planning meeting"
                  value={
                    detailQuery.data.progress.planningMeetingCompleted
                      ? "Completed"
                      : "Not completed"
                  }
                />
              </dl>
            </section>
            <AppraisalTimelineCard
              currentStageLabel={detailQuery.data.progress.currentStageLabel}
              stages={detailQuery.data.progress.stages}
              compact
            />
            <AppraisalProgressDetails progress={detailQuery.data.progress} />
            <AppraisalHistoryPanel employeeId={detailQuery.data.employee.id} />
          </div>
        ) : (
          <p className="text-sm text-red-600">Unable to load this employee.</p>
        )}
      </OverlayModal>
    </DashboardLayout>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-stone-400">{label}</dt>
      <dd className="mt-1 font-medium text-stone-900 dark:text-stone-100">{value}</dd>
    </div>
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
