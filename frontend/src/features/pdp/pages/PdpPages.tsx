import { useEffect, useMemo, useState } from "react";
import { Eye, Search } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import DashboardLayout from "@/app/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  FilterTabs,
  MetricCard,
  PageHeader,
  ProgressBar,
  surfaceClass,
} from "@/components/corporate/CorporateUi";
import { fieldClass } from "@/features/hr/components/ActionMenu";
import { Pagination } from "@/features/hr/components/Pagination";
import { StatusBadge } from "@/features/hr/components/StatusBadge";
import { formatDate } from "@/features/hr/utils/dates";
import { API_BASE_URL } from "@/services/api/client";
import { useAuthStore } from "@/store/authStore";
import { MIN_PDP_GOALS, emptyGoal, type GoalDraft, type PdpRecord } from "../types";
import { EmployeePdpDashboard } from "./EmployeePdpDashboard";
import {
  useAssignPdp,
  useCreatePdp,
  useEmployeeReviewPdp,
  useHrReviewPdp,
  useMyPdp,
  usePdp,
  usePdpList,
  useRedirectPdp,
  useReviewPdpEvidence,
  useSavePdpDraft,
  useSubmitPdp,
} from "../hooks/usePdp";

function pdpPath(role: string, pdpId?: string) {
  const base =
    role === "HR" ? "/hr/pdp" : role === "SUPERVISOR" ? "/supervisor/pdp" : "/employee/pdp";
  return pdpId ? `${base}/${pdpId}` : base;
}

type ManagementRole = "HR" | "SUPERVISOR";

function reviewTone(value?: string) {
  if (value === "Approved") return "text-emerald-700";
  if (value === "Changes Requested" || value === "Pending") return "text-amber-800";
  return "text-stone-400";
}

function PdpManagementPage({ role }: { role: ManagementRole }) {
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const create = useCreatePdp();
  const navigate = useNavigate();
  const list = usePdpList({ status: tab === "all" ? undefined : tab, page, search: search || undefined });
  const stats = list.data?.stats;
  const pdps = list.data?.pdps ?? [];
  const team = list.data?.team ?? [];
  const isSupervisor = role === "SUPERVISOR";
  const basePath = isSupervisor ? "/supervisor/pdp" : "/hr/pdp";

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  const rows = useMemo(() => {
    if (!isSupervisor) return pdps.map((pdp) => ({ key: pdp.id, pdp, memberId: null as string | null }));
    const fromPdps = pdps.map((pdp) => ({ key: pdp.id, pdp, memberId: pdp.employee.id as string | null }));
    if (tab !== "all" && tab !== "draft") return fromPdps;
    const missing = team
      .filter((member) => !member.pdp)
      .filter((member) => {
        const haystack = `${member.name} ${member.employeeId}`.toLowerCase();
        return !search || haystack.includes(search.toLowerCase());
      })
      .map((member) => ({ key: member.id, pdp: null as PdpRecord | null, memberId: member.id }));
    return [...fromPdps, ...missing];
  }, [isSupervisor, pdps, team, tab, search]);

  const setFilter = (value: string) => {
    setTab(value);
    setPage(1);
  };

  return (
    <DashboardLayout>
      <PageHeader
        crumbs={isSupervisor ? "Supervisor / PDP Creation and Management" : "HR Dashboard / PDP Management"}
        title={isSupervisor ? "PDP Creation and Management" : "PDP Management"}
        description={
          isSupervisor
            ? "Manage Personal Development Plans for employees in your team. Create drafts, submit for approval, and respond to change requests. Only supervisors edit goals."
            : "Review submitted Personal Development Plans. HR approves the plan or suggests changes; supervisors remain the only people who edit goals."
        }
      />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <button type="button" onClick={() => setFilter("all")} className="text-left">
          <MetricCard label="All PDPs" value={stats?.all ?? pdps.length} highlight={tab === "all"} />
        </button>
        <button type="button" onClick={() => setFilter("waiting_hr")} className="text-left">
          <MetricCard label="Waiting HR Approval" value={stats?.waitingHr ?? 0} accent="orange" highlight={tab === "waiting_hr"} />
        </button>
        <button type="button" onClick={() => setFilter("waiting_employee")} className="text-left">
          <MetricCard label="Waiting Employee Approval" value={stats?.waitingEmployee ?? 0} highlight={tab === "waiting_employee"} />
        </button>
        <button type="button" onClick={() => setFilter("approved")} className="text-left">
          <MetricCard label="Approved" value={stats?.approved ?? 0} accent="green" highlight={tab === "approved"} />
        </button>
        <button type="button" onClick={() => setFilter("completed")} className="text-left">
          <MetricCard label="Completed" value={stats?.completed ?? 0} highlight={tab === "completed"} />
        </button>
        <button type="button" onClick={() => setFilter("draft")} className="text-left">
          <MetricCard label="Draft" value={stats?.draft ?? 0} highlight={tab === "draft"} />
        </button>
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <FilterTabs
          value={tab}
          onChange={setFilter}
          items={[
            { id: "all", label: "All PDPs", count: stats?.all },
            { id: "waiting_hr", label: "Waiting HR Approval", count: stats?.waitingHr },
            { id: "waiting_employee", label: "Waiting Employee Approval", count: stats?.waitingEmployee },
            { id: "approved", label: "Approved", count: stats?.approved },
            { id: "completed", label: "Completed", count: stats?.completed },
            { id: "draft", label: "Draft", count: stats?.draft },
          ]}
        />
        <div className="relative ml-auto min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            className={`${fieldClass} pl-9`}
            placeholder="Search employee or ID"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
      </div>
      <div className={`${surfaceClass} mt-5 overflow-x-auto`}>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-stone-100 text-[11px] uppercase tracking-wide text-stone-400 dark:border-stone-800">
            <tr>
              <th className="px-5 py-3">Employee</th>
              <th className="px-5 py-3">Supervisor</th>
              <th className="px-5 py-3">Appraisal cycle</th>
              <th className="px-5 py-3">Goals</th>
              <th className="px-5 py-3">PDP progress</th>
              <th className="px-5 py-3">Status</th>
              {isSupervisor ? <th className="px-5 py-3">Employee review</th> : null}
              <th className="px-5 py-3">HR review</th>
              <th className="px-5 py-3">Last updated</th>
              <th className="px-5 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const pdp = row.pdp;
              const member = team.find((item) => item.id === row.memberId);
              const employee = pdp?.employee ?? member;
              if (!employee) return null;
              return (
                <tr key={row.key} className="border-b border-stone-50 dark:border-stone-800">
                  <td className="px-5 py-3">
                    <p className="font-medium">{employee.name}</p>
                    <p className="text-xs text-stone-500">
                      {employee.employeeId} · {employee.jobTitle ?? "—"}
                      {employee.department ? ` — ${employee.department.name}` : ""}
                    </p>
                  </td>
                  <td className="px-5 py-3">{pdp?.supervisor?.name ?? "—"}</td>
                  <td className="px-5 py-3">{pdp?.cycle.name ?? list.data?.cycle?.name ?? "—"}</td>
                  <td className="px-5 py-3">{pdp ? `${pdp.goalCount}/${pdp.minGoals}` : `0/${MIN_PDP_GOALS}`}</td>
                  <td className="px-5 py-3 w-40">
                    {pdp ? (
                      <>
                        <ProgressBar value={pdp.progressPercent ?? 0} />
                        <p className="mt-1 text-xs text-stone-500">{pdp.progressPercent ?? 0}%</p>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={pdp?.status ?? "NOT_STARTED"} />
                  </td>
                  {isSupervisor ? (
                    <td className="px-5 py-3">
                      <span className={reviewTone(pdp?.employeeApprovalStatus)}>
                        {pdp?.employeeApprovalStatus ?? "Not Submitted"}
                      </span>
                    </td>
                  ) : null}
                  <td className="px-5 py-3">
                    <span className={reviewTone(pdp?.hrReviewStatus)}>
                      {pdp?.hrReviewStatus ?? "Not Started"}
                    </span>
                  </td>
                  <td className="px-5 py-3">{pdp ? formatDate(pdp.updatedAt) : "—"}</td>
                  <td className="px-5 py-3">
                    {pdp ? (
                      <Link to={`${basePath}/${pdp.id}`}>
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" /> Open
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        size="sm"
                        disabled={create.isPending}
                        onClick={async () => {
                          if (!row.memberId) return;
                          const result = await create.mutateAsync(row.memberId);
                          navigate(`${basePath}/${result.pdp.id}`);
                        }}
                      >
                        Create PDP
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && !list.isLoading ? (
          <p className="px-5 py-8 text-sm text-stone-500">No PDPs in this view.</p>
        ) : null}
      </div>
      {list.data ? (
        <Pagination
          page={list.data.page}
          totalPages={list.data.totalPages}
          total={list.data.total}
          pageSize={list.data.pageSize}
          itemLabel="PDPs"
          onPageChange={setPage}
        />
      ) : null}
    </DashboardLayout>
  );
}

export function SupervisorPdpPage() {
  return <PdpManagementPage role="SUPERVISOR" />;
}

export function HrPdpPage() {
  return <PdpManagementPage role="HR" />;
}

export function EmployeePdpPage() {
  const query = useMyPdp();
  const pdp = query.data?.pdp;
  const [showDashboard, setShowDashboard] = useState(false);
  const assigned = pdp?.status === "ASSIGNED" || pdp?.status === "COMPLETED";

  return (
    <DashboardLayout>
      {showDashboard && pdp && assigned ? (
        <EmployeePdpDashboard pdp={pdp} onBack={() => setShowDashboard(false)} />
      ) : (
        <>
          <PageHeader
            crumbs="Home / My PDP"
            title="My PDP"
            description="Review your Personal Development Plan. You can agree or request changes with a clear reason."
          />
          {query.isLoading ? <p className="mt-4 text-sm text-stone-500">Loading your PDP…</p> : null}
          {pdp ? (
            <div className="mt-5 space-y-4">
              <PdpTimeline pdp={pdp} />
              {(pdp.notifications ?? []).length > 0 ? (
                <section className={`${surfaceClass} p-5`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">PDP notifications</h3>
                    <Link to="/notifications" className="text-xs text-stone-500 hover:underline">View All</Link>
                  </div>
                  <div className="mt-3 space-y-2">
                    {(pdp.notifications ?? []).slice(0, 3).map((item) => (
                      <p key={item.id} className="text-sm text-stone-600">{item.title}</p>
                    ))}
                  </div>
                </section>
              ) : null}
              <PdpBody pdp={pdp} />
              {assigned ? (
                <button
                  type="button"
                  className="flex w-full items-center justify-center rounded-2xl bg-amber-400 px-6 py-4 text-base font-semibold text-stone-950 shadow-sm hover:bg-amber-300"
                  onClick={() => setShowDashboard(true)}
                >
                  View My PDP Dashboard
                </button>
              ) : null}
            </div>
          ) : !query.isLoading ? (
            <p className="mt-4 text-sm text-stone-500">Your supervisor has not created a PDP for the current cycle yet.</p>
          ) : null}
        </>
      )}
    </DashboardLayout>
  );
}

export function PdpDetailPage() {
  const { pdpId } = useParams<{ pdpId: string }>();
  const role = useAuthStore((s) => s.user?.role) ?? "EMPLOYEE";
  const query = usePdp(pdpId);
  const pdp = query.data?.pdp;
  return (
    <DashboardLayout>
      <PageHeader
        crumbs={role === "HR" ? "HR Dashboard / PDP Management" : "Supervisor / PDP Creation and Management"}
        title={pdp ? pdp.employee.name : "PDP details"}
        description={pdp ? `${pdp.employee.employeeId} · ${pdp.cycle.name}` : "Review this Personal Development Plan."}
        action={
          <Link to={pdpPath(role)} className="text-sm text-stone-500 hover:underline">
            ← Back to PDPs
          </Link>
        }
      />
      {query.isLoading ? <p className="mt-4 text-sm text-stone-500">Loading PDP…</p> : null}
      {pdp ? <div className="mt-4"><PdpBody pdp={pdp} /></div> : null}
    </DashboardLayout>
  );
}

function PdpBody({ pdp }: { pdp: PdpRecord }) {
  const role = useAuthStore((s) => s.user?.role);
  const save = useSavePdpDraft();
  const submit = useSubmitPdp();
  const employeeReview = useEmployeeReviewPdp();
  const hrReview = useHrReviewPdp();
  const redirect = useRedirectPdp();
  const assign = useAssignPdp();
  const [summary, setSummary] = useState(pdp.summary ?? "");
  const [goals, setGoals] = useState<GoalDraft[]>(pdp.goals.map(toDraft));
  const [message, setMessage] = useState("");
  const [reason, setReason] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    setSummary(pdp.summary ?? "");
    setGoals(pdp.goals.length ? pdp.goals.map(toDraft) : []);
  }, [pdp]);

  return (
    <div className="space-y-6">
      <section className={`${surfaceClass} p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{role === "EMPLOYEE" ? pdp.cycle.name : pdp.employee.name}</h2>
            <p className="mt-1 text-sm text-stone-500">
              {pdp.goalCount} / {pdp.minGoals} · {Math.round(pdp.goals.reduce((sum, goal) => sum + (goal.weightage || 0), 0))}% total weightage
              {pdp.cycle.startDate && pdp.cycle.endDate
                ? ` · ${formatDate(pdp.cycle.startDate)} – ${formatDate(pdp.cycle.endDate)}`
                : ""}
            </p>
          </div>
          <StatusBadge status={pdp.status} />
        </div>
        {pdp.summary ? (
          <div className="mt-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">Supervisor notes</p>
            <p className="mt-2 text-sm text-stone-600">{pdp.summary}</p>
          </div>
        ) : null}
        {role !== "EMPLOYEE" ? (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            <Info label="Employee ID" value={pdp.employee.employeeId} />
            <Info label="Position" value={pdp.employee.jobTitle ?? "—"} />
            <Info label="Department" value={pdp.employee.department?.name ?? "—"} />
            <Info label="Supervisor" value={pdp.supervisor?.name ?? "—"} />
            <Info label="Appraisal Cycle" value={pdp.cycle.name} />
            <Info label="Employee approval" value={pdp.employeeApprovalStatus ?? "—"} />
            <Info label="HR review" value={pdp.hrReviewStatus ?? "—"} />
            <Info label="Goals" value={`${pdp.goalCount} / ${pdp.minGoals}`} />
          </div>
        ) : null}
      </section>

      {pdp.employeeChangeRequest ? <Callout title="Employee change request">{pdp.employeeChangeRequest}</Callout> : null}
      {pdp.hrChangeRequest ? <Callout title="HR change request">{pdp.hrChangeRequest}</Callout> : null}
      {pdp.redirectedReason ? <Callout title="Redirected to HR">{pdp.redirectedReason}</Callout> : null}

      {(pdp.notifications ?? []).length > 0 && role !== "EMPLOYEE" ? (
        <section className={`${surfaceClass} p-5`}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">PDP notifications</h3>
            <Link to="/notifications" className="text-xs text-stone-500 hover:underline">View All</Link>
          </div>
          <div className="mt-3 space-y-2">
            {(pdp.notifications ?? []).slice(0, 4).map((item) => (
              <p key={item.id} className="text-sm text-stone-600">{item.title}: {item.message}</p>
            ))}
          </div>
        </section>
      ) : null}

      {pdp.actions.canEdit ? (
        <section className={`${surfaceClass} space-y-4 p-6`}>
          <label className="block text-sm">
            <span className="text-xs text-stone-500">Summary</span>
            <textarea className={`${fieldClass} mt-1 h-24 py-2`} value={summary} onChange={(e) => setSummary(e.target.value)} />
          </label>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">PDP Goals ({goals.length} / {MIN_PDP_GOALS} required to submit)</h3>
            <Button type="button" size="sm" variant="outline" onClick={() => { setGoals((current) => [...current, emptyGoal()]); setEditingIndex(goals.length); }}>
              Add Goal
            </Button>
          </div>
          <div className="space-y-3">
            {goals.map((goal, index) => (
              <article key={index} className="rounded-2xl border border-stone-200 p-4 dark:border-stone-800">
                {editingIndex === index ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Goal Title" value={goal.title} onChange={(value) => setGoals((c) => c.map((item, i) => i === index ? { ...item, title: value } : item))} />
                    <label className="block text-sm">
                      <span className="text-xs text-stone-500">Category</span>
                      <select className={`${fieldClass} mt-1`} value={goal.category} onChange={(e) => setGoals((c) => c.map((item, i) => i === index ? { ...item, category: e.target.value } : item))}>
                        <option>Technical</option>
                        <option>Behavioural</option>
                      </select>
                    </label>
                    <Field label="Development Area" value={goal.developmentArea} onChange={(value) => setGoals((c) => c.map((item, i) => i === index ? { ...item, developmentArea: value } : item))} />
                    <label className="block text-sm">
                      <span className="text-xs text-stone-500">Priority</span>
                      <select className={`${fieldClass} mt-1`} value={goal.priority} onChange={(e) => setGoals((c) => c.map((item, i) => i === index ? { ...item, priority: e.target.value as GoalDraft["priority"] } : item))}>
                        <option value="HIGH">High</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="LOW">Low</option>
                      </select>
                    </label>
                    <Field label="Weightage %" value={goal.weightage} onChange={(value) => setGoals((c) => c.map((item, i) => i === index ? { ...item, weightage: value } : item))} />
                    <Field label="Notes" value={goal.notes} onChange={(value) => setGoals((c) => c.map((item, i) => i === index ? { ...item, notes: value } : item))} />
                    <label className="block text-sm sm:col-span-2">
                      <span className="text-xs text-stone-500">Description</span>
                      <textarea className={`${fieldClass} mt-1 h-24 py-2`} value={goal.objective} onChange={(e) => setGoals((c) => c.map((item, i) => i === index ? { ...item, objective: e.target.value } : item))} />
                    </label>
                    <label className="block text-sm sm:col-span-2">
                      <span className="text-xs text-stone-500">Target Outcome</span>
                      <textarea className={`${fieldClass} mt-1 h-20 py-2`} value={goal.expectedOutcome} onChange={(e) => setGoals((c) => c.map((item, i) => i === index ? { ...item, expectedOutcome: e.target.value } : item))} />
                    </label>
                    <label className="block text-sm">
                      <span className="text-xs text-stone-500">Start Date</span>
                      <input type="date" className={`${fieldClass} mt-1`} value={goal.startDate} onChange={(e) => setGoals((c) => c.map((item, i) => i === index ? { ...item, startDate: e.target.value } : item))} />
                    </label>
                    <label className="block text-sm">
                      <span className="text-xs text-stone-500">Target Date</span>
                      <input type="date" className={`${fieldClass} mt-1`} value={goal.dueDate} onChange={(e) => setGoals((c) => c.map((item, i) => i === index ? { ...item, dueDate: e.target.value } : item))} />
                    </label>
                    <div className="flex gap-2 sm:col-span-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => setEditingIndex(null)}>Done</Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => { setGoals((c) => c.filter((_, i) => i !== index)); setEditingIndex(null); }}>Remove Goal</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{goal.title || `Goal ${index + 1}`}</p>
                      <p className="mt-1 text-sm text-stone-500">{goal.objective || "No description yet"}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => setEditingIndex(index)}>Edit Goal</Button>
                      <Button type="button" size="sm" variant="ghost" onClick={() => setGoals((c) => c.filter((_, i) => i !== index))}>Remove</Button>
                    </div>
                  </div>
                )}
              </article>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" disabled={save.isPending} onClick={() => save.mutate({ pdpId: pdp.id, summary, goals })}>
              Save draft
            </Button>
            <Button type="button" disabled={!pdp.actions.canSubmit || submit.isPending} onClick={() => submit.mutate(pdp.id)}>
              Submit for review
            </Button>
            {goals.length < MIN_PDP_GOALS ? (
              <p className="text-sm text-stone-500">Add {MIN_PDP_GOALS - goals.length} more goals before submitting.</p>
            ) : null}
          </div>
        </section>
      ) : (
        <section className={`${surfaceClass} space-y-3 p-6`}>
          <h3 className="text-base font-semibold">Goals ({pdp.goals.length})</h3>
          {pdp.summary ? <p className="text-sm">{pdp.summary}</p> : null}
          {pdp.goals.map((goal, index) => (
            <div key={goal.id} className="rounded-xl border border-stone-200 px-4 py-3 dark:border-stone-800">
              <p className="text-xs text-stone-400">Goal {index + 1}</p>
              <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{goal.title}</p>
                  <p className="mt-1 text-sm text-stone-500">{goal.objective}</p>
                  <p className="mt-2 text-xs uppercase tracking-wide text-stone-400">
                    {goal.weightage}% · {(goal.priority || "MEDIUM").toLowerCase()} · {goal.category ?? goal.developmentArea ?? "Technical"}
                  </p>
                </div>
                <StatusBadge status={goal.status} />
              </div>
            </div>
          ))}
        </section>
      )}

      {(pdp.actions.canEmployeeReview || pdp.actions.canHrReview) ? (
        <section className={`${surfaceClass} space-y-3 p-6`}>
          <h3 className="text-base font-semibold">{role === "HR" ? "HR review" : "Employee review"}</h3>
          <p className="text-sm text-stone-500">
            {role === "HR"
              ? "This PDP is waiting for HR approval. Approve it to assign the plan, or request changes with a reason for the supervisor."
              : "Review the full PDP first. Approve it, or request changes with a clear reason."}
          </p>
          <textarea
            className={`${fieldClass} h-28 py-2`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              role === "HR"
                ? "Required if you request changes — describe what the supervisor should update"
                : "Required if you request changes — describe what should be updated"
            }
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={(role === "HR" ? hrReview : employeeReview).isPending}
              onClick={() => (role === "HR" ? hrReview : employeeReview).mutate({ pdpId: pdp.id, decision: "APPROVE", message })}
            >
              Approve PDP
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={(role === "HR" ? hrReview : employeeReview).isPending}
              onClick={() => {
                if (message.trim().length < 8) {
                  toast.error("Enter a reason before requesting changes.");
                  return;
                }
                (role === "HR" ? hrReview : employeeReview).mutate({ pdpId: pdp.id, decision: "REQUEST_CHANGES", message });
              }}
            >
              Request Changes
            </Button>
          </div>
        </section>
      ) : null}

      {pdp.actions.canRedirect ? (
        <section className={`${surfaceClass} space-y-3 p-6`}>
          <textarea className={`${fieldClass} h-24 py-2`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why should HR handle this employee request?" />
          <Button type="button" variant="outline" disabled={redirect.isPending} onClick={() => redirect.mutate({ pdpId: pdp.id, reason })}>
            Redirect issue to HR
          </Button>
        </section>
      ) : null}

      {pdp.actions.canAssign ? (
        <Button type="button" disabled={assign.isPending} onClick={() => assign.mutate(pdp.id)}>
          Assign PDP to employee
        </Button>
      ) : null}

      {(pdp.evidence?.length ?? 0) > 0 && role !== "EMPLOYEE" ? (
        <EvidenceTable pdp={pdp} canReview={role === "SUPERVISOR" || role === "HR"} />
      ) : null}

      {pdp.comments.length > 0 ? (
        <section className={`${surfaceClass} p-6`}>
          <p className="text-sm font-medium">Review history</p>
          <div className="mt-3 space-y-2">
            {pdp.comments.map((item) => (
              <p key={item.id} className="text-sm text-stone-600 dark:text-stone-300">
                <span className="font-medium">{item.author.name}</span>: {item.message}
              </p>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function PdpTimeline({ pdp }: { pdp: PdpRecord }) {
  return (
    <section className={`${surfaceClass} p-6`}>
      <h3 className="text-sm font-semibold">PDP timeline</h3>
      <p className="mt-1 text-sm text-stone-500">This shows where you currently are in the PDP workflow.</p>
      <ol className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {(pdp.timeline ?? []).map((stage) => (
          <li key={stage.id} className="rounded-xl border border-stone-100 px-3 py-3">
            <span
              className={
                stage.state === "current"
                  ? "text-[11px] font-semibold uppercase tracking-wide text-amber-700"
                  : stage.state === "done"
                    ? "text-[11px] font-semibold uppercase tracking-wide text-emerald-700"
                    : "text-[11px] uppercase tracking-wide text-stone-400"
              }
            >
              {stage.state}
            </span>
            <p className="mt-1 text-sm font-medium">{stage.label}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

function EvidenceTable({ pdp, canReview = false }: { pdp: PdpRecord; canReview?: boolean }) {
  const review = useReviewPdpEvidence();
  const evidence = pdp.evidence ?? [];
  return (
    <section className={surfaceClass}>
      <div className="px-5 py-4">
        <h3 className="text-base font-semibold">Uploaded evidence</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-y border-stone-100 text-[11px] uppercase tracking-wide text-stone-400 dark:border-stone-800">
            <tr>
              <th className="px-5 py-3">File Name</th>
              <th className="px-5 py-3">Uploaded Date</th>
              <th className="px-5 py-3">Related Goal</th>
              <th className="px-5 py-3">Evidence Status</th>
              <th className="px-5 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {evidence.map((item) => (
              <tr key={item.id} className="border-b border-stone-50 dark:border-stone-800">
                <td className="px-5 py-3">{item.fileName}</td>
                <td className="px-5 py-3">{formatDate(item.createdAt)}</td>
                <td className="px-5 py-3">{item.relatedGoal}</td>
                <td className="px-5 py-3"><StatusBadge status={item.status} /></td>
                <td className="px-5 py-3">
                  <a className="text-sm text-stone-600 hover:underline" href={`${API_BASE_URL}/pdp/evidence/${item.id}`} target="_blank" rel="noreferrer">
                    View
                  </a>
                  {canReview && item.status !== "REVIEWED" ? (
                    <Button type="button" size="sm" variant="outline" className="ml-2" onClick={() => review.mutate(item.id)}>
                      Mark reviewed
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {evidence.length === 0 ? <p className="px-5 py-6 text-sm text-stone-500">No evidence uploaded yet.</p> : null}
      </div>
    </section>
  );
}

function toDraft(goal: PdpRecord["goals"][number]): GoalDraft {
  return {
    title: goal.title,
    objective: goal.objective,
    developmentArea: goal.developmentArea ?? "",
    expectedOutcome: goal.expectedOutcome ?? "",
    startDate: goal.startDate ? String(goal.startDate).slice(0, 10) : "",
    dueDate: goal.dueDate ? String(goal.dueDate).slice(0, 10) : "",
    measurementKpi: goal.measurementKpi ?? "",
    notes: goal.notes ?? "",
    category: goal.category ?? "Technical",
    priority: (goal.priority as GoalDraft["priority"]) || "MEDIUM",
    weightage: String(goal.weightage ?? ""),
  };
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-stone-400">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="text-xs text-stone-500">{label}</span>
      <input className={`${fieldClass} mt-1`} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Callout({ title, children }: { title: string; children: string }) {
  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm dark:border-orange-900/40 dark:bg-orange-950/20">
      <p className="font-medium">{title}</p>
      <p className="mt-1">{children}</p>
    </div>
  );
}
