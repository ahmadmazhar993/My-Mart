import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts:['0.0.0.0']
  },
  test: {
    globals: true,
    environment: 'jsdom',
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
