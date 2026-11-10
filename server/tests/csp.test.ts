import { describe, it, expect, beforeEach } from 'vitest';
import supertest from 'supertest';
import { makeApp } from './helpers/index.js';
import { CSP_POLICY } from '../lib/csp.ts';

let app: ReturnType<typeof makeApp>['app'];

beforeEach(() => {
  app = makeApp().app;
});

describe('CSP middleware', () => {
  it('sets Content-Security-Policy on every response, including errors', async () => {
    const res = await supertest(app).get('/user-data'); // 401, but header must be set

    expect(res.status).toBe(401);
    expect(res.headers['content-security-policy']).toBe(CSP_POLICY);
  });

  it('blocks inline and cross-origin scripts, plugins, and framing', () => {
    // no unsafe-inline for scripts (styles are allowed inline for chart libs)
    const scriptSrc = CSP_POLICY.split('; ').find((d) => d.startsWith('script-src'));
    expect(scriptSrc).toBe("script-src 'self'");
    expect(CSP_POLICY).toContain("object-src 'none'");
    expect(CSP_POLICY).toContain("base-uri 'self'");
    expect(CSP_POLICY).toContain("frame-ancestors 'none'");
  });

  it('still allows same-origin connections and websockets for the market-data feed', () => {
    expect(CSP_POLICY).toContain("connect-src 'self' ws: wss:");
  });

  it('allows Google Fonts origins used by index.html (Geist)', () => {
    expect(CSP_POLICY).toContain("font-src 'self' https://fonts.gstatic.com");
    expect(CSP_POLICY).toContain('https://fonts.googleapis.com');
  });
});
