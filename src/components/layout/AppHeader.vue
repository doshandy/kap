<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useSettingsStore } from '@/stores/settings';
import AppIcon from '@/components/icon/AppIcon.vue';

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
      <button
        class="btn btn-ghost btn-icon menu-btn"
        aria-label="菜单"
        @click="$emit('toggle-sidebar')"
      >
        <AppIcon name="list" />
      </button>
      <button class="brand" @click="router.push('/')">
        <span class="logo">KAP</span>
        <span class="brand-sub">前端知识自查</span>
      </button>
    </div>
    <div class="right">
      <button class="btn btn-ghost" title="搜索（/ 或 ⌘K）" @click="$emit('open-search')">
        <AppIcon name="search" />
        <span class="lbl">搜索</span>
      </button>
      <button
        class="btn btn-ghost mobile-nav-duplicate"
        title="顺序学习"
        @click="router.push('/learn')"
      >
        <AppIcon name="read" /><span class="lbl">顺序学习</span>
      </button>
      <button class="btn btn-ghost compact-hide" title="学习计划" @click="router.push('/plan')">
        <AppIcon name="calendar" /><span class="lbl">计划</span>
      </button>
      <button
        class="btn btn-ghost mobile-nav-duplicate"
        title="模拟面试"
        @click="router.push('/quiz')"
      >
        <AppIcon name="experiment" /><span class="lbl">抽题</span>
      </button>
      <button class="btn btn-ghost compact-hide" title="临考模式" @click="router.push('/exam')">
        <AppIcon name="trophy" /><span class="lbl">临考</span>
      </button>
      <button
        class="btn btn-ghost mobile-nav-duplicate"
        title="待复习"
        @click="router.push('/review')"
      >
        <AppIcon name="reload" /><span class="lbl">复习</span>
      </button>
      <button
        class="btn btn-ghost mobile-nav-duplicate"
        title="收藏 / 跳过"
        @click="router.push('/marks')"
      >
        <AppIcon name="star" /><span class="lbl">收藏</span>
      </button>
      <button
        class="btn btn-ghost btn-icon compact-hide"
        title="路线图"
        aria-label="路线图"
        @click="router.push('/roadmap')"
      >
        <AppIcon name="compass" />
      </button>
      <button
        class="btn btn-ghost btn-icon compact-hide"
        title="面试技巧"
        aria-label="面试技巧"
        @click="router.push('/interview-guide')"
      >
        <AppIcon name="fileText" />
      </button>
      <button
        class="btn btn-ghost btn-icon compact-hide"
        title="题目关系图谱"
        aria-label="题目关系图谱"
        @click="router.push('/graph')"
      >
        <AppIcon name="deployment" />
      </button>
      <button
        class="btn btn-ghost btn-icon"
        title="切换主题"
        aria-label="切换主题"
        @click="settings.toggleTheme()"
      >
        <AppIcon :name="isDark ? 'moon' : 'sun'" />
      </button>
      <button
        class="btn btn-ghost btn-icon"
        title="设置"
        aria-label="设置"
        @click="router.push('/settings')"
      >
        <AppIcon name="setting" />
      </button>
      <button
        class="btn btn-ghost btn-icon compact-hide"
        title="快捷键 (?)"
        aria-label="快捷键"
        @click="$emit('open-help')"
      >
        <AppIcon name="question" />
      </button>
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
  min-width: 0;
}
.left,
.right {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.left {
  flex: 1 1 auto;
  min-width: 0;
}
.right {
  flex: 0 1 auto;
  justify-content: flex-end;
  overflow: hidden;
}
.brand {
  display: flex;
  align-items: baseline;
  gap: 8px;
  background: transparent;
  padding: 0;
  min-width: 0;
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
.right .btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 36px;
}
@media (max-width: 768px) {
  .hdr {
    gap: 6px;
    padding: 0 8px;
  }
  .left {
    flex: 1 1 auto;
    gap: 4px;
  }
  .right {
    flex: 0 0 auto;
    gap: 1px;
  }
  .menu-btn {
    display: inline-flex;
  }
  .brand-sub {
    display: none;
  }
  .mobile-nav-duplicate {
    display: none !important;
  }
  .right .btn .lbl {
    display: none;
  }
  /* 移动端顶部按钮进入仅图标模式时，统一使用无边框样式。 */
  .right .btn {
    --btn-border: transparent;
    --btn-bg: transparent;
    border-color: transparent;
    background: transparent;
    box-shadow: none;
  }
  .right .btn::before {
    background: transparent;
  }
  .right .btn,
  .menu-btn {
    min-width: 34px;
    min-height: 38px;
    justify-content: center;
    padding: 6px;
  }
}
@media (max-width: 380px) {
  .compact-hide,
  .right .btn[title='搜索（/ 或 ⌘K）'] {
    display: none !important;
  }
  .logo {
    font-size: 16px;
  }
}
</style>
