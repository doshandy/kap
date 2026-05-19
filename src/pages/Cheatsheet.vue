<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import { useContent } from '@/composables/useContent';
import { exportQuestionsToMarkdown, exportQuestionsToAnkiTSV } from '@/composables/useExport';
import { useMarksStore } from '@/stores/marks';
import { useProgressStore } from '@/stores/progress';
import { preInterviewPicks, stripHtml } from '@/lib/learningExperience';
import AppIcon from '@/components/icon/AppIcon.vue';

const { allQuestions, categories } = useContent();
const marks = useMarksStore();
const progress = useProgressStore();

const signals = {
  getStatus: (id: string) => progress.get(id).status,
  getRecord: (id: string) => progress.get(id),
  isStarred: (id: string) => marks.isStarred(id),
  isSkipped: (id: string) => marks.isSkipped(id),
  wrongReasonsOf: (id: string) => marks.wrongReasonsOf(id),
};

const picks = computed(() => preInterviewPicks(allQuestions.value, signals, 30));
const questions = computed(() => picks.value.map((item) => item.question));
const categoryMap = computed(() => new Map(categories.value.map((c) => [c.id, c.title])));

const stats = computed(() => {
  const countByReason = (keyword: string) =>
    picks.value.filter((item) => item.reasons.some((reason) => reason.includes(keyword))).length;
  return {
    review: countByReason('需复习'),
    starred: countByReason('收藏未掌握'),
    wrong: countByReason('最近错因'),
    highFreq: countByReason('高频未掌握'),
  };
});

function exportMarkdown(): void {
  exportQuestionsToMarkdown(questions.value, 'kap-pre-interview-30min.md');
}

function exportAnki(): void {
  exportQuestionsToAnkiTSV(questions.value, 'kap-pre-interview-anki.tsv');
}
</script>

<template>
  <div class="cheat-page">
    <header class="head">
      <h1><AppIcon name="fileText" /> 面试前 30 分钟小抄</h1>
      <p class="muted">
        自动挑出高频未掌握、收藏未掌握、最近错题和薄弱分类 Top 题。适合面试前最后一轮快速扫盲。
      </p>
    </header>

    <section class="card panel">
      <div class="stats">
        <div>
          <b>{{ questions.length }}</b
          ><span>推荐题</span>
        </div>
        <div>
          <b>{{ stats.review }}</b
          ><span>需复习/模糊</span>
        </div>
        <div>
          <b>{{ stats.starred }}</b
          ><span>收藏命中</span>
        </div>
        <div>
          <b>{{ stats.wrong }}</b
          ><span>最近错因</span>
        </div>
        <div>
          <b>{{ stats.highFreq }}</b
          ><span>高频未掌握</span>
        </div>
      </div>
      <div class="actions">
        <button class="btn btn-primary" :disabled="!questions.length" @click="exportMarkdown">
          <AppIcon name="download" /> 导出 Markdown
        </button>
        <button class="btn" :disabled="!questions.length" @click="exportAnki">
          <AppIcon name="download" /> 导出 Anki
        </button>
      </div>
    </section>

    <section class="list">
      <article v-if="!picks.length" class="card empty-state">
        <h3><AppIcon name="warning" /> 当前没有可生成的小抄题目</h3>
        <p class="muted">
          可能是题目都被跳过，或当前没有符合“需复习 / 错因 / 高频未掌握”的候选题。
          你可以先恢复跳过题，或去顺序学习补充新的学习记录。
        </p>
        <div class="actions">
          <RouterLink class="btn btn-primary" to="/marks">恢复跳过题</RouterLink>
          <RouterLink class="btn" to="/learn">继续学习</RouterLink>
        </div>
      </article>
      <article v-for="(item, index) in picks" :key="item.question.id" class="card item">
        <div class="rank">#{{ index + 1 }}</div>
        <div class="main">
          <RouterLink :to="`/q/${item.question.categoryId}/${item.question.slug}`">
            {{ item.question.title }}
          </RouterLink>
          <p>{{ stripHtml(item.question.summary || item.question.answer).slice(0, 110) }}</p>
          <div class="meta">
            <span>{{ categoryMap.get(item.question.categoryId) || item.question.categoryId }}</span>
            <span class="tag" :class="`tag-difficulty-${item.question.difficulty}`">
              {{ item.question.difficulty }}
            </span>
            <span v-if="marks.wrongReasonsOf(item.question.id).length">
              {{ marks.wrongReasonsOf(item.question.id).join(' / ') }}
            </span>
            <span class="reason">{{ item.reasons.join(' · ') }}</span>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.cheat-page {
  max-width: 980px;
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
.panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  padding: 16px;
  margin-bottom: 14px;
}
.stats {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 10px;
  flex: 1;
}
.stats div {
  padding: 12px;
  border-radius: var(--radius);
  background: var(--c-bg-soft);
}
.stats b {
  display: block;
  color: var(--c-primary);
  font-size: 22px;
}
.stats span,
.meta {
  color: var(--c-text-mute);
  font-size: 12px;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.list {
  display: grid;
  gap: 10px;
}
.empty-state {
  padding: 16px;
}
.empty-state h3 {
  margin-top: 0;
}
.item {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  padding: 14px;
}
.rank {
  color: var(--c-primary);
  font-weight: 700;
}
.main a {
  color: var(--c-text);
  font-weight: 700;
  text-decoration: none;
}
.main a:hover {
  color: var(--c-primary);
}
.main p {
  margin: 6px 0;
  color: var(--c-text-soft);
  line-height: 1.6;
}
.meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.reason {
  color: var(--c-primary);
}
@media (max-width: 640px) {
  .panel {
    align-items: stretch;
    flex-direction: column;
  }
  .stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
