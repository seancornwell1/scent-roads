import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages serves the app from /<repo>/; the deploy workflow sets BASE_PATH.
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  base,
  // Downloaded asset files live in assets/ and are served as-is from the site root.
  publicDir: 'assets',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        globPatterns: ['**/*.{html,js,css,json,webmanifest,png,jpg,webp,svg,mp3,ogg,m4a,woff2,glb}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      manifest: {
        name: 'Field & Flacon',
        short_name: 'Field & Flacon',
        description: 'A cozy perfume-house game.',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f6ece1',
        theme_color: '#f6ece1',
        // App icons are listed in ASSETS_NEEDED.md; add them here once sourced.
        icons: [],
      },
    }),
  ],
});
