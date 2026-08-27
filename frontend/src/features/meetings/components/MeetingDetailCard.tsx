// Participant actions for a Performance Planning Meeting.
// Notes stay hidden until the meeting is completed; only the supervisor can write them.
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/features/hr/components/StatusBadge";
import { fieldClass } from "@/features/hr/components/ActionMenu";
import { formatDateTime } from "@/features/hr/utils/dates";
import type { PlanningMeeting } from "../types";
import {
  useConfirmPlanningMeeting,
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
  const reschedule = useRequestPlanningReschedule();
  const review = useReviewPlanningReschedule();
  const saveNotes = useSavePlanningNotes();
  const [reason, setReason] = useState("");
  const [showReschedule, setShowReschedule] = useState(false);
  const [notes, setNotes] = useState({
    discussionSummary: "",
    decisionsMade: "",
    previousAppraisalReviewed: "",
    previousAppraisalFindings: "",
    employeeStrengths: "",
    employeeWeaknesses: "",
    performanceObservations: "",
    agreedOutcomes: "",
  });

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
            {completed ? "Completed meeting" : "Meeting confirmation required"}
          </p>
          <h3 className="mt-1 text-lg font-semibold text-stone-900 dark:text-white">
            {meeting.title}
          </h3>
          <p className="mt-1 text-sm text-stone-500">
            {formatDateTime(meeting.scheduledAt)}
            {meeting.location ? ` · ${meeting.location}` : ""}
          </p>
        </div>
        <StatusBadge status={meeting.status} />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <p className="text-sm text-stone-600 dark:text-stone-300">
          Employee: {meeting.employee.name} — {responseLabel(meeting.employeeResponse)}
        </p>
        <p className="text-sm text-stone-600 dark:text-stone-300">
          Supervisor: {meeting.supervisor?.name ?? "—"} —{" "}
          {responseLabel(meeting.supervisorResponse)}
        </p>
      </div>

      {meeting.pendingReschedule ? (
        <div className="mt-4 rounded-xl border border-stone-200 p-3 dark:border-stone-700">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Reschedule request
          </p>
          <p className="mt-1 text-sm">{meeting.pendingReschedule.reason}</p>
          {role === "HR" && meeting.actions.canReviewReschedule ? (
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  review.mutate({ meetingId: meeting.id, decision: "APPROVED" })
                }
              >
                Approve
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() =>
                  review.mutate({ meetingId: meeting.id, decision: "REJECTED" })
                }
              >
                Decline
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {completed && meeting.notes ? (
        <div className="mt-4 space-y-3 rounded-xl border border-stone-200 p-4 dark:border-stone-800">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Supervisor meeting notes
          </p>
          <p className="text-sm text-stone-700 dark:text-stone-300">
            {meeting.notes.discussionSummary}
          </p>
          {meeting.notes.previousAppraisalFindings ? (
            <p className="text-sm text-stone-600 dark:text-stone-400">
              Previous appraisal: {meeting.notes.previousAppraisalFindings}
            </p>
          ) : null}
          {meeting.notes.employeeStrengths ? (
            <p className="text-sm">Strengths: {meeting.notes.employeeStrengths}</p>
          ) : null}
          {meeting.notes.employeeWeaknesses ? (
            <p className="text-sm">
              Areas to improve: {meeting.notes.employeeWeaknesses}
            </p>
          ) : null}
          <p className="text-sm">Decisions: {meeting.notes.decisionsMade}</p>
        </div>
      ) : null}

      {!completed ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {meeting.actions.canConfirm ? (
            <Button
              type="button"
              onClick={() => confirm.mutate(meeting.id)}
              disabled={confirm.isPending}
            >
              Confirm Meeting
            </Button>
          ) : null}
          {meeting.actions.canRequestReschedule ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowReschedule((value) => !value)}
            >
              Request Reschedule
            </Button>
          ) : null}
        </div>
      ) : null}

      {showReschedule && !completed ? (
        <form
          className="mt-3 space-y-3"
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
          className="mt-5 space-y-3 border-t border-stone-200 pt-4 dark:border-stone-800"
          onSubmit={(event) => {
            event.preventDefault();
            saveNotes.mutate({ meetingId: meeting.id, ...notes });
          }}
        >
          <p className="text-sm font-medium">Complete meeting with notes</p>
          <p className="text-xs text-stone-500">
            Include previous performance, strengths, and improvement areas. Notes
            become visible only after the meeting is completed.
          </p>
          {(
            [
              ["discussionSummary", "Discussion summary"],
              ["previousAppraisalFindings", "Previous appraisal findings"],
              ["employeeStrengths", "Strengths"],
              ["employeeWeaknesses", "Weaknesses / improvement areas"],
              ["decisionsMade", "Decisions made"],
              ["agreedOutcomes", "Agreed outcomes"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block text-sm">
              <span className="text-xs text-stone-500">{label}</span>
              <textarea
                className={`${fieldClass} mt-1 h-20 py-2`}
                value={notes[key]}
                onChange={(event) =>
                  setNotes((current) => ({ ...current, [key]: event.target.value }))
                }
                required={key === "discussionSummary" || key === "decisionsMade"}
              />
            </label>
          ))}
          <Button type="submit" disabled={saveNotes.isPending}>
            Save notes and complete meeting
          </Button>
        </form>
      ) : null}
    </div>
  );
}
