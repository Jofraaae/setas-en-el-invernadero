import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

// Servidor de juego propio (Node + ws): server/index.js, por defecto en :8787
const GAME_SERVER = process.env.GAME_SERVER_URL || 'http://localhost:8787'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  server: {
    proxy: {
      '/api': { target: GAME_SERVER, changeOrigin: true },
      '/ws': { target: GAME_SERVER.replace(/^http/, 'ws'), ws: true },
    },
  },
})
