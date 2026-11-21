import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) return 'vendor-react';
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('tesseract')) return 'vendor-tesseract';
            if (id.includes('dexie')) return 'vendor-db';
            if (id.includes('html5-qrcode')) return 'vendor-scanner';
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
