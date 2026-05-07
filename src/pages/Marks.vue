<script setup lang="ts">
import { computed, ref } from 'vue';
import { useContent } from '@/composables/useContent';
import { useMarksStore } from '@/stores/marks';
import { useProgressStore } from '@/stores/progress';
import QuestionCard from '@/components/question/QuestionCard.vue';
import AppIcon from '@/components/icon/AppIcon.vue';

const { allQuestions } = useContent();
const marks = useMarksStore();
const progress = useProgressStore();

type Tab = 'starred' | 'skipped';
const tab = ref<Tab>('starred');
const filterStatus = ref<'all' | 'todo' | 'review' | 'mastered'>('all');
const keyword = ref('');

const list = computed(() => {
  const base = allQuestions.value.filter((q) =>
    tab.value === 'starred' ? marks.isStarred(q.id) : marks.isSkipped(q.id),
  );
  let filtered = base;
  if (filterStatus.value !== 'all') {
    filtered = filtered.filter((q) => {
      const s = progress.get(q.id).status;
      if (filterStatus.value === 'todo') return s === 'todo';
      if (filterStatus.value === 'mastered') return s === 'mastered';
      return s === 'review' || s === 'fuzzy';
    });
  }
  if (keyword.value.trim()) {
    const k = keyword.value.trim().toLowerCase();
    filtered = filtered.filter(
      (q) =>
        q.title.toLowerCase().includes(k) ||
        q.tags.some((t) => t.toLowerCase().includes(k)),
    );
  }
  return filtered;
});

function clearAllMarks() {
  if (tab.value === 'starred') {
    if (!confirm(`确认取消全部 ${marks.starredCount} 道收藏？`)) return;
    Object.keys(marks.state.starred).forEach((id) => marks.toggleStar(id));
  } else {
    if (!confirm(`确认恢复全部 ${marks.skippedCount} 道跳过的题？`)) return;
    Object.keys(marks.state.skipped).forEach((id) => marks.toggleSkip(id));
  }
}
</script>

<template>
  <div class="marks">
    <header class="head">
      <h1><AppIcon name="star" /> 收藏 & 跳过</h1>
      <p class="muted">把感觉重要的题目标星集中复习；把已经会的或不打算考的题目跳过，让列表更聚焦。</p>
    </header>

    <div class="tabs">
      <button class="tab" :class="{ active: tab === 'starred' }" @click="tab = 'starred'">
        <AppIcon name="star" /> 收藏（{{ marks.starredCount }}）
      </button>
      <button class="tab" :class="{ active: tab === 'skipped' }" @click="tab = 'skipped'">
        <AppIcon name="skip" /> 跳过（{{ marks.skippedCount }}）
      </button>
    </div>

    <div class="filters">
      <select v-model="filterStatus">
        <option value="all">全部状态</option>
        <option value="todo">未做</option>
        <option value="review">需复习 / 模糊</option>
        <option value="mastered">已掌握</option>
      </select>
      <input v-model="keyword" placeholder="按标题 / 标签搜索..." />
      <button v-if="list.length" class="btn btn-ghost" @click="clearAllMarks">
        <AppIcon name="clear" />
        {{ tab === 'starred' ? '清空收藏' : '恢复全部跳过' }}
      </button>
    </div>

    <div v-if="!list.length" class="empty card">
      <p v-if="tab === 'starred'">还没有收藏的题目。在题卡右上方点击 ⭐ 加入收藏。</p>
      <p v-else>还没有跳过的题目。题卡右上方有 🚫 按钮可标记跳过。</p>
    </div>

    <ul v-else class="qlist">
      <li v-for="(q, i) in list" :key="q.id">
        <QuestionCard :question="q" :index="i + 1" :default-open="false" />
      </li>
    </ul>
  </div>
</template>

<style scoped>
.marks {
  max-width: 900px;
  margin: 0 auto;
}
.head h1 {
  font-size: 22px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.muted {
  color: var(--c-text-mute);
  font-size: 13px;
}
.tabs {
  display: flex;
  gap: 6px;
  margin-top: 14px;
  border-bottom: 1px solid var(--c-border);
}
.tab {
  padding: 8px 16px;
  border: 0;
  background: transparent;
  color: var(--c-text-soft);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.tab.active {
  color: var(--c-primary);
  border-bottom-color: var(--c-primary);
  font-weight: 600;
}
.filters {
  display: flex;
  gap: 8px;
  margin: 12px 0;
  flex-wrap: wrap;
}
.filters select,
.filters input {
  padding: 6px 10px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  background: var(--c-surface);
  color: var(--c-text);
}
.filters input {
  flex: 1;
  min-width: 200px;
}
.empty {
  padding: 32px;
  text-align: center;
  color: var(--c-text-mute);
}
.qlist {
  list-style: none;
  padding: 0;
  margin: 0;
}
</style>
