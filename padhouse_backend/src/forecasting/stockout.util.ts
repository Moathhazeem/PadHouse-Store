export type StockoutRisk = 'CRITICAL' | 'HIGH_RISK' | 'MEDIUM_RISK' | 'HEALTHY' | 'OUT_OF_STOCK' | 'UNKNOWN';

export interface RiskThresholds { criticalDays: number; highRiskDays: number; mediumRiskDays: number; }
export interface DemandPoint { date: string; expectedUnits: number; }
export interface IncomingStock { quantity: number; expectedAt: Date | string; }

export function classifyStockoutRisk(days: number | null, thresholds: RiskThresholds, outOfStock = false): StockoutRisk {
  if (outOfStock) return 'OUT_OF_STOCK';
  if (days === null || !Number.isFinite(days)) return 'UNKNOWN';
  if (days <= thresholds.criticalDays) return 'CRITICAL';
  if (days <= thresholds.highRiskDays) return 'HIGH_RISK';
  if (days <= thresholds.mediumRiskDays) return 'MEDIUM_RISK';
  return 'HEALTHY';
}

export function predictStockout(input: {
  availableStock: number; demand: DemandPoint[]; incoming: IncomingStock[]; generatedAt: Date;
  confidence: number | null; thresholds: RiskThresholds;
}) {
  const outOfStock = input.availableStock <= 0;
  const averageDailyDemand = input.demand.length
    ? input.demand.reduce((sum, point) => sum + Math.max(0, point.expectedUnits), 0) / input.demand.length : null;
  if (outOfStock) return { averageDailyDemand, estimatedStockoutDate: input.generatedAt, remainingDays: 0,
    riskLevel: 'OUT_OF_STOCK' as const, stockoutStatus: 'CONFIRMED' as const };
  if (!input.demand.length || input.demand.some((point) => !Number.isFinite(point.expectedUnits))) return {
    averageDailyDemand, estimatedStockoutDate: null, remainingDays: null,
    riskLevel: 'UNKNOWN' as const, stockoutStatus: 'INSUFFICIENT_DATA' as const,
  };
  let stock = input.availableStock;
  const incoming = [...input.incoming].filter((row) => row.quantity > 0)
    .map((row) => ({ ...row, day: utcDay(row.expectedAt) })).sort((a, b) => a.day.localeCompare(b.day));
  const first = input.demand[0].date.slice(0, 10);
  for (const point of input.demand) {
    const day = point.date.slice(0, 10);
    for (const receipt of incoming.filter((row) => row.day === day)) stock += receipt.quantity;
    stock -= Math.max(0, point.expectedUnits);
    if (stock <= 0) {
      const days = Math.max(0, Math.round((Date.parse(`${day}T00:00:00Z`) - Date.parse(`${first}T00:00:00Z`)) / 86400000));
      return { averageDailyDemand, estimatedStockoutDate: new Date(`${day}T00:00:00Z`), remainingDays: days,
        riskLevel: classifyStockoutRisk(days, input.thresholds), stockoutStatus: 'ESTIMATED' as const };
    }
  }
  // A forecast that never exhausts inventory only establishes a lower bound, not a date.
  return { averageDailyDemand, estimatedStockoutDate: null, remainingDays: null,
    riskLevel: 'HEALTHY' as const, stockoutStatus: 'BEYOND_FORECAST_HORIZON' as const };
}

function utcDay(value: Date | string) { return new Date(value).toISOString().slice(0, 10); }
