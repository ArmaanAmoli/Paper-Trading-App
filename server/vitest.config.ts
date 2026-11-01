import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: '.',
  resolve: {
    alias: {
      '@shared': resolve(__dirname, '../shared'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    setupFiles: ['./tests/setup.ts'],
    globalSetup: ['./tests/globalSetup.ts'],
    // All test files share the same in-memory MongoDB, and the per-test cleanup in
    // tests/setup.ts clears every collection. Running files in parallel would let
    // one file's cleanup wipe rows another file is still using, so files run
    // sequentially instead.
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 60000,
    teardownTimeout: 60000,
  },
});
