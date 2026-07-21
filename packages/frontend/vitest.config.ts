import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@openmindgraph/core': resolve(__dirname, '../core/src'),
    },
  },
  test: {
    environment: 'jsdom',
  },
});
