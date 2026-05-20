import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base` lets us deploy to GitHub Pages under /<repo>/.
// Set VITE_BASE_PATH at build time, e.g. VITE_BASE_PATH=/kali-ni-tidi/ npm run build.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
  server: {
    host: true,
    port: 5173,
  },
});
