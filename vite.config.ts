import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves the app from /<repo>/; set by the deploy workflow.
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  optimizeDeps: {
    // MapLibre 6 loads its worker relative to its own module URL; pre-bundling
    // would move the module away from the worker file (see features/map/maplibreSetup.ts).
    exclude: ['maplibre-gl'],
  },
})
