<script setup lang="ts">
import { defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue';
import AppHeader from '@/components/layout/AppHeader.vue';
import AppSidebar from '@/components/layout/AppSidebar.vue';
import { useSettingsStore } from '@/stores/settings';
import { useShortcuts } from '@/composables/useShortcuts';

// 搜索面板和快捷键弹窗仅在用户触发时才需要加载，配合动态 fuse.js
// 可以让首屏 vendor 主链路里完全不带搜索相关代码。
const SearchPalette = defineAsyncComponent(() => import('@/components/search/SearchPalette.vue'));
const ShortcutsHelp = defineAsyncComponent(() => import('@/components/settings/ShortcutsHelp.vue'));

const settings = useSettingsStore();
const sidebarOpen = ref(false);
const helpOpen = ref(false);
const searchOpen = ref(false);

let mq: MediaQueryList | null = null;
const onColorSchemeChange = () => settings.applyTheme();

onMounted(() => {
  settings.applyTheme();
  mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', onColorSchemeChange);
});

onBeforeUnmount(() => {
  mq?.removeEventListener('change', onColorSchemeChange);
  mq = null;
});

useShortcuts({
  search: () => (searchOpen.value = true),
  cmdk: () => (searchOpen.value = true),
  help: () => (helpOpen.value = true),
});
</script>

<template>
  <div class="layout">
    <AppHeader
      class="app-header"
      @toggle-sidebar="sidebarOpen = !sidebarOpen"
      @open-search="searchOpen = true"
      @open-help="helpOpen = true"
    />
    <AppSidebar class="app-sidebar" :open="sidebarOpen" @close="sidebarOpen = false" />
    <main class="app-main">
      <RouterView v-slot="{ Component }">
        <Suspense>
          <component :is="Component" />
          <template #fallback>
            <div class="loading">加载中...</div>
          </template>
        </Suspense>
      </RouterView>
    </main>
    <ShortcutsHelp v-if="helpOpen" v-model:open="helpOpen" />
    <SearchPalette v-if="searchOpen" v-model:open="searchOpen" />
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: var(--sidebar-w) 1fr;
  grid-template-rows: var(--header-h) 1fr;
  grid-template-areas: 'sidebar header' 'sidebar main';
  height: 100vh;
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
}
.loading {
  padding: 40px;
  text-align: center;
  color: var(--c-text-mute);
}

@media (max-width: 768px) {
  .layout {
    grid-template-columns: 1fr;
    grid-template-areas: 'header' 'main';
  }
  .app-main {
    padding: 16px;
  }
}
</style>
