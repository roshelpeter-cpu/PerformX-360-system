import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  const cycles = await prisma.appraisalCycle.findMany({
    orderBy: { startDate: "asc" },
    include: { batches: { orderBy: { batchNumber: "asc" } } },
  });
  console.log("Cycles:");
  for (const cycle of cycles) {
    console.log(`  ${cycle.name} ${cycle.status}`);
    for (const batch of cycle.batches) {
      console.log(
        `    ${batch.name} stage=${batch.currentStage} status=${batch.status}`
      );
    }
  }

  const active = cycles.find((item) => item.status === "ACTIVE");
  if (active) {
    const withoutBatch = await prisma.employee.count({
      where: {
        role: "EMPLOYEE",
        batchAssignments: { none: { cycleId: active.id } },
      },
    });
    const withoutSupervisor = await prisma.employee.count({
      where: {
        role: "EMPLOYEE",
        supervisorAssignmentsAsEmployee: { none: { cycleId: active.id } },
      },
    });
    console.log(`Needs assignment: no batch=${withoutBatch} no supervisor=${withoutSupervisor}`);
    const history = await prisma.batchAssignmentHistory.count({
      where: { cycleId: active.id },
    });
    const hist2024 = cycles.find((item) => item.name.includes("2024"));
    const history2024 = hist2024
      ? await prisma.batchAssignmentHistory.count({ where: { cycleId: hist2024.id } })
      : 0;
    console.log(`Assignment history 2026 batch=${history} 2024 batch=${history2024}`);
  }

  const demo = await prisma.employee.findMany({
    where: {
      employeeId: {
        in: ["EMP000001", "EMP000901", "EMP000902", "EMP000903", "EMP000904"],
      },
    },
    include: {
      cycleProgress: true,
      pdpsAsEmployee: true,
      appraisalOutcomes: true,
    },
  });
  for (const employee of demo) {
    const progress = employee.cycleProgress[0];
    const pdp = employee.pdpsAsEmployee[0];
    const outcome = employee.appraisalOutcomes[0];
    console.log(
      `${employee.employeeId} ${employee.name} stage=${progress?.currentStage} pdp=${pdp?.status} pip=${outcome?.pipStatus ?? "n/a"} award=${outcome?.awardReceived ?? false}`
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
