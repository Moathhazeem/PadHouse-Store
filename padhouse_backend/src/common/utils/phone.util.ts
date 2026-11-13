/**
 * Palestinian phone number helpers.
 * Supported formats:
 *  - Mobile: 059xxxxxxx / 056xxxxxxx / 058xxxxxxx, with optional +970 / 00970 / 0 prefix
 *  - Landline: 0(2|4|8|9)xxxxxxx
 */

const MOBILE_REGEX = /^(?:\+970|00970|0)?5[0-9]{8}$/;
const LANDLINE_REGEX = /^(?:\+970|00970|0)(?:2|4|8|9)[0-9]{7}$/;

export function normalizePalestinianPhone(input: string): string {
  const digits = (input || '').replace(/[^\d+]/g, '').trim();
  if (digits.startsWith('+970')) return `0${digits.slice(4)}`;
  if (digits.startsWith('00970')) return `0${digits.slice(5)}`;
  if (digits.startsWith('970')) return `0${digits.slice(3)}`;
  return digits;
}

export function isValidPalestinianPhone(input: string): boolean {
  const normalized = normalizePalestinianPhone(input);
  if (!normalized) return false;
  return MOBILE_REGEX.test(normalized) || LANDLINE_REGEX.test(normalized);
}

export function formatPalestinianPhone(input: string): string {
  const normalized = normalizePalestinianPhone(input);
  if (normalized.length === 10 && normalized.startsWith('0')) {
    return `${normalized.slice(0, 3)} ${normalized.slice(3, 6)} ${normalized.slice(6)}`;
  }
  return normalized;
}
