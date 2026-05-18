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

watchEffect(() => {
  if (cat.value) document.title = `${cat.value.title} · KAP`;
});

const tags = computed(() => {
  if (!cat.value) return [];
  const set = new Set<string>();
  cat.value.questions.forEach((q) => q.tags.forEach((t) => set.add(t)));
  return Array.from(set).sort();
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
  if (!cat.value) return [];
  const k = filter.state.keyword.trim().toLowerCase();
  return cat.value.questions.filter((q) => {
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
      const hay = (q.title + ' ' + q.tags.join(' ') + ' ' + q.raw).toLowerCase();
      if (!hay.includes(k)) return false;
    }
    return true;
  });
});
</script>

<template>
  <div v-if="cat" class="cat-page">
    <header class="hd">
      <h1>
        <span class="icon">{{ cat.icon }}</span>
        {{ cat.title }}
        <span class="count">{{ filtered.length }}/{{ cat.questions.length }}</span>
      </h1>
      <p v-if="cat.description" class="desc">{{ cat.description }}</p>
    </header>
    <QuestionFilters :tags="tags" />
    <div v-if="filtered.length === 0" class="empty">没有匹配的题目，调整筛选条件试试</div>
    <QuestionCard v-for="(q, i) in filtered" :key="q.id" :question="q" :index="i + 1" />
  </div>
  <div v-else class="empty">分类不存在</div>
</template>

<style scoped>
.cat-page {
  max-width: 980px;
  margin: 0 auto;
}
.hd h1 {
  font-size: 22px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.icon {
  font-size: 24px;
}
.count {
  font-size: 13px;
  color: var(--c-text-mute);
  font-weight: 400;
}
.desc {
  margin: 6px 0;
  color: var(--c-text-soft);
  font-size: 13px;
}
.empty {
  padding: 40px;
  text-align: center;
  color: var(--c-text-mute);
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
