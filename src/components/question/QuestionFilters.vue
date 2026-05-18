<script setup lang="ts">
import { computed } from 'vue';
import { useFilterStore } from '@/stores/filter';
import type { Difficulty, QuestionStatus } from '@/types/content';

const props = defineProps<{ tags?: string[] }>();
const filter = useFilterStore();

const difficulties: Difficulty[] = ['基础', '进阶', '资深'];
const statuses: { v: QuestionStatus; label: string }[] = [
  { v: 'todo', label: '未做' },
  { v: 'mastered', label: '已掌握' },
  { v: 'fuzzy', label: '模糊' },
  { v: 'review', label: '需复习' },
];

const allTags = computed(() => props.tags || []);
</script>

<template>
  <div class="filter-bar">
    <div class="row">
      <span class="lbl">关键字：</span>
      <input v-model="filter.state.keyword" class="kw" placeholder="标题/标签/答案 模糊搜索" />
      <button v-if="filter.state.keyword" class="btn btn-ghost" @click="filter.state.keyword = ''">
        清除
      </button>
    </div>
    <div class="row">
      <span class="lbl">难度：</span>
      <button
        v-for="d in difficulties"
        :key="d"
        class="chip"
        :class="{ active: filter.state.difficulties.includes(d) }"
        @click="filter.toggleDifficulty(d)"
      >
        {{ d }}
      </button>
    </div>
    <div class="row">
      <span class="lbl">状态：</span>
      <button
        v-for="s in statuses"
        :key="s.v"
        class="chip"
        :class="{ active: filter.state.statuses.includes(s.v) }"
        @click="filter.toggleStatus(s.v)"
      >
        {{ s.label }}
      </button>
    </div>
    <div v-if="allTags.length" class="row tags">
      <span class="lbl">标签：</span>
      <button
        v-for="t in allTags"
        :key="t"
        class="chip"
        :class="{ active: filter.state.tags.includes(t) }"
        @click="filter.toggleTag(t)"
      >
        #{{ t }}
      </button>
    </div>
    <div class="row">
      <button class="btn btn-ghost" @click="filter.reset()">↺ 重置筛选</button>
    </div>
  </div>
</template>

<style scoped>
.filter-bar {
  background: var(--c-bg-soft);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  padding: 10px 14px;
  margin-bottom: 16px;
}
.row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  padding: 4px 0;
}
.lbl {
  font-size: 12px;
  color: var(--c-text-mute);
  min-width: 56px;
}
.kw {
  flex: 1;
  min-width: 200px;
  padding: 6px 10px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  background: var(--c-surface);
  outline: none;
}
.chip {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--c-bg-mute);
  color: var(--c-text-soft);
}
.chip.active {
  background: var(--c-primary);
  color: #fff;
}
.tags {
  max-height: 80px;
  overflow: auto;
}
@media (max-width: 560px) {
  .filter-bar {
    padding: 10px;
  }
  .row {
    align-items: stretch;
    gap: 8px;
  }
  .lbl {
    width: 100%;
    min-width: 0;
  }
  .kw {
    flex-basis: 100%;
    min-width: 0;
  }
  .chip {
    min-height: 34px;
    padding: 5px 12px;
  }
  .tags {
    max-height: 132px;
    -webkit-overflow-scrolling: touch;
  }
}
</style>
