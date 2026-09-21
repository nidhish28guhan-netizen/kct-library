import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Electron loads the built UI from the filesystem, so asset URLs must be
  // relative; the browser flow works with them too.
  base: './',
  server: { port: 5173, proxy: { '/api': 'http://localhost:4000' } },
  build: { outDir: 'dist', chunkSizeWarningLimit: 900 }
});
