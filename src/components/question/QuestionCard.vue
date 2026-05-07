<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { Question } from '@/types/content';
import { useProgressStore } from '@/stores/progress';
import { useNotesStore } from '@/stores/notes';
import { useReviewStore } from '@/stores/review';
import { useSettingsStore } from '@/stores/settings';
import { speak, stopSpeak, stripHtml } from '@/composables/useSpeech';
import { exportQuestionMarkdown } from '@/composables/useExport';
import { buildPrompt, chatGptUrl } from '@/lib/ai';
import ShareDialog from '@/components/share/ShareDialog.vue';
import CodeRunner from '@/components/runner/CodeRunner.vue';
import AppIcon from '@/components/icon/AppIcon.vue';

const props = defineProps<{
  question: Question;
  index?: number;
  defaultOpen?: boolean;
}>();

const progress = useProgressStore();
const notes = useNotesStore();
const review = useReviewStore();
const settings = useSettingsStore();
const router = useRouter();

const open = ref<boolean>(!!props.defaultOpen || settings.state.showAnswerByDefault);
const showNote = ref(false);
const shareOpen = ref(false);
const showRunner = ref(false);

const status = computed(() => progress.get(props.question.id).status);

function toggle() {
  open.value = !open.value;
}

function setStatus(s: 'mastered' | 'review' | 'fuzzy' | 'todo') {
  progress.setStatus(props.question.id, s);
  if (s === 'review' || s === 'fuzzy') review.rate(props.question.id, s === 'fuzzy' ? 1 : 0);
  if (s === 'mastered') review.rate(props.question.id, 2);
}

const noteText = computed({
  get: () => notes.get(props.question.id),
  set: (v) => notes.set(props.question.id, v),
});

function readQuestion() {
  speak(stripHtml(props.question.question + ' ' + props.question.answer));
}

function aiExplain() {
  const prompt = buildPrompt(props.question);
  window.open(chatGptUrl(prompt), '_blank');
}

function copyPromptToClipboard() {
  const prompt = buildPrompt(props.question);
  navigator.clipboard?.writeText(prompt);
}

function gotoDetail() {
  router.push({
    name: 'question',
    params: { categoryId: props.question.categoryId, slug: props.question.slug },
  });
}

defineExpose({ toggle });
</script>

<template>
  <article class="qcard card" :class="{ 'is-open': open, [`status-${status}`]: true }">
    <header class="hd">
      <div class="hd-left">
        <button class="num" :title="`点击进入详情 #${index ?? ''}`" @click="gotoDetail">
          #{{ index ?? '' }}
        </button>
        <button class="title" @click="toggle">{{ question.title }}</button>
        <span class="tag" :class="`tag-difficulty-${question.difficulty}`">
          {{ question.difficulty }}
        </span>
        <span v-for="t in question.tags" :key="t" class="tag">#{{ t }}</span>
      </div>
      <div class="hd-right question-actions">
        <span v-if="status === 'mastered'" class="status-badge ok">已掌握</span>
        <span v-else-if="status === 'review' || status === 'fuzzy'" class="status-badge warn">
          需复习
        </span>
        <span v-else class="status-badge mute">未做</span>
        <button class="btn btn-ghost" :title="open ? '收起 (Space)' : '展开 (Space)'" @click="toggle">
          {{ open ? '收起' : '展开' }}
        </button>
      </div>
    </header>

    <section class="body">
      <div class="markdown-body" v-html="question.question" />
      <Transition name="fade">
        <div v-if="open" class="answer">
          <div class="markdown-body" v-html="question.answer" />
          <div v-if="question.code" class="markdown-body" v-html="question.code" />
          <div v-if="question.extra" class="markdown-body extra-block">
            <h4>📌 延伸</h4>
            <div v-html="question.extra" />
          </div>

          <CodeRunner v-if="showRunner" :code-html="question.code || ''" />

          <div v-if="showNote" class="note-box">
            <textarea
              v-model="noteText"
              rows="4"
              placeholder="写下你对这题的理解、补充例子、踩过的坑..."
            />
          </div>

          <div class="actions question-actions">
            <button
              class="btn"
              :class="{ 'btn-primary': status === 'mastered' }"
              @click="setStatus('mastered')"
            >
              <AppIcon name="checkCircle" /> 记得 <kbd>m</kbd>
            </button>
            <button
              class="btn"
              :class="{ 'btn-primary': status === 'fuzzy' }"
              @click="setStatus('fuzzy')"
            >
              <AppIcon name="question" /> 模糊
            </button>
            <button
              class="btn"
              :class="{ 'btn-primary': status === 'review' }"
              @click="setStatus('review')"
            >
              <AppIcon name="reload" /> 需复习 <kbd>r</kbd>
            </button>
            <button class="btn btn-ghost" @click="showNote = !showNote">
              <AppIcon name="edit" /> 笔记 <kbd>n</kbd>
            </button>
            <button class="btn btn-ghost" @click="readQuestion">
              <AppIcon name="sound" /> 朗读
            </button>
            <button class="btn btn-ghost" title="停止朗读" @click="stopSpeak">
              <AppIcon name="pause" />
            </button>
            <button class="btn btn-ghost" @click="aiExplain">
              <AppIcon name="robot" /> AI 讲解
            </button>
            <button class="btn btn-ghost" @click="copyPromptToClipboard">
              <AppIcon name="copy" /> 复制 Prompt
            </button>
            <button v-if="question.code" class="btn btn-ghost" @click="showRunner = !showRunner">
              <AppIcon :name="showRunner ? 'close' : 'play'" />
              {{ showRunner ? '关闭沙盒' : '在沙盒运行' }}
            </button>
            <button class="btn btn-ghost" @click="shareOpen = true">
              <AppIcon name="share" /> 分享
            </button>
            <button class="btn btn-ghost" @click="exportQuestionMarkdown(question)">
              <AppIcon name="download" /> MD
            </button>
          </div>
        </div>
      </Transition>
    </section>

    <ShareDialog v-model:open="shareOpen" :question="question" />
  </article>
</template>

<style scoped>
.qcard {
  padding: 16px 20px;
  margin-bottom: 14px;
  border-left: 3px solid transparent;
  transition: border-color 0.2s;
}
.qcard.status-mastered {
  border-left-color: var(--c-success);
}
.qcard.status-review,
.qcard.status-fuzzy {
  border-left-color: var(--c-warning);
}
.hd {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  flex-wrap: wrap;
}
.hd-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.hd-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
.num {
  font-family: monospace;
  font-size: 12px;
  color: var(--c-text-mute);
  background: var(--c-bg-mute);
  padding: 2px 8px;
  border-radius: 4px;
}
.title {
  font-size: 16px;
  font-weight: 600;
  color: var(--c-text);
  text-align: left;
  background: transparent;
  padding: 0;
}
.title:hover {
  color: var(--c-primary);
}
.body {
  margin-top: 10px;
}
.answer {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--c-border);
}
.extra-block {
  margin-top: 8px;
  padding: 10px 14px;
  background: var(--c-bg-soft);
  border-radius: var(--radius);
}
.extra-block h4 {
  margin: 0 0 6px;
  font-size: 13px;
  color: var(--c-text-soft);
}
.note-box {
  margin-top: 12px;
}
.note-box textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  background: var(--c-bg);
  resize: vertical;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 14px;
}
.actions .btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.actions kbd {
  display: inline-block;
  padding: 0 4px;
  font-family: monospace;
  font-size: 11px;
  background: var(--c-bg-mute);
  border-radius: 3px;
  color: var(--c-text-mute);
}
.status-badge {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 999px;
}
.status-badge.ok {
  background: rgba(16, 185, 129, 0.15);
  color: var(--c-success);
}
.status-badge.warn {
  background: rgba(245, 158, 11, 0.15);
  color: var(--c-warning);
}
.status-badge.mute {
  background: var(--c-bg-mute);
  color: var(--c-text-mute);
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
