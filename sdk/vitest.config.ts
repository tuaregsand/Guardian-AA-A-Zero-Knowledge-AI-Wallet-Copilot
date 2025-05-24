import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/fixtures/',
        '**/*.d.ts',
        '**/*.config.ts',
        '**/*.config.js',
      ],
      thresholds: {
        global: {
          branches: 90,
          functions: 90,
          lines: 90,
          statements: 90,
        },
      },
    },
    testTimeout: 10000,
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@': './src',
    },
  },
}); 