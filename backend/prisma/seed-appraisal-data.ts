/**
 * Appraisal cycle demo data: historical years, staggered 2026 batches,
 * assignment history, mid-cycle joiners, and five employee scenarios.
 *
 * Kept separate from the workforce generator so seed.ts stays readable.
 */
import {
  BatchWorkflowStage,
  MeetingStatus,
  MeetingType,
  PdpStatus,
  PipStatus,
  type PrismaClient,
} from "../generated/prisma/client.js";

type SeedClient = PrismaClient;

function utcDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day));
}

const DEMO_EMPLOYEE_IDS = [
  "EMP000001",
  "EMP000901",
  "EMP000902",
  "EMP000903",
  "EMP000904",
] as const;

async function seedHistoricalOutcomes(
  prisma: SeedClient,
  cycle: { id: string; batches: Array<{ id: string; batchNumber: number }> },
  employees: Array<{ id: string; employeeId: string }>,
  year: number
) {
  const sample = employees.filter((_, index) => index % 17 === year % 7).slice(0, 40);
  if (sample.length === 0) return;

  await prisma.appraisalOutcome.createMany({
    data: sample.map((employee, index) => {
      const pip = index % 11 === 0;
      const award = !pip && index % 8 === 0;
      const score = pip ? 2.4 + (index % 3) * 0.1 : 3.6 + (index % 5) * 0.2;
      return {
        employeeId: employee.id,
        cycleId: cycle.id,
        batchId: cycle.batches[index % cycle.batches.length]?.id,
        overallResult: pip ? "Needs Improvement" : award ? "Outstanding" : "Meets Expectations",
        ratingBand: pip ? "NI" : award ? "O" : "ME",
        overallScore: Number(score.toFixed(1)),
        resultsIssuedAt: utcDate(year + 1, 2, 20),
        awardReceived: award,
        awardTitle: award ? `${year} Excellence Award` : null,
        awardDescription: award
          ? "Recognised for consistent delivery and collaboration."
          : null,
        pipRequired: pip,
        pipStatus: pip ? PipStatus.COMPLETED : PipStatus.NONE,
        pipSummary: pip
          ? "Performance improvement plan completed during the following cycle."
          : null,
      };
    }),
    skipDuplicates: true,
  });
}

async function seedAssignmentHistoryForCycle(
  prisma: SeedClient,
  options: {
    cycleId: string;
    hrUserId: string;
    employees: Array<{ id: string; departmentId: string | null }>;
    batches: Array<{ id: string; batchNumber: number }>;
    supervisors: Array<{ id: string; departmentId: string | null }>;
    year: number;
  }
) {
  const { cycleId, hrUserId, employees, batches, supervisors, year } = options;
  const batch1 = batches[0];
  const batch2 = batches[1];
  const batch3 = batches[2];
  if (!batch1 || !batch2) return;

  const historyEmployees = employees.slice(8, 20);
  for (const [index, employee] of historyEmployees.entries()) {
    const isBatchChange = index % 2 === 0;
    if (isBatchChange) {
      await prisma.batchAssignmentHistory.create({
        data: {
          cycleId,
          employeeId: employee.id,
          previousBatchId: index % 4 === 0 ? batch1.id : null,
          newBatchId: index % 3 === 0 ? batch2.id : batch1.id,
          reason:
            index % 4 === 0
              ? "Batch window overlap after approved leave"
              : index % 3 === 0
                ? "Joined after Batch 1 planning closed"
                : "Initial batch assignment",
          changedById: hrUserId,
          effectiveDate: utcDate(year, 3 + (index % 6), 8 + index),
          changedAt: utcDate(year, 3 + (index % 6), 8 + index),
        },
      });
    } else {
      const deptSupervisors = supervisors.filter(
        (item) => item.departmentId === employee.departmentId
      );
      if (deptSupervisors.length < 2) continue;
      await prisma.supervisorAssignmentHistory.create({
        data: {
          cycleId,
          employeeId: employee.id,
          previousSupervisorId: index % 5 === 0 ? null : deptSupervisors[0]!.id,
          newSupervisorId: deptSupervisors[1]!.id,
          reason:
            index % 5 === 0
              ? "Supervisor assigned after mid-cycle joining"
              : "Reporting line change within the department",
          changedById: hrUserId,
          effectiveDate: utcDate(year, 4 + (index % 5), 12),
          changedAt: utcDate(year, 4 + (index % 5), 12),
        },
      });
    }
  }

  if (batch3 && employees[22]) {
    await prisma.batchAssignmentHistory.create({
      data: {
        cycleId,
        employeeId: employees[22].id,
        previousBatchId: batch2.id,
        newBatchId: batch3.id,
        reason: "Moved to later batch after extended leave",
        changedById: hrUserId,
        effectiveDate: utcDate(year, 7, 1),
        changedAt: utcDate(year, 7, 1),
      },
    });
  }
}

export async function applyCompletedBatchProgress(
  prisma: SeedClient,
  batches: Array<{ id: string }>,
  year: number
) {
  for (const [index, batch] of batches.entries()) {
    await prisma.appraisalBatch.update({
      where: { id: batch.id },
      data: {
        status: "FINISHED",
        currentStage: BatchWorkflowStage.CLOSURE,
        pdpStartDate: utcDate(year, 3 + index * 2, 15),
        pdpEndDate: utcDate(year, 4 + index * 2, 15),
        selfReviewStartedAt: utcDate(year, 11, 1 + index),
        peerReviewStartedAt: utcDate(year, 11, 15 + index),
        supervisorReviewStartedAt: utcDate(year, 12, 1 + index),
        hrEvaluationStartedAt: utcDate(year + 1, 1, 8 + index),
        recognitionStartedAt: utcDate(year + 1, 2, 1 + index),
        closedAt: utcDate(year + 1, 2, 20 + index),
      },
    });
  }
}

export async function applyCurrentCycleBatchProgress(
  prisma: SeedClient,
  batches: Array<{ id: string; batchNumber: number }>
) {
  const batch1 = batches.find((item) => item.batchNumber === 1);
  const batch2 = batches.find((item) => item.batchNumber === 2);
  const batch3 = batches.find((item) => item.batchNumber === 3);

  // Batch 1 started in March — furthest ahead (peer/supervisor review window).
  if (batch1) {
    await prisma.appraisalBatch.update({
      where: { id: batch1.id },
      data: {
        status: "ONGOING",
        currentStage: BatchWorkflowStage.PEER_REVIEW,
        pdpStartDate: utcDate(2026, 3, 15),
        pdpEndDate: utcDate(2026, 4, 30),
        selfReviewStartedAt: utcDate(2026, 7, 15),
        peerReviewStartedAt: utcDate(2026, 8, 10),
      },
    });
  }

  // Batch 2 started in May — appraisal period with follow-up meetings.
  if (batch2) {
    await prisma.appraisalBatch.update({
      where: { id: batch2.id },
      data: {
        status: "ONGOING",
        currentStage: BatchWorkflowStage.PROGRESS_PERIOD,
        pdpStartDate: utcDate(2026, 5, 15),
        pdpEndDate: utcDate(2026, 6, 30),
      },
    });
  }

  // Batch 3 starts in October — still in setup / planning.
  if (batch3) {
    await prisma.appraisalBatch.update({
      where: { id: batch3.id },
      data: {
        status: "UPCOMING",
        currentStage: BatchWorkflowStage.PLANNING_MEETING,
      },
    });
  }
}

async function createPlanningMeeting(
  prisma: SeedClient,
  options: {
    employeeId: string;
    supervisorId: string;
    hrUserId: string;
    cycleId: string;
    batchId: string;
    scheduledAt: Date;
  }
) {
  const endAt = new Date(options.scheduledAt.getTime() + 60 * 60 * 1000);
  return prisma.meeting.create({
    data: {
      type: MeetingType.PERFORMANCE_PLANNING,
      title: "Performance Planning Meeting",
      employeeId: options.employeeId,
      supervisorId: options.supervisorId,
      createdById: options.hrUserId,
      cycleId: options.cycleId,
      batchId: options.batchId,
      scheduledAt: options.scheduledAt,
      endAt,
      status: MeetingStatus.COMPLETED,
    },
  });
}

async function createFollowUpMeetings(
  prisma: SeedClient,
  options: {
    employeeId: string;
    supervisorId: string;
    hrUserId: string;
    cycleId: string;
    batchId: string;
    count: number;
    firstDate: Date;
  }
) {
  for (let slot = 1; slot <= options.count; slot += 1) {
    const scheduledAt = new Date(options.firstDate);
    scheduledAt.setUTCMonth(scheduledAt.getUTCMonth() + (slot - 1));
    const endAt = new Date(scheduledAt.getTime() + 45 * 60 * 1000);
    await prisma.meeting.create({
      data: {
        type: MeetingType.FOLLOW_UP,
        title: `Follow-up Meeting ${slot}`,
        employeeId: options.employeeId,
        supervisorId: options.supervisorId,
        createdById: options.hrUserId,
        cycleId: options.cycleId,
        batchId: options.batchId,
        followUpSlot: slot,
        scheduledAt,
        endAt,
        status: MeetingStatus.COMPLETED,
      },
    });
  }
}

async function createPdp(
  prisma: SeedClient,
  options: {
    employeeId: string;
    supervisorId: string;
    hrUserId: string;
    cycleId: string;
    batchId: string;
    status: PdpStatus;
    planningMeetingId: string;
    createdAt: Date;
    approvedAt?: Date | null;
    employeeAgreedAt?: Date | null;
    hrReviewedAt?: Date | null;
    goalProgress: number;
  }
) {
  return prisma.personalDevelopmentPlan.create({
    data: {
      employeeId: options.employeeId,
      supervisorId: options.supervisorId,
      createdById: options.supervisorId,
      cycleId: options.cycleId,
      batchId: options.batchId,
      status: options.status,
      summary: "Development plan agreed during the performance planning meeting.",
      planningMeetingId: options.planningMeetingId,
      createdAt: options.createdAt,
      approvedAt: options.approvedAt ?? null,
      approvedById: options.approvedAt ? options.hrUserId : null,
      employeeAgreedAt: options.employeeAgreedAt ?? null,
      hrReviewedAt: options.hrReviewedAt ?? null,
      goals: {
        create: [
          {
            title: "Delivery quality",
            objective: "Maintain agreed quality standards for assigned work.",
            expectedOutcome: "Fewer defects and clearer documentation.",
            progress: options.goalProgress,
            status: options.goalProgress >= 100 ? "COMPLETED" : "IN_PROGRESS",
            sortOrder: 0,
            weightage: 50,
          },
          {
            title: "Collaboration",
            objective: "Improve cross-team communication during the cycle.",
            expectedOutcome: "Timely updates to supervisor and peers.",
            progress: Math.max(0, options.goalProgress - 15),
            status: "IN_PROGRESS",
            sortOrder: 1,
            weightage: 50,
          },
        ],
      },
    },
  });
}

export async function seedDemoEmployeeScenarios(
  prisma: SeedClient,
  options: {
    hrUserId: string;
    cycleId: string;
    batches: Array<{ id: string; batchNumber: number }>;
  }
) {
  const supervisor = await prisma.employee.findUniqueOrThrow({
    where: { employeeId: "SUP000001" },
  });
  const employees = await prisma.employee.findMany({
    where: { employeeId: { in: [...DEMO_EMPLOYEE_IDS] } },
  });
  const byCode = new Map(employees.map((item) => [item.employeeId, item]));
  const batch1 = options.batches.find((item) => item.batchNumber === 1)!;
  const batch2 = options.batches.find((item) => item.batchNumber === 2)!;

  const scenarios: Array<{
    employeeId: (typeof DEMO_EMPLOYEE_IDS)[number];
    batchId: string;
    stage: BatchWorkflowStage;
  }> = [
    { employeeId: "EMP000001", batchId: batch2.id, stage: BatchWorkflowStage.PDP_CREATION },
    { employeeId: "EMP000901", batchId: batch2.id, stage: BatchWorkflowStage.PROGRESS_PERIOD },
    { employeeId: "EMP000902", batchId: batch1.id, stage: BatchWorkflowStage.SELF_REVIEW },
    { employeeId: "EMP000903", batchId: batch1.id, stage: BatchWorkflowStage.RECOGNITION_PIP },
    { employeeId: "EMP000904", batchId: batch1.id, stage: BatchWorkflowStage.RECOGNITION_PIP },
  ];

  for (const scenario of scenarios) {
    const employee = byCode.get(scenario.employeeId);
    if (!employee) continue;

    await prisma.employeeBatchAssignment.upsert({
      where: {
        cycleId_employeeId: { cycleId: options.cycleId, employeeId: employee.id },
      },
      update: { batchId: scenario.batchId },
      create: {
        cycleId: options.cycleId,
        batchId: scenario.batchId,
        employeeId: employee.id,
      },
    });

    await prisma.employeeSupervisorAssignment.upsert({
      where: {
        cycleId_employeeId: { cycleId: options.cycleId, employeeId: employee.id },
      },
      update: { supervisorId: supervisor.id },
      create: {
        cycleId: options.cycleId,
        employeeId: employee.id,
        supervisorId: supervisor.id,
      },
    });
  }

  const alex = byCode.get("EMP000001")!;
  const nethmi = byCode.get("EMP000901")!;
  const kevin = byCode.get("EMP000902")!;
  const amaya = byCode.get("EMP000903")!;
  const ryan = byCode.get("EMP000904")!;

  const alexMeeting = await createPlanningMeeting(prisma, {
    employeeId: alex.id,
    supervisorId: supervisor.id,
    hrUserId: options.hrUserId,
    cycleId: options.cycleId,
    batchId: batch2.id,
    scheduledAt: utcDate(2026, 5, 20),
  });
  await createPdp(prisma, {
    employeeId: alex.id,
    supervisorId: supervisor.id,
    hrUserId: options.hrUserId,
    cycleId: options.cycleId,
    batchId: batch2.id,
    status: PdpStatus.PENDING_EMPLOYEE_REVIEW,
    planningMeetingId: alexMeeting.id,
    createdAt: utcDate(2026, 5, 28),
    hrReviewedAt: utcDate(2026, 6, 2),
    goalProgress: 0,
  });
  await prisma.employeeCycleProgress.create({
    data: {
      employeeId: alex.id,
      cycleId: options.cycleId,
      batchId: batch2.id,
      currentStage: BatchWorkflowStage.PDP_CREATION,
      planningMeetingCompletedAt: utcDate(2026, 5, 20),
      pdpCreatedAt: utcDate(2026, 5, 28),
      pdpSentAt: utcDate(2026, 6, 2),
    },
  });

  const nethmiMeeting = await createPlanningMeeting(prisma, {
    employeeId: nethmi.id,
    supervisorId: supervisor.id,
    hrUserId: options.hrUserId,
    cycleId: options.cycleId,
    batchId: batch2.id,
    scheduledAt: utcDate(2026, 5, 18),
  });
  await createPdp(prisma, {
    employeeId: nethmi.id,
    supervisorId: supervisor.id,
    hrUserId: options.hrUserId,
    cycleId: options.cycleId,
    batchId: batch2.id,
    status: PdpStatus.APPROVED,
    planningMeetingId: nethmiMeeting.id,
    createdAt: utcDate(2026, 5, 25),
    hrReviewedAt: utcDate(2026, 5, 27),
    employeeAgreedAt: utcDate(2026, 5, 29),
    approvedAt: utcDate(2026, 5, 30),
    goalProgress: 55,
  });
  await createFollowUpMeetings(prisma, {
    employeeId: nethmi.id,
    supervisorId: supervisor.id,
    hrUserId: options.hrUserId,
    cycleId: options.cycleId,
    batchId: batch2.id,
    count: 3,
    firstDate: utcDate(2026, 6, 15),
  });
  await prisma.employeeCycleProgress.create({
    data: {
      employeeId: nethmi.id,
      cycleId: options.cycleId,
      batchId: batch2.id,
      currentStage: BatchWorkflowStage.PROGRESS_PERIOD,
      planningMeetingCompletedAt: utcDate(2026, 5, 18),
      pdpCreatedAt: utcDate(2026, 5, 25),
      pdpSentAt: utcDate(2026, 5, 27),
      pdpApprovedAt: utcDate(2026, 5, 30),
      followUpMeetingsCompleted: 3,
      appraisalPeriodStartedAt: utcDate(2026, 6, 1),
    },
  });

  const kevinMeeting = await createPlanningMeeting(prisma, {
    employeeId: kevin.id,
    supervisorId: supervisor.id,
    hrUserId: options.hrUserId,
    cycleId: options.cycleId,
    batchId: batch1.id,
    scheduledAt: utcDate(2026, 3, 18),
  });
  await createPdp(prisma, {
    employeeId: kevin.id,
    supervisorId: supervisor.id,
    hrUserId: options.hrUserId,
    cycleId: options.cycleId,
    batchId: batch1.id,
    status: PdpStatus.APPROVED,
    planningMeetingId: kevinMeeting.id,
    createdAt: utcDate(2026, 3, 25),
    hrReviewedAt: utcDate(2026, 3, 27),
    employeeAgreedAt: utcDate(2026, 3, 28),
    approvedAt: utcDate(2026, 3, 30),
    goalProgress: 90,
  });
  await createFollowUpMeetings(prisma, {
    employeeId: kevin.id,
    supervisorId: supervisor.id,
    hrUserId: options.hrUserId,
    cycleId: options.cycleId,
    batchId: batch1.id,
    count: 3,
    firstDate: utcDate(2026, 4, 20),
  });
  await prisma.employeeCycleProgress.create({
    data: {
      employeeId: kevin.id,
      cycleId: options.cycleId,
      batchId: batch1.id,
      currentStage: BatchWorkflowStage.SELF_REVIEW,
      planningMeetingCompletedAt: utcDate(2026, 3, 18),
      pdpCreatedAt: utcDate(2026, 3, 25),
      pdpSentAt: utcDate(2026, 3, 27),
      pdpApprovedAt: utcDate(2026, 3, 30),
      followUpMeetingsCompleted: 3,
      appraisalPeriodStartedAt: utcDate(2026, 4, 1),
      selfReviewStartedAt: utcDate(2026, 7, 15),
    },
  });

  const amayaMeeting = await createPlanningMeeting(prisma, {
    employeeId: amaya.id,
    supervisorId: supervisor.id,
    hrUserId: options.hrUserId,
    cycleId: options.cycleId,
    batchId: batch1.id,
    scheduledAt: utcDate(2026, 3, 16),
  });
  await createPdp(prisma, {
    employeeId: amaya.id,
    supervisorId: supervisor.id,
    hrUserId: options.hrUserId,
    cycleId: options.cycleId,
    batchId: batch1.id,
    status: PdpStatus.COMPLETED,
    planningMeetingId: amayaMeeting.id,
    createdAt: utcDate(2026, 3, 22),
    hrReviewedAt: utcDate(2026, 3, 24),
    employeeAgreedAt: utcDate(2026, 3, 25),
    approvedAt: utcDate(2026, 3, 26),
    goalProgress: 100,
  });
  await createFollowUpMeetings(prisma, {
    employeeId: amaya.id,
    supervisorId: supervisor.id,
    hrUserId: options.hrUserId,
    cycleId: options.cycleId,
    batchId: batch1.id,
    count: 3,
    firstDate: utcDate(2026, 4, 18),
  });
  await prisma.appraisalOutcome.create({
    data: {
      employeeId: amaya.id,
      cycleId: options.cycleId,
      batchId: batch1.id,
      overallResult: "Exceeds Expectations",
      ratingBand: "EE",
      overallScore: 4.6,
      supervisorComments: "Consistently strong delivery and stakeholder communication.",
      resultsIssuedAt: utcDate(2026, 8, 5),
      awardReceived: true,
      awardTitle: "2026 Spot Award — Product Excellence",
      awardDescription: "Recognised for outstanding contribution during the appraisal period.",
      pipRequired: false,
      pipStatus: PipStatus.NONE,
    },
  });
  await prisma.employeeCycleProgress.create({
    data: {
      employeeId: amaya.id,
      cycleId: options.cycleId,
      batchId: batch1.id,
      currentStage: BatchWorkflowStage.RECOGNITION_PIP,
      planningMeetingCompletedAt: utcDate(2026, 3, 16),
      pdpCreatedAt: utcDate(2026, 3, 22),
      pdpSentAt: utcDate(2026, 3, 24),
      pdpApprovedAt: utcDate(2026, 3, 26),
      followUpMeetingsCompleted: 3,
      appraisalPeriodStartedAt: utcDate(2026, 4, 1),
      selfReviewStartedAt: utcDate(2026, 7, 10),
      selfReviewCompletedAt: utcDate(2026, 7, 20),
      peerReviewCompletedAt: utcDate(2026, 8, 1),
      supervisorReviewCompletedAt: utcDate(2026, 8, 3),
      hrEvaluationCompletedAt: utcDate(2026, 8, 4),
      resultsIssuedAt: utcDate(2026, 8, 5),
    },
  });

  const ryanMeeting = await createPlanningMeeting(prisma, {
    employeeId: ryan.id,
    supervisorId: supervisor.id,
    hrUserId: options.hrUserId,
    cycleId: options.cycleId,
    batchId: batch1.id,
    scheduledAt: utcDate(2026, 3, 17),
  });
  await createPdp(prisma, {
    employeeId: ryan.id,
    supervisorId: supervisor.id,
    hrUserId: options.hrUserId,
    cycleId: options.cycleId,
    batchId: batch1.id,
    status: PdpStatus.COMPLETED,
    planningMeetingId: ryanMeeting.id,
    createdAt: utcDate(2026, 3, 23),
    hrReviewedAt: utcDate(2026, 3, 25),
    employeeAgreedAt: utcDate(2026, 3, 26),
    approvedAt: utcDate(2026, 3, 27),
    goalProgress: 40,
  });
  await createFollowUpMeetings(prisma, {
    employeeId: ryan.id,
    supervisorId: supervisor.id,
    hrUserId: options.hrUserId,
    cycleId: options.cycleId,
    batchId: batch1.id,
    count: 3,
    firstDate: utcDate(2026, 4, 22),
  });
  await prisma.appraisalOutcome.create({
    data: {
      employeeId: ryan.id,
      cycleId: options.cycleId,
      batchId: batch1.id,
      overallResult: "Needs Improvement",
      ratingBand: "NI",
      overallScore: 2.3,
      supervisorComments: "Core delivery targets were not met consistently.",
      developmentRecommendations: "Structured performance improvement plan with weekly check-ins.",
      resultsIssuedAt: utcDate(2026, 8, 6),
      awardReceived: false,
      pipRequired: true,
      pipStatus: PipStatus.ACTIVE,
      pipSummary:
        "90-day Performance Improvement Plan assigned after the 2026 appraisal result. Weekly supervisor check-ins are in progress.",
    },
  });
  await prisma.employeeCycleProgress.create({
    data: {
      employeeId: ryan.id,
      cycleId: options.cycleId,
      batchId: batch1.id,
      currentStage: BatchWorkflowStage.RECOGNITION_PIP,
      planningMeetingCompletedAt: utcDate(2026, 3, 17),
      pdpCreatedAt: utcDate(2026, 3, 23),
      pdpSentAt: utcDate(2026, 3, 25),
      pdpApprovedAt: utcDate(2026, 3, 27),
      followUpMeetingsCompleted: 3,
      appraisalPeriodStartedAt: utcDate(2026, 4, 1),
      selfReviewStartedAt: utcDate(2026, 7, 12),
      selfReviewCompletedAt: utcDate(2026, 7, 22),
      peerReviewCompletedAt: utcDate(2026, 8, 2),
      supervisorReviewCompletedAt: utcDate(2026, 8, 4),
      hrEvaluationCompletedAt: utcDate(2026, 8, 5),
      resultsIssuedAt: utcDate(2026, 8, 6),
    },
  });
}

export async function seedNeedsAssignmentJoiners(
  prisma: SeedClient,
  cycleId: string
) {
  const admin = await prisma.department.findUnique({
    where: { name: "Administration" },
  });
  if (!admin) return;

  const joiners = await prisma.employee.findMany({
    where: {
      departmentId: admin.id,
      role: "EMPLOYEE",
      employeeId: { notIn: [...DEMO_EMPLOYEE_IDS] },
    },
    orderBy: { employeeId: "desc" },
    take: 12,
  });

  // 5: batch only, 5: neither, 2: supervisor only — matches the Needs Assignment UI.
  const batchOnly = joiners.slice(0, 5);
  const neither = joiners.slice(5, 10);
  const supervisorOnly = joiners.slice(10, 12);

  const idsWithoutSupervisor = [...batchOnly, ...neither].map((item) => item.id);
  const idsWithoutBatch = [...neither, ...supervisorOnly].map((item) => item.id);

  if (idsWithoutSupervisor.length) {
    await prisma.employeeSupervisorAssignment.deleteMany({
      where: { cycleId, employeeId: { in: idsWithoutSupervisor } },
    });
  }
  if (idsWithoutBatch.length) {
    await prisma.employeeBatchAssignment.deleteMany({
      where: { cycleId, employeeId: { in: idsWithoutBatch } },
    });
  }
}

export async function seedCycleHistoriesAndOutcomes(
  prisma: SeedClient,
  options: {
    hrUserId: string;
    cycles: Array<{
      id: string;
      year: number;
      batches: Array<{ id: string; batchNumber: number }>;
    }>;
    employees: Array<{ id: string; employeeId: string; departmentId: string | null }>;
    supervisors: Array<{ id: string; departmentId: string | null }>;
  }
) {
  for (const cycle of options.cycles) {
    await seedAssignmentHistoryForCycle(prisma, {
      cycleId: cycle.id,
      hrUserId: options.hrUserId,
      employees: options.employees,
      batches: cycle.batches,
      supervisors: options.supervisors,
      year: cycle.year,
    });
    if (cycle.year < 2026) {
      await seedHistoricalOutcomes(prisma, cycle, options.employees, cycle.year);
    }
  }
}
