import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), '');
  const proxyTarget = process.env.API_PROXY_TARGET || fileEnv.API_PROXY_TARGET || 'http://127.0.0.1:4000';
  return {
    plugins: [react()],
    server: {
      host: process.env.VITE_HOST || fileEnv.VITE_DEV_HOST || '127.0.0.1',
      port: Number(process.env.VITE_DEV_PORT || fileEnv.VITE_DEV_PORT || 5173),
      watch: {
        usePolling: process.env.CHOKIDAR_USEPOLLING === 'true',
      },
      proxy: {
        '/api': proxyTarget,
        '/health': proxyTarget,
      },
    },
  };
});
