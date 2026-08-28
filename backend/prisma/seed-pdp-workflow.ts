/**
 * Rebuilds current-cycle PDP workflow data only.
 * Historical cycle PDPs used by appraisal history are left in place.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  NotificationType,
  PdpActivityType,
  PdpGoalStatus,
  PdpReviewKind,
  PdpStatus,
  type PrismaClient,
} from "../generated/prisma/client.js";

const DEMO_CODES = ["EMP000001", "EMP000901", "EMP000902", "EMP000903", "EMP000904"] as const;
const MIN_GOALS = 40;
const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const evidenceDir = path.resolve(moduleDir, "../uploads/evidence");

type GoalSpec = {
  title: string;
  objective: string;
  category: "Technical" | "Behavioural";
  priority: "LOW" | "MEDIUM" | "HIGH";
};

const ROLE_GOALS: Record<string, GoalSpec[]> = {
  "Software Engineer": softwareGoals(),
  "QA Engineer": qaGoals(),
  "IT Support Specialist": itGoals(),
  "Product Analyst": productGoals(),
  "Cloud Engineer": cloudGoals(),
};

function softwareGoals(): GoalSpec[] {
  return bank("engineering", [
    "Raise unit-test coverage on the employee module",
    "Practice threat modelling on one feature",
    "Improve accessibility of a user-facing screen",
    "Standardize local environment configuration",
    "Close security findings assigned to the squad",
    "Document the PDP API contracts",
    "Reduce frontend bundle size for My PDP",
    "Pair-review TypeScript strictness issues",
    "Build a reusable progress-bar component",
    "Improve error handling in PDP services",
    "Learn advanced React query patterns",
    "Mentor a junior engineer for one sprint",
    "Improve code review turnaround",
    "Write ADRs for PDP workflow decisions",
    "Harden JWT session handling",
    "Optimize Prisma queries on the PDP list",
    "Add integration tests for approval flow",
    "Improve logging around notifications",
    "Refactor goal serialization helpers",
    "Ship keyboard navigation for tables",
    "Reduce duplicate CSS utilities",
    "Practice incident response with the squad",
    "Improve API validation messages",
    "Build a feature flag for dashboard rollout",
    "Document local seed and reset scripts",
    "Improve TypeScript types for PDP records",
    "Profile slow dashboard queries",
    "Implement optimistic UI for progress updates",
    "Improve file-upload error recovery",
    "Align naming with corporate UI tokens",
    "Complete a secure coding checklist",
    "Improve dark-mode contrast on PDP cards",
    "Add empty states for missing PDPs",
    "Shadow a product grooming session",
    "Improve Git commit message discipline",
    "Lead a retro action to reduce defects",
    "Practice system design for notifications",
    "Improve database index usage on goals",
    "Write a runbook for PDP assignment",
    "Deliver a brown-bag on Prisma transactions",
  ]);
}

function qaGoals(): GoalSpec[] {
  return bank("quality", [
    "Expand regression coverage for PDP approval",
    "Automate smoke tests for employee login",
    "Build a defect taxonomy for PDP defects",
    "Improve exploratory testing of My PDP",
    "Create test data for all five PDP stages",
    "Validate accessibility on status badges",
    "Write API contract tests for /pdp/me",
    "Track escaped defects from last cycle",
    "Pair with engineering on flaky tests",
    "Document test evidence for each goal",
    "Practice risk-based test planning",
    "Improve Jira defect quality",
    "Add visual checks for dashboard cards",
    "Validate file-upload size limits",
    "Test change-request comments end to end",
    "Create a checklist for HR approval",
    "Automate role-permission negative tests",
    "Review production logs for PDP errors",
    "Improve mobile viewport test coverage",
    "Validate calendar indicators",
    "Test supervisor team-scoping rules",
    "Build a performance budget for lists",
    "Shadow a planning meeting",
    "Improve bug reproduction templates",
    "Validate notification deep links",
    "Test draft save with 40 goals",
    "Create a UAT script for lecturers",
    "Check evidence download permissions",
    "Verify sequential approval cannot skip HR",
    "Test search on PDP Management",
    "Validate pagination on HR PDP list",
    "Add security tests for IDOR on PDPs",
    "Review seed data realism",
    "Improve test environment reset notes",
    "Pair on Playwright coverage",
    "Document known PDP test gaps",
    "Practice facilitating a bug triage",
    "Improve communication of risk to HR",
    "Validate completed-goal filters",
    "Lead a quality demo of the PDP module",
  ]);
}

function itGoals(): GoalSpec[] {
  return bank("support", [
    "Reduce laptop onboarding time",
    "Document VPN troubleshooting steps",
    "Improve first-contact resolution",
    "Build a knowledge base for PDP access issues",
    "Practice customer communication scripts",
    "Track recurring password-reset tickets",
    "Improve hardware inventory accuracy",
    "Shadow a security awareness session",
    "Create a runbook for locked accounts",
    "Improve SLA reporting to HR",
    "Learn PowerShell automation basics",
    "Improve asset tagging process",
    "Document printer and meeting-room support",
    "Practice de-escalation with frustrated users",
    "Reduce ticket reopen rate",
    "Build a checklist for new joiner kits",
    "Improve remote-support tooling",
    "Validate MFA enrollment steps",
    "Create a FAQ for PerformX login",
    "Improve ticket categorization",
    "Partner with HR on access requests",
    "Measure mean time to resolve",
    "Improve weekend on-call notes",
    "Learn basic networking diagnostics",
    "Document common Outlook issues",
    "Improve spare-device turnaround",
    "Practice writing clear ticket updates",
    "Review endpoint patch compliance",
    "Create a phishing-report playbook",
    "Improve desk-side support etiquette",
    "Shadow a supervisor during PDP creation",
    "Train two colleagues on the knowledge base",
    "Improve queue monitoring dashboards",
    "Reduce duplicate tickets",
    "Validate software license records",
    "Improve handover between shifts",
    "Practice presenting monthly IT metrics",
    "Document guest Wi-Fi support",
    "Improve backup verification checks",
    "Lead a lunch-and-learn on IT hygiene",
  ]);
}

function productGoals(): GoalSpec[] {
  return bank("product", [
    "Write problem statements for PDP adoption",
    "Map employee journey across approval stages",
    "Facilitate a discovery interview with HR",
    "Improve acceptance criteria quality",
    "Build a metrics dashboard for PDP completion",
    "Prioritize change-request pain points",
    "Document competitive research notes",
    "Practice stakeholder storytelling",
    "Refine the PDP dashboard MVP scope",
    "Improve backlog hygiene",
    "Run a usability test of My PDP",
    "Write release notes for lecturers",
    "Align goals with company OKRs",
    "Create a risk log for PDP rollout",
    "Improve epic slicing for 40-goal constraint",
    "Partner with design on status badges",
    "Measure time-to-approval",
    "Document edge cases for unassigned PDPs",
    "Practice saying no to scope creep",
    "Improve PRD templates",
    "Shadow a supervisor creating a draft",
    "Collect qualitative feedback from QA",
    "Define success metrics for evidence uploads",
    "Improve cross-functional stand-up notes",
    "Map dependencies with meetings module",
    "Create a demo script of the full workflow",
    "Improve experiment tracking",
    "Write a one-pager on role permissions",
    "Facilitate a prioritization workshop",
    "Improve customer interview notes",
    "Track feature adoption after assignment",
    "Document analytics events for progress",
    "Practice executive summaries for HR",
    "Improve roadmap communication",
    "Validate copy for Request Changes",
    "Create a glossary of PDP statuses",
    "Partner with engineering on estimate quality",
    "Improve discovery-to-delivery handoff",
    "Lead a retro on the last release",
    "Present PDP outcomes to leadership",
  ]);
}

function cloudGoals(): GoalSpec[] {
  return bank("cloud", [
    "Harden production environment variables",
    "Improve Postgres backup verification",
    "Document Kubernetes rollout steps",
    "Reduce container image size",
    "Practice incident response for API outages",
    "Improve observability of PDP endpoints",
    "Add alerts for failed evidence uploads",
    "Review IAM least-privilege on storage",
    "Improve blue-green deploy notes",
    "Optimize database connection pooling",
    "Document disaster-recovery for Prisma",
    "Improve TLS certificate rotation",
    "Practice cost-control reviews",
    "Add health checks for the seed job",
    "Improve log retention policy",
    "Automate staging refresh",
    "Review network policies",
    "Improve secret rotation process",
    "Create a capacity plan for 40-goal PDPs",
    "Shadow a security pen-test readout",
    "Improve CI cache usage",
    "Document runbooks for 5xx spikes",
    "Practice chaos testing on notifications",
    "Improve S3 lifecycle for evidence",
    "Validate backup restore quarterly",
    "Reduce cold-start on the API",
    "Improve staging parity with production",
    "Write a postmortem template",
    "Improve tagging of cloud resources",
    "Partner with engineering on query plans",
    "Add synthetic checks for /pdp/me",
    "Improve on-call rotation notes",
    "Learn one new observability dashboard",
    "Harden CORS and cookie flags",
    "Document local Docker alternatives",
    "Improve migration rollback steps",
    "Review WAF rules",
    "Practice communicating outages to HR",
    "Improve SLO definitions for PDP APIs",
    "Lead a reliability brown-bag",
  ]);
}

function bank(area: string, titles: string[]): GoalSpec[] {
  const filled = [...titles];
  while (filled.length < MIN_GOALS) {
    filled.push(`${titles[filled.length % titles.length]} (${filled.length + 1})`);
  }
  return filled.slice(0, MIN_GOALS).map((title, index) => ({
    title,
    objective: `Role-specific development work in ${area}: ${title.toLowerCase()}. Progress will be evidenced at follow-up meetings.`,
    category: index % 3 === 1 ? "Behavioural" : "Technical",
    priority: index % 9 === 0 ? "HIGH" : index % 4 === 0 ? "LOW" : "MEDIUM",
  }));
}

function goalsFor(jobTitle: string | null, department: string | null): GoalSpec[] {
  if (jobTitle && ROLE_GOALS[jobTitle]) return ROLE_GOALS[jobTitle];
  const dept = department ?? "General";
  return Array.from({ length: MIN_GOALS }, (_, index) => ({
    title: `${dept} development goal ${index + 1}`,
    objective: `Build capability for a ${jobTitle ?? dept} in ${dept}, focusing on measurable improvement ${index + 1}.`,
    category: index % 2 === 0 ? "Technical" : "Behavioural",
    priority: index % 8 === 0 ? "HIGH" : "MEDIUM",
  }));
}

function weight() {
  return Number((100 / MIN_GOALS).toFixed(2));
}

function due(offsetDays: number) {
  const date = new Date(Date.UTC(2026, 7, 12));
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date;
}

export async function seedPdpWorkflow(prisma: PrismaClient) {
  const cycle = await prisma.appraisalCycle.findFirst({ where: { status: "ACTIVE" } });
  if (!cycle) {
    console.log("No active cycle — skipped PDP workflow seed.");
    return;
  }

  const existing = await prisma.personalDevelopmentPlan.findMany({
    where: { cycleId: cycle.id },
    select: { id: true },
  });
  const ids = existing.map((item) => item.id);
  if (ids.length) {
    await prisma.pdpActivity.deleteMany({ where: { pdpId: { in: ids } } });
    await prisma.pdpGoalComment.deleteMany({ where: { pdpId: { in: ids } } });
    await prisma.pdpReviewComment.deleteMany({ where: { pdpId: { in: ids } } });
    await prisma.pdpEvidence.deleteMany({ where: { pdpId: { in: ids } } });
    await prisma.pdpGoal.deleteMany({ where: { pdpId: { in: ids } } });
    await prisma.personalDevelopmentPlan.deleteMany({ where: { id: { in: ids } } });
  }
  await prisma.notification.deleteMany({
    where: {
      type: {
        in: [
          NotificationType.PDP_APPROVED,
          NotificationType.PDP_SUBMITTED,
          NotificationType.PDP_HR_FEEDBACK,
          NotificationType.PDP_EMPLOYEE_RESPONSE,
          NotificationType.PDP_CHANGES_REQUESTED,
          NotificationType.PDP_INTERVENTION_REQUIRED,
          NotificationType.PDP_ASSIGNED,
          NotificationType.PDP_REDIRECTED,
        ],
      },
    },
  });

  const supervisor = await prisma.employee.findUniqueOrThrow({ where: { employeeId: "SUP000001" } });
  const hr = await prisma.employee.findFirstOrThrow({ where: { role: "HR" } });
  const demoEmployees = await prisma.employee.findMany({
    where: { employeeId: { in: [...DEMO_CODES] } },
    include: { department: true },
  });
  const byCode = new Map(demoEmployees.map((item) => [item.employeeId, item]));

  async function assignment(employeeId: string) {
    const row = await prisma.employeeBatchAssignment.findUnique({
      where: { cycleId_employeeId: { cycleId: cycle.id, employeeId } },
    });
    if (!row) throw new Error(`Missing batch assignment for ${employeeId}`);
    return row.batchId;
  }

  async function createPlan(options: {
    employee: (typeof demoEmployees)[number];
    status: PdpStatus;
    goalCount: number;
    progressFor?: (index: number) => number;
    employeeAgreedAt?: Date | null;
    hrReviewedAt?: Date | null;
    assignedAt?: Date | null;
    summary: string;
    employeeChangeRequest?: string | null;
    hrChangeRequest?: string | null;
  }) {
    const specs = goalsFor(options.employee.jobTitle, options.employee.department?.name).slice(0, options.goalCount);
    const now = new Date();
    const pdp = await prisma.personalDevelopmentPlan.create({
      data: {
        employeeId: options.employee.id,
        supervisorId: supervisor.id,
        createdById: supervisor.id,
        cycleId: cycle.id,
        batchId: await assignment(options.employee.id),
        status: options.status,
        summary: options.summary,
        employeeAgreedAt: options.employeeAgreedAt ?? null,
        hrReviewedAt: options.hrReviewedAt ?? null,
        assignedAt: options.assignedAt ?? null,
        approvedAt: options.hrReviewedAt ?? null,
        approvedById: options.hrReviewedAt ? hr.id : null,
        employeeChangeRequest: options.employeeChangeRequest ?? null,
        hrChangeRequest: options.hrChangeRequest ?? null,
        createdAt: now,
        goals: {
          create: specs.map((goal, index) => {
            const progress = options.progressFor?.(index) ?? 0;
            return {
              title: goal.title,
              objective: goal.objective,
              category: goal.category,
              developmentArea: goal.category,
              priority: goal.priority,
              weightage: weight(),
              notes: `Agreed with ${supervisor.name} for ${options.employee.jobTitle}.`,
              dueDate: due(20 + (index % 12) * 7),
              startDate: cycle.startDate,
              progress,
              status:
                progress >= 100 ? PdpGoalStatus.COMPLETED : progress > 0 ? PdpGoalStatus.IN_PROGRESS : PdpGoalStatus.NOT_STARTED,
              sortOrder: index,
            };
          }),
        },
      },
    });
    return pdp;
  }

  const alex = byCode.get("EMP000001")!;
  const nethmi = byCode.get("EMP000901")!;
  const kevin = byCode.get("EMP000902")!;
  const amaya = byCode.get("EMP000903")!;
  const ryan = byCode.get("EMP000904")!;

  const alexPdp = await createPlan({
    employee: alex,
    status: PdpStatus.DRAFT,
    goalCount: 18,
    summary: "PDP for Alex Perera (Software Engineer) is still being created after the planning discussion.",
  });
  await prisma.pdpActivity.create({
    data: {
      pdpId: alexPdp.id,
      actorId: supervisor.id,
      type: PdpActivityType.PDP_CREATED,
      message: `${supervisor.name} started a PDP draft for ${alex.name}.`,
    },
  });

  const nethmiPdp = await createPlan({
    employee: nethmi,
    status: PdpStatus.PENDING_EMPLOYEE_REVIEW,
    goalCount: MIN_GOALS,
    summary: "PDP for Nethmi Silva (QA Engineer) after the performance planning meeting. Waiting for employee approval.",
  });
  await prisma.notification.create({
    data: {
      type: NotificationType.PDP_SUBMITTED,
      title: "PDP submitted for your approval",
      message: `${supervisor.name} submitted your Personal Development Plan. Please review it and approve or request changes.`,
      recipientId: nethmi.id,
      subjectEmployeeId: nethmi.id,
      metadata: { pdpId: nethmiPdp.id },
    },
  });
  await prisma.pdpActivity.create({
    data: {
      pdpId: nethmiPdp.id,
      actorId: supervisor.id,
      type: PdpActivityType.PDP_SUBMITTED,
      message: `${supervisor.name} submitted the PDP for employee approval.`,
    },
  });

  const kevinPdp = await createPlan({
    employee: kevin,
    status: PdpStatus.PENDING_HR_REVIEW,
    goalCount: MIN_GOALS,
    employeeAgreedAt: new Date(Date.UTC(2026, 7, 18)),
    summary: "PDP for Kevin Fernando (IT Support Specialist) after the performance planning meeting. Waiting for HR approval.",
  });
  await prisma.pdpReviewComment.create({
    data: {
      pdpId: kevinPdp.id,
      authorId: kevin.id,
      kind: PdpReviewKind.EMPLOYEE_AGREEMENT,
      message: "I approve this IT support development plan.",
    },
  });
  await prisma.notification.createMany({
    data: [
      {
        type: NotificationType.PDP_EMPLOYEE_RESPONSE,
        title: "Employee approved the PDP",
        message: `${kevin.name} approved their PDP. It is now waiting for HR approval.`,
        recipientId: supervisor.id,
        subjectEmployeeId: kevin.id,
        metadata: { pdpId: kevinPdp.id },
      },
      {
        type: NotificationType.PDP_SUBMITTED,
        title: "PDP waiting for HR approval",
        message: `${kevin.name} approved their PDP. Please review it in PDP Management.`,
        recipientId: hr.id,
        subjectEmployeeId: kevin.id,
        metadata: { pdpId: kevinPdp.id },
      },
    ],
  });

  const amayaPdp = await createPlan({
    employee: amaya,
    status: PdpStatus.ASSIGNED,
    goalCount: MIN_GOALS,
    employeeAgreedAt: new Date(Date.UTC(2026, 6, 20)),
    hrReviewedAt: new Date(Date.UTC(2026, 6, 28)),
    assignedAt: new Date(Date.UTC(2026, 6, 28)),
    summary: "PDP for Amaya Peris (Product Analyst) after the performance planning meeting.",
    progressFor: (index) => (index < 8 ? 100 : index < 22 ? 55 + (index % 5) * 5 : 0),
  });
  const ryanPdp = await createPlan({
    employee: ryan,
    status: PdpStatus.ASSIGNED,
    goalCount: MIN_GOALS,
    employeeAgreedAt: new Date(Date.UTC(2026, 5, 12)),
    hrReviewedAt: new Date(Date.UTC(2026, 5, 20)),
    assignedAt: new Date(Date.UTC(2026, 5, 20)),
    summary: "PDP for Ryan De Silva (Cloud Engineer) after the performance planning meeting.",
    progressFor: (index) => (index < 16 ? 100 : index < 30 ? 70 : 25),
  });

  fs.mkdirSync(evidenceDir, { recursive: true });
  async function attachEvidence(pdpId: string, employeeId: string, fileName: string, goalIndex: number) {
    const pdp = await prisma.personalDevelopmentPlan.findUniqueOrThrow({
      where: { id: pdpId },
      include: { goals: { orderBy: { sortOrder: "asc" } } },
    });
    const goal = pdp.goals[goalIndex];
    if (!goal) return;
    const storedName = `${pdpId}-${goalIndex}.txt`;
    fs.writeFileSync(path.join(evidenceDir, storedName), `Evidence: ${fileName}`);
    await prisma.pdpEvidence.create({
      data: {
        pdpId,
        goalId: goal.id,
        uploadedById: employeeId,
        fileName,
        storedName,
        mimeType: "text/plain",
      },
    });
    await prisma.pdpGoalComment.create({
      data: {
        pdpId,
        goalId: goal.id,
        authorId: employeeId,
        message: `Working through ${goal.title}. Sharing the latest evidence.`,
      },
    });
    await prisma.pdpActivity.create({
      data: {
        pdpId,
        actorId: employeeId,
        goalId: goal.id,
        type: PdpActivityType.EVIDENCE_UPLOADED,
        message: `Evidence uploaded for '${goal.title}'.`,
      },
    });
  }

  await attachEvidence(amayaPdp.id, amaya.id, "discovery-interview-notes.txt", 2);
  await attachEvidence(amayaPdp.id, amaya.id, "pdp-journey-map.pdf", 1);
  await attachEvidence(ryanPdp.id, ryan.id, "backup-verification-log.txt", 1);
  await attachEvidence(ryanPdp.id, ryan.id, "observability-dashboard.png", 6);
  await attachEvidence(ryanPdp.id, ryan.id, "incident-response-drill.txt", 4);

  await prisma.pdpActivity.createMany({
    data: [
      {
        pdpId: amayaPdp.id,
        actorId: hr.id,
        type: PdpActivityType.PDP_ASSIGNED,
        message: `PDP assigned to ${amaya.name}.`,
      },
      {
        pdpId: amayaPdp.id,
        actorId: amaya.id,
        type: PdpActivityType.PROGRESS_UPDATED,
        message: "Progress updated for 'Map employee journey across approval stages'.",
      },
      {
        pdpId: ryanPdp.id,
        actorId: hr.id,
        type: PdpActivityType.PDP_ASSIGNED,
        message: `PDP assigned to ${ryan.name}.`,
      },
      {
        pdpId: ryanPdp.id,
        actorId: ryan.id,
        type: PdpActivityType.PROGRESS_UPDATED,
        message: "Progress updated for 'Improve observability of PDP endpoints'.",
      },
    ],
  });
  await prisma.notification.createMany({
    data: [
      {
        type: NotificationType.PDP_ASSIGNED,
        title: "PDP assigned",
        message: `Your Personal Development Plan for ${cycle.name} is now assigned.`,
        recipientId: amaya.id,
        subjectEmployeeId: amaya.id,
        metadata: { pdpId: amayaPdp.id },
      },
      {
        type: NotificationType.PDP_ASSIGNED,
        title: "PDP assigned",
        message: `Your Personal Development Plan for ${cycle.name} is now assigned.`,
        recipientId: ryan.id,
        subjectEmployeeId: ryan.id,
        metadata: { pdpId: ryanPdp.id },
      },
    ],
  });

  const assignedEmployees = await prisma.employeeBatchAssignment.findMany({
    where: { cycleId: cycle.id, employee: { role: "EMPLOYEE", employeeId: { notIn: [...DEMO_CODES] } } },
    include: {
      employee: { include: { department: true } },
    },
    take: 250,
  });
  const supervisors = await prisma.employeeSupervisorAssignment.findMany({
    where: { cycleId: cycle.id },
    select: { employeeId: true, supervisorId: true },
  });
  const supervisorByEmployee = new Map(supervisors.map((row) => [row.employeeId, row.supervisorId]));

  const statuses: PdpStatus[] = [
    ...Array.from({ length: 4 }, () => PdpStatus.DRAFT),
    ...Array.from({ length: 90 }, () => PdpStatus.PENDING_EMPLOYEE_REVIEW),
    ...Array.from({ length: 90 }, () => PdpStatus.PENDING_HR_REVIEW),
    ...Array.from({ length: 12 }, () => PdpStatus.CHANGES_REQUESTED_BY_EMPLOYEE),
    ...Array.from({ length: 8 }, () => PdpStatus.CHANGES_REQUESTED_BY_HR),
    ...Array.from({ length: 1 }, () => PdpStatus.COMPLETED),
    ...Array.from({ length: 215 }, () => PdpStatus.ASSIGNED),
  ];

  for (let index = 0; index < assignedEmployees.length; index += 1) {
    const row = assignedEmployees[index];
    const status = statuses[index] ?? PdpStatus.ASSIGNED;
    const supervisorId = supervisorByEmployee.get(row.employeeId) ?? supervisor.id;
    const specs = goalsFor(row.employee.jobTitle, row.employee.department?.name);
    const employeeAgreedAt =
      status === PdpStatus.PENDING_HR_REVIEW ||
      status === PdpStatus.CHANGES_REQUESTED_BY_HR ||
      status === PdpStatus.ASSIGNED ||
      status === PdpStatus.COMPLETED
        ? new Date(Date.UTC(2026, 6, 1))
        : null;
    const hrReviewedAt = status === PdpStatus.ASSIGNED || status === PdpStatus.COMPLETED ? new Date(Date.UTC(2026, 6, 15)) : null;
    const created = await prisma.personalDevelopmentPlan.create({
      data: {
        employeeId: row.employeeId,
        supervisorId,
        createdById: supervisorId,
        cycleId: cycle.id,
        batchId: row.batchId,
        status,
        summary: `Development plan for ${row.employee.name} (${row.employee.jobTitle ?? "Employee"}).`,
        employeeAgreedAt,
        hrReviewedAt,
        assignedAt: status === PdpStatus.ASSIGNED || status === PdpStatus.COMPLETED ? hrReviewedAt : null,
        employeeChangeRequest:
          status === PdpStatus.CHANGES_REQUESTED_BY_EMPLOYEE
            ? "Please replace two generic goals with role-specific stretch work."
            : null,
        hrChangeRequest:
          status === PdpStatus.CHANGES_REQUESTED_BY_HR ? "Please balance technical and behavioural weightage." : null,
        goals: {
          create: specs.map((goal, goalIndex) => ({
            title: goal.title,
            objective: goal.objective,
            category: goal.category,
            developmentArea: goal.category,
            priority: goal.priority,
            weightage: weight(),
            dueDate: due(14 + (goalIndex % 10) * 10),
            progress: status === PdpStatus.ASSIGNED || status === PdpStatus.COMPLETED ? (goalIndex * 7) % 100 : 0,
            status:
              status === PdpStatus.COMPLETED
                ? PdpGoalStatus.COMPLETED
                : (goalIndex * 7) % 100 >= 100
                  ? PdpGoalStatus.COMPLETED
                  : PdpGoalStatus.NOT_STARTED,
            sortOrder: goalIndex,
          })),
        },
      },
    });
    if (index % 50 === 0) {
      console.log(`Seeded org PDPs ${index + 1}/${assignedEmployees.length} (latest ${created.employeeId})`);
    }
  }

  console.log("Current-cycle PDP workflow data rebuilt.");
}

if (process.argv[1] && path.basename(process.argv[1]).includes("seed-pdp-workflow")) {
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const { PrismaClient } = await import("../generated/prisma/client.js");
  const { default: dotenv } = await import("dotenv/config");
  void dotenv;
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });
  seedPdpWorkflow(prisma)
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
