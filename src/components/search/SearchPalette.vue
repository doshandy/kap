<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useSearch } from '@/composables/useSearch';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>();

const router = useRouter();
const { keyword, results } = useSearch();
const inputRef = ref<HTMLInputElement | null>(null);
const active = ref(0);

watch(
  () => props.open,
  (v) => {
    if (v) {
      keyword.value = '';
      active.value = 0;
      nextTick(() => inputRef.value?.focus());
    }
  },
);

function close() {
  emit('update:open', false);
}

function go(i: number) {
  const r = results.value[i];
  if (!r) return;
  router.push({ name: 'question', params: { categoryId: r.categoryId, slug: r.slug } });
  close();
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close();
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    active.value = Math.min(active.value + 1, results.value.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    active.value = Math.max(active.value - 1, 0);
  } else if (e.key === 'Enter') {
    go(active.value);
  }
}

const grouped = computed(() => results.value.slice(0, 30));
</script>

<template>
  <Teleport to="body">
    <div v-if="props.open" class="overlay" @click.self="close">
      <div class="palette card">
        <input
          ref="inputRef"
          v-model="keyword"
          class="search-input"
          placeholder="搜索题目、标签、答案..."
          @keydown="onKey"
        />
        <ul class="result-list">
          <li v-if="!grouped.length && keyword" class="empty">未找到匹配项</li>
          <li
            v-for="(r, i) in grouped"
            :key="r.id"
            class="result-item"
            :class="{ active: i === active }"
            @mouseenter="active = i"
            @click="go(i)"
          >
            <div class="title">{{ r.title }}</div>
            <div class="meta">
              <span class="cat">{{ r.categoryId }}</span>
              <span class="tag" :class="`tag-difficulty-${r.difficulty}`">{{ r.difficulty }}</span>
              <span v-for="t in r.tags.slice(0, 3)" :key="t" class="tag">#{{ t }}</span>
            </div>
          </li>
        </ul>
        <div class="hints">
          <kbd>↑↓</kbd> 切换 <kbd>Enter</kbd> 打开 <kbd>Esc</kbd> 关闭
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
  display: flex;
  justify-content: center;
  padding-top: 12vh;
}
.palette {
  width: min(92vw, 600px);
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.search-input {
  border: none;
  outline: none;
  padding: 16px;
  font-size: 16px;
  background: transparent;
  border-bottom: 1px solid var(--c-border);
}
.result-list {
  list-style: none;
  margin: 0;
  padding: 6px;
  overflow: auto;
  flex: 1;
}
.empty {
  padding: 20px;
  text-align: center;
  color: var(--c-text-mute);
}
.result-item {
  padding: 10px 12px;
  border-radius: var(--radius);
  cursor: pointer;
}
.result-item.active {
  background: var(--c-primary-soft);
}
.result-item .title {
  font-weight: 500;
  font-size: 14px;
}
.result-item .meta {
  margin-top: 4px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.result-item .cat {
  font-size: 11px;
  color: var(--c-text-mute);
}
.hints {
  padding: 8px 14px;
  border-top: 1px solid var(--c-border);
  font-size: 12px;
  color: var(--c-text-mute);
  display: flex;
  gap: 12px;
}
kbd {
  font-family: monospace;
  font-size: 11px;
  border: 1px solid var(--c-border);
  border-radius: 4px;
  padding: 0 4px;
  background: var(--c-bg-mute);
}
</style>
