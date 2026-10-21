import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
      '/sign-up': 'http://localhost:3001',
      '/login': 'http://localhost:3001',
      '/portfolio': 'http://localhost:3001',
      '/buy': 'http://localhost:3001',
      '/sell': 'http://localhost:3001',
      '/user-data': 'http://localhost:3001',
      '/trade-history': 'http://localhost:3001',
      '/search': 'http://localhost:3001',
      '/user-watchlist': 'http://localhost:3001',
      '/user-watchlist/add': 'http://localhost:3001',
      '/user-watchlist/delete': 'http://localhost:3001',
      '/data/indicator': 'http://localhost:3001',
      '/save-subscription': 'http://localhost:3001',
    },
  },
});
