<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useContent } from '@/composables/useContent';
import { useProgressStore } from '@/stores/progress';
import AppIcon from '@/components/icon/AppIcon.vue';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'close'): void }>();

const route = useRoute();
const { categories } = useContent();
const progress = useProgressStore();

const stats = computed(() => {
  const map: Record<string, string[]> = {};
  for (const c of categories.value) map[c.id] = c.questions.map((q) => q.id);
  return progress.statsByCategory(map);
});

const totalQuestions = computed(() =>
  categories.value.reduce((s, c) => s + c.questions.length, 0),
);

const totalDone = computed(() => progress.totalDone);

function onNavClick() {
  if (window.innerWidth <= 768) emit('close');
}
</script>

<template>
  <aside class="sb" :class="{ open: props.open }">
    <div class="sb-head">
      <RouterLink to="/" class="home-link" @click="onNavClick">
        <AppIcon name="dashboard" /> 总览
      </RouterLink>
      <div class="overall">
        <div class="bar">
          <div
            class="bar-fill"
            :style="{ width: totalQuestions ? `${(totalDone / totalQuestions) * 100}%` : '0%' }"
          />
        </div>
        <div class="overall-text">
          已完成 <b>{{ totalDone }}</b> / {{ totalQuestions }}
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
          {{ stats[c.id]?.done ?? 0 }}/{{ c.questions.length }}
        </span>
        <div class="cat-progress">
          <div
            class="cat-progress-fill"
            :style="{
              width: c.questions.length
                ? `${((stats[c.id]?.done ?? 0) / c.questions.length) * 100}%`
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
    <div v-if="props.open" class="mask" @click="emit('close')" />
  </aside>
</template>

<style scoped>
.sb {
  display: flex;
  flex-direction: column;
  background: var(--c-surface);
  border-right: 1px solid var(--c-border);
  overflow: hidden;
}
.sb-head {
  padding: 16px 16px 12px;
  border-bottom: 1px solid var(--c-border-soft);
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
    width: 78%;
    max-width: 320px;
    transform: translateX(-100%);
    transition: transform 0.2s;
    z-index: 30;
  }
  .sb.open {
    transform: translateX(0);
    box-shadow: var(--c-shadow-lg);
  }
  .mask {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 20;
  }
}
</style>
