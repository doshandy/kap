<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useContent } from '@/composables/useContent';
import { useProgressStore } from '@/stores/progress';
import { useMarksStore } from '@/stores/marks';
import AppIcon from '@/components/icon/AppIcon.vue';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const route = useRoute();
const { categories } = useContent();
const progress = useProgressStore();
const marks = useMarksStore();
const sidebarRef = ref<HTMLElement | null>(null);
const SIDEBAR_TITLE_ID = 'app-sidebar-title';
const MOBILE_BREAKPOINT = 768;
const isMobile = ref(false);
let lastFocused: HTMLElement | null = null;

const stats = computed(() => {
  const map: Record<string, string[]> = {};
  for (const c of categories.value) {
    map[c.id] = c.questions.filter((q) => !marks.isSkipped(q.id)).map((q) => q.id);
  }
  return progress.statsByCategory(map);
});

const totalQuestions = computed(() =>
  categories.value.reduce((sum, category) => sum + (stats.value[category.id]?.total ?? 0), 0),
);

const totalLearned = computed(() =>
  progress.totalLearnedFor(
    categories.value.flatMap((category) =>
      category.questions
        .filter((question) => !marks.isSkipped(question.id))
        .map((question) => question.id),
    ),
  ),
);

function onNavClick() {
  if (window.innerWidth <= 768) emit('close');
}

function syncIsMobile() {
  isMobile.value = window.innerWidth <= MOBILE_BREAKPOINT;
}

function setMainInert(inert: boolean): void {
  const main = document.querySelector('.app-main');
  if (!(main instanceof HTMLElement)) return;
  if (inert) {
    main.setAttribute('inert', '');
    main.setAttribute('aria-hidden', 'true');
  } else {
    main.removeAttribute('inert');
    main.removeAttribute('aria-hidden');
  }
}

function onEscape(event: KeyboardEvent): void {
  if (event.key !== 'Escape') return;
  if (!isMobile.value || !props.open) return;
  event.preventDefault();
  emit('close');
}

watch(
  () => props.open,
  async (open) => {
    if (!isMobile.value) return;
    if (open) {
      lastFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setMainInert(true);
      await nextTick();
      sidebarRef.value?.focus();
      return;
    }
    setMainInert(false);
    lastFocused?.focus();
    lastFocused = null;
  },
);

watch(isMobile, (mobile) => {
  if (!mobile) {
    setMainInert(false);
    return;
  }
  if (props.open) setMainInert(true);
});

onMounted(() => {
  syncIsMobile();
  window.addEventListener('resize', syncIsMobile);
  window.addEventListener('keydown', onEscape);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncIsMobile);
  window.removeEventListener('keydown', onEscape);
  setMainInert(false);
});
</script>

<template>
  <div class="sb-shell">
    <aside
      ref="sidebarRef"
      class="sb"
      :class="{ open: props.open }"
      :role="isMobile && props.open ? 'dialog' : undefined"
      :aria-modal="isMobile && props.open ? 'true' : undefined"
      :aria-labelledby="isMobile && props.open ? SIDEBAR_TITLE_ID : undefined"
      tabindex="-1"
    >
      <div class="sb-head">
        <RouterLink :id="SIDEBAR_TITLE_ID" to="/" class="home-link" @click="onNavClick">
          <AppIcon name="dashboard" /> 总览
        </RouterLink>
        <button
          class="mobile-close btn-ghost"
          type="button"
          aria-label="关闭侧边栏"
          @click="emit('close')"
        >
          <AppIcon name="close" />
        </button>
        <div class="quick-links">
          <RouterLink to="/plan" @click="onNavClick"><AppIcon name="calendar" /> 计划</RouterLink>
          <RouterLink to="/exam" @click="onNavClick"><AppIcon name="trophy" /> 临考</RouterLink>
          <RouterLink to="/graph" @click="onNavClick">
            <AppIcon name="deployment" /> 图谱
          </RouterLink>
          <RouterLink to="/interview-guide" @click="onNavClick">
            <AppIcon name="fileText" /> 技巧
          </RouterLink>
        </div>
        <div class="overall">
          <div class="bar">
            <div
              class="bar-fill"
              :style="{
                width: totalQuestions ? `${(totalLearned / totalQuestions) * 100}%` : '0%',
              }"
            />
          </div>
          <div class="overall-text">
            已学习 <b>{{ totalLearned }}</b> / {{ totalQuestions }}
          </div>
        </div>
      </div>
      <nav class="cat-list">
        <RouterLink
          v-for="c in categories"
          :key="c.id"
          :to="`/c/${c.id}`"
          class="cat-item"
          :class="{ active: route.params.categoryId === c.id }"
          @click="onNavClick"
        >
          <span class="icon">{{ c.icon }}</span>
          <span class="title">{{ c.title }}</span>
          <span class="counter">
            {{ stats[c.id]?.learned ?? stats[c.id]?.done ?? 0 }}/{{ stats[c.id]?.total ?? 0 }}
          </span>
          <div class="cat-progress">
            <div
              class="cat-progress-fill"
              :style="{
                width:
                  (stats[c.id]?.total ?? 0)
                    ? `${((stats[c.id]?.learned ?? stats[c.id]?.done ?? 0) / (stats[c.id]?.total ?? 0)) * 100}%`
                    : '0%',
              }"
            />
          </div>
        </RouterLink>
      </nav>
      <div class="sb-foot">
        <RouterLink to="/changelog" class="foot-link" @click="onNavClick">
          <AppIcon name="fileText" /> 更新日志
        </RouterLink>
        <a class="foot-link" href="https://github.com/doshandy/kap" target="_blank" rel="noopener">
          <AppIcon name="github" /> GitHub
        </a>
      </div>
    </aside>
    <div v-if="props.open" class="mask" aria-hidden="true" @click="emit('close')" />
  </div>
</template>

<style scoped>
.sb-shell {
  display: flex;
  min-height: 0;
}
.sb {
  display: flex;
  flex-direction: column;
  flex: 1;
  background: var(--c-surface);
  border-right: 1px solid var(--c-border);
  overflow: hidden;
}
.sb-head {
  padding: 16px 16px 12px;
  border-bottom: 1px solid var(--c-border-soft);
  position: relative;
}
.home-link {
  display: block;
  padding: 6px 10px;
  border-radius: var(--radius);
  font-weight: 600;
  color: var(--c-text);
  text-decoration: none;
}
.home-link:hover {
  background: var(--c-bg-mute);
  text-decoration: none;
}
.mobile-close {
  display: none;
  position: absolute;
  top: 14px;
  right: 10px;
  width: 32px;
  height: 32px;
  align-items: center;
  justify-content: center;
}
.quick-links {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
  margin-top: 8px;
}
.quick-links a {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 6px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  color: var(--c-text-soft);
  font-size: 12px;
  text-decoration: none;
}
.quick-links a:hover {
  border-color: var(--c-primary);
  color: var(--c-primary);
}
.overall {
  margin-top: 10px;
  padding: 8px 10px;
  background: var(--c-bg-soft);
  border-radius: var(--radius);
}
.overall-text {
  margin-top: 6px;
  font-size: 12px;
  color: var(--c-text-mute);
}
.bar {
  height: 6px;
  background: var(--c-border-soft);
  border-radius: 999px;
  overflow: hidden;
}
.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--c-primary), #6366f1);
  transition: width 0.3s;
}
.cat-list {
  flex: 1;
  overflow: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.cat-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-rows: auto auto;
  gap: 4px 8px;
  align-items: center;
  padding: 8px 10px;
  border-radius: var(--radius);
  color: var(--c-text);
  text-decoration: none;
  position: relative;
}
.cat-item:hover {
  background: var(--c-bg-mute);
  text-decoration: none;
}
.cat-item.active {
  background: var(--c-primary-soft);
  color: var(--c-primary);
}
.cat-item .icon {
  grid-row: span 2;
  font-size: 18px;
}
.cat-item .title {
  font-size: 13px;
  font-weight: 500;
}
.cat-item .counter {
  font-size: 11px;
  color: var(--c-text-mute);
}
.cat-progress {
  grid-column: 2 / span 2;
  height: 3px;
  background: var(--c-border-soft);
  border-radius: 999px;
  overflow: hidden;
}
.cat-progress-fill {
  height: 100%;
  background: var(--c-primary);
}
.sb-foot {
  border-top: 1px solid var(--c-border-soft);
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 12px;
}
.foot-link {
  color: var(--c-text-soft);
  text-decoration: none;
}
.foot-link:hover {
  color: var(--c-primary);
}
.mask {
  display: none;
}
@media (max-width: 768px) {
  .sb {
    position: fixed;
    inset: 0 auto 0 0;
    width: min(86vw, 320px);
    max-width: 320px;
    padding-top: env(safe-area-inset-top);
    transform: translateX(-100%);
    transition: transform 0.2s;
    z-index: 30;
  }
  .sb.open {
    transform: translateX(0);
    box-shadow: var(--c-shadow-lg);
  }
  .mobile-close {
    display: inline-flex;
  }
  .mask {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 28;
    backdrop-filter: blur(1px);
  }
}
</style>
