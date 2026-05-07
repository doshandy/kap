<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import { useContent } from '@/composables/useContent';
import { useProgressStore } from '@/stores/progress';
import { useMarksStore } from '@/stores/marks';
import QuestionCard from '@/components/question/QuestionCard.vue';
import AppIcon from '@/components/icon/AppIcon.vue';
import type { Difficulty, Question } from '@/types/content';

const { categories, allQuestions } = useContent();
const progress = useProgressStore();
const marks = useMarksStore();

const count = ref(10);
const difficulty = ref<Difficulty | 'all'>('all');
const selectedCats = ref<string[]>([]);
const sourceFilter = ref<'all' | 'todo' | 'starred' | 'review'>('all');
const timeLimitPerQ = ref(0);
const queue = ref<Question[]>([]);
const current = ref(0);
const elapsed = ref(0);
const remaining = ref(0);
const finished = ref(false);
const wrongList = ref<Question[]>([]);
const initialStatusMap = new Map<string, string>();

let totalTimer: number | null = null;
let countdown: number | null = null;

const result = computed(() => {
  let mastered = 0;
  let review = 0;
  for (const q of queue.value) {
    const s = progress.get(q.id).status;
    if (s === 'mastered') mastered++;
    else if (s === 'review' || s === 'fuzzy') review++;
  }
  return { mastered, review, total: queue.value.length };
});

const accuracy = computed(() => {
  if (!queue.value.length) return 0;
  return Math.round((result.value.mastered / queue.value.length) * 100);
});

function pickRandom(): Question[] {
  let pool = allQuestions.value.slice();
  pool = pool.filter((q) => !marks.isSkipped(q.id));
  if (selectedCats.value.length) {
    pool = pool.filter((q) => selectedCats.value.includes(q.categoryId));
  }
  if (difficulty.value !== 'all') {
    pool = pool.filter((q) => q.difficulty === difficulty.value);
  }
  if (sourceFilter.value === 'todo') {
    pool = pool.filter((q) => progress.get(q.id).status === 'todo');
  } else if (sourceFilter.value === 'starred') {
    pool = pool.filter((q) => marks.isStarred(q.id));
  } else if (sourceFilter.value === 'review') {
    pool = pool.filter((q) => {
      const s = progress.get(q.id).status;
      return s === 'review' || s === 'fuzzy';
    });
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count.value, pool.length));
}

function start() {
  queue.value = pickRandom();
  current.value = 0;
  elapsed.value = 0;
  finished.value = false;
  wrongList.value = [];
  initialStatusMap.clear();
  for (const q of queue.value) {
    initialStatusMap.set(q.id, progress.get(q.id).status);
  }
  if (totalTimer) clearInterval(totalTimer);
  totalTimer = window.setInterval(() => elapsed.value++, 1000);
  resetCountdown();
}

function resetCountdown() {
  if (countdown) clearInterval(countdown);
  if (timeLimitPerQ.value > 0) {
    remaining.value = timeLimitPerQ.value;
    countdown = window.setInterval(() => {
      remaining.value--;
      if (remaining.value <= 0) {
        next();
      }
    }, 1000);
  }
}

function next() {
  if (current.value < queue.value.length - 1) {
    current.value++;
    resetCountdown();
  } else end();
}

function prev() {
  if (current.value > 0) {
    current.value--;
    resetCountdown();
  }
}

function end() {
  finished.value = true;
  if (totalTimer) {
    clearInterval(totalTimer);
    totalTimer = null;
  }
  if (countdown) {
    clearInterval(countdown);
    countdown = null;
  }
  wrongList.value = queue.value.filter((q) => {
    const s = progress.get(q.id).status;
    return s === 'review' || s === 'fuzzy';
  });
}

function restartWithWrong() {
  if (!wrongList.value.length) return;
  queue.value = wrongList.value.slice();
  current.value = 0;
  elapsed.value = 0;
  finished.value = false;
  wrongList.value = [];
  if (totalTimer) clearInterval(totalTimer);
  totalTimer = window.setInterval(() => elapsed.value++, 1000);
  resetCountdown();
}

function reset() {
  queue.value = [];
  finished.value = false;
  wrongList.value = [];
  if (totalTimer) clearInterval(totalTimer);
  if (countdown) clearInterval(countdown);
}

watch(current, resetCountdown);

onUnmounted(() => {
  if (totalTimer) clearInterval(totalTimer);
  if (countdown) clearInterval(countdown);
});

const fmt = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
</script>

<template>
  <div class="quiz">
    <header class="head">
      <h1><AppIcon name="experiment" /> 模拟面试 / 随机抽题</h1>
      <p class="muted">从知识库中随机抽题，模拟限时面试场景。完成后自动生成错题本，可一键复练。</p>
    </header>

    <section v-if="!queue.length" class="card config">
      <div class="row">
        <label>题数：</label>
        <input v-model.number="count" type="number" min="1" max="50" />
        <span class="hint">建议：5/10/15/20</span>
      </div>
      <div class="row">
        <label>难度：</label>
        <select v-model="difficulty">
          <option value="all">全部</option>
          <option value="基础">基础</option>
          <option value="进阶">进阶</option>
          <option value="资深">资深</option>
        </select>
      </div>
      <div class="row">
        <label>题源：</label>
        <select v-model="sourceFilter">
          <option value="all">全部题目</option>
          <option value="todo">未做过</option>
          <option value="starred">仅收藏</option>
          <option value="review">仅复习 / 模糊</option>
        </select>
        <span class="hint">已跳过的题目自动排除</span>
      </div>
      <div class="row">
        <label>每题限时：</label>
        <select v-model.number="timeLimitPerQ">
          <option :value="0">不限时</option>
          <option :value="30">30 秒</option>
          <option :value="60">60 秒（推荐）</option>
          <option :value="120">2 分钟</option>
          <option :value="300">5 分钟</option>
        </select>
      </div>
      <div class="row cats">
        <label>分类（不选 = 全部）：</label>
        <div class="chips">
          <button
            v-for="c in categories"
            :key="c.id"
            class="chip"
            :class="{ active: selectedCats.includes(c.id) }"
            @click="
              selectedCats.includes(c.id)
                ? selectedCats.splice(selectedCats.indexOf(c.id), 1)
                : selectedCats.push(c.id)
            "
          >
            {{ c.icon }} {{ c.title }}
          </button>
        </div>
      </div>
      <div class="row">
        <button class="btn btn-primary" @click="start">
          <AppIcon name="play" /> 开始
        </button>
      </div>
    </section>

    <section v-else>
      <div class="hud">
        <span>第 {{ current + 1 }} / {{ queue.length }} 题</span>
        <span class="time"><AppIcon name="clock" /> 总用时 {{ fmt(elapsed) }}</span>
        <span v-if="timeLimitPerQ > 0" class="time" :class="{ urgent: remaining <= 10 }">
          <AppIcon name="thunderbolt" /> 本题剩 {{ remaining }}s
        </span>
        <button class="btn btn-ghost" title="提前结束模考" @click="end">结束</button>
      </div>
      <QuestionCard
        v-if="queue[current]"
        :question="queue[current]"
        :index="current + 1"
        :default-open="false"
      />
      <div class="paging">
        <button class="btn" :disabled="current === 0" @click="prev">上一题</button>
        <button class="btn btn-primary" @click="next">
          {{ current === queue.length - 1 ? '完成' : '下一题' }}
        </button>
      </div>

      <div v-if="finished" class="card result">
        <h3><AppIcon name="pieChart" /> 答题结果</h3>
        <div class="result-grid">
          <div class="metric">
            <div class="value">{{ accuracy }}%</div>
            <div class="label">准确率</div>
          </div>
          <div class="metric">
            <div class="value">{{ result.mastered }} / {{ result.total }}</div>
            <div class="label">掌握</div>
          </div>
          <div class="metric">
            <div class="value">{{ wrongList.length }}</div>
            <div class="label">错题</div>
          </div>
          <div class="metric">
            <div class="value">{{ fmt(elapsed) }}</div>
            <div class="label">总用时</div>
          </div>
        </div>

        <div v-if="wrongList.length" class="wrong-list">
          <h4><AppIcon name="warning" /> 错题本（{{ wrongList.length }}）</h4>
          <ul>
            <li v-for="q in wrongList" :key="q.id">
              <span class="cat">{{ q.categoryId }}</span>
              <span>{{ q.title }}</span>
              <span class="tag" :class="`tag-difficulty-${q.difficulty}`">{{ q.difficulty }}</span>
            </li>
          </ul>
        </div>

        <div class="result-actions">
          <button v-if="wrongList.length" class="btn btn-primary" @click="restartWithWrong">
            <AppIcon name="reload" /> 只练错题
          </button>
          <button class="btn" @click="reset">
            <AppIcon name="appstore" /> 重新组卷
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.quiz {
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
.config {
  padding: 18px 22px;
  margin-top: 14px;
}
.row {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.row label {
  font-size: 13px;
  color: var(--c-text-soft);
  min-width: 110px;
}
.row input,
.row select {
  padding: 6px 10px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  background: var(--c-surface);
  color: var(--c-text);
}
.row.cats {
  align-items: flex-start;
}
.hint {
  font-size: 11px;
  color: var(--c-text-mute);
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  flex: 1;
}
.chip {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--c-bg-mute);
}
.chip.active {
  background: var(--c-primary);
  color: #fff;
}
.hud {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  margin-bottom: 12px;
  background: var(--c-bg-soft);
  border-radius: var(--radius);
  gap: 10px;
  flex-wrap: wrap;
}
.hud .time {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-family: monospace;
}
.hud .time.urgent {
  color: var(--c-warning, #f59e0b);
  font-weight: 600;
}
.paging {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
}
.result {
  margin-top: 18px;
  padding: 18px 22px;
}
.result-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin: 14px 0;
}
@media (max-width: 600px) {
  .result-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
.metric {
  background: var(--c-bg-soft);
  border-radius: var(--radius);
  padding: 14px;
  text-align: center;
}
.metric .value {
  font-size: 22px;
  font-weight: 700;
  color: var(--c-primary);
}
.metric .label {
  margin-top: 4px;
  font-size: 12px;
  color: var(--c-text-mute);
}
.wrong-list {
  margin-top: 16px;
  padding: 12px 14px;
  background: rgba(245, 158, 11, 0.08);
  border-left: 3px solid var(--c-warning, #f59e0b);
  border-radius: var(--radius);
}
.wrong-list h4 {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--c-warning, #d97706);
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.wrong-list ul {
  margin: 0;
  padding-left: 18px;
}
.wrong-list li {
  margin: 4px 0;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.wrong-list .cat {
  font-family: monospace;
  font-size: 11px;
  color: var(--c-text-mute);
  background: var(--c-bg-mute);
  padding: 1px 6px;
  border-radius: 4px;
}
.result-actions {
  margin-top: 14px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
</style>
