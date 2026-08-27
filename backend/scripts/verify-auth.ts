import "dotenv/config";
import { prisma } from "../src/lib/prisma.js";
import { verifyPassword } from "../src/utils/password.js";
import { loginUser } from "../src/services/auth.service.js";
import { getDashboardForUser } from "../src/services/dashboard.service.js";
import { createForgotPasswordRequest } from "../src/services/auth.service.js";

const accounts = [
  "EMP000001",
  "SUP000001",
  "HR000001",
  "LED000001",
  "EMP000901",
  "EMP000902",
  "EMP000903",
  "EMP000904",
];

try {
  for (const employeeId of accounts) {
    const employee = await prisma.employee.findUnique({
      where: { employeeId },
    });
    if (!employee) throw new Error(`Missing employee ${employeeId}`);
    const good = await verifyPassword("DevTest@2026", employee.passwordHash);
    const bad = await verifyPassword("WrongPassword!", employee.passwordHash);
    if (!good || bad) {
      throw new Error(`Password hash check failed for ${employeeId}`);
    }
    const login = await loginUser(employeeId, "DevTest@2026");
    console.log("LOGIN_OK", login.user.employeeId, login.user.role, login.user.name);
    const dashboard = await getDashboardForUser(employee.id);
    console.log("DASH_OK", dashboard.role);
  }

  await loginUser("EMP000001", "WrongPassword!").then(
    () => {
      throw new Error("Incorrect password was accepted");
    },
    (error: { code?: string; statusCode?: number }) => {
      console.log("REJECT_BAD_PASSWORD", error.code, error.statusCode);
    }
  );

  await loginUser("NOPE999", "DevTest@2026").then(
    () => {
      throw new Error("Unknown employee was accepted");
    },
    (error: { code?: string; statusCode?: number }) => {
      console.log("REJECT_UNKNOWN", error.code, error.statusCode);
    }
  );

  const forgot = await createForgotPasswordRequest("EMP000901");
  console.log("CONTACT_HR", forgot);

  console.log("ALL_CHECKS_PASSED");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
