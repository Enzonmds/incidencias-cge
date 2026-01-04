import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on 0.0.0.0
    port: 5173,
    allowedHosts: ['consultas.cge.mil.ar', 'localhost', '127.0.0.1'],
    proxy: {
      '/api': {
        target: 'http://server:3000',
        changeOrigin: true,
        secure: false,
      },
    },
    watch: {
      usePolling: true, // Specific fix for Docker on Windows sometimes
    }
  }
})
