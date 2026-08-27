/**
 * Workforce and authentication seed.
 * Do NOT use these credentials in production.
 *
 * Run with: npm run db:seed
 *
 * Dataset targets:
 * - 15 departments
 * - ~900 EMPLOYEE records plus supervisors, HR, and leadership
 * - Persistent batch and supervisor assignments for each appraisal cycle
 * - Completed cycles for 2022–2025, 2026 ACTIVE, and 2027 UPCOMING
 * - Staggered 2026 batch progress and five named employee scenarios
 *
 * Re-runs skip existing employee IDs and rebuild cycle assignments only.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Role } from "../generated/prisma/client.js";
import bcrypt from "bcrypt";
import {
  applyCompletedBatchProgress,
  applyCurrentCycleBatchProgress,
  seedCycleHistoriesAndOutcomes,
  seedDemoEmployeeScenarios,
  seedNeedsAssignmentJoiners,
} from "./seed-appraisal-data.js";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

const DEV_PASSWORD = "DevTest@2026";
const CHUNK_SIZE = 100;

const DEPARTMENT_PLAN: Array<{
  name: string;
  supervisors: number;
  employees: number;
}> = [
  { name: "Engineering", supervisors: 28, employees: 120 },
  { name: "Information Technology", supervisors: 22, employees: 90 },
  { name: "Product Management", supervisors: 10, employees: 40 },
  { name: "Quality Assurance", supervisors: 14, employees: 55 },
  { name: "DevOps / Cloud", supervisors: 12, employees: 45 },
  { name: "Cybersecurity", supervisors: 8, employees: 28 },
  { name: "Data & Analytics", supervisors: 12, employees: 48 },
  { name: "UI/UX Design", supervisors: 8, employees: 30 },
  { name: "Human Resources", supervisors: 6, employees: 22 },
  { name: "Finance", supervisors: 10, employees: 40 },
  { name: "Sales", supervisors: 12, employees: 50 },
  { name: "Marketing", supervisors: 8, employees: 35 },
  { name: "Customer Success", supervisors: 8, employees: 32 },
  { name: "Operations", supervisors: 8, employees: 38 },
  { name: "Administration", supervisors: 4, employees: 20 },
];

const FIRST_NAMES = [
  "Nimal", "Kavindu", "Sarah", "Anita", "Mohamed", "Ayesha", "Rizwan",
  "Tharushi", "Dinesh", "Ishara", "Priyan", "Malsha", "Hasan", "Nadeesha",
  "Chamath", "Fathima", "Ruwan", "Sanduni", "Lakshan", "Dilini", "Yasith",
  "Harini", "Sanjaya", "Meera", "Kasun", "Amaya", "Nuwan", "Shenali",
  "Ishan", "Rashmi", "Gihan", "Thilini", "Arjun", "Nethmi", "Sahan",
];

const LAST_NAMES = [
  "Fernando", "Perera", "Rahman", "De Silva", "Jayawardena", "Gunasekara",
  "Bandara", "Wickramasinghe", "Hassan", "Rajapaksha", "Silva", "Dissanayake",
  "Karunaratne", "Mendis", "Abeysekera", "Pathirana", "Weerasinghe", "Cooray",
  "Samarasinghe", "Herath",
];

const JOB_TITLES: Record<string, string> = {
  Engineering: "Software Engineer",
  "Information Technology": "Systems Analyst",
  "Product Management": "Product Analyst",
  "Quality Assurance": "QA Engineer",
  "DevOps / Cloud": "Cloud Engineer",
  Cybersecurity: "Security Analyst",
  "Data & Analytics": "Data Analyst",
  "UI/UX Design": "Product Designer",
  "Human Resources": "HR Specialist",
  Finance: "Finance Analyst",
  Sales: "Account Executive",
  Marketing: "Marketing Specialist",
  "Customer Success": "Customer Success Specialist",
  Operations: "Operations Coordinator",
  Administration: "Administrative Officer",
};

/** Additional EMPLOYEE records so the workforce reaches ~900 without shifting existing IDs. */
const EXTRA_EMPLOYEES_BY_DEPT: Record<string, number> = {
  Engineering: 36,
  "Information Technology": 27,
  "Product Management": 12,
  "Quality Assurance": 16,
  "DevOps / Cloud": 13,
  Cybersecurity: 8,
  "Data & Analytics": 14,
  "UI/UX Design": 9,
  "Human Resources": 7,
  Finance: 12,
  Sales: 15,
  Marketing: 10,
  "Customer Success": 10,
  Operations: 11,
  Administration: 7,
};

function mulberry32(seed: number) {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pad(value: number, size = 6) {
  return String(value).padStart(size, "0");
}

function addOneYear(date: Date) {
  const result = new Date(date);
  result.setFullYear(result.getFullYear() + 1);
  return result;
}

function utcDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day));
}

async function main() {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 12);
  const random = mulberry32(360);

  const departmentRecords = [];
  for (const department of DEPARTMENT_PLAN) {
    const record = await prisma.department.upsert({
      where: { name: department.name },
      update: {},
      create: { name: department.name },
    });
    departmentRecords.push({ ...department, id: record.id });
  }

  const hrDept = departmentRecords.find((item) => item.name === "Human Resources")!;
  const engineering = departmentRecords.find((item) => item.name === "Engineering")!;

  const reservedEmployeeIds = new Set([
    "EMP000001",
    "SUP000001",
    "HR000001",
    "LED000001",
    "EMP000901",
    "EMP000902",
    "EMP000903",
    "EMP000904",
  ]);

  const namedAccounts = [
    {
      employeeId: "EMP000001",
      name: "Alex Perera",
      role: "EMPLOYEE" as const,
      jobTitle: "Software Engineer",
      companyEmail: "alex.perera@altrium.local",
      departmentId: engineering.id,
    },
    {
      employeeId: "SUP000001",
      name: "Sarah Fernando",
      role: "SUPERVISOR" as const,
      jobTitle: "Engineering Supervisor",
      companyEmail: "sarah.fernando@altrium.local",
      departmentId: engineering.id,
    },
    {
      employeeId: "HR000001",
      name: "HR Administrator",
      role: "HR" as const,
      jobTitle: "HR Administrator",
      companyEmail: "hr.admin@altrium.local",
      departmentId: hrDept.id,
    },
    {
      employeeId: "LED000001",
      name: "Daniel Perera",
      role: "LEADERSHIP" as const,
      jobTitle: "Head of Engineering",
      companyEmail: "daniel.perera@altrium.local",
      departmentId: engineering.id,
    },
    {
      employeeId: "EMP000901",
      name: "Nethmi Silva",
      role: "EMPLOYEE" as const,
      jobTitle: "QA Engineer",
      companyEmail: "nethmi.silva@altrium.local",
      departmentId: departmentRecords.find((item) => item.name === "Quality Assurance")!.id,
    },
    {
      employeeId: "EMP000902",
      name: "Kevin Fernando",
      role: "EMPLOYEE" as const,
      jobTitle: "IT Support Specialist",
      companyEmail: "kevin.fernando@altrium.local",
      departmentId: departmentRecords.find((item) => item.name === "Information Technology")!.id,
    },
    {
      employeeId: "EMP000903",
      name: "Amaya Peris",
      role: "EMPLOYEE" as const,
      jobTitle: "Product Analyst",
      companyEmail: "amaya.peris@altrium.local",
      departmentId: departmentRecords.find((item) => item.name === "Product Management")!.id,
    },
    {
      employeeId: "EMP000904",
      name: "Ryan De Silva",
      role: "EMPLOYEE" as const,
      jobTitle: "Cloud Engineer",
      companyEmail: "ryan.desilva@altrium.local",
      departmentId: departmentRecords.find((item) => item.name === "DevOps / Cloud")!.id,
    },
  ];

  for (const employee of namedAccounts) {
    await prisma.employee.upsert({
      where: { employeeId: employee.employeeId },
      update: {
        passwordHash,
        name: employee.name,
        role: employee.role,
        jobTitle: employee.jobTitle,
        companyEmail: employee.companyEmail,
        departmentId: employee.departmentId,
      },
      create: { ...employee, passwordHash },
    });
  }

  const extraHrAccounts = [
    {
      employeeId: "HR000002",
      name: "Priya Jayawardena",
      jobTitle: "HR Business Partner",
    },
    {
      employeeId: "HR000003",
      name: "Rohan Bandara",
      jobTitle: "HR Operations Lead",
    },
    {
      employeeId: "HR000004",
      name: "Fathima Hassan",
      jobTitle: "Talent Manager",
    },
    {
      employeeId: "HR000005",
      name: "Ishara Cooray",
      jobTitle: "HR Officer",
    },
    {
      employeeId: "HR000006",
      name: "Malsha Herath",
      jobTitle: "Compensation Specialist",
    },
    {
      employeeId: "HR000007",
      name: "Sanjaya Wickramasinghe",
      jobTitle: "People Analytics Lead",
    },
    {
      employeeId: "HR000008",
      name: "Nethmi Abeysekera",
      jobTitle: "HR Coordinator",
    },
  ];

  const extraLeadershipAccounts = [
    {
      employeeId: "LED000002",
      name: "Amaya Fernando",
      jobTitle: "Chief Operating Officer",
      departmentName: "Operations",
    },
    {
      employeeId: "LED000003",
      name: "Kasun Rajapaksha",
      jobTitle: "Chief Financial Officer",
      departmentName: "Finance",
    },
    {
      employeeId: "LED000004",
      name: "Meera Rahman",
      jobTitle: "Chief People Officer",
      departmentName: "Human Resources",
    },
    {
      employeeId: "LED000005",
      name: "Gihan Mendis",
      jobTitle: "Head of Product",
      departmentName: "Product Management",
    },
    {
      employeeId: "LED000006",
      name: "Thilini Pathirana",
      jobTitle: "Head of Sales",
      departmentName: "Sales",
    },
  ];

  for (const account of extraHrAccounts) {
    await prisma.employee.upsert({
      where: { employeeId: account.employeeId },
      update: {
        passwordHash,
        name: account.name,
        role: "HR",
        jobTitle: account.jobTitle,
        companyEmail: `${account.employeeId.toLowerCase()}@altrium.local`,
        departmentId: hrDept.id,
      },
      create: {
        employeeId: account.employeeId,
        name: account.name,
        role: "HR",
        jobTitle: account.jobTitle,
        companyEmail: `${account.employeeId.toLowerCase()}@altrium.local`,
        departmentId: hrDept.id,
        passwordHash,
      },
    });
  }

  for (const account of extraLeadershipAccounts) {
    const departmentId =
      departmentRecords.find((item) => item.name === account.departmentName)?.id ??
      engineering.id;
    await prisma.employee.upsert({
      where: { employeeId: account.employeeId },
      update: {
        passwordHash,
        name: account.name,
        role: "LEADERSHIP",
        jobTitle: account.jobTitle,
        companyEmail: `${account.employeeId.toLowerCase()}@altrium.local`,
        departmentId,
      },
      create: {
        employeeId: account.employeeId,
        name: account.name,
        role: "LEADERSHIP",
        jobTitle: account.jobTitle,
        companyEmail: `${account.employeeId.toLowerCase()}@altrium.local`,
        departmentId,
        passwordHash,
      },
    });
  }

  const people: Array<{
    employeeId: string;
    name: string;
    role: Role;
    companyEmail: string;
    departmentId: string;
    jobTitle: string;
  }> = [];

  let supervisorSeq = 1;
  let employeeSeq = 1;

  for (const department of departmentRecords) {
    for (let index = 0; index < department.supervisors; index += 1) {
      const employeeId = `SUP${pad(supervisorSeq)}`;
      supervisorSeq += 1;
      if (reservedEmployeeIds.has(employeeId)) continue;
      const first = FIRST_NAMES[Math.floor(random() * FIRST_NAMES.length)]!;
      const last = LAST_NAMES[Math.floor(random() * LAST_NAMES.length)]!;
      people.push({
        employeeId,
        name: `${first} ${last}`,
        role: "SUPERVISOR",
        companyEmail: `${employeeId.toLowerCase()}@altrium.local`,
        departmentId: department.id,
        jobTitle: `${department.name} Supervisor`,
      });
    }

    for (let index = 0; index < department.employees; index += 1) {
      const employeeId = `EMP${pad(employeeSeq)}`;
      employeeSeq += 1;
      if (reservedEmployeeIds.has(employeeId)) continue;
      const first = FIRST_NAMES[Math.floor(random() * FIRST_NAMES.length)]!;
      const last = LAST_NAMES[Math.floor(random() * LAST_NAMES.length)]!;
      people.push({
        employeeId,
        name: `${first} ${last}`,
        role: "EMPLOYEE",
        companyEmail: `${employeeId.toLowerCase()}@altrium.local`,
        departmentId: department.id,
        jobTitle: JOB_TITLES[department.name] ?? "Staff",
      });
    }
  }

  let extraEmployeeSeq = 694;
  for (const department of departmentRecords) {
    const extraCount = EXTRA_EMPLOYEES_BY_DEPT[department.name] ?? 0;
    for (let index = 0; index < extraCount; index += 1) {
      const employeeId = `EMP${pad(extraEmployeeSeq)}`;
      extraEmployeeSeq += 1;
      if (reservedEmployeeIds.has(employeeId)) continue;
      const first = FIRST_NAMES[Math.floor(random() * FIRST_NAMES.length)]!;
      const last = LAST_NAMES[Math.floor(random() * LAST_NAMES.length)]!;
      people.push({
        employeeId,
        name: `${first} ${last}`,
        role: "EMPLOYEE",
        companyEmail: `${employeeId.toLowerCase()}@altrium.local`,
        departmentId: department.id,
        jobTitle: JOB_TITLES[department.name] ?? "Staff",
      });
    }
  }

  const chunkSize = CHUNK_SIZE;
  for (let index = 0; index < people.length; index += chunkSize) {
    const chunk = people.slice(index, index + chunkSize).map((person) => ({
      ...person,
      passwordHash,
    }));
    await prisma.employee.createMany({ data: chunk, skipDuplicates: true });
  }

  const hrUser = await prisma.employee.findUniqueOrThrow({
    where: { employeeId: "HR000001" },
  });

  await seedAppraisalCycles(hrUser.id, random);

  for (const department of departmentRecords) {
    await prisma.employee.updateMany({
      where: {
        departmentId: department.id,
        role: "EMPLOYEE",
        jobTitle: null,
      },
      data: { jobTitle: JOB_TITLES[department.name] ?? "Staff" },
    });
    await prisma.employee.updateMany({
      where: {
        departmentId: department.id,
        role: "SUPERVISOR",
        jobTitle: null,
      },
      data: { jobTitle: `${department.name} Supervisor` },
    });
  }

  const employeeCount = await prisma.employee.count({ where: { role: "EMPLOYEE" } });
  const supervisorCount = await prisma.employee.count({
    where: { role: "SUPERVISOR" },
  });
  const hrCount = await prisma.employee.count({ where: { role: "HR" } });
  const leadershipCount = await prisma.employee.count({
    where: { role: "LEADERSHIP" },
  });

  console.log("Workforce seed completed.");
  console.log(
    `Employees: ${employeeCount} | Supervisors: ${supervisorCount} | HR: ${hrCount} | Leadership: ${leadershipCount}`
  );
  console.log("Password for all seeded users:", DEV_PASSWORD);
  console.log("Named accounts:");
  for (const account of namedAccounts) {
    console.log(`  ${account.employeeId}  ${account.role.padEnd(11)}  ${account.name}`);
  }
}

async function resetCycleData() {
  // Child appraisal records first — meetings are not cascaded from cycles.
  await prisma.employeeCycleProgress.deleteMany();
  await prisma.appraisalOutcome.deleteMany();
  await prisma.pdpReviewComment.deleteMany();
  await prisma.pdpGoal.deleteMany();
  await prisma.personalDevelopmentPlan.deleteMany();
  await prisma.meetingActionItem.deleteMany();
  await prisma.meetingNotes.deleteMany();
  await prisma.meetingParticipant.deleteMany();
  await prisma.meetingRescheduleRequest.deleteMany();
  await prisma.planningMeetingReview.deleteMany();
  await prisma.meeting.deleteMany();
  await prisma.batchAssignmentHistory.deleteMany();
  await prisma.supervisorAssignmentHistory.deleteMany();
  await prisma.employeeBatchAssignment.deleteMany();
  await prisma.employeeSupervisorAssignment.deleteMany();
  await prisma.appraisalBatch.deleteMany();
  await prisma.appraisalCycle.deleteMany();
}

async function seedAppraisalCycles(
  hrUserId: string,
  random: () => number
) {
  await resetCycleData();

  const assignable = await prisma.employee.findMany({
    where: { role: { in: ["EMPLOYEE", "SUPERVISOR"] } },
    select: {
      id: true,
      employeeId: true,
      role: true,
      departmentId: true,
    },
    orderBy: { employeeId: "asc" },
  });

  const supervisors = await prisma.employee.findMany({
    where: { role: "SUPERVISOR" },
    select: { id: true, departmentId: true, employeeId: true },
    orderBy: { employeeId: "asc" },
  });

  const supervisorsByDept = new Map<string, string[]>();
  for (const supervisor of supervisors) {
    if (!supervisor.departmentId) continue;
    const list = supervisorsByDept.get(supervisor.departmentId) ?? [];
    list.push(supervisor.id);
    supervisorsByDept.set(supervisor.departmentId, list);
  }

  const supervisorLoad = new Map<string, number>();
  for (const supervisor of supervisors) supervisorLoad.set(supervisor.id, 0);

  function pickSupervisor(departmentId: string | null) {
    if (!departmentId) return null;
    const pool = supervisorsByDept.get(departmentId);
    if (!pool?.length) return null;
    return pool.reduce((lowest, current) => {
      const lowestLoad = supervisorLoad.get(lowest) ?? 0;
      const currentLoad = supervisorLoad.get(current) ?? 0;
      const jitter = random() * 3;
      return currentLoad + jitter < lowestLoad ? current : lowest;
    });
  }

  function pickBatchIndex(employeeId: string) {
    const n = Number(employeeId.replace(/\D/g, "")) || 0;
    const slot = n % 10;
    if (slot < 4) return 0;
    if (slot < 7) return 1;
    return 2;
  }

  async function createCycle(options: {
    name: string;
    description: string;
    status: "DRAFT" | "UPCOMING" | "ACTIVE" | "COMPLETED";
    start: Date;
    batchStarts: [Date, Date, Date];
    confirmedAt?: Date;
    activatedAt?: Date;
    completedAt?: Date;
  }) {
    const end = addOneYear(options.start);
    return prisma.appraisalCycle.create({
      data: {
        name: options.name,
        description: options.description,
        startDate: options.start,
        endDate: end,
        status: options.status,
        activeLock: options.status === "ACTIVE" ? "ACTIVE" : null,
        confirmedAt: options.confirmedAt ?? null,
        activatedAt: options.activatedAt ?? null,
        completedAt: options.completedAt ?? null,
        createdById: hrUserId,
        batches: {
          create: options.batchStarts.map((start, index) => ({
            batchNumber: index + 1,
            name: `Batch ${index + 1}`,
            description: `Appraisal batch ${index + 1} for ${options.name}`,
            startDate: start,
            endDate: addOneYear(start),
            status:
              options.status === "COMPLETED"
                ? "FINISHED"
                : start > new Date()
                  ? "UPCOMING"
                  : addOneYear(start) <= new Date()
                    ? "FINISHED"
                    : "ONGOING",
          })),
        },
      },
      include: { batches: { orderBy: { batchNumber: "asc" } } },
    });
  }

  const cycle2022 = await createCycle({
    name: "2022 Annual Appraisal",
    description: "Completed historical cycle covering the 2022 performance year.",
    status: "COMPLETED",
    start: utcDate(2022, 3, 1),
    batchStarts: [utcDate(2022, 3, 1), utcDate(2022, 5, 1), utcDate(2022, 8, 1)],
    confirmedAt: utcDate(2022, 2, 8),
    activatedAt: utcDate(2022, 3, 1),
    completedAt: utcDate(2023, 2, 28),
  });

  const cycle2023 = await createCycle({
    name: "2023 Annual Appraisal",
    description: "Completed historical cycle covering the 2023 performance year.",
    status: "COMPLETED",
    start: utcDate(2023, 3, 1),
    batchStarts: [utcDate(2023, 3, 1), utcDate(2023, 5, 1), utcDate(2023, 8, 1)],
    confirmedAt: utcDate(2023, 2, 10),
    activatedAt: utcDate(2023, 3, 1),
    completedAt: utcDate(2024, 2, 29),
  });

  const cycle2024 = await createCycle({
    name: "2024 Annual Appraisal",
    description: "Completed historical cycle covering the 2024 performance year.",
    status: "COMPLETED",
    start: utcDate(2024, 3, 1),
    batchStarts: [utcDate(2024, 3, 1), utcDate(2024, 5, 1), utcDate(2024, 8, 1)],
    confirmedAt: utcDate(2024, 2, 12),
    activatedAt: utcDate(2024, 3, 1),
    completedAt: utcDate(2025, 3, 5),
  });

  const historical = await createCycle({
    name: "2025 Annual Appraisal",
    description: "Completed historical appraisal cycle retained for reporting.",
    status: "COMPLETED",
    start: utcDate(2025, 3, 1),
    batchStarts: [utcDate(2025, 3, 1), utcDate(2025, 5, 1), utcDate(2025, 8, 1)],
    confirmedAt: utcDate(2025, 2, 10),
    activatedAt: utcDate(2025, 3, 1),
    completedAt: utcDate(2026, 3, 10),
  });

  const active = await createCycle({
    name: "2026 Annual Appraisal",
    description:
      "Current active appraisal cycle. Most employees are already assigned; a small set of new joiners still need a batch or supervisor.",
    status: "ACTIVE",
    start: utcDate(2026, 3, 1),
    batchStarts: [utcDate(2026, 3, 1), utcDate(2026, 5, 1), utcDate(2026, 10, 1)],
    confirmedAt: utcDate(2026, 2, 12),
    activatedAt: utcDate(2026, 3, 1),
  });

  const upcoming = await createCycle({
    name: "2027 Annual Appraisal",
    description: "Confirmed upcoming cycle. Ready to activate after 2026 is completed.",
    status: "UPCOMING",
    start: utcDate(2027, 3, 1),
    batchStarts: [utcDate(2027, 3, 1), utcDate(2027, 5, 1), utcDate(2027, 8, 1)],
    confirmedAt: utcDate(2026, 8, 1),
  });

  const employeesOnly = assignable.filter((person) => person.role === "EMPLOYEE");

  async function assignCycle(cycle: typeof active) {
    const batchAssignments = [];
    const supervisorAssignments = [];

    for (const person of assignable) {
      const batch = cycle.batches[pickBatchIndex(person.employeeId)]!;
      batchAssignments.push({
        cycleId: cycle.id,
        batchId: batch.id,
        employeeId: person.id,
      });

      if (person.role === "EMPLOYEE") {
        const supervisorId = pickSupervisor(person.departmentId);
        if (supervisorId) {
          supervisorAssignments.push({
            cycleId: cycle.id,
            employeeId: person.id,
            supervisorId,
          });
          supervisorLoad.set(
            supervisorId,
            (supervisorLoad.get(supervisorId) ?? 0) + 1
          );
        }
      }
    }

    for (let index = 0; index < batchAssignments.length; index += CHUNK_SIZE) {
      await prisma.employeeBatchAssignment.createMany({
        data: batchAssignments.slice(index, index + CHUNK_SIZE),
      });
    }
    for (let index = 0; index < supervisorAssignments.length; index += CHUNK_SIZE) {
      await prisma.employeeSupervisorAssignment.createMany({
        data: supervisorAssignments.slice(index, index + CHUNK_SIZE),
      });
    }
  }

  const completedCycles = [cycle2022, cycle2023, cycle2024, historical];
  for (const cycle of completedCycles) {
    for (const supervisor of supervisors) supervisorLoad.set(supervisor.id, 0);
    await assignCycle(cycle);
    await applyCompletedBatchProgress(
      prisma,
      cycle.batches,
      Number(cycle.name.slice(0, 4))
    );
  }

  for (const supervisor of supervisors) supervisorLoad.set(supervisor.id, 0);
  await assignCycle(active);
  await applyCurrentCycleBatchProgress(prisma, active.batches);

  for (const supervisor of supervisors) supervisorLoad.set(supervisor.id, 0);
  await assignCycle(upcoming);

  await seedCycleHistoriesAndOutcomes(prisma, {
    hrUserId,
    cycles: [
      { id: cycle2022.id, year: 2022, batches: cycle2022.batches },
      { id: cycle2023.id, year: 2023, batches: cycle2023.batches },
      { id: cycle2024.id, year: 2024, batches: cycle2024.batches },
      { id: historical.id, year: 2025, batches: historical.batches },
      { id: active.id, year: 2026, batches: active.batches },
    ],
    employees: employeesOnly,
    supervisors,
  });

  await seedDemoEmployeeScenarios(prisma, {
    hrUserId,
    cycleId: active.id,
    batches: active.batches,
  });
  await seedNeedsAssignmentJoiners(prisma, active.id);

  console.log("Appraisal cycle workforce assignments seeded.");
  console.log(
    `Cycles: 2022–2025 COMPLETED, ${active.name} (ACTIVE), ${upcoming.name} (UPCOMING)`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
