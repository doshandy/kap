<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { useContent } from '@/composables/useContent';
import { useMarksStore, WRONG_REASON_OPTIONS, type WrongReason } from '@/stores/marks';
import { useProgressStore } from '@/stores/progress';
import { questionPriority } from '@/lib/questionPriority';
import { scoreAnswer } from '@/lib/answerScoring';
import AppIcon from '@/components/icon/AppIcon.vue';
import type { Question } from '@/types/content';

const { allQuestions } = useContent();
const marks = useMarksStore();
const progress = useProgressStore();

const count = ref<10 | 20>(10);
const minutes = ref(30);
const highFrequencyOnly = ref(true);
const queue = ref<Question[]>([]);
const answers = ref<Record<string, string>>({});
const current = ref(0);
const remaining = ref(0);
const finished = ref(false);
const resultRecorded = ref(false);

let timer: number | null = null;

const candidates = computed(() => {
  let pool = allQuestions.value.filter((q) => !marks.isSkipped(q.id));
  if (highFrequencyOnly.value) {
    pool = pool.filter(
      (q) => q.tags.some((tag) => /高频|核心|面试/.test(tag)) || q.difficulty !== '基础',
    );
  }
  return pool.slice().sort((a, b) => {
    const pa = questionPriority(a, {
      status: progress.get(a.id).status,
      starred: marks.isStarred(a.id),
    });
    const pb = questionPriority(b, {
      status: progress.get(b.id).status,
      starred: marks.isStarred(b.id),
    });
    return pb - pa || a.id.localeCompare(b.id);
  });
});

const currentQuestion = computed(() => queue.value[current.value]);
const currentScore = computed(() =>
  currentQuestion.value
    ? scoreAnswer(answers.value[currentQuestion.value.id] || '', currentQuestion.value)
    : undefined,
);
const finalScores = computed(() =>
  queue.value.map((q) => ({
    question: q,
    answer: answers.value[q.id] || '',
    score: scoreAnswer(answers.value[q.id] || '', q),
  })),
);
const averageScore = computed(() => {
  if (!finalScores.value.length) return 0;
  return Math.round(
    finalScores.value.reduce((sum, item) => sum + item.score.total, 0) / finalScores.value.length,
  );
});

function start(): void {
  const pool = shuffle(candidates.value.slice(), Date.now());
  queue.value = pool.slice(0, Math.min(count.value, pool.length));
  answers.value = {};
  current.value = 0;
  finished.value = false;
  resultRecorded.value = false;
  remaining.value = minutes.value * 60;
  if (timer) clearInterval(timer);
  timer = window.setInterval(() => {
    remaining.value -= 1;
    if (remaining.value <= 0) finish();
  }, 1000);
}

function shuffle<T>(items: T[], seed: number): T[] {
  let state = seed || 1;
  const next = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

function finish(): void {
  if (finished.value) return;
  finished.value = true;
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  if (!resultRecorded.value) {
    for (const item of finalScores.value) {
      if (!item.answer.trim()) continue;
      progress.addEvent(item.question.id, {
        type: 'note',
        label: '完成临考作答',
        detail: `${item.score.total} 分 · ${item.score.level}`,
      });
    }
    resultRecorded.value = true;
  }
}

function reset(): void {
  queue.value = [];
  answers.value = {};
  finished.value = false;
  resultRecorded.value = false;
  if (timer) clearInterval(timer);
  timer = null;
}

function setReason(id: string, reason: WrongReason): void {
  const had = marks.hasWrongReason(id, reason);
  marks.toggleWrongReason(id, reason);
  if (!marks.isStarred(id)) marks.toggleStar(id);
  progress.addEvent(id, {
    type: 'wrong-reason',
    label: had ? `移除临考错因：${reason}` : `新增临考错因：${reason}`,
    detail: '临考报告中调整错因标签',
  });
}

const fmt = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.max(0, seconds % 60)).padStart(2, '0')}`;

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<template>
  <div class="exam-page">
    <header class="head">
      <h1><AppIcon name="trophy" /> 临考模式</h1>
      <p class="muted">
        只显示题目和输入框，结束后统一看评分、参考答案和错因建议，更接近真正面试前自测。
      </p>
    </header>

    <section v-if="!queue.length" class="card config">
      <label>
        题数
        <select v-model.number="count" class="ui-select">
          <option :value="10">10 题</option>
          <option :value="20">20 题</option>
        </select>
      </label>
      <label>
        总限时
        <select v-model.number="minutes" class="ui-select">
          <option :value="20">20 分钟</option>
          <option :value="30">30 分钟</option>
          <option :value="45">45 分钟</option>
        </select>
      </label>
      <label class="check">
        <input v-model="highFrequencyOnly" class="ui-checkbox" type="checkbox" />
        优先高频 / 进阶 / 资深题
      </label>
      <button class="btn btn-primary" :disabled="!candidates.length" @click="start">
        <AppIcon name="play" /> 开始临考
      </button>
      <p class="muted">当前可用题目：{{ candidates.length }} 道，已跳过题会自动排除。</p>
    </section>

    <section v-else-if="!finished && currentQuestion" class="exam-body">
      <div class="hud card">
        <span>第 {{ current + 1 }} / {{ queue.length }} 题</span>
        <span :class="{ urgent: remaining <= 180 }">
          <AppIcon name="clock" /> {{ fmt(remaining) }}
        </span>
        <button class="btn btn-ghost" @click="finish">交卷</button>
      </div>
      <article class="card question-box">
        <p class="meta">{{ currentQuestion.categoryId }} · {{ currentQuestion.difficulty }}</p>
        <h2>{{ currentQuestion.title }}</h2>
        <div class="markdown-body" v-html="currentQuestion.question" />
        <textarea
          v-model="answers[currentQuestion.id]"
          class="ui-textarea"
          rows="9"
          placeholder="像面试现场一样组织答案：先结论，再原理、场景、误区和取舍..."
        />
        <div v-if="currentScore" class="live-score">
          当前草稿评分：<b>{{ currentScore.total }}</b> / 100 · {{ currentScore.level }}
        </div>
      </article>
      <div class="paging">
        <button class="btn" :disabled="current === 0" @click="current--">上一题</button>
        <button
          class="btn btn-primary"
          @click="current === queue.length - 1 ? finish() : current++"
        >
          {{ current === queue.length - 1 ? '交卷' : '下一题' }}
        </button>
      </div>
    </section>

    <section v-else class="result">
      <div class="card summary">
        <h2>临考报告：{{ averageScore }} 分</h2>
        <p class="muted">低于 70 分的题建议标记错因并加入收藏，后续在错题本集中复盘。</p>
        <button class="btn" @click="reset">重新开始</button>
      </div>
      <article v-for="item in finalScores" :key="item.question.id" class="card review-item">
        <div class="review-head">
          <div>
            <h3>{{ item.question.title }}</h3>
            <p class="muted">
              {{ item.question.difficulty }} · {{ item.question.tags.join(' / ') }}
            </p>
          </div>
          <b>{{ item.score.total }} 分</b>
        </div>
        <p v-if="item.score.suggestions.length" class="suggestion">
          建议：{{ item.score.suggestions.join('；') }}
        </p>
        <details>
          <summary>查看我的答案与参考答案</summary>
          <h4>我的答案</h4>
          <pre>{{ item.answer || '未作答' }}</pre>
          <h4>参考要点</h4>
          <div class="markdown-body" v-html="item.question.answer" />
        </details>
        <div class="reason-row">
          <button
            v-for="reason in WRONG_REASON_OPTIONS"
            :key="reason"
            class="chip ui-chip"
            :class="{ active: marks.hasWrongReason(item.question.id, reason) }"
            @click="setReason(item.question.id, reason)"
          >
            {{ reason }}
          </button>
          <RouterLink
            class="btn btn-ghost"
            :to="`/q/${item.question.categoryId}/${item.question.slug}`"
          >
            去题卡复盘
          </RouterLink>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.exam-page {
  max-width: 980px;
  margin: 0 auto;
}
.head h1,
.hud,
.review-head,
.reason-row,
.paging {
  display: flex;
  align-items: center;
  gap: 10px;
}
.muted,
.meta {
  color: var(--c-text-mute);
  font-size: 13px;
}
.config,
.question-box,
.summary,
.review-item,
.hud {
  padding: 16px;
}
.config {
  display: grid;
  gap: 14px;
}
.config label {
  display: grid;
  gap: 6px;
}
.config .ui-select,
.question-box .ui-textarea {
  border-radius: 10px;
}
.config .ui-select {
  padding: 8px 10px;
}
.check {
  display: flex !important;
  flex-direction: row;
  align-items: center;
}
.hud {
  justify-content: space-between;
  margin-bottom: 12px;
}
.urgent {
  color: var(--c-danger);
  font-weight: 700;
}
.question-box h2,
.summary h2,
.review-item h3 {
  margin-top: 0;
}
.question-box .ui-textarea {
  width: 100%;
  padding: 12px;
  resize: vertical;
  line-height: 1.6;
}
.live-score,
.suggestion {
  margin-top: 10px;
  color: var(--c-primary);
}
.paging {
  justify-content: flex-end;
  margin-top: 12px;
}
.result {
  display: grid;
  gap: 12px;
}
.review-head {
  justify-content: space-between;
}
.review-head b {
  color: var(--c-primary);
  font-size: 22px;
}
pre {
  white-space: pre-wrap;
  padding: 12px;
  border-radius: var(--radius);
  background: var(--c-bg-soft);
}
.reason-row {
  flex-wrap: wrap;
  margin-top: 12px;
}
.chip {
  --chip-accent: var(--c-primary);
}
.chip.active {
  --chip-accent: var(--c-primary);
}
@media (max-width: 640px) {
  .hud,
  .review-head,
  .paging {
    align-items: stretch;
    flex-direction: column;
  }
  .paging .btn,
  .hud .btn {
    width: 100%;
  }
}
</style>
