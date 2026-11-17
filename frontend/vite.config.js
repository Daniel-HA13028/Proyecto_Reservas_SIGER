import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    // Las páginas diferidas usan estas librerías; Vite las prepara al arrancar para no recargar a mitad de la sesión.
    optimizeDeps: { include: ['recharts', 'html5-qrcode'] },
    server: {
      // El backend permite CORS desde este puerto (application-dev.yml); si está ocupado, Vite falla en vez de cambiarlo.
      port: 5173,
      strictPort: true,
      // En desarrollo el navegador llama a /api en el mismo origen y Vite lo reenvía al backend.
      proxy: {
        '/api': { target: env.VITE_BACKEND_URL || 'http://localhost:8080', changeOrigin: true },
        // Imágenes de los eventos que sirve el backend 
        '/uploads': { target: env.VITE_BACKEND_URL || 'http://localhost:8080', changeOrigin: true },
      },
    },
  }
})
