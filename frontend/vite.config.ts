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
            if (id.includes('three') || id.includes('@react-three')) return 'three';
            if (id.includes('recharts') || id.includes('d3-')) return 'charts';
            if (id.includes('gsap') || id.includes('lenis')) return 'scroll';
            if (id.includes('framer-motion')) return 'motion';
          }
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
      '/p': 'http://localhost:8080',
      '/uploads': 'http://localhost:8080',
    },
  },
});
