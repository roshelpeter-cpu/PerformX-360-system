/**
 * Employee Management data access.
 * Workforce records, batch grouping, and supervisor assignments are read
 * from PostgreSQL. The active appraisal cycle is the current assignment context.
 */
import { Role } from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/errors.js";
import { changeEmployeeSupervisor } from "./appraisal-assignment.service.js";
import {
  SUPERVISED_ROLES,
  employeePublicSelect,
} from "./appraisal-cycle.service.js";
import type { EmployeeListQuery } from "../validations/employee-management.validation.js";

const PREVIEW_SIZE = 5;

type PublicEmployee = {
  id: string;
  employeeId: string;
  name: string;
  companyEmail: string;
  role: Role;
  jobTitle: string | null;
  departmentId: string | null;
  department: { id: string; name: string } | null;
};

type AssignmentStatus = "ASSIGNED" | "PARTIAL" | "UNASSIGNED";

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

function monthLabel(date: Date) {
  return date.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
}

function assignmentStatusOf(row: {
  batch: unknown;
  supervisor: unknown;
  role: Role;
}): AssignmentStatus {
  const hasBatch = Boolean(row.batch);
  const needsSupervisor = SUPERVISED_ROLES.includes(row.role);
  const hasSupervisor = Boolean(row.supervisor);
  if (hasBatch && (!needsSupervisor || hasSupervisor)) return "ASSIGNED";
  if (!hasBatch && (!needsSupervisor || !hasSupervisor)) return "UNASSIGNED";
  return "PARTIAL";
}

function matchesSearch(employee: PublicEmployee, search?: string) {
  if (!search) return true;
  const needle = search.trim().toLowerCase();
  if (!needle) return true;
  return (
    employee.name.toLowerCase().includes(needle) ||
    employee.employeeId.toLowerCase().includes(needle)
  );
}

/** Active cycle first; otherwise the most recent cycle so batch grouping still works. */
async function getWorkforceCycle() {
  const include = {
    batches: { orderBy: { batchNumber: "asc" as const } },
  };

  const active = await prisma.appraisalCycle.findFirst({
    where: { status: "ACTIVE" },
    include,
  });
  if (active) return active;

  return prisma.appraisalCycle.findFirst({
    orderBy: { startDate: "desc" },
    include,
  });
}

async function loadAssignments(cycleId: string | undefined) {
  if (!cycleId) {
    return {
      batchByEmployee: new Map<
        string,
        { id: string; batchNumber: number; name: string; startDate: Date }
      >(),
      supervisorByEmployee: new Map<
        string,
        { id: string; employeeId: string; name: string }
      >(),
    };
  }

  const [batchAssignments, supervisorAssignments] = await Promise.all([
    prisma.employeeBatchAssignment.findMany({
      where: { cycleId },
      include: {
        batch: {
          select: {
            id: true,
            batchNumber: true,
            name: true,
            startDate: true,
          },
        },
      },
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

  return {
    batchByEmployee: new Map(
      batchAssignments.map((assignment) => [
        assignment.employeeId,
        assignment.batch,
      ])
    ),
    supervisorByEmployee: new Map(
      supervisorAssignments.map((assignment) => [
        assignment.employeeId,
        assignment.supervisor,
      ])
    ),
  };
}

function mapEmployeeRow(
  employee: PublicEmployee,
  batch: {
    id: string;
    batchNumber: number;
    name: string;
    startDate: Date;
  } | null,
  supervisor: { id: string; employeeId: string; name: string } | null
) {
  return {
    id: employee.id,
    employeeId: employee.employeeId,
    name: employee.name,
    role: employee.role,
    jobTitle: employee.jobTitle,
    companyEmail: employee.companyEmail,
    department: employee.department,
    batch: batch
      ? {
          id: batch.id,
          batchNumber: batch.batchNumber,
          name: batch.name,
          startDate: batch.startDate,
        }
      : null,
    supervisor,
    status: assignmentStatusOf({
      batch,
      supervisor,
      role: employee.role,
    }),
  };
}

function applyRowFilters<
  T extends {
    batch: { id: string } | null;
    supervisor: { id: string } | null;
    status: AssignmentStatus;
  },
>(rows: T[], filters: EmployeeListQuery) {
  let next = rows;
  if (filters.batchId) {
    next = next.filter((row) => row.batch?.id === filters.batchId);
  }
  if (filters.supervisorId) {
    next = next.filter((row) => row.supervisor?.id === filters.supervisorId);
  }
  const status = filters.status ?? "ALL";
  if (status !== "ALL") {
    next = next.filter((row) => row.status === status);
  }
  return next;
}

async function loadRoleDirectory(role: Role, filters: EmployeeListQuery) {
  const employees = await prisma.employee.findMany({
    where: {
      role,
      ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
    },
    select: employeePublicSelect,
    orderBy: { employeeId: "asc" },
  });

  return employees.filter((employee) => matchesSearch(employee, filters.search));
}

export async function getEmployeeOverview(filters: EmployeeListQuery) {
  const cycle = await getWorkforceCycle();
  const { batchByEmployee, supervisorByEmployee } = await loadAssignments(
    cycle?.id
  );

  const [
    employees,
    unfilteredEmployeeCount,
    supervisorCount,
    departmentCount,
    assignedPeople,
  ] = await Promise.all([
    prisma.employee.findMany({
      where: {
        role: Role.EMPLOYEE,
        ...(filters.departmentId ? { departmentId: filters.departmentId } : {}),
      },
      select: employeePublicSelect,
      orderBy: { employeeId: "asc" },
    }),
    prisma.employee.count({ where: { role: Role.EMPLOYEE } }),
    prisma.employee.count({ where: { role: Role.SUPERVISOR } }),
    prisma.department.count(),
    cycle
      ? prisma.employeeBatchAssignment.count({ where: { cycleId: cycle.id } })
      : Promise.resolve(0),
  ]);

  const searched = employees.filter((employee) =>
    matchesSearch(employee, filters.search)
  );
  const rows = applyRowFilters(
    searched.map((employee) =>
      mapEmployeeRow(
        employee,
        batchByEmployee.get(employee.id) ?? null,
        supervisorByEmployee.get(employee.id) ?? null
      )
    ),
    { ...filters, batchId: undefined }
  );

  const totalEmployees = rows.length;
  const batches = (cycle?.batches ?? []).map((batch) => {
    const members = rows.filter((row) => row.batch?.id === batch.id);
    return {
      id: batch.id,
      batchNumber: batch.batchNumber,
      name: batch.name,
      startLabel: `Starts ${monthLabel(batch.startDate)}`,
      employeeCount: members.length,
      percentOfEmployees:
        totalEmployees === 0
          ? 0
          : Math.round((members.length / totalEmployees) * 10000) / 100,
      preview: members.slice(0, PREVIEW_SIZE),
    };
  });

  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return {
    cycle: cycle
      ? { id: cycle.id, name: cycle.name, status: cycle.status }
      : null,
    stats: {
      totalEmployees: unfilteredEmployeeCount,
      filteredEmployees: totalEmployees,
      assignedEmployees: assignedPeople,
      assignedPercent:
        unfilteredEmployeeCount === 0
          ? 0
          : Math.round((assignedPeople / unfilteredEmployeeCount) * 10000) / 100,
      supervisorCount,
      departmentCount,
    },
    batches,
    departments,
  };
}

export async function listWorkforceEmployees(filters: EmployeeListQuery) {
  const role = (filters.role as Role | undefined) ?? Role.EMPLOYEE;
  const cycle = await getWorkforceCycle();
  const { batchByEmployee, supervisorByEmployee } = await loadAssignments(
    cycle?.id
  );

  const employees = await loadRoleDirectory(role, filters);
  const rows = applyRowFilters(
    employees.map((employee) =>
      mapEmployeeRow(
        employee,
        batchByEmployee.get(employee.id) ?? null,
        supervisorByEmployee.get(employee.id) ?? null
      )
    ),
    filters
  );

  const page = paginate(rows, filters.page ?? 1, filters.pageSize ?? 20);
  return {
    ...page,
    employees: page.items,
    cycle: cycle
      ? { id: cycle.id, name: cycle.name, status: cycle.status }
      : null,
  };
}

export async function listBatchEmployees(
  batchId: string,
  filters: EmployeeListQuery
) {
  const cycle = await getWorkforceCycle();
  if (!cycle) throw new AppError("No appraisal cycle is available.", 404);

  const batch = cycle.batches.find((item) => item.id === batchId);
  if (!batch) throw new AppError("Batch not found in the current cycle.", 404);

  return listWorkforceEmployees({
    ...filters,
    role: "EMPLOYEE",
    batchId,
    page: 1,
    pageSize: filters.pageSize ?? 1000,
  }).then((result) => ({
    batch: {
      id: batch.id,
      batchNumber: batch.batchNumber,
      name: batch.name,
      startLabel: `Starts ${monthLabel(batch.startDate)}`,
    },
    cycle: result.cycle,
    employees: result.employees,
    total: result.total,
  }));
}

export async function listWorkforceSupervisors(filters: EmployeeListQuery) {
  const cycle = await getWorkforceCycle();
  const supervisors = await loadRoleDirectory(Role.SUPERVISOR, filters);

  const assignments = cycle
    ? await prisma.employeeSupervisorAssignment.findMany({
        where: {
          cycleId: cycle.id,
          supervisorId: { in: supervisors.map((supervisor) => supervisor.id) },
        },
        select: { supervisorId: true },
      })
    : [];

  const countBySupervisor = new Map<string, number>();
  for (const assignment of assignments) {
    countBySupervisor.set(
      assignment.supervisorId,
      (countBySupervisor.get(assignment.supervisorId) ?? 0) + 1
    );
  }

  const rows = supervisors.map((supervisor) => {
    const employeeCount = countBySupervisor.get(supervisor.id) ?? 0;
    return {
      id: supervisor.id,
      employeeId: supervisor.employeeId,
      name: supervisor.name,
      jobTitle: supervisor.jobTitle,
      companyEmail: supervisor.companyEmail,
      department: supervisor.department,
      employeeCount,
      status: employeeCount > 0 ? "ASSIGNED" : "UNASSIGNED",
    };
  });

  const page = paginate(rows, filters.page ?? 1, filters.pageSize ?? 500);
  return {
    ...page,
    supervisors: page.items,
    cycle: cycle
      ? { id: cycle.id, name: cycle.name, status: cycle.status }
      : null,
  };
}

export async function getWorkforceSupervisorDetail(
  supervisorId: string,
  filters: EmployeeListQuery = {}
) {
  const supervisor = await prisma.employee.findFirst({
    where: { id: supervisorId, role: Role.SUPERVISOR },
    select: employeePublicSelect,
  });
  if (!supervisor) throw new AppError("Supervisor not found", 404);

  const listed = await listWorkforceEmployees({
    ...filters,
    role: "EMPLOYEE",
    supervisorId,
    page: 1,
    pageSize: filters.pageSize ?? 1000,
  });

  return {
    supervisor,
    employeeCount: listed.total,
    employees: listed.employees,
    cycle: listed.cycle,
  };
}

export async function listHrUsers(filters: EmployeeListQuery) {
  const users = await loadRoleDirectory(Role.HR, filters);
  const page = paginate(users, filters.page ?? 1, filters.pageSize ?? 50);
  return { ...page, users: page.items };
}

export async function listLeadershipUsers(filters: EmployeeListQuery) {
  const users = await loadRoleDirectory(Role.LEADERSHIP, filters);
  const page = paginate(users, filters.page ?? 1, filters.pageSize ?? 50);
  return { ...page, users: page.items };
}

export async function getWorkforceEmployee(employeeId: string) {
  const cycle = await getWorkforceCycle();
  const employee = await prisma.employee.findFirst({
    where: {
      OR: [{ id: employeeId }, { employeeId }],
    },
    select: employeePublicSelect,
  });
  if (!employee) throw new AppError("Employee not found", 404);

  const { batchByEmployee, supervisorByEmployee } = await loadAssignments(
    cycle?.id
  );

  return {
    cycle: cycle
      ? { id: cycle.id, name: cycle.name, status: cycle.status }
      : null,
    employee: mapEmployeeRow(
      employee,
      batchByEmployee.get(employee.id) ?? null,
      supervisorByEmployee.get(employee.id) ?? null
    ),
  };
}

export async function listEligibleSupervisorsForEmployee(employeeId: string) {
  const employee = await prisma.employee.findFirst({
    where: {
      OR: [{ id: employeeId }, { employeeId }],
    },
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

/** Updates the current-cycle supervisor assignment and writes history. */
export async function reassignEmployeeSupervisor(
  employeeRecordId: string,
  input: { newSupervisorId: string; reason?: string | null; effectiveDate?: string | null },
  changedById: string
) {
  const cycle = await getWorkforceCycle();
  if (!cycle) {
    throw new AppError(
      "An appraisal cycle is required before supervisor assignments can be changed.",
      400
    );
  }

  const employee = await prisma.employee.findFirst({
    where: {
      OR: [{ id: employeeRecordId }, { employeeId: employeeRecordId }],
    },
    select: { id: true, role: true },
  });
  if (!employee) throw new AppError("Employee not found", 404);
  if (employee.role !== Role.EMPLOYEE) {
    throw new AppError("Only employees can be assigned a supervisor.", 400);
  }

  const assignment = await changeEmployeeSupervisor(
    cycle.id,
    employee.id,
    {
      newSupervisorId: input.newSupervisorId,
      reason: input.reason,
      effectiveDate: input.effectiveDate,
    },
    changedById
  );

  const { batchByEmployee, supervisorByEmployee } = await loadAssignments(
    cycle.id
  );
  const updated = await prisma.employee.findUniqueOrThrow({
    where: { id: employee.id },
    select: employeePublicSelect,
  });

  return {
    cycle: { id: cycle.id, name: cycle.name, status: cycle.status },
    assignment,
    employee: mapEmployeeRow(
      updated,
      batchByEmployee.get(updated.id) ?? null,
      supervisorByEmployee.get(updated.id) ?? null
    ),
  };
}
