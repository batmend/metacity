import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

/**
 * Meta City вэб/PWA.
 *
 * Хэмжээний зарчим:
 *  - Апп-ын shell (JS/CSS/HTML/icon) л precache хийгдэнэ → суулгахад татах хэмжээ = shell.
 *  - Газрын зургийн өгөгдөл (PMTiles) shell-д ОРОХГҮЙ: HTTP Range-аар зөвхөн харж буй tile татагдана.
 *  - Фонт (glyph PBF) хэрэглэх үедээ runtime cache-д ордог (CacheFirst).
 */
export default defineConfig({
  build: {
    target: 'es2022',
    sourcemap: false,
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1500,
  },
  worker: { format: 'es' },
  server: { port: 5173, host: true },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Meta City — Улаанбаатар',
        short_name: 'Meta City',
        description: 'Улаанбаатар хотын digital twin: хотоо 2D/3D-ээр үзэж, үйлчилгээгээ газрын зураг дээрээс шууд аваарай.',
        lang: 'mn',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#eceee9',
        theme_color: '#1f4fd8',
        categories: ['government', 'navigation', 'utilities'],
        icons: [
          { src: 'icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Зөвхөн shell. *.pmtiles, *.pbf, *.json энд ОРОХГҮЙ.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/fonts/'),
            handler: 'CacheFirst',
            options: { cacheName: 'metacity-fonts', expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 * 90 } },
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/data/'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'metacity-data', expiration: { maxEntries: 16, maxAgeSeconds: 60 * 60 * 24 * 7 } },
          },
          // PMTiles: Range хүсэлт тул SW-ээр cache хийхгүй; CDN/HTTP cache ашиглана (docs/ARCHITECTURE.md).
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
});
