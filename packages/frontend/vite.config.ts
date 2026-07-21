import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@openmindgraph/core': resolve(__dirname, '../core/src'),
    },
  },
  clearScreen: false,
  server: {
    host: host ?? 'localhost',
    port: 5173,
    strictPort: true,
  },
});
