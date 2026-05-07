<script setup lang="ts">
import { computed, nextTick, onActivated, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import * as echarts from 'echarts/core';
import { PieChart, BarChart, HeatmapChart } from 'echarts/charts';
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  VisualMapComponent,
  CalendarComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { useContent } from '@/composables/useContent';
import { useProgressStore } from '@/stores/progress';
import { useReviewStore } from '@/stores/review';
import { useMarksStore } from '@/stores/marks';
import AppIcon from '@/components/icon/AppIcon.vue';

echarts.use([
  PieChart,
  BarChart,
  HeatmapChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  VisualMapComponent,
  CalendarComponent,
  CanvasRenderer,
]);

const { categories, allQuestions } = useContent();
const progress = useProgressStore();
const review = useReviewStore();
const marks = useMarksStore();

const totalQuestions = computed(() => allQuestions.value.length);
const totalDone = computed(() => progress.totalDone);
const dueCount = computed(() => review.dueIds.length);

const stats = computed(() => {
  const map: Record<string, string[]> = {};
  for (const c of categories.value) map[c.id] = c.questions.map((q) => q.id);
  return progress.statsByCategory(map);
});

/**
 * 薄弱分类排行：mastered/total 越低越靠前；至少做过 3 题再算分
 */
const weakRanking = computed(() => {
  return categories.value
    .map((c) => {
      const s = stats.value[c.id] ?? { total: c.questions.length, done: 0, mastered: 0, review: 0 };
      const masteredRate = s.total ? s.mastered / s.total : 0;
      const reviewRate = s.total ? s.review / s.total : 0;
      const score = masteredRate - reviewRate;
      return { id: c.id, title: c.title, icon: c.icon, ...s, masteredRate, score };
    })
    .filter((x) => x.done >= 3 || x.review > 0)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);
});

/**
 * 最近 14 天每日完成数（节奏曲线）
 */
const rhythm14 = computed(() => {
  const map = progress.heatmap;
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
  const done = totalDone.value;
  const masteredCount = Object.values(progress.state.records).filter(
    (r) => r.status === 'mastered',
  ).length;
  const reviewSet = Object.values(progress.state.records).filter(
    (r) => r.status === 'review' || r.status === 'fuzzy',
  ).length;

  const coverScore = (done / total) * 60;
  const masterScore = (masteredCount / total) * 30;
  const reviewPenalty = Math.min(reviewSet / Math.max(1, done), 0.3) * 10;
  const score = Math.max(0, Math.min(100, Math.round(coverScore + masterScore - reviewPenalty)));

  let level = '准备不足';
  if (score >= 85) level = '随时可面';
  else if (score >= 65) level = '基础扎实';
  else if (score >= 40) level = '查漏补缺';
  else if (score >= 20) level = '入门阶段';
  return { score, level };
});

const starredCount = computed(() => marks.starredCount);

const pieRef = ref<HTMLDivElement | null>(null);
const barRef = ref<HTMLDivElement | null>(null);
const heatRef = ref<HTMLDivElement | null>(null);

function isDark() {
  return document.documentElement.classList.contains('dark');
}

function getOption() {
  const done = totalDone.value;
  const todo = totalQuestions.value - done;
  return {
    tooltip: { trigger: 'item' },
    legend: { bottom: 0 },
    series: [
      {
        type: 'pie',
        radius: ['52%', '74%'],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: isDark() ? '#0b1220' : '#fff', borderWidth: 2 },
        label: {
          show: true,
          position: 'center',
          formatter: () => `{a|${done}}\n{b|/${totalQuestions.value}}`,
          rich: {
            a: { fontSize: 32, fontWeight: 'bold', color: isDark() ? '#e5e7eb' : '#0f172a' },
            b: { fontSize: 14, color: '#94a3b8' },
          },
        },
        data: [
          { value: done, name: '已完成', itemStyle: { color: '#10b981' } },
          { value: todo, name: '未完成', itemStyle: { color: isDark() ? '#1f2937' : '#e2e8f0' } },
        ],
      },
    ],
  };
}

function getBarOption() {
  const data = categories.value.map((c) => ({
    name: c.title,
    total: c.questions.length,
    done: stats.value[c.id]?.done ?? 0,
  }));
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 30, right: 16, top: 30, bottom: 90 },
    xAxis: {
      type: 'category',
      data: data.map((d) => d.name),
      axisLabel: { rotate: 45, fontSize: 10, color: isDark() ? '#cbd5e1' : '#475569' },
    },
    yAxis: { type: 'value' },
    legend: { top: 0 },
    series: [
      {
        type: 'bar',
        name: '总题数',
        data: data.map((d) => d.total),
        itemStyle: { color: isDark() ? '#1f2937' : '#e2e8f0' },
        barGap: '-100%',
      },
      {
        type: 'bar',
        name: '已完成',
        data: data.map((d) => d.done),
        itemStyle: { color: '#0ea5e9' },
      },
    ],
  };
}

function getHeatmapOption() {
  const map = progress.heatmap;
  const points = Object.entries(map).map(([d, v]) => [d, v]);
  const max = Math.max(1, ...points.map((p) => p[1] as number));
  const today = new Date();
  const end = today.toISOString().slice(0, 10);
  const startDate = new Date(today);
  startDate.setMonth(startDate.getMonth() - 11);
  startDate.setDate(1);
  const start = startDate.toISOString().slice(0, 10);
  return {
    tooltip: {
      formatter: (p: { value: [string, number] }) =>
        `${p.value[0]}：${p.value[1] || 0} 题`,
    },
    visualMap: {
      min: 0,
      max,
      orient: 'horizontal',
      left: 'center',
      top: 0,
      itemWidth: 14,
      itemHeight: 12,
      textStyle: { color: isDark() ? '#cbd5e1' : '#475569', fontSize: 11 },
      inRange: { color: ['#e0f2fe', '#0ea5e9', '#1e3a8a'] },
    },
    calendar: {
      top: 50,
      left: 40,
      right: 20,
      bottom: 10,
      range: [start, end],
      cellSize: [16, 16],
      splitLine: { show: false },
      itemStyle: { borderColor: isDark() ? '#0b1220' : '#fff', borderWidth: 1 },
      yearLabel: { show: false },
      monthLabel: { color: isDark() ? '#cbd5e1' : '#475569', fontSize: 11 },
      dayLabel: {
        color: isDark() ? '#cbd5e1' : '#475569',
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

let pie: echarts.ECharts | null = null;
let bar: echarts.ECharts | null = null;
let heat: echarts.ECharts | null = null;
let ro: ResizeObserver | null = null;

function ensureChart(
  el: HTMLElement | null,
  inst: echarts.ECharts | null,
  getOpt: () => unknown,
): echarts.ECharts | null {
  if (!el) return inst;
  let chart = inst;
  if (!chart || chart.isDisposed()) {
    chart = echarts.init(el);
  }
  chart.setOption(getOpt() as Parameters<echarts.ECharts['setOption']>[0], true);
  chart.resize();
  return chart;
}

function renderAll() {
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
  renderAll();
  window.addEventListener('resize', onWinResize);
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => resizeAll());
    if (pieRef.value) ro.observe(pieRef.value);
    if (barRef.value) ro.observe(barRef.value);
    if (heatRef.value) ro.observe(heatRef.value);
  }
});

onActivated(() => {
  nextTick(() => {
    renderAll();
    resizeAll();
  });
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onWinResize);
  ro?.disconnect();
  ro = null;
  pie?.dispose();
  bar?.dispose();
  heat?.dispose();
  pie = bar = heat = null;
});

watch(() => [totalDone.value, dueCount.value, document.documentElement.className], renderAll);
</script>

<template>
  <div class="home">
    <section class="hero card">
      <h1>👋 欢迎来到 KAP</h1>
      <p class="subtitle">Vue 前端工程师知识图谱 · 自查 · 面试 · 复习一站式</p>
      <div class="quick">
        <RouterLink class="btn btn-primary" to="/learn">
          <AppIcon name="read" /> 顺序学习（从第 1 题开始）
        </RouterLink>
        <RouterLink class="btn" to="/quiz">
          <AppIcon name="experiment" /> 抽题模拟
        </RouterLink>
        <RouterLink class="btn" to="/review">
          <AppIcon name="reload" /> 待复习
          <b v-if="dueCount">{{ dueCount }}</b>
        </RouterLink>
        <RouterLink class="btn" to="/roadmap">
          <AppIcon name="compass" /> 学习路线
        </RouterLink>
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
          <div class="kpi-num">{{ totalDone }}</div>
          <div class="kpi-lbl">已完成</div>
        </div>
        <div>
          <div class="kpi-num">{{ dueCount }}</div>
          <div class="kpi-lbl">今日待复习</div>
        </div>
      </div>
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
          <li>已掌握 / 总题：<b>{{ totalDone }}</b> / {{ totalQuestions }}</li>
          <li>收藏：<b>{{ starredCount }}</b> · 待复习：<b>{{ dueCount }}</b></li>
        </ul>
      </div>

      <div class="card rhythm">
        <h3><AppIcon name="thunderbolt" /> 学习节奏（近 14 天）</h3>
        <div class="rhythm-summary">
          <span>总完成 <b>{{ rhythmTotal }}</b> 次</span>
          <span>活跃天数 <b>{{ rhythmActiveDays }}</b> / 14</span>
        </div>
        <div class="rhythm-bars" role="img" :aria-label="`近14天每日完成数`">
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
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
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
  .grid {
    grid-template-columns: 1fr;
  }
  .kpi {
    grid-template-columns: repeat(2, 1fr);
  }
}

.bottom-grid {
  grid-template-columns: 1fr 1.4fr 1.4fr;
}
@media (max-width: 900px) {
  .bottom-grid {
    grid-template-columns: 1fr;
  }
}

.readiness {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.readiness h3 {
  align-self: flex-start;
}
.ring {
  position: relative;
  width: 140px;
  height: 140px;
  margin: 8px 0 4px;
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
  stroke: url(#none);
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
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--c-text-soft);
}
.readiness-tips li {
  margin: 2px 0;
}

.rhythm-summary {
  font-size: 12px;
  color: var(--c-text-soft);
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}
.rhythm-bars {
  display: grid;
  grid-template-columns: repeat(14, 1fr);
  gap: 4px;
  align-items: end;
  height: 100px;
}
.rhythm-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  justify-content: flex-end;
}
.rhythm-bar .bar {
  width: 100%;
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
  margin-top: 4px;
  font-size: 10px;
  color: var(--c-text-mute);
  font-family: monospace;
}

.weak-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.weak-list li {
  display: grid;
  grid-template-columns: 28px 1fr 90px 40px;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px dashed var(--c-border);
}
.weak-list li:last-child { border-bottom: 0; }
.weak-icon { font-size: 16px; }
.weak-title {
  color: var(--c-text);
  text-decoration: none;
  font-size: 13px;
}
.weak-title:hover { color: var(--c-primary); }
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
.muted.small { font-size: 12px; color: var(--c-text-mute); }
</style>
