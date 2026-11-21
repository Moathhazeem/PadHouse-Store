-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "isUrgentCrisis" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metadata" JSONB;
