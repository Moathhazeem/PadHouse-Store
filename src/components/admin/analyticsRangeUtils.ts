/**
 * analyticsRangeUtils.ts — shared date-range and number helpers for the admin
 * analytics sections (Sales & Profit analytics and Best-Selling Products).
 *
 * These are pure functions with no React or API coupling: they turn a UI preset
 * into the inclusive ISO window the analytics endpoints expect, and format the
 * resulting figures for the Arabic RTL dashboard. Kept in one place so every
 * analytics section filters by exactly the same boundaries.
 */

/** Date-range presets offered by the analytics filter bars. */
export type RangePreset =
  | 'today'
  | 'yesterday'
  | '7d'
  | '30d'
  | 'this-month'
  | 'last-month'
  | 'this-year'
  | 'custom';

export const RANGE_PRESETS: { key: RangePreset; label: string }[] = [
  { key: 'today', label: 'اليوم' },
  { key: 'yesterday', label: 'أمس' },
  { key: '7d', label: 'آخر 7 أيام' },
  { key: '30d', label: 'آخر 30 يوماً' },
  { key: 'this-month', label: 'هذا الشهر' },
  { key: 'last-month', label: 'الشهر الماضي' },
  { key: 'this-year', label: 'هذه السنة' },
  { key: 'custom', label: 'نطاق مخصص' },
];

export const toISODate = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const parseISODate = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
};

export const addDays = (d: Date, n: number): Date => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

/** Inclusive window (ISO `YYYY-MM-DD`) for the selected preset. */
export function rangeForPreset(
  preset: RangePreset,
  customFrom: string,
  customTo: string,
): { startDate: string; endDate: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (preset) {
    case 'today':
      return { startDate: toISODate(today), endDate: toISODate(today) };
    case 'yesterday': {
      const y = addDays(today, -1);
      return { startDate: toISODate(y), endDate: toISODate(y) };
    }
    case '7d':
      return { startDate: toISODate(addDays(today, -6)), endDate: toISODate(today) };
    case '30d':
      return { startDate: toISODate(addDays(today, -29)), endDate: toISODate(today) };
    case 'this-month': {
      const first = new Date(today.getFullYear(), today.getMonth(), 1);
      return { startDate: toISODate(first), endDate: toISODate(today) };
    }
    case 'last-month': {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      return { startDate: toISODate(first), endDate: toISODate(last) };
    }
    case 'this-year':
      return {
        startDate: toISODate(new Date(today.getFullYear(), 0, 1)),
        endDate: toISODate(today),
      };
    case 'custom':
    default: {
      const start = customFrom || toISODate(addDays(today, -29));
      const end = customTo || toISODate(today);
      // Guard against an inverted range.
      return start > end ? { startDate: end, endDate: start } : { startDate: start, endDate: end };
    }
  }
}

/** The equivalent window immediately preceding the given one (same day count). */
export function previousRange(startISO: string, endISO: string): { startDate: string; endDate: string } {
  const start = parseISODate(startISO);
  const end = parseISODate(endISO);
  const lenDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(lenDays - 1));
  return { startDate: toISODate(prevStart), endDate: toISODate(prevEnd) };
}

export const formatRangeLabel = (startISO: string, endISO: string): string => {
  if (startISO === endISO) {
    return parseISODate(startISO).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  const s = parseISODate(startISO).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' });
  const e = parseISODate(endISO).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  return `${s} — ${e}`;
};

/** Whole-number formatting (units, counts). */
export const formatCount = (value: number): string =>
  (value ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 });

/** Percentage formatting; renders an em-dash when the value is unavailable. */
export const formatPct = (value: number | null | undefined, digits = 1): string =>
  value == null ? '—' : `${value.toFixed(digits)}%`;

/** Rounded-up axis ceiling so chart Y labels stay clean. */
export function niceCeil(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 10;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalised = value / magnitude;
  const step = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10;
  return step * magnitude;
}
