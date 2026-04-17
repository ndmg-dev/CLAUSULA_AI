import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import mkcert from 'vite-plugin-mkcert';

// Office Add-ins EXIGEM HTTPS, mesmo em localhost.
// mkcert gera certificados auto-assinados automaticamente.
export default defineConfig({
  plugins: [
    react(),
    mkcert(),
  ],
  server: {
    port: 3000,
    https: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  }
});
