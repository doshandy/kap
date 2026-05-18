<script setup lang="ts">
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useContent } from '@/composables/useContent';
import AppIcon from '@/components/icon/AppIcon.vue';

const { categories, allQuestions, questionMap } = useContent();
const selectedCategory = ref('all');
const keyword = ref('');

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
  const out: { from: string; to: string; type: '相关' | '追问' | '原题' }[] = [];
  for (const q of visibleQuestions.value) {
    for (const id of q.relatedQuestionIds || []) {
      if (visibleIds.value.has(id)) out.push({ from: q.id, to: id, type: '相关' });
    }
    for (const id of q.followupQuestionIds || []) {
      if (visibleIds.value.has(id)) out.push({ from: q.id, to: id, type: '追问' });
    }
    if (q.parentId && visibleIds.value.has(q.parentId))
      out.push({ from: q.id, to: q.parentId, type: '原题' });
  }
  return out.slice(0, 260);
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

function titleOf(id: string): string {
  return questionMap.get(id)?.title || id;
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
      <span class="muted">{{ visibleQuestions.length }} 个节点 / {{ edges.length }} 条边</span>
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
            v-for="edge in edges"
            :key="`${edge.from}-${edge.to}-${edge.type}`"
            class="edge"
            :to="`/q/${edge.to}`"
          >
            <span class="badge">{{ edge.type }}</span>
            <span>{{ titleOf(edge.from) }}</span>
            <AppIcon name="arrowRight" />
            <span>{{ titleOf(edge.to) }}</span>
          </RouterLink>
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
  gap: 4px;
}
.edge {
  border: 1px solid var(--c-border);
  overflow-wrap: anywhere;
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
