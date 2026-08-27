import { Role } from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/errors.js";
import { hasBatchStarted, parseDate } from "../utils/cycle-dates.js";
import type {
  AssignmentHistoryQuery,
  ChangeBatchInput,
  ChangeSupervisorInput,
  EmployeeAssignmentQuery,
  SupervisorQuery,
} from "../validations/appraisal-cycle.validation.js";
import {
  ASSIGNABLE_ROLES,
  SUPERVISED_ROLES,
  assertAssignmentsMutable,
  batchRefSelect,
  employeePublicSelect,
  getCycleOrThrow,
  mapBatch,
} from "./appraisal-cycle.service.js";

function paginate<T>(items: T[], page = 1, pageSize = 20) {
  const total = items.length;
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

function assignmentStatusOf(row: {
  batch: unknown;
  supervisor: unknown;
  role: Role;
}) {
  const hasBatch = Boolean(row.batch);
  const needsSupervisor = SUPERVISED_ROLES.includes(row.role);
  const hasSupervisor = Boolean(row.supervisor);
  if (hasBatch && (!needsSupervisor || hasSupervisor)) return "COMPLETE";
  if (!hasBatch && (!needsSupervisor || !hasSupervisor)) return "UNASSIGNED";
  return "PARTIAL";
}

export async function listCycleEmployees(
  cycleId: string,
  filters: EmployeeAssignmentQuery
) {
  await getCycleOrThrow(cycleId);

  const employees = await prisma.employee.findMany({
    where: {
      role: { in: ASSIGNABLE_ROLES },
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      ...(filters.search
        ? {
            OR: [
              { employeeId: { contains: filters.search, mode: "insensitive" } },
              { name: { contains: filters.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: employeePublicSelect,
    orderBy: { employeeId: "asc" },
  });

  const [batchAssignments, supervisorAssignments] = await Promise.all([
    prisma.employeeBatchAssignment.findMany({
      where: { cycleId },
      include: { batch: { select: batchRefSelect } },
    }),
    prisma.employeeSupervisorAssignment.findMany({
      where: { cycleId },
      include: {
        supervisor: {
          select: { id: true, employeeId: true, name: true },
        },
      },
    }),
  ]);

  const batchByEmployee = new Map(
    batchAssignments.map((assignment) => [assignment.employeeId, assignment])
  );
  const supervisorByEmployee = new Map(
    supervisorAssignments.map((assignment) => [assignment.employeeId, assignment])
  );

  let rows = employees.map((employee) => {
    const batchAssignment = batchByEmployee.get(employee.id);
    const supervisorAssignment = supervisorByEmployee.get(employee.id);
    const batch = batchAssignment?.batch ?? null;
    const supervisor = supervisorAssignment?.supervisor ?? null;
    return {
      id: employee.id,
      employeeId: employee.employeeId,
      name: employee.name,
      role: employee.role,
      companyEmail: employee.companyEmail,
      department: employee.department,
      batch,
      supervisor,
      assignmentStatus: assignmentStatusOf({
        batch,
        supervisor,
        role: employee.role,
      }),
    };
  });

  if (filters.batchId) {
    rows = rows.filter((row) => row.batch?.id === filters.batchId);
  }
  if (filters.supervisorId) {
    rows = rows.filter((row) => row.supervisor?.id === filters.supervisorId);
  }

  const status = filters.assignmentStatus ?? "ALL";
  if (status === "COMPLETE") {
    rows = rows.filter((row) => row.assignmentStatus === "COMPLETE");
  } else if (status === "PARTIAL") {
    rows = rows.filter((row) => row.assignmentStatus === "PARTIAL");
  } else if (status === "UNASSIGNED") {
    rows = rows.filter((row) => row.assignmentStatus === "UNASSIGNED");
  } else if (status === "NO_BATCH") {
    rows = rows.filter((row) => !row.batch);
  } else if (status === "NO_SUPERVISOR") {
    rows = rows.filter(
      (row) => SUPERVISED_ROLES.includes(row.role as Role) && !row.supervisor
    );
  } else if (status === "NEEDS_ASSIGNMENT") {
    rows = rows.filter((row) => {
      const missingBatch = !row.batch;
      const missingSupervisor =
        SUPERVISED_ROLES.includes(row.role as Role) && !row.supervisor;
      return missingBatch || missingSupervisor;
    });
  }

  const page = paginate(rows, filters.page ?? 1, filters.pageSize ?? 20);
  return {
    ...page,
    employees: page.items,
    counts: {
      total: employees.length,
      complete: rows.filter((row) => row.assignmentStatus === "COMPLETE").length,
      needsAssignment: rows.filter((row) => {
        const missingBatch = !row.batch;
        const missingSupervisor =
          SUPERVISED_ROLES.includes(row.role as Role) && !row.supervisor;
        return missingBatch || missingSupervisor;
      }).length,
    },
  };
}

// ============================================================
// EMPLOYEE BATCH ASSIGNMENT
// Ensures each employee has only one batch within a cycle.
// First assignments and later reassignments both write history so the
// original batch is never lost. Completed cycles cannot be mutated.
// ============================================================
export async function changeEmployeeBatch(
  cycleId: string,
  employeeRecordId: string,
  input: ChangeBatchInput,
  changedById: string,
  evidence?: { filename: string; originalName: string } | null
) {
  const cycle = await prisma.appraisalCycle.findUnique({ where: { id: cycleId } });
  if (!cycle) throw new AppError("Appraisal cycle not found", 404);
  assertAssignmentsMutable(cycle);

  const employee = await prisma.employee.findUnique({
    where: { id: employeeRecordId },
    select: employeePublicSelect,
  });
  if (!employee) throw new AppError("Employee not found", 404);
  if (!ASSIGNABLE_ROLES.includes(employee.role)) {
    throw new AppError("This employee is not part of appraisal assignments.", 400);
  }

  const newBatch = await prisma.appraisalBatch.findFirst({
    where: { id: input.newBatchId, cycleId },
  });
  if (!newBatch) throw new AppError("New batch not found in this cycle.", 404);

  const existing = await prisma.employeeBatchAssignment.findUnique({
    where: { cycleId_employeeId: { cycleId, employeeId: employee.id } },
  });

  if (existing && existing.batchId === input.newBatchId) {
    throw new AppError(
      "Employee already has a batch in this cycle.",
      400,
      "SAME_BATCH"
    );
  }

  const isReassignment = Boolean(existing);
  const started = hasBatchStarted(newBatch.startDate);
  if (started && !input.acknowledgeStarted && !input.confirmStarted) {
    throw new AppError(
      "This batch has already started. Adding this employee may require an exceptional assignment.",
      400,
      "BATCH_ALREADY_STARTED"
    );
  }

  if (isReassignment && !input.reason?.trim()) {
    throw new AppError("Reason is required for batch reassignment.", 400);
  }

  const reason =
    input.reason?.trim() ||
    (isReassignment ? "" : "Initial batch assignment");
  if (!reason) {
    throw new AppError("Reason is required for batch reassignment.", 400);
  }

  const effectiveDate = input.effectiveDate
    ? parseDate(input.effectiveDate)
    : new Date();

  const result = await prisma.$transaction(async (tx) => {
    await tx.batchAssignmentHistory.create({
      data: {
        cycleId,
        employeeId: employee.id,
        previousBatchId: existing?.batchId ?? null,
        newBatchId: input.newBatchId,
        reason,
        evidence: evidence?.filename ?? null,
        evidenceName: evidence?.originalName ?? null,
        effectiveDate,
        changedById,
      },
    });

    if (existing) {
      return tx.employeeBatchAssignment.update({
        where: { id: existing.id },
        data: { batchId: input.newBatchId },
        include: {
          batch: { select: batchRefSelect },
          employee: { select: employeePublicSelect },
        },
      });
    }

    return tx.employeeBatchAssignment.create({
      data: {
        cycleId,
        employeeId: employee.id,
        batchId: input.newBatchId,
      },
      include: {
        batch: { select: batchRefSelect },
        employee: { select: employeePublicSelect },
      },
    });
  });

  return result;
}

export async function listCycleSupervisors(
  cycleId: string,
  filters: SupervisorQuery
) {
  await getCycleOrThrow(cycleId);

  const supervisors = await prisma.employee.findMany({
    where: {
      role: Role.SUPERVISOR,
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      ...(filters.search
        ? {
            OR: [
              { employeeId: { contains: filters.search, mode: "insensitive" } },
              { name: { contains: filters.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: employeePublicSelect,
    orderBy: [{ departmentId: "asc" }, { name: "asc" }],
  });

  const assignments = await prisma.employeeSupervisorAssignment.findMany({
    where: {
      cycleId,
      supervisorId: { in: supervisors.map((supervisor) => supervisor.id) },
    },
    select: { supervisorId: true },
  });

  const countBySupervisor = new Map<string, number>();
  for (const assignment of assignments) {
    countBySupervisor.set(
      assignment.supervisorId,
      (countBySupervisor.get(assignment.supervisorId) ?? 0) + 1
    );
  }

  const mapped = supervisors
    .map((supervisor) => ({
      id: supervisor.id,
      employeeId: supervisor.employeeId,
      name: supervisor.name,
      companyEmail: supervisor.companyEmail,
      department: supervisor.department,
      employeeCount: countBySupervisor.get(supervisor.id) ?? 0,
      status:
        (countBySupervisor.get(supervisor.id) ?? 0) > 0 ? "ACTIVE" : "UNASSIGNED",
    }))
    .filter((supervisor) => !filters.assignedOnly || supervisor.employeeCount > 0);

  const totalEmployees = mapped.reduce((sum, item) => sum + item.employeeCount, 0);
  const stats = {
    totalSupervisors: mapped.length,
    totalEmployees,
    averageEmployeesPerSupervisor:
      mapped.length === 0 ? 0 : Math.round((totalEmployees / mapped.length) * 10) / 10,
  };

  if (filters.grouped) {
    const grouped = new Map<
      string,
      {
        department: { id: string; name: string } | null;
        supervisors: typeof mapped;
      }
    >();

    for (const supervisor of mapped) {
      const key = supervisor.department?.id ?? "unassigned";
      if (!grouped.has(key)) {
        grouped.set(key, { department: supervisor.department, supervisors: [] });
      }
      grouped.get(key)!.supervisors.push(supervisor);
    }

    const groups = Array.from(grouped.values()).sort((a, b) =>
      (a.department?.name ?? "Unassigned").localeCompare(
        b.department?.name ?? "Unassigned"
      )
    );

    return { grouped: true, groups, stats };
  }

  const page = paginate(mapped, filters.page ?? 1, filters.pageSize ?? 12);
  return {
    grouped: false,
    ...page,
    supervisors: page.items,
    stats,
  };
}

export async function getSupervisorDetail(cycleId: string, supervisorId: string) {
  const cycle = await getCycleOrThrow(cycleId);

  const supervisor = await prisma.employee.findFirst({
    where: { id: supervisorId, role: Role.SUPERVISOR },
    select: employeePublicSelect,
  });
  if (!supervisor) throw new AppError("Supervisor not found", 404);

  const assignments = await prisma.employeeSupervisorAssignment.findMany({
    where: { cycleId, supervisorId },
    include: { employee: { select: employeePublicSelect } },
    orderBy: { assignedAt: "asc" },
  });

  const employeeIds = assignments.map((assignment) => assignment.employeeId);
  const batchAssignments = await prisma.employeeBatchAssignment.findMany({
    where: { cycleId, employeeId: { in: employeeIds } },
    include: { batch: { select: batchRefSelect } },
  });
  const batchByEmployee = new Map(
    batchAssignments.map((assignment) => [assignment.employeeId, assignment.batch])
  );

  return {
    cycle: {
      id: cycle.id,
      name: cycle.name,
      status: cycle.status,
    },
    supervisor,
    employeeCount: assignments.length,
    employees: assignments.map((assignment) => {
      const batch = batchByEmployee.get(assignment.employeeId) ?? null;
      return {
        id: assignment.employee.id,
        employeeId: assignment.employee.employeeId,
        name: assignment.employee.name,
        companyEmail: assignment.employee.companyEmail,
        role: assignment.employee.role,
        department: assignment.employee.department,
        batch,
        supervisor: {
          id: supervisor.id,
          employeeId: supervisor.employeeId,
          name: supervisor.name,
        },
        assignmentStatus: batch ? "COMPLETE" : "PARTIAL",
      };
    }),
  };
}

// ============================================================
// SUPERVISOR REASSIGNMENT
// Validates department compatibility, updates the current supervisor
// assignment and preserves the previous assignment in supervisor
// assignment history. Same-supervisor and completed-cycle changes are rejected.
// ============================================================
export async function changeEmployeeSupervisor(
  cycleId: string,
  employeeRecordId: string,
  input: ChangeSupervisorInput,
  changedById: string,
  evidence?: { filename: string; originalName: string } | null
) {
  const cycle = await prisma.appraisalCycle.findUnique({ where: { id: cycleId } });
  if (!cycle) throw new AppError("Appraisal cycle not found", 404);
  assertAssignmentsMutable(cycle);

  const employee = await prisma.employee.findUnique({
    where: { id: employeeRecordId },
    select: employeePublicSelect,
  });
  if (!employee) throw new AppError("Employee not found", 404);
  if (!ASSIGNABLE_ROLES.includes(employee.role)) {
    throw new AppError("This employee is not part of appraisal assignments.", 400);
  }

  const newSupervisor = await prisma.employee.findFirst({
    where: { id: input.newSupervisorId, role: Role.SUPERVISOR },
    select: employeePublicSelect,
  });
  if (!newSupervisor) {
    throw new AppError("New supervisor not found or is not a supervisor.", 400);
  }

  if (!employee.departmentId || !newSupervisor.departmentId) {
    throw new AppError(
      "Employee and supervisor must both belong to a department.",
      400
    );
  }

  if (employee.departmentId !== newSupervisor.departmentId) {
    throw new AppError(
      "Supervisor must belong to the employee's department.",
      400,
      "CROSS_DEPARTMENT"
    );
  }

  const existing = await prisma.employeeSupervisorAssignment.findUnique({
    where: { cycleId_employeeId: { cycleId, employeeId: employee.id } },
  });

  if (existing && existing.supervisorId === input.newSupervisorId) {
    throw new AppError(
      "Employee already has a supervisor in this cycle.",
      400,
      "SAME_SUPERVISOR"
    );
  }

  const isReassignment = Boolean(existing);
  if (isReassignment && !input.reason?.trim()) {
    throw new AppError("Reason is required for supervisor reassignment.", 400);
  }

  const reason =
    input.reason?.trim() ||
    (isReassignment ? "" : "Initial supervisor assignment");
  if (!reason) {
    throw new AppError("Reason is required for supervisor reassignment.", 400);
  }

  const effectiveDate = input.effectiveDate
    ? parseDate(input.effectiveDate)
    : new Date();

  return prisma.$transaction(async (tx) => {
    await tx.supervisorAssignmentHistory.create({
      data: {
        cycleId,
        employeeId: employee.id,
        previousSupervisorId: existing?.supervisorId ?? null,
        newSupervisorId: input.newSupervisorId,
        reason,
        evidence: evidence?.filename ?? null,
        evidenceName: evidence?.originalName ?? null,
        effectiveDate,
        changedById,
      },
    });

    if (existing) {
      return tx.employeeSupervisorAssignment.update({
        where: { id: existing.id },
        data: { supervisorId: input.newSupervisorId },
        include: {
          supervisor: { select: employeePublicSelect },
          employee: { select: employeePublicSelect },
        },
      });
    }

    return tx.employeeSupervisorAssignment.create({
      data: {
        cycleId,
        employeeId: employee.id,
        supervisorId: input.newSupervisorId,
      },
      include: {
        supervisor: { select: employeePublicSelect },
        employee: { select: employeePublicSelect },
      },
    });
  });
}

export async function listDepartmentSupervisors(
  cycleId: string,
  employeeRecordId: string
) {
  await getCycleOrThrow(cycleId);

  const employee = await prisma.employee.findUnique({
    where: { id: employeeRecordId },
    select: employeePublicSelect,
  });
  if (!employee) throw new AppError("Employee not found", 404);
  if (!employee.departmentId) return [];

  return prisma.employee.findMany({
    where: {
      role: Role.SUPERVISOR,
      departmentId: employee.departmentId,
    },
    select: employeePublicSelect,
    orderBy: { name: "asc" },
  });
}

export async function getAssignmentHistory(
  cycleId: string,
  filters: AssignmentHistoryQuery = {}
) {
  await getCycleOrThrow(cycleId);

  const [batchHistory, supervisorHistory] = await Promise.all([
    prisma.batchAssignmentHistory.findMany({
      where: { cycleId },
      orderBy: { changedAt: "desc" },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            name: true,
            department: { select: { id: true, name: true } },
          },
        },
        previousBatch: { select: batchRefSelect },
        newBatch: { select: batchRefSelect },
        changedBy: {
          select: { id: true, employeeId: true, name: true },
        },
      },
    }),
    prisma.supervisorAssignmentHistory.findMany({
      where: { cycleId },
      orderBy: { changedAt: "desc" },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            name: true,
            department: { select: { id: true, name: true } },
          },
        },
        previousSupervisor: {
          select: { id: true, employeeId: true, name: true },
        },
        newSupervisor: {
          select: { id: true, employeeId: true, name: true },
        },
        changedBy: {
          select: { id: true, employeeId: true, name: true },
        },
      },
    }),
  ]);

  type HistoryRow = {
    id: string;
    changeType: "BATCH" | "SUPERVISOR";
    changedAt: Date;
    effectiveDate: Date | null;
    reason: string;
    evidence: string | null;
    evidenceName: string | null;
    employee: {
      id: string;
      employeeId: string;
      name: string;
      department?: { id: string; name: string } | null;
    };
    previousLabel: string;
    newLabel: string;
    previousBatchId?: string | null;
    newBatchId?: string | null;
    previousSupervisorId?: string | null;
    newSupervisorId?: string | null;
    changedBy: { id: string; employeeId: string; name: string };
  };

  const rows: HistoryRow[] = [
    ...batchHistory.map((entry) => ({
      id: entry.id,
      changeType: "BATCH" as const,
      changedAt: entry.changedAt,
      effectiveDate: entry.effectiveDate,
      reason: entry.reason,
      evidence: entry.evidence,
      evidenceName: entry.evidenceName,
      employee: entry.employee,
      previousLabel: entry.previousBatch
        ? `Batch ${entry.previousBatch.batchNumber}`
        : "Not assigned",
      newLabel: `Batch ${entry.newBatch.batchNumber}`,
      previousBatchId: entry.previousBatchId,
      newBatchId: entry.newBatchId,
      changedBy: entry.changedBy,
    })),
    ...supervisorHistory.map((entry) => ({
      id: entry.id,
      changeType: "SUPERVISOR" as const,
      changedAt: entry.changedAt,
      effectiveDate: entry.effectiveDate,
      reason: entry.reason,
      evidence: entry.evidence,
      evidenceName: entry.evidenceName,
      employee: entry.employee,
      previousLabel: entry.previousSupervisor
        ? entry.previousSupervisor.name
        : "Not assigned",
      newLabel: entry.newSupervisor.name,
      previousSupervisorId: entry.previousSupervisorId,
      newSupervisorId: entry.newSupervisorId,
      changedBy: entry.changedBy,
    })),
  ].sort((a, b) => b.changedAt.getTime() - a.changedAt.getTime());

  let filtered = rows;

  if (filters.changeType && filters.changeType !== "ALL") {
    filtered = filtered.filter((row) => row.changeType === filters.changeType);
  }
  if (filters.search) {
    const needle = filters.search.toLowerCase();
    filtered = filtered.filter(
      (row) =>
        row.employee.name.toLowerCase().includes(needle) ||
        row.employee.employeeId.toLowerCase().includes(needle)
    );
  }
  if (filters.employeeId) {
    filtered = filtered.filter((row) => row.employee.employeeId === filters.employeeId);
  }
  if (filters.departmentId) {
    filtered = filtered.filter(
      (row) => row.employee.department?.id === filters.departmentId
    );
  }
  if (filters.previousBatchId) {
    filtered = filtered.filter((row) => row.previousBatchId === filters.previousBatchId);
  }
  if (filters.newBatchId) {
    filtered = filtered.filter((row) => row.newBatchId === filters.newBatchId);
  }
  if (filters.previousSupervisorId) {
    filtered = filtered.filter(
      (row) => row.previousSupervisorId === filters.previousSupervisorId
    );
  }
  if (filters.newSupervisorId) {
    filtered = filtered.filter((row) => row.newSupervisorId === filters.newSupervisorId);
  }
  if (filters.changedById) {
    filtered = filtered.filter(
      (row) =>
        row.changedBy.id === filters.changedById ||
        row.changedBy.employeeId === filters.changedById
    );
  }
  if (filters.from) {
    const from = new Date(filters.from);
    filtered = filtered.filter((row) => row.changedAt >= from);
  }
  if (filters.to) {
    const to = new Date(filters.to);
    filtered = filtered.filter((row) => row.changedAt <= to);
  }

  const page = paginate(filtered, filters.page ?? 1, filters.pageSize ?? 20);
  return {
    ...page,
    entries: page.items,
    batchHistory,
    supervisorHistory,
  };
}

export { mapBatch };
