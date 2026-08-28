/**
 * Appraisal cycle demo data: historical years, staggered 2026 batches,
 * assignment history, mid-cycle joiners, and five employee scenarios.
 *
 * Kept separate from the workforce generator so seed.ts stays readable.
 */
import {
  BatchWorkflowStage,
  MeetingParticipantResponse,
  MeetingParticipantRole,
  MeetingStatus,
  MeetingType,
  NotificationType,
  PdpStatus,
  PipStatus,
  RescheduleRequestStatus,
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

const GOAL_TITLES = [
  "Delivery quality",
  "Collaboration",
  "Documentation",
  "Stakeholder communication",
  "Technical depth",
  "Time management",
  "Knowledge sharing",
  "Incident response",
  "Customer focus",
  "Process improvement",
  "Mentoring",
  "Risk awareness",
  "Planning discipline",
  "Cross-team coordination",
  "Quality reviews",
  "Learning goal",
  "Ownership",
  "Innovation",
  "Data-driven decisions",
  "Service reliability",
];

async function seedHistoricalOutcomes(
  prisma: SeedClient,
  cycle: { id: string; batches: Array<{ id: string; batchNumber: number }> },
  employees: Array<{ id: string; employeeId: string }>,
  year: number
) {
  const sample = employees.filter((_, index) => index % 3 !== 2);
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
        bonusAwarded: award,
        bonusAmount: award ? 75000 : index % 5 === 0 ? 25000 : null,
        bonusNotes: award
          ? "Annual excellence bonus issued with the appraisal result."
          : index % 5 === 0
            ? "Spot bonus for project delivery."
            : null,
        promotionRecommended: award && index % 16 === 0,
        promotionTitle: award && index % 16 === 0 ? "Senior " + (year === 2025 ? "Engineer" : "Specialist") : null,
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
    status?: MeetingStatus;
    location?: string;
    title?: string;
    notes?: {
      discussionSummary: string;
      decisionsMade: string;
      previousAppraisalReviewed?: string;
      previousAppraisalFindings?: string;
      previousPdpReviewed?: string;
      employeeStrengths?: string;
      employeeWeaknesses?: string;
      departmentObjectives?: string;
      companyObjectives?: string;
      developmentNeeds?: string;
      performanceObservations?: string;
      agreedOutcomes?: string;
    };
  }
) {
  const status = options.status ?? MeetingStatus.COMPLETED;
  const endAt = new Date(options.scheduledAt.getTime() + 60 * 60 * 1000);
  const accepted = status === MeetingStatus.COMPLETED || status === MeetingStatus.CONFIRMED;
  const meeting = await prisma.meeting.create({
    data: {
      type: MeetingType.PERFORMANCE_PLANNING,
      title: options.title ?? "Performance Planning Meeting",
      employeeId: options.employeeId,
      supervisorId: options.supervisorId,
      createdById: options.hrUserId,
      cycleId: options.cycleId,
      batchId: options.batchId,
      scheduledAt: options.scheduledAt,
      endAt,
      location: options.location ?? "Meeting Room A",
      status,
      participants: {
        create: [
          {
            employeeId: options.employeeId,
            participantRole: MeetingParticipantRole.EMPLOYEE,
            response: accepted
              ? MeetingParticipantResponse.ACCEPTED
              : MeetingParticipantResponse.PENDING,
            respondedAt: accepted ? options.scheduledAt : null,
          },
          {
            employeeId: options.supervisorId,
            participantRole: MeetingParticipantRole.SUPERVISOR,
            response: accepted
              ? MeetingParticipantResponse.ACCEPTED
              : MeetingParticipantResponse.PENDING,
            respondedAt: accepted ? options.scheduledAt : null,
          },
        ],
      },
    },
  });

  if (status === MeetingStatus.COMPLETED && options.notes) {
    await prisma.meetingNotes.create({
      data: {
        meetingId: meeting.id,
        createdById: options.supervisorId,
        discussionSummary: options.notes.discussionSummary,
        decisionsMade: options.notes.decisionsMade,
        keyPoints: options.notes.employeeStrengths ?? "",
        additionalComments: options.notes.performanceObservations ?? null,
      },
    });
    await prisma.planningMeetingReview.create({
      data: {
        meetingId: meeting.id,
        updatedById: options.supervisorId,
        previousAppraisalReviewed: options.notes.previousAppraisalReviewed ?? "",
        previousAppraisalFindings: options.notes.previousAppraisalFindings ?? "",
        previousPdpObjectives: options.notes.previousPdpReviewed ?? options.notes.performanceObservations ?? "",
        previousPdpProgress: options.notes.previousPdpReviewed ?? "",
        employeeStrengths: options.notes.employeeStrengths ?? "",
        employeeWeaknesses: options.notes.employeeWeaknesses ?? "",
        departmentObjectivesNotes:
          options.notes.departmentObjectives ??
          "Department priorities for the cycle were discussed and aligned with the employee's role.",
        companyObjectivesNotes:
          options.notes.companyObjectives ??
          "Company objectives for the cycle were reviewed with the employee.",
        developmentNeedsSummary:
          options.notes.developmentNeeds ??
          "Agreed development needs will be reflected in the PDP.",
        performanceObservations: options.notes.performanceObservations ?? "",
        agreedOutcomes: options.notes.agreedOutcomes ?? "",
        decisionsMade: options.notes.decisionsMade,
      },
    });
  }

  return meeting;
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
    goalCount?: number;
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
        create: Array.from({ length: options.goalCount ?? 8 }, (_, index) => ({
          title: GOAL_TITLES[index % GOAL_TITLES.length] + (index >= GOAL_TITLES.length ? ` ${Math.floor(index / GOAL_TITLES.length) + 1}` : ""),
          objective: `Deliver measurable progress on ${GOAL_TITLES[index % GOAL_TITLES.length].toLowerCase()} during this cycle.`,
          expectedOutcome: "Agreed KPI met by the review window.",
          progress: Math.max(0, Math.min(100, options.goalProgress - (index % 7) * 4)),
          status:
            options.goalProgress >= 100
              ? "COMPLETED"
              : options.goalProgress > 20
                ? "IN_PROGRESS"
                : "NOT_STARTED",
          sortOrder: index,
          weightage: Number((100 / (options.goalCount ?? 8)).toFixed(2)),
          developmentArea: index % 2 === 0 ? "Technical" : "Behavioural",
          measurementKpi: "Supervisor-reviewed evidence at follow-up meetings",
          priority: index % 9 === 0 ? "HIGH" : index % 4 === 0 ? "LOW" : "MEDIUM",
        })),
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
    // Alex is the one of five demo logins whose 2026 planning meeting is still upcoming.
    { employeeId: "EMP000001", batchId: batch2.id, stage: BatchWorkflowStage.PLANNING_MEETING },
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
    scheduledAt: new Date(Date.UTC(2026, 7, 28, 5, 0)),
    status: MeetingStatus.SCHEDULED,
    location: "Meeting Room A",
    title: "Performance Planning Meeting — Alex Perera",
  });
  await prisma.employeeCycleProgress.create({
    data: {
      employeeId: alex.id,
      cycleId: options.cycleId,
      batchId: batch2.id,
      currentStage: BatchWorkflowStage.PLANNING_MEETING,
    },
  });
  await prisma.notification.createMany({
    data: [
      {
        type: NotificationType.MEETING_INVITATION,
        title: "Meeting confirmation required",
        message:
          "Performance Planning Meeting — Alex Perera has been scheduled for August 28, 2026 at 10:30 AM. Please confirm attendance or request a reschedule.",
        recipientId: alex.id,
        subjectEmployeeId: alex.id,
        metadata: { meetingId: alexMeeting.id },
        createdAt: utcDate(2026, 8, 27),
      },
      {
        type: NotificationType.MEETING_INVITATION,
        title: "Meeting confirmation required",
        message:
          "Performance Planning Meeting — Alex Perera has been scheduled for August 28, 2026 at 10:30 AM. Please confirm attendance or request a reschedule.",
        recipientId: supervisor.id,
        subjectEmployeeId: alex.id,
        metadata: { meetingId: alexMeeting.id },
        createdAt: utcDate(2026, 8, 27),
      },
      {
        type: NotificationType.MEETING_INVITATION,
        title: "Planning meeting scheduled",
        message:
          "A Performance Planning Meeting for Alex Perera is scheduled. Participant confirmations are pending.",
        recipientId: options.hrUserId,
        subjectEmployeeId: alex.id,
        metadata: { meetingId: alexMeeting.id },
        createdAt: utcDate(2026, 8, 27),
      },
    ],
  });

  const nethmiMeeting = await createPlanningMeeting(prisma, {
    employeeId: nethmi.id,
    supervisorId: supervisor.id,
    hrUserId: options.hrUserId,
    cycleId: options.cycleId,
    batchId: batch2.id,
    scheduledAt: utcDate(2026, 5, 18),
    title: "Performance Planning Meeting — Nethmi Silva",
    notes: {
      discussionSummary:
        "Reviewed Nethmi's 2025 appraisal. Strong QA ownership continued; agreed to keep defect-escape reduction as a core goal.",
      decisionsMade:
        "Proceed with a quality-focused PDP and monthly follow-up meetings during the progress period.",
      previousAppraisalReviewed: "Yes — 2025 cycle result and PDP were discussed.",
      previousAppraisalFindings:
        "Met expectations in 2025 with a 3.8 overall score. Collaboration was a noted strength.",
      employeeStrengths: "Test coverage discipline, clear defect reporting, calm stakeholder communication.",
      employeeWeaknesses: "Can take longer to escalate blocked items.",
      performanceObservations: "Previous cycle goals were largely completed; carry forward quality metrics.",
      agreedOutcomes: "Approved to start PDP creation after this meeting.",
    },
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
    goalCount: 42,
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
    title: "Performance Planning Meeting — Kevin Fernando",
    notes: {
      discussionSummary:
        "Discussed 2025 support metrics and ticket-handling quality. Kevin improved first-response time but still needs stronger documentation.",
      decisionsMade:
        "Focus the 2026 PDP on knowledge-base contributions and incident communication.",
      previousAppraisalReviewed: "Yes — 2025 Meets Expectations result reviewed.",
      previousAppraisalFindings: "Score 3.6. No PIP. Documentation completeness was the main gap.",
      employeeStrengths: "Reliable on-call coverage and patient end-user support.",
      employeeWeaknesses: "Written handover notes are sometimes incomplete.",
      performanceObservations: "Previous PDP was completed with one carried-forward documentation goal.",
      agreedOutcomes: "Move into PDP creation with a documentation KPI.",
    },
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
    goalCount: 40,
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
    title: "Performance Planning Meeting — Amaya Peris",
    notes: {
      discussionSummary:
        "Reviewed outstanding 2025 delivery. Agreed to stretch product-analytics goals and keep stakeholder leadership as a strength to build on.",
      decisionsMade:
        "Set ambitious but measurable PDP goals and continue monthly follow-ups.",
      previousAppraisalReviewed: "Yes — 2025 Outstanding result and award were discussed.",
      previousAppraisalFindings:
        "Score 4.5 with an excellence award. Promotion to Senior Product Analyst was recommended.",
      employeeStrengths: "Insight quality, stakeholder influence, consistent delivery.",
      employeeWeaknesses: "Can over-commit across concurrent product streams.",
      performanceObservations: "Previous goals were completed; introduce a prioritisation goal this cycle.",
      agreedOutcomes: "Proceed to PDP with a stretch leadership objective.",
    },
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
    goalCount: 45,
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
      bonusAwarded: true,
      bonusAmount: 120000,
      bonusNotes: "Performance bonus issued with the 2026 result.",
      promotionRecommended: true,
      promotionTitle: "Senior Product Analyst",
      promotionNotes: "Promotion recommended based on sustained high performance.",
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
    title: "Performance Planning Meeting — Ryan De Silva",
    notes: {
      discussionSummary:
        "Reviewed 2025 concerns around delivery reliability. Agreed that 2026 must address incident response and ownership, with closer follow-up.",
      decisionsMade:
        "Keep the employee in the standard cycle with a recovery-focused PDP and weekly check-ins if progress slips.",
      previousAppraisalReviewed: "Yes — 2025 Needs Improvement result and closed PIP were discussed.",
      previousAppraisalFindings:
        "Score 2.6 in 2025. PIP was completed, but reliability remains a concern.",
      employeeStrengths: "Cloud platform knowledge and willingness to take on-call.",
      employeeWeaknesses: "Missed handovers and uneven incident follow-through.",
      performanceObservations: "Historical PIP is closed; watch for recurrence this cycle.",
      agreedOutcomes: "Proceed to PDP with reliability KPIs and extra follow-up meetings.",
    },
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
    goalCount: 40,
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

  await prisma.appraisalReview.createMany({
    data: [
      {
        employeeId: kevin.id,
        cycleId: options.cycleId,
        reviewerId: kevin.id,
        kind: "SELF",
        score: 4.0,
        comments: "Self-review submitted covering support quality and documentation goals.",
        completedAt: utcDate(2026, 7, 18),
      },
      {
        employeeId: amaya.id,
        cycleId: options.cycleId,
        reviewerId: amaya.id,
        kind: "SELF",
        score: 4.7,
        comments: "Strong delivery against stretch product-analytics goals.",
        completedAt: utcDate(2026, 7, 18),
      },
      {
        employeeId: amaya.id,
        cycleId: options.cycleId,
        kind: "PEER",
        score: 4.5,
        comments: "Peers noted clear stakeholder communication and reliable delivery.",
        completedAt: utcDate(2026, 8, 1),
      },
      {
        employeeId: amaya.id,
        cycleId: options.cycleId,
        reviewerId: supervisor.id,
        kind: "SUPERVISOR",
        score: 4.6,
        comments: "Exceeded expectations. Promotion and bonus recommended.",
        completedAt: utcDate(2026, 8, 3),
      },
      {
        employeeId: ryan.id,
        cycleId: options.cycleId,
        reviewerId: ryan.id,
        kind: "SELF",
        score: 2.8,
        comments: "Acknowledged missed reliability targets.",
        completedAt: utcDate(2026, 7, 20),
      },
      {
        employeeId: ryan.id,
        cycleId: options.cycleId,
        kind: "PEER",
        score: 2.5,
        comments: "Incident follow-through was inconsistent.",
        completedAt: utcDate(2026, 8, 2),
      },
      {
        employeeId: ryan.id,
        cycleId: options.cycleId,
        reviewerId: supervisor.id,
        kind: "SUPERVISOR",
        score: 2.3,
        comments: "PIP required after the 2026 result.",
        completedAt: utcDate(2026, 8, 4),
      },
    ],
  });

  // Personal notifications so every demo role has a real inbox tied to meetings.
  await prisma.notification.createMany({
    data: [
      {
        type: NotificationType.MEETING_COMPLETED,
        title: "Planning meeting completed",
        message:
          "Your Performance Planning Meeting has been completed. Supervisor notes are now available.",
        recipientId: nethmi.id,
        subjectEmployeeId: nethmi.id,
        metadata: { meetingId: nethmiMeeting.id },
        createdAt: utcDate(2026, 5, 18),
      },
      {
        type: NotificationType.PDP_APPROVED,
        title: "PDP approved",
        message: "Your Personal Development Plan for 2026 has been approved.",
        recipientId: nethmi.id,
        subjectEmployeeId: nethmi.id,
        createdAt: utcDate(2026, 5, 30),
      },
      {
        type: NotificationType.MEETING_COMPLETED,
        title: "Planning meeting completed",
        message:
          "Kevin Fernando's Performance Planning Meeting is complete. Notes are saved.",
        recipientId: supervisor.id,
        subjectEmployeeId: kevin.id,
        metadata: { meetingId: kevinMeeting.id },
        createdAt: utcDate(2026, 3, 18),
      },
      {
        type: NotificationType.SELF_REVIEW_STARTED,
        title: "Self review is open",
        message: "The self-review window is open for your current appraisal batch.",
        recipientId: kevin.id,
        subjectEmployeeId: kevin.id,
        createdAt: utcDate(2026, 7, 15),
      },
      {
        type: NotificationType.MEETING_COMPLETED,
        title: "Planning meeting completed",
        message:
          "Amaya Peris completed the Performance Planning Meeting. Appraisal results are available.",
        recipientId: amaya.id,
        subjectEmployeeId: amaya.id,
        metadata: { meetingId: amayaMeeting.id },
        createdAt: utcDate(2026, 3, 16),
      },
      {
        type: NotificationType.BATCH_STAGE_CHANGED,
        title: "Appraisal results issued",
        message: "Your 2026 appraisal result has been issued, including recognition details.",
        recipientId: amaya.id,
        subjectEmployeeId: amaya.id,
        createdAt: utcDate(2026, 8, 5),
      },
      {
        type: NotificationType.MEETING_COMPLETED,
        title: "Planning meeting completed",
        message:
          "Ryan De Silva's Performance Planning Meeting notes are saved. A PIP was later assigned.",
        recipientId: ryan.id,
        subjectEmployeeId: ryan.id,
        metadata: { meetingId: ryanMeeting.id },
        createdAt: utcDate(2026, 3, 17),
      },
      {
        type: NotificationType.BATCH_STAGE_CHANGED,
        title: "PIP assigned",
        message: "A Performance Improvement Plan was assigned after the 2026 appraisal result.",
        recipientId: ryan.id,
        subjectEmployeeId: ryan.id,
        createdAt: utcDate(2026, 8, 6),
      },
      {
        type: NotificationType.PDP_APPROVED,
        title: "PDP approved for your employee",
        message: "Nethmi Silva's PDP has been approved and the progress period is underway.",
        recipientId: supervisor.id,
        subjectEmployeeId: nethmi.id,
        createdAt: utcDate(2026, 5, 30),
      },
    ],
  });

  const leadership = await prisma.employee.findUnique({
    where: { employeeId: "LED000001" },
  });
  if (leadership) {
    await prisma.notification.createMany({
      data: [
        {
          type: NotificationType.BATCH_STAGE_CHANGED,
          title: "2026 appraisal cycle is active",
          message:
            "The 2026 Annual Appraisal is underway. Planning meetings and results are being recorded across the organisation.",
          recipientId: leadership.id,
          createdAt: utcDate(2026, 8, 1),
        },
        {
          type: NotificationType.MEETING_COMPLETED,
          title: "Planning meetings progressing",
          message:
            "Most employees in the current cycle have completed their Performance Planning Meetings.",
          recipientId: leadership.id,
          createdAt: utcDate(2026, 8, 20),
        },
      ],
    });
  }
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
    if (cycle.year >= 2023 && cycle.year <= 2025) {
      await seedWorkforceYearHistory(prisma, {
        cycle,
        employees: options.employees,
        supervisors: options.supervisors,
        hrUserId: options.hrUserId,
        year: cycle.year,
      });
    }
  }
}

async function seedWorkforceYearHistory(
  prisma: SeedClient,
  options: {
    cycle: { id: string; year: number; batches: Array<{ id: string; batchNumber: number }> };
    employees: Array<{ id: string; employeeId: string; departmentId: string | null }>;
    supervisors: Array<{ id: string; departmentId: string | null }>;
    hrUserId: string;
    year: number;
  }
) {
  const existing = await prisma.personalDevelopmentPlan.findMany({
    where: { cycleId: options.cycle.id },
    select: { employeeId: true },
  });
  const already = new Set(existing.map((item) => item.employeeId));
  const remaining = options.employees
    .filter(
      (item) =>
        !already.has(item.id) &&
        !DEMO_EMPLOYEE_IDS.includes(item.employeeId as (typeof DEMO_EMPLOYEE_IDS)[number])
    )
    .slice(0, 250);
  const supervisorByDept = new Map<string, string>();
  for (const supervisor of options.supervisors) {
    if (supervisor.departmentId && !supervisorByDept.has(supervisor.departmentId)) {
      supervisorByDept.set(supervisor.departmentId, supervisor.id);
    }
  }
  const fallbackSupervisor = options.supervisors[0]?.id;
  if (!fallbackSupervisor) return;

  for (let index = 0; index < remaining.length; index += 15) {
    const slice = remaining.slice(index, index + 15);
    await Promise.all(
      slice.map((employee, offset) => {
        const i = index + offset;
        const pip = i % 14 === 0;
        const award = !pip && i % 9 === 0;
        return seedCycleHistoryForEmployee(prisma, {
          employee: { ...employee, name: employee.employeeId },
          supervisorId:
            (employee.departmentId && supervisorByDept.get(employee.departmentId)) ||
            fallbackSupervisor,
          hrUserId: options.hrUserId,
          cycle: options.cycle,
          year: options.year,
          skipFollowUps: true,
          result: {
            overallResult: pip ? "Needs Improvement" : award ? "Exceeds Expectations" : "Meets Expectations",
            ratingBand: pip ? "NI" : award ? "EE" : "ME",
            overallScore: pip ? 2.6 : award ? 4.3 : 3.7,
            award,
            bonus: award ? 60000 : 20000,
            pip,
            goalProgress: pip ? 50 : award ? 94 : 82,
          },
        });
      })
    );
  }
}

async function seedCycleHistoryForEmployee(
  prisma: SeedClient,
  options: {
    employee: { id: string; employeeId: string; name: string };
    supervisorId: string;
    hrUserId: string;
    cycle: { id: string; batches: Array<{ id: string; batchNumber: number }> };
    year: number;
    skipFollowUps?: boolean;
    result: {
      overallResult: string;
      ratingBand: string;
      overallScore: number;
      award?: boolean;
      bonus?: number;
      promotion?: string;
      pip?: boolean;
      goalProgress: number;
    };
  }
) {
  const existingPdp = await prisma.personalDevelopmentPlan.findUnique({
    where: {
      cycleId_employeeId: { cycleId: options.cycle.id, employeeId: options.employee.id },
    },
    select: { id: true },
  });
  if (existingPdp) return;

  const batch = options.cycle.batches[0]!;
  const meeting = await createPlanningMeeting(prisma, {
    employeeId: options.employee.id,
    supervisorId: options.supervisorId,
    hrUserId: options.hrUserId,
    cycleId: options.cycle.id,
    batchId: batch.id,
    scheduledAt: utcDate(options.year, 3, 12),
    title: `Performance Planning Meeting — ${options.employee.name}`,
    notes: {
      discussionSummary: `Reviewed the previous year and agreed ${options.year} goals for ${options.employee.name}.`,
      decisionsMade: "Continue the standard appraisal process with an agreed PDP.",
      previousAppraisalReviewed: "Yes",
      previousAppraisalFindings: `Prior-year performance was used to set ${options.year} expectations.`,
      employeeStrengths: "Consistent contribution in the assigned role.",
      employeeWeaknesses: "Development areas carried into the PDP.",
      performanceObservations: "Historical performance was discussed before setting goals.",
      agreedOutcomes: "PDP created and later approved.",
    },
  });

  await createPdp(prisma, {
    employeeId: options.employee.id,
    supervisorId: options.supervisorId,
    hrUserId: options.hrUserId,
    cycleId: options.cycle.id,
    batchId: batch.id,
    status: PdpStatus.COMPLETED,
    planningMeetingId: meeting.id,
    createdAt: utcDate(options.year, 3, 20),
    hrReviewedAt: utcDate(options.year, 3, 22),
    employeeAgreedAt: utcDate(options.year, 3, 24),
    approvedAt: utcDate(options.year, 3, 25),
    goalProgress: options.result.goalProgress,
  });

  if (!options.skipFollowUps) {
    await createFollowUpMeetings(prisma, {
      employeeId: options.employee.id,
      supervisorId: options.supervisorId,
      hrUserId: options.hrUserId,
      cycleId: options.cycle.id,
      batchId: batch.id,
      count: 3,
      firstDate: utcDate(options.year, 4, 15),
    });
  }

  await prisma.appraisalReview.createMany({
    data: [
      {
        employeeId: options.employee.id,
        cycleId: options.cycle.id,
        reviewerId: options.employee.id,
        kind: "SELF",
        score: Number((options.result.overallScore - 0.1).toFixed(1)),
        comments: `${options.year} self-review.`,
        completedAt: utcDate(options.year, 11, 10),
      },
      {
        employeeId: options.employee.id,
        cycleId: options.cycle.id,
        kind: "PEER",
        score: Number((options.result.overallScore - 0.2).toFixed(1)),
        comments: `${options.year} peer review.`,
        completedAt: utcDate(options.year, 11, 20),
      },
      {
        employeeId: options.employee.id,
        cycleId: options.cycle.id,
        reviewerId: options.supervisorId,
        kind: "SUPERVISOR",
        score: options.result.overallScore,
        comments: `${options.year} supervisor review.`,
        completedAt: utcDate(options.year, 12, 5),
      },
    ],
  });

  await prisma.appraisalOutcome.upsert({
    where: {
      cycleId_employeeId: {
        cycleId: options.cycle.id,
        employeeId: options.employee.id,
      },
    },
    update: {
      overallResult: options.result.overallResult,
      ratingBand: options.result.ratingBand,
      overallScore: options.result.overallScore,
      resultsIssuedAt: utcDate(options.year + 1, 2, 15),
      awardReceived: Boolean(options.result.award),
      awardTitle: options.result.award ? `${options.year} Excellence Award` : null,
      bonusAwarded: Boolean(options.result.bonus),
      bonusAmount: options.result.bonus ?? null,
      promotionRecommended: Boolean(options.result.promotion),
      promotionTitle: options.result.promotion ?? null,
      pipRequired: Boolean(options.result.pip),
      pipStatus: options.result.pip ? PipStatus.COMPLETED : PipStatus.NONE,
      pipSummary: options.result.pip
        ? `${options.year} performance improvement plan was completed.`
        : null,
    },
    create: {
      employeeId: options.employee.id,
      cycleId: options.cycle.id,
      batchId: batch.id,
      overallResult: options.result.overallResult,
      ratingBand: options.result.ratingBand,
      overallScore: options.result.overallScore,
      resultsIssuedAt: utcDate(options.year + 1, 2, 15),
      awardReceived: Boolean(options.result.award),
      awardTitle: options.result.award ? `${options.year} Excellence Award` : null,
      bonusAwarded: Boolean(options.result.bonus),
      bonusAmount: options.result.bonus ?? null,
      promotionRecommended: Boolean(options.result.promotion),
      promotionTitle: options.result.promotion ?? null,
      pipRequired: Boolean(options.result.pip),
      pipStatus: options.result.pip ? PipStatus.COMPLETED : PipStatus.NONE,
      pipSummary: options.result.pip
        ? `${options.year} performance improvement plan was completed.`
        : null,
    },
  });

  await prisma.employeeCycleProgress.upsert({
    where: {
      cycleId_employeeId: {
        cycleId: options.cycle.id,
        employeeId: options.employee.id,
      },
    },
    update: {
      currentStage: BatchWorkflowStage.CLOSURE,
      planningMeetingCompletedAt: utcDate(options.year, 3, 12),
      pdpCreatedAt: utcDate(options.year, 3, 20),
      pdpApprovedAt: utcDate(options.year, 3, 25),
      followUpMeetingsCompleted: 3,
      selfReviewCompletedAt: utcDate(options.year, 11, 10),
      peerReviewCompletedAt: utcDate(options.year, 11, 20),
      supervisorReviewCompletedAt: utcDate(options.year, 12, 5),
      resultsIssuedAt: utcDate(options.year + 1, 2, 15),
    },
    create: {
      employeeId: options.employee.id,
      cycleId: options.cycle.id,
      batchId: batch.id,
      currentStage: BatchWorkflowStage.CLOSURE,
      planningMeetingCompletedAt: utcDate(options.year, 3, 12),
      pdpCreatedAt: utcDate(options.year, 3, 20),
      pdpApprovedAt: utcDate(options.year, 3, 25),
      followUpMeetingsCompleted: 3,
      appraisalPeriodStartedAt: utcDate(options.year, 4, 1),
      selfReviewCompletedAt: utcDate(options.year, 11, 10),
      peerReviewCompletedAt: utcDate(options.year, 11, 20),
      supervisorReviewCompletedAt: utcDate(options.year, 12, 5),
      resultsIssuedAt: utcDate(options.year + 1, 2, 15),
    },
  });
}

/** Two previous completed cycles for the five demo employee logins. */
export async function seedDemoEmployeeHistory(
  prisma: SeedClient,
  options: {
    hrUserId: string;
    cycles: Array<{
      id: string;
      year: number;
      batches: Array<{ id: string; batchNumber: number }>;
    }>;
  }
) {
  const supervisor = await prisma.employee.findUniqueOrThrow({
    where: { employeeId: "SUP000001" },
  });
  const employees = await prisma.employee.findMany({
    where: { employeeId: { in: [...DEMO_EMPLOYEE_IDS] } },
  });
  const byCode = new Map(employees.map((item) => [item.employeeId, item]));
  const cycle2024 = options.cycles.find((item) => item.year === 2024);
  const cycle2025 = options.cycles.find((item) => item.year === 2025);
  if (!cycle2024 || !cycle2025) return;

  const profiles: Array<{
    employeeId: (typeof DEMO_EMPLOYEE_IDS)[number];
    year: number;
    result: {
      overallResult: string;
      ratingBand: string;
      overallScore: number;
      award?: boolean;
      bonus?: number;
      promotion?: string;
      pip?: boolean;
      goalProgress: number;
    };
  }> = [
    {
      employeeId: "EMP000001",
      year: 2024,
      result: {
        overallResult: "Meets Expectations",
        ratingBand: "ME",
        overallScore: 3.7,
        bonus: 25000,
        goalProgress: 85,
      },
    },
    {
      employeeId: "EMP000001",
      year: 2025,
      result: {
        overallResult: "Meets Expectations",
        ratingBand: "ME",
        overallScore: 3.8,
        bonus: 30000,
        goalProgress: 90,
      },
    },
    {
      employeeId: "EMP000901",
      year: 2024,
      result: {
        overallResult: "Meets Expectations",
        ratingBand: "ME",
        overallScore: 3.6,
        goalProgress: 80,
      },
    },
    {
      employeeId: "EMP000901",
      year: 2025,
      result: {
        overallResult: "Exceeds Expectations",
        ratingBand: "EE",
        overallScore: 4.2,
        bonus: 40000,
        goalProgress: 95,
      },
    },
    {
      employeeId: "EMP000902",
      year: 2024,
      result: {
        overallResult: "Meets Expectations",
        ratingBand: "ME",
        overallScore: 3.5,
        goalProgress: 78,
      },
    },
    {
      employeeId: "EMP000902",
      year: 2025,
      result: {
        overallResult: "Meets Expectations",
        ratingBand: "ME",
        overallScore: 3.6,
        bonus: 20000,
        goalProgress: 82,
      },
    },
    {
      employeeId: "EMP000903",
      year: 2024,
      result: {
        overallResult: "Exceeds Expectations",
        ratingBand: "EE",
        overallScore: 4.3,
        award: true,
        bonus: 80000,
        goalProgress: 96,
      },
    },
    {
      employeeId: "EMP000903",
      year: 2025,
      result: {
        overallResult: "Outstanding",
        ratingBand: "O",
        overallScore: 4.5,
        award: true,
        bonus: 100000,
        promotion: "Senior Product Analyst",
        goalProgress: 100,
      },
    },
    {
      employeeId: "EMP000904",
      year: 2024,
      result: {
        overallResult: "Meets Expectations",
        ratingBand: "ME",
        overallScore: 3.2,
        goalProgress: 70,
      },
    },
    {
      employeeId: "EMP000904",
      year: 2025,
      result: {
        overallResult: "Needs Improvement",
        ratingBand: "NI",
        overallScore: 2.6,
        pip: true,
        goalProgress: 45,
      },
    },
  ];

  for (const profile of profiles) {
    const employee = byCode.get(profile.employeeId);
    const cycle = profile.year === 2024 ? cycle2024 : cycle2025;
    if (!employee) continue;
    await seedCycleHistoryForEmployee(prisma, {
      employee,
      supervisorId: supervisor.id,
      hrUserId: options.hrUserId,
      cycle,
      year: profile.year,
      result: profile.result,
    });
  }

  // Remaining employees currently reporting to the demo supervisor also
  // get two completed years so My Team history is not empty for them.
  const activeTeam = await prisma.employeeSupervisorAssignment.findMany({
    where: {
      supervisorId: supervisor.id,
      cycle: { status: "ACTIVE" },
      employee: { role: "EMPLOYEE" },
    },
    include: {
      employee: { select: { id: true, employeeId: true, name: true } },
    },
  });
  const demoSet = new Set<string>(DEMO_EMPLOYEE_IDS);
  for (const [index, row] of activeTeam.entries()) {
    if (demoSet.has(row.employee.employeeId)) continue;
    const pip = index % 9 === 0;
    const award = !pip && index % 6 === 0;
    for (const cycle of [cycle2024, cycle2025]) {
      await seedCycleHistoryForEmployee(prisma, {
        employee: row.employee,
        supervisorId: supervisor.id,
        hrUserId: options.hrUserId,
        cycle,
        year: cycle.year,
        result: {
          overallResult: pip
            ? "Needs Improvement"
            : award
              ? "Exceeds Expectations"
              : "Meets Expectations",
          ratingBand: pip ? "NI" : award ? "EE" : "ME",
          overallScore: pip ? 2.5 : award ? 4.3 : 3.6,
          award,
          bonus: award ? 50000 : 20000,
          pip,
          goalProgress: pip ? 48 : award ? 94 : 82,
        },
      });
    }
  }
}

/** Extra 2026 planning meetings so HR/supervisor calendars look established.
 * About three quarters of employees have a completed meeting; only ~10 remain
 * without a scheduled Performance Planning Meeting. */
export async function seedAdditionalPlanningMeetings(
  prisma: SeedClient,
  options: {
    hrUserId: string;
    cycleId: string;
    batches: Array<{ id: string; batchNumber: number }>;
  }
) {
  const assignments = await prisma.employeeSupervisorAssignment.findMany({
    where: { cycleId: options.cycleId, employee: { role: "EMPLOYEE" } },
    include: {
      employee: { select: { id: true, name: true, employeeId: true, role: true } },
    },
  });
  const batches = await prisma.employeeBatchAssignment.findMany({
    where: { cycleId: options.cycleId },
    select: { employeeId: true, batchId: true },
  });
  const batchByEmployee = new Map(batches.map((row) => [row.employeeId, row.batchId]));

  const existing = await prisma.meeting.findMany({
    where: {
      cycleId: options.cycleId,
      type: MeetingType.PERFORMANCE_PLANNING,
    },
    select: { employeeId: true, status: true },
  });
  const alreadyHasMeeting = new Set(existing.map((item) => item.employeeId));
  const alreadyCompleted = existing.filter((item) => item.status === MeetingStatus.COMPLETED).length;

  const candidates = assignments.filter(
    (row) =>
      row.employee.role === "EMPLOYEE" &&
      !alreadyHasMeeting.has(row.employee.id) &&
      batchByEmployee.has(row.employee.id)
  );

  const UNSCHEDULED = 10;
  const unscheduled = candidates.slice(-UNSCHEDULED);
  const unscheduledIds = new Set(unscheduled.map((row) => row.employee.id));
  const toCreate = candidates.filter((row) => !unscheduledIds.has(row.employee.id));

  const totalEmployees = assignments.length;
  const targetCompleted = Math.floor(totalEmployees * 0.75);
  let completedRemaining = Math.max(0, targetCompleted - alreadyCompleted);

  const rooms = ["Meeting Room A", "Meeting Room B", "Meeting Room C", "Teams / Hybrid", "Board Room"];

  async function chunked<T>(items: T[], size: number, fn: (item: T, index: number) => Promise<void>) {
    for (let index = 0; index < items.length; index += size) {
      const slice = items.slice(index, index + size);
      await Promise.all(slice.map((item, offset) => fn(item, index + offset)));
    }
  }

  await chunked(toCreate, 20, async (row, index) => {
    const completed = completedRemaining > 0;
    if (completed) completedRemaining -= 1;
    const isReschedule = !completed && index % 37 === 0;
    const month = completed ? 3 + (index % 4) : 8;
    const day = 4 + (index % 22);
    const hour = 4 + (index % 6);
    const scheduledAt = new Date(Date.UTC(2026, month, day, hour, 30));
    const meeting = await createPlanningMeeting(prisma, {
      employeeId: row.employee.id,
      supervisorId: row.supervisorId,
      hrUserId: options.hrUserId,
      cycleId: options.cycleId,
      batchId: batchByEmployee.get(row.employee.id)!,
      scheduledAt,
      status: completed ? MeetingStatus.COMPLETED : MeetingStatus.SCHEDULED,
      location: rooms[index % rooms.length],
      title: `Performance Planning Meeting — ${row.employee.name}`,
      notes: completed
        ? {
            discussionSummary: `Reviewed previous appraisal records and the last PDP with ${row.employee.name}. Agreed strengths, development needs, and the direction for this cycle.`,
            decisionsMade: "Proceed to PDP creation using the discussed department and company objectives.",
            previousAppraisalReviewed:
              "Previous cycle result, rating band, and supervisor comments were reviewed together.",
            previousAppraisalFindings: "Performance was used as the baseline for this year's goals.",
            employeeStrengths: "Reliable delivery and constructive collaboration with the assigned team.",
            employeeWeaknesses: "Selected development areas will be carried into the PDP.",
            performanceObservations: "Progress against last year's goals was discussed before setting new ones.",
            agreedOutcomes: "Meeting completed and recorded.",
          }
        : undefined,
    });

    if (completed) {
      await prisma.employeeCycleProgress.upsert({
        where: {
          cycleId_employeeId: { cycleId: options.cycleId, employeeId: row.employee.id },
        },
        update: {
          planningMeetingCompletedAt: scheduledAt,
          currentStage: BatchWorkflowStage.PDP_CREATION,
        },
        create: {
          employeeId: row.employee.id,
          cycleId: options.cycleId,
          batchId: batchByEmployee.get(row.employee.id)!,
          currentStage: BatchWorkflowStage.PDP_CREATION,
          planningMeetingCompletedAt: scheduledAt,
        },
      });
    }

    if (isReschedule) {
      await prisma.meeting.update({
        where: { id: meeting.id },
        data: { status: MeetingStatus.RESCHEDULE_REQUESTED },
      });
      await prisma.meetingParticipant.updateMany({
        where: { meetingId: meeting.id, employeeId: row.employee.id },
        data: {
          response: MeetingParticipantResponse.RESCHEDULE_REQUESTED,
          responseMessage: "Clash with a customer workshop already booked that morning.",
          respondedAt: utcDate(2026, 8, 26),
        },
      });
      await prisma.meetingRescheduleRequest.create({
        data: {
          meetingId: meeting.id,
          requesterId: row.employee.id,
          reason: "Clash with a customer workshop already booked that morning.",
          requestedStart: utcDate(2026, 9, 8),
          status: RescheduleRequestStatus.PENDING,
        },
      });
      await prisma.notification.create({
        data: {
          type: NotificationType.MEETING_RESCHEDULE_REQUEST,
          title: "Reschedule request awaiting review",
          message: `${row.employee.name} requested a new time for their Performance Planning Meeting.`,
          recipientId: options.hrUserId,
          subjectEmployeeId: row.employee.id,
          metadata: { meetingId: meeting.id },
          createdAt: utcDate(2026, 8, 26),
        },
      });
    } else if (!completed && index % 5 === 0) {
      await prisma.notification.createMany({
        data: [
          {
            type: NotificationType.MEETING_INVITATION,
            title: "Meeting confirmation required",
            message: `Performance Planning Meeting — ${row.employee.name} has been scheduled. Please confirm attendance or request a reschedule.`,
            recipientId: row.employee.id,
            subjectEmployeeId: row.employee.id,
            metadata: { meetingId: meeting.id },
            createdAt: utcDate(2026, 8, 20),
          },
          {
            type: NotificationType.MEETING_INVITATION,
            title: "Meeting confirmation required",
            message: `Performance Planning Meeting — ${row.employee.name} has been scheduled. Please confirm attendance or request a reschedule.`,
            recipientId: row.supervisorId,
            subjectEmployeeId: row.employee.id,
            metadata: { meetingId: meeting.id },
            createdAt: utcDate(2026, 8, 20),
          },
        ],
      });
    }
  });

  // A small draft PDP so the demo supervisor can resume work later.
  const supervisor = await prisma.employee.findUnique({ where: { employeeId: "SUP000001" } });
  if (supervisor) {
    const draftMember = toCreate.find(
      (row) =>
        row.supervisorId === supervisor.id &&
        !DEMO_EMPLOYEE_IDS.includes(row.employee.employeeId as (typeof DEMO_EMPLOYEE_IDS)[number])
    );
    if (draftMember) {
      const completedMeeting = await prisma.meeting.findFirst({
        where: {
          employeeId: draftMember.employee.id,
          cycleId: options.cycleId,
          type: MeetingType.PERFORMANCE_PLANNING,
          status: MeetingStatus.COMPLETED,
        },
      });
      if (completedMeeting) {
        await createPdp(prisma, {
          employeeId: draftMember.employee.id,
          supervisorId: supervisor.id,
          hrUserId: options.hrUserId,
          cycleId: options.cycleId,
          batchId: batchByEmployee.get(draftMember.employee.id)!,
          status: PdpStatus.DRAFT,
          planningMeetingId: completedMeeting.id,
          createdAt: utcDate(2026, 8, 15),
          goalProgress: 0,
          goalCount: 10,
        });
      }
    }
  }

  const extrasToLeaveOpen = await prisma.meeting.findMany({
    where: {
      cycleId: options.cycleId,
      type: MeetingType.PERFORMANCE_PLANNING,
      status: MeetingStatus.SCHEDULED,
      employee: { employeeId: { notIn: [...DEMO_EMPLOYEE_IDS] } },
    },
    select: { id: true },
    take: 10,
    orderBy: { createdAt: "desc" },
  });
  if (extrasToLeaveOpen.length > 0) {
    const ids = extrasToLeaveOpen.map((item) => item.id);
    await prisma.meeting.deleteMany({ where: { id: { in: ids } } });
  }
}
