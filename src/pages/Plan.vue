<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useContent } from '@/composables/useContent';
import { useLearningPlanStore } from '@/stores/learningPlan';
import { useMarksStore } from '@/stores/marks';
import { useProgressStore } from '@/stores/progress';
import { questionPriority } from '@/lib/questionPriority';
import AppIcon from '@/components/icon/AppIcon.vue';
import type { Question } from '@/types/content';

const { allQuestions, categories } = useContent();
const plan = useLearningPlanStore();
const marks = useMarksStore();
const progress = useProgressStore();

const modes = [
  { days: 7 as const, title: '7 天突击', desc: '优先高频、收藏、模糊题，适合临近面试快速补短板。' },
  { days: 14 as const, title: '14 天面试准备', desc: '兼顾覆盖率和复习节奏，每天任务量适中。' },
  { days: 30 as const, title: '30 天系统复习', desc: '按分类铺开，适合从零建立完整知识网。' },
];

function rankedQuestions(): Question[] {
  return allQuestions.value
    .filter((q) => !marks.isSkipped(q.id))
    .slice()
    .sort((a, b) => {
      const pa = questionPriority(a, {
        status: progress.get(a.id).status,
        starred: marks.isStarred(a.id),
      });
      const pb = questionPriority(b, {
        status: progress.get(b.id).status,
        starred: marks.isStarred(b.id),
      });
      return pb - pa || a.categoryId.localeCompare(b.categoryId) || a.title.localeCompare(b.title);
    });
}

const schedule = computed(() => {
  const days = plan.state.days || 14;
  const buckets = Array.from({ length: days }, (_, index) => ({
    day: index + 1,
    questions: [] as Question[],
  }));

  rankedQuestions().forEach((question, index) => {
    buckets[index % days].questions.push(question);
  });
  return buckets;
});

const today = computed(() => schedule.value[plan.currentDay - 1] || schedule.value[0]);
const currentMode = computed(() => modes.find((item) => item.days === plan.state.days));
const totalScheduled = computed(() =>
  schedule.value.reduce((sum, day) => sum + day.questions.length, 0),
);
const planDone = computed(() => {
  const ids = schedule.value.flatMap((day) => day.questions.map((q) => q.id));
  return progress.totalDoneFor(ids);
});

function dayDone(questions: Question[]): number {
  return progress.totalDoneFor(questions.map((q) => q.id));
}

function categoryTitle(id: string): string {
  return categories.value.find((category) => category.id === id)?.title || id;
}

function statusLabel(id: string): string {
  const status = progress.get(id).status;
  if (status === 'mastered') return '已掌握';
  if (status === 'review') return '需复习';
  if (status === 'fuzzy') return '模糊';
  return '未做';
}
</script>

<template>
  <div class="plan-page">
    <header class="head">
      <h1><AppIcon name="calendar" /> 学习计划 / 冲刺模式</h1>
      <p class="muted">
        自动按高频、难度、收藏、薄弱状态拆成每日任务。每天只看今天这组，降低选择成本。
      </p>
    </header>

    <section class="modes">
      <article v-for="mode in modes" :key="mode.days" class="card mode-card">
        <h2>{{ mode.title }}</h2>
        <p>{{ mode.desc }}</p>
        <button
          class="btn"
          :class="{ 'btn-primary': plan.state.days === mode.days }"
          @click="plan.start(mode.days)"
        >
          {{ plan.state.days === mode.days ? '重新开始' : '启用计划' }}
        </button>
      </article>
    </section>

    <section class="card status">
      <div>
        <p class="eyebrow">当前计划</p>
        <h2>{{ currentMode?.title || '尚未启用' }}</h2>
        <p class="muted">
          已完成 {{ planDone }} / {{ totalScheduled }} 题
          <span v-if="plan.state.days">，今天是第 {{ plan.currentDay }} 天</span>
        </p>
      </div>
      <div class="status-actions">
        <button v-if="plan.active" class="btn" @click="plan.pause">暂停</button>
        <button v-else-if="plan.state.pausedAt" class="btn btn-primary" @click="plan.resume">
          继续
        </button>
        <button v-if="plan.state.days" class="btn btn-ghost" @click="plan.clear">清除计划</button>
      </div>
    </section>

    <section v-if="today" class="card today">
      <div class="section-title">
        <h2>今日任务：第 {{ today.day }} 天</h2>
        <span>{{ dayDone(today.questions) }} / {{ today.questions.length }}</span>
      </div>
      <div class="task-list">
        <RouterLink
          v-for="q in today.questions.slice(0, 24)"
          :key="q.id"
          class="task"
          :to="`/q/${q.categoryId}/${q.slug}`"
        >
          <span class="task-title">{{ q.title }}</span>
          <span class="meta">{{ categoryTitle(q.categoryId) }} · {{ q.difficulty }}</span>
          <span class="state" :class="progress.get(q.id).status">{{ statusLabel(q.id) }}</span>
        </RouterLink>
      </div>
    </section>

    <section class="calendar">
      <article
        v-for="day in schedule"
        :key="day.day"
        class="card day-card"
        :class="{ active: day.day === plan.currentDay }"
      >
        <div class="day-head">
          <b>Day {{ day.day }}</b>
          <span>{{ dayDone(day.questions) }}/{{ day.questions.length }}</span>
        </div>
        <p class="muted">
          {{
            [...new Set(day.questions.slice(0, 8).map((q) => categoryTitle(q.categoryId)))].join(
              ' / ',
            )
          }}
        </p>
      </article>
    </section>
  </div>
</template>

<style scoped>
.plan-page {
  max-width: 1100px;
  margin: 0 auto;
}
.head h1,
.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.muted {
  color: var(--c-text-mute);
  font-size: 13px;
}
.modes,
.calendar {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.mode-card,
.status,
.today,
.day-card {
  padding: 16px;
}
.mode-card h2,
.status h2,
.today h2 {
  margin: 0 0 8px;
  font-size: 18px;
}
.status {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin: 14px 0;
}
.eyebrow {
  margin: 0 0 4px;
  color: var(--c-primary);
  font-size: 12px;
  font-weight: 700;
}
.status-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.section-title {
  justify-content: space-between;
}
.task-list {
  display: grid;
  gap: 8px;
}
.task {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 10px;
  align-items: center;
  padding: 10px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  background: var(--c-bg-soft);
  color: inherit;
  text-decoration: none;
}
.task:hover {
  border-color: var(--c-primary);
}
.task-title {
  font-weight: 600;
}
.meta,
.state {
  color: var(--c-text-mute);
  font-size: 12px;
}
.state.mastered {
  color: var(--c-success);
}
.state.review,
.state.fuzzy {
  color: var(--c-warning);
}
.calendar {
  margin-top: 14px;
}
.day-card.active {
  border-color: var(--c-primary);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--c-primary) 24%, transparent);
}
.day-head {
  display: flex;
  justify-content: space-between;
}
@media (max-width: 760px) {
  .modes,
  .calendar {
    grid-template-columns: 1fr;
  }
  .status,
  .task {
    align-items: stretch;
    flex-direction: column;
    grid-template-columns: 1fr;
  }
}
</style>
