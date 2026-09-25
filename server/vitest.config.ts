import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 120_000,
    // Each file gets its own in-memory MongoDB; run files one at a time to keep memory low.
    fileParallelism: false,
  },
});
