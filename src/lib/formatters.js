// Shared number formatting utilities

export function formatNumber(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return '--';
  }
  const num = Number(value);
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatSignedNumber(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return '--';
  }
  const num = Number(value);
  const sign = num > 0 ? '+' : '';
  return sign + formatNumber(num, decimals);
}

export function formatPercent(value, decimals = 2) {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return '--';
  }
  const num = Number(value);
  const sign = num > 0 ? '+' : '';
  return sign + formatNumber(num, decimals) + '%';
}

export function getValueColorClass(value) {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return 'neutral';
  }
  const num = Number(value);
  if (num > 0) return 'positive';
  if (num < 0) return 'negative';
  return 'neutral';
}

export function getSideBadgeClass(shares) {
  return shares > 0 ? 'side-long' : 'side-short';
}

export function getSideLabel(shares) {
  return shares > 0 ? 'LONG' : 'SHORT';
}