<script setup lang="ts">
import { defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import AppHeader from '@/components/layout/AppHeader.vue';
import AppSidebar from '@/components/layout/AppSidebar.vue';
import AppIcon from '@/components/icon/AppIcon.vue';
import AppLoader from '@/components/common/AppLoader.vue';
import { useSettingsStore } from '@/stores/settings';
import { useShortcuts } from '@/composables/useShortcuts';
import {
  getContentSignature,
  hydrateContentFromStorage,
  initContent,
  type ContentInitProgress,
} from '@/lib/loadContent';
import { prewarmSearch } from '@/composables/useSearch';

// 搜索面板和快捷键弹窗仅在用户触发时才需要加载，配合动态 fuse.js
// 可以让首屏 vendor 主链路里完全不带搜索相关代码。
const SearchPalette = defineAsyncComponent(() => import('@/components/search/SearchPalette.vue'));
const ShortcutsHelp = defineAsyncComponent(() => import('@/components/settings/ShortcutsHelp.vue'));
// PWA 更新提示 toast：常驻全局；未触发新版本提示时只是订阅 SW 状态，不渲染可见 DOM
const UpdateToast = defineAsyncComponent(() => import('@/components/layout/UpdateToast.vue'));

const settings = useSettingsStore();
const route = useRoute();
const sidebarOpen = ref(false);
const helpOpen = ref(false);
const searchOpen = ref(false);
const contentReady = ref(false);
const contentError = ref('');
const loadingProgress = ref(0);
const loadingMessage = ref('准备加载题库…');
const loadingDetail = ref('');
const appMain = ref<HTMLElement | null>(null);

let mq: MediaQueryList | null = null;
const onColorSchemeChange = () => settings.applyTheme();
let prewarmIdleId: number | null = null;
let prewarmTimerId: number | null = null;

function scheduleSearchPrewarm(): void {
  const win = window as Window & {
    requestIdleCallback?: (
      callback: (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void,
      options?: { timeout: number },
    ) => number;
  };
  if (typeof win.requestIdleCallback === 'function') {
    prewarmIdleId = win.requestIdleCallback(
      () => {
        void prewarmSearch();
        prewarmIdleId = null;
      },
      { timeout: 1500 },
    );
    return;
  }
  prewarmTimerId = window.setTimeout(() => {
    void prewarmSearch();
    prewarmTimerId = null;
  }, 300);
}

function cancelSearchPrewarm(): void {
  const win = window as Window & { cancelIdleCallback?: (id: number) => void };
  if (prewarmIdleId != null && typeof win.cancelIdleCallback === 'function') {
    win.cancelIdleCallback(prewarmIdleId);
    prewarmIdleId = null;
  }
  if (prewarmTimerId != null) {
    window.clearTimeout(prewarmTimerId);
    prewarmTimerId = null;
  }
}

function reloadPage() {
  location.reload();
}

function applyContentProgress(progress: ContentInitProgress): void {
  loadingProgress.value = Math.max(
    loadingProgress.value,
    Math.min(100, Math.round(progress.percent)),
  );
  loadingMessage.value = progress.message;
  loadingDetail.value =
    typeof progress.loaded === 'number' && typeof progress.total === 'number'
      ? `${progress.loaded}/${progress.total}`
      : '';
}

onMounted(() => {
  settings.applyTheme();
  mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', onColorSchemeChange);
  loadingProgress.value = 5;
  loadingMessage.value = '检查本地题库缓存…';
  const bootstrapped = hydrateContentFromStorage();
  const bootSignature = getContentSignature();
  if (bootstrapped) {
    contentReady.value = true;
    loadingProgress.value = 72;
    loadingMessage.value = '已使用本地缓存，正在同步最新题库…';
  }
  void initContent({ onProgress: applyContentProgress })
    .then(() => {
      contentReady.value = true;
      loadingProgress.value = 100;
      loadingMessage.value = '题库加载完成';
      loadingDetail.value = '';
      scheduleSearchPrewarm();
      if (bootstrapped && bootSignature && getContentSignature() !== bootSignature) {
        // 已先用本地缓存渲染过页面，若后台拉到新题库签名则刷新一次确保路由与侧栏同步最新数据。
        reloadPage();
      }
    })
    .catch((e) => {
      console.error('[KAP] initContent failed:', e);
      if (!bootstrapped) {
        contentError.value = e instanceof Error ? e.message : String(e || '未知错误');
      }
    });
});

onBeforeUnmount(() => {
  mq?.removeEventListener('change', onColorSchemeChange);
  mq = null;
  cancelSearchPrewarm();
});

watch(
  () => route.fullPath,
  async () => {
    await nextTick();
    appMain.value?.scrollTo({ top: 0, behavior: 'auto' });
  },
);

useShortcuts({
  search: () => (searchOpen.value = true),
  cmdk: () => (searchOpen.value = true),
  help: () => (helpOpen.value = true),
});
</script>

<template>
  <div class="layout" :class="{ 'content-ready': contentReady }">
    <AppHeader
      class="app-header"
      @toggle-sidebar="sidebarOpen = !sidebarOpen"
      @open-search="searchOpen = true"
      @open-help="helpOpen = true"
    />
    <AppSidebar
      v-if="contentReady"
      class="app-sidebar"
      :open="sidebarOpen"
      @close="sidebarOpen = false"
    />
    <main ref="appMain" class="app-main">
      <div v-if="contentError" class="startup-error-card">
        <h1>KAP 加载失败</h1>
        <p>题库内容初始化没有完成，请检查网络后刷新页面。</p>
        <pre>{{ contentError }}</pre>
        <button type="button" class="btn btn-primary" @click="reloadPage">刷新页面</button>
      </div>
      <div v-else-if="!contentReady" class="startup-loading-card" role="status" aria-live="polite">
        <h2>题库加载中 {{ loadingProgress }}%</h2>
        <p>{{ loadingMessage }}</p>
        <AppLoader class="startup-loader" />
        <div class="startup-loading-track" aria-hidden="true">
          <div class="startup-loading-fill" :style="{ width: `${loadingProgress}%` }" />
        </div>
        <small v-if="loadingDetail" class="startup-loading-detail">{{ loadingDetail }}</small>
      </div>
      <RouterView v-else v-slot="{ Component }">
        <Suspense>
          <component :is="Component" />
          <template #fallback>
            <div class="loading">
              <AppLoader class="route-loader" />
              <p>页面加载中...</p>
            </div>
          </template>
        </Suspense>
      </RouterView>
    </main>
    <ShortcutsHelp v-if="helpOpen" v-model:open="helpOpen" />
    <SearchPalette v-if="searchOpen && contentReady" v-model:open="searchOpen" />
    <UpdateToast />
    <nav class="app-bottom-nav" aria-label="移动端主导航">
      <RouterLink to="/" aria-label="总览">
        <AppIcon name="dashboard" />
        <span>总览</span>
      </RouterLink>
      <RouterLink to="/plan" aria-label="学习计划">
        <AppIcon name="calendar" />
        <span>计划</span>
      </RouterLink>
      <RouterLink to="/learn" aria-label="顺序学习">
        <AppIcon name="read" />
        <span>学习</span>
      </RouterLink>
      <RouterLink to="/quiz" aria-label="模拟面试">
        <AppIcon name="experiment" />
        <span>抽题</span>
      </RouterLink>
      <RouterLink to="/review" aria-label="待复习">
        <AppIcon name="reload" />
        <span>复习</span>
      </RouterLink>
      <RouterLink to="/marks" aria-label="收藏">
        <AppIcon name="star" />
        <span>收藏</span>
      </RouterLink>
    </nav>
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: var(--header-h) 1fr;
  grid-template-areas: 'header' 'main';
  height: 100vh;
  height: 100dvh;
  min-width: 0;
}
.layout.content-ready {
  grid-template-columns: var(--sidebar-w) 1fr;
  grid-template-areas: 'sidebar header' 'sidebar main';
}
.app-header {
  grid-area: header;
}
.app-sidebar {
  grid-area: sidebar;
}
.app-main {
  grid-area: main;
  overflow: auto;
  padding: 24px 32px;
  min-width: 0;
  overscroll-behavior: contain;
}
.loading {
  padding: 40px 16px;
  display: grid;
  place-items: center;
  gap: 6px;
  text-align: center;
  color: var(--c-text-mute);
}
.loading p {
  margin: 0;
}
.route-loader {
  --loader-font-size: 7px;
}
.startup-loading-card {
  max-width: 560px;
  margin: 48px auto 0;
  padding: 20px;
  border: 1px solid var(--c-border);
  border-radius: 14px;
  background: var(--c-surface);
  box-shadow: var(--c-shadow-sm);
}
.startup-loading-card h2 {
  margin: 0;
  font-size: 20px;
}
.startup-loading-card p {
  margin: 10px 0 14px;
  color: var(--c-text-mute);
}
.startup-loader {
  --loader-font-size: 9px;

  margin: 0 auto 10px;
}
.startup-loading-track {
  width: 100%;
  height: 10px;
  border-radius: 999px;
  overflow: hidden;
  background: var(--c-bg-soft);
}
.startup-loading-fill {
  height: 100%;
  width: 0;
  border-radius: inherit;
  background: linear-gradient(90deg, #38bdf8, #0ea5e9);
  transition: width 220ms ease;
}
.startup-loading-detail {
  display: block;
  margin-top: 10px;
  color: var(--c-text-mute);
}
.app-bottom-nav {
  display: none;
}

@media (max-width: 768px) {
  .layout.content-ready,
  .layout {
    grid-template-columns: 1fr;
    grid-template-areas: 'header' 'main';
  }
  .app-main {
    padding: 16px 14px calc(76px + env(safe-area-inset-bottom));
  }
  .app-bottom-nav {
    position: fixed;
    right: 12px;
    bottom: calc(10px + env(safe-area-inset-bottom));
    left: 12px;
    z-index: 25;
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 4px;
    padding: 6px;
    background: var(--c-surface);
    background: color-mix(in srgb, var(--c-surface) 92%, transparent);
    border: 1px solid var(--c-border);
    border-radius: 18px;
    box-shadow: var(--c-shadow-lg);
    backdrop-filter: blur(12px);
  }
  .app-bottom-nav a {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 0;
    min-height: 44px;
    gap: 2px;
    border-radius: 12px;
    color: var(--c-text-mute);
    font-size: 11px;
    line-height: 1.2;
    text-decoration: none;
  }
  .app-bottom-nav a.router-link-active {
    background: var(--c-primary-soft);
    color: var(--c-primary);
    font-weight: 600;
  }
}
</style>
