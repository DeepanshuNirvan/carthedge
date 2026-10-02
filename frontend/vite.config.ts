import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3-')) return 'charts';
            if (id.includes('lenis')) return 'scroll';
            if (id.includes('framer-motion')) return 'motion';
          }
        },
      },
    },
  },
  server: {
    // Vite matches these as PREFIXES, so the trailing slash is load-bearing:
    // bare '/p' also captured /privacy, /pricing and /products, which meant
    // those SPA routes were proxied to the API and answered "404 page not
    // found" in dev while working fine in production. Every real backend route
    // here is /p/{businessCode}/... so '/p/' is the correct match.
    proxy: {
      '/api/': 'http://localhost:8080',
      '/p/': 'http://localhost:8080',
      '/uploads/': 'http://localhost:8080',
    },
  },
});
