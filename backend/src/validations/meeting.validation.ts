import { z } from "zod";

export const startBatchStageSchema = z.object({
  stage: z.enum([
    "SELF_REVIEW",
    "PEER_REVIEW",
    "SUPERVISOR_REVIEW",
    "HR_EVALUATION",
    "RECOGNITION_PIP",
    "CLOSURE",
  ]),
});

export type StartBatchStageInput = z.infer<typeof startBatchStageSchema>;
