/// <reference types="vitest" />
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { VitePWA } from 'vite-plugin-pwa';
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
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
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
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: '/kap/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
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
