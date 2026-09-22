-- CreateTable
CREATE TABLE "FoodLog" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mealType" "MealType" NOT NULL,
    "items" JSONB NOT NULL,
    "description" TEXT,
    "photoUrl" TEXT,
    "hungerBefore" INTEGER,
    "fullnessAfter" INTEGER,
    "symptoms" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FoodLog_patientId_idx" ON "FoodLog"("patientId");

-- CreateIndex
CREATE INDEX "FoodLog_patientId_date_idx" ON "FoodLog"("patientId", "date");

-- AddForeignKey
ALTER TABLE "FoodLog" ADD CONSTRAINT "FoodLog_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

