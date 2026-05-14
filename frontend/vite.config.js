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
    // No proxy needed — the frontend connects directly to the backend WS on
    // its own port (default 3000) using VITE_WS_HOST / VITE_WS_PORT. See
    // src/api/client.js. Compose.yaml exposes both ports on the host.
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
