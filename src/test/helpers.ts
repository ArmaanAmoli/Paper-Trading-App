export interface JwtClaims {
  exp?: number;
  [key: string]: unknown;
}

function base64UrlEncode(value: unknown): string {
  const json = JSON.stringify(value);
  const base64 = btoa(json);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function createJwt(claims: JwtClaims): string {
  const header = base64UrlEncode({ alg: 'HS256', typ: 'JWT' });
  const payload = base64UrlEncode(claims);
  const signature = base64UrlEncode({ signature: 'test' });
  return `${header}.${payload}.${signature}`;
}

export function createValidToken(overrides: JwtClaims = {}): string {
  return createJwt({ exp: Math.floor(Date.now() / 1000) + 3600, ...overrides });
}

export function createExpiredToken(): string {
  return createJwt({ exp: Math.floor(Date.now() / 1000) - 3600 });
}

export function createUserData(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    _id: 'user-1',
    username: 'tester',
    email: 'tester@example.com',
    balance: 1000,
    blockedMargin: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    lastLogin: null,
    notificationSubscription: null,
    ...overrides,
  };
}

export function createPortfolioPosition(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    _id: 'position-1',
    userId: 'user-1',
    symbol: 'AAPL',
    shares: 10,
    avgPrice: 100,
    positionType: 'long',
    lastUpdated: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

export function createQuote(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    ticker: 'AAPL',
    currentPrice: 150,
    change: 5,
    percentChange: 3.33,
    ...overrides,
  };
}
