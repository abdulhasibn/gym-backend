import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/app/tests/e2e/**/*.e2e.test.ts'],
    setupFiles: ['src/app/tests/integration/setup.ts'],
    fileParallelism: false,
    testTimeout: 90_000,
    hookTimeout: 90_000,
    reporters: ['default', './src/app/tests/e2e/ironcore-e2e-reporter.ts'],
  },
});
