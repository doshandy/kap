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

const totalQuestions = computed(() => allQuestions.value.length);
const totalDone = computed(() => progress.totalDone);
const dueCount = computed(() => review.dueIds.length);

const stats = computed(() => {
  const map: Record<string, string[]> = {};
  for (const c of categories.value) map[c.id] = c.questions.map((q) => q.id);
  return progress.statsByCategory(map);
});

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
  const year = new Date().getFullYear();
  return {
    tooltip: { formatter: (p: any) => `${p.value[0]}：${p.value[1]} 题` },
    visualMap: {
      min: 0,
      max,
      orient: 'horizontal',
      left: 'center',
      top: 0,
      inRange: { color: ['#e0f2fe', '#0ea5e9', '#1e3a8a'] },
    },
    calendar: {
      top: 60,
      left: 40,
      right: 20,
      range: year,
      cellSize: ['auto', 16],
      splitLine: { show: false },
      itemStyle: { borderColor: isDark() ? '#0b1220' : '#fff', borderWidth: 1 },
      yearLabel: { show: false },
      monthLabel: { color: isDark() ? '#cbd5e1' : '#475569', fontSize: 11 },
      dayLabel: { color: isDark() ? '#cbd5e1' : '#475569', fontSize: 10, firstDay: 1 },
    },
    series: { type: 'heatmap', coordinateSystem: 'calendar', data: points },
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
        <RouterLink class="btn btn-primary" to="/learn">📖 顺序学习（从第 1 题开始）</RouterLink>
        <RouterLink class="btn" to="/quiz">🎯 抽题模拟</RouterLink>
        <RouterLink class="btn" to="/review">
          🔁 待复习 <b v-if="dueCount">{{ dueCount }}</b>
        </RouterLink>
        <RouterLink class="btn" to="/roadmap">🗺️ 学习路线</RouterLink>
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
  height: 220px;
  min-width: 760px;
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
</style>
