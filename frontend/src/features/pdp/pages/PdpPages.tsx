import { useEffect, useState } from "react";
import { Eye, Search } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
  useUpdateGoalProgress,
  useUploadPdpEvidence,
} from "../hooks/usePdp";

function pdpPath(role: string, pdpId?: string) {
  const base =
    role === "HR" ? "/hr/pdp" : role === "SUPERVISOR" ? "/supervisor/pdp" : "/employee/pdp";
  return pdpId ? `${base}/${pdpId}` : base;
}

export function SupervisorPdpPage() {
  const list = usePdpList();
  const create = useCreatePdp();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const team = list.data?.team ?? [];
  const filtered = team.filter((member) => {
    const haystack = `${member.name} ${member.employeeId} ${member.jobTitle ?? ""}`.toLowerCase();
    if (search && !haystack.includes(search.toLowerCase())) return false;
    if (status === "all") return true;
    if (status === "none") return !member.pdp;
    return member.pdp?.bucket === status || member.pdp?.status === status;
  });

  return (
    <DashboardLayout>
      <PageHeader
        crumbs="Supervisor / PDP Creation and Management"
        title="PDP Creation and Management"
        description={`Create a PDP only for employees who do not already have one. Drafts can be built gradually; submission requires at least ${MIN_PDP_GOALS} goals.`}
      />
      <div className="mt-5 flex flex-wrap gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            className={`${fieldClass} pl-9`}
            placeholder="Search employee"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select className={`${fieldClass} max-w-xs`} value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="all">All PDP statuses</option>
          <option value="none">Without PDP</option>
          <option value="draft">Draft</option>
          <option value="waiting_employee">Waiting Employee Approval</option>
          <option value="waiting_hr">Waiting HR Approval</option>
          <option value="approved">Approved</option>
          <option value="completed">Completed</option>
        </select>
        <select className={`${fieldClass} max-w-xs`} defaultValue={list.data?.cycle?.id ?? ""}>
          <option value={list.data?.cycle?.id ?? ""}>{list.data?.cycle?.name ?? "Current appraisal cycle"}</option>
        </select>
      </div>
      <div className={`${surfaceClass} mt-5 overflow-x-auto`}>
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-stone-100 text-[11px] uppercase tracking-wide text-stone-400 dark:border-stone-800">
            <tr>
              <th className="px-5 py-3">Employee</th>
              <th className="px-5 py-3">Employee ID</th>
              <th className="px-5 py-3">Department</th>
              <th className="px-5 py-3">PDP Status</th>
              <th className="px-5 py-3">Goals</th>
              <th className="px-5 py-3">Progress</th>
              <th className="px-5 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((member) => (
              <tr key={member.id} className="border-b border-stone-50 dark:border-stone-800">
                <td className="px-5 py-3">
                  <p className="font-medium">{member.name}</p>
                  <p className="text-xs text-stone-500">{member.jobTitle ?? "—"}</p>
                </td>
                <td className="px-5 py-3">{member.employeeId}</td>
                <td className="px-5 py-3">{member.department?.name ?? "—"}</td>
                <td className="px-5 py-3">
                  <StatusBadge status={member.pdp?.status ?? "NOT_STARTED"} />
                </td>
                <td className="px-5 py-3">{member.pdp ? `${member.pdp.goalCount}/${MIN_PDP_GOALS}` : "—"}</td>
                <td className="px-5 py-3 w-40">
                  {member.pdp ? (
                    <div>
                      <ProgressBar value={member.pdp.progressPercent ?? 0} />
                      <p className="mt-1 text-xs text-stone-500">{member.pdp.progressPercent ?? 0}%</p>
                    </div>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-5 py-3">
                  {member.pdp ? (
                    <Link to={`/supervisor/pdp/${member.pdp.id}`}>
                      <Button size="sm" variant="outline">
                        <Eye className="h-4 w-4" /> Open PDP
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      size="sm"
                      disabled={create.isPending}
                      onClick={async () => {
                        const result = await create.mutateAsync(member.id);
                        navigate(`/supervisor/pdp/${result.pdp.id}`);
                      }}
                    >
                      Create PDP
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? <p className="px-5 py-8 text-sm text-stone-500">No employees match these filters.</p> : null}
      </div>
    </DashboardLayout>
  );
}

export function HrPdpPage() {
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const list = usePdpList({ status: tab === "all" ? undefined : tab, page, search: search || undefined });
  const stats = list.data?.stats;
  const pdps = list.data?.pdps ?? [];

  return (
    <DashboardLayout>
      <PageHeader
        crumbs="Home / Performance Management / PDP Management"
        title="PDP Management"
        description="Review submitted Personal Development Plans. HR approves the plan or suggests changes; supervisors remain the only people who edit goals."
      />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="All PDPs" value={stats?.all ?? pdps.length} />
        <MetricCard label="Waiting HR Approval" value={stats?.waitingHr ?? 0} accent="orange" highlight />
        <MetricCard label="Waiting Employee Approval" value={stats?.waitingEmployee ?? 0} />
        <MetricCard label="Approved" value={stats?.approved ?? 0} accent="green" />
        <MetricCard label="Completed" value={stats?.completed ?? 0} />
        <MetricCard label="Draft" value={stats?.draft ?? 0} />
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <FilterTabs
          value={tab}
          onChange={(value) => {
            setTab(value);
            setPage(1);
          }}
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
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                setSearch(searchInput);
                setPage(1);
              }
            }}
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
              <th className="px-5 py-3">HR review</th>
              <th className="px-5 py-3">Last updated</th>
              <th className="px-5 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {pdps.map((pdp) => (
              <tr key={pdp.id} className="border-b border-stone-50 dark:border-stone-800">
                <td className="px-5 py-3">
                  <p className="font-medium">{pdp.employee.name}</p>
                  <p className="text-xs text-stone-500">
                    {pdp.employee.employeeId} · {pdp.employee.jobTitle ?? "—"}
                    {pdp.employee.department ? ` — ${pdp.employee.department.name}` : ""}
                  </p>
                </td>
                <td className="px-5 py-3">{pdp.supervisor?.name ?? "—"}</td>
                <td className="px-5 py-3">{pdp.cycle.name}</td>
                <td className="px-5 py-3">{pdp.goalCount}/{pdp.minGoals}</td>
                <td className="px-5 py-3 w-40">
                  <ProgressBar value={pdp.progressPercent ?? 0} />
                  <p className="mt-1 text-xs text-stone-500">{pdp.progressPercent ?? 0}%</p>
                </td>
                <td className="px-5 py-3"><StatusBadge status={pdp.status} /></td>
                <td className="px-5 py-3"><StatusBadge status={pdp.hrReviewStatus === "Approved" ? "APPROVED" : pdp.hrReviewStatus === "Waiting" ? "PENDING" : "NOT_STARTED"} /></td>
                <td className="px-5 py-3">{formatDate(pdp.updatedAt)}</td>
                <td className="px-5 py-3">
                  <Link to={`/hr/pdp/${pdp.id}`}>
                    <Button size="sm" variant="outline"><Eye className="h-4 w-4" /> Open</Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pdps.length === 0 && !list.isLoading ? (
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

export function EmployeePdpPage() {
  const query = useMyPdp();
  const pdp = query.data?.pdp;
  const [showDashboard, setShowDashboard] = useState(false);

  useEffect(() => {
    if (!pdp?.id) return;
    setShowDashboard(localStorage.getItem(`performx:pdp-dashboard:${pdp.id}`) === "1");
  }, [pdp?.id]);

  const canOpenDashboard =
    Boolean(pdp) &&
    !pdp?.actions.canEmployeeReview &&
    ["ASSIGNED", "COMPLETED"].includes(pdp?.status ?? "");

  return (
    <DashboardLayout>
      <PageHeader crumbs="Employee / My PDP" title="My PDP" description="Review, approve, and then work from your PDP dashboard." />
      {query.isLoading ? <p className="mt-4 text-sm text-stone-500">Loading your PDP…</p> : null}
      {pdp ? (
        showDashboard && canOpenDashboard ? (
          <EmployeePdpDashboard pdp={pdp} onBack={() => setShowDashboard(false)} />
        ) : (
          <div className="mt-5 space-y-4">
            {pdp.actions.canEmployeeReview ? (
              <div className="rounded-xl border border-stone-200 bg-stone-50/80 px-4 py-3 text-sm text-stone-600 dark:border-stone-800 dark:bg-stone-950/40 dark:text-stone-300">
                Your supervisor has submitted a PDP for your review. Please review the full plan below and choose Approve PDP or Request Changes. The interactive PDP dashboard becomes available after approval and assignment.
              </div>
            ) : null}
            <PdpBody pdp={pdp} />
            {canOpenDashboard ? (
              <Button
                type="button"
                onClick={() => {
                  localStorage.setItem(`performx:pdp-dashboard:${pdp.id}`, "1");
                  setShowDashboard(true);
                }}
              >
                Show My PDP Dashboard
              </Button>
            ) : null}
          </div>
        )
      ) : !query.isLoading ? (
        <p className="mt-4 text-sm text-stone-500">Your supervisor has not submitted a PDP for the current cycle yet.</p>
      ) : null}
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
      <Link to={pdpPath(role)} className="text-sm text-stone-500 hover:underline">← Back to PDPs</Link>
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
            <h2 className="text-xl font-semibold">{pdp.employee.name}</h2>
            <p className="text-sm text-stone-500">{pdp.cycle.name} · {pdp.displayStatus}</p>
          </div>
          <StatusBadge status={pdp.status} />
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
          <Info label="Employee ID" value={pdp.employee.employeeId} />
          <Info label="Position" value={pdp.employee.jobTitle ?? "—"} />
          <Info label="Department" value={pdp.employee.department?.name ?? "—"} />
          <Info label="Supervisor" value={pdp.supervisor?.name ?? "—"} />
          <Info label="Appraisal Cycle" value={pdp.cycle.name} />
          <Info label="Goals" value={`${pdp.goalCount} / ${pdp.minGoals}`} />
        </div>
      </section>

      {pdp.employeeChangeRequest ? <Callout title="Employee change request">{pdp.employeeChangeRequest}</Callout> : null}
      {pdp.hrChangeRequest ? <Callout title="HR change request">{pdp.hrChangeRequest}</Callout> : null}
      {pdp.redirectedReason ? <Callout title="Redirected to HR">{pdp.redirectedReason}</Callout> : null}

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
                    <Field label="Development Area" value={goal.developmentArea} onChange={(value) => setGoals((c) => c.map((item, i) => i === index ? { ...item, developmentArea: value } : item))} />
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
          <h3 className="text-base font-semibold">PDP Goals</h3>
          {pdp.summary ? <p className="text-sm">{pdp.summary}</p> : null}
          {pdp.goals.map((goal) => (
            <div key={goal.id} className="rounded-xl border border-stone-200 px-4 py-3 dark:border-stone-800">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{goal.title}</p>
                  <p className="mt-1 text-sm text-stone-500">{goal.objective}</p>
                  {goal.developmentArea ? <p className="mt-1 text-xs text-stone-400">{goal.developmentArea}</p> : null}
                </div>
                <StatusBadge status={goal.status} />
              </div>
              <div className="mt-3">
                <ProgressBar value={goal.progress} />
                <p className="mt-1 text-xs text-stone-500">{goal.progress}% · Target {formatDate(goal.dueDate)}</p>
              </div>
            </div>
          ))}
        </section>
      )}

      {(pdp.actions.canEmployeeReview || pdp.actions.canHrReview) ? (
        <section className={`${surfaceClass} space-y-3 p-6`}>
          <h3 className="text-base font-semibold">{role === "HR" ? "HR review" : "Employee review"}</h3>
          <p className="text-sm text-stone-500">
            Review the full PDP first. Approve it, or request changes with comments. This is not the PDP dashboard.
          </p>
          <textarea className={`${fieldClass} h-28 py-2`} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Optional comment, or describe requested changes" />
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => (role === "HR" ? hrReview : employeeReview).mutate({ pdpId: pdp.id, decision: "APPROVE", message })}>
              Approve PDP
            </Button>
            <Button type="button" variant="outline" onClick={() => (role === "HR" ? hrReview : employeeReview).mutate({ pdpId: pdp.id, decision: "REQUEST_CHANGES", message })}>
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

function EmployeePdpDashboard({ pdp, onBack }: { pdp: PdpRecord; onBack: () => void }) {
  const update = useUpdateGoalProgress();
  const upload = useUploadPdpEvidence();
  const completed = pdp.goals.filter((goal) => goal.status === "COMPLETED").length;
  const inProgress = pdp.goals.filter((goal) => goal.status === "IN_PROGRESS" || goal.status === "UNDER_REVIEW").length;
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [progress, setProgress] = useState<Record<string, number>>(
    Object.fromEntries(pdp.goals.map((goal) => [goal.id, goal.progress]))
  );

  return (
    <div className="mt-5 space-y-6">
      <Button type="button" variant="outline" size="sm" onClick={onBack}>Back to PDP details</Button>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Overall PDP Progress" value={`${pdp.progressPercent ?? 0}%`} />
        <MetricCard label="Completed Goals" value={completed} accent="green" />
        <MetricCard label="Goals In Progress" value={inProgress} accent="orange" />
        <MetricCard label="Evidence Uploaded" value={pdp.evidence?.length ?? 0} />
        <MetricCard label="Days Remaining" value={pdp.daysRemaining ?? "—"} />
      </div>
      <section className={`${surfaceClass} p-6`}>
        <h2 className="text-base font-semibold">Overall PDP Progress</h2>
        <div className="mt-4">
          <ProgressBar value={pdp.progressPercent ?? 0} tone="green" />
          <p className="mt-2 text-sm text-stone-500">
            {completed} completed · {pdp.goals.length - completed} remaining
          </p>
        </div>
      </section>
      <section className="space-y-4">
        <h2 className="text-base font-semibold">Goal Progress</h2>
        {pdp.goals.map((goal) => (
          <article key={goal.id} className={`${surfaceClass} p-5`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{goal.title}</p>
                <p className="mt-1 text-sm text-stone-500">{goal.objective}</p>
                <p className="mt-1 text-xs text-stone-400">
                  {goal.developmentArea ?? "Development area"} · Target {formatDate(goal.dueDate)}
                </p>
              </div>
              <StatusBadge status={goal.status} />
            </div>
            <div className="mt-4">
              <ProgressBar value={progress[goal.id] ?? goal.progress} />
              <p className="mt-1 text-xs text-stone-500">{progress[goal.id] ?? goal.progress}%</p>
            </div>
            {pdp.actions.canUpdateProgress ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="text-xs text-stone-500">Update Progress Percentage</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className={`${fieldClass} mt-1`}
                    value={progress[goal.id] ?? goal.progress}
                    onChange={(event) => setProgress((current) => ({ ...current, [goal.id]: Number(event.target.value) }))}
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="text-xs text-stone-500">Progress notes / achievement details</span>
                  <textarea
                    className={`${fieldClass} mt-1 h-24 py-2`}
                    value={notes[goal.id] ?? goal.progressComments ?? ""}
                    onChange={(event) => setNotes((current) => ({ ...current, [goal.id]: event.target.value }))}
                  />
                </label>
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={update.isPending}
                    onClick={() =>
                      update.mutate({
                        pdpId: pdp.id,
                        goalId: goal.id,
                        progress: progress[goal.id] ?? goal.progress,
                        notes: notes[goal.id],
                      })
                    }
                  >
                    Save progress
                  </Button>
                  {([
                    ["DOCUMENT", "Upload Document"],
                    ["IMAGE", "Upload Image"],
                    ["CERTIFICATE", "Upload Certificate"],
                    ["SUPPORTING", "Upload Supporting Evidence"],
                  ] as const).map(([kind, label]) => (
                    <label key={kind} className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-stone-300 px-3 text-sm">
                      {label}
                      <input
                        type="file"
                        className="hidden"
                        accept={kind === "IMAGE" ? "image/*" : undefined}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          upload.mutate({ pdpId: pdp.id, goalId: goal.id, file, kind });
                          event.target.value = "";
                        }}
                      />
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </article>
        ))}
      </section>
      <EvidenceTable pdp={pdp} />
    </div>
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
