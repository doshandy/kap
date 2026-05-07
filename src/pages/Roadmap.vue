<script setup lang="ts">
import { ref } from 'vue';
import { useContent } from '@/composables/useContent';
import AppIcon from '@/components/icon/AppIcon.vue';

const { categories } = useContent();

interface Path {
  id: string;
  title: string;
  desc: string;
  ordering: string[];
}

const paths: Path[] = [
  {
    id: 'urgent',
    title: '🔥 临阵磨枪（一周冲刺面试）',
    desc: '主攻高频面试题与工程化，跳过深水区，快速覆盖最常被考的内容。',
    ordering: [
      '21-interview-special',
      '01-javascript',
      '03-vue',
      '08-performance',
      '06-network',
      '07-engineering',
    ],
  },
  {
    id: 'systematic',
    title: '🌱 系统复习（晋升 / 跳槽）',
    desc: '完整覆盖知识图谱，建议 4-8 周完成。',
    ordering: categories.value.map((c) => c.id),
  },
  {
    id: 'research',
    title: '🚀 深度研究（研究型）',
    desc: '聚焦底层、架构、AI 与跨端等深水区。',
    ordering: [
      '03-vue',
      '05-browser',
      '10-architecture',
      '17-build-publish',
      '11-ai-frontend',
      '18-crossplatform',
      '19-visualization',
    ],
  },
];

const active = ref<string>('systematic');

function catTitle(id: string) {
  return categories.value.find((c) => c.id === id)?.title || id;
}
function catIcon(id: string) {
  return categories.value.find((c) => c.id === id)?.icon || '📘';
}
function catCount(id: string) {
  return categories.value.find((c) => c.id === id)?.questions.length || 0;
}
</script>

<template>
  <div class="rm">
    <header>
      <h1><AppIcon name="compass" /> 学习路线图</h1>
      <p class="muted">三种典型路径，按需切换。每条路径会按推荐顺序列出分类。</p>
    </header>
    <div class="tabs">
      <button
        v-for="p in paths"
        :key="p.id"
        class="tab"
        :class="{ active: active === p.id }"
        @click="active = p.id"
      >
        {{ p.title }}
      </button>
    </div>
    <p class="desc">
      {{ paths.find((p) => p.id === active)?.desc }}
    </p>
    <div class="cta">
      <RouterLink to="/learn" class="cta-btn">
        <AppIcon name="read" /> 从第 1 题开始顺序学习
      </RouterLink>
      <RouterLink to="/quiz" class="cta-btn ghost">
        <AppIcon name="experiment" /> 直接抽题模拟
      </RouterLink>
    </div>
    <ol v-if="(paths.find((p) => p.id === active)?.ordering || []).length" class="path">
      <li
        v-for="(c, i) in paths.find((p) => p.id === active)?.ordering || []"
        :key="c"
      >
        <span class="step">{{ i + 1 }}</span>
        <RouterLink :to="`/c/${c}`" class="link">
          {{ catIcon(c) }} {{ catTitle(c) }}
        </RouterLink>
        <span class="count">{{ catCount(c) }} 题</span>
      </li>
    </ol>
    <div v-else class="empty">题库尚未加载完成，请稍候或刷新页面重试。</div>
  </div>
</template>

<style scoped>
.rm {
  max-width: 800px;
  margin: 0 auto;
}
header h1 {
  font-size: 22px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.cta-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.muted {
  color: var(--c-text-mute);
  font-size: 13px;
  margin-top: 4px;
}
.tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin: 16px 0 6px;
}
.tab {
  padding: 8px 14px;
  border-radius: var(--radius);
  background: var(--c-bg-mute);
  font-size: 13px;
}
.tab.active {
  background: var(--c-primary);
  color: #fff;
}
.desc {
  color: var(--c-text-soft);
  margin: 8px 0 16px;
}
.path {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.path li {
  display: grid;
  grid-template-columns: 30px 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
}
.step {
  display: inline-flex;
  width: 26px;
  height: 26px;
  align-items: center;
  justify-content: center;
  background: var(--c-primary-soft);
  color: var(--c-primary);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}
.count {
  font-size: 12px;
  color: var(--c-text-mute);
}
.link {
  color: var(--c-text);
  text-decoration: none;
}
.link:hover {
  color: var(--c-primary);
}
.cta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 0 0 16px;
}
.cta-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  border-radius: var(--radius);
  background: var(--c-primary);
  color: #fff;
  font-size: 13px;
  text-decoration: none;
  font-weight: 600;
}
.cta-btn:hover {
  filter: brightness(1.05);
}
.cta-btn.ghost {
  background: var(--c-bg-mute);
  color: var(--c-text);
  font-weight: 500;
}
.empty {
  padding: 32px;
  text-align: center;
  color: var(--c-text-mute);
  background: var(--c-surface);
  border: 1px dashed var(--c-border);
  border-radius: var(--radius);
}
</style>
