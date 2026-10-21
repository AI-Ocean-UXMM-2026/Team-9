import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'allow-vite-hmr-websocket-in-development-csp',
      apply: 'serve',
      transformIndexHtml: {
        order: 'pre',
        handler(html) {
          return html
            .replace(
              "connect-src 'self';",
              "connect-src 'self' ws://127.0.0.1:*;",
            )
            .replace("style-src 'self';", "style-src 'self' 'unsafe-inline';");
        },
      },
    },
  ],
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
