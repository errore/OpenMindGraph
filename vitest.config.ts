import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      { testDir: 'packages/core', environment: 'node' },
      { testDir: 'packages/frontend', environment: 'jsdom' },
    ],
  },
});
