import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const POKI_SDK_URL = 'https://game-cdn.poki.com/scripts/v2/poki-sdk.js'

export default defineConfig(({ mode }) => {
  const platformId = mode === 'poki' ? 'poki' : 'standalone'
  const pokiBuild = platformId === 'poki'
  return {
    base: './',
    define: {
      'import.meta.env.VITE_PLATFORM': JSON.stringify(platformId),
      __POKI_BUILD__: JSON.stringify(pokiBuild),
    },
    build: {
      outDir: pokiBuild ? 'dist-poki' : 'dist',
    },
    plugins: [
      react(),
      ...(pokiBuild ? [{
        name: 'poki-sdk-html',
        transformIndexHtml() {
          return [{
            tag: 'script',
            attrs: { id: 'poki-sdk', src: POKI_SDK_URL, async: true },
            injectTo: 'head' as const,
          }]
        },
      }] : []),
    ],
  }
})
