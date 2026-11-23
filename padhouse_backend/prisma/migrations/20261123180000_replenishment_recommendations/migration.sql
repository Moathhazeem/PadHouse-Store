CREATE TABLE "ReplenishmentRecommendation" (
  "id" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "currentAvailableStock" INTEGER NOT NULL,
  "forecastedDemand" DECIMAL(12,3) NOT NULL,
  "leadTimeDemand" DECIMAL(12,3) NOT NULL,
  "reorderPoint" DECIMAL(12,3) NOT NULL,
  "safetyStock" INTEGER NOT NULL,
  "safetyStockOverride" INTEGER,
  "quantityOverride" INTEGER,
  "incomingQuantity" INTEGER NOT NULL,
  "recommendedQuantity" INTEGER NOT NULL,
  "supplierId" TEXT,
  "supplierName" TEXT,
  "estimatedStockoutAt" TIMESTAMP(3),
  "reason" TEXT NOT NULL,
  "limitation" TEXT,
  "calculation" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReplenishmentRecommendation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ReplenishmentRecommendation_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ReplenishmentRecommendation_productId_key" ON "ReplenishmentRecommendation"("productId");
CREATE INDEX "ReplenishmentRecommendation_runId_idx" ON "ReplenishmentRecommendation"("runId");
CREATE INDEX "ReplenishmentRecommendation_generatedAt_idx" ON "ReplenishmentRecommendation"("generatedAt");
