<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useContent } from '@/composables/useContent';
import { useProgressStore } from '@/stores/progress';
import { useSettingsStore } from '@/stores/settings';
import QuestionCard from '@/components/question/QuestionCard.vue';
import AppIcon from '@/components/icon/AppIcon.vue';

const route = useRoute();
const router = useRouter();
const { allQuestions, categories } = useContent();
const progress = useProgressStore();
const settings = useSettingsStore();

const total = computed(() => allQuestions.value.length);

const indexParam = computed(() => {
  const raw = route.query.i;
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(Math.max(1, Math.trunc(n)), Math.max(1, total.value));
});

const current = computed(() => allQuestions.value[indexParam.value - 1]);

const currentCategory = computed(() =>
  current.value ? categories.value.find((c) => c.id === current.value.categoryId) : undefined,
);

const positionInCategory = computed(() => {
  if (!current.value || !currentCategory.value) return { idx: 0, total: 0 };
  const list = currentCategory.value.questions;
  const idx = list.findIndex((q) => q.id === current.value!.id);
  return { idx: idx + 1, total: list.length };
});

const stats = computed(() => {
  let done = 0;
  for (const q of allQuestions.value) {
    if (progress.get(q.id).status === 'mastered') done++;
  }
  return { done, total: total.value };
});

function go(delta: number) {
  const next = indexParam.value + delta;
  if (next < 1 || next > total.value) return;
  router.push({ path: '/learn', query: { i: String(next) } });
}

function jumpTo(n: number) {
  const safe = Math.min(Math.max(1, n), total.value);
  router.push({ path: '/learn', query: { i: String(safe) } });
}

function onJumpInput(e: Event) {
  const value = Number((e.target as HTMLInputElement).value);
  if (Number.isFinite(value)) jumpTo(value);
}

function jumpToCategoryStart(catId: string) {
  const startIdx = allQuestions.value.findIndex((q) => q.categoryId === catId);
  if (startIdx >= 0) jumpTo(startIdx + 1);
}

function onCategorySelect(e: Event) {
  const value = (e.target as HTMLSelectElement).value;
  if (value) jumpToCategoryStart(value);
}

function resumeFromLastUnfinished() {
  const start = indexParam.value;
  const nextIdx = allQuestions.value.findIndex(
    (q, idx) => idx >= start && progress.get(q.id).status !== 'mastered',
  );
  if (nextIdx >= 0) {
    jumpTo(nextIdx + 1);
    return;
  }
  const fallbackIdx = allQuestions.value.findIndex((q) => progress.get(q.id).status !== 'mastered');
  jumpTo(fallbackIdx >= 0 ? fallbackIdx + 1 : indexParam.value);
}

watch(
  () => route.query.i,
  () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    document.querySelector<HTMLElement>('.app-main')?.scrollTo({ top: 0, behavior: 'smooth' });
  },
);

function onKey(e: KeyboardEvent) {
  if (!settings.state.shortcutsEnabled) return;
  if (e.target && (e.target as HTMLElement).matches('input, textarea, [contenteditable=true]'))
    return;
  if (e.key === 'ArrowLeft' || e.key === 'k') go(-1);
  else if (e.key === 'ArrowRight' || e.key === 'j') go(1);
}
onMounted(() => window.addEventListener('keydown', onKey));
onUnmounted(() => window.removeEventListener('keydown', onKey));
</script>

<template>
  <div class="learn">
    <header class="hd">
      <div class="title-row">
        <h1><AppIcon name="read" /> 顺序学习</h1>
        <span class="muted">从第 1 题到第 {{ total }} 题，按目录顺序逐题攻克。</span>
      </div>
      <div class="meta">
        <span class="chip">第 {{ indexParam }} / {{ total }} 题</span>
        <span v-if="currentCategory" class="chip">
          {{ currentCategory.icon }} {{ currentCategory.title }} ({{ positionInCategory.idx }}/{{
            positionInCategory.total
          }})
        </span>
        <span class="chip done">已掌握 {{ stats.done }} / {{ stats.total }}</span>
      </div>
      <div class="bar">
        <div class="bar-fill" :style="{ width: `${(indexParam / Math.max(1, total)) * 100}%` }" />
      </div>
    </header>

    <div class="actions">
      <button
        class="btn"
        title="上一题（快捷键 k / ←）"
        :disabled="indexParam <= 1"
        @click="go(-1)"
      >
        <AppIcon name="arrowLeft" /> 上一题
      </button>
      <button
        class="btn primary"
        title="下一题（快捷键 j / →）"
        :disabled="indexParam >= total"
        @click="go(1)"
      >
        下一题 <AppIcon name="arrowRight" />
      </button>
      <button class="btn" @click="resumeFromLastUnfinished">
        <AppIcon name="thunderbolt" /> 跳到下一道未掌握
      </button>
      <label class="jump">
        跳转到第
        <input type="number" min="1" :max="total" :value="indexParam" @change="onJumpInput" />
        题
      </label>
    </div>

    <QuestionCard
      v-if="current"
      :key="current.id"
      :question="current"
      :index="indexParam"
      :default-open="false"
    />
    <div v-else class="empty">暂无题目可学习</div>

    <footer class="ft">
      <button class="btn" :disabled="indexParam <= 1" @click="go(-1)">
        <AppIcon name="arrowLeft" /> 上一题
      </button>
      <RouterLink v-if="current" :to="`/c/${current.categoryId}`" class="btn">
        <AppIcon name="folderOpen" /> 在分类中查看：{{ currentCategory?.title }}
      </RouterLink>
      <button class="btn primary" :disabled="indexParam >= total" @click="go(1)">
        下一题 <AppIcon name="arrowRight" />
      </button>
    </footer>

    <section class="catnav">
      <div class="catnav-head">
        <h3><AppIcon name="appstore" /> 分类快速跳转</h3>
        <span v-if="currentCategory" class="muted">当前：{{ currentCategory.title }}</span>
      </div>
      <select
        class="cat-select"
        :value="current?.categoryId || ''"
        aria-label="选择分类快速跳转"
        @change="onCategorySelect"
      >
        <option disabled value="">选择分类...</option>
        <option v-for="c in categories" :key="c.id" :value="c.id">
          {{ c.icon }} {{ c.title }}（{{ c.questions.length }} 题）
        </option>
      </select>
      <ul class="cat-list">
        <li v-for="c in categories" :key="c.id">
          <button
            class="cat-btn"
            :class="{ active: c.id === current?.categoryId }"
            @click="jumpToCategoryStart(c.id)"
          >
            <span>{{ c.icon }} {{ c.title }}</span>
            <span class="muted">{{ c.questions.length }} 题</span>
          </button>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.learn {
  max-width: 980px;
  margin: 0 auto;
}
.hd h1 {
  font-size: 22px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-right: 12px;
}
.title-row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
}
.muted {
  color: var(--c-text-mute);
  font-size: 13px;
}
.meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin: 10px 0 6px;
}
.chip {
  font-size: 12px;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--c-bg-mute);
  color: var(--c-text-soft);
}
.chip.done {
  background: var(--c-primary-soft);
  color: var(--c-primary);
}
.bar {
  height: 6px;
  background: var(--c-border-soft);
  border-radius: 999px;
  overflow: hidden;
  margin: 6px 0 16px;
}
.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--c-primary), #6366f1);
  transition: width 0.3s;
}
.btn {
  padding: 8px 14px;
  border-radius: var(--radius);
  background: var(--c-bg-mute);
  font-size: 13px;
  cursor: pointer;
  border: 1px solid transparent;
  text-decoration: none;
  color: var(--c-text);
}
.btn:hover {
  background: var(--c-bg-soft);
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn.primary {
  background: var(--c-primary);
  color: #fff;
}
.btn.primary:hover {
  filter: brightness(1.05);
}
.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 14px;
}
.actions .btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.jump {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--c-text-soft);
}
.jump input {
  width: 70px;
  padding: 6px 8px;
  border-radius: var(--radius);
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  color: var(--c-text);
}
.empty {
  padding: 40px;
  text-align: center;
  color: var(--c-text-mute);
}
.ft {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  margin: 16px 0 32px;
}
.catnav {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid var(--c-border-soft);
}
.catnav-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}
.catnav h3 {
  font-size: 14px;
  margin: 0;
}
.cat-select {
  display: none;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  background: var(--c-surface);
  color: var(--c-text);
}
.cat-list {
  list-style: none;
  padding: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 8px;
}
.cat-btn {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: var(--radius);
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  font-size: 13px;
  color: var(--c-text);
  cursor: pointer;
}
.cat-btn:hover {
  border-color: var(--c-primary);
  color: var(--c-primary);
}
.cat-btn.active {
  background: var(--c-primary-soft);
  border-color: var(--c-primary);
  color: var(--c-primary);
}
@media (max-width: 560px) {
  .hd h1 {
    font-size: 20px;
  }
  .actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .actions .btn,
  .jump {
    width: 100%;
    justify-content: center;
  }
  .jump {
    grid-column: 1 / -1;
  }
  .ft {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .ft .btn {
    justify-content: center;
    text-align: center;
  }
  .ft a.btn {
    grid-column: 1 / -1;
    order: 3;
  }
  .catnav {
    padding: 12px;
    border: 1px solid var(--c-border);
    border-radius: var(--radius);
    background: var(--c-bg-soft);
  }
  .catnav-head {
    align-items: flex-start;
    flex-direction: column;
  }
  .cat-select {
    display: block;
  }
  .cat-list {
    display: none;
  }
}
</style>
