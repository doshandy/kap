<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useContent } from '@/composables/useContent';
import { useMarksStore } from '@/stores/marks';
import { useProgressStore } from '@/stores/progress';
import { weakCategories, weakTrainingQuestions } from '@/lib/learningExperience';
import QuestionCard from '@/components/question/QuestionCard.vue';
import AppIcon from '@/components/icon/AppIcon.vue';

const { categories } = useContent();
const marks = useMarksStore();
const progress = useProgressStore();

const signals = {
  getStatus: (id: string) => progress.get(id).status,
  getRecord: (id: string) => progress.get(id),
  isStarred: (id: string) => marks.isStarred(id),
  isSkipped: (id: string) => marks.isSkipped(id),
  wrongReasonsOf: (id: string) => marks.wrongReasonsOf(id),
};

const weak = computed(() => weakCategories(categories.value, signals, 5));
const questions = computed(() => weakTrainingQuestions(categories.value, signals, 12));
</script>

<template>
  <div class="weak-page">
    <header class="head">
      <h1><AppIcon name="warning" /> 弱点专项训练</h1>
      <p class="muted">
        根据薄弱分类、需复习题、错因标签、收藏和高频标签自动组题。每次优先做 8-12
        道，适合移动端短训练。
      </p>
    </header>

    <section class="weak-grid">
      <article v-for="item in weak" :key="item.category.id" class="card weak-card">
        <div>
          <h2>{{ item.category.icon }} {{ item.category.title }}</h2>
          <p class="muted">
            已做 {{ item.done }}/{{ item.total }} · 已掌握
            {{ Math.round(item.masteredRate * 100) }}% · 待复盘 {{ item.review }} · 错因
            {{ item.wrong }} · 收藏 {{ item.starred }}
          </p>
        </div>
        <RouterLink class="btn btn-ghost" :to="`/c/${item.category.id}`">查看分类</RouterLink>
      </article>
    </section>

    <section class="card training-head">
      <div>
        <p class="eyebrow">今日专项</p>
        <h2>{{ questions.length }} 道优先训练题</h2>
      </div>
      <RouterLink class="btn btn-primary" to="/quiz">
        <AppIcon name="experiment" /> 去抽题模拟
      </RouterLink>
    </section>

    <QuestionCard v-for="(q, i) in questions" :key="q.id" :question="q" :index="i + 1" />

    <div v-if="!questions.length" class="empty card">
      暂无足够薄弱数据。先学习或标记几道“模糊 / 需复习 / 错因”题后，这里会自动生成专项训练。
    </div>
  </div>
</template>

<style scoped>
.weak-page {
  max-width: 980px;
  margin: 0 auto;
}
.head h1,
.training-head h2 {
  display: flex;
  align-items: center;
  gap: 8px;
}
.muted {
  color: var(--c-text-mute);
  font-size: 13px;
}
.weak-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin-bottom: 14px;
}
.weak-card,
.training-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
  padding: 14px;
}
.weak-card h2,
.training-head h2 {
  margin: 0 0 6px;
  font-size: 16px;
}
.eyebrow {
  margin: 0 0 4px;
  color: var(--c-primary);
  font-size: 12px;
  font-weight: 700;
}
.training-head {
  margin-bottom: 14px;
}
.empty {
  padding: 32px;
  text-align: center;
  color: var(--c-text-mute);
}
@media (max-width: 560px) {
  .weak-card,
  .training-head {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
