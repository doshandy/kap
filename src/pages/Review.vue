<script setup lang="ts">
import { computed } from 'vue';
import { useReviewStore } from '@/stores/review';
import { useMarksStore } from '@/stores/marks';
import { useProgressStore } from '@/stores/progress';
import { useContent } from '@/composables/useContent';
import QuestionCard from '@/components/question/QuestionCard.vue';
import AppIcon from '@/components/icon/AppIcon.vue';
import type { Question } from '@/types/content';

const review = useReviewStore();
const marks = useMarksStore();
const progress = useProgressStore();
const { questionMap } = useContent();

for (const id of Object.keys(review.state.items)) {
  if (!questionMap.get(id)) review.remove(id);
}

const dueQuestions = computed(() => {
  const due = review.dueIds.filter((id) => {
    const question = questionMap.get(id);
    return Boolean(question) && !marks.isSkipped(id);
  });
  const dueSet = new Set(due);
  const weakPending = Object.keys(progress.state.records)
    .filter((id) => {
      if (dueSet.has(id) || marks.isSkipped(id)) return false;
      if (!questionMap.get(id)) return false;
      const status = progress.get(id).status;
      return status === 'review' || status === 'fuzzy';
    })
    .sort((a, b) => progress.get(b).viewedAt - progress.get(a).viewedAt);
  return [...due, ...weakPending]
    .map((id) => questionMap.get(id))
    .filter((q): q is Question => Boolean(q));
});

type UpcomingItem = { q: Question; due: number };

const upcoming = computed(() => {
  const now = Date.now();
  return Object.entries(review.state.items)
    .map(([id, v]) => {
      const q = questionMap.get(id);
      if (!q) return null;
      return { id, q, due: v.due };
    })
    .filter(
      (item): item is UpcomingItem & { id: string } =>
        !!item && item.due > now && !marks.isSkipped(item.id),
    )
    .sort((a, b) => a.due - b.due)
    .slice(0, 20)
    .map(({ q, due }) => ({ q, due }));
});

const fmtDate = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
</script>

<template>
  <div class="rv">
    <header class="head card">
      <h1><AppIcon name="reload" /> 间隔复习</h1>
      <p class="muted">
        基于 SM-2 计算下次复习时间；同时会把你手动标记的「需复习 / 模糊」题纳入今日队列。
      </p>
    </header>

    <section class="review-section">
      <h3>今日待复习（{{ dueQuestions.length }}）</h3>
      <div v-if="!dueQuestions.length" class="empty">
        <AppIcon name="trophy" /> 今天没有待复习题，你可以去抽题或学新知识。
      </div>
      <QuestionCard v-for="(q, i) in dueQuestions" :key="q.id" :question="q" :index="i + 1" />
    </section>

    <section v-if="upcoming.length" class="review-section card upcoming-panel">
      <h3>未来排期</h3>
      <ul class="upcoming">
        <li v-for="u in upcoming" :key="u.q.id">
          <span class="date">{{ fmtDate(u.due) }}</span>
          <RouterLink :to="`/q/${u.q.categoryId}/${u.q.slug}`" class="link">
            {{ u.q.title }}
          </RouterLink>
          <span class="cat">{{ u.q.categoryId }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.rv {
  max-width: 920px;
  margin: 0 auto;
}
.head {
  padding: 16px 18px;
  border: 1px solid var(--c-border);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--c-primary) 10%, transparent), transparent 66%),
    var(--c-surface);
  box-shadow: var(--c-shadow-sm);
}
.head h1 {
  font-size: 22px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}
.muted {
  color: var(--c-text-mute);
  font-size: 13px;
  margin: 6px 0 0;
  line-height: 1.65;
}
.review-section {
  margin-top: 18px;
}
.review-section h3 {
  margin: 0 0 10px;
  font-size: 18px;
}
.upcoming-panel {
  padding: 14px 16px;
  border: 1px solid var(--c-border);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--c-primary) 8%, transparent), transparent 70%),
    var(--c-surface);
  box-shadow: var(--c-shadow-sm);
}
.empty {
  padding: 30px;
  text-align: center;
  color: var(--c-text-mute);
  border: 1px dashed var(--c-border);
  background: var(--c-bg-soft);
  border-radius: var(--radius);
}
.upcoming {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 8px;
}
.upcoming li {
  display: grid;
  grid-template-columns: 110px 1fr 110px;
  gap: 10px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid var(--c-border);
  border-radius: 10px;
  background: var(--c-bg-soft);
  font-size: 13px;
}
.date {
  color: var(--c-text-mute);
  font-family: monospace;
}
.link {
  overflow-wrap: anywhere;
}
.cat {
  color: var(--c-text-mute);
  text-align: right;
  font-size: 11px;
}

@media (max-width: 560px) {
  .upcoming li {
    grid-template-columns: 1fr;
    gap: 4px;
    padding: 10px;
  }
  .link {
    order: -1;
    line-height: 1.5;
  }
  .cat {
    text-align: left;
  }
}
</style>
