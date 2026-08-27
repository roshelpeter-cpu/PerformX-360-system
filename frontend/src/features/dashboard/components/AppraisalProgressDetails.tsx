import { formatDate } from "@/features/hr/utils/dates";
import type { EmployeeAppraisalProgress } from "@/features/dashboard/services/dashboard.api";
import { cn } from "@/lib/utils";

function StatusLine({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "current" | "warn";
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <p className="text-sm text-stone-500">{label}</p>
      <p
        className={cn(
          "max-w-[60%] text-right text-sm font-medium",
          tone === "current" && "text-amber-800 dark:text-amber-200",
          tone === "warn" && "text-red-700 dark:text-red-300",
          tone === "default" && "text-stone-900 dark:text-stone-100"
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function AppraisalProgressDetails({
  progress,
}: {
  progress: EmployeeAppraisalProgress;
}) {
  const pdp = progress.pdp;
  const outcome = progress.outcome;
  const meetingDone = progress.planningMeetingCompleted;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
        <h3 className="text-sm font-semibold text-stone-900 dark:text-white">
          Current appraisal
        </h3>
        <div className="mt-2 divide-y divide-stone-100 dark:divide-stone-800">
          <StatusLine
            label="Cycle"
            value={progress.cycle?.name ?? "Not assigned"}
          />
          <StatusLine
            label="Batch"
            value={
              progress.batch
                ? `${progress.batch.name} (Batch ${progress.batch.batchNumber})`
                : "Not assigned"
            }
          />
          <StatusLine
            label="Current stage"
            value={progress.currentStageLabel}
            tone="current"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
        <h3 className="text-sm font-semibold text-stone-900 dark:text-white">PDP</h3>
        <div className="mt-2 divide-y divide-stone-100 dark:divide-stone-800">
          <StatusLine
            label="Planning meeting"
            value={meetingDone ? "Completed" : "Not completed"}
            tone={meetingDone ? "default" : "current"}
          />
          {meetingDone ? (
            <>
              <StatusLine
                label="PDP created"
                value={pdp?.created ? "Yes" : "No"}
              />
              <StatusLine
                label="Sent to employee"
                value={pdp?.sentToEmployee ? "Yes" : "No"}
              />
              <StatusLine
                label="Approval"
                value={
                  pdp?.approved
                    ? "Approved"
                    : pdp?.approvalPending
                      ? "Pending employee approval"
                      : pdp
                        ? pdp.status.replaceAll("_", " ")
                        : "Not started"
                }
                tone={pdp?.approvalPending ? "current" : "default"}
              />
            </>
          ) : (
            <p className="py-2 text-sm text-stone-500">
              Later appraisal details appear after the performance planning
              meeting is completed.
            </p>
          )}
        </div>
      </section>

      {meetingDone ? (
        <>
      <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
        <h3 className="text-sm font-semibold text-stone-900 dark:text-white">
          Meetings & reviews
        </h3>
        <div className="mt-2 divide-y divide-stone-100 dark:divide-stone-800">
          <StatusLine
            label="Follow-up meetings completed"
            value={String(progress.followUpMeetingsCompleted)}
          />
          <StatusLine
            label="Self review"
            value={progress.reviews.selfReview.replaceAll("_", " ")}
            tone={progress.reviews.selfReview === "active" ? "current" : "default"}
          />
          <StatusLine
            label="Peer review"
            value={progress.reviews.peerReview.replaceAll("_", " ")}
          />
          <StatusLine
            label="Supervisor review"
            value={progress.reviews.supervisorReview.replaceAll("_", " ")}
          />
        </div>
      </section>

      {outcome ? (
        <section className="rounded-2xl border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
          <h3 className="text-sm font-semibold text-stone-900 dark:text-white">
            Results
          </h3>
          <div className="mt-2 divide-y divide-stone-100 dark:divide-stone-800">
            <StatusLine label="Final result" value={outcome.overallResult} />
            <StatusLine
              label="Score"
              value={
                outcome.overallScore != null
                  ? String(outcome.overallScore)
                  : "—"
              }
            />
            <StatusLine
              label="Results issued"
              value={
                outcome.resultsIssued
                  ? outcome.resultsIssuedAt
                    ? formatDate(outcome.resultsIssuedAt)
                    : "Yes"
                  : "Not yet"
              }
            />
            {outcome.awardReceived ? (
              <>
                <StatusLine label="Award" value={outcome.awardTitle ?? "Award received"} />
                {outcome.awardDescription ? (
                  <p className="pt-2 text-sm text-stone-600 dark:text-stone-300">
                    {outcome.awardDescription}
                  </p>
                ) : null}
              </>
            ) : (
              <StatusLine label="Award" value="None" />
            )}
            <StatusLine
              label="PIP"
              value={
                outcome.pipRequired
                  ? outcome.pipStatus.replaceAll("_", " ")
                  : "Not required"
              }
              tone={outcome.pipRequired ? "warn" : "default"}
            />
            {outcome.pipSummary ? (
              <p className="pt-2 text-sm text-stone-600 dark:text-stone-300">
                {outcome.pipSummary}
              </p>
            ) : null}
            <StatusLine
              label="Bonus"
              value={
                outcome.bonusAwarded
                  ? outcome.bonusAmount
                    ? `Rs. ${outcome.bonusAmount.toLocaleString()}`
                    : "Awarded"
                  : "None"
              }
            />
            <StatusLine
              label="Promotion"
              value={
                outcome.promotionRecommended
                  ? outcome.promotionTitle ?? "Recommended"
                  : "None"
              }
            />
          </div>
        </section>
      ) : null}
        </>
      ) : null}
    </div>
  );
}
