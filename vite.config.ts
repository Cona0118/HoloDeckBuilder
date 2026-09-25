import { defineConfig, loadEnv, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// VITE_IMAGE_BASE_URL 이 설정된 빌드(CDN 모드)에서는 이미지가 CDN에서 서빙되므로
// public/images 사본을 빌드 산출물에서 제거해 배포 크기를 줄인다 (Vercel 스토리지 대책).
function dropLocalImages(enabled: boolean): PluginOption {
  return {
    name: 'drop-local-images',
    apply: 'build',
    closeBundle() {
      if (!enabled) return
      rmSync(fileURLToPath(new URL('./dist/images', import.meta.url)), {
        recursive: true,
        force: true,
      })
      console.log('[drop-local-images] dist/images 제거됨 — 이미지는 VITE_IMAGE_BASE_URL 에서 서빙')
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Vercel 대시보드 env(process.env)와 로컬 .env 파일 둘 다 지원
  const env = { ...loadEnv(mode, process.cwd(), ''), ...process.env }
  const imageCdnEnabled = Boolean(env.VITE_IMAGE_BASE_URL)

  return {
  plugins: [
    react(),
    tailwindcss(),
    dropLocalImages(imageCdnEnabled),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'holo덱빌더',
        short_name: 'holo덱빌더',
        description: '홀로라이브 TCG 덱 빌더',
        theme_color: '#6366f1',
        background_color: '#0f172a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'ko',
        icons: [
          {
            src: 'pwa-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'pwa-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,webmanifest}', 'logo.png', 'pwa-*.png', 'apple-touch-icon.png'],
        globIgnores: ['**/images/**'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        navigateFallbackDenylist: [/^\/images\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api',
              networkTimeoutSeconds: 5,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5,
              },
            },
          },
          {
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'card-images',
              // CDN(크로스 오리진) 이미지는 opaque 응답(status 0)이라 명시적 허용 필요
              cacheableResponse: { statuses: [0, 200] },
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
        ],
      },
    }),
  ],
  }
})
