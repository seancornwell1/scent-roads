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
        // Only what the game loads; the rest of assets/ is kept for later.
        globIgnores: ['**/node_modules/**/*', 'grab3d/**', 'custom/characters/**', 'custom/chibi/thumbs/**'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
      manifest: {
        name: 'Hush',
        short_name: 'Hush',
        description: 'A tiny midnight heist.',
        start_url: base,
        scope: base,
        display: 'standalone',
        
        background_color: '#141126',
        theme_color: '#141126',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
});
