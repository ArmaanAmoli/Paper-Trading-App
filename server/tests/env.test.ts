import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('getEnv', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  async function loadGetEnv() {
    const mod = await import('../lib/env.ts');
    return mod.getEnv;
  }

  it('returns parsed env when all required vars are valid', async () => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3001';
    process.env.MONGO_URL = 'mongodb://127.0.0.1:27017/test';
    process.env.JWT_SECRET = 'test_secret_key_at_least_32_chars_long';
    process.env.FAST_API_SERVER_DOMAIN = 'http://127.0.0.1:8000';
    process.env.FAST_API_WEB_SOCKET_SERVER_DOMAIN = 'ws://127.0.0.1:8001';
    process.env.JWT_TOKEN_05_2036 = 'token';
    process.env.WEB_PUSH_PUBLIC_KEY = 'BFJ3OcWgOgWKpX90kGTw8Pbff7c4uOuM9qc-x1vbi4n868vqtnhex9ydgNWm80UMGg6uc437bNIZO2hZs7fsTWs';
    process.env.WEB_PUSH_PRIVATE_KEY = 'Z1CrfLKGUnrnQRz53tCP6bj1YhW80dp12IzkORpGx2A';
    process.env.EXCHANGE_RATE_API = 'api';
    process.env.VITE_API_BASE_URL = 'http://127.0.0.1:5173';
    process.env.VITE_WEB_PUSH_PUBLIC_KEY = 'public';

    const getEnv = await loadGetEnv();
    const env = getEnv();
    expect(env.NODE_ENV).toBe('test');
    expect(env.PORT).toBe(3001);
    expect(env.MONGO_URL).toBe('mongodb://127.0.0.1:27017/test');
    expect(env.JWT_SECRET).toBe('test_secret_key_at_least_32_chars_long');
    expect(env.FAST_API_SERVER_DOMAIN).toBe('http://127.0.0.1:8000');
    expect(env.VITE_API_BASE_URL).toBe('http://127.0.0.1:5173');
  });

  it('uses defaults for NODE_ENV and PORT when not set', async () => {
    delete process.env.NODE_ENV;
    delete process.env.PORT;
    process.env.MONGO_URL = 'mongodb://127.0.0.1:27017/test';
    process.env.JWT_SECRET = 'test_secret_key_at_least_32_chars_long';
    process.env.FAST_API_SERVER_DOMAIN = 'http://127.0.0.1:8000';
    process.env.FAST_API_WEB_SOCKET_SERVER_DOMAIN = 'ws://127.0.0.1:8001';
    process.env.JWT_TOKEN_05_2036 = 'token';
    process.env.WEB_PUSH_PUBLIC_KEY = 'public';
    process.env.WEB_PUSH_PRIVATE_KEY = 'private';
    process.env.EXCHANGE_RATE_API = 'api';
    process.env.VITE_API_BASE_URL = 'http://127.0.0.1:5173';
    process.env.VITE_WEB_PUSH_PUBLIC_KEY = 'public';

    const getEnv = await loadGetEnv();
    const env = getEnv();
    expect(env.NODE_ENV).toBe('development');
    expect(env.PORT).toBe(3001);
  });

  it('exits with code 1 when required env is invalid', async () => {
    process.env.MONGO_URL = 'not-a-url';
    process.env.JWT_SECRET = 'test_secret_key_at_least_32_chars_long';
    process.env.FAST_API_SERVER_DOMAIN = 'http://127.0.0.1:8000';
    process.env.FAST_API_WEB_SOCKET_SERVER_DOMAIN = 'ws://127.0.0.1:8001';
    process.env.JWT_TOKEN_05_2036 = 'token';
    process.env.WEB_PUSH_PUBLIC_KEY = 'public';
    process.env.WEB_PUSH_PRIVATE_KEY = 'private';
    process.env.EXCHANGE_RATE_API = 'api';
    process.env.VITE_API_BASE_URL = 'http://127.0.0.1:5173';
    process.env.VITE_WEB_PUSH_PUBLIC_KEY = 'public';

    const getEnv = await loadGetEnv();
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    getEnv();
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
