import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach, vi } from 'vitest';

const hasDom = typeof window !== 'undefined' && typeof document !== 'undefined';

afterEach(() => {
  if (hasDom) cleanup();
  if (typeof localStorage !== 'undefined') localStorage.clear();
  vi.useRealTimers();
});

beforeEach(() => {
  if (typeof localStorage !== 'undefined') localStorage.clear();
});
