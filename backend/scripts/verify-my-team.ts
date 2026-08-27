import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { getDashboardForUser } from "../src/services/dashboard.service.js";
import { getEmployeeOverview } from "../src/services/employee-management.service.js";
import { getSupervisorTeam } from "../src/services/supervisor-team.service.js";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

try {
  const cycle = await prisma.appraisalCycle.findFirst({
    where: { status: "ACTIVE" },
  });
  assert(cycle, "No active appraisal cycle");

  const supervisorA = await prisma.employee.findUniqueOrThrow({
    where: { employeeId: "SUP000001" },
  });
  const supervisorB = await prisma.employee.findFirst({
    where: { role: "SUPERVISOR", id: { not: supervisorA.id } },
    orderBy: { employeeId: "asc" },
  });
  assert(supervisorB, "Need a second supervisor");

  const teamA = await getSupervisorTeam(supervisorA.id, { pageSize: 100 });
  const teamB = await getSupervisorTeam(supervisorB.id, { pageSize: 100 });

  const dbCountA = await prisma.employeeSupervisorAssignment.count({
    where: { cycleId: cycle.id, supervisorId: supervisorA.id },
  });
  const dbCountB = await prisma.employeeSupervisorAssignment.count({
    where: { cycleId: cycle.id, supervisorId: supervisorB.id },
  });

  assert(teamA.stats.teamSize === dbCountA, "Supervisor A team size mismatch");
  assert(teamB.stats.teamSize === dbCountB, "Supervisor B team size mismatch");
  assert(teamA.stats.teamSize > 0, "Supervisor A should have assigned employees");

  const idsA = new Set(teamA.employees.map((row) => row.id));
  const overlap = teamB.employees.filter((row) => idsA.has(row.id));
  assert(overlap.length === 0, "Supervisors must not share listed employees");

  const dashA = await getDashboardForUser(supervisorA.id);
  assert(dashA.role === "SUPERVISOR", "Dashboard role should be SUPERVISOR");
  assert(
    dashA.teamCount === dbCountA,
    "Dashboard teamCount must match assigned employees"
  );

  const employeeA = await prisma.employee.findUniqueOrThrow({
    where: { employeeId: "EMP000001" },
  });
  const employeeB = await prisma.employee.findUniqueOrThrow({
    where: { employeeId: "EMP000901" },
  });
  const dashEmpA = await getDashboardForUser(employeeA.id);
  const dashEmpB = await getDashboardForUser(employeeB.id);

  assert(dashEmpA.profile.employeeId === "EMP000001", "Employee A must see own ID");
  assert(dashEmpA.profile.name === employeeA.name, "Employee A must see own name");
  assert(dashEmpB.profile.employeeId === "EMP000901", "Employee B must see own ID");
  assert(dashEmpB.profile.name === employeeB.name, "Employee B must see own name");
  assert(dashEmpA.profile.name !== dashEmpB.profile.name, "Employees must differ");
  assert(dashEmpA.cycle?.name, "Employee A should see the active cycle");
  assert(dashEmpA.batch?.name, "Employee A should see an assigned batch");
  assert(dashEmpA.supervisor?.name, "Employee A should see assigned supervisor");
  assert(dashEmpA.profile.department?.name, "Employee A should see department");

  const assignmentA = await prisma.employeeSupervisorAssignment.findUnique({
    where: {
      cycleId_employeeId: { cycleId: cycle.id, employeeId: employeeA.id },
    },
    include: { supervisor: { select: { id: true, name: true } } },
  });
  assert(
    dashEmpA.supervisor?.id === assignmentA?.supervisor.id,
    "Banner supervisor must match PostgreSQL assignment"
  );

  const hr = await prisma.employee.findUniqueOrThrow({
    where: { employeeId: "HR000001" },
  });
  let hrBlocked = false;
  try {
    await getSupervisorTeam(hr.id);
  } catch {
    hrBlocked = true;
  }
  assert(hrBlocked, "HR must not access supervisor My Team data");

  const overview = await getEmployeeOverview({});
  assert(overview.batches.length === 3, "HR overview should still have 3 batches");
  assert(overview.stats.totalEmployees > 0, "HR KPI total employees should load");

  console.log("TEAM_A", {
    supervisor: supervisorA.employeeId,
    size: teamA.stats.teamSize,
    sample: teamA.employees.slice(0, 3).map((row) => row.employeeId),
  });
  console.log("TEAM_B", {
    supervisor: supervisorB.employeeId,
    size: teamB.stats.teamSize,
    sample: teamB.employees.slice(0, 3).map((row) => row.employeeId),
  });
  console.log("EMPLOYEE_A", {
    name: dashEmpA.profile.name,
    department: dashEmpA.profile.department?.name,
    supervisor: dashEmpA.supervisor?.name,
    batch: dashEmpA.batch?.name,
    cycle: dashEmpA.cycle?.name,
  });
  console.log("EMPLOYEE_B", {
    name: dashEmpB.profile.name,
    department: dashEmpB.profile.department?.name,
    supervisor: dashEmpB.supervisor?.name,
    batch: dashEmpB.batch?.name,
    cycle: dashEmpB.cycle?.name,
  });
  console.log("HR_OVERVIEW", {
    totalEmployees: overview.stats.totalEmployees,
    batches: overview.batches.map((batch) => ({
      name: batch.name,
      count: batch.employeeCount,
    })),
  });
  console.log("ALL_MY_TEAM_AND_SNAPSHOT_CHECKS_PASSED");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
