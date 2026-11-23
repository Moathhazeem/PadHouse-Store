ALTER TABLE "ForecastConfiguration"
  ADD COLUMN "stockoutCriticalDays" INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN "stockoutHighRiskDays" INTEGER NOT NULL DEFAULT 7,
  ADD COLUMN "stockoutMediumRiskDays" INTEGER NOT NULL DEFAULT 14;

ALTER TABLE "Supplier" ADD COLUMN "leadTimeDays" INTEGER;
