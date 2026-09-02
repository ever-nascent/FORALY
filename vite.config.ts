import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // Fourteen cards of text. Everything fits in one request each way.
    assetsInlineLimit: 0,
    cssMinify: true,
    modulePreload: { polyfill: false },
  },
  server: { host: true, port: 3000 },
  preview: { port: 3000 },
});
