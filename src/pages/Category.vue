<script setup lang="ts">
import { computed, watch, watchEffect } from 'vue';
import { useRoute } from 'vue-router';
import { useContent } from '@/composables/useContent';
import { useFilterStore } from '@/stores/filter';
import { useProgressStore } from '@/stores/progress';
import { useMarksStore } from '@/stores/marks';
import { useFilterSync } from '@/composables/useFilterSync';
import QuestionCard from '@/components/question/QuestionCard.vue';
import QuestionFilters from '@/components/question/QuestionFilters.vue';

const route = useRoute();
const { getCategory } = useContent();
const filter = useFilterStore();
const progress = useProgressStore();
const marks = useMarksStore();

useFilterSync();

const cat = computed(() => getCategory(route.params.categoryId as string));
const questions = computed(() => cat.value?.questions ?? []);
const normalizedKeyword = computed(() => filter.state.keyword.trim().toLowerCase());
const searchableById = computed(
  () =>
    new Map(
      questions.value.map((question) => [
        question.id,
        `${question.title} ${question.tags.join(' ')} ${question.raw}`.toLowerCase(),
      ]),
    ),
);

watchEffect(() => {
  if (cat.value) document.title = `${cat.value.title} · KAP`;
});

const tags = computed(() => {
  const set = new Set<string>();
  questions.value.forEach((q) => q.tags.forEach((t) => set.add(t)));
  return Array.from(set).sort();
});

const hasActiveFilters = computed(() => {
  const state = filter.state;
  return Boolean(
    state.keyword.trim() || state.difficulties.length || state.tags.length || state.statuses.length,
  );
});

const activeTotal = computed(() => {
  return questions.value.filter((q) => !marks.isSkipped(q.id)).length;
});

const skippedTotal = computed(() => {
  return questions.value.length - activeTotal.value;
});

watch(
  tags,
  (available) => {
    if (!filter.state.tags.length) return;
    const set = new Set(available);
    const next = filter.state.tags.filter((tag) => set.has(tag));
    if (next.length !== filter.state.tags.length) filter.state.tags = next;
  },
  { immediate: true },
);

const filtered = computed(() => {
  const k = normalizedKeyword.value;
  return questions.value.filter((q) => {
    if (marks.isSkipped(q.id)) return false;
    if (filter.state.difficulties.length && !filter.state.difficulties.includes(q.difficulty))
      return false;
    if (filter.state.tags.length && !filter.state.tags.some((t) => q.tags.includes(t)))
      return false;
    if (filter.state.statuses.length) {
      const s = progress.get(q.id).status;
      if (!filter.state.statuses.includes(s)) return false;
    }
    if (k) {
      const hay = searchableById.value.get(q.id) || '';
      if (!hay.includes(k)) return false;
    }
    return true;
  });
});
</script>

<template>
  <div v-if="cat" class="cat-page">
    <header class="hd card">
      <h1>
        <span class="icon">{{ cat.icon }}</span>
        {{ cat.title }}
        <span class="count">{{ filtered.length }}/{{ activeTotal }}</span>
      </h1>
      <p v-if="cat.description" class="desc">{{ cat.description }}</p>
      <p v-if="skippedTotal" class="muted">已隐藏 {{ skippedTotal }} 道被标记为“跳过”的题目。</p>
    </header>
    <QuestionFilters :tags="tags" />
    <div v-if="filtered.length === 0" class="empty" aria-live="polite">
      <p v-if="activeTotal === 0">当前分类所有题目都被标记为“跳过”，请先恢复题目。</p>
      <p v-else>没有匹配的题目，调整筛选条件试试。</p>
      <div class="empty-actions">
        <button v-if="hasActiveFilters" class="btn btn-primary" @click="filter.reset">
          重置筛选
        </button>
        <RouterLink v-if="activeTotal === 0" class="btn" to="/marks">去管理跳过题</RouterLink>
      </div>
    </div>
    <QuestionCard v-for="(q, i) in filtered" :key="q.id" :question="q" :index="i + 1" />
  </div>
  <div v-else class="empty">分类不存在</div>
</template>

<style scoped>
.cat-page {
  max-width: 980px;
  margin: 0 auto;
}
.hd {
  padding: 16px 18px;
  margin-bottom: 12px;
  border: 1px solid var(--c-border);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--c-primary) 10%, transparent), transparent 64%),
    var(--c-surface);
  box-shadow: var(--c-shadow-sm);
}
.hd h1 {
  font-size: 22px;
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0;
}
.icon {
  font-size: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: color-mix(in srgb, var(--c-primary) 14%, transparent);
}
.count {
  margin-left: auto;
  padding: 4px 10px;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--c-primary) 35%, var(--c-border));
  background: color-mix(in srgb, var(--c-primary) 10%, transparent);
  font-size: 12px;
  color: var(--c-primary);
  font-weight: 700;
}
.desc {
  margin: 8px 0 6px;
  color: var(--c-text-soft);
  font-size: 13px;
  line-height: 1.65;
}
.muted {
  margin: 0;
  color: var(--c-text-mute);
  font-size: 12px;
}
.empty {
  padding: 28px 18px;
  text-align: center;
  color: var(--c-text-mute);
  border: 1px dashed var(--c-border);
  border-radius: var(--radius);
  background: var(--c-bg-soft);
  margin-top: 10px;
}
.empty p {
  margin: 0;
}
.empty-actions {
  margin-top: 10px;
  display: inline-flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: center;
}
@media (max-width: 560px) {
  .hd h1 {
    align-items: flex-start;
    font-size: 20px;
    line-height: 1.3;
  }
  .count {
    margin-left: auto;
    white-space: nowrap;
  }
  .empty {
    padding: 28px 12px;
  }
}
</style>
