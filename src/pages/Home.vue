<script setup lang="ts">
import { computed, nextTick, onActivated, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useContent } from '@/composables/useContent';
import { useProgressStore } from '@/stores/progress';
import { useReviewStore } from '@/stores/review';
import { useMarksStore } from '@/stores/marks';
import { buildContentFingerprint, useContentUpdatesStore } from '@/stores/contentUpdates';
import {
  pickContinueQuestion,
  preInterviewQuestions,
  questionUrl,
  weakTrainingQuestions,
} from '@/lib/learningExperience';
import AppIcon from '@/components/icon/AppIcon.vue';
import type { EChartsLite } from '@/lib/echartsLite';

let echarts: EChartsLite | null = null;
let echartsReady: Promise<EChartsLite> | null = null;

async function loadECharts(): Promise<EChartsLite> {
  if (echarts) return echarts;
  if (echartsReady) return echartsReady;
  echartsReady = import('@/lib/echartsLite').then((module) => {
    echarts = module.default;
    return module.default;
  });
  return echartsReady;
}

const { categories, allQuestions } = useContent();
const progress = useProgressStore();
const review = useReviewStore();
const marks = useMarksStore();
const updates = useContentUpdatesStore();

const allTotalQuestions = computed(() => allQuestions.value.length);
const activeQuestions = computed(() => allQuestions.value.filter((q) => !marks.isSkipped(q.id)));
const totalQuestions = computed(() => activeQuestions.value.length);
const questionIds = computed(() => activeQuestions.value.map((q) => q.id));
const questionIdSet = computed(() => new Set(questionIds.value));
const totalLearned = computed(() => progress.totalLearnedFor(questionIds.value));
const dueIds = computed(() => {
  const due = review.dueIdsFor(questionIds.value);
  const weakPending = questionIds.value.filter((id) => {
    const status = progress.get(id).status;
    return status === 'review' || status === 'fuzzy';
  });
  return [...new Set([...due, ...weakPending])];
});
const dueCount = computed(() => dueIds.value.length);
const scopedRecords = computed(() =>
  Object.entries(progress.state.records).filter(([id]) => questionIdSet.value.has(id)),
);
const masteredCount = computed(
  () => scopedRecords.value.filter(([, record]) => record.status === 'mastered').length,
);

const stats = computed(() => {
  const map: Record<string, string[]> = {};
  for (const c of categories.value) {
    map[c.id] = c.questions.filter((q) => !marks.isSkipped(q.id)).map((q) => q.id);
  }
  return progress.statsByCategory(map);
});
const statsFingerprint = computed(() =>
  categories.value
    .map((c) => {
      const s = stats.value[c.id];
      return `${c.id}:${s?.learned ?? s?.done ?? 0}/${s?.total ?? 0}`;
    })
    .join('|'),
);

/**
 * 薄弱分类排行：mastered/total 越低越靠前；至少做过 3 题再算分
 */
const weakRanking = computed(() => {
  return categories.value
    .map((c) => {
      const s = stats.value[c.id] ?? { total: 0, learned: 0, done: 0, mastered: 0, review: 0 };
      const masteredRate = s.total ? s.mastered / s.total : 0;
      const reviewRate = s.total ? s.review / s.total : 0;
      const score = masteredRate - reviewRate;
      return { id: c.id, title: c.title, icon: c.icon, ...s, masteredRate, score };
    })
    .filter((x) => x.learned >= 3 || x.review > 0)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);
});

/**
 * 最近 14 天每日学习次数（节奏曲线）
 */
const rhythm14 = computed(() => {
  const map = progress.heatmapFor(questionIds.value);
  const today = new Date();
  const out: { date: string; count: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out.push({ date: key.slice(5), count: map[key] || 0 });
  }
  return out;
});

const rhythmMax = computed(() => Math.max(1, ...rhythm14.value.map((r) => r.count)));
const rhythmTotal = computed(() => rhythm14.value.reduce((s, r) => s + r.count, 0));
const rhythmActiveDays = computed(() => rhythm14.value.filter((r) => r.count > 0).length);

/**
 * 面试就绪度：综合掌握率 + 复习覆盖 + 收藏题命中率，给出 0-100 分
 */
const readiness = computed(() => {
  const total = totalQuestions.value;
  if (!total) return { score: 0, level: '空仓' };
  const learned = totalLearned.value;
  const reviewSet = scopedRecords.value.filter(
    ([, r]) => r.status === 'review' || r.status === 'fuzzy',
  ).length;

  const coverScore = (learned / total) * 60;
  const masterScore = (masteredCount.value / total) * 30;
  const reviewPenalty = Math.min(reviewSet / Math.max(1, learned), 0.3) * 10;
  const score = Math.max(0, Math.min(100, Math.round(coverScore + masterScore - reviewPenalty)));

  let level = '准备不足';
  if (score >= 85) level = '随时可面';
  else if (score >= 65) level = '基础扎实';
  else if (score >= 40) level = '查漏补缺';
  else if (score >= 20) level = '入门阶段';
  return { score, level };
});

const starredCount = computed(() => marks.starredCountFor(questionIds.value));
const wrongCount = computed(() => marks.wrongCountFor(questionIds.value));
const contentFingerprint = computed(() => buildContentFingerprint(allQuestions.value));
const hasContentUpdates = computed(() => updates.hasUpdates(contentFingerprint.value));
const learningSignals = {
  getStatus: (id: string) => progress.get(id).status,
  getRecord: (id: string) => progress.get(id),
  isStarred: (id: string) => marks.isStarred(id),
  isSkipped: (id: string) => marks.isSkipped(id),
  wrongReasonsOf: (id: string) => marks.wrongReasonsOf(id),
};
const continueTarget = computed(() =>
  pickContinueQuestion(categories.value, allQuestions.value, learningSignals, dueIds.value),
);
const weakTrainingPreview = computed(() =>
  weakTrainingQuestions(categories.value, learningSignals, 12),
);
const preInterviewPreview = computed(() =>
  preInterviewQuestions(allQuestions.value, learningSignals, 30),
);
const weeklyReport = computed(() => {
  const sevenDays = rhythm14.value.slice(-7);
  const weeklyDone = sevenDays.reduce((sum, item) => sum + item.count, 0);
  const weak = weakRanking.value[0];
  const highFrequencyTotal = activeQuestions.value.filter((q) =>
    q.tags.some((tag) => /高频|核心|面试/.test(tag)),
  ).length;
  const highFrequencyDone = activeQuestions.value.filter(
    (q) => q.tags.some((tag) => /高频|核心|面试/.test(tag)) && progress.get(q.id).status !== 'todo',
  ).length;
  const reviewCount = scopedRecords.value.filter(
    ([, record]) => record.status === 'review' || record.status === 'fuzzy',
  ).length;
  return {
    weeklyDone,
    activeDays: sevenDays.filter((item) => item.count > 0).length,
    weakTitle: weak?.title || '暂无明显薄弱分类',
    reviewCount,
    highFrequencyRate: highFrequencyTotal
      ? Math.round((highFrequencyDone / highFrequencyTotal) * 100)
      : 0,
  };
});

const pieRef = ref<HTMLDivElement | null>(null);
const barRef = ref<HTMLDivElement | null>(null);
const heatRef = ref<HTMLDivElement | null>(null);

watch(
  contentFingerprint,
  (fingerprint) => {
    if (fingerprint && !updates.hasSeenAnyVersion) updates.markSeen(fingerprint);
  },
  { immediate: true },
);

function isDark() {
  return document.documentElement.classList.contains('dark');
}

const palette = {
  get surface() {
    return isDark() ? '#161b22' : '#ffffff';
  },
  get textStrong() {
    return isDark() ? '#e6edf3' : '#0f172a';
  },
  get textSoft() {
    return isDark() ? '#adbac7' : '#475569';
  },
  get textMute() {
    return isDark() ? '#768390' : '#94a3b8';
  },
  get bgMute() {
    return isDark() ? '#2d333b' : '#e2e8f0';
  },
};

function getOption() {
  const learned = totalLearned.value;
  const todo = totalQuestions.value - learned;
  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [
      {
        type: 'pie',
        radius: ['52%', '74%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: palette.surface, borderWidth: 2 },
        label: {
          show: true,
          position: 'center',
          formatter: () => `{a|${learned}}\n{b|/${totalQuestions.value}}`,
          rich: {
            a: { fontSize: 32, fontWeight: 'bold', color: palette.textStrong },
            b: { fontSize: 14, color: palette.textMute },
          },
        },
        data: [
          { value: learned, name: '已学习', itemStyle: { color: '#10b981' } },
          { value: todo, name: '未学习', itemStyle: { color: palette.bgMute } },
        ],
      },
    ],
  };
}

function getBarOption() {
  const data = categories.value.map((c) => ({
    name: c.title,
    total: stats.value[c.id]?.total ?? 0,
    learned: stats.value[c.id]?.learned ?? stats.value[c.id]?.done ?? 0,
  }));
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 30, right: 16, top: 30, bottom: 90 },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.name),
      axisLabel: { rotate: 45, fontSize: 10, color: palette.textSoft },
      axisLine: { lineStyle: { color: palette.bgMute } },
      axisTick: { lineStyle: { color: palette.bgMute } },
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: palette.textSoft },
      splitLine: { lineStyle: { color: palette.bgMute, type: 'dashed' } },
    },
    legend: { top: 0, textStyle: { color: palette.textSoft } },
    series: [
      {
        type: 'bar',
        name: '总题数',
        data: data.map((d) => d.total),
        itemStyle: { color: palette.bgMute },
        barGap: '-100%',
      },
      {
        type: 'bar',
        name: '已学习',
        data: data.map((d) => d.learned),
        itemStyle: { color: '#0ea5e9' },
      },
    ],
  };
}

function getHeatmapOption() {
  const map = progress.heatmapFor(questionIds.value);
  const points = Object.entries(map).map(([d, v]) => [d, v]);
  const max = Math.max(1, ...points.map((p) => p[1] as number));
  const compact =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(max-width: 640px)').matches;
  const today = new Date();
  const end = today.toISOString().slice(0, 10);
  const startDate = new Date(today);
  startDate.setMonth(startDate.getMonth() - (compact ? 5 : 11));
  startDate.setDate(1);
  const start = startDate.toISOString().slice(0, 10);
  return {
    tooltip: {
      formatter: (p: { value: [string, number] }) => `${p.value[0]}：${p.value[1] || 0} 题`,
    },
    visualMap: {
      min: 0,
      max,
      orient: 'horizontal',
      left: 'center',
      top: 0,
      itemWidth: compact ? 12 : 14,
      itemHeight: compact ? 10 : 12,
      textStyle: { color: palette.textSoft, fontSize: 11 },
      inRange: {
        color: isDark()
          ? ['#1c232c', '#0c4a6e', '#0284c7', '#38bdf8']
          : ['#e0f2fe', '#7dd3fc', '#0ea5e9', '#1e3a8a'],
      },
    },
    calendar: {
      top: compact ? 42 : 50,
      left: compact ? 28 : 40,
      right: compact ? 8 : 20,
      bottom: 10,
      range: [start, end],
      cellSize: compact ? [12, 12] : [16, 16],
      splitLine: { show: false },
      itemStyle: { borderColor: palette.surface, borderWidth: 1, color: palette.bgMute },
      yearLabel: { show: false },
      monthLabel: { color: palette.textSoft, fontSize: 11 },
      dayLabel: {
        color: palette.textSoft,
        fontSize: 10,
        firstDay: 1,
        nameMap: ['日', '一', '二', '三', '四', '五', '六'],
      },
    },
    series: {
      type: 'heatmap',
      coordinateSystem: 'calendar',
      data: points.length ? points : [[end, 0]],
    },
  };
}

type EChartsInstance = ReturnType<EChartsLite['init']>;

let pie: EChartsInstance | null = null;
let bar: EChartsInstance | null = null;
let heat: EChartsInstance | null = null;
let ro: ResizeObserver | null = null;
let themeMo: MutationObserver | null = null;

function ensureChart(
  el: HTMLElement | null,
  inst: EChartsInstance | null,
  getOpt: () => unknown,
): EChartsInstance | null {
  if (!el || !echarts) return inst;
  let chart = inst;
  if (!chart || chart.isDisposed()) {
    chart = echarts.init(el);
  }
  chart.setOption(getOpt() as Parameters<EChartsInstance['setOption']>[0], true);
  chart.resize();
  return chart;
}

async function renderAll() {
  await loadECharts();
  pie = ensureChart(pieRef.value, pie, getOption);
  bar = ensureChart(barRef.value, bar, getBarOption);
  heat = ensureChart(heatRef.value, heat, getHeatmapOption);
}

function resizeAll() {
  pie?.resize();
  bar?.resize();
  heat?.resize();
}

function onWinResize() {
  resizeAll();
}

onMounted(() => {
  void renderAll().then(() => {
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => resizeAll());
      if (pieRef.value) ro.observe(pieRef.value);
      if (barRef.value) ro.observe(barRef.value);
      if (heatRef.value) ro.observe(heatRef.value);
    }
  });
  window.addEventListener('resize', onWinResize);

  themeMo = new MutationObserver(() => {
    void renderAll();
  });
  themeMo.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
});

onActivated(() => {
  nextTick(() => {
    void renderAll().then(() => resizeAll());
  });
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWinResize);
  ro?.disconnect();
  ro = null;
  themeMo?.disconnect();
  themeMo = null;
  pie?.dispose();
  bar?.dispose();
  heat?.dispose();
  pie = bar = heat = null;
});

watch(
  () => [totalLearned.value, dueCount.value, totalQuestions.value, statsFingerprint.value],
  () => {
    void renderAll();
  },
);
</script>

<template>
  <div class="home">
    <section class="hero card">
      <h1>👋 欢迎来到 KAP</h1>
      <p class="subtitle">Vue 前端工程师知识图谱 · 自查 · 面试 · 复习一站式</p>
      <div class="quick">
        <RouterLink class="btn btn-primary" to="/learn">
          <AppIcon name="read" /> 顺序学习
        </RouterLink>
        <RouterLink class="btn" to="/plan"> <AppIcon name="calendar" /> 学习计划 </RouterLink>
        <RouterLink class="btn" to="/quiz"> <AppIcon name="experiment" /> 抽题模拟 </RouterLink>
        <RouterLink class="btn" to="/exam"> <AppIcon name="trophy" /> 临考模式 </RouterLink>
        <RouterLink class="btn" to="/interview-guide">
          <AppIcon name="fileText" /> 面试技巧
        </RouterLink>
        <RouterLink class="btn" to="/review">
          <AppIcon name="reload" /> 待复习
          <b v-if="dueCount">{{ dueCount }}</b>
        </RouterLink>
        <RouterLink class="btn" to="/graph"> <AppIcon name="deployment" /> 关系图谱 </RouterLink>
      </div>
      <div class="kpi">
        <div>
          <div class="kpi-num">{{ categories.length }}</div>
          <div class="kpi-lbl">分类</div>
        </div>
        <div>
          <div class="kpi-num">{{ totalQuestions }}</div>
          <div class="kpi-lbl">题目</div>
        </div>
        <div>
          <div class="kpi-num">{{ totalLearned }}</div>
          <div class="kpi-lbl">已学习</div>
        </div>
        <div>
          <div class="kpi-num">{{ dueCount }}</div>
          <div class="kpi-lbl">今日待复习</div>
        </div>
      </div>
    </section>

    <section class="card continue-card">
      <div>
        <p class="eyebrow">今日下一步</p>
        <h2>{{ continueTarget.question?.title || '开始学习' }}</h2>
        <p class="muted">{{ continueTarget.reason }}</p>
      </div>
      <div class="continue-actions">
        <RouterLink
          v-if="continueTarget.question"
          class="btn btn-primary"
          :to="questionUrl(continueTarget.question)"
        >
          <AppIcon name="play" /> 继续学习
        </RouterLink>
        <RouterLink class="btn" to="/weak-training">
          <AppIcon name="warning" /> 弱点专项
          <b v-if="weakTrainingPreview.length">{{ weakTrainingPreview.length }}</b>
        </RouterLink>
        <RouterLink class="btn" to="/wrong-review">
          <AppIcon name="reload" /> 错因复盘
          <b v-if="wrongCount">{{ wrongCount }}</b>
        </RouterLink>
        <RouterLink class="btn" to="/cheatsheet">
          <AppIcon name="fileText" /> 面试前小抄
          <b>{{ preInterviewPreview.length }}</b>
        </RouterLink>
      </div>
    </section>

    <section v-if="hasContentUpdates" class="card update-card">
      <div>
        <h2><AppIcon name="thunderbolt" /> 题库有新内容</h2>
        <p class="muted">
          当前题库共 {{ allTotalQuestions }} 道题。已为你保留新增 /
          更新提示入口，复习前建议先看学习计划和关系图谱。
        </p>
      </div>
      <button class="btn btn-primary" @click="updates.markSeen(contentFingerprint)">
        标记已读
      </button>
    </section>

    <section class="card weekly-report">
      <div class="section-head">
        <h2><AppIcon name="pieChart" /> 本周学习报告</h2>
        <RouterLink class="btn btn-ghost" to="/plan">生成今日计划</RouterLink>
      </div>
      <div class="report-grid">
        <div>
          <b>{{ weeklyReport.weeklyDone }}</b>
          <span>本周学习</span>
        </div>
        <div>
          <b>{{ weeklyReport.activeDays }}</b>
          <span>活跃天数</span>
        </div>
        <div>
          <b>{{ weeklyReport.reviewCount }}</b>
          <span>需复习 / 模糊</span>
        </div>
        <div>
          <b>{{ weeklyReport.highFrequencyRate }}%</b>
          <span>高频题覆盖</span>
        </div>
      </div>
      <p class="muted">
        建议下一步：优先复盘「{{ weeklyReport.weakTitle }}」，再进入临考模式抽 10 道高频题。
      </p>
    </section>

    <section class="grid">
      <div class="card chart">
        <h3>总进度</h3>
        <div ref="pieRef" class="chart-box" />
      </div>
      <div class="card chart wide">
        <h3>分类进度</h3>
        <div ref="barRef" class="chart-box" />
      </div>
    </section>

    <section class="card chart heat-wrap">
      <h3>复习热力图</h3>
      <div ref="heatRef" class="chart-box heat" />
    </section>

    <section class="grid bottom-grid">
      <div class="card readiness">
        <h3><AppIcon name="trophy" /> 面试就绪度</h3>
        <div class="ring-wrap">
          <div class="ring">
            <svg viewBox="0 0 120 120" class="ring-svg">
              <circle cx="60" cy="60" r="52" class="ring-bg" />
              <circle
                cx="60"
                cy="60"
                r="52"
                class="ring-fg"
                :stroke-dasharray="`${(readiness.score / 100) * 326.7} 326.7`"
              />
            </svg>
            <div class="ring-text">
              <div class="score">{{ readiness.score }}</div>
              <div class="level">{{ readiness.level }}</div>
            </div>
          </div>
          <ul class="readiness-tips">
            <li>
              已掌握 / 总题：<b>{{ masteredCount }}</b> / {{ totalQuestions }}
            </li>
            <li>
              收藏：<b>{{ starredCount }}</b> · 待复习：<b>{{ dueCount }}</b>
            </li>
          </ul>
        </div>
      </div>

      <div class="card rhythm">
        <h3><AppIcon name="thunderbolt" /> 学习节奏（近 14 天）</h3>
        <div class="rhythm-summary">
          <span
            >总学习 <b>{{ rhythmTotal }}</b> 次</span
          >
          <span
            >活跃天数 <b>{{ rhythmActiveDays }}</b> / 14</span
          >
        </div>
        <div class="rhythm-bars" role="img" :aria-label="`近14天每日学习次数`">
          <div
            v-for="d in rhythm14"
            :key="d.date"
            class="rhythm-bar"
            :title="`${d.date}：${d.count} 次`"
          >
            <div
              class="bar"
              :style="{ height: `${(d.count / rhythmMax) * 100}%` }"
              :class="{ empty: d.count === 0 }"
            />
            <div class="day">{{ d.date.slice(3) }}</div>
          </div>
        </div>
      </div>

      <div class="card weak">
        <h3><AppIcon name="warning" /> 薄弱分类 TOP 5</h3>
        <ul v-if="weakRanking.length" class="weak-list">
          <li v-for="w in weakRanking" :key="w.id">
            <span class="weak-icon">{{ w.icon }}</span>
            <RouterLink :to="`/c/${w.id}`" class="weak-title">{{ w.title }}</RouterLink>
            <div class="weak-bar">
              <div class="weak-bar-fg" :style="{ width: `${w.masteredRate * 100}%` }" />
            </div>
            <span class="weak-rate">{{ Math.round(w.masteredRate * 100) }}%</span>
          </li>
        </ul>
        <p v-else class="muted small">数据不足，多做几道题后这里会显示薄弱分类。</p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 18px;
  max-width: 1100px;
  margin: 0 auto;
}
.hero {
  padding: 24px 28px;
}
.quick .btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  min-height: 40px;
  justify-content: center;
}
.hero h1 {
  font-size: 28px;
  font-weight: 700;
  background: linear-gradient(90deg, var(--c-primary), #6366f1);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.subtitle {
  color: var(--c-text-soft);
  margin-top: 4px;
}
.quick {
  margin-top: 14px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px;
}
.kpi {
  margin-top: 18px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.kpi > div {
  padding: 14px 16px;
  background: var(--c-bg-soft);
  border-radius: var(--radius);
  text-align: center;
}
.kpi-num {
  font-size: 24px;
  font-weight: 700;
  color: var(--c-primary);
}
.kpi-lbl {
  font-size: 12px;
  color: var(--c-text-mute);
}
.continue-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 18px;
  border-color: color-mix(in srgb, var(--c-primary) 35%, var(--c-border));
}
.continue-card h2 {
  margin: 2px 0 6px;
  font-size: 18px;
}
.eyebrow {
  margin: 0;
  color: var(--c-primary);
  font-size: 12px;
  font-weight: 700;
}
.continue-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}
.continue-actions .btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.update-card,
.weekly-report {
  padding: 16px 18px;
}
.update-card,
.section-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: center;
}
.update-card h2,
.section-head h2 {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 6px;
  font-size: 18px;
}
.report-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin: 12px 0;
}
.report-grid > div {
  display: grid;
  gap: 4px;
  padding: 12px;
  border-radius: var(--radius);
  background: var(--c-bg-soft);
}
.report-grid b {
  color: var(--c-primary);
  font-size: 22px;
}
.report-grid span {
  color: var(--c-text-mute);
  font-size: 12px;
}
.grid {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 18px;
}
.chart {
  padding: 16px;
}
.chart h3 {
  margin: 0 0 8px;
  font-size: 14px;
  color: var(--c-text-soft);
}
.chart-box {
  width: 100%;
  height: 280px;
  min-height: 200px;
}
.chart-box.heat {
  height: 200px;
  min-width: 880px;
}
.chart.heat-wrap {
  overflow-x: auto;
}
@media (max-width: 768px) {
  .hero {
    padding: 20px 16px;
  }
  .hero h1 {
    font-size: 24px;
  }
  .grid {
    grid-template-columns: 1fr;
  }
  .kpi {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  .quick .btn {
    width: 100%;
    justify-content: center;
    min-height: 40px;
    text-align: center;
  }
  .update-card,
  .continue-card,
  .section-head {
    align-items: stretch;
    flex-direction: column;
  }
  .continue-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    justify-content: stretch;
  }
  .continue-actions .btn {
    justify-content: center;
  }
  .report-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .chart-box {
    height: 240px;
  }
  .chart-box.heat {
    height: 170px;
    min-width: 0;
  }
  .chart.heat-wrap {
    overflow: hidden;
  }
}

.bottom-grid {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.4fr) minmax(0, 1.4fr);
  align-items: stretch;
}
.bottom-grid > .card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
  padding: 16px 18px;
}
.bottom-grid > .card > h3 {
  margin: 0;
  font-size: 14px;
  color: var(--c-text-soft);
  display: flex;
  align-items: center;
  gap: 6px;
}
@media (max-width: 900px) {
  .bottom-grid {
    grid-template-columns: 1fr;
  }
}

.readiness {
  align-items: stretch;
}
.readiness .ring-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  flex: 1;
  justify-content: center;
}
.ring {
  position: relative;
  width: 140px;
  height: 140px;
}
.ring-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}
.ring-bg {
  fill: none;
  stroke: var(--c-bg-mute);
  stroke-width: 12;
}
.ring-fg {
  fill: none;
  stroke: var(--c-primary);
  stroke-width: 12;
  stroke-linecap: round;
  transition: stroke-dasharray 0.6s ease;
}
.ring-text {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.ring-text .score {
  font-size: 30px;
  font-weight: 700;
  color: var(--c-primary);
}
.ring-text .level {
  font-size: 12px;
  color: var(--c-text-mute);
}
.readiness-tips {
  list-style: none;
  padding: 0;
  margin: 0;
  font-size: 12px;
  color: var(--c-text-soft);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rhythm-summary {
  font-size: 12px;
  color: var(--c-text-soft);
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
}
.rhythm-bars {
  display: grid;
  grid-template-columns: repeat(14, minmax(0, 1fr));
  gap: 6px;
  align-items: end;
  height: 110px;
  flex: 1;
}
.rhythm-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  height: 100%;
  min-width: 0;
  gap: 4px;
}
.rhythm-bar .bar {
  width: 70%;
  max-width: 14px;
  background: linear-gradient(180deg, var(--c-primary), #6366f1);
  border-radius: 3px;
  min-height: 2px;
  transition: height 0.3s;
}
.rhythm-bar .bar.empty {
  background: var(--c-bg-mute);
  height: 4% !important;
  opacity: 0.5;
}
.rhythm-bar .day {
  font-size: 10px;
  line-height: 1.2;
  color: var(--c-text-mute);
  font-family: var(--font-mono, monospace);
  white-space: nowrap;
}

.muted.small {
  font-size: 12px;
  color: var(--c-text-mute);
}
.weak-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.weak-list li {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) minmax(60px, 90px) 44px;
  align-items: center;
  gap: 10px;
  padding: 8px 2px;
  border-bottom: 1px dashed var(--c-border);
}
.weak-list li:last-child {
  border-bottom: 0;
}
.weak > .muted.small {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  margin: 0;
  padding: 24px 8px;
  border: 1px dashed var(--c-border);
  border-radius: 8px;
  color: var(--c-text-mute);
  background: var(--c-bg-mute);
}
.weak-icon {
  font-size: 16px;
}
.weak-title {
  color: var(--c-text);
  text-decoration: none;
  font-size: 13px;
}
.weak-title:hover {
  color: var(--c-primary);
}
.weak-bar {
  height: 8px;
  background: var(--c-bg-mute);
  border-radius: 999px;
  overflow: hidden;
}
.weak-bar-fg {
  height: 100%;
  background: linear-gradient(90deg, #f59e0b, var(--c-primary));
  transition: width 0.4s;
}
.weak-rate {
  font-size: 12px;
  font-family: monospace;
  color: var(--c-text-soft);
  text-align: right;
}
@media (max-width: 480px) {
  .home {
    gap: 14px;
  }
  .quick {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .quick .btn {
    padding-inline: 8px;
    font-size: 13px;
  }
  .kpi > div {
    padding: 12px 10px;
  }
  .weak-list li {
    grid-template-columns: 22px minmax(0, 1fr) 40px;
    gap: 8px;
  }
  .weak-bar {
    grid-column: 2 / span 2;
    width: 100%;
  }
}
</style>
