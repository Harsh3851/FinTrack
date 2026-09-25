const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_KEY = /^(\d{4})-(0[1-9]|1[0-2])$/;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const pad = (n: number) => String(n).padStart(2, '0');

/** True for a real calendar date written as YYYY-MM-DD. */
export function isIsoDate(value: string): boolean {
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number) as [number, number, number, number];
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function isMonthKey(value: string): boolean {
  return MONTH_KEY.test(value);
}

/** Transaction dates are calendar dates, stored as UTC midnight. */
export function isoDateToUtc(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function utcToIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Today's calendar date in the viewer's local time zone, as YYYY-MM-DD. */
export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function currentMonthKey(now: Date = new Date()): string {
  return todayIso(now).slice(0, 7);
}

/** "2026-09-25" -> "25-09-2026" */
export function formatDate(iso: string): string {
  const match = ISO_DATE.exec(iso.slice(0, 10));
  if (!match) return iso;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

/** "2026-09" -> "Sep 2026" (or "Sep" when short) */
export function formatMonth(key: string, short = false): string {
  const match = MONTH_KEY.exec(key);
  if (!match) return key;
  const label = MONTHS[Number(match[2]) - 1] ?? key;
  return short ? label : `${label} ${match[1]}`;
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number) as [number, number];
  const date = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}`;
}

/** Inclusive calendar bounds of a month as YYYY-MM-DD strings. */
export function monthBounds(key: string): { from: string; to: string } {
  const [y, m] = key.split('-').map(Number) as [number, number];
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${key}-01`, to: `${key}-${pad(last)}` };
}

/** The `count` month keys ending with `endKey`, oldest first. */
export function monthsEndingAt(endKey: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => shiftMonth(endKey, i - count + 1));
}
