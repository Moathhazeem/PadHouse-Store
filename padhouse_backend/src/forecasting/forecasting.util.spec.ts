import {
  exponentialSmoothingForecast,
  forecastWithModel,
  holtTrendForecast,
  movingAverageForecast,
  errorMetrics,
  rollingBacktest,
  selectModel,
} from './forecasting.util';

describe('forecasting statistical utilities', () => {
  it('uses the requested moving-average window and keeps demand non-negative', () => {
    expect(movingAverageForecast([1, 2, 3, 4, 5, 6, 7, 8], 7, 2)).toEqual([5, 5]);
    expect(movingAverageForecast([-1, -1, -1], 7, 1)).toEqual([0]);
  });

  it('exponential smoothing gives recent observations greater influence', () => {
    const result = exponentialSmoothingForecast([2, 2, 10], 3, 0.5);
    expect(result).toEqual([6, 6, 6]);
  });

  it('Holt trend projects increasing demand without negative units', () => {
    const result = holtTrendForecast([1, 2, 3, 4, 5], 3);
    expect(result[2]).toBeGreaterThan(result[0]);
    expect(holtTrendForecast([5, 0, 0], 1)[0]).toBeGreaterThanOrEqual(0);
  });

  it('adds weekly seasonality only after enough history and selects by walk-forward error', () => {
    const history = Array.from({ length: 84 }, (_, day) => day % 7 === 0 ? 8 : 1);
    const selected = selectModel(history, new Date('2026-01-01T00:00:00Z'));
    expect(selected.candidates.some((candidate) => candidate.model === 'WEEKLY_SEASONAL')).toBe(true);
    expect(selected.model).toBe('WEEKLY_SEASONAL');
  });

  it('dispatches all supported model names', () => {
    const date = new Date('2026-01-01T00:00:00Z');
    for (const model of [
      'MOVING_AVERAGE_7', 'MOVING_AVERAGE_14', 'MOVING_AVERAGE_30',
      'EXPONENTIAL_SMOOTHING', 'HOLT_TREND', 'WEEKLY_SEASONAL', 'MONTHLY_SEASONAL',
    ] as const) {
      expect(forecastWithModel(model, Array(730).fill(2), 90, date)).toHaveLength(90);
    }
  });

  it('suppresses percentage accuracy when actual demand is zero or immaterial', () => {
    expect(errorMetrics([3, 1], [0, 0])).toMatchObject({ mae: 2, rmse: expect.any(Number), wape: null, accuracy: null });
    expect(errorMetrics([1], [2])).toMatchObject({ wape: 0.5, accuracy: null });
    expect(errorMetrics([8], [10])).toMatchObject({ wape: 0.2, accuracy: 80 });
  });

  it('walks forward using only observations before each forecast date', () => {
    const prefix = Array(28).fill(2);
    const baseline = rollingBacktest([...prefix, ...Array(5).fill(2)], new Date('2026-01-01T00:00:00Z'));
    const contaminated = rollingBacktest([...prefix, ...Array(5).fill(200)], new Date('2026-01-01T00:00:00Z'));
    expect(baseline.predictions[0]).toBe(contaminated.predictions[0]);
    expect(baseline.actual[0]).toBe(2);
    expect(contaminated.actual[0]).toBe(200);
    expect(baseline.sampleCount).toBe(5);
  });
});
