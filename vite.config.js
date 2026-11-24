import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: process.env.VITE_HOST || '127.0.0.1',
    port: 5173,
    watch: {
      usePolling: process.env.CHOKIDAR_USEPOLLING === 'true',
    },
    proxy: {
      '/api': process.env.API_PROXY_TARGET || 'http://localhost:4000',
      '/health': process.env.API_PROXY_TARGET || 'http://localhost:4000',
    },
  },
});
