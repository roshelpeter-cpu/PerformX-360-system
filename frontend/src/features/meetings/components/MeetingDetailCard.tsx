import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/features/hr/components/StatusBadge";
import { fieldClass } from "@/features/hr/components/ActionMenu";
import { formatDate, formatDateTime, formatTimeRange } from "@/features/hr/utils/dates";
import type { PlanningMeeting } from "../types";
import {
  useConfirmPlanningMeeting,
  useConfirmPlanningMeetingByHr,
  useRequestPlanningReschedule,
  useReviewPlanningReschedule,
  useSavePlanningNotes,
} from "../hooks/useMeetings";

function responseLabel(value: string) {
  if (value === "ACCEPTED") return "Confirmed";
  if (value === "RESCHEDULE_REQUESTED") return "Reschedule requested";
  if (value === "REJECTED") return "Declined";
  return "Pending";
}

const NOTE_SECTIONS = [
  {
    title: "Previous Appraisal Reviewed",
    description: "Previous appraisal outcome, performance, improvement areas, and key achievements.",
    fields: [
      ["previousAppraisalReviewed", "Previous Appraisal Reviewed — outcome, previous performance, improvement areas, and key achievements"],
      ["previousAppraisalFindings", "Key achievements and appraisal findings"],
    ] as const,
  },
  {
    title: "Previous PDP Reviewed",
    description: "Previous PDP completion, completed goals, incomplete goals, and carried-forward areas.",
    fields: [
      ["previousPdpReviewed", "Previous PDP Reviewed — completion, completed goals, incomplete goals, and carried-forward areas"],
      ["completedGoals", "Completed goals"],
      ["incompleteGoals", "Incomplete goals"],
      ["carriedForward", "Carried-forward development areas"],
    ] as const,
  },
  {
    title: "Strengths & Areas for Improvement",
    description: "Employee strengths and development areas identified during the discussion.",
    fields: [
      ["employeeStrengths", "Strengths"],
      ["employeeWeaknesses", "Areas for Improvement"],
    ] as const,
  },
  {
    title: "Objectives & Development Needs",
    description: "Department and company objectives discussed, plus development needs identified.",
    fields: [
      ["departmentObjectives", "Department Objectives"],
      ["companyObjectives", "Company Objectives"],
      ["developmentNeeds", "Development Needs"],
    ] as const,
  },
  {
    title: "Discussion Summary & Actions",
    description: "Summarise the complete discussion and document agreed actions.",
    fields: [
      ["discussionSummary", "Discussion Summary"],
      ["decisionsMade", "Decisions and Agreed Actions"],
      ["agreedOutcomes", "Responsibilities and follow-up actions"],
      ["additionalComments", "Additional Notes"],
    ] as const,
  },
] as const;

const OPTIONAL_NOTE_FIELDS = new Set([
  "additionalComments",
  "completedGoals",
  "incompleteGoals",
  "carriedForward",
  "previousAppraisalFindings",
  "agreedOutcomes",
]);

export function meetingDetailPath(role: string, meetingId: string, type?: string) {
  const kind =
    type === "FOLLOW_UP" ? "follow-up" : type === "OTHER" || type === "PDP_DISAGREEMENT" ? "other" : "planning";
  if (role === "HR") return `/hr/meetings/${kind}/${meetingId}`;
  if (role === "SUPERVISOR") return `/supervisor/meetings/${kind}/${meetingId}`;
  return `/employee/meetings/${kind}/${meetingId}`;
}

export function MeetingDetailCard({
  meeting,
  role,
  showNotesForm = true,
}: {
  meeting: PlanningMeeting;
  role: string;
  showNotesForm?: boolean;
}) {
  const completed = meeting.status === "COMPLETED";
  const confirm = useConfirmPlanningMeeting();
  const hrConfirm = useConfirmPlanningMeetingByHr();
  const reschedule = useRequestPlanningReschedule();
  const review = useReviewPlanningReschedule();
  const saveNotes = useSavePlanningNotes();
  const [reason, setReason] = useState("");
  const [showReschedule, setShowReschedule] = useState(false);
  const [notes, setNotes] = useState({
    previousAppraisalReviewed: "",
    previousAppraisalFindings: "",
    previousPdpReviewed: "",
    completedGoals: "",
    incompleteGoals: "",
    carriedForward: "",
    employeeStrengths: "",
    employeeWeaknesses: "",
    departmentObjectives: "",
    companyObjectives: "",
    developmentNeeds: "",
    discussionSummary: "",
    decisionsMade: "",
    agreedOutcomes: "",
    additionalComments: "",
  });
  const previous = meeting.previousAppraisal;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
            {completed ? "Completed meeting" : "Meeting confirmation required"}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-stone-900 dark:text-white">
            {meeting.title}
          </h3>
          <p className="mt-1 text-sm text-stone-500">
            {formatDate(meeting.scheduledAt)} · {formatTimeRange(meeting.scheduledAt, meeting.endAt)}
            {meeting.location ? ` · ${meeting.location}` : ""}
          </p>
        </div>
        <StatusBadge status={meeting.status} />
      </div>

      <div className="grid gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm dark:border-stone-800 dark:bg-stone-950 sm:grid-cols-2">
        <p>
          Employee: {meeting.employee.name} — {responseLabel(meeting.employeeResponse)}
        </p>
        <p>
          Supervisor: {meeting.supervisor?.name ?? "—"} — {responseLabel(meeting.supervisorResponse)}
        </p>
        <p>Employee ID: {meeting.employee.employeeId}</p>
        <p>Department: {meeting.employee.department?.name ?? "—"}</p>
      </div>

      {previous ? (
        <section className="rounded-2xl border border-stone-200 p-4 dark:border-stone-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Previous appraisal information
          </p>
          <p className="mt-1 text-sm font-medium">{previous.cycle.name}</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Mini label="Result" value={previous.outcome?.overallResult ?? "—"} />
            <Mini
              label="Band / score"
              value={
                previous.outcome
                  ? `${previous.outcome.ratingBand ?? "—"} · ${previous.outcome.overallScore ?? "—"}`
                  : "—"
              }
            />
            <Mini label="Award" value={previous.outcome?.awardTitle ?? "None"} />
            <Mini
              label="PIP"
              value={previous.outcome?.pipRequired ? previous.outcome.pipSummary ?? "Required" : "Not required"}
            />
          </div>
          {previous.pdp ? (
            <div className="mt-4">
              <p className="text-xs uppercase tracking-wide text-stone-400">Previous PDP</p>
              <p className="mt-1 text-sm">{previous.pdp.summary ?? previous.pdp.status.replaceAll("_", " ")}</p>
              <div className="mt-2 space-y-1">
                {previous.pdp.goals.slice(0, 6).map((goal) => (
                  <p key={goal.id} className="text-sm text-stone-600 dark:text-stone-300">
                    {goal.title} · {goal.progress}%
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {meeting.pendingReschedule ? (
        <div className="rounded-xl border border-stone-200 p-3 dark:border-stone-700">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Reschedule request
          </p>
          <p className="mt-1 text-sm">{meeting.pendingReschedule.reason}</p>
          {role === "HR" && meeting.actions.canReviewReschedule ? (
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => review.mutate({ meetingId: meeting.id, decision: "APPROVED" })}
              >
                Approve
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => review.mutate({ meetingId: meeting.id, decision: "REJECTED" })}
              >
                Decline
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {completed && meeting.notes ? (
        <div className="space-y-3 rounded-xl border border-stone-200 p-4 dark:border-stone-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Supervisor meeting notes
          </p>
          {[
            ["Previous appraisal reviewed", meeting.notes.previousAppraisalReviewed],
            ["Key achievements / findings", meeting.notes.previousAppraisalFindings],
            ["Previous PDP reviewed", meeting.notes.previousPdpReviewed],
            ["Completed goals", meeting.notes.completedGoals],
            ["Incomplete goals", meeting.notes.incompleteGoals],
            ["Carried-forward development areas", meeting.notes.carriedForward],
            ["Strengths", meeting.notes.employeeStrengths],
            ["Areas for improvement", meeting.notes.employeeWeaknesses],
            ["Department objectives", meeting.notes.departmentObjectives],
            ["Company objectives", meeting.notes.companyObjectives],
            ["Development needs", meeting.notes.developmentNeeds],
            ["Discussion summary", meeting.notes.discussionSummary],
            ["Decisions and agreed actions", meeting.notes.decisionsMade],
            ["Additional notes", meeting.notes.additionalComments],
          ].map(([label, value]) =>
            value ? (
              <div key={label}>
                <p className="text-xs uppercase tracking-wide text-stone-400">{label}</p>
                <p className="mt-1 text-sm text-stone-700 dark:text-stone-300">{value}</p>
              </div>
            ) : null
          )}
        </div>
      ) : null}

      {!completed ? (
        <div className="flex flex-wrap gap-2">
          {meeting.actions.canConfirm ? (
            <Button type="button" onClick={() => confirm.mutate(meeting.id)} disabled={confirm.isPending}>
              Confirm Meeting
            </Button>
          ) : null}
          {meeting.actions.canHrConfirm ? (
            <Button
              type="button"
              onClick={() => hrConfirm.mutate(meeting.id)}
              disabled={hrConfirm.isPending}
            >
              Confirm Meeting
            </Button>
          ) : null}
          {meeting.actions.canRequestReschedule ? (
            <Button type="button" variant="outline" onClick={() => setShowReschedule((value) => !value)}>
              Request Reschedule
            </Button>
          ) : null}
          <Link to={meetingDetailPath(role, meeting.id)} className="text-sm text-stone-500 hover:underline">
            View Meeting
          </Link>
        </div>
      ) : null}

      {showReschedule && !completed ? (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            reschedule.mutate({ meetingId: meeting.id, reason });
            setShowReschedule(false);
            setReason("");
          }}
        >
          <textarea
            className={`${fieldClass} h-24 py-2`}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Why does this meeting need to be rescheduled?"
            required
            minLength={8}
          />
          <Button type="submit" size="sm" disabled={reschedule.isPending}>
            Submit request
          </Button>
        </form>
      ) : null}

      {!completed && showNotesForm && meeting.actions.canAddNotes ? (
        <form
          className="space-y-6 border-t border-stone-200 pt-6 dark:border-stone-800"
          onSubmit={(event) => {
            event.preventDefault();
            saveNotes.mutate({ meetingId: meeting.id, ...notes });
          }}
        >
          <div>
            <p className="text-base font-semibold">Supervisor Meeting Notes</p>
            <p className="mt-1 text-sm text-stone-500">
              Complete each section with detailed notes. Notes become visible to the employee and HR only after the meeting is completed.
            </p>
          </div>
          {NOTE_SECTIONS.map((section) => (
            <section
              key={section.title}
              className="rounded-2xl border border-stone-200 bg-stone-50/50 p-5 dark:border-stone-800 dark:bg-stone-950/40"
            >
              <h4 className="text-sm font-semibold text-stone-900 dark:text-white">{section.title}</h4>
              <p className="mt-1 text-xs text-stone-500">{section.description}</p>
              <div className="mt-4 space-y-4">
                {section.fields.map(([key, label]) => (
                  <label key={key} className="block text-sm">
                    <span className="text-xs font-medium text-stone-600 dark:text-stone-400">{label}</span>
                    <textarea
                      className={`${fieldClass} mt-2 min-h-36 py-3 leading-relaxed`}
                      value={notes[key]}
                      onChange={(event) =>
                        setNotes((current) => ({ ...current, [key]: event.target.value }))
                      }
                      required={!OPTIONAL_NOTE_FIELDS.has(key)}
                      minLength={OPTIONAL_NOTE_FIELDS.has(key) ? 0 : 8}
                      placeholder={`Enter detailed notes for ${label.toLowerCase()}…`}
                    />
                  </label>
                ))}
              </div>
            </section>
          ))}
          <Button type="submit" disabled={saveNotes.isPending}>
            Save notes and complete meeting
          </Button>
        </form>
      ) : null}
      <p className="sr-only">{formatDateTime(meeting.createdAt)}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-stone-400">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}
