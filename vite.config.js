import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build_output',
    chunkSizeWarningLimit: 1500,
    // 프로덕션 소스맵 제거 (빌드 속도 향상, 번들 크기 감소)
    sourcemap: false,
    // 최신 브라우저 타겟: 폴리필 최소화
    target: ['es2020', 'chrome80', 'safari14'],
    // CSS 코드 스플리팅
    cssCodeSplit: true,
    // 압축 크기 계산 생략 (빌드 속도 향상)
    reportCompressedSize: false,
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
          // 데이터 청크: celebrities (436KB) → 공유 청크
          if (id.includes('src/data/celebrities')) {
            return 'data-celebrities'
          }
          // 데이터 청크: bookScripts + recommendations → 공유 청크
          if (id.includes('src/data/bookScripts') || id.includes('src/data/recommendations')) {
            return 'data-content'
          }
          // 나머지 node_modules: Rollup이 각 페이지별로 자동 분리
        },
        // 에셋 파일명 해시 포함 (캐시 버스팅)
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  // 개발 서버 최적화
  server: {
    port: 5173,
    host: true,
  },
  // 모듈 해석 최적화
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
})
