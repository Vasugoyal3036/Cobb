import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import electron from 'vite-plugin-electron'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    electron([
      {
        entry: 'electron/main.js',
      },
      {
        entry: 'electron/preload.mjs',
        onstart(options) {
          options.reload()
        },
      },
    ]),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('firebase')) {
              return 'vendor-firebase';
            }
            if (id.includes('lucide-react')) {
              return 'vendor-lucide';
            }
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('qrcode') || id.includes('react-barcode')) {
              return 'vendor-codes';
            }
            return 'vendor-misc';
          }
        }
      }
    },
    chunkSizeWarningLimit: 800
  },
  server: {
    proxy: {
      '/whatsapp': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/whatsapp/, '')
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true
  }
})