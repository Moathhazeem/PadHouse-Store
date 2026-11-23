CREATE TABLE "ForecastProductResult" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "forecastDate" DATE NOT NULL,
  "horizonDays" INTEGER NOT NULL,
  "forecastedQuantity" DECIMAL(12,3) NOT NULL,
  "lowerBound" DECIMAL(12,3) NOT NULL,
  "upperBound" DECIMAL(12,3) NOT NULL,
  "algorithm" TEXT NOT NULL,
  "confidence" DECIMAL(5,4) NOT NULL,
  "dataQualityStatus" TEXT NOT NULL,
  "modelVersion" TEXT NOT NULL,
  "evaluationResults" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ForecastProductResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ForecastConfiguration" (
  "id" TEXT NOT NULL DEFAULT 'default',
  "historyDays" INTEGER NOT NULL DEFAULT 730,
  "movingAverageWindows" INTEGER[] NOT NULL DEFAULT ARRAY[7,14,30]::INTEGER[],
  "defaultHorizonDays" INTEGER NOT NULL DEFAULT 30,
  "stockoutLeadDays" INTEGER NOT NULL DEFAULT 14,
  "overstockCoverDays" INTEGER NOT NULL DEFAULT 90,
  "updatedById" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ForecastConfiguration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ForecastProductResult_runId_productId_forecastDate_horizonDays_key"
  ON "ForecastProductResult"("runId", "productId", "forecastDate", "horizonDays");
CREATE INDEX "ForecastProductResult_forecastDate_horizonDays_idx" ON "ForecastProductResult"("forecastDate", "horizonDays");
CREATE INDEX "ForecastProductResult_productId_forecastDate_idx" ON "ForecastProductResult"("productId", "forecastDate");
CREATE INDEX "ForecastProductResult_runId_horizonDays_idx" ON "ForecastProductResult"("runId", "horizonDays");
CREATE INDEX "ForecastConfiguration_updatedAt_idx" ON "ForecastConfiguration"("updatedAt");

ALTER TABLE "ForecastProductResult" ADD CONSTRAINT "ForecastProductResult_runId_fkey"
  FOREIGN KEY ("runId") REFERENCES "DemandForecastRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ForecastProductResult" ADD CONSTRAINT "ForecastProductResult_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ForecastConfiguration" ADD CONSTRAINT "ForecastConfiguration_updatedById_fkey"
  FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
