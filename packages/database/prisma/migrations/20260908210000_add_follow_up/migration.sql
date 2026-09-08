-- CreateEnum
CREATE TYPE "OutcomeStatus" AS ENUM ('RESOLVED', 'IMPROVED', 'UNCHANGED', 'WORSENED');

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "dietitianId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diagnosisId" TEXT,
    "interventionId" TEXT,
    "outcome" "OutcomeStatus" NOT NULL,
    "notes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FollowUp_patientId_idx" ON "FollowUp"("patientId");

-- CreateIndex
CREATE INDEX "FollowUp_dietitianId_idx" ON "FollowUp"("dietitianId");

-- CreateIndex
CREATE INDEX "FollowUp_diagnosisId_idx" ON "FollowUp"("diagnosisId");

-- CreateIndex
CREATE INDEX "FollowUp_interventionId_idx" ON "FollowUp"("interventionId");

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_dietitianId_fkey" FOREIGN KEY ("dietitianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_diagnosisId_fkey" FOREIGN KEY ("diagnosisId") REFERENCES "Diagnosis"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_interventionId_fkey" FOREIGN KEY ("interventionId") REFERENCES "Intervention"("id") ON DELETE SET NULL ON UPDATE CASCADE;

