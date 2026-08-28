import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Code2,
  FileText,
  GraduationCap,
  LineChart,
  Target,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { surfaceClass } from "@/components/corporate/CorporateUi";
import { fieldClass } from "@/features/hr/components/ActionMenu";
import { formatDate, formatDateTime } from "@/features/hr/utils/dates";
import { API_BASE_URL } from "@/services/api/client";
import { cn } from "@/lib/utils";
import {
  useAddGoalComment,
  useUpdateGoalProgress,
  useUploadPdpEvidence,
} from "../hooks/usePdp";
import type { PdpGoal, PdpRecord } from "../types";

const TABS = [
  { id: "goals", label: "My Goals" },
  { id: "evidence", label: "Progress & Evidence" },
  { id: "timeline", label: "PDP Timeline" },
  { id: "documents", label: "Documents" },
] as const;

function categoryIcon(category: string | null, index: number) {
  const key = (category ?? "").toLowerCase();
  if (key.includes("behav") || key.includes("collab")) return Users;
  if (key.includes("learn") || key.includes("course")) return GraduationCap;
  if (key.includes("doc")) return FileText;
  if (key.includes("perf") || key.includes("optim")) return LineChart;
  if (index % 5 === 0) return Target;
  return Code2;
}

function categoryColor(index: number) {
  return [
    "bg-amber-100 text-amber-800",
    "bg-emerald-100 text-emerald-800",
    "bg-sky-100 text-sky-800",
    "bg-violet-100 text-violet-800",
    "bg-orange-100 text-orange-800",
  ][index % 5];
}

function statusTone(status: string) {
  if (status === "COMPLETED") return "bg-emerald-50 text-emerald-800";
  if (status === "IN_PROGRESS") return "bg-emerald-50 text-emerald-700";
  return "bg-stone-100 text-stone-600";
}

function meetingLabel(status: string) {
  if (status === "CONFIRMED") return "Upcoming";
  if (status === "SCHEDULED") return "Scheduled";
  return status.replaceAll("_", " ");
}

export function EmployeePdpDashboard({ pdp, onBack }: { pdp: PdpRecord; onBack: () => void }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("goals");
  const [view, setView] = useState("all");
  const [openGoal, setOpenGoal] = useState<string | null>(null);
  const completed = pdp.goals.filter((goal) => goal.status === "COMPLETED").length;
  const inProgress = pdp.goals.filter((goal) => goal.status === "IN_PROGRESS" || goal.status === "UNDER_REVIEW").length;
  const overall = pdp.progressPercent ?? 0;
  const filtered = pdp.goals.filter((goal) => {
    if (view === "completed") return goal.status === "COMPLETED";
    if (view === "progress") return goal.status !== "COMPLETED";
    return true;
  });
  const month = useMemo(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  }, []);

  return (
    <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs text-stone-500">My PDP &gt; PDP Dashboard</p>
            <div className="mt-1 flex items-center gap-3">
              <h2 className="text-2xl font-semibold tracking-tight">My PDP Dashboard</h2>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-medium text-emerald-800">Active</span>
            </div>
            <p className="mt-1 text-sm text-stone-500">Track your development progress and achieve your goals.</p>
          </div>
          <div className="flex items-center gap-2">
            <select className={`${fieldClass} min-w-[220px]`}>
              <option>{pdp.cycle.name} Cycle</option>
            </select>
            <Button type="button" variant="outline" size="sm" onClick={onBack}>
              Back to My PDP
            </Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <SummaryCard
            label="Overall Progress"
            value={`${overall}%`}
            hint={overall >= 60 ? "Good progress! Keep it up." : "Keep building momentum."}
            icon={<BarChart3 className="h-4 w-4" />}
            bar={overall}
          />
          <SummaryCard label="Total Goals" value={pdp.goals.length} hint="Active goals" icon={<Target className="h-4 w-4" />} />
          <SummaryCard
            label="Completed Goals"
            value={completed}
            hint={`${pdp.goals.length ? Math.round((completed / pdp.goals.length) * 100) : 0}% of total`}
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
          />
          <SummaryCard
            label="In Progress Goals"
            value={inProgress}
            hint={`${pdp.goals.length ? Math.round((inProgress / pdp.goals.length) * 100) : 0}% of total`}
            icon={<Clock3 className="h-4 w-4 text-sky-600" />}
          />
          <SummaryCard
            label="Evidence Uploaded"
            value={pdp.evidence?.length ?? 0}
            hint="This cycle"
            icon={<FileText className="h-4 w-4" />}
          />
        </div>

        <div className="flex gap-6 border-b border-stone-200 text-sm dark:border-stone-800">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "-mb-px border-b-2 pb-3 font-medium",
                tab === item.id ? "border-amber-400 text-stone-900" : "border-transparent text-stone-500"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "goals" ? (
          <section className={`${surfaceClass} p-6`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">My Development Goals</h3>
                <p className="text-sm text-stone-500">Your goals and progress for this development cycle.</p>
              </div>
              <select className={fieldClass} value={view} onChange={(event) => setView(event.target.value)}>
                <option value="all">View: All Goals</option>
                <option value="progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="mt-5 space-y-4">
              {filtered.map((goal, index) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  index={index}
                  pdp={pdp}
                  open={openGoal === goal.id}
                  onToggle={() => setOpenGoal((current) => (current === goal.id ? null : goal.id))}
                />
              ))}
            </div>
          </section>
        ) : null}

        {tab === "evidence" ? <EvidencePanel pdp={pdp} /> : null}
        {tab === "timeline" ? (
          <section className={`${surfaceClass} p-6`}>
            <h3 className="text-lg font-semibold">PDP Timeline</h3>
            <ol className="mt-6 space-y-4">
              {(pdp.timeline ?? []).map((stage) => (
                <li key={stage.id} className="flex gap-3">
                  <span
                    className={cn(
                      "mt-1 h-3 w-3 rounded-full",
                      stage.state === "done" ? "bg-emerald-500" : stage.state === "current" ? "bg-amber-400" : "bg-stone-300"
                    )}
                  />
                  <div>
                    <p className="font-medium">{stage.label}</p>
                    <p className="text-xs uppercase tracking-wide text-stone-400">{stage.state}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ) : null}
        {tab === "documents" ? (
          <section className={`${surfaceClass} p-6`}>
            <h3 className="text-lg font-semibold">Documents</h3>
            <p className="mt-1 text-sm text-stone-500">Evidence files uploaded against your assigned goals.</p>
            <ul className="mt-4 space-y-2">
              {(pdp.evidence ?? []).map((item) => (
                <li key={item.id} className="flex items-center justify-between rounded-xl border border-stone-200 px-4 py-3 text-sm">
                  <span>{item.fileName}</span>
                  <span className="text-stone-400">{formatDate(item.createdAt)}</span>
                </li>
              ))}
              {(pdp.evidence ?? []).length === 0 ? <p className="text-sm text-stone-500">No documents yet.</p> : null}
            </ul>
          </section>
        ) : null}
      </div>

      <aside className="space-y-5">
        <section className={`${surfaceClass} p-5`}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">PDP Calendar</h3>
            <CalendarDays className="h-4 w-4 text-stone-400" />
          </div>
          <p className="mt-1 text-sm text-stone-500">
            {new Date(month.year, month.month).toLocaleString(undefined, { month: "long", year: "numeric" })}
          </p>
          <MiniCalendar year={month.year} month={month.month} pdp={pdp} />
          <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-stone-500">
            <span className="inline-flex items-center gap-1">
              <i className="h-2 w-2 rounded-full bg-amber-400" /> Goal Deadline
            </span>
            <span className="inline-flex items-center gap-1">
              <i className="h-2 w-2 rounded-full bg-sky-500" /> Meeting
            </span>
            <span className="inline-flex items-center gap-1">
              <i className="h-2 w-2 rounded-full bg-emerald-500" /> Milestone
            </span>
          </div>
        </section>

        <section className={`${surfaceClass} p-5`}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Upcoming Follow-up Meetings</h3>
            <Link to="/employee/meetings/follow-up" className="text-xs text-stone-500 hover:underline">
              View All
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {(pdp.followUpMeetings ?? []).slice(0, 3).map((meeting) => (
              <div key={meeting.id} className="rounded-xl border border-stone-100 px-3 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{meeting.title}</p>
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                    {meetingLabel(meeting.status)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-stone-500">{formatDateTime(meeting.scheduledAt)}</p>
              </div>
            ))}
            {(pdp.followUpMeetings ?? []).length === 0 ? (
              <p className="text-sm text-stone-500">No follow-up meetings scheduled yet.</p>
            ) : null}
          </div>
        </section>

        <section className={`${surfaceClass} p-5`}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Recent Activity</h3>
            <Link to="/notifications" className="text-xs text-stone-500 hover:underline">
              View All
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {(pdp.activities ?? []).slice(0, 5).map((item) => (
              <div key={item.id} className="flex gap-3">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-amber-400" />
                <div>
                  <p className="text-sm">{item.message}</p>
                  <p className="text-[11px] text-stone-400">{formatDateTime(item.createdAt)}</p>
                </div>
              </div>
            ))}
            {(pdp.activities ?? []).length === 0 ? <p className="text-sm text-stone-500">No activity yet.</p> : null}
          </div>
        </section>

        {(pdp.notifications ?? []).length > 0 ? (
          <section className={`${surfaceClass} p-5`}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">PDP Notifications</h3>
              <Link to="/notifications" className="text-xs text-stone-500 hover:underline">
                View All
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {(pdp.notifications ?? []).slice(0, 4).map((item) => (
                <div key={item.id}>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-stone-500">{item.message}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </aside>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  icon,
  bar,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: ReactNode;
  bar?: number;
}) {
  return (
    <div className={`${surfaceClass} p-4`}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
        <span className="text-stone-400">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
      {typeof bar === "number" ? (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-100">
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${bar}%` }} />
        </div>
      ) : null}
      {hint ? <p className="mt-2 text-xs text-stone-500">{hint}</p> : null}
    </div>
  );
}

function EvidencePanel({ pdp }: { pdp: PdpRecord }) {
  return (
    <section className={`${surfaceClass} overflow-hidden`}>
      <div className="px-6 py-4">
        <h3 className="text-lg font-semibold">Progress & Evidence</h3>
        <p className="text-sm text-stone-500">Documents and updates attached to your goals.</p>
      </div>
      <table className="min-w-full text-left text-sm">
        <thead className="border-y border-stone-100 text-[11px] uppercase tracking-wide text-stone-400">
          <tr>
            <th className="px-6 py-3">File</th>
            <th className="px-6 py-3">Goal</th>
            <th className="px-6 py-3">Uploaded</th>
            <th className="px-6 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {(pdp.evidence ?? []).map((item) => (
            <tr key={item.id} className="border-b border-stone-50">
              <td className="px-6 py-3">
                <a className="hover:underline" href={`${API_BASE_URL}/pdp/evidence/${item.id}`} target="_blank" rel="noreferrer">
                  {item.fileName}
                </a>
              </td>
              <td className="px-6 py-3">{item.relatedGoal}</td>
              <td className="px-6 py-3">{formatDate(item.createdAt)}</td>
              <td className="px-6 py-3">{item.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {(pdp.evidence ?? []).length === 0 ? <p className="px-6 py-8 text-sm text-stone-500">No evidence uploaded yet.</p> : null}
    </section>
  );
}

function GoalCard({
  goal,
  index,
  pdp,
  open,
  onToggle,
}: {
  goal: PdpGoal;
  index: number;
  pdp: PdpRecord;
  open: boolean;
  onToggle: () => void;
}) {
  const Icon = categoryIcon(goal.category, index);
  const update = useUpdateGoalProgress();
  const upload = useUploadPdpEvidence();
  const comment = useAddGoalComment();
  const [progress, setProgress] = useState(goal.progress);
  const [notes, setNotes] = useState(goal.progressComments ?? "");
  const [message, setMessage] = useState("");
  const comments = (pdp.goalComments ?? []).filter((item) => item.goalId === goal.id);

  return (
    <article className="rounded-2xl border border-stone-200 p-4 dark:border-stone-800">
      <button type="button" className="flex w-full items-start gap-3 text-left" onClick={onToggle}>
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", categoryColor(index))}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">{goal.title}</p>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-stone-500">
              {goal.category ?? goal.developmentArea ?? "Technical"}
            </span>
          </div>
          <p className="mt-1 text-sm text-stone-500">{goal.objective}</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-stone-100">
            <div
              className={cn("h-full rounded-full", goal.progress >= 100 ? "bg-emerald-500" : "bg-amber-400")}
              style={{ width: `${goal.progress}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-stone-500">
            <span>Target {formatDate(goal.dueDate)}</span>
            <span className="capitalize">{goal.priority.toLowerCase()}</span>
            <span className={cn("rounded-full px-2 py-0.5 font-medium", statusTone(goal.status))}>
              {goal.status.replaceAll("_", " ")}
            </span>
          </div>
        </div>
      </button>
      {open && pdp.actions.canUpdateProgress ? (
        <div className="mt-4 grid gap-3 border-t border-stone-100 pt-4 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-xs text-stone-500">Update progress</span>
            <input
              type="range"
              min={0}
              max={100}
              className="mt-2 w-full"
              value={progress}
              onChange={(event) => setProgress(Number(event.target.value))}
            />
            <p className="text-xs text-stone-500">{progress}%</p>
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="text-xs text-stone-500">Progress notes</span>
            <textarea className={`${fieldClass} mt-1 h-20 py-2`} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
          <div className="flex flex-wrap gap-2 sm:col-span-2">
            <Button type="button" size="sm" disabled={update.isPending} onClick={() => update.mutate({ pdpId: pdp.id, goalId: goal.id, progress, notes })}>
              Update Progress
            </Button>
            <label className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-stone-300 px-3 text-sm">
              Upload Evidence
              <input
                type="file"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  upload.mutate({ pdpId: pdp.id, goalId: goal.id, file, kind: "SUPPORTING" });
                  event.target.value = "";
                }}
              />
            </label>
          </div>
          <label className="text-sm sm:col-span-2">
            <span className="text-xs text-stone-500">Add a comment</span>
            <textarea className={`${fieldClass} mt-1 h-16 py-2`} value={message} onChange={(event) => setMessage(event.target.value)} />
          </label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={comment.isPending || message.trim().length < 2}
            onClick={() => {
              comment.mutate({ pdpId: pdp.id, goalId: goal.id, message });
              setMessage("");
            }}
          >
            Add comment
          </Button>
          {comments.length > 0 ? (
            <div className="space-y-2 sm:col-span-2">
              {comments.map((item) => (
                <p key={item.id} className="text-sm text-stone-600">
                  <span className="font-medium">{item.author.name}:</span> {item.message}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function MiniCalendar({ year, month, pdp }: { year: number; month: number; pdp: PdpRecord }) {
  const first = new Date(year, month, 1);
  const start = first.getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: start + days }, (_, index) => (index < start ? null : index - start + 1));
  const deadlineDays = new Set(
    pdp.goals
      .map((goal) => (goal.dueDate ? new Date(goal.dueDate) : null))
      .filter((date): date is Date => date !== null && date.getMonth() === month && date.getFullYear() === year)
      .map((date) => date.getDate())
  );
  const meetingDays = new Set(
    (pdp.followUpMeetings ?? [])
      .map((item) => new Date(item.scheduledAt))
      .filter((date) => date.getMonth() === month && date.getFullYear() === year)
      .map((date) => date.getDate())
  );
  return (
    <div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs">
      {["S", "M", "T", "W", "T", "F", "S"].map((day) => (
        <span key={day} className="py-1 text-stone-400">
          {day}
        </span>
      ))}
      {cells.map((day, index) => (
        <span
          key={index}
          className={cn(
            "relative flex h-8 items-center justify-center rounded-full",
            day && deadlineDays.has(day) && "bg-amber-100 font-semibold",
            day && meetingDays.has(day) && !deadlineDays.has(day) && "bg-sky-50"
          )}
        >
          {day ?? ""}
        </span>
      ))}
    </div>
  );
}
