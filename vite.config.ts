import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// All API calls are made same-origin (relative URLs) and proxied to the
// Express server. This keeps auth cookies first-party in the browser —
// cross-origin cookie setting/sending is blocked by modern browsers.
const API_TARGET = 'http://localhost:3001';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@shared': resolve(__dirname, './shared'),
    },
  },
  server: {
    watch: {
      usePolling: true,
    },
    proxy: {
      '/sign-up': API_TARGET,
      '/auth': API_TARGET,
      '/api/auth': API_TARGET,
      '/user-data': API_TARGET,
      '/save-subscription': API_TARGET,
      '/user/me': API_TARGET,
      '/quote': API_TARGET,
      '/data': API_TARGET,
      '/search': API_TARGET,
      '/portfolio': API_TARGET,
      '/trade-history': API_TARGET,
      '/user-watchlist': API_TARGET,
      '/stopLoss': API_TARGET,
      '/buy': API_TARGET,
      '/sell': API_TARGET,
    },
  },
});
