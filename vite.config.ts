import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

// pdf.js loads its wasm decoders (JPEG 2000, JBIG2, ICC color) and standard fonts at runtime;
// without them scanned pages and embedded logos render blank. Serve them from node_modules.
function pdfjsAssets(): Plugin {
  const root = path.resolve('node_modules/pdfjs-dist')
  const wanted: Record<string, (f: string) => boolean> = {
    wasm: (f) => f.endsWith('.wasm') && !f.startsWith('quickjs') || f.endsWith('_nowasm_fallback.js'),
    standard_fonts: (f) => f.endsWith('.pfb') || f.endsWith('.ttf'),
  }
  const files = () => Object.entries(wanted).flatMap(([dir, ok]) =>
    fs.readdirSync(path.join(root, dir)).filter(ok).map((f) => `${dir}/${f}`))
  const mime = (f: string) => (f.endsWith('.wasm') ? 'application/wasm' : f.endsWith('.js') ? 'text/javascript' : 'application/octet-stream')
  return {
    name: 'pdfjs-assets',
    configureServer(server) {
      server.middlewares.use('/pdfjs/', (req, res, next) => {
        const rel = decodeURIComponent((req.url ?? '').split('?')[0]).replace(/^\/+/, '')
        if (!files().includes(rel)) return next()
        res.setHeader('Content-Type', mime(rel))
        fs.createReadStream(path.join(root, rel)).pipe(res)
      })
    },
    generateBundle() {
      for (const rel of files()) this.emitFile({ type: 'asset', fileName: `pdfjs/${rel}`, source: fs.readFileSync(path.join(root, rel)) })
    },
  }
}

export default defineConfig({
  server: {
    port: process.env.PORT ? parseInt(process.env.PORT) : 5173,
  },
  plugins: [
    react(),
    tailwindcss(),
    pdfjsAssets(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'generateSW',
      workbox: {
        globPatterns: ['**/*.{js,mjs,css,html,ico,png,svg,woff2,wasm,pfb,ttf}'],
        // pdf.js worker is ~1.5 MB; keep it precached so PDF evidence works offline.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts', expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 } },
          },
        ],
      },
      manifest: {
        name: 'SAT-F743 Evaluación de Capacidades',
        short_name: 'SAT-F743',
        description: 'Evaluación de capacidades de mantenimiento para talleres SATENA',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
