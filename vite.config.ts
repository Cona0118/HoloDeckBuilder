import { defineConfig, loadEnv, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { isValidImageBase, normalizeImageBase } from './src/utils/imageBase'

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
  // BOM·공백이 섞인 값은 정규화하고, 그래도 절대 URL이 아니면 빌드를 실패시킨다
  // (조용히 배포되면 전 카드 이미지가 상대 경로로 깨짐 — 2026-09-27 장애)
  const imageBase = normalizeImageBase(env.VITE_IMAGE_BASE_URL)
  if (imageBase && !isValidImageBase(imageBase)) {
    throw new Error(`VITE_IMAGE_BASE_URL 이 http(s) 절대 URL이 아닙니다: ${JSON.stringify(env.VITE_IMAGE_BASE_URL)}`)
  }
  const imageCdnEnabled = imageBase !== ''

  return {
  define: {
    'import.meta.env.VITE_IMAGE_BASE_URL': JSON.stringify(imageBase),
  },
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
            // 같은 오리진 이미지만 SW 캐시. CDN(크로스 오리진) 이미지는 opaque 응답이라 실제 status를 알 수 없어
            // 429(r2.dev 레이트리밋)·5xx 도 "성공"으로 30일 캐시되고, Chrome은 opaque 1건을 ~7MB 쿼터로 계산한다.
            // CDN 응답은 Cache-Control: max-age=31536000, immutable 이라 브라우저 HTTP 캐시로 충분하다.
            urlPattern: ({ request, sameOrigin }) => sameOrigin && request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              // v2: 구 'card-images'(CDN 이전 전 PNG 최대 500장)는 더 이상 매칭되지 않아 만료도 안 돌므로
              // 이름을 바꾸고 main.tsx 에서 구 캐시를 삭제한다
              cacheName: 'card-images-v2',
              cacheableResponse: { statuses: [200] },
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
