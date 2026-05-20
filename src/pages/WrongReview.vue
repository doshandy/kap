<script setup lang="ts">
import { computed, ref } from 'vue';
import { useContent } from '@/composables/useContent';
import { useMarksStore, WRONG_REASON_OPTIONS } from '@/stores/marks';
import { useProgressStore } from '@/stores/progress';
import { wrongReviewQuestions } from '@/lib/learningExperience';
import QuestionCard from '@/components/question/QuestionCard.vue';
import AppIcon from '@/components/icon/AppIcon.vue';

const { allQuestions } = useContent();
const marks = useMarksStore();
const progress = useProgressStore();
const selectedReason = ref('');
const includeSkipped = ref(false);

const signals = {
  getStatus: (id: string) => progress.get(id).status,
  getRecord: (id: string) => progress.get(id),
  isStarred: (id: string) => marks.isStarred(id),
  isSkipped: (id: string) => marks.isSkipped(id),
  wrongReasonsOf: (id: string) => marks.wrongReasonsOf(id),
};

const groupedCounts = computed(() =>
  WRONG_REASON_OPTIONS.map((reason) => ({
    reason,
    count: allQuestions.value.filter((q) => {
      if (!includeSkipped.value && marks.isSkipped(q.id)) return false;
      return marks.hasWrongReason(q.id, reason);
    }).length,
  })),
);

const allWrongQuestions = computed(() =>
  wrongReviewQuestions(allQuestions.value, signals, undefined, {
    includeSkipped: includeSkipped.value,
  }),
);

const questions = computed(() =>
  wrongReviewQuestions(allQuestions.value, signals, selectedReason.value || undefined, {
    includeSkipped: includeSkipped.value,
  }),
);
</script>

<template>
  <div class="wrong-page">
    <header class="head">
      <h1><AppIcon name="reload" /> 错因复盘模式</h1>
      <p class="muted">
        按错因重新组织题目，比单纯收藏更适合定位短板：概念、代码、边界、表达、性能安全分别复盘。
      </p>
    </header>

    <section class="card filters">
      <button
        class="chip ui-chip"
        :class="{ active: !selectedReason }"
        @click="selectedReason = ''"
      >
        全部错因 <b>{{ allWrongQuestions.length }}</b>
      </button>
      <button
        v-for="item in groupedCounts"
        :key="item.reason"
        class="chip ui-chip"
        :class="{ active: selectedReason === item.reason }"
        :disabled="item.count === 0"
        @click="selectedReason = item.reason"
      >
        {{ item.reason }} <b>{{ item.count }}</b>
      </button>
      <label class="chip ui-chip include-skipped">
        <input v-model="includeSkipped" class="ui-checkbox" type="checkbox" />
        显示已跳过
      </label>
    </section>

    <section v-if="questions.length" class="summary card">
      <b>{{ questions.length }}</b>
      <span>道题需要复盘</span>
      <p class="muted">建议先用“题目 → 核心答案 → 误区/追问”的分层方式重新回答，再清理错因。</p>
    </section>

    <QuestionCard v-for="(q, i) in questions" :key="q.id" :question="q" :index="i + 1" />

    <div v-if="!questions.length" class="empty card">
      目前没有对应错因的题目。做题时给题目标记错因后，这里会自动生成复盘清单。
    </div>
  </div>
</template>

<style scoped>
.wrong-page {
  max-width: 980px;
  margin: 0 auto;
}
.head h1 {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 24px;
}
.muted {
  color: var(--c-text-mute);
  font-size: 13px;
}
.filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 14px;
  margin-bottom: 14px;
}
.include-skipped {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: var(--c-text-mute);
}
.summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px;
  margin-bottom: 14px;
}
.summary b {
  color: var(--c-primary);
  font-size: 24px;
}
.summary p {
  margin-left: auto;
}
.empty {
  padding: 32px;
  text-align: center;
  color: var(--c-text-mute);
}
@media (max-width: 560px) {
  .summary {
    align-items: flex-start;
    flex-direction: column;
  }
  .summary p {
    margin-left: 0;
  }
}
</style>
