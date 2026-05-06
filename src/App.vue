<script setup lang="ts">
import { onMounted, ref } from 'vue';
import AppHeader from '@/components/layout/AppHeader.vue';
import AppSidebar from '@/components/layout/AppSidebar.vue';
import ShortcutsHelp from '@/components/settings/ShortcutsHelp.vue';
import SearchPalette from '@/components/search/SearchPalette.vue';
import { useSettingsStore } from '@/stores/settings';
import { useShortcuts } from '@/composables/useShortcuts';

const settings = useSettingsStore();
const sidebarOpen = ref(false);
const helpOpen = ref(false);
const searchOpen = ref(false);

onMounted(() => {
  settings.applyTheme();
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  mq.addEventListener('change', () => settings.applyTheme());
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
    <ShortcutsHelp v-model:open="helpOpen" />
    <SearchPalette v-model:open="searchOpen" />
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
