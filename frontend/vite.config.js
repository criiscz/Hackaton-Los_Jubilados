import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwind()],
  server: {
    host: true,
    port: Number(process.env.PORT) || 4000,
    strictPort: true,
    watch: { usePolling: true, interval: 200 },
    proxy: {
      '/api': {
        target: 'http://backend:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'build',
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.js'],
    css: false,
  },
});
