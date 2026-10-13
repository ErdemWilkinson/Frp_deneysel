import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  // changeOrigin kapalı kalmalı: sunucu WebSocket kökenini Host başlığıyla karşılaştırır.
  server: { proxy: { '/api': 'http://localhost:3001', '/ws': { target: 'ws://localhost:3001', ws: true } } },
  test: { environment: 'jsdom', setupFiles: ['./src/setupTests.ts'], testTimeout: 15_000 },
});
