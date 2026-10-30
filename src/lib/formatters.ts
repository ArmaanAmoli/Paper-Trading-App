// Shared number formatting utilities

export function formatNumber(value: unknown, decimals = 2): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return '--';
  }
  const num = Number(value);
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatSignedNumber(value: unknown, decimals = 2): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return '--';
  }
  const num = Number(value);
  const sign = num > 0 ? '+' : '';
  return sign + formatNumber(num, decimals);
}

export function formatPercent(value: unknown, decimals = 2): string {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return '--';
  }
  const num = Number(value);
  const sign = num > 0 ? '+' : '';
  return sign + formatNumber(num, decimals) + '%';
}

export type ColorClass = 'positive' | 'negative' | 'neutral';

export function getValueColorClass(value: unknown): ColorClass {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return 'neutral';
  }
  const num = Number(value);
  if (num > 0) return 'positive';
  if (num < 0) return 'negative';
  return 'neutral';
}

export type SideBadgeClass = 'side-long' | 'side-short';

export function getSideBadgeClass(shares: number): SideBadgeClass {
  return shares > 0 ? 'side-long' : 'side-short';
}

export type SideLabel = 'LONG' | 'SHORT';

export function getSideLabel(shares: number): SideLabel {
  return shares > 0 ? 'LONG' : 'SHORT';
}
