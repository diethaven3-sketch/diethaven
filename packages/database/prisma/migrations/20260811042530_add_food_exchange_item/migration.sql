-- CreateEnum
CREATE TYPE "ExchangeGroup" AS ENUM ('STARCHES', 'LEGUMES', 'VEGETABLES', 'FRUITS', 'FATS', 'PROTEINS');

-- CreateTable
CREATE TABLE "FoodExchangeItem" (
    "id" TEXT NOT NULL,
    "foodName" TEXT NOT NULL,
    "exchangeGroup" "ExchangeGroup" NOT NULL,
    "portionSize" TEXT NOT NULL,
    "calories" DOUBLE PRECISION,
    "carbsG" DOUBLE PRECISION,
    "proteinG" DOUBLE PRECISION,
    "fatG" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodExchangeItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FoodExchangeItem_exchangeGroup_idx" ON "FoodExchangeItem"("exchangeGroup");
