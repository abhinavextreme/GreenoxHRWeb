import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { ROUTES } from './src/constants/routes.js';

function publishRoutePages() {
  return {
    name: 'publish-route-pages',
    apply: 'build',
    closeBundle() {
      const dist = path.resolve('dist');
      const html = fs.readFileSync(path.join(dist, 'index.html'));
      for (const route of Object.values(ROUTES)) {
        if (route === ROUTES.home) continue;
        const dir = path.join(dist, route.slice(1));
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'index.html'), html);
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), '');
  const proxyTarget = process.env.API_PROXY_TARGET || fileEnv.API_PROXY_TARGET || 'http://127.0.0.1:4000';
  return {
    plugins: [react(), publishRoutePages()],
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
