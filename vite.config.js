import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        id: '/',
        name: 'Διαχείριση Έργου',
        short_name: 'Έργο',
        description: 'Καταγραφή εσόδων και εξόδων για έργα κατασκευής.',
        lang: 'el',
        start_url: '/',
        display: 'standalone',
        background_color: '#fafaf9',
        // Matches --color-rust-700 in src/index.css — the app's real
        // brand color now, not Tailwind's stock orange-700 this used to
        // literally be (#c2410c).
        theme_color: '#8a3820',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // woff2 added for the self-hosted fonts (see index.css) — without
        // this they'd load fine online but not be available offline like
        // everything else the app needs on a jobsite with no signal.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
    }),
  ],
})
