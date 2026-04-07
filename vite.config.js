import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite';
// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(),],
  server: {
    watch: {
      usePolling: true,
    },
    proxy: {
      "/sign-up": "http://localhost:3000",
      "/login": "http://localhost:3000",
      "/portfolio": "http://localhost:3000",
      "/buy": "http://localhost:3000",
      "/sell": "http://localhost:3000",
      "/user-data": "http://localhost:3000",
      "/trade-history": "http://localhost:3000",
      "/search": "http://localhost:3000",
      "/user-watchlist": "http://localhost:3000",
      "/user-watchlist/add": "http://localhost:3000",
      "/user-watchlist/delete": "http://localhost:3000",
      "/data/indicator": "http://localhost:3000",
    },
  },

});
