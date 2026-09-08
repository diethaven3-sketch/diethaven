-- CreateEnum
CREATE TYPE "InterventionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'DISCONTINUED');

-- CreateEnum
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'MORNING_SNACK', 'LUNCH', 'AFTERNOON_SNACK', 'DINNER', 'EVENING_SNACK');

-- CreateTable
CREATE TABLE "MealPlan" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "dietitianId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "meals" JSONB NOT NULL,
    "calorieTarget" DOUBLE PRECISION,
    "carbsTargetG" DOUBLE PRECISION,
    "proteinTargetG" DOUBLE PRECISION,
    "fatTargetG" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Intervention" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "dietitianId" TEXT NOT NULL,
    "diagnosisId" TEXT NOT NULL,
    "carePlanDetails" TEXT NOT NULL,
    "mealPlanId" TEXT,
    "prescription" JSONB,
    "status" "InterventionStatus" NOT NULL DEFAULT 'ACTIVE',
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Intervention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MealPlan_patientId_idx" ON "MealPlan"("patientId");

-- CreateIndex
CREATE INDEX "MealPlan_dietitianId_idx" ON "MealPlan"("dietitianId");

-- CreateIndex
CREATE UNIQUE INDEX "Intervention_mealPlanId_key" ON "Intervention"("mealPlanId");

-- CreateIndex
CREATE INDEX "Intervention_patientId_idx" ON "Intervention"("patientId");

-- CreateIndex
CREATE INDEX "Intervention_dietitianId_idx" ON "Intervention"("dietitianId");

-- CreateIndex
CREATE INDEX "Intervention_diagnosisId_idx" ON "Intervention"("diagnosisId");

-- AddForeignKey
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_dietitianId_fkey" FOREIGN KEY ("dietitianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_dietitianId_fkey" FOREIGN KEY ("dietitianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_diagnosisId_fkey" FOREIGN KEY ("diagnosisId") REFERENCES "Diagnosis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Intervention" ADD CONSTRAINT "Intervention_mealPlanId_fkey" FOREIGN KEY ("mealPlanId") REFERENCES "MealPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

