import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build_output',
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // react 계열: 항상 필요, 공유 청크로 분리
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'vendor-react'
          }
          // firebase: 항상 필요, 공유 청크로 분리
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            return 'vendor-firebase'
          }
          // framer-motion: 여러 페이지 공유
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-framer'
          }
          // AI/무거운 라이브러리: 특정 페이지에서만 사용, 자동 분리 (return 안 함)
          // 데이터 청크: celebrities (396KB) → 공유 청크
          if (id.includes('src/data/celebrities')) {
            return 'data-celebrities'
          }
          // 데이터 청크: bookScripts + recommendations → 공유 청크 (BottomNavigation에서 모든 페이지 사용)
          if (id.includes('src/data/bookScripts') || id.includes('src/data/recommendations')) {
            return 'data-content'
          }
          // 나머지 node_modules: Rollup이 각 페이지별로 자동 분리
          // (html2canvas, socket.io-client, canvas-confetti 등은 해당 페이지 chunk에만 포함)
        },
      },
    },
  },
})
