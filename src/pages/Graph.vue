<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink } from 'vue-router';
import { useContent } from '@/composables/useContent';
import AppIcon from '@/components/icon/AppIcon.vue';

type EdgeType = '相关' | '追问' | '原题';
interface RelationEdge {
  from: string;
  to: string;
  type: EdgeType;
}

const EDGE_PAGE_SIZE = 80;
const { categories, allQuestions, questionMap } = useContent();
const selectedCategory = ref('all');
const selectedEdgeType = ref<'all' | EdgeType>('all');
const keyword = ref('');
const edgeLimit = ref(EDGE_PAGE_SIZE);

const visibleQuestions = computed(() => {
  const k = keyword.value.trim().toLowerCase();
  return allQuestions.value
    .filter((q) => selectedCategory.value === 'all' || q.categoryId === selectedCategory.value)
    .filter(
      (q) =>
        !k ||
        q.title.toLowerCase().includes(k) ||
        q.tags.some((tag) => tag.toLowerCase().includes(k)),
    )
    .slice(0, 160);
});

const visibleIds = computed(() => new Set(visibleQuestions.value.map((q) => q.id)));

const edges = computed(() => {
  const out: RelationEdge[] = [];
  const seen = new Set<string>();
  const pushEdge = (from: string, to: string, type: EdgeType) => {
    const key = `${type}:${from}->${to}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ from, to, type });
  };
  for (const q of visibleQuestions.value) {
    for (const id of q.relatedQuestionIds || []) {
      if (visibleIds.value.has(id)) pushEdge(q.id, id, '相关');
    }
    for (const id of q.followupQuestionIds || []) {
      if (visibleIds.value.has(id)) pushEdge(q.id, id, '追问');
    }
    if (q.parentId && visibleIds.value.has(q.parentId)) pushEdge(q.id, q.parentId, '原题');
  }
  return out.slice(0, 600);
});

const hotNodes = computed(() =>
  visibleQuestions.value
    .map((q) => ({
      question: q,
      degree: edges.value.filter((edge) => edge.from === q.id || edge.to === q.id).length,
    }))
    .sort((a, b) => b.degree - a.degree)
    .slice(0, 30),
);

const filteredEdges = computed(() =>
  selectedEdgeType.value === 'all'
    ? edges.value
    : edges.value.filter((edge) => edge.type === selectedEdgeType.value),
);

const visibleEdges = computed(() => filteredEdges.value.slice(0, edgeLimit.value));

const hasMoreEdges = computed(() => visibleEdges.value.length < filteredEdges.value.length);

watch([selectedCategory, keyword, selectedEdgeType], () => {
  edgeLimit.value = EDGE_PAGE_SIZE;
});

function titleOf(id: string): string {
  return questionMap.get(id)?.title || id;
}

function shortTitle(id: string): string {
  const title = titleOf(id);
  return title.length > 34 ? `${title.slice(0, 34)}…` : title;
}

function edgeBadgeClass(type: EdgeType): string {
  if (type === '追问') return 'badge-followup';
  if (type === '原题') return 'badge-parent';
  return 'badge-related';
}

function loadMoreEdges(): void {
  edgeLimit.value += EDGE_PAGE_SIZE;
}
</script>

<template>
  <div class="graph-page">
    <header class="head">
      <h1><AppIcon name="deployment" /> 题目关系图谱</h1>
      <p class="muted">
        把相关题、追问题和原题关系放在一起看，适合按知识块复盘，而不是只线性刷题。
      </p>
    </header>

    <section class="card toolbar">
      <select v-model="selectedCategory">
        <option value="all">全部分类</option>
        <option v-for="category in categories" :key="category.id" :value="category.id">
          {{ category.icon }} {{ category.title }}
        </option>
      </select>
      <input v-model="keyword" placeholder="搜索题目或标签..." />
      <div class="edge-filters">
        <button
          class="edge-filter"
          :class="{ active: selectedEdgeType === 'all' }"
          @click="selectedEdgeType = 'all'"
        >
          全部关系
        </button>
        <button
          class="edge-filter"
          :class="{ active: selectedEdgeType === '追问' }"
          @click="selectedEdgeType = '追问'"
        >
          追问
        </button>
        <button
          class="edge-filter"
          :class="{ active: selectedEdgeType === '原题' }"
          @click="selectedEdgeType = '原题'"
        >
          原题
        </button>
        <button
          class="edge-filter"
          :class="{ active: selectedEdgeType === '相关' }"
          @click="selectedEdgeType = '相关'"
        >
          相关
        </button>
      </div>
      <span class="muted">
        {{ visibleQuestions.length }} 个节点 / {{ filteredEdges.length }} 条边（展示
        {{ visibleEdges.length }}）
      </span>
    </section>

    <section class="grid">
      <article class="card panel">
        <h2>高连接题目</h2>
        <RouterLink
          v-for="item in hotNodes"
          :key="item.question.id"
          class="node"
          :to="`/q/${item.question.categoryId}/${item.question.slug}`"
        >
          <span>{{ item.question.title }}</span>
          <b>{{ item.degree }}</b>
        </RouterLink>
      </article>

      <article class="card panel">
        <h2>关系边</h2>
        <div class="edge-list">
          <RouterLink
            v-for="edge in visibleEdges"
            :key="`${edge.from}-${edge.to}-${edge.type}`"
            class="edge"
            :to="`/q/${edge.to}`"
          >
            <span class="badge" :class="edgeBadgeClass(edge.type)">{{ edge.type }}</span>
            <span class="edge-title" :title="titleOf(edge.from)">{{ shortTitle(edge.from) }}</span>
            <AppIcon name="arrowRight" />
            <span class="edge-title" :title="titleOf(edge.to)">{{ shortTitle(edge.to) }}</span>
          </RouterLink>
          <p v-if="!filteredEdges.length" class="muted edge-empty">当前筛选下暂无关系边。</p>
          <button v-else-if="hasMoreEdges" class="btn btn-ghost load-more" @click="loadMoreEdges">
            加载更多关系（+{{
              Math.min(EDGE_PAGE_SIZE, filteredEdges.length - visibleEdges.length)
            }}）
          </button>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.graph-page {
  max-width: 1180px;
  margin: 0 auto;
}
.head h1 {
  display: flex;
  align-items: center;
  gap: 8px;
}
.muted {
  color: var(--c-text-mute);
  font-size: 13px;
}
.toolbar {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 14px;
  margin-bottom: 14px;
  flex-wrap: wrap;
}
.edge-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.edge-filter {
  border: 1px solid var(--c-border);
  border-radius: 999px;
  padding: 6px 10px;
  background: var(--c-surface);
  color: var(--c-text-soft);
  font-size: 12px;
}
.edge-filter.active {
  border-color: var(--c-primary);
  color: var(--c-primary);
  background: color-mix(in srgb, var(--c-primary) 10%, transparent);
}
.toolbar select,
.toolbar input {
  padding: 8px 10px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  background: var(--c-surface);
  color: var(--c-text);
}
.toolbar input {
  flex: 1;
  min-width: 220px;
}
.grid {
  display: grid;
  grid-template-columns: minmax(260px, 360px) 1fr;
  gap: 14px;
}
.panel {
  padding: 16px;
}
.panel h2 {
  margin: 0 0 12px;
  font-size: 18px;
}
.node,
.edge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  border-radius: var(--radius);
  color: inherit;
  text-decoration: none;
}
.node {
  justify-content: space-between;
}
.node b {
  color: var(--c-primary);
}
.edge-list {
  display: grid;
  gap: 6px;
  max-height: 580px;
  overflow: auto;
  padding-right: 4px;
}
.edge {
  border: 1px solid var(--c-border);
  overflow: hidden;
}
.edge-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.node:hover,
.edge:hover {
  background: var(--c-bg-soft);
}
.badge {
  flex: 0 0 auto;
  padding: 2px 6px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--c-primary) 12%, transparent);
  color: var(--c-primary);
  font-size: 12px;
}
.badge-followup {
  background: rgba(139, 92, 246, 0.18);
  color: #7c3aed;
}
.badge-parent {
  background: rgba(245, 158, 11, 0.18);
  color: #b45309;
}
.badge-related {
  background: color-mix(in srgb, var(--c-primary) 12%, transparent);
  color: var(--c-primary);
}
.edge-empty {
  padding: 12px;
}
.load-more {
  justify-content: center;
  margin-top: 4px;
}
@media (max-width: 860px) {
  .grid {
    grid-template-columns: 1fr;
  }
  .toolbar {
    display: grid;
  }
  .toolbar input {
    min-width: 0;
  }
}
</style>
