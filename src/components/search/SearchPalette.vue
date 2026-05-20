<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import {
  clearSearchHistory,
  getSearchHistory,
  prewarmSearch,
  pushSearchHistory,
  useSearch,
} from '@/composables/useSearch';
import { SCENARIO_SEARCHES } from '@/lib/learningExperience';
import AppIcon from '@/components/icon/AppIcon.vue';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>();

const router = useRouter();
const { keyword, hits, error } = useSearch();
const inputRef = ref<HTMLInputElement | null>(null);
const active = ref(0);
const history = ref<string[]>(getSearchHistory());
let prewarmIdleId: number | null = null;
let prewarmTimerId: number | null = null;

watch(
  () => props.open,
  (v) => {
    if (v) {
      const win = window as Window & {
        requestIdleCallback?: (
          callback: (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void,
          options?: { timeout: number },
        ) => number;
        cancelIdleCallback?: (id: number) => void;
      };
      if (typeof win.requestIdleCallback === 'function') {
        prewarmIdleId = win.requestIdleCallback(
          () => {
            void prewarmSearch();
            prewarmIdleId = null;
          },
          { timeout: 500 },
        );
      } else {
        prewarmTimerId = window.setTimeout(() => {
          void prewarmSearch();
          prewarmTimerId = null;
        }, 0);
      }
      keyword.value = '';
      active.value = 0;
      history.value = getSearchHistory();
      nextTick(() => inputRef.value?.focus());
      return;
    }
    const win = window as Window & {
      cancelIdleCallback?: (id: number) => void;
    };
    if (prewarmIdleId != null && typeof win.cancelIdleCallback === 'function') {
      win.cancelIdleCallback(prewarmIdleId);
      prewarmIdleId = null;
    }
    if (prewarmTimerId != null) {
      window.clearTimeout(prewarmTimerId);
      prewarmTimerId = null;
    }
  },
);

function close() {
  emit('update:open', false);
}

function go(i: number) {
  const h = grouped.value[i];
  if (!h) return;
  pushSearchHistory(keyword.value);
  router.push({
    name: 'question',
    params: { categoryId: h.item.categoryId, slug: h.item.slug },
  });
  close();
}

function pickHistory(k: string) {
  keyword.value = k;
  active.value = 0;
  nextTick(() => inputRef.value?.focus());
}

function pickScenario(k: string) {
  keyword.value = k;
  active.value = 0;
  pushSearchHistory(k);
  nextTick(() => inputRef.value?.focus());
}

function removeHistory() {
  clearSearchHistory();
  history.value = [];
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') close();
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    active.value = Math.min(active.value + 1, grouped.value.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    active.value = Math.max(active.value - 1, 0);
  } else if (e.key === 'Enter') {
    go(active.value);
  }
}

const grouped = computed(() => hits.value.slice(0, 30));

const fieldLabel: Record<string, string> = {
  title: '标题',
  tags: '标签',
  raw: '正文',
};

watch(active, () => {
  nextTick(() => {
    const el = document.querySelector(`[data-search-idx="${active.value}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  });
});

const onGlobalKey = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && props.open) {
    e.preventDefault();
    inputRef.value?.focus();
  }
};
onMounted(() => window.addEventListener('keydown', onGlobalKey));
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKey);
  const win = window as Window & { cancelIdleCallback?: (id: number) => void };
  if (prewarmIdleId != null && typeof win.cancelIdleCallback === 'function') {
    win.cancelIdleCallback(prewarmIdleId);
    prewarmIdleId = null;
  }
  if (prewarmTimerId != null) {
    window.clearTimeout(prewarmTimerId);
    prewarmTimerId = null;
  }
});
</script>

<template>
  <Teleport to="body">
    <div v-if="props.open" class="overlay" @click.self="close">
      <div class="palette card" role="dialog" aria-modal="true" aria-label="全站搜索">
        <div class="search-row">
          <AppIcon name="search" class="search-icon" />
          <input
            ref="inputRef"
            v-model="keyword"
            class="search-input"
            placeholder="搜索题目、标签、答案..."
            role="combobox"
            aria-expanded="true"
            aria-controls="kap-search-listbox"
            :aria-activedescendant="grouped.length ? `kap-search-opt-${active}` : undefined"
            aria-label="全文搜索"
            autocomplete="off"
            spellcheck="false"
            @keydown="onKey"
          />
          <button v-if="keyword" class="clear-btn" title="清空" @click="keyword = ''">
            <AppIcon name="close" />
          </button>
          <button class="close-btn" title="关闭搜索" aria-label="关闭搜索" @click="close">
            关闭
          </button>
        </div>

        <div v-if="!keyword" class="scenario-search">
          <div class="section-label">
            <span>按场景搜索</span>
          </div>
          <div class="chips">
            <button
              v-for="item in SCENARIO_SEARCHES"
              :key="item.label"
              class="chip ui-chip scenario-chip"
              @click="pickScenario(item.keyword)"
            >
              {{ item.label }}
            </button>
          </div>
        </div>

        <div v-if="!keyword && history.length" class="history">
          <div class="section-label">
            <span>最近搜索</span>
            <button class="link-btn" title="清空历史" @click="removeHistory">清空</button>
          </div>
          <div class="chips">
            <button v-for="h in history" :key="h" class="chip ui-chip" @click="pickHistory(h)">
              {{ h }}
            </button>
          </div>
        </div>

        <ul id="kap-search-listbox" class="result-list" role="listbox">
          <li v-if="error" class="empty">搜索模块加载失败，请检查网络后重试：{{ error }}</li>
          <li v-else-if="!grouped.length && keyword" class="empty">未找到匹配项</li>
          <li
            v-for="(r, i) in grouped"
            :id="`kap-search-opt-${i}`"
            :key="r.item.id"
            :data-search-idx="i"
            class="result-item"
            :class="{ active: i === active }"
            role="option"
            :aria-selected="i === active"
            @mouseenter="active = i"
            @click="go(i)"
          >
            <div class="title-row">
              <span class="title" v-html="r.titleHtml" />
              <span class="field" :title="`命中字段：${fieldLabel[r.matchedField]}`">
                {{ fieldLabel[r.matchedField] }}
              </span>
            </div>
            <div v-if="r.excerptHtml" class="excerpt" v-html="r.excerptHtml" />
            <div class="meta">
              <span class="cat">{{ r.item.categoryId }}</span>
              <span class="tag" :class="`tag-difficulty-${r.item.difficulty}`">
                {{ r.item.difficulty }}
              </span>
              <span v-for="t in r.item.tags.slice(0, 3)" :key="t" class="tag">#{{ t }}</span>
            </div>
          </li>
        </ul>
        <div class="hints">
          <span><kbd>↑↓</kbd> 切换</span>
          <span><kbd>Enter</kbd> 打开</span>
          <span><kbd>Esc</kbd> 关闭</span>
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
  width: min(92vw, 640px);
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.search-row {
  display: flex;
  align-items: center;
  padding: 12px 14px;
  border-bottom: 1px solid var(--c-border);
  gap: 10px;
}
.search-icon {
  color: var(--c-text-mute);
}
.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-size: 16px;
  background: transparent;
  color: var(--c-text);
}
.clear-btn {
  background: transparent;
  border: 0;
  color: var(--c-text-mute);
  cursor: pointer;
  padding: 4px;
}
.clear-btn:hover {
  color: var(--c-text);
}
.close-btn {
  min-height: 34px;
  padding: 0 10px;
  color: var(--c-text-soft);
  background: var(--c-bg-mute);
  border-radius: var(--radius);
  font-size: 12px;
}
.close-btn:hover {
  color: var(--c-text);
  background: var(--c-primary-soft);
}

.history,
.scenario-search {
  padding: 10px 14px;
  border-bottom: 1px solid var(--c-border);
}
.section-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: var(--c-text-mute);
  margin-bottom: 6px;
}
.link-btn {
  background: transparent;
  border: 0;
  color: var(--c-text-mute);
  font-size: 11px;
  cursor: pointer;
}
.link-btn:hover {
  color: var(--c-primary);
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  --chip-accent: var(--c-primary);
}
.scenario-chip {
  --chip-accent: #6366f1;
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
.title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.title {
  font-weight: 500;
  font-size: 14px;
  color: var(--c-text);
  flex: 1;
  overflow-wrap: anywhere;
}
.title :deep(mark),
.excerpt :deep(mark) {
  background: rgba(245, 158, 11, 0.35);
  color: inherit;
  padding: 0 2px;
  border-radius: 2px;
}
.field {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--c-text-mute);
  background: var(--c-bg-mute);
  padding: 1px 8px;
  border-radius: 999px;
}
.excerpt {
  margin-top: 4px;
  font-size: 12px;
  color: var(--c-text-soft);
  line-height: 1.5;
  overflow-wrap: anywhere;
}
.meta {
  margin-top: 6px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.cat {
  font-size: 11px;
  color: var(--c-text-mute);
}
.hints {
  padding: 8px 14px;
  border-top: 1px solid var(--c-border);
  font-size: 12px;
  color: var(--c-text-mute);
  display: flex;
  gap: 14px;
}
kbd {
  font-family: monospace;
  font-size: 11px;
  border: 1px solid var(--c-border);
  border-radius: 4px;
  padding: 0 4px;
  background: var(--c-bg-mute);
}
@media (max-width: 540px) {
  .overlay {
    align-items: flex-start;
    padding: 8px;
    padding-top: calc(8px + env(safe-area-inset-top));
  }
  .palette {
    width: 100%;
    max-height: calc(100dvh - 24px - env(safe-area-inset-top));
  }
  .search-row {
    padding: 10px;
  }
  .close-btn {
    min-height: 40px;
    padding: 0 12px;
  }
  .hints {
    display: none;
  }
}
</style>
