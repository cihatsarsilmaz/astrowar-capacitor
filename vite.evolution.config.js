import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist-evolution',
    rollupOptions: { input: { evolution: 'evolution.html' } },
  },
});
