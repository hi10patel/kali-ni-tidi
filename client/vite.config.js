import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// `base` lets us deploy to GitHub Pages under /<repo>/.
// Set VITE_BASE_PATH in .env.production (or in shell env), e.g. VITE_BASE_PATH=/kali-ni-tidi/.
// We must use loadEnv() here because vite.config.js runs in Node and
// .env files are NOT auto-merged into process.env.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react()],
    base: env.VITE_BASE_PATH || '/',
    server: {
      host: true,
      port: 5173,
    },
  };
});
