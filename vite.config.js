import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build_output',
    chunkSizeWarningLimit: 1500,
    sourcemap: false,
    target: ['es2020', 'chrome80', 'safari14'],
    cssCodeSplit: true,
    reportCompressedSize: false,
    minify: 'esbuild',
    // 모듈 프리로드 폴리필 제거 (모던 브라우저 타겟이므로 불필요)
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        manualChunks(id) {
          // React 코어 (react + react-dom + react-router)
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'vendor-react'
          }
          // Firebase SDK
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            return 'vendor-firebase'
          }
          // Framer Motion (애니메이션)
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-framer'
          }
          // 대용량 데이터: celebrities (577KB) 별도 청크
          if (id.includes('src/data/celebrities')) {
            return 'data-celebrities'
          }
          // 대용량 데이터: bookScripts (325KB) 별도 청크
          if (id.includes('src/data/bookScripts')) {
            return 'data-scripts'
          }
          // 중형 데이터: recommendations + questions + resultData
          if (id.includes('src/data/recommendations') || id.includes('src/data/questions') || id.includes('src/data/resultData')) {
            return 'data-content'
          }
          // react-pageflip: ReviewDetail에서만 사용
          if (id.includes('node_modules/react-pageflip') || id.includes('node_modules/page-flip')) {
            return 'vendor-pageflip'
          }
          // html2canvas (공유 카드 생성용): 사용 시에만 로드
          if (id.includes('node_modules/html2canvas')) {
            return 'vendor-canvas'
          }
        },
        // 해시 기반 파일명으로 장기 캐싱 활성화
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
})
