import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  envDir: process.env.NEUTON_SKIP_ENV_FILES === '1' ? false : undefined,
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: 'auto',
      manifest: {
        id: '/',
        name: 'Neuton',
        short_name: 'Neuton',
        description: 'Your shop, costs and real profit in one place.',
        start_url: '/',
        scope: '/',
        display: 'fullscreen',
        background_color: '#FAF9F5',
        theme_color: '#FAF9F5',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      includeAssets: ['icons/*.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff,woff2}'],
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api(?:\/|$)/, /^\/auth(?:\/|$)/],
        // Activate updates only after existing tabs close, keeping their chunks intact.
        skipWaiting: false,
        clientsClaim: false,
        cleanupOutdatedCaches: true,
        // Only the public build output is cached. API/document requests use the network.
        runtimeCaching: [],
      },
      devOptions: { enabled: false },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': process.env.NEUTON_API_UPSTREAM ?? 'http://127.0.0.1:3000' },
  },
  preview: { proxy: { '/api': process.env.NEUTON_API_UPSTREAM ?? 'http://127.0.0.1:3000' } },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
