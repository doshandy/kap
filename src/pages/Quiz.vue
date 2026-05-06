<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { useContent } from '@/composables/useContent';
import { useProgressStore } from '@/stores/progress';
import QuestionCard from '@/components/question/QuestionCard.vue';
import type { Difficulty, Question } from '@/types/content';

const { categories, allQuestions } = useContent();
const progress = useProgressStore();

const count = ref(10);
const difficulty = ref<Difficulty | 'all'>('all');
const selectedCats = ref<string[]>([]);
const queue = ref<Question[]>([]);
const current = ref(0);
const elapsed = ref(0);
const finished = ref(false);

let timer: number | null = null;

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

function pickRandom(): Question[] {
  let pool = allQuestions.value.slice();
  if (selectedCats.value.length) {
    pool = pool.filter((q) => selectedCats.value.includes(q.categoryId));
  }
  if (difficulty.value !== 'all') {
    pool = pool.filter((q) => q.difficulty === difficulty.value);
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
  if (timer) clearInterval(timer);
  timer = window.setInterval(() => elapsed.value++, 1000);
}

function next() {
  if (current.value < queue.value.length - 1) current.value++;
  else end();
}

function end() {
  finished.value = true;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

onUnmounted(() => {
  if (timer) clearInterval(timer);
});

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
</script>

<template>
  <div class="quiz">
    <header class="head">
      <h1>🎯 模拟面试 / 随机抽题</h1>
      <p class="muted">从知识库中随机抽题，模拟限时面试场景。</p>
    </header>

    <section v-if="!queue.length" class="card config">
      <div class="row">
        <label>题数：</label>
        <input v-model.number="count" type="number" min="1" max="50" />
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
        <button class="btn btn-primary" @click="start">开始 ▶</button>
      </div>
    </section>

    <section v-else>
      <div class="hud">
        <span>第 {{ current + 1 }} / {{ queue.length }} 题</span>
        <span>⏱ {{ fmt(elapsed) }}</span>
        <button class="btn btn-ghost" @click="end">结束</button>
      </div>
      <QuestionCard
        v-if="queue[current]"
        :question="queue[current]"
        :index="current + 1"
        :default-open="false"
      />
      <div class="paging">
        <button class="btn" :disabled="current === 0" @click="current--">上一题</button>
        <button class="btn btn-primary" @click="next">
          {{ current === queue.length - 1 ? '完成' : '下一题' }}
        </button>
      </div>

      <div v-if="finished" class="card result">
        <h3>📊 答题结果</h3>
        <p>用时：{{ fmt(elapsed) }}</p>
        <p>掌握：{{ result.mastered }} / {{ result.total }}</p>
        <p>需复习：{{ result.review }}</p>
        <button class="btn btn-primary" @click="queue = []">重新开始</button>
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
</style>
