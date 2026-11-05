import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/demo': {
        target: 'http://127.0.0.1:3010',
        changeOrigin: true,
        bypass(req) {
          if (req.method === 'GET') return req.url;
        },
      },
      '/jobs': {
        target: 'http://127.0.0.1:3010',
        changeOrigin: true,
      },
      '/games': {
        target: 'http://127.0.0.1:3010',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://127.0.0.1:3010',
        changeOrigin: true,
      },
      '/me': {
        target: 'http://127.0.0.1:3010',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:3010',
        changeOrigin: true,
      },
      '/trial': {
        target: 'http://127.0.0.1:3010',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
    sourcemap: true,
  },
});
