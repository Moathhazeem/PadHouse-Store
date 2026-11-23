ALTER TABLE "ForecastConfiguration"
  ADD COLUMN "scheduledForecastingEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "scheduledForecastingTime" TEXT NOT NULL DEFAULT '02:00',
  ADD COLUMN "lastScheduledForecastAt" TIMESTAMP(3),
  ADD COLUMN "alertStockoutDays" INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN "alertAccuracyWapeThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0.35,
  ADD COLUMN "alertOverstockDays" INTEGER NOT NULL DEFAULT 120;
