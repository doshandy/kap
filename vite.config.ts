/// <reference types="vitest" />
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { visualizer } from 'rollup-plugin-visualizer';
import { fileURLToPath, URL } from 'node:url';

// ⚠️ 暂时禁用 vite-plugin-pwa：
// 线上发现历史 v0.17 时代部署的 SW（autoUpdate + skipWaiting）在用户机器上残留并
// 拦截 fetch，导致即使部署了新 HTML 用户也只看到旧版样式。bump cleanup-key 已无效，
// 因为旧 SW 直接从缓存返回旧 index.html，cleanup 脚本根本进不到。
//
// 临时方案：用 public/sw.js 提供一个**自杀脚本**，浏览器自然触发 SW 更新时下载它，
// 它会清空所有 caches、unregister 自己、广播 reload。等线上老 SW 被自然替换掉之后
// 再恢复本插件。
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
