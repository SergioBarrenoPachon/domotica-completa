import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:10000',
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        target: 'http://localhost:10000',
        changeOrigin: true
      },
      '/sample-docs': {
        target: 'http://localhost:10000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            const normalizedId = id.replace(/\\/g, '/');
            if (normalizedId.includes('/recharts/') || normalizedId.includes('/d3-')) {
              return 'vendor-charts';
            }
            if (normalizedId.includes('/framer-motion/')) {
              return 'vendor-motion';
            }
            if (normalizedId.includes('/lucide-react/')) {
              return 'vendor-icons';
            }
            if (normalizedId.includes('/canvas-confetti/')) {
              return 'vendor-confetti';
            }
            if (
              normalizedId.includes('/node_modules/react/') ||
              normalizedId.includes('/node_modules/react-dom/') ||
              normalizedId.includes('/node_modules/scheduler/') ||
              normalizedId.includes('/node_modules/react-is/')
            ) {
              return 'vendor-react';
            }
            return 'vendor-common';
          }
        }
      }
    }
  }
});
