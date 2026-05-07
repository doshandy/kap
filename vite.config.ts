/// <reference types="vitest" />
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.{test,spec}.ts'],
  },
  base: '/kap/',
  plugins: [
    vue(),
    process.env.ANALYZE
      ? visualizer({ open: false, filename: 'dist/stats.html', gzipSize: true, brotliSize: true })
      : null,
    VitePWA({
      // autoUpdate + skipWaiting + clientsClaim：
      // 新版本 SW 安装后立刻接管所有 client，旧 SW 立刻让位、缓存自动清理。
      // 配合 cleanupOutdatedCaches，能避免历史"旧 SW 卡死新部署"的问题。
      registerType: 'autoUpdate',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'og.png'],
      manifest: {
        name: 'KAP - 前端知识自查',
        short_name: 'KAP',
        description: 'Vue 前端工程师知识图谱与自查面试库',
        theme_color: '#0ea5e9',
        background_color: '#0f172a',
        display: 'standalone',
        scope: '/kap/',
        start_url: '/kap/',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // precache 排除大体积按需 vendor，由 runtimeCaching 池真正用到时再下载
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        globIgnores: ['**/vendor-echarts-*.js', '**/vendor-markdown-*.js', '**/vendor-icons-*.js'],
        navigateFallback: '/kap/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            urlPattern: /\/kap\/assets\/vendor-(echarts|markdown|icons)-.*\.js$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'kap-vendor',
              expiration: { maxEntries: 8, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/kap\/assets\/\d{2}-.*\.js$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'kap-content',
              expiration: { maxEntries: 64, maxAgeSeconds: 30 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // 内容文件不进入主 bundle，由 import.meta.glob 异步拉取。
          // 28 个 markdown 各自成 chunk，HTTP/2 下并发拉，PWA 增量更新友好。
          if (id.includes('node_modules')) {
            if (id.includes('echarts') || id.includes('zrender') || id.includes('tslib')) {
              return 'vendor-echarts';
            }
            if (id.includes('@vue/repl') || id.includes('monaco-editor')) {
              return 'vendor-repl';
            }
            if (id.includes('jspdf') || id.includes('html2canvas')) {
              return 'vendor-export';
            }
            if (id.includes('@ant-design/icons-vue')) {
              return 'vendor-icons';
            }
            if (id.includes('markdown-it') || id.includes('prismjs')) {
              return 'vendor-markdown';
            }
            if (id.includes('fuse.js')) {
              return 'vendor-search';
            }
            if (id.includes('qrcode')) {
              return 'vendor-share';
            }
            if (id.includes('vue-router') || id.includes('pinia') || id.includes('@vue/')) {
              return 'vendor-vue';
            }
          }
        },
      },
    },
  },
});
