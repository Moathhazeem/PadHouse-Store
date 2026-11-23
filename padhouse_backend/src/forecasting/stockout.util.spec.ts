import { classifyStockoutRisk, predictStockout } from './stockout.util';

const generatedAt = new Date('2026-11-23T00:00:00.000Z');
const thresholds = { criticalDays: 2, highRiskDays: 7, mediumRiskDays: 14 };
const days = (values: number[]) => values.map((expectedUnits, index) => ({
  date: new Date(generatedAt.getTime() + (index + 1) * 86400000).toISOString().slice(0, 10), expectedUnits,
}));

describe('stockout prediction', () => {
  it('uses changing daily forecasts and adds confirmed incoming stock on its receipt date', () => {
    const result = predictStockout({ availableStock: 5, demand: days([2, 2, 2, 2]),
      incoming: [{ quantity: 5, expectedAt: '2026-11-25T00:00:00.000Z' }], generatedAt, confidence: 0.8, thresholds });
    expect(result.estimatedStockoutDate).toBeNull();
    const changing = predictStockout({ availableStock: 5, demand: days([1, 1, 5, 1]), incoming: [], generatedAt, confidence: 0.7, thresholds });
    expect(changing.remainingDays).toBe(2);
    expect(changing.averageDailyDemand).toBe(2);
  });

  it('distinguishes confirmed out of stock and insufficient forecast data', () => {
    expect(predictStockout({ availableStock: 0, demand: [], incoming: [], generatedAt, confidence: null, thresholds }).stockoutStatus).toBe('CONFIRMED');
    expect(predictStockout({ availableStock: 10, demand: [], incoming: [], generatedAt, confidence: null, thresholds }).stockoutStatus).toBe('INSUFFICIENT_DATA');
  });

  it('classifies the configured risk boundaries', () => {
    expect(classifyStockoutRisk(2, thresholds)).toBe('CRITICAL');
    expect(classifyStockoutRisk(7, thresholds)).toBe('HIGH_RISK');
    expect(classifyStockoutRisk(14, thresholds)).toBe('MEDIUM_RISK');
    expect(classifyStockoutRisk(15, thresholds)).toBe('HEALTHY');
  });
});
