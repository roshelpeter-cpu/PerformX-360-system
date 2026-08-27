// Appraisal Cycle detailed timeline
// Displays per-batch workflow stages for the selected appraisal cycle.
import { BatchTimelineSlider } from "@/features/hr/components/BatchTimelineSlider";
import type { AppraisalCycle } from "@/features/hr/types";

export function DetailedTimelineTab({ cycle }: { cycle: AppraisalCycle }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">
          Batch timelines
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          Each batch has its own independent workflow. Use the arrows to move between Batch 1, 2 and 3.
        </p>
      </div>
      <BatchTimelineSlider cycle={cycle} />
    </div>
  );
}
