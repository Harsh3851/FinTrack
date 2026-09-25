import { describe, expect, it } from 'vitest';
import {
  formatCompactINR,
  formatDate,
  formatINR,
  formatMonth,
  isIsoDate,
  monthBounds,
  monthsEndingAt,
  paiseToRupeesString,
  rupeesToPaise,
  shiftMonth,
} from '../src';

describe('money', () => {
  it('formats paise as INR with lakh/crore grouping', () => {
    expect(formatINR(12_345_600)).toBe('₹1,23,456.00');
    expect(formatINR(1_00_00_000_00)).toBe('₹1,00,00,000.00');
    expect(formatINR(-5_050)).toBe('-₹50.50');
    expect(formatINR(99_900, { signed: true })).toBe('+₹999.00');
    expect(formatINR(12_345_678, { whole: true })).toBe('₹1,23,457');
  });

  it('formats compact axis labels', () => {
    expect(formatCompactINR(95_000)).toBe('₹950');
    expect(formatCompactINR(1_250_000)).toBe('₹12.5K');
    expect(formatCompactINR(34_000_000)).toBe('₹3.4L');
    expect(formatCompactINR(1_20_00_000_00)).toBe('₹1.2Cr');
  });

  it('converts rupee input to integer paise without float drift', () => {
    expect(rupeesToPaise('1,250.5')).toBe(125_050);
    expect(rupeesToPaise('0.29')).toBe(29);
    expect(rupeesToPaise(19.99)).toBe(1_999);
    expect(() => rupeesToPaise('12.345')).toThrow();
    expect(() => rupeesToPaise('abc')).toThrow();
    expect(paiseToRupeesString(125_050)).toBe('1250.50');
    expect(paiseToRupeesString(5)).toBe('0.05');
  });
});

describe('dates', () => {
  it('validates real calendar dates', () => {
    expect(isIsoDate('2024-02-29')).toBe(true);
    expect(isIsoDate('2026-02-29')).toBe(false);
    expect(isIsoDate('2026-13-01')).toBe(false);
    expect(isIsoDate('25-09-2026')).toBe(false);
  });

  it('formats as DD-MM-YYYY and month labels', () => {
    expect(formatDate('2026-09-05')).toBe('05-09-2026');
    expect(formatMonth('2026-09')).toBe('Sep 2026');
    expect(formatMonth('2026-09', true)).toBe('Sep');
  });

  it('does month arithmetic across year boundaries', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2025-12', 1)).toBe('2026-01');
    expect(monthBounds('2024-02')).toEqual({ from: '2024-02-01', to: '2024-02-29' });
    expect(monthsEndingAt('2026-02', 3)).toEqual(['2025-12', '2026-01', '2026-02']);
  });
});
