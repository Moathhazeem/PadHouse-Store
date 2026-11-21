-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "orderId" TEXT,
ADD COLUMN     "userId" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "autoEtaMinutes" INTEGER,
ADD COLUMN     "courierLocation" TEXT,
ADD COLUMN     "crisisReason" TEXT,
ADD COLUMN     "crisisResolvedAt" TIMESTAMP(3),
ADD COLUMN     "crisisStartedAt" TIMESTAMP(3),
ADD COLUMN     "crisisType" TEXT,
ADD COLUMN     "destLat" DOUBLE PRECISION,
ADD COLUMN     "destLng" DOUBLE PRECISION,
ADD COLUMN     "destinationLocation" TEXT,
ADD COLUMN     "distanceKm" DOUBLE PRECISION,
ADD COLUMN     "etaUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "isUrgentCrisis" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "manualEtaMinutes" INTEGER,
ADD COLUMN     "originLat" DOUBLE PRECISION,
ADD COLUMN     "originLng" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- CreateIndex
CREATE INDEX "Notification_orderId_idx" ON "Notification"("orderId");

-- CreateIndex
CREATE INDEX "Order_isUrgentCrisis_idx" ON "Order"("isUrgentCrisis");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
