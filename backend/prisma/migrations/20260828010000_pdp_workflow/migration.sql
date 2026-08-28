-- AlterEnum
ALTER TYPE "PdpStatus" ADD VALUE 'READY_FOR_ASSIGNMENT';
ALTER TYPE "PdpStatus" ADD VALUE 'ASSIGNED';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'PDP_ASSIGNED';
ALTER TYPE "NotificationType" ADD VALUE 'PDP_REDIRECTED';

-- AlterEnum
ALTER TYPE "PdpReviewKind" ADD VALUE 'HR_CHANGE_REQUEST';
ALTER TYPE "PdpReviewKind" ADD VALUE 'SUPERVISOR_REDIRECT';

-- AlterTable
ALTER TABLE "PersonalDevelopmentPlan" ADD COLUMN "assignedAt" TIMESTAMP(3),
ADD COLUMN "employeeChangeRequest" TEXT,
ADD COLUMN "hrChangeRequest" TEXT,
ADD COLUMN "redirectedReason" TEXT;
