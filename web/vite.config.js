import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  // El worker de compresión se importa con `new Worker(new URL(...), { type: 'module' })`
  worker: { format: 'es' },
  server: {
    proxy: {
      // En desarrollo el API corre aparte en :3000
      '/api': 'http://localhost:3000',
    },
  },
  build: {
    target: 'es2019', // celulares viejos: no asumas sintaxis de último año
    sourcemap: true,
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        harness: fileURLToPath(new URL('./harness.html', import.meta.url)),
      },
    },
  },
});
