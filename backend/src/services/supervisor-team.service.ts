/**
 * Supervisor My Team data access.
 * Returns only employees assigned to the authenticated supervisor
 * in the current (active) appraisal cycle via EmployeeSupervisorAssignment.
 */
import { Role } from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/errors.js";
import type { SupervisorTeamQuery } from "../validations/supervisor-team.validation.js";
import { getEmployeeAppraisalProgress } from "./appraisal-progress.service.js";

const DEFAULT_PAGE_SIZE = 10;

function paginate<T>(items: T[], page = 1, pageSize = DEFAULT_PAGE_SIZE) {
  const total = items.length;
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize) || 1),
  };
}

function averageProgress(goals: Array<{ progress: number }>) {
  if (goals.length === 0) return 0;
  return Math.round(
    goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length
  );
}

export async function getSupervisorTeam(
  supervisorId: string,
  filters: SupervisorTeamQuery = {}
) {
  const supervisor = await prisma.employee.findUnique({
    where: { id: supervisorId },
    select: {
      id: true,
      employeeId: true,
      name: true,
      role: true,
    },
  });

  if (!supervisor) {
    throw new AppError("Authentication required", 401);
  }
  if (supervisor.role !== Role.SUPERVISOR) {
    throw new AppError(
      "You do not have permission to access this resource",
      403
    );
  }

  const cycle = await prisma.appraisalCycle.findFirst({
    where: { status: "ACTIVE" },
    include: {
      batches: { orderBy: { batchNumber: "asc" } },
    },
  });

  if (!cycle) {
    return {
      cycle: null,
      stats: {
        teamSize: 0,
        activePdps: 0,
        avgPdpProgress: 0,
        completedReviews: 0,
      },
      batches: [],
      departments: [],
      employees: [],
      total: 0,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? DEFAULT_PAGE_SIZE,
      totalPages: 1,
    };
  }

  const assignments = await prisma.employeeSupervisorAssignment.findMany({
    where: {
      cycleId: cycle.id,
      supervisorId: supervisor.id,
    },
    include: {
      employee: {
        select: {
          id: true,
          employeeId: true,
          name: true,
          role: true,
          jobTitle: true,
          companyEmail: true,
          department: { select: { id: true, name: true } },
          batchAssignments: {
            where: { cycleId: cycle.id },
            include: {
              batch: {
                select: {
                  id: true,
                  batchNumber: true,
                  name: true,
                  startDate: true,
                  endDate: true,
                },
              },
            },
          },
          pdpsAsEmployee: {
            where: { cycleId: cycle.id },
            select: {
              id: true,
              status: true,
              goals: { select: { progress: true } },
            },
          },
          appraisalOutcomes: {
            where: { cycleId: cycle.id },
            select: { id: true },
          },
        },
      },
    },
    orderBy: { employee: { name: "asc" } },
  });

  const members = assignments.map((row) => {
    const pdp = row.employee.pdpsAsEmployee[0] ?? null;
    const batch = row.employee.batchAssignments[0]?.batch ?? null;
    const progress = pdp ? averageProgress(pdp.goals) : null;

    return {
      id: row.employee.id,
      employeeId: row.employee.employeeId,
      name: row.employee.name,
      role: row.employee.role,
      jobTitle: row.employee.jobTitle,
      companyEmail: row.employee.companyEmail,
      department: row.employee.department,
      batch: batch
        ? {
            id: batch.id,
            batchNumber: batch.batchNumber,
            name: batch.name,
            startDate: batch.startDate,
            endDate: batch.endDate,
          }
        : null,
      pdp: pdp
        ? {
            id: pdp.id,
            status: pdp.status,
            progress,
          }
        : null,
      status: "ACTIVE" as const,
      reviewComplete: row.employee.appraisalOutcomes.length > 0,
    };
  });

  const teamSize = members.length;
  const activePdps = members.filter((member) => member.pdp).length;
  const progressValues = members
    .map((member) => member.pdp?.progress)
    .filter((value): value is number => typeof value === "number");
  const avgPdpProgress =
    progressValues.length === 0
      ? 0
      : Math.round(
          progressValues.reduce((sum, value) => sum + value, 0) /
            progressValues.length
        );
  const completedReviews = members.filter((member) => member.reviewComplete).length;

  const departmentMap = new Map<string, string>();
  const batchMap = new Map<
    string,
    { id: string; batchNumber: number; name: string }
  >();
  for (const member of members) {
    if (member.department) {
      departmentMap.set(member.department.id, member.department.name);
    }
    if (member.batch) {
      batchMap.set(member.batch.id, {
        id: member.batch.id,
        batchNumber: member.batch.batchNumber,
        name: member.batch.name,
      });
    }
  }

  const search = filters.search?.trim().toLowerCase();
  let filtered = members;
  if (search) {
    filtered = filtered.filter(
      (member) =>
        member.name.toLowerCase().includes(search) ||
        member.employeeId.toLowerCase().includes(search)
    );
  }
  if (filters.departmentId) {
    filtered = filtered.filter(
      (member) => member.department?.id === filters.departmentId
    );
  }
  if (filters.batchId) {
    filtered = filtered.filter((member) => member.batch?.id === filters.batchId);
  }

  const page = paginate(
    filtered,
    filters.page ?? 1,
    filters.pageSize ?? DEFAULT_PAGE_SIZE
  );

  return {
    cycle: {
      id: cycle.id,
      name: cycle.name,
      status: cycle.status,
      startDate: cycle.startDate,
      endDate: cycle.endDate,
    },
    stats: {
      teamSize,
      activePdps,
      avgPdpProgress,
      completedReviews,
    },
    batches: Array.from(batchMap.values()).sort(
      (a, b) => a.batchNumber - b.batchNumber
    ),
    departments: Array.from(departmentMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    employees: page.items.map((member) => ({
      id: member.id,
      employeeId: member.employeeId,
      name: member.name,
      role: member.role,
      jobTitle: member.jobTitle,
      companyEmail: member.companyEmail,
      department: member.department,
      batch: member.batch,
      pdp: member.pdp,
      status: member.status,
    })),
    total: page.total,
    page: page.page,
    pageSize: page.pageSize,
    totalPages: page.totalPages,
  };
}

/**
 * Detailed appraisal view for one employee on the supervisor's team.
 * Returns 404 if the employee is not assigned to this supervisor in the
 * current cycle, so supervisors cannot inspect another team by URL.
 */
export async function getSupervisorTeamMember(
  supervisorId: string,
  employeeRecordId: string
) {
  const team = await getSupervisorTeam(supervisorId, {
    page: 1,
    pageSize: 1000,
  });
  const member = team.employees.find(
    (employee) =>
      employee.id === employeeRecordId || employee.employeeId === employeeRecordId
  );
  if (!member || !team.cycle) {
    throw new AppError("This employee is not assigned to your team.", 404);
  }

  const employee = await prisma.employee.findUnique({
    where: { id: member.id },
    select: {
      id: true,
      employeeId: true,
      name: true,
      role: true,
      jobTitle: true,
      companyEmail: true,
      department: { select: { id: true, name: true } },
    },
  });
  if (!employee) {
    throw new AppError("Employee not found", 404);
  }

  const progress = await getEmployeeAppraisalProgress(employee.id, team.cycle.id);

  return {
    cycle: team.cycle,
    employee,
    progress,
  };
}
