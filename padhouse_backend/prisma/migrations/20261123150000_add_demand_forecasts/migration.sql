CREATE TABLE "DemandForecastRun" (
    "id" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "historyStart" TIMESTAMP(3) NOT NULL,
    "historyDays" INTEGER NOT NULL,
    "productCount" INTEGER NOT NULL,
    "movingAverageWindows" INTEGER[] NOT NULL,
    CONSTRAINT "DemandForecastRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DemandForecast" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "categoryId" TEXT,
    "categoryName" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "selectedModel" TEXT,
    "trainingDays" INTEGER NOT NULL,
    "salesUnits" INTEGER NOT NULL,
    "refundedUnitsProxy" INTEGER NOT NULL DEFAULT 0,
    "metrics" JSONB NOT NULL,
    "horizons" JSONB NOT NULL,
    "dailyForecast" JSONB,
    "dataQuality" JSONB NOT NULL,
    CONSTRAINT "DemandForecast_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DemandForecastRun_generatedAt_idx" ON "DemandForecastRun"("generatedAt");
CREATE INDEX "DemandForecast_runId_idx" ON "DemandForecast"("runId");
CREATE INDEX "DemandForecast_productId_generatedAt_idx" ON "DemandForecast"("productId", "generatedAt");
CREATE INDEX "DemandForecast_generatedAt_idx" ON "DemandForecast"("generatedAt");
CREATE INDEX "DemandForecast_status_idx" ON "DemandForecast"("status");

ALTER TABLE "DemandForecast" ADD CONSTRAINT "DemandForecast_runId_fkey"
FOREIGN KEY ("runId") REFERENCES "DemandForecastRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DemandForecast" ADD CONSTRAINT "DemandForecast_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
