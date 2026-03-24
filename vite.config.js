import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: { sourcemap: true,

    outDir: 'build_output',
    chunkSizeWarningLimit: 1500,
    // ?„ë¡œ?•ì…˜ ?ŒìŠ¤ë§??œê±° (ë¹Œë“œ ?ë„ ?¥ìƒ, ë²ˆë“¤ ?¬ê¸° ê°ì†Œ)
    sourcemap: true,
    // ìµœì‹  ë¸Œë¼?°ì? ?€ê²? ?´ë¦¬??ìµœì†Œ??
    target: ['es2020', 'chrome80', 'safari14'],
    // CSS ì½”ë“œ ?¤í”Œë¦¬íŒ…
    cssCodeSplit: true,
    // ?•ì¶• ?¬ê¸° ê³„ì‚° ?ëµ (ë¹Œë“œ ?ë„ ?¥ìƒ)
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // react ê³„ì—´: ??ƒ ?„ìš”, ê³µìœ  ì²?¬ë¡?ë¶„ë¦¬
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'vendor-react'
          }
          // firebase: ??ƒ ?„ìš”, ê³µìœ  ì²?¬ë¡?ë¶„ë¦¬
          if (id.includes('node_modules/firebase') || id.includes('node_modules/@firebase')) {
            return 'vendor-firebase'
          }
          // framer-motion: ?¬ëŸ¬ ?˜ì´ì§€ ê³µìœ 
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-framer'
          }
          // ?°ì´??ì²?¬: celebrities (436KB) ??ê³µìœ  ì²?¬
          if (id.includes('src/data/celebrities')) {
            return 'data-celebrities'
          }
          // ?°ì´??ì²?¬: bookScripts + recommendations ??ê³µìœ  ì²?¬
          if (id.includes('src/data/bookScripts') || id.includes('src/data/recommendations')) {
            return 'data-content'
          }
          // ?˜ë¨¸ì§€ node_modules: Rollup??ê°??˜ì´ì§€ë³„ë¡œ ?ë™ ë¶„ë¦¬
        },
        // ?ì…‹ ?Œì¼ëª??´ì‹œ ?¬í•¨ (ìºì‹œ ë²„ìŠ¤??
        assetFileNames: 'assets/[name]-[hash][extname]',
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
      },
    },
  },
  // ê°œë°œ ?œë²„ ìµœì ??
  server: {
    port: 5173,
    host: true,
  },
  // ëª¨ë“ˆ ?´ì„ ìµœì ??
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
  },
})
