import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// SW 런타임 캐시 'card-images' → 'card-images-v2' 교체(2026-09-27). 구 캐시는 참조되지 않아 저절로 비워지지 않는다.
if ('caches' in window) caches.delete('card-images').catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
