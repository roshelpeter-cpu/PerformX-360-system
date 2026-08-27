/**
 * Completed-cycle appraisal history for employees and supervisors.
 * Employees only see their own records. Supervisors only see people
 * currently assigned to them.
 */
import { Role } from "../../generated/prisma/client.js";
import { prisma } from "../lib/prisma.js";
import { AppError } from "../utils/errors.js";
import { getEmployeeAppraisalProgress } from "./appraisal-progress.service.js";

async function resolveTargetEmployee(
  viewerId: string,
  requestedEmployeeId?: string
) {
  const viewer = await prisma.employee.findUnique({
    where: { id: viewerId },
    select: { id: true, role: true },
  });
  if (!viewer) throw new AppError("Authentication required", 401);

  if (viewer.role === Role.EMPLOYEE) {
    if (requestedEmployeeId && requestedEmployeeId !== viewer.id) {
      throw new AppError("You can only view your own appraisal history", 403);
    }
    return viewer.id;
  }

  if (viewer.role === Role.SUPERVISOR) {
    if (!requestedEmployeeId) {
      throw new AppError("Select an employee to view history", 400);
    }
    const activeCycle = await prisma.appraisalCycle.findFirst({
      where: { status: "ACTIVE" },
      select: { id: true },
    });
    const assigned = activeCycle
      ? await prisma.employeeSupervisorAssignment.findFirst({
          where: {
            cycleId: activeCycle.id,
            supervisorId: viewer.id,
            OR: [
              { employeeId: requestedEmployeeId },
              { employee: { employeeId: requestedEmployeeId } },
            ],
          },
          select: { employeeId: true },
        })
      : null;
    if (!assigned) {
      throw new AppError("This employee is not assigned to your team.", 404);
    }
    return assigned.employeeId;
  }

  throw new AppError("Appraisal history is not available for this role", 403);
}

export async function listHistoricalCycles(
  viewerId: string,
  requestedEmployeeId?: string
) {
  const employeeId = await resolveTargetEmployee(viewerId, requestedEmployeeId);

  const cycles = await prisma.appraisalCycle.findMany({
    where: {
      status: "COMPLETED",
      OR: [
        { batchAssignments: { some: { employeeId } } },
        { employeeProgress: { some: { employeeId } } },
        { appraisalOutcomes: { some: { employeeId } } },
        { pdps: { some: { employeeId } } },
        { meetings: { some: { employeeId } } },
      ],
    },
    orderBy: { startDate: "desc" },
    select: {
      id: true,
      name: true,
      status: true,
      startDate: true,
      endDate: true,
      description: true,
    },
  });

  return { employeeId, cycles };
}

export async function getHistoricalCycleDetail(
  viewerId: string,
  cycleId: string,
  requestedEmployeeId?: string
) {
  const employeeId = await resolveTargetEmployee(viewerId, requestedEmployeeId);

  const cycle = await prisma.appraisalCycle.findUnique({
    where: { id: cycleId },
    select: {
      id: true,
      name: true,
      status: true,
      startDate: true,
      endDate: true,
      description: true,
    },
  });
  if (!cycle) throw new AppError("Appraisal cycle not found", 404);

  const [progress, pdp, meetings, reviews] = await Promise.all([
    getEmployeeAppraisalProgress(employeeId, cycleId),
    prisma.personalDevelopmentPlan.findUnique({
      where: { cycleId_employeeId: { cycleId, employeeId } },
      include: {
        goals: { orderBy: { sortOrder: "asc" } },
      },
    }),
    prisma.meeting.findMany({
      where: { employeeId, cycleId, status: { not: "CANCELLED" } },
      include: {
        notes: true,
        supervisor: { select: { id: true, name: true, employeeId: true } },
      },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.appraisalReview.findMany({
      where: { employeeId, cycleId },
      include: {
        reviewer: { select: { id: true, name: true, employeeId: true } },
      },
      orderBy: { completedAt: "asc" },
    }),
  ]);

  return {
    cycle,
    progress,
    pdp: pdp
      ? {
          id: pdp.id,
          status: pdp.status,
          summary: pdp.summary,
          approvedAt: pdp.approvedAt,
          employeeAgreedAt: pdp.employeeAgreedAt,
          goals: pdp.goals.map((goal) => ({
            id: goal.id,
            title: goal.title,
            objective: goal.objective,
            progress: goal.progress,
            status: goal.status,
          })),
        }
      : null,
    meetings: meetings.map((meeting) => ({
      id: meeting.id,
      type: meeting.type,
      title: meeting.title,
      status: meeting.status,
      scheduledAt: meeting.scheduledAt,
      endAt: meeting.endAt,
      location: meeting.location,
      supervisor: meeting.supervisor,
      notes:
        meeting.status === "COMPLETED" && meeting.notes
          ? {
              discussionSummary: meeting.notes.discussionSummary,
              decisionsMade: meeting.notes.decisionsMade,
              keyPoints: meeting.notes.keyPoints,
              additionalComments: meeting.notes.additionalComments,
            }
          : null,
    })),
    reviews: reviews.map((review) => ({
      id: review.id,
      kind: review.kind,
      score: review.score,
      comments: review.comments,
      completedAt: review.completedAt,
      reviewer: review.reviewer,
    })),
  };
}
