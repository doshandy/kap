<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import { useContent } from '@/composables/useContent';
import { scoreAnswer } from '@/lib/answerScoring';
import { stripHtml } from '@/lib/learningExperience';
import { useProgressStore } from '@/stores/progress';
import type { Question } from '@/types/content';
import AppIcon from '@/components/icon/AppIcon.vue';

const route = useRoute();
const { getQuestion, questionMap } = useContent();
const progress = useProgressStore();

const current = ref(0);
const drafts = ref<Record<string, string>>({});
const finished = ref(false);

const rootQuestion = computed(() =>
  getQuestion(route.params.categoryId as string, route.params.slug as string),
);

const chain = computed(() => {
  const root = rootQuestion.value;
  if (!root) return [];
  const followups = (root.followupQuestionIds || [])
    .map((id) => questionMap.get(id))
    .filter((q): q is Question => Boolean(q));
  return [root, ...followups];
});

const activeQuestion = computed(() => chain.value[current.value]);
const activeDraft = computed({
  get: () => (activeQuestion.value ? drafts.value[activeQuestion.value.id] || '' : ''),
  set: (value) => {
    if (activeQuestion.value) drafts.value[activeQuestion.value.id] = value;
  },
});

const activeScore = computed(() =>
  activeQuestion.value && activeDraft.value.trim()
    ? scoreAnswer(activeDraft.value, activeQuestion.value)
    : undefined,
);

const report = computed(() => {
  const scores = chain.value
    .map((q) => {
      const draft = drafts.value[q.id] || '';
      return draft.trim() ? scoreAnswer(draft, q).total : 0;
    })
    .filter((score) => score > 0);
  const avg = scores.length
    ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
    : 0;
  return { answered: scores.length, avg };
});

watch(
  () => route.fullPath,
  () => {
    current.value = 0;
    drafts.value = {};
    finished.value = false;
  },
);

watch(
  () => activeQuestion.value?.id,
  (id) => {
    if (!id) return;
    progress.markViewed(id, '追问链练习');
  },
  { immediate: true },
);

function recordStepAnswer(question: Question, stepLabel: string): void {
  const draft = (drafts.value[question.id] || '').trim();
  if (!draft) return;
  const scored = scoreAnswer(draft, question);
  progress.addEvent(question.id, {
    type: 'note',
    label: `追问链作答：${stepLabel}`,
    detail: `${scored.total} 分 · ${scored.level}`,
  });
}

function next(): void {
  if (activeQuestion.value) {
    recordStepAnswer(
      activeQuestion.value,
      current.value === 0 ? '主问题' : `追问 ${current.value}`,
    );
  }
  if (current.value < chain.value.length - 1) {
    current.value++;
  } else {
    finished.value = true;
    if (rootQuestion.value) {
      progress.addEvent(rootQuestion.value.id, {
        type: 'note',
        label: '完成追问链演练',
        detail: `作答 ${report.value.answered}/${chain.value.length} 问，均分 ${report.value.avg}`,
      });
    }
  }
}

function restart(): void {
  current.value = 0;
  finished.value = false;
}
</script>

<template>
  <div class="chain-page">
    <header class="head">
      <h1><AppIcon name="experiment" /> 面试官追问链</h1>
      <p class="muted">
        先回答主问题，再连续处理追问。每一步先口述/书写，再看参考答案，训练真实面试中的递进追问。
      </p>
    </header>

    <div v-if="!rootQuestion" class="empty card">题目不存在</div>

    <template v-else>
      <section class="card progress">
        <div>
          <p class="eyebrow">当前进度</p>
          <h2>{{ current + 1 }} / {{ chain.length }}</h2>
        </div>
        <RouterLink
          class="btn btn-ghost"
          :to="`/q/${rootQuestion.categoryId}/${rootQuestion.slug}`"
        >
          返回原题
        </RouterLink>
      </section>

      <section v-if="activeQuestion && !finished" class="card step">
        <div class="step-meta">
          <span>{{ current === 0 ? '主问题' : `追问 ${current}` }}</span>
          <span class="tag" :class="`tag-difficulty-${activeQuestion.difficulty}`">
            {{ activeQuestion.difficulty }}
          </span>
        </div>
        <h2>{{ activeQuestion.title.replace(/^追问：/, '') }}</h2>
        <div class="markdown-body" v-html="activeQuestion.question" />
        <textarea
          v-model="activeDraft"
          rows="6"
          placeholder="像面试现场一样写下你的回答：先结论，再原理、场景、边界和取舍。"
        />
        <div v-if="activeScore" class="score">
          <b>{{ activeScore.total }} 分 · {{ activeScore.level }}</b>
          <span v-if="activeScore.suggestions.length">{{ activeScore.suggestions[0] }}</span>
        </div>
        <details class="answer">
          <summary>查看参考答案</summary>
          <div class="markdown-body" v-html="activeQuestion.answer" />
          <p v-if="activeQuestion.pitfall" class="muted">
            误区提示：{{ stripHtml(activeQuestion.pitfall).slice(0, 160) }}
          </p>
        </details>
        <div class="nav">
          <button class="btn" :disabled="current === 0" @click="current--">上一问</button>
          <button class="btn btn-primary" @click="next">
            {{ current === chain.length - 1 ? '生成复盘' : '下一问' }}
          </button>
        </div>
      </section>

      <section v-else class="card report">
        <h2><AppIcon name="trophy" /> 追问链复盘</h2>
        <p>
          已回答 <b>{{ report.answered }}</b> / {{ chain.length }} 问，平均本地评分
          <b>{{ report.avg }}</b> 分。
        </p>
        <ol>
          <li v-for="q in chain" :key="q.id">
            <RouterLink :to="`/q/${q.categoryId}/${q.slug}`">
              {{ q.title.replace(/^追问：/, '') }}
            </RouterLink>
            <span>{{ drafts[q.id] ? `${scoreAnswer(drafts[q.id], q).total} 分` : '未作答' }}</span>
          </li>
        </ol>
        <button class="btn btn-primary" @click="restart">再练一遍</button>
      </section>
    </template>
  </div>
</template>

<style scoped>
.chain-page {
  max-width: 900px;
  margin: 0 auto;
}
.head h1,
.report h2 {
  display: flex;
  align-items: center;
  gap: 8px;
}
.muted {
  color: var(--c-text-mute);
  font-size: 13px;
}
.progress,
.step,
.report {
  padding: 16px;
  margin-bottom: 14px;
}
.progress {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.eyebrow {
  margin: 0;
  color: var(--c-primary);
  font-size: 12px;
  font-weight: 700;
}
.progress h2,
.step h2 {
  margin: 4px 0 8px;
}
.step-meta {
  display: flex;
  gap: 8px;
  align-items: center;
  color: var(--c-text-mute);
  font-size: 13px;
}
textarea {
  width: 100%;
  margin-top: 12px;
  padding: 12px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  background: var(--c-bg);
  color: var(--c-text);
  line-height: 1.7;
  resize: vertical;
}
.score {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 10px;
  color: var(--c-primary);
}
.answer {
  margin-top: 12px;
  padding: 12px;
  border-radius: var(--radius);
  background: var(--c-bg-soft);
}
.nav {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-top: 14px;
}
.report ol {
  display: grid;
  gap: 8px;
  padding-left: 20px;
}
.report li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}
.empty {
  padding: 32px;
  text-align: center;
  color: var(--c-text-mute);
}
@media (max-width: 560px) {
  .progress,
  .nav,
  .report li {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
