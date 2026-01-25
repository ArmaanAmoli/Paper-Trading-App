import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server:{
    watch:{
      usePolling: true,
    },
  },
  proxy:{
    "/sign-up":"http://localhost:3000",
    "/login":"http://localhost:3000",
    "/portfolio":"http://localhost:3000",
    "/buy":"http://localhost:3000",
    "/sell":"http://localhost:3000",
  }
});
