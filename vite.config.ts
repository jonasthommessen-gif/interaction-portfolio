/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      plugins: [
        ...(process.env.ANALYZE
          ? [visualizer({ open: false, filename: 'dist/stats.html' })]
          : []),
      ],
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/three') || id.includes('node_modules/three/')) return 'three'
          if (id.includes('node_modules/@rive-app/')) return 'rive'
          if (id.includes('node_modules/satellite.js')) return 'satellite'
          if (id.includes('node_modules/framer-motion')) return 'framer-motion'
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**/*.ts', 'src/content/**/*.ts'],
      exclude: ['**/*.test.ts', '**/*.test.tsx', '**/staticTLEs.ts'],
    },
  },
})
