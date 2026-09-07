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