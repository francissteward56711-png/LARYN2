import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { viteSingleFile } from 'vite-plugin-singlefile'
import { inlineStartup } from './build/inline-startup'
export default defineConfig(({ mode }) => ({
  build: { outDir: mode === 'native' ? 'dist-native' : 'dist' },
  resolve: {
    alias:
      mode === 'native'
        ? [
            {
              find: 'virtual:pwa-register/react',
              replacement: fileURLToPath(new URL('./src/native/register-sw.ts', import.meta.url)),
            },
          ]
        : [],
  },
  plugins: [
    react(),
    inlineStartup(),
    viteSingleFile({ overrideConfig: { base: './' } }),
    mode !== 'native' &&
      VitePWA({
        registerType: 'prompt',
        injectRegister: null,
        includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icons/*.png'],
        manifest: {
          id: './',
          name: 'LARYN AI',
          short_name: 'LARYN',
          description:
            'Speech assistance and throat-motion exploration. Research prototype with demo data and local alerts.',
          start_url: './?source=homescreen',
          scope: './',
          display: 'standalone',
          background_color: '#f7f9f7',
          theme_color: '#087f6d',
          lang: 'en',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            {
              src: 'icons/maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png,woff,woff2,webmanifest}'],
          // Single-file builds have no hashed asset directory. Hash every cache entry,
          // including index.html, instead of treating an empty directory as immutable.
          dontCacheBustURLsMatching: /^$/,
          cleanupOutdatedCaches: true,
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/(?:^|\/)api(?:\/|$)/],
        },
        devOptions: { enabled: false },
      }),
  ],
}))
