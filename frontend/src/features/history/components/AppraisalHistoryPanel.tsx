// Previous completed-cycle records for an employee (own history or a current team member).
import { useEffect, useState } from "react";
import { formatDate, formatDateTime } from "@/features/hr/utils/dates";
import { StatusBadge } from "@/features/hr/components/StatusBadge";
import { useHistoryCycle, useHistoryCycles } from "../hooks/useHistory";

function LabelValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-stone-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-stone-900 dark:text-stone-100">
        {value}
      </p>
    </div>
  );
}

export function AppraisalHistoryPanel({
  employeeId,
  enabled = true,
}: {
  employeeId?: string;
  enabled?: boolean;
}) {
  const cyclesQuery = useHistoryCycles(employeeId, enabled);
  const cycles = cyclesQuery.data?.cycles ?? [];
  const [cycleId, setCycleId] = useState("");
  const detailQuery = useHistoryCycle(cycleId || undefined, employeeId);
  const detail = detailQuery.data;

  useEffect(() => {
    if (!cycleId && cycles[0]) setCycleId(cycles[0].id);
  }, [cycleId, cycles]);

  if (!enabled) return null;

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-stone-900 dark:text-white">
            Appraisal history
          </h3>
          <p className="mt-1 text-sm text-stone-500">
            Previous completed cycles for this employee.
          </p>
        </div>
        {cycles.length > 0 ? (
          <select
            className="h-10 rounded-lg border border-stone-300 bg-white px-3 text-sm dark:border-stone-700 dark:bg-stone-950"
            value={cycleId}
            onChange={(event) => setCycleId(event.target.value)}
            aria-label="Historical appraisal cycle"
          >
            {cycles.map((cycle) => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {cyclesQuery.isLoading ? (
        <p className="mt-4 text-sm text-stone-500">Loading history…</p>
      ) : cycles.length === 0 ? (
        <p className="mt-4 text-sm text-stone-500">
          No previous appraisal cycles are stored for this employee yet.
        </p>
      ) : detailQuery.isLoading ? (
        <p className="mt-4 text-sm text-stone-500">Loading cycle records…</p>
      ) : detail ? (
        <div className="mt-5 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <LabelValue label="Cycle" value={detail.cycle.name} />
            <LabelValue
              label="Period"
              value={`${formatDate(detail.cycle.startDate)} — ${formatDate(detail.cycle.endDate)}`}
            />
            <LabelValue
              label="Result"
              value={detail.progress.outcome?.overallResult ?? "—"}
            />
            <LabelValue
              label="Band / score"
              value={
                detail.progress.outcome
                  ? `${detail.progress.outcome.ratingBand ?? "—"} · ${
                      detail.progress.outcome.overallScore ?? "—"
                    }`
                  : "—"
              }
            />
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              PDP
            </h4>
            {detail.pdp ? (
              <div className="mt-2 space-y-2">
                <p className="text-sm text-stone-700 dark:text-stone-300">
                  Status: {detail.pdp.status.replaceAll("_", " ")}
                  {detail.pdp.approvedAt
                    ? ` · Approved ${formatDate(detail.pdp.approvedAt)}`
                    : ""}
                </p>
                {detail.pdp.goals.map((goal) => (
                  <div
                    key={goal.id}
                    className="rounded-xl border border-stone-200 px-3 py-2 dark:border-stone-800"
                  >
                    <p className="text-sm font-medium">{goal.title}</p>
                    <p className="text-xs text-stone-500">
                      {goal.progress}% · {goal.status.replaceAll("_", " ")}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-stone-500">No PDP stored for this cycle.</p>
            )}
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              Meetings
            </h4>
            <div className="mt-2 space-y-2">
              {detail.meetings.map((meeting) => (
                <div
                  key={meeting.id}
                  className="rounded-xl border border-stone-200 px-3 py-2 dark:border-stone-800"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{meeting.title}</p>
                    <StatusBadge status={meeting.status} />
                  </div>
                  <p className="text-xs text-stone-500">
                    {formatDateTime(meeting.scheduledAt)}
                    {meeting.supervisor ? ` · ${meeting.supervisor.name}` : ""}
                  </p>
                  {meeting.notes ? (
                    <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
                      {meeting.notes.discussionSummary}
                    </p>
                  ) : null}
                </div>
              ))}
              {detail.meetings.length === 0 ? (
                <p className="text-sm text-stone-500">No meetings stored.</p>
              ) : null}
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-stone-400">
              Reviews
            </h4>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {detail.reviews.map((review) => (
                <div
                  key={review.id}
                  className="rounded-xl border border-stone-200 px-3 py-2 dark:border-stone-800"
                >
                  <p className="text-xs uppercase tracking-wide text-stone-400">
                    {review.kind.replaceAll("_", " ")}
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    Score {review.score ?? "—"}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    {review.comments ?? formatDate(review.completedAt)}
                  </p>
                </div>
              ))}
              {detail.reviews.length === 0 ? (
                <p className="text-sm text-stone-500">No reviews stored.</p>
              ) : null}
            </div>
          </div>

          {detail.progress.outcome ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <LabelValue
                label="Award"
                value={
                  detail.progress.outcome.awardReceived
                    ? detail.progress.outcome.awardTitle ?? "Award received"
                    : "None"
                }
              />
              <LabelValue
                label="Bonus"
                value={
                  detail.progress.outcome.bonusAwarded
                    ? detail.progress.outcome.bonusAmount
                      ? `Rs. ${detail.progress.outcome.bonusAmount.toLocaleString()}`
                      : "Awarded"
                    : "None"
                }
              />
              <LabelValue
                label="Promotion"
                value={
                  detail.progress.outcome.promotionRecommended
                    ? detail.progress.outcome.promotionTitle ?? "Recommended"
                    : "None"
                }
              />
              <LabelValue
                label="PIP"
                value={
                  detail.progress.outcome.pipRequired
                    ? detail.progress.outcome.pipStatus.replaceAll("_", " ")
                    : "Not required"
                }
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
