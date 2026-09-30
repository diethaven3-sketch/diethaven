-- AlterTable
ALTER TABLE "Invite" ADD COLUMN "verificationHash" TEXT,
ADD COLUMN "verificationExpiresAt" TIMESTAMP(3),
ADD COLUMN "verificationSentAt" TIMESTAMP(3),
ADD COLUMN "verificationAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "verificationSendCount" INTEGER NOT NULL DEFAULT 0;
