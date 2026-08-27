import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { loginUser } from "../src/services/auth.service.js";
import { createForgotPasswordRequest } from "../src/services/auth.service.js";
import {
  getEmployeeOverview,
  listHrUsers,
  listLeadershipUsers,
  listWorkforceSupervisors,
  reassignEmployeeSupervisor,
} from "../src/services/employee-management.service.js";

try {
  const employeeCount = await prisma.employee.count({ where: { role: "EMPLOYEE" } });
  const supervisorCount = await prisma.employee.count({ where: { role: "SUPERVISOR" } });
  const hrCount = await prisma.employee.count({ where: { role: "HR" } });
  const leadershipCount = await prisma.employee.count({ where: { role: "LEADERSHIP" } });

  const cycle = await prisma.appraisalCycle.findFirst({
    where: { status: "ACTIVE" },
    include: { batches: { orderBy: { batchNumber: "asc" } } },
  });
  if (!cycle) throw new Error("No active cycle");

  const employees = await prisma.employee.findMany({
    where: { role: "EMPLOYEE" },
    select: { id: true, employeeId: true },
  });
  const employeeIds = employees.map((item) => item.id);

  const batchAssignments = await prisma.employeeBatchAssignment.findMany({
    where: { cycleId: cycle.id, employeeId: { in: employeeIds } },
    select: { employeeId: true, batchId: true },
  });
  const supervisorAssignments = await prisma.employeeSupervisorAssignment.findMany({
    where: { cycleId: cycle.id, employeeId: { in: employeeIds } },
    select: { employeeId: true, supervisorId: true },
  });

  const assignedEmployeeIds = new Set(batchAssignments.map((row) => row.employeeId));
  const supervisedIds = new Set(supervisorAssignments.map((row) => row.employeeId));
  const missingBatch = employees.filter((item) => !assignedEmployeeIds.has(item.id)).length;
  const missingSupervisor = employees.filter((item) => !supervisedIds.has(item.id)).length;

  const batchCounts = cycle.batches.map((batch) => ({
    name: batch.name,
    count: batchAssignments.filter((row) => row.batchId === batch.id).length,
  }));

  const overview = await getEmployeeOverview({});
  const supervisors = await listWorkforceSupervisors({ pageSize: 500 });
  const hr = await listHrUsers({});
  const leadership = await listLeadershipUsers({});

  console.log("COUNTS", {
    employeeCount,
    supervisorCount,
    hrCount,
    leadershipCount,
    missingBatch,
    missingSupervisor,
    batchCounts,
    overviewBatches: overview.batches.map((batch) => ({
      name: batch.name,
      count: batch.employeeCount,
    })),
    supervisorRows: supervisors.total,
    hrRows: hr.total,
    leadershipRows: leadership.total,
  });

  const sample = await prisma.employee.findFirst({
    where: { role: "EMPLOYEE", employeeId: "EMP000002" },
    include: {
      supervisorAssignmentsAsEmployee: {
        where: { cycleId: cycle.id },
        include: { supervisor: { select: { id: true, employeeId: true, name: true } } },
      },
    },
  });
  if (!sample) throw new Error("EMP000002 missing");
  const currentSupervisor = sample.supervisorAssignmentsAsEmployee[0]?.supervisor;
  const otherSupervisor = await prisma.employee.findFirst({
    where: {
      role: "SUPERVISOR",
      departmentId: sample.departmentId,
      id: { not: currentSupervisor?.id },
    },
    select: { id: true, employeeId: true, name: true },
  });
  if (!currentSupervisor || !otherSupervisor) {
    throw new Error("Could not find a second supervisor for reassignment test");
  }

  const hrUser = await prisma.employee.findUniqueOrThrow({
    where: { employeeId: "HR000001" },
  });

  await reassignEmployeeSupervisor(
    sample.id,
    {
      newSupervisorId: otherSupervisor.id,
      reason: "Verification of persistent supervisor reassignment",
    },
    hrUser.id
  );

  const after = await prisma.employeeSupervisorAssignment.findUnique({
    where: { cycleId_employeeId: { cycleId: cycle.id, employeeId: sample.id } },
    include: { supervisor: { select: { employeeId: true, name: true } } },
  });
  if (after?.supervisorId !== otherSupervisor.id) {
    throw new Error("Reassignment did not persist in PostgreSQL");
  }
  console.log("REASSIGN_OK", {
    employee: sample.employeeId,
    from: currentSupervisor.employeeId,
    to: after.supervisor.employeeId,
  });

  const login = await loginUser("HR000001", "DevTest@2026");
  console.log("LOGIN_OK", login.user.employeeId, login.user.role);
  const forgot = await createForgotPasswordRequest("EMP000901");
  console.log("CONTACT_HR_OK", forgot.created);

  console.log("ALL_EMPLOYEE_MANAGEMENT_CHECKS_PASSED");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
