import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    host: true,
    // Cloudflare Tunnel / any local domain allowed (fixes "xxx.trycloudflare.com is not allowed")
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: false,
      },
      '/uploads': {
        target: 'http://localhost:4000',
        changeOrigin: false,
      },
      '/socket.io': {
        target: 'http://localhost:4000',
        ws: true,
        changeOrigin: false,
      },
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 1200,
  },
  preview: {
    // Cloudflare Tunnel preview hosts must pass Vite's host allow-list
    allowedHosts: true,
  },
});
