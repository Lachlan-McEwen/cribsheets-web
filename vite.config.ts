import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/pages/admin/') || id.includes('\\pages\\admin\\')) {
            return 'admin'
          }
          if (id.includes('/components/admin/') || id.includes('\\components\\admin\\')) {
            return 'admin'
          }
        },
      },
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': process.env.VITE_API_PROXY ?? 'http://localhost:3849',
    },
  },
})
