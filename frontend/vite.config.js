import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build'
  },
  server: {
    proxy: {
      '/person': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/group': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/entry': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    }
  }
})
