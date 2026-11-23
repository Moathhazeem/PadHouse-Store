export type ForecastModel =
  | 'MOVING_AVERAGE_7'
  | 'MOVING_AVERAGE_14'
  | 'MOVING_AVERAGE_30'
  | 'EXPONENTIAL_SMOOTHING'
  | 'HOLT_TREND'
  | 'WEEKLY_SEASONAL'
  | 'MONTHLY_SEASONAL';

export interface CandidateForecast {
  model: ForecastModel;
  values: number[];
}

export function errorMetrics(forecast: number[], actual: number[]) {
  const count = Math.min(forecast.length, actual.length);
  if (!count) return { sampleCount: 0, mae: null, rmse: null, wape: null, accuracy: null };
  const errors = Array.from({ length: count }, (_, i) => forecast[i] - actual[i]);
  const absoluteError = errors.reduce((sum, error) => sum + Math.abs(error), 0);
  const actualTotal = actual.slice(0, count).reduce((sum, value) => sum + Math.abs(value), 0);
  const mae = absoluteError / count;
  const rmse = Math.sqrt(errors.reduce((sum, error) => sum + error ** 2, 0) / count);
  // WAPE is undefined for zero actual volume; suppress percentage accuracy below a small-volume floor.
  const wape = actualTotal > 0 ? absoluteError / actualTotal : null;
  return { sampleCount: count, mae: round(mae), rmse: round(rmse), wape: wape === null ? null : round(wape, 4), accuracy: wape === null || actualTotal < 5 ? null : round(Math.max(0, 1 - wape) * 100, 1) };
}

/** Expanding-window one-step backtest. Every prediction sees history strictly before its target. */
export function rollingBacktest(history: number[], startDate: Date, minTrainDays = 28) {
  const predictions: number[] = [];
  const actual: number[] = [];
  const algorithms = new Map<string, { errors: number[]; absolute: number[]; actual: number[] }>();
  for (let target = minTrainDays; target < history.length; target += 1) {
    const train = history.slice(0, target);
    const targetDate = new Date(startDate.getTime() + target * 86_400_000);
    const selected = selectModel(train, startDate);
    const prediction = forecastWithModel(selected.model, train, 1, targetDate)[0] ?? 0;
    const observed = history[target];
    predictions.push(prediction); actual.push(observed);
    const bucket = algorithms.get(selected.model) ?? { errors: [], absolute: [], actual: [] };
    bucket.errors.push(prediction - observed); bucket.absolute.push(Math.abs(prediction - observed)); bucket.actual.push(observed);
    algorithms.set(selected.model, bucket);
  }
  return { ...errorMetrics(predictions, actual), predictions, actual, byAlgorithm: [...algorithms].map(([algorithm, values]) => ({ algorithm, ...errorMetrics(values.absolute.map((v, i) => v + values.actual[i]), values.actual) })) };
}

const clamp = (value: number) => Math.max(0, value);
const mean = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

export function movingAverageForecast(history: number[], window: 7 | 14 | 30, horizon: number) {
  const level = clamp(mean(history.slice(-window)));
  return Array.from({ length: horizon }, () => level);
}

export function exponentialSmoothingForecast(
  history: number[],
  horizon: number,
  alpha = 0.35,
): number[] {
  if (!history.length) return Array.from({ length: horizon }, () => 0);
  let level = history[0];
  for (const value of history.slice(1)) level = alpha * value + (1 - alpha) * level;
  return Array.from({ length: horizon }, () => clamp(level));
}

export function holtTrendForecast(history: number[], horizon: number, alpha = 0.35, beta = 0.2) {
  if (history.length < 2) return exponentialSmoothingForecast(history, horizon, alpha);
  let level = history[0];
  let trend = history[1] - history[0];
  for (const value of history.slice(1)) {
    const previous = level;
    level = alpha * value + (1 - alpha) * (level + trend);
    trend = beta * (level - previous) + (1 - beta) * trend;
  }
  return Array.from({ length: horizon }, (_, index) => clamp(level + (index + 1) * trend));
}

function weekdayForecast(history: number[], horizon: number, startDate: Date) {
  const overall = mean(history);
  if (overall === 0) return Array.from({ length: horizon }, () => 0);
  const sums = Array(7).fill(0);
  const counts = Array(7).fill(0);
  const start = new Date(startDate);
  start.setDate(start.getDate() - history.length);
  history.forEach((value, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    sums[day.getDay()] += value;
    counts[day.getDay()] += 1;
  });
  const factors = sums.map((sum, day) => (counts[day] ? sum / counts[day] / overall : 1));
  const base = movingAverageForecast(history, 30, horizon)[0] ?? overall;
  return Array.from({ length: horizon }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + index);
    return clamp(base * factors[date.getDay()]);
  });
}

function monthOfYearForecast(history: number[], horizon: number, startDate: Date) {
  const monthSums = Array(12).fill(0);
  const monthCounts = Array(12).fill(0);
  const start = new Date(startDate);
  start.setDate(start.getDate() - history.length);
  history.forEach((value, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    monthSums[date.getMonth()] += value;
    monthCounts[date.getMonth()] += 1;
  });
  const overall = mean(history);
  const base = movingAverageForecast(history, 30, horizon)[0] ?? overall;
  return Array.from({ length: horizon }, (_, index) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + index);
    const month = date.getMonth();
    const monthMean = monthCounts[month] ? monthSums[month] / monthCounts[month] : overall;
    return clamp(base * (overall > 0 ? monthMean / overall : 1));
  });
}

export function forecastWithModel(
  model: ForecastModel,
  history: number[],
  horizon: number,
  startDate: Date,
): number[] {
  if (model === 'MOVING_AVERAGE_7') return movingAverageForecast(history, 7, horizon);
  if (model === 'MOVING_AVERAGE_14') return movingAverageForecast(history, 14, horizon);
  if (model === 'MOVING_AVERAGE_30') return movingAverageForecast(history, 30, horizon);
  if (model === 'EXPONENTIAL_SMOOTHING') return exponentialSmoothingForecast(history, horizon);
  if (model === 'HOLT_TREND') return holtTrendForecast(history, horizon);
  if (model === 'WEEKLY_SEASONAL') return weekdayForecast(history, horizon, startDate);
  return monthOfYearForecast(history, horizon, startDate);
}

export function selectModel(history: number[], startDate: Date, windows: Array<7 | 14 | 30> = [7, 14, 30]): {
  model: ForecastModel;
  mae: number;
  rmse: number;
  candidates: Array<{ model: ForecastModel; mae: number }>;
} {
  const models: ForecastModel[] = [
    ...(windows.includes(7) ? ['MOVING_AVERAGE_7' as const] : []),
    ...(windows.includes(14) ? ['MOVING_AVERAGE_14' as const] : []),
    ...(windows.includes(30) ? ['MOVING_AVERAGE_30' as const] : []),
    'EXPONENTIAL_SMOOTHING',
    'HOLT_TREND',
  ];
  if (history.length >= 56) models.push('WEEKLY_SEASONAL');
  if (history.length >= 730) models.push('MONTHLY_SEASONAL');

  const firstValidation = Math.max(14, history.length - 28);
  const scores = models.map((model) => {
    const errors: number[] = [];
    for (let index = firstValidation; index < history.length; index += 1) {
      const targetDate = new Date(startDate);
      targetDate.setDate(startDate.getDate() + index);
      const prediction = forecastWithModel(model, history.slice(0, index), 1, targetDate)[0] ?? 0;
      errors.push(prediction - history[index]);
    }
    const mae = errors.length ? mean(errors.map(Math.abs)) : Number.POSITIVE_INFINITY;
    return { model, mae, rmse: errors.length ? Math.sqrt(mean(errors.map((e) => e * e))) : 0 };
  });
  scores.sort((a, b) => a.mae - b.mae || models.indexOf(a.model) - models.indexOf(b.model));
  return {
    model: scores[0].model,
    mae: scores[0].mae,
    rmse: scores[0].rmse,
    candidates: scores.map(({ model, mae }) => ({ model, mae: Number.isFinite(mae) ? round(mae) : 0 })),
  };
}

export function round(value: number, places = 2) {
  const factor = 10 ** places;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
