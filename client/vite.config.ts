/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// `--mode pages` builds the static GitHub Pages site into the repository root,
// served from https://harsh3851.github.io/FinTrack/.
// `--mode api` (used by `npm run dev` at the root) points the client at the local API.
export default defineConfig(({ mode }) => {
  const pages = mode === 'pages';
  const localApi =
    mode === 'api' && !process.env.VITE_API_URL ? 'http://localhost:4000' : undefined;
  return {
    ...(localApi && { define: { 'import.meta.env.VITE_API_URL': JSON.stringify(localApi) } }),
    base: pages ? '/FinTrack/' : '/',
    plugins: [react(), tailwindcss()],
    server: { port: 5173 },
    build: {
      outDir: pages ? '..' : 'dist',
      emptyOutDir: !pages,
      sourcemap: false,
      chunkSizeWarningLimit: 700,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            charts: ['recharts'],
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  };
});
