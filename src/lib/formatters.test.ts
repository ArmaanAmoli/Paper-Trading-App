import { describe, expect, it } from 'vitest';
import {
  formatNumber,
  formatPercent,
  formatSignedNumber,
  getSideBadgeClass,
  getSideLabel,
  getValueColorClass,
} from './formatters';

describe('formatNumber', () => {
  it('formats a numeric value with two decimals by default', () => {
    expect(formatNumber(1234.5)).toBe('1,234.50');
  });

  it('honours the requested number of decimals', () => {
    expect(formatNumber(1234.5678, 3)).toBe('1,234.568');
    expect(formatNumber(1234.5678, 0)).toBe('1,235');
  });

  it('formats numeric strings', () => {
    expect(formatNumber('42')).toBe('42.00');
  });

  it('returns a placeholder for values that are not numbers', () => {
    expect(formatNumber(null)).toBe('--');
    expect(formatNumber(undefined)).toBe('--');
    expect(formatNumber('not-a-number')).toBe('--');
    expect(formatNumber(Number.NaN)).toBe('--');
  });
});

describe('formatSignedNumber', () => {
  it('prefixes positive values with a plus sign', () => {
    expect(formatSignedNumber(12.5)).toBe('+12.50');
  });

  it('does not prefix negative values or zero', () => {
    expect(formatSignedNumber(-12.5)).toBe('-12.50');
    expect(formatSignedNumber(0)).toBe('0.00');
  });

  it('returns a placeholder for invalid values', () => {
    expect(formatSignedNumber(undefined)).toBe('--');
  });
});

describe('formatPercent', () => {
  it('formats a signed percentage', () => {
    expect(formatPercent(3.456)).toBe('+3.46%');
    expect(formatPercent(-3.456)).toBe('-3.46%');
    expect(formatPercent(0)).toBe('0.00%');
  });

  it('returns a placeholder for invalid values', () => {
    expect(formatPercent(null)).toBe('--');
  });
});

describe('getValueColorClass', () => {
  it('maps positive values to positive', () => {
    expect(getValueColorClass(0.01)).toBe('positive');
  });

  it('maps negative values to negative', () => {
    expect(getValueColorClass(-0.01)).toBe('negative');
  });

  it('maps zero and invalid values to neutral', () => {
    expect(getValueColorClass(0)).toBe('neutral');
    expect(getValueColorClass(undefined)).toBe('neutral');
    expect(getValueColorClass('abc')).toBe('neutral');
  });
});

describe('side helpers', () => {
  it('maps positive share counts to long positions', () => {
    expect(getSideBadgeClass(5)).toBe('side-long');
    expect(getSideLabel(5)).toBe('LONG');
  });

  it('maps zero and negative share counts to short positions', () => {
    expect(getSideBadgeClass(0)).toBe('side-short');
    expect(getSideBadgeClass(-5)).toBe('side-short');
    expect(getSideLabel(0)).toBe('SHORT');
    expect(getSideLabel(-5)).toBe('SHORT');
  });
});
