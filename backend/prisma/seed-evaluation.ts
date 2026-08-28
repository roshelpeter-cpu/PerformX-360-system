/**
 * Seeds connected 360° evaluation, recognition, and PIP data for the ACTIVE cycle.
 * Does not modify PDP, meeting, or historical appraisal-history rows.
 */
import "dotenv/config";
import {
  AwardType,
  EvaluationStatus,
  PeerReviewStatus,
  PipStatus,
  PromotionStatus,
  ReviewRequestStatus,
  type PrismaClient,
} from "../generated/prisma/client.js";

const DEMO_CODES = ["EMP000001", "EMP000901", "EMP000902", "EMP000903", "EMP000904"] as const;

function band(score: number) {
  if (score >= 90) return "Outstanding";
  if (score >= 80) return "Exceeds Expectations";
  if (score >= 70) return "Meets Expectations";
  if (score >= 60) return "Needs Improvement";
  return "PIP Required";
}

function bonus(bandName: string) {
  if (bandName === "Outstanding") return 150000;
  if (bandName === "Exceeds Expectations") return 80000;
  if (bandName === "Meets Expectations") return 30000;
  return 0;
}

function finalOf(self: number, peer: number, supervisor: number) {
  const score = Number((self * 0.2 + peer * 0.2 + supervisor * 0.6).toFixed(2));
  const performanceBand = band(score);
  const amount = bonus(performanceBand);
  return { finalScore: score, performanceBand, bonusEligible: amount > 0, bonusAmount: amount };
}

export async function seedEvaluationWorkflow(prisma: PrismaClient) {
  const cycle = await prisma.appraisalCycle.findFirst({ where: { status: "ACTIVE" } });
  if (!cycle) {
    console.log("No active cycle; skipping evaluation seed.");
    return;
  }
  const hr = await prisma.employee.findUnique({ where: { employeeId: "HR000001" } });
  const sarah = await prisma.employee.findUnique({ where: { employeeId: "SUP000001" } });
  if (!hr || !sarah) return;

  const assignments = await prisma.employeeBatchAssignment.findMany({
    where: { cycleId: cycle.id, employee: { role: "EMPLOYEE" } },
    select: { employeeId: true, batchId: true },
  });
  const supervisors = await prisma.employeeSupervisorAssignment.findMany({
    where: { cycleId: cycle.id },
    select: { employeeId: true, supervisorId: true },
  });
  const supervisorByEmployee = new Map(supervisors.map((row) => [row.employeeId, row.supervisorId]));

  await prisma.performanceEvaluation.createMany({
    data: assignments.map((row) => ({
      employeeId: row.employeeId,
      cycleId: cycle.id,
      batchId: row.batchId,
      supervisorId: supervisorByEmployee.get(row.employeeId) ?? sarah.id,
    })),
    skipDuplicates: true,
  });

  const employees = await prisma.employee.findMany({
    where: { employeeId: { in: [...DEMO_CODES] } },
  });
  const byCode = new Map(employees.map((row) => [row.employeeId, row]));
  const alex = byCode.get("EMP000001");
  const nethmi = byCode.get("EMP000901");
  const kevin = byCode.get("EMP000902");
  const amaya = byCode.get("EMP000903");
  const ryan = byCode.get("EMP000904");
  if (!alex || !nethmi || !kevin || !amaya || !ryan) {
    console.log("Demo employees missing; evaluation scenarios skipped.");
    return;
  }

  const sarahTeam = (
    await prisma.employeeSupervisorAssignment.findMany({
      where: {
        cycleId: cycle.id,
        supervisorId: sarah.id,
        employeeId: { notIn: [alex.id, nethmi.id, kevin.id, amaya.id, ryan.id] },
      },
      select: { employeeId: true },
      take: 12,
    })
  ).map((row) => row.employeeId);
  const more = (
    await prisma.performanceEvaluation.findMany({
      where: {
        cycleId: cycle.id,
        employeeId: { notIn: [alex.id, nethmi.id, kevin.id, amaya.id, ryan.id, ...sarahTeam] },
        employee: { role: "EMPLOYEE" },
      },
      select: { employeeId: true },
      take: 12,
    })
  ).map((row) => row.employeeId);
  const extras = [...sarahTeam, ...more].slice(0, 12);

  async function evalRow(employeeId: string) {
    return prisma.performanceEvaluation.findUniqueOrThrow({
      where: { cycleId_employeeId: { cycleId: cycle.id, employeeId } },
    });
  }

  async function setPeers(
    evaluationId: string,
    items: Array<{ reviewerId: string; submitted?: boolean; score?: number; comments?: string }>
  ) {
    await prisma.peerReviewAssignment.deleteMany({ where: { evaluationId } });
    for (const item of items) {
      await prisma.peerReviewAssignment.create({
        data: {
          evaluationId,
          reviewerId: item.reviewerId,
          status: item.submitted ? PeerReviewStatus.SUBMITTED : PeerReviewStatus.PENDING,
          score: item.submitted ? item.score ?? 80 : null,
          comments: item.submitted ? item.comments ?? "Consistent delivery and helpful collaboration." : null,
          submittedAt: item.submitted ? new Date() : null,
        },
      });
    }
  }

  async function approve(
    employeeId: string,
    scores: { self: number; peer: number; supervisor: number },
    extra: {
      comments: string;
      strengths: string;
      improvement: string;
      development: string;
      promotion?: PromotionStatus;
      award?: AwardType;
      awardConfirmed?: boolean;
    }
  ) {
    const totals = finalOf(scores.self, scores.peer, scores.supervisor);
    const evaluation = await evalRow(employeeId);
    await prisma.performanceEvaluation.update({
      where: { id: evaluation.id },
      data: {
        status: EvaluationStatus.APPROVED,
        selfOpenedAt: new Date("2026-07-01"),
        selfScore: scores.self,
        selfComments: extra.comments,
        selfSubmittedAt: new Date("2026-07-08"),
        peerScore: scores.peer,
        peerSummary: "Peer 1: Reliable teammate with clear ownership.",
        supervisorScore: scores.supervisor,
        supervisorComments: extra.comments,
        strengths: extra.strengths,
        improvementAreas: extra.improvement,
        developmentRecommendations: extra.development,
        promotionRecommended: extra.promotion === PromotionStatus.RECOMMENDED || extra.promotion === PromotionStatus.SHORTLISTED || extra.promotion === PromotionStatus.APPROVED,
        promotionStatus: extra.promotion ?? PromotionStatus.NONE,
        supervisorSubmittedAt: new Date("2026-07-18"),
        hrComments: "Reviewed and approved against the 20/20/60 evaluation model.",
        hrApprovedAt: new Date("2026-07-22T10:30:00"),
        hrApprovedById: hr.id,
        finalScore: totals.finalScore,
        performanceBand: totals.performanceBand,
        bonusEligible: totals.bonusEligible,
        bonusAmount: totals.bonusAmount,
        awardType: extra.award,
        awardConfirmed: Boolean(extra.awardConfirmed),
      },
    });
    await prisma.appraisalOutcome.upsert({
      where: { cycleId_employeeId: { cycleId: cycle.id, employeeId } },
      create: {
        employeeId,
        cycleId: cycle.id,
        batchId: evaluation.batchId,
        evaluationId: evaluation.id,
        overallResult: totals.performanceBand,
        ratingBand: totals.performanceBand,
        overallScore: totals.finalScore,
        supervisorComments: extra.comments,
        developmentRecommendations: extra.development,
        areasForImprovement: extra.improvement,
        resultsIssuedAt: new Date("2026-07-22T10:30:00"),
        awardReceived: Boolean(extra.awardConfirmed),
        awardTitle: extra.award ?? undefined,
        pipRequired: totals.performanceBand === "PIP Required",
        pipStatus: totals.performanceBand === "PIP Required" ? PipStatus.REQUIRED : PipStatus.NONE,
        bonusAwarded: totals.bonusEligible,
        bonusAmount: totals.bonusAmount,
        promotionRecommended: extra.promotion !== undefined && extra.promotion !== PromotionStatus.NONE,
        promotionStatus: extra.promotion ?? PromotionStatus.NONE,
        selfScore: scores.self,
        peerScore: scores.peer,
        supervisorScore: scores.supervisor,
        hrComments: "Reviewed and approved against the 20/20/60 evaluation model.",
      },
      update: {
        evaluationId: evaluation.id,
        overallResult: totals.performanceBand,
        ratingBand: totals.performanceBand,
        overallScore: totals.finalScore,
        resultsIssuedAt: new Date("2026-07-22T10:30:00"),
        bonusAwarded: totals.bonusEligible,
        bonusAmount: totals.bonusAmount,
        pipRequired: totals.performanceBand === "PIP Required",
        promotionStatus: extra.promotion ?? PromotionStatus.NONE,
        selfScore: scores.self,
        peerScore: scores.peer,
        supervisorScore: scores.supervisor,
      },
    });
    return { evaluation, totals };
  }

  const alexEval = await evalRow(alex.id);
  await prisma.performanceEvaluation.update({
    where: { id: alexEval.id },
    data: { status: EvaluationStatus.NOT_STARTED },
  });

  const nethmiEval = await evalRow(nethmi.id);
  await prisma.performanceEvaluation.update({
    where: { id: nethmiEval.id },
    data: {
      status: EvaluationStatus.SELF_REVIEW_PENDING,
      selfOpenedAt: new Date("2026-08-20"),
    },
  });

  const kevinEval = await evalRow(kevin.id);
  await prisma.performanceEvaluation.update({
    where: { id: kevinEval.id },
    data: {
      status: EvaluationStatus.PEER_REVIEW_PENDING,
      selfOpenedAt: new Date("2026-08-10"),
      selfScore: 78,
      selfComments: "I delivered the assigned PDP goals and kept evidence current.",
      selfSubmittedAt: new Date("2026-08-14"),
    },
  });
  await setPeers(kevinEval.id, [
    { reviewerId: amaya.id, submitted: true, score: 81, comments: "Kevin communicates clearly and follows through." },
    { reviewerId: nethmi.id, submitted: false },
  ]);
  await prisma.performanceEvaluation.update({
    where: { id: kevinEval.id },
    data: { peerScore: 81, peerSummary: "Peer 1: Kevin communicates clearly and follows through." },
  });

  const amayaEval = await evalRow(amaya.id);
  await prisma.performanceEvaluation.update({
    where: { id: amayaEval.id },
    data: {
      status: EvaluationStatus.SUPERVISOR_REVIEW_PENDING,
      selfOpenedAt: new Date("2026-08-01"),
      selfScore: 88,
      selfComments: "Progress on assigned PDP goals stayed on track with supporting evidence.",
      selfSubmittedAt: new Date("2026-08-05"),
      peerScore: 86,
      peerSummary: "Peer 1: Strong ownership.\nPeer 2: Collaborative and dependable.",
    },
  });
  await setPeers(amayaEval.id, [
    { reviewerId: kevin.id, submitted: true, score: 87, comments: "Strong ownership of delivery." },
    { reviewerId: nethmi.id, submitted: true, score: 85, comments: "Collaborative and dependable." },
  ]);

  const ryanResult = await approve(ryan.id, { self: 52, peer: 48, supervisor: 45 }, {
    comments: "Delivery slipped against PDP targets and quality follow-through needs a structured plan.",
    strengths: "Willing to learn and remains engaged with the team.",
    improvement: "Prioritization, evidence quality, and meeting committed dates.",
    development: "Weekly coaching, smaller milestones, and documented progress reviews.",
  });
  await prisma.pipPlan.upsert({
    where: { evaluationId: ryanResult.evaluation.id },
    create: {
      evaluationId: ryanResult.evaluation.id,
      employeeId: ryan.id,
      supervisorId: sarah.id,
      cycleId: cycle.id,
      status: PipStatus.REQUIRED,
      summary: "Focus on delivery reliability and evidence of completed work.",
    },
    update: { status: PipStatus.REQUIRED },
  });

  if (extras[0]) {
    const waiting = await evalRow(extras[0]);
    await prisma.performanceEvaluation.update({
      where: { id: waiting.id },
      data: {
        status: EvaluationStatus.WAITING_HR_REVIEW,
        selfOpenedAt: new Date("2026-07-12"),
        selfScore: 84,
        selfComments: "Self-review submitted with evidence against each PDP goal.",
        selfSubmittedAt: new Date("2026-07-16"),
        peerScore: 82,
        peerSummary: "Peer 1: Consistently helpful in reviews.",
        supervisorScore: 86,
        supervisorComments: "Ready for HR review. Recommend recognition for consistent delivery.",
        strengths: "Reliable delivery and mentoring.",
        improvementAreas: "Broaden stakeholder communication.",
        developmentRecommendations: "Lead one cross-team initiative next cycle.",
        promotionRecommended: true,
        promotionStatus: PromotionStatus.RECOMMENDED,
        supervisorSubmittedAt: new Date("2026-07-21"),
      },
    });
    await setPeers(waiting.id, [
      { reviewerId: amaya.id, submitted: true, score: 82, comments: "Consistently helpful in reviews." },
    ]);
  }

  const outstanding = extras[1];
  if (outstanding) {
    await approve(outstanding, { self: 94, peer: 92, supervisor: 96 }, {
      comments: "Exceptional delivery against PDP goals with high-quality evidence.",
      strengths: "Leadership, quality, and mentoring.",
      improvement: "Protect capacity during peak delivery.",
      development: "Stretch assignment on a strategic initiative.",
      promotion: PromotionStatus.SHORTLISTED,
      award: AwardType.EMPLOYEE_OF_THE_CYCLE,
      awardConfirmed: true,
    });
  }

  const exceeds = extras[2];
  if (exceeds) {
    await approve(exceeds, { self: 82, peer: 80, supervisor: 85 }, {
      comments: "Exceeded several PDP targets and supported peers well.",
      strengths: "Quality of execution.",
      improvement: "More proactive risk reporting.",
      development: "Presentation skills for leadership reviews.",
      promotion: PromotionStatus.UNDER_REVIEW,
      award: AwardType.EXCELLENCE,
      awardConfirmed: false,
    });
  }

  const meets = extras[3];
  if (meets) {
    await approve(meets, { self: 74, peer: 72, supervisor: 78 }, {
      comments: "Met the agreed PDP outcomes for this cycle.",
      strengths: "Steady progress and documentation.",
      improvement: "Increase initiative beyond assigned goals.",
      development: "Take ownership of one improvement theme.",
    });
  }

  const needs = extras[4];
  if (needs) {
    await approve(needs, { self: 64, peer: 62, supervisor: 66 }, {
      comments: "Some PDP goals lagged; improvement is required next cycle.",
      strengths: "Domain knowledge remains solid.",
      improvement: "Time management and evidence discipline.",
      development: "Bi-weekly progress checkpoints.",
      promotion: PromotionStatus.NOT_SELECTED,
    });
  }

  async function pipFor(employeeId: string, status: PipStatus, assigned = false) {
    const totals = finalOf(50, 47, 44);
    const evaluation = await evalRow(employeeId);
    await prisma.performanceEvaluation.update({
      where: { id: evaluation.id },
      data: {
        status: EvaluationStatus.APPROVED,
        selfScore: 50,
        peerScore: 47,
        supervisorScore: 44,
        selfComments: "I struggled to keep PDP progress current.",
        supervisorComments: "Structured improvement is required.",
        strengths: "Open to feedback.",
        improvementAreas: "Planning and follow-through.",
        developmentRecommendations: "PIP with weekly reviews.",
        selfSubmittedAt: new Date("2026-07-08"),
        supervisorSubmittedAt: new Date("2026-07-18"),
        hrApprovedAt: new Date("2026-07-22"),
        hrApprovedById: hr.id,
        finalScore: totals.finalScore,
        performanceBand: totals.performanceBand,
        bonusEligible: false,
        bonusAmount: 0,
      },
    });
    const pip = await prisma.pipPlan.upsert({
      where: { evaluationId: evaluation.id },
      create: {
        evaluationId: evaluation.id,
        employeeId,
        supervisorId: evaluation.supervisorId ?? sarah.id,
        cycleId: cycle.id,
        status,
        summary: "Improve delivery reliability and evidence quality.",
        reviewPeriod: "60 days",
        startDate: new Date("2026-08-01"),
        endDate: new Date("2026-09-30"),
        assignedAt: assigned ? new Date("2026-08-02") : null,
      },
      update: { status, assignedAt: assigned ? new Date("2026-08-02") : null },
    });
    await prisma.pipGoal.deleteMany({ where: { pipId: pip.id } });
    await prisma.pipGoal.createMany({
      data: [
        {
          pipId: pip.id,
          title: "Restore on-time delivery",
          requiredActions: "Break work into weekly milestones and report every Friday.",
          expectedOutcomes: "At least 90% of committed items completed on time.",
          sortOrder: 0,
        },
        {
          pipId: pip.id,
          title: "Evidence discipline",
          requiredActions: "Attach evidence for every completed PDP/PIP action.",
          expectedOutcomes: "No completed item without supporting evidence.",
          sortOrder: 1,
        },
      ],
    });
  }

  if (extras[5]) await pipFor(extras[5], PipStatus.DISCUSSION_PENDING);
  if (extras[6]) await pipFor(extras[6], PipStatus.ACTIVE, true);
  if (extras[7]) await pipFor(extras[7], PipStatus.COMPLETED, true);
  if (extras[8]) await pipFor(extras[8], PipStatus.FAILED, true);

  const outstandingEval = outstanding ? await evalRow(outstanding) : null;
  if (outstandingEval) {
    await prisma.appraisalReviewRequest.deleteMany({ where: { evaluationId: outstandingEval.id } });
    await prisma.appraisalReviewRequest.create({
      data: {
        evaluationId: outstandingEval.id,
        employeeId: outstanding!,
        cycleId: cycle.id,
        reason: "Please confirm how the Employee of the Cycle award will be communicated.",
        comments: "I want to understand the recognition timeline.",
        status: ReviewRequestStatus.PENDING,
      },
    });
  }

  const completedCycle = await prisma.appraisalCycle.findFirst({
    where: { status: "COMPLETED" },
    orderBy: { endDate: "desc" },
  });
  if (completedCycle) {
    const historicalPeople = [amaya, kevin, nethmi].slice(0, 3);
    for (const [index, person] of historicalPeople.entries()) {
      const scores = [
        { self: 90, peer: 88, supervisor: 92 },
        { self: 76, peer: 74, supervisor: 78 },
        { self: 68, peer: 65, supervisor: 70 },
      ][index]!;
      const totals = finalOf(scores.self, scores.peer, scores.supervisor);
      await prisma.performanceEvaluation.upsert({
        where: { cycleId_employeeId: { cycleId: completedCycle.id, employeeId: person.id } },
        update: {
          status: EvaluationStatus.APPROVED,
          selfScore: scores.self,
          peerScore: scores.peer,
          supervisorScore: scores.supervisor,
          finalScore: totals.finalScore,
          performanceBand: totals.performanceBand,
          bonusEligible: totals.bonusEligible,
          bonusAmount: totals.bonusAmount,
          hrApprovedAt: completedCycle.endDate,
          hrApprovedById: hr.id,
        },
        create: {
          employeeId: person.id,
          supervisorId: sarah.id,
          cycleId: completedCycle.id,
          status: EvaluationStatus.APPROVED,
          selfScore: scores.self,
          peerScore: scores.peer,
          supervisorScore: scores.supervisor,
          finalScore: totals.finalScore,
          performanceBand: totals.performanceBand,
          bonusEligible: totals.bonusEligible,
          bonusAmount: totals.bonusAmount,
          hrApprovedAt: completedCycle.endDate,
          hrApprovedById: hr.id,
        },
      });
    }
  }

  console.log("Evaluation, recognition, and PIP demonstration data seeded.");
}

if (process.argv[1]?.includes("seed-evaluation")) {
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { PrismaClient } = await import("../generated/prisma/client.js");
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });
  seedEvaluationWorkflow(prisma)
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
