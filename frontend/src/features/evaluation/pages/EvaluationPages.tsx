import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Search } from "lucide-react";
import DashboardLayout from "@/app/layouts/DashboardLayout";
import { Button } from "@/components/ui/button";
import { FilterTabs, MetricCard, PageHeader, surfaceClass } from "@/components/corporate/CorporateUi";
import { fieldClass } from "@/features/hr/components/ActionMenu";
import { Pagination } from "@/features/hr/components/Pagination";
import { StatusBadge } from "@/features/hr/components/StatusBadge";
import { formatDate, formatDateTime } from "@/features/hr/utils/dates";
import { useAuthStore } from "@/store/authStore";
import type { EvaluationRecord, PdpSnapshot } from "../types";
import { downloadCsv, downloadPdf } from "../utils/exportFiles";
import {
  useAssignPeers,
  useAssignedPeerReviews,
  useCreateReviewRequest,
  useEligiblePeers,
  useEvaluation,
  useEvaluationList,
  useHrApprove,
  useLeadershipAnalytics,
  useMyEvaluation,
  useOpenSelfReview,
  usePipList,
  useReporting,
  useRespondReviewRequest,
  useReviewRequests,
  useSavePip,
  useSaveSelfReview,
  useSaveSupervisorEval,
  useSubmitPeerReview,
  useUpdateRecognition,
} from "../hooks/useEvaluation";

function evalPath(role: string, evaluationId?: string) {
  const base =
    role === "HR" ? "/hr/evaluations" : role === "SUPERVISOR" ? "/supervisor/evaluations" : "/employee/results";
  return evaluationId && role !== "EMPLOYEE" ? `${base}/${evaluationId}` : base;
}

function ScoreTable({ evaluation }: { evaluation: EvaluationRecord }) {
  const rows = [
    ["Self Review", evaluation.breakdown.self.score, "20%", evaluation.breakdown.self.contribution],
    ["Peer Review", evaluation.breakdown.peer.score, "20%", evaluation.breakdown.peer.contribution],
    ["Supervisor", evaluation.breakdown.supervisor.score, "60%", evaluation.breakdown.supervisor.contribution],
  ];
  return (
    <div className={`${surfaceClass} overflow-x-auto`}>
      <table className="min-w-full text-sm">
        <thead className="border-b border-stone-100 text-[11px] uppercase tracking-wide text-stone-400 dark:border-stone-800">
          <tr>
            <th className="px-5 py-3 text-left">Component</th>
            <th className="px-5 py-3 text-left">Score</th>
            <th className="px-5 py-3 text-left">Weight</th>
            <th className="px-5 py-3 text-left">Contribution</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[0]} className="border-b border-stone-50 dark:border-stone-800">
              <td className="px-5 py-3">{row[0]}</td>
              <td className="px-5 py-3">{row[1]}</td>
              <td className="px-5 py-3">{row[2]}</td>
              <td className="px-5 py-3">{row[3]}</td>
            </tr>
          ))}
          <tr>
            <td className="px-5 py-3 font-semibold">Final score</td>
            <td className="px-5 py-3 font-semibold" colSpan={3}>
              {evaluation.finalScore} · {evaluation.performanceBand}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function PdpGoals({ pdp }: { pdp: PdpSnapshot }) {
  if (!pdp) return <p className="text-sm text-stone-500">No assigned PDP is available for this cycle yet.</p>;
  return (
    <div className="space-y-3">
      {pdp.goals.map((goal) => (
        <div key={goal.id} className="rounded-2xl border border-stone-200 px-4 py-3 dark:border-stone-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-medium">{goal.title}</p>
            <StatusBadge status={goal.status} />
          </div>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{goal.objective}</p>
          <p className="mt-2 text-xs text-stone-500">
            Target {goal.dueDate ? formatDate(goal.dueDate) : "—"} · Progress {goal.progress}% · Evidence{" "}
            {goal.evidenceCount}
          </p>
          {goal.comments[0] ? <p className="mt-2 text-sm">{goal.comments[0]}</p> : null}
        </div>
      ))}
    </div>
  );
}

function EvaluationListPage({ role }: { role: "HR" | "SUPERVISOR" }) {
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const list = useEvaluationList({ status: tab === "all" ? undefined : tab, page, search: search || undefined });
  const stats = list.data?.stats;
  const openSelf = useOpenSelfReview();

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(handle);
  }, [searchInput]);

  return (
    <DashboardLayout>
      <PageHeader
        crumbs={role === "HR" ? "HR Dashboard / Performance Evaluation" : "Supervisor / Team Evaluation"}
        title={role === "HR" ? "Performance Evaluation" : "Team Evaluation"}
        description={
          role === "HR"
            ? "Track 360° evaluation status, open self-review, manage peer reviewers, and approve final appraisals."
            : "Evaluate only employees assigned to your team. Review PDP progress, self-review, and peer summaries before submitting."
        }
      />
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {[
          ["all", "All", stats?.all],
          ["NOT_STARTED", "Not Started", stats?.notStarted],
          ["SELF_REVIEW_PENDING", "Self Review Pending", stats?.selfPending],
          ["PEER_REVIEW_PENDING", "Peer Review Pending", stats?.peerPending],
          ["SUPERVISOR_REVIEW_PENDING", "Supervisor Review Pending", stats?.supervisorPending],
          ["WAITING_HR_REVIEW", "Waiting HR Review", stats?.waitingHr],
        ].map(([id, label, value]) => (
          <button
            key={id}
            type="button"
            className="text-left"
            onClick={() => {
              setTab(String(id));
              setPage(1);
            }}
          >
            <MetricCard label={String(label)} value={Number(value ?? 0)} highlight={tab === id} />
          </button>
        ))}
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <FilterTabs
          value={tab}
          onChange={(value) => {
            setTab(value);
            setPage(1);
          }}
          items={[
            { id: "all", label: "All" },
            { id: "NOT_STARTED", label: "Not Started" },
            { id: "SELF_REVIEW_PENDING", label: "Self Review Pending" },
            { id: "PEER_REVIEW_PENDING", label: "Peer Review Pending" },
            { id: "SUPERVISOR_REVIEW_PENDING", label: "Supervisor Review Pending" },
            { id: "WAITING_HR_REVIEW", label: "Waiting HR Review" },
            { id: "APPROVED", label: "Approved", count: stats?.approved },
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
              <th className="px-5 py-3">Department</th>
              <th className="px-5 py-3">Self</th>
              <th className="px-5 py-3">Peers</th>
              <th className="px-5 py-3">Supervisor</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Band</th>
              <th className="px-5 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {(list.data?.evaluations ?? []).map((item) => (
              <tr key={item.id} className="border-b border-stone-50 dark:border-stone-800">
                <td className="px-5 py-3">
                  <p className="font-medium">{item.employee.name}</p>
                  <p className="text-xs text-stone-500">{item.employee.employeeId}</p>
                </td>
                <td className="px-5 py-3">{item.employee.department?.name ?? "—"}</td>
                <td className="px-5 py-3">{item.selfSubmittedAt ? item.selfScore ?? "Submitted" : "Pending"}</td>
                <td className="px-5 py-3">
                  {item.peerCompletion.submitted}/{item.peerCompletion.total || 0}
                </td>
                <td className="px-5 py-3">{item.supervisorSubmittedAt ? item.supervisorScore ?? "Submitted" : "Pending"}</td>
                <td className="px-5 py-3">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-5 py-3">{item.performanceBand ?? "—"}</td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link to={evalPath(role, item.id)}>
                      <Button size="sm" variant="outline">
                        Open
                      </Button>
                    </Link>
                    {role === "HR" && item.actions.canOpenSelfReview ? (
                      <Button size="sm" onClick={() => openSelf.mutate(item.id)} disabled={openSelf.isPending}>
                        Open self-review
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        totalPages={list.data?.totalPages ?? 1}
        total={list.data?.total ?? 0}
        pageSize={list.data?.pageSize}
        onPageChange={setPage}
        itemLabel="evaluations"
      />
    </DashboardLayout>
  );
}

export function HrEvaluationsPage() {
  return <EvaluationListPage role="HR" />;
}

export function SupervisorEvaluationsPage() {
  return <EvaluationListPage role="SUPERVISOR" />;
}

export function EvaluationDetailPage() {
  const role = useAuthStore((state) => state.user?.role) ?? "EMPLOYEE";
  const { evaluationId } = useParams();
  const detail = useEvaluation(evaluationId);
  const peers = useEligiblePeers();
  const assignPeers = useAssignPeers();
  const saveSelf = useSaveSelfReview();
  const saveSupervisor = useSaveSupervisorEval();
  const approve = useHrApprove();
  const savePip = useSavePip();
  const evaluation = detail.data?.evaluation;
  const pdp = detail.data?.pdp ?? null;
  const [peerIds, setPeerIds] = useState<string[]>([]);
  const [selfScore, setSelfScore] = useState(80);
  const [selfComments, setSelfComments] = useState("");
  const [supervisorForm, setSupervisorForm] = useState({
    score: 80,
    comments: "",
    strengths: "",
    improvementAreas: "",
    developmentRecommendations: "",
    promotionRecommended: false,
  });
  const [hrComments, setHrComments] = useState("");
  const [pipForm, setPipForm] = useState({
    summary: "",
    reviewPeriod: "60 days",
    startDate: "",
    endDate: "",
    goals: [{ title: "", requiredActions: "", expectedOutcomes: "" }],
  });

  useEffect(() => {
    if (!evaluation) return;
    setSelfScore(evaluation.selfScore ?? 80);
    setSelfComments(evaluation.selfComments ?? "");
    setSupervisorForm({
      score: evaluation.supervisorScore ?? 80,
      comments: evaluation.supervisorComments ?? "",
      strengths: evaluation.strengths ?? "",
      improvementAreas: evaluation.improvementAreas ?? "",
      developmentRecommendations: evaluation.developmentRecommendations ?? "",
      promotionRecommended: evaluation.promotionRecommended,
    });
    setHrComments(evaluation.hrComments ?? "");
    setPeerIds(evaluation.peers.map((item) => item.reviewerId).filter(Boolean) as string[]);
    if (evaluation.pip) {
      setPipForm({
        summary: evaluation.pip.summary ?? "",
        reviewPeriod: evaluation.pip.reviewPeriod ?? "60 days",
        startDate: evaluation.pip.startDate?.slice(0, 10) ?? "",
        endDate: evaluation.pip.endDate?.slice(0, 10) ?? "",
        goals: evaluation.pip.goals.length
          ? evaluation.pip.goals.map((goal) => ({
              title: goal.title,
              requiredActions: goal.requiredActions,
              expectedOutcomes: goal.expectedOutcomes,
            }))
          : [{ title: "", requiredActions: "", expectedOutcomes: "" }],
      });
    }
  }, [evaluation]);

  if (!evaluation) {
    return (
      <DashboardLayout>
        <p className="text-sm text-stone-500">Loading evaluation…</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        crumbs={`${role} / Evaluation / ${evaluation.employee.name}`}
        title={evaluation.employee.name}
        description={`${evaluation.employee.employeeId} · ${evaluation.employee.department?.name ?? "No department"} · ${evaluation.employee.jobTitle ?? ""}`}
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <StatusBadge status={evaluation.status} />
        {evaluation.performanceBand ? <StatusBadge status={evaluation.performanceBand.replaceAll(" ", "_").toUpperCase()} /> : null}
        <span className="text-sm text-stone-500">{evaluation.cycle.name}</span>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <section className={`${surfaceClass} space-y-3 p-5`}>
          <h2 className="font-semibold">Employee information</h2>
          <p>Supervisor: {evaluation.supervisor?.name ?? "—"}</p>
          <p>Batch: {evaluation.batch?.name ?? "—"}</p>
          <p>Designation: {evaluation.employee.jobTitle ?? "—"}</p>
        </section>
        <section className={`${surfaceClass} space-y-3 p-5`}>
          <h2 className="font-semibold">Score model</h2>
          <ScoreTable evaluation={evaluation} />
        </section>
      </div>

      <section className={`${surfaceClass} mt-5 space-y-4 p-5`}>
        <h2 className="font-semibold">PDP goals and progress</h2>
        <PdpGoals pdp={pdp} />
      </section>

      {evaluation.actions.canSelfReview ? (
        <section className={`${surfaceClass} mt-5 space-y-3 p-5`}>
          <h2 className="font-semibold">Self-review</h2>
          <label className="block text-sm">
            Self score
            <input
              className={`${fieldClass} mt-1`}
              type="number"
              min={0}
              max={100}
              value={selfScore}
              onChange={(event) => setSelfScore(Number(event.target.value))}
            />
          </label>
          <textarea
            className={fieldClass}
            rows={4}
            value={selfComments}
            onChange={(event) => setSelfComments(event.target.value)}
            placeholder="Self-assessment comments"
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => saveSelf.mutate({ evaluationId: evaluation.id, score: selfScore, comments: selfComments })}
            >
              Save draft
            </Button>
            <Button
              type="button"
              onClick={() =>
                saveSelf.mutate({ evaluationId: evaluation.id, score: selfScore, comments: selfComments, submit: true })
              }
            >
              Submit self-review
            </Button>
          </div>
        </section>
      ) : (
        <section className={`${surfaceClass} mt-5 space-y-2 p-5`}>
          <h2 className="font-semibold">Self-review</h2>
          <p>Score: {evaluation.selfScore ?? "Not submitted"}</p>
          <p className="text-sm text-stone-600">{evaluation.selfComments ?? "Pending"}</p>
        </section>
      )}

      <section className={`${surfaceClass} mt-5 space-y-3 p-5`}>
        <h2 className="font-semibold">Peer review</h2>
        <p className="text-sm text-stone-500">
          {evaluation.peerCompletion.submitted} of {evaluation.peerCompletion.total} submitted. Employees never see
          reviewer names.
        </p>
        {evaluation.peers.map((peer) => (
          <div key={peer.id} className="rounded-xl border border-stone-200 px-4 py-3 dark:border-stone-800">
            <p className="font-medium">{peer.label ?? peer.reviewerName ?? "Peer"}</p>
            <p className="text-sm">{peer.comments ?? (peer.status === "PENDING" ? "Pending" : "")}</p>
            <p className="text-xs text-stone-500">Score: {peer.score ?? "—"}</p>
          </div>
        ))}
        {role === "HR" && evaluation.actions.canAssignPeers ? (
          <div className="space-y-2">
            <select
              multiple
              className={fieldClass}
              value={peerIds}
              onChange={(event) =>
                setPeerIds(Array.from(event.target.selectedOptions).map((option) => option.value))
              }
            >
              {(peers.data?.employees ?? [])
                .filter((item) => item.id !== evaluation.employee.id)
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.employeeId})
                  </option>
                ))}
            </select>
            <Button type="button" onClick={() => assignPeers.mutate({ evaluationId: evaluation.id, reviewerIds: peerIds })}>
              Save peer reviewers
            </Button>
          </div>
        ) : null}
      </section>

      {evaluation.actions.canSupervisorEvaluate ? (
        <section className={`${surfaceClass} mt-5 space-y-3 p-5`}>
          <h2 className="font-semibold">Supervisor evaluation</h2>
          <input
            className={fieldClass}
            type="number"
            min={0}
            max={100}
            value={supervisorForm.score}
            onChange={(event) => setSupervisorForm({ ...supervisorForm, score: Number(event.target.value) })}
          />
          {(["comments", "strengths", "improvementAreas", "developmentRecommendations"] as const).map((key) => (
            <textarea
              key={key}
              className={fieldClass}
              rows={3}
              placeholder={key}
              value={supervisorForm[key]}
              onChange={(event) => setSupervisorForm({ ...supervisorForm, [key]: event.target.value })}
            />
          ))}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={supervisorForm.promotionRecommended}
              onChange={(event) => setSupervisorForm({ ...supervisorForm, promotionRecommended: event.target.checked })}
            />
            Recommend for promotion
          </label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => saveSupervisor.mutate({ evaluationId: evaluation.id, ...supervisorForm })}
            >
              Save draft
            </Button>
            <Button
              type="button"
              onClick={() => saveSupervisor.mutate({ evaluationId: evaluation.id, ...supervisorForm, submit: true })}
            >
              Submit evaluation
            </Button>
          </div>
        </section>
      ) : (
        <section className={`${surfaceClass} mt-5 space-y-2 p-5`}>
          <h2 className="font-semibold">Supervisor evaluation</h2>
          <p>Score: {evaluation.supervisorScore ?? "Pending"}</p>
          <p className="text-sm">{evaluation.supervisorComments ?? ""}</p>
          {evaluation.promotionRecommended && role !== "EMPLOYEE" ? (
            <p className="text-sm">Promotion recommended</p>
          ) : null}
        </section>
      )}

      {evaluation.actions.canHrApprove ? (
        <section className={`${surfaceClass} mt-5 space-y-3 p-5`}>
          <h2 className="font-semibold">HR final appraisal review</h2>
          <textarea
            className={fieldClass}
            rows={4}
            value={hrComments}
            onChange={(event) => setHrComments(event.target.value)}
            placeholder="HR comments"
          />
          <p className="text-sm text-stone-500">
            Approving stores the final score, band, bonus eligibility, approver, and approval date/time.
          </p>
          <Button type="button" onClick={() => approve.mutate({ evaluationId: evaluation.id, hrComments })}>
            Approve final appraisal
          </Button>
        </section>
      ) : null}

      {evaluation.hrApprovedAt ? (
        <section className={`${surfaceClass} mt-5 space-y-2 p-5`}>
          <h2 className="font-semibold">Approval record</h2>
          <p>Approved by {evaluation.approvedBy?.name ?? "HR"}</p>
          <p>{formatDateTime(evaluation.hrApprovedAt)}</p>
        </section>
      ) : null}

      {(role === "HR" || role === "SUPERVISOR") && evaluation.performanceBand === "PIP Required" ? (
        <section className={`${surfaceClass} mt-5 space-y-3 p-5`}>
          <h2 className="font-semibold">Performance Improvement Plan</h2>
          <textarea
            className={fieldClass}
            rows={3}
            value={pipForm.summary}
            onChange={(event) => setPipForm({ ...pipForm, summary: event.target.value })}
            placeholder="Summary"
          />
          <input
            className={fieldClass}
            value={pipForm.reviewPeriod}
            onChange={(event) => setPipForm({ ...pipForm, reviewPeriod: event.target.value })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className={fieldClass}
              type="date"
              value={pipForm.startDate}
              onChange={(event) => setPipForm({ ...pipForm, startDate: event.target.value })}
            />
            <input
              className={fieldClass}
              type="date"
              value={pipForm.endDate}
              onChange={(event) => setPipForm({ ...pipForm, endDate: event.target.value })}
            />
          </div>
          {pipForm.goals.map((goal, index) => (
            <div key={index} className="grid gap-2">
              <input
                className={fieldClass}
                placeholder="Improvement goal"
                value={goal.title}
                onChange={(event) => {
                  const next = [...pipForm.goals];
                  next[index] = { ...goal, title: event.target.value };
                  setPipForm({ ...pipForm, goals: next });
                }}
              />
              <textarea
                className={fieldClass}
                placeholder="Required actions"
                value={goal.requiredActions}
                onChange={(event) => {
                  const next = [...pipForm.goals];
                  next[index] = { ...goal, requiredActions: event.target.value };
                  setPipForm({ ...pipForm, goals: next });
                }}
              />
              <textarea
                className={fieldClass}
                placeholder="Expected outcomes"
                value={goal.expectedOutcomes}
                onChange={(event) => {
                  const next = [...pipForm.goals];
                  next[index] = { ...goal, expectedOutcomes: event.target.value };
                  setPipForm({ ...pipForm, goals: next });
                }}
              />
            </div>
          ))}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => savePip.mutate({ evaluationId: evaluation.id, ...pipForm })}
            >
              Save PIP draft
            </Button>
            <Button
              type="button"
              onClick={() => savePip.mutate({ evaluationId: evaluation.id, ...pipForm, assign: true })}
            >
              Assign PIP
            </Button>
          </div>
        </section>
      ) : null}
    </DashboardLayout>
  );
}

export function EmployeeSelfReviewPage() {
  return <EmployeeResultsPage />;
}

export function EmployeeResultsPage() {
  const data = useMyEvaluation();
  const saveSelf = useSaveSelfReview();
  const requestReview = useCreateReviewRequest();
  const evaluation = data.data?.evaluation;
  const pdp = data.data?.pdp ?? null;
  const [selfScore, setSelfScore] = useState(80);
  const [selfComments, setSelfComments] = useState("");
  const [reason, setReason] = useState("");
  const [comments, setComments] = useState("");
  const finalized = evaluation?.status === "APPROVED";

  useEffect(() => {
    if (!evaluation) return;
    setSelfScore(evaluation.selfScore ?? 80);
    setSelfComments(evaluation.selfComments ?? "");
  }, [evaluation]);

  if (!evaluation) {
    return (
      <DashboardLayout>
        <PageHeader crumbs="Employee / Results" title="Final Appraisal Results" description="No evaluation is available yet." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        crumbs="Employee / Appraisal"
        title={finalized ? "Final Appraisal Results" : "My Evaluation"}
        description={
          finalized
            ? "Approved results for this appraisal cycle."
            : "Track your evaluation progress. Peer reviewer identities are never shown."
        }
      />
      <div className="mt-4 flex flex-wrap gap-2">
        <StatusBadge status={evaluation.status} />
        {finalized && evaluation.performanceBand ? <span className="text-sm font-medium">{evaluation.performanceBand}</span> : null}
      </div>
      <section className={`${surfaceClass} mt-5 p-5`}>
        <PdpGoals pdp={pdp} />
      </section>
      {evaluation.actions.canSelfReview ? (
        <section className={`${surfaceClass} mt-5 space-y-3 p-5`}>
          <h2 className="font-semibold">Complete self-review</h2>
          <input
            className={fieldClass}
            type="number"
            min={0}
            max={100}
            value={selfScore}
            onChange={(event) => setSelfScore(Number(event.target.value))}
          />
          <textarea
            className={fieldClass}
            rows={4}
            value={selfComments}
            onChange={(event) => setSelfComments(event.target.value)}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => saveSelf.mutate({ evaluationId: evaluation.id, score: selfScore, comments: selfComments })}
            >
              Save draft
            </Button>
            <Button
              type="button"
              onClick={() =>
                saveSelf.mutate({ evaluationId: evaluation.id, score: selfScore, comments: selfComments, submit: true })
              }
            >
              Submit
            </Button>
          </div>
        </section>
      ) : (
        <section className={`${surfaceClass} mt-5 p-5`}>
          <p>Self-review: {evaluation.selfSubmittedAt ? "Submitted" : "Not started"}</p>
        </section>
      )}
      {finalized ? (
        <>
          <div className="mt-5">
            <ScoreTable evaluation={evaluation} />
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard label="Bonus" value={evaluation.bonusEligible ? `LKR ${evaluation.bonusAmount}` : "Not eligible"} />
            <MetricCard
              label="Promotion"
              value={evaluation.promotionStatus === "NONE" ? "No update" : evaluation.promotionStatus.replaceAll("_", " ")}
            />
            <MetricCard label="Award" value={evaluation.awardConfirmed ? evaluation.awardLabel ?? "Confirmed" : "Pending"} />
          </div>
          <section className={`${surfaceClass} mt-5 space-y-2 p-5`}>
            <h2 className="font-semibold">Supervisor comments</h2>
            <p className="text-sm">{evaluation.supervisorComments}</p>
            <p className="text-sm text-stone-500">{evaluation.developmentRecommendations}</p>
            {evaluation.pip ? <p>PIP status: {evaluation.pip.status.replaceAll("_", " ")}</p> : null}
          </section>
          {evaluation.actions.canRequestReview ? (
            <section className={`${surfaceClass} mt-5 space-y-3 p-5`}>
              <h2 className="font-semibold">Request appraisal review</h2>
              <textarea className={fieldClass} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason (required)" />
              <textarea className={fieldClass} rows={2} value={comments} onChange={(event) => setComments(event.target.value)} placeholder="Additional comments" />
              <Button type="button" onClick={() => requestReview.mutate({ reason, comments })} disabled={reason.trim().length < 8}>
                Submit request
              </Button>
              {evaluation.reviewRequests.map((item) => (
                <p key={item.id} className="text-sm text-stone-500">
                  {item.status.replaceAll("_", " ")} · {item.reason}
                </p>
              ))}
            </section>
          ) : null}
        </>
      ) : (
        <p className="mt-5 text-sm text-stone-500">Final score, bonus, promotion, and awards appear after HR approval.</p>
      )}
    </DashboardLayout>
  );
}

export function EmployeePeerReviewsPage() {
  const list = useAssignedPeerReviews();
  const submit = useSubmitPeerReview();
  const [forms, setForms] = useState<Record<string, { score: number; comments: string }>>({});
  return (
    <DashboardLayout>
      <PageHeader
        crumbs="Employee / Peer Reviews"
        title="Peer Reviews Assigned to Me"
        description="Complete confidential reviews for colleagues. Your identity is never shown to the employee being reviewed."
      />
      <div className="mt-5 space-y-4">
        {(list.data?.reviews ?? []).map((item) => (
          <section key={item.id} className={`${surfaceClass} space-y-3 p-5`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{item.employee.name}</p>
                <p className="text-xs text-stone-500">{item.cycle.name}</p>
              </div>
              <StatusBadge status={item.status} />
            </div>
            {item.status === "SUBMITTED" ? (
              <p className="text-sm">Submitted</p>
            ) : (
              <>
                <input
                  className={fieldClass}
                  type="number"
                  min={0}
                  max={100}
                  value={forms[item.id]?.score ?? 80}
                  onChange={(event) =>
                    setForms({ ...forms, [item.id]: { score: Number(event.target.value), comments: forms[item.id]?.comments ?? "" } })
                  }
                />
                <textarea
                  className={fieldClass}
                  rows={3}
                  value={forms[item.id]?.comments ?? ""}
                  onChange={(event) =>
                    setForms({ ...forms, [item.id]: { score: forms[item.id]?.score ?? 80, comments: event.target.value } })
                  }
                />
                <Button
                  type="button"
                  onClick={() =>
                    submit.mutate({
                      assignmentId: item.id,
                      score: forms[item.id]?.score ?? 80,
                      comments: forms[item.id]?.comments ?? "",
                    })
                  }
                >
                  Submit peer review
                </Button>
              </>
            )}
          </section>
        ))}
      </div>
    </DashboardLayout>
  );
}

export function HrPeerReviewPage() {
  const list = useEvaluationList({ status: "PEER_REVIEW_PENDING", page: 1, pageSize: 200 });
  const all = useEvaluationList({ page: 1, pageSize: 200 });
  return (
    <DashboardLayout>
      <PageHeader
        crumbs="HR / Peer Review Management"
        title="Peer Review Management"
        description="Assign reviewers and track completion. Reviewer names are hidden from the employee being reviewed."
      />
      <div className={`${surfaceClass} mt-5 overflow-x-auto`}>
        <table className="min-w-full text-sm">
          <thead className="border-b border-stone-100 text-[11px] uppercase tracking-wide text-stone-400">
            <tr>
              <th className="px-5 py-3 text-left">Employee</th>
              <th className="px-5 py-3 text-left">Completion</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {(all.data?.evaluations ?? list.data?.evaluations ?? []).map((item) => (
              <tr key={item.id} className="border-b border-stone-50">
                <td className="px-5 py-3">{item.employee.name}</td>
                <td className="px-5 py-3">
                  {item.peerCompletion.submitted}/{item.peerCompletion.total}
                </td>
                <td className="px-5 py-3">
                  <StatusBadge status={item.status} />
                </td>
                <td className="px-5 py-3">
                  <Link to={`/hr/evaluations/${item.id}`}>
                    <Button size="sm" variant="outline">
                      Manage reviewers
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}

function RecognitionTable({
  title,
  description,
  filter,
  columns,
}: {
  title: string;
  description: string;
  filter: (item: EvaluationRecord) => boolean;
  columns: "bonus" | "promotion" | "award";
}) {
  const list = useEvaluationList({ status: "APPROVED", page: 1, pageSize: 200 });
  const update = useUpdateRecognition();
  const rows = (list.data?.evaluations ?? []).filter(filter);
  return (
    <DashboardLayout>
      <PageHeader crumbs={`HR / ${title}`} title={title} description={description} />
      <div className={`${surfaceClass} mt-5 overflow-x-auto`}>
        <table className="min-w-full text-sm">
          <thead className="border-b border-stone-100 text-[11px] uppercase tracking-wide text-stone-400">
            <tr>
              <th className="px-5 py-3 text-left">Employee</th>
              <th className="px-5 py-3 text-left">Score</th>
              <th className="px-5 py-3 text-left">Band</th>
              <th className="px-5 py-3 text-left">Details</th>
              <th className="px-5 py-3 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr key={item.id} className="border-b border-stone-50">
                <td className="px-5 py-3">{item.employee.name}</td>
                <td className="px-5 py-3">{item.finalScore}</td>
                <td className="px-5 py-3">{item.performanceBand}</td>
                <td className="px-5 py-3">
                  {columns === "bonus"
                    ? item.bonusEligible
                      ? `Eligible · LKR ${item.bonusAmount}`
                      : "Not eligible"
                    : columns === "promotion"
                      ? item.promotionStatus.replaceAll("_", " ")
                      : item.awardLabel ?? "Candidate"}
                </td>
                <td className="px-5 py-3">
                  {columns === "promotion" ? (
                    <select
                      className={fieldClass}
                      value={item.promotionStatus}
                      onChange={(event) =>
                        update.mutate({ evaluationId: item.id, promotionStatus: event.target.value })
                      }
                    >
                      {["RECOMMENDED", "UNDER_REVIEW", "SHORTLISTED", "APPROVED", "NOT_SELECTED"].map((status) => (
                        <option key={status} value={status}>
                          {status.replaceAll("_", " ")}
                        </option>
                      ))}
                    </select>
                  ) : columns === "award" ? (
                    <div className="flex gap-2">
                      <select
                        className={fieldClass}
                        value={item.awardType ?? ""}
                        onChange={(event) =>
                          update.mutate({ evaluationId: item.id, awardType: event.target.value || null })
                        }
                      >
                        <option value="">None</option>
                        <option value="EMPLOYEE_OF_THE_CYCLE">Employee of the Cycle</option>
                        <option value="OUTSTANDING_PERFORMANCE">Outstanding Performance Award</option>
                        <option value="EXCELLENCE">Excellence Award</option>
                      </select>
                      <Button
                        size="sm"
                        type="button"
                        onClick={() => update.mutate({ evaluationId: item.id, awardConfirmed: true, awardType: item.awardType })}
                      >
                        Confirm
                      </Button>
                    </div>
                  ) : (
                    <Link to={`/hr/evaluations/${item.id}`}>
                      <Button size="sm" variant="outline">
                        Open
                      </Button>
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}

export function HrRecognitionPage() {
  return (
    <RecognitionTable
      title="Recognition and Rewards"
      description="Bonus eligibility uses finalized bands: Outstanding 150,000 · Exceeds 80,000 · Meets 30,000 · below that not eligible."
      filter={() => true}
      columns="bonus"
    />
  );
}

export function HrPromotionsPage() {
  return (
    <RecognitionTable
      title="Promotion Management"
      description="Supervisor recommendations flow here for HR shortlisting and approval."
      filter={(item) => item.promotionStatus !== "NONE" || item.promotionRecommended}
      columns="promotion"
    />
  );
}

export function HrAwardsPage() {
  return (
    <RecognitionTable
      title="Awards and Recognition"
      description="Identify and confirm award recipients from finalized performance."
      filter={(item) => Boolean(item.awardType) || (item.finalScore ?? 0) >= 90}
      columns="award"
    />
  );
}

export function PipManagementPage({ role }: { role: "HR" | "SUPERVISOR" | "EMPLOYEE" }) {
  const list = usePipList();
  return (
    <DashboardLayout>
      <PageHeader
        crumbs={`${role} / PIP`}
        title="Performance Improvement Plans"
        description={
          role === "EMPLOYEE"
            ? "View the PIP assigned to you, including goals, actions, outcomes, and review dates."
            : "Employees with a final score below 60 are identified as PIP Required."
        }
      />
      <div className="mt-5 space-y-4">
        {((list.data?.pips ?? []) as Array<{
          id: string;
          status: string;
          summary: string | null;
          reviewPeriod: string | null;
          startDate: string | null;
          endDate: string | null;
          employee: { name: string; employeeId: string };
          evaluation: { id: string; finalScore: number | null; performanceBand: string | null };
          goals: Array<{ id: string; title: string; requiredActions: string; expectedOutcomes: string }>;
        }>).map((pip) => (
          <section key={pip.id} className={`${surfaceClass} space-y-3 p-5`}>
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <p className="font-medium">{pip.employee.name}</p>
                <p className="text-xs text-stone-500">
                  Score {pip.evaluation.finalScore} · {pip.evaluation.performanceBand}
                </p>
              </div>
              <StatusBadge status={pip.status} />
            </div>
            <p className="text-sm">{pip.summary}</p>
            <p className="text-xs text-stone-500">
              {pip.reviewPeriod} · {pip.startDate ? formatDate(pip.startDate) : "—"} to{" "}
              {pip.endDate ? formatDate(pip.endDate) : "—"}
            </p>
            {pip.goals.map((goal) => (
              <div key={goal.id} className="rounded-xl border border-stone-200 px-4 py-3 dark:border-stone-800">
                <p className="font-medium">{goal.title}</p>
                <p className="text-sm">{goal.requiredActions}</p>
                <p className="text-sm text-stone-500">{goal.expectedOutcomes}</p>
              </div>
            ))}
            {role !== "EMPLOYEE" ? (
              <Link to={evalPath(role, pip.evaluation.id)}>
                <Button size="sm" variant="outline">
                  Open appraisal
                </Button>
              </Link>
            ) : null}
          </section>
        ))}
      </div>
    </DashboardLayout>
  );
}

export function HrReviewRequestsPage() {
  const list = useReviewRequests();
  const respond = useRespondReviewRequest();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  return (
    <DashboardLayout>
      <PageHeader
        crumbs="HR / Appraisal Review Requests"
        title="Appraisal Review Requests"
        description="Track employee requests after final approval. Respond and update status without changing the stored score automatically."
      />
      <div className="mt-5 space-y-4">
        {((list.data?.requests ?? []) as Array<{
          id: string;
          reason: string;
          comments: string | null;
          status: string;
          hrResponse: string | null;
          employee: { name: string };
          evaluation: { id: string; finalScore: number | null; performanceBand: string | null };
        }>).map((item) => (
          <section key={item.id} className={`${surfaceClass} space-y-3 p-5`}>
            <div className="flex justify-between gap-2">
              <div>
                <p className="font-medium">{item.employee.name}</p>
                <p className="text-sm">{item.reason}</p>
                <p className="text-xs text-stone-500">{item.comments}</p>
              </div>
              <StatusBadge status={item.status} />
            </div>
            <textarea
              className={fieldClass}
              rows={3}
              value={drafts[item.id] ?? item.hrResponse ?? ""}
              onChange={(event) => setDrafts({ ...drafts, [item.id]: event.target.value })}
            />
            <div className="flex flex-wrap gap-2">
              {["UNDER_REVIEW", "RESPONDED", "CLOSED"].map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() =>
                    respond.mutate({
                      requestId: item.id,
                      status,
                      hrResponse: drafts[item.id] ?? item.hrResponse ?? "Reviewed",
                    })
                  }
                >
                  Mark {status.replaceAll("_", " ").toLowerCase()}
                </Button>
              ))}
              <Link to={`/hr/evaluations/${item.evaluation.id}`}>
                <Button size="sm">Open appraisal</Button>
              </Link>
            </div>
          </section>
        ))}
      </div>
    </DashboardLayout>
  );
}

export function ReportsPage() {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const report = useReporting(filters);
  const rows = report.data?.rows ?? [];
  return (
    <DashboardLayout>
      <PageHeader
        crumbs="Reporting / Analytics"
        title="Reporting and Analytics"
        description="Generate performance reports from saved appraisal data. Exports use the filtered result set."
      />
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <select className={fieldClass} value={filters.cycleId ?? ""} onChange={(event) => setFilters({ ...filters, cycleId: event.target.value })}>
          <option value="">All cycles</option>
          {(report.data?.cycles ?? []).map((cycle) => (
            <option key={cycle.id} value={cycle.id}>
              {cycle.name}
            </option>
          ))}
        </select>
        <select className={fieldClass} value={filters.departmentId ?? ""} onChange={(event) => setFilters({ ...filters, departmentId: event.target.value })}>
          <option value="">All departments</option>
          {(report.data?.departments ?? []).map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
        <select className={fieldClass} value={filters.band ?? ""} onChange={(event) => setFilters({ ...filters, band: event.target.value })}>
          <option value="">All bands</option>
          {["Outstanding", "Exceeds Expectations", "Meets Expectations", "Needs Improvement", "PIP Required"].map((band) => (
            <option key={band} value={band}>
              {band}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-4 flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => downloadCsv("performance-report.csv", rows)}
          disabled={!rows.length}
        >
          Export CSV
        </Button>
        <Button
          type="button"
          onClick={() =>
            downloadPdf(
              "performance-report.pdf",
              "PerformX 360 Performance Report",
              rows.map(
                (row) =>
                  `${row.employee} (${row.employeeId}) | ${row.department} | ${row.finalScore ?? "—"} | ${row.band ?? "—"} | ${row.status}`
              )
            )
          }
          disabled={!rows.length}
        >
          Export PDF
        </Button>
      </div>
      <div className={`${surfaceClass} mt-5 overflow-x-auto`}>
        <table className="min-w-full text-sm">
          <thead className="border-b border-stone-100 text-[11px] uppercase tracking-wide text-stone-400">
            <tr>
              {["Employee", "Department", "Cycle", "Score", "Band", "PIP", "Promotion"].map((label) => (
                <th key={label} className="px-5 py-3 text-left">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.employeeId}-${index}`} className="border-b border-stone-50">
                <td className="px-5 py-3">{row.employee}</td>
                <td className="px-5 py-3">{row.department}</td>
                <td className="px-5 py-3">{row.cycle}</td>
                <td className="px-5 py-3">{row.finalScore ?? "—"}</td>
                <td className="px-5 py-3">{row.band ?? "—"}</td>
                <td className="px-5 py-3">{row.pipStatus || "—"}</td>
                <td className="px-5 py-3">{String(row.promotionStatus ?? "").replaceAll("_", " ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
}

export function LeadershipAnalyticsPanel() {
  const [cycleId, setCycleId] = useState("");
  const analytics = useLeadershipAnalytics(cycleId ? { cycleId } : undefined);
  const data = analytics.data as
    | {
        cycle?: { name: string };
        cycles?: Array<{ id: string; name: string }>;
        overview?: Record<string, number>;
        bands?: Record<string, number>;
        departments?: Array<{
          id: string;
          name: string;
          employees: number;
          average: number;
          highest: number;
          lowest: number;
          completion: number;
        }>;
        promotions?: Record<string, number>;
        pips?: Record<string, number>;
        pdp?: Record<string, number>;
        reviews?: Record<string, number>;
        batches?: Array<{ id: string; name: string; stage: string }>;
        trends?: Array<{ id: string; name: string; average: number; completed: number }>;
      }
    | undefined;
  const bandChart = Object.entries(data?.bands ?? {}).map(([name, value]) => ({ name, value }));
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <select className={fieldClass} value={cycleId} onChange={(event) => setCycleId(event.target.value)}>
          <option value="">Active cycle</option>
          {(data?.cycles ?? []).map((cycle) => (
            <option key={cycle.id} value={cycle.id}>
              {cycle.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Evaluations" value={data?.overview?.totalEmployees ?? 0} />
        <MetricCard label="Active cycles" value={data?.overview?.activeCycles ?? 0} />
        <MetricCard label="Completed" value={data?.overview?.completedAppraisals ?? 0} accent="green" />
        <MetricCard label="Pending" value={data?.overview?.pendingAppraisals ?? 0} accent="orange" />
        <MetricCard label="Completion" value={`${data?.overview?.completionRate ?? 0}%`} />
      </div>
      <section className={`${surfaceClass} p-5`}>
        <h2 className="font-semibold">Performance distribution</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bandChart}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={70} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#d97706" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
      <section className={`${surfaceClass} overflow-x-auto`}>
        <table className="min-w-full text-sm">
          <thead className="border-b border-stone-100 text-[11px] uppercase tracking-wide text-stone-400">
            <tr>
              {["Department", "Average", "Employees", "Highest", "Lowest", "Completion"].map((label) => (
                <th key={label} className="px-5 py-3 text-left">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data?.departments ?? []).map((department) => (
              <tr key={department.id} className="border-b border-stone-50">
                <td className="px-5 py-3">{department.name}</td>
                <td className="px-5 py-3">{department.average}</td>
                <td className="px-5 py-3">{department.employees}</td>
                <td className="px-5 py-3">{department.highest}</td>
                <td className="px-5 py-3">{department.lowest}</td>
                <td className="px-5 py-3">{department.completion}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <div className="grid gap-4 lg:grid-cols-3">
        <section className={`${surfaceClass} p-5`}>
          <h2 className="font-semibold">Promotions</h2>
          <p className="mt-2 text-sm">Recommended {data?.promotions?.recommended ?? 0}</p>
          <p className="text-sm">Shortlisted {data?.promotions?.shortlisted ?? 0}</p>
          <p className="text-sm">Approved {data?.promotions?.approved ?? 0}</p>
        </section>
        <section className={`${surfaceClass} p-5`}>
          <h2 className="font-semibold">PIP insights</h2>
          <p className="mt-2 text-sm">Required {data?.pips?.required ?? 0}</p>
          <p className="text-sm">Active {data?.pips?.active ?? 0}</p>
          <p className="text-sm">Completed {data?.pips?.completed ?? 0}</p>
          <p className="text-sm">Failed {data?.pips?.failed ?? 0}</p>
        </section>
        <section className={`${surfaceClass} p-5`}>
          <h2 className="font-semibold">PDP progress</h2>
          <p className="mt-2 text-sm">Average completion {data?.pdp?.averageCompletion ?? 0}%</p>
          <p className="text-sm">Completed goals {data?.pdp?.completedGoals ?? 0}</p>
          <p className="text-sm">In progress {data?.pdp?.inProgressGoals ?? 0}</p>
          <p className="text-sm">Overdue {data?.pdp?.overdueGoals ?? 0}</p>
        </section>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className={`${surfaceClass} p-5`}>
          <h2 className="font-semibold">Review completion</h2>
          <p className="mt-2 text-sm">Self reviews {data?.reviews?.self ?? 0}</p>
          <p className="text-sm">Peer reviews {data?.reviews?.peer ?? 0}</p>
          <p className="text-sm">Supervisor evaluations {data?.reviews?.supervisor ?? 0}</p>
          <p className="text-sm">Final appraisals approved {data?.reviews?.approved ?? 0}</p>
        </section>
        <section className={`${surfaceClass} p-5`}>
          <h2 className="font-semibold">Appraisal cycle status</h2>
          {(data?.batches ?? []).map((batch) => (
            <p key={batch.id} className="mt-1 text-sm">
              {batch.name}: {batch.stage.replaceAll("_", " ")}
            </p>
          ))}
        </section>
      </div>
      <section className={`${surfaceClass} p-5`}>
        <h2 className="font-semibold">Workforce performance trends</h2>
        {(data?.trends ?? []).map((item) => (
          <p key={item.id} className="mt-1 text-sm">
            {item.name}: average {item.average} · completed {item.completed}
          </p>
        ))}
      </section>
    </div>
  );
}
