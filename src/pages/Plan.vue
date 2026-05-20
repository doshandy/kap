<script setup lang="ts">
import { computed, watch } from 'vue';
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
const questionMap = computed(() => new Map(allQuestions.value.map((q) => [q.id, q])));
const questionIdsFingerprint = computed(() => allQuestions.value.map((q) => q.id).join('|'));
const skippedIdsFingerprint = computed(() =>
  Object.keys(marks.state.skipped)
    .filter((id) => marks.state.skipped[id])
    .sort()
    .join('|'),
);

const modes = [
  {
    days: 7 as const,
    title: '7 天突击',
    desc: '优先高频、收藏、模糊题，适合临近面试快速补短板。',
    tone: '高压冲刺',
  },
  {
    days: 14 as const,
    title: '14 天面试准备',
    desc: '兼顾覆盖率和复习节奏，每天任务量适中。',
    tone: '均衡推进',
  },
  {
    days: 30 as const,
    title: '30 天系统复习',
    desc: '按分类铺开，适合从零建立完整知识网。',
    tone: '长期构建',
  },
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

function buildSchedule(days: number): Question[][] {
  const buckets = Array.from({ length: days }, () => [] as Question[]);
  rankedQuestions().forEach((question, index) => {
    buckets[index % days].push(question);
  });
  return buckets;
}

function buildScheduleIds(days: number): string[][] {
  return buildSchedule(days).map((bucket) => bucket.map((q) => q.id));
}

function sameSchedule(a: string[][], b: string[][]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].length !== b[i].length) return false;
    for (let j = 0; j < a[i].length; j++) {
      if (a[i][j] !== b[i][j]) return false;
    }
  }
  return true;
}

function reconcileSchedule(days: number): string[][] {
  if (plan.state.schedule.length !== days) return buildScheduleIds(days);

  const normalized = plan.state.schedule.map((day) =>
    [...new Set(day)].filter((id) => questionMap.value.has(id) && !marks.isSkipped(id)),
  );
  const removedCounts = plan.state.schedule.map(
    (day, index) => day.length - normalized[index].length,
  );
  const scheduledIds = new Set(normalized.flat());
  const candidates = rankedQuestions()
    .map((question) => question.id)
    .filter((id) => !scheduledIds.has(id));
  let cursor = 0;

  for (let dayIndex = 0; dayIndex < normalized.length; dayIndex++) {
    for (let pick = 0; pick < removedCounts[dayIndex]; pick++) {
      const next = candidates[cursor++];
      if (!next) break;
      normalized[dayIndex].push(next);
    }
  }

  return normalized;
}

function startPlan(days: 7 | 14 | 30): void {
  plan.start(days, buildScheduleIds(days));
}

watch(
  () => [plan.state.days, questionIdsFingerprint.value, skippedIdsFingerprint.value] as const,
  ([days]) => {
    if (!days) return;
    const next = reconcileSchedule(days);
    if (plan.state.schedule.length === days && sameSchedule(plan.state.schedule, next)) return;
    plan.setSchedule(next);
  },
  { immediate: true },
);

const schedule = computed(() => {
  if (!plan.state.days) return [];
  const days = plan.state.days;
  if (plan.state.schedule.length === days) {
    return plan.state.schedule.map((ids, index) => ({
      day: index + 1,
      questions: ids
        .map((id) => questionMap.value.get(id))
        .filter((q): q is Question => {
          if (!q) return false;
          return !marks.isSkipped(q.id);
        }),
    }));
  }
  return buildSchedule(days).map((questions, index) => ({
    day: index + 1,
    questions,
  }));
});

const today = computed(() => {
  if (!plan.state.days) return undefined;
  return schedule.value[plan.currentDay - 1] || schedule.value[0];
});
const currentMode = computed(() => modes.find((item) => item.days === plan.state.days));
const totalScheduled = computed(() =>
  schedule.value.reduce((sum, day) => sum + day.questions.length, 0),
);
const hasPlannedQuestions = computed(() => totalScheduled.value > 0);
const emptyPlan = computed(() => Boolean(plan.state.days && !hasPlannedQuestions.value));
const planDone = computed(() => {
  const ids = schedule.value.flatMap((day) => day.questions.map((q) => q.id));
  return progress.totalLearnedFor(ids);
});
const completionPercent = computed(() => {
  if (!totalScheduled.value) return 0;
  return Math.round((planDone.value / totalScheduled.value) * 100);
});

function dayDone(questions: Question[]): number {
  return progress.totalLearnedFor(questions.map((q) => q.id));
}

function dayPercent(questions: Question[]): number {
  if (!questions.length) return 0;
  return Math.round((dayDone(questions) / questions.length) * 100);
}

const todayPercent = computed(() => {
  if (!today.value) return 0;
  return dayPercent(today.value.questions);
});

function regenerateCurrentPlan(): void {
  if (!plan.state.days) return;
  startPlan(plan.state.days);
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
      <article
        v-for="mode in modes"
        :key="mode.days"
        class="card mode-card"
        :class="[`mode-${mode.days}`, { active: plan.state.days === mode.days }]"
      >
        <div class="mode-head">
          <h2>{{ mode.title }}</h2>
          <span class="mode-days">D{{ mode.days }}</span>
        </div>
        <p class="mode-desc">{{ mode.desc }}</p>
        <div class="mode-tail">
          <p class="mode-tone">{{ mode.tone }}</p>
          <button
            class="btn mode-btn"
            :class="{ 'btn-primary': plan.state.days === mode.days }"
            @click="startPlan(mode.days)"
          >
            {{ plan.state.days === mode.days ? '重新开始' : '启用计划' }}
          </button>
        </div>
      </article>
    </section>

    <section class="card status">
      <div class="status-main">
        <div>
          <p class="eyebrow">当前计划</p>
          <h2>{{ currentMode?.title || '尚未启用' }}</h2>
          <p class="muted">
            已学习 {{ planDone }} / {{ totalScheduled }} 题
            <span v-if="plan.state.days">，今天是第 {{ plan.currentDay }} 天</span>
          </p>
        </div>
        <div class="status-metrics">
          <div class="metric">
            <b>{{ completionPercent }}%</b>
            <span>总体进度</span>
          </div>
          <div v-if="plan.state.days" class="metric">
            <b>Day {{ plan.currentDay }}</b>
            <span>当前节奏</span>
          </div>
        </div>
      </div>
      <div class="status-progress" aria-hidden="true">
        <span :style="{ width: `${completionPercent}%` }" />
      </div>
      <div class="status-actions">
        <button v-if="plan.active" class="btn" @click="plan.pause">暂停</button>
        <button v-else-if="plan.state.pausedAt" class="btn btn-primary" @click="plan.resume">
          继续
        </button>
        <button v-if="plan.state.days" class="btn btn-ghost" @click="plan.clear">清除计划</button>
      </div>
    </section>

    <section v-if="emptyPlan" class="card empty-state">
      <h2><AppIcon name="warning" /> 当前计划没有可执行题目</h2>
      <p class="muted">
        计划内题目可能已被跳过或题库更新导致失效。你可以恢复跳过题后重建计划，或先清除计划重新选择模式。
      </p>
      <div class="status-actions">
        <RouterLink class="btn btn-primary" to="/marks">去恢复跳过题</RouterLink>
        <button class="btn" @click="regenerateCurrentPlan">重新生成当前计划</button>
        <button class="btn btn-ghost" @click="plan.clear">清除计划</button>
      </div>
    </section>

    <section v-if="today" class="card today">
      <div class="section-title">
        <h2>今日任务：第 {{ today.day }} 天</h2>
        <div class="today-stats">
          <span>{{ dayDone(today.questions) }} / {{ today.questions.length }}</span>
          <span class="today-percent">{{ todayPercent }}%</span>
        </div>
      </div>
      <div class="task-list">
        <RouterLink
          v-for="q in today.questions.slice(0, 24)"
          :key="q.id"
          class="task"
          :to="`/q/${q.categoryId}/${q.slug}`"
        >
          <div class="task-main">
            <span class="task-title">{{ q.title }}</span>
            <span class="meta">{{ categoryTitle(q.categoryId) }} · {{ q.difficulty }}</span>
          </div>
          <span class="state-pill" :class="progress.get(q.id).status">{{ statusLabel(q.id) }}</span>
          <AppIcon name="arrowRight" class="task-arrow" />
        </RouterLink>
      </div>
    </section>

    <section v-if="plan.state.days && schedule.length" class="calendar">
      <article
        v-for="day in schedule"
        :key="day.day"
        class="card day-card"
        :class="{ active: day.day === plan.currentDay }"
      >
        <div class="day-head">
          <b>Day {{ day.day }}</b>
          <span class="day-ratio">{{ dayDone(day.questions) }}/{{ day.questions.length }}</span>
        </div>
        <div class="day-progress" aria-hidden="true">
          <span :style="{ width: `${dayPercent(day.questions)}%` }" />
        </div>
        <p class="muted day-cats">
          {{
            [...new Set(day.questions.slice(0, 8).map((q) => categoryTitle(q.categoryId)))].join(
              ' / ',
            )
          }}
        </p>
        <p class="day-percent">{{ dayPercent(day.questions) }}% 完成</p>
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
  gap: 14px;
}
.mode-card,
.status,
.today,
.day-card {
  padding: 16px;
}
.mode-card h2,
.status h2,
.today h2,
.empty-state h2 {
  margin: 0 0 8px;
  font-size: 18px;
}
.mode-card {
  --mode-accent: var(--c-primary);
  --mode-soft: color-mix(in srgb, var(--c-primary) 10%, transparent);

  position: relative;
  display: grid;
  grid-template-rows: auto minmax(42px, 1fr) auto auto;
  gap: 10px;
  min-height: 184px;
  border: 1px solid var(--c-border);
  overflow: hidden;
  background: linear-gradient(180deg, var(--mode-soft), transparent 52%), var(--c-surface);
  box-shadow: var(--c-shadow-sm);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}
.mode-card::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  height: 4px;
  border-radius: 0;
  background: var(--mode-accent);
}
.mode-card.mode-7 {
  --mode-accent: #f97316;
  --mode-soft: rgba(249, 115, 22, 0.1);
}
.mode-card.mode-14 {
  --mode-accent: #0ea5e9;
  --mode-soft: rgba(14, 165, 233, 0.1);
}
.mode-card.mode-30 {
  --mode-accent: #10b981;
  --mode-soft: rgba(16, 185, 129, 0.1);
}
.mode-card:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--mode-accent) 45%, var(--c-border));
  box-shadow: var(--c-shadow-lg);
}
.mode-card.active {
  border-color: color-mix(in srgb, var(--mode-accent) 55%, var(--c-border));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--mode-accent) 35%, transparent);
}
.mode-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}
.mode-days {
  flex: 0 0 auto;
  padding: 4px 10px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--mode-accent) 16%, transparent);
  color: color-mix(in srgb, var(--mode-accent) 78%, #111827);
  font-size: 12px;
  font-weight: 700;
}
.mode-desc {
  margin: 0;
  font-size: 12px;
  color: var(--c-text-soft);
  line-height: 1.65;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}
.mode-tone {
  margin: 0;
  font-size: 12px;
  color: color-mix(in srgb, var(--mode-accent) 78%, #374151);
  font-weight: 600;
}
.mode-tail {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.mode-btn {
  min-height: 30px;
  padding: 5px 11px;
  font-size: 12px;
  flex-shrink: 0;
}
.status {
  margin: 16px 0;
  border: 1px solid var(--c-border);
  background: linear-gradient(180deg, rgba(14, 165, 233, 0.08), transparent 56%), var(--c-surface);
  box-shadow: var(--c-shadow-sm);
  display: grid;
  gap: 14px;
}
.status-main {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}
.status-metrics {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.metric {
  min-width: 92px;
  padding: 9px 11px;
  border: 1px solid var(--c-border);
  border-radius: 12px;
  background: var(--c-bg-soft);
  text-align: right;
  display: grid;
  gap: 2px;
}
.metric b {
  color: var(--c-primary);
  font-size: 16px;
  line-height: 1.2;
}
.metric span {
  color: var(--c-text-mute);
  font-size: 11px;
}
.eyebrow {
  margin: 0 0 4px;
  color: var(--c-primary);
  font-size: 12px;
  font-weight: 700;
}
.status-progress {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: var(--c-bg-soft);
}
.status-progress span {
  display: block;
  width: 0;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #38bdf8, #0ea5e9);
  transition: width 260ms ease;
}
.status-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  flex-wrap: wrap;
}
.empty-state {
  margin-bottom: 14px;
  border: 1px dashed color-mix(in srgb, var(--c-warning) 35%, var(--c-border));
  background: color-mix(in srgb, var(--c-warning) 6%, var(--c-surface));
}
.section-title {
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 10px;
}
.today {
  border: 1px solid var(--c-border);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--c-primary) 10%, transparent), transparent 60%),
    var(--c-surface);
  box-shadow: var(--c-shadow-sm);
}
.today-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--c-text-mute);
  font-size: 13px;
}
.today-percent {
  padding: 2px 8px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--c-primary) 15%, transparent);
  color: var(--c-primary);
  font-weight: 700;
}
.task-list {
  display: grid;
  gap: 10px;
}
.task {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 12px;
  align-items: center;
  padding: 12px;
  border: 1px solid var(--c-border);
  border-radius: 12px;
  background: var(--c-surface);
  color: inherit;
  text-decoration: none;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}
.task:hover {
  border-color: var(--c-primary);
  box-shadow: var(--c-shadow-sm);
  transform: translateY(-1px);
}
.task-main {
  min-width: 0;
  display: grid;
  gap: 4px;
}
.task-title {
  font-weight: 600;
  overflow-wrap: anywhere;
}
.meta {
  color: var(--c-text-mute);
  font-size: 12px;
}
.state-pill {
  padding: 4px 9px;
  border-radius: 999px;
  border: 1px solid var(--c-border);
  color: var(--c-text-mute);
  font-size: 12px;
  white-space: nowrap;
  background: var(--c-bg-soft);
}
.state-pill.mastered {
  color: var(--c-success);
  border-color: color-mix(in srgb, var(--c-success) 40%, var(--c-border));
  background: color-mix(in srgb, var(--c-success) 12%, transparent);
}
.state-pill.review,
.state-pill.fuzzy {
  color: var(--c-warning);
  border-color: color-mix(in srgb, var(--c-warning) 45%, var(--c-border));
  background: color-mix(in srgb, var(--c-warning) 12%, transparent);
}
.task-arrow {
  color: var(--c-text-mute);
  font-size: 14px;
}
.calendar {
  margin-top: 14px;
}
.day-card {
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  box-shadow: var(--c-shadow-sm);
  transition:
    border-color 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
.day-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--c-shadow-sm);
}
.day-card.active {
  border-color: var(--c-primary);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--c-primary) 24%, transparent);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--c-primary) 10%, transparent), transparent 64%),
    var(--c-surface);
}
.day-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.day-ratio {
  color: var(--c-text-mute);
  font-size: 12px;
}
.day-progress {
  width: 100%;
  height: 7px;
  border-radius: 999px;
  overflow: hidden;
  background: var(--c-bg-soft);
}
.day-progress span {
  display: block;
  width: 0;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #34d399, #10b981);
  transition: width 220ms ease;
}
.day-cats {
  margin: 10px 0 0;
}
.day-percent {
  margin: 8px 0 0;
  color: var(--c-success);
  font-size: 12px;
  font-weight: 600;
}
@media (max-width: 760px) {
  .modes,
  .calendar {
    grid-template-columns: 1fr;
  }
  .status-main {
    flex-direction: column;
  }
  .status-metrics {
    width: 100%;
    justify-content: flex-start;
  }
  .metric {
    flex: 1 1 120px;
    text-align: left;
  }
  .status-actions {
    justify-content: flex-start;
  }
  .section-title {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .task {
    grid-template-columns: 1fr auto;
    align-items: flex-start;
  }
  .task-arrow {
    display: none;
  }
}
</style>
