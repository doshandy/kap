<script setup lang="ts">
import { computed } from 'vue';
import { useReviewStore } from '@/stores/review';
import { useContent } from '@/composables/useContent';
import QuestionCard from '@/components/question/QuestionCard.vue';
import AppIcon from '@/components/icon/AppIcon.vue';

const review = useReviewStore();
const { questionMap } = useContent();

const dueQuestions = computed(() =>
  review.dueIds.map((id) => questionMap.get(id)).filter((q): q is NonNullable<typeof q> => !!q),
);

const upcoming = computed(() => {
  const now = Date.now();
  return Object.entries(review.state.items)
    .filter(([, v]) => v.due > now)
    .sort((a, b) => a[1].due - b[1].due)
    .slice(0, 20)
    .map(([id, v]) => ({ q: questionMap.get(id), due: v.due }))
    .filter((x) => !!x.q);
});

const fmtDate = (ts: number) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
</script>

<template>
  <div class="rv">
    <header>
      <h1><AppIcon name="reload" /> 间隔复习</h1>
      <p class="muted">
        基于 SM-2 算法计算下次复习时间。在题目卡里点 "记得 / 模糊 / 需复习" 给出反馈即可。
      </p>
    </header>

    <section>
      <h3>今日待复习（{{ dueQuestions.length }}）</h3>
      <div v-if="!dueQuestions.length" class="empty">
        <AppIcon name="trophy" /> 今天没有待复习题，你可以去抽题或学新知识。
      </div>
      <QuestionCard v-for="(q, i) in dueQuestions" :key="q.id" :question="q" :index="i + 1" />
    </section>

    <section v-if="upcoming.length">
      <h3>未来排期</h3>
      <ul class="upcoming">
        <li v-for="u in upcoming" :key="u.q!.id">
          <span class="date">{{ fmtDate(u.due) }}</span>
          <RouterLink
            :to="`/q/${u.q!.categoryId}/${u.q!.slug}`"
            class="link"
          >
            {{ u.q!.title }}
          </RouterLink>
          <span class="cat">{{ u.q!.categoryId }}</span>
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
header h1 {
  font-size: 22px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.muted {
  color: var(--c-text-mute);
  font-size: 13px;
  margin-top: 4px;
}
section {
  margin-top: 22px;
}
section h3 {
  margin-bottom: 10px;
}
.empty {
  padding: 30px;
  text-align: center;
  color: var(--c-text-mute);
  background: var(--c-bg-soft);
  border-radius: var(--radius);
}
.upcoming {
  list-style: none;
  padding: 0;
  margin: 0;
}
.upcoming li {
  display: grid;
  grid-template-columns: 110px 1fr 110px;
  gap: 10px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--c-border-soft);
  font-size: 13px;
}
.date {
  color: var(--c-text-mute);
  font-family: monospace;
}
.cat {
  color: var(--c-text-mute);
  text-align: right;
  font-size: 11px;
}
</style>
