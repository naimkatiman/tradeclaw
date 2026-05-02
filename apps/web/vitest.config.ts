import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      'server-only': '/home/naim/.openclaw/workspace/tradeclaw/jest.stubs/server-only.js',
    },
  },
});
