import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { tsconfigPaths: true },
  // The API runs on its own port in development (`bun run dev` in packages/backend)
  server: { proxy: { '/api': process.env.DRECK_API_URL ?? 'http://localhost:3000' } },
});
