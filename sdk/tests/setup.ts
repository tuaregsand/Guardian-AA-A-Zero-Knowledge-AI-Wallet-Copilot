// Test setup file for Guardian-AA SDK

import { beforeAll } from 'vitest';

// Mock global crypto if not available
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = {
    getRandomValues: (arr: Uint8Array): Uint8Array => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  } as any;
}

// Setup test environment
beforeAll(() => {
  // Global test setup
  global.console = {
    ...console,
    // Silence console logs in tests
    log: () => {},
    debug: () => {},
    info: () => {},
    warn: () => {},
    error: () => {},
  };

  // Mock process.env for tests
  process.env['NODE_ENV'] = 'test';

  // Set longer timeout for ZK operations in tests
  // Tests that need ZK operations should handle their own timeouts
}); 