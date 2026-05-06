<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useSettingsStore } from '@/stores/settings';

defineEmits<{
  (e: 'toggle-sidebar'): void;
  (e: 'open-search'): void;
  (e: 'open-help'): void;
}>();

const router = useRouter();
const settings = useSettingsStore();

const isDark = computed(() => {
  if (settings.state.theme === 'auto') {
    return typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false;
  }
  return settings.state.theme === 'dark';
});
</script>

<template>
  <header class="hdr">
    <div class="left">
      <button class="btn-ghost menu-btn" aria-label="菜单" @click="$emit('toggle-sidebar')">
        ☰
      </button>
      <button class="brand" @click="router.push('/')">
        <span class="logo">KAP</span>
        <span class="brand-sub">十年前端知识自查</span>
      </button>
    </div>
    <div class="right">
      <button class="btn btn-ghost" title="搜索 (/)" @click="$emit('open-search')">
        <span>🔍 搜索</span>
        <kbd class="kbd">⌘K</kbd>
      </button>
      <button class="btn btn-ghost" title="模拟面试" @click="router.push('/quiz')">🎯 抽题</button>
      <button class="btn btn-ghost" title="待复习" @click="router.push('/review')">🔁 复习</button>
      <button class="btn btn-ghost" title="路线图" @click="router.push('/roadmap')">🗺️</button>
      <button
        class="btn btn-ghost"
        title="切换主题"
        aria-label="切换主题"
        @click="settings.toggleTheme()"
      >
        {{ isDark ? '🌙' : '☀️' }}
      </button>
      <button class="btn btn-ghost" title="设置" @click="router.push('/settings')">⚙️</button>
      <button class="btn btn-ghost" title="快捷键 (?)" @click="$emit('open-help')">?</button>
    </div>
  </header>
</template>

<style scoped>
.hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid var(--c-border);
  background: var(--c-surface);
  z-index: 10;
}
.left,
.right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.brand {
  display: flex;
  align-items: baseline;
  gap: 8px;
  background: transparent;
  padding: 0;
}
.logo {
  font-weight: 700;
  font-size: 18px;
  color: var(--c-primary);
  letter-spacing: 1px;
}
.brand-sub {
  font-size: 12px;
  color: var(--c-text-mute);
}
.menu-btn {
  display: none;
  padding: 6px 10px;
  font-size: 18px;
}
.kbd {
  display: inline-block;
  font-family: monospace;
  font-size: 11px;
  border: 1px solid var(--c-border);
  border-bottom-width: 2px;
  border-radius: 4px;
  padding: 0 5px;
  margin-left: 4px;
  color: var(--c-text-mute);
}
@media (max-width: 768px) {
  .menu-btn {
    display: inline-flex;
  }
  .brand-sub {
    display: none;
  }
  .right .btn span {
    display: none;
  }
}
</style>
