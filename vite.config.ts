import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { copyFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

// 빌드 후 index.html 을 404.html 로 복사 → GitHub Pages 딥링크(SPA 새로고침) 지원
function spaFallback() {
  return {
    name: 'spa-404-fallback',
    closeBundle() {
      const index = resolve('dist/index.html')
      if (existsSync(index)) copyFileSync(index, resolve('dist/404.html'))
    },
  }
}

// 커스텀 도메인(withpaper.dreamitbiz.com)이므로 base 는 '/'
export default defineConfig({
  plugins: [react(), tailwindcss(), spaFallback()],
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    emptyOutDir: true,
  },
  server: {
    host: true,
    port: 5180,
  },
})
