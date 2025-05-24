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
  // Increase timeout for ZK proof operations
  const originalTimeout = 30000;
  
  // Setup any global test configuration
  process.env['NODE_ENV'] = 'test';
}); 