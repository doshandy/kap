<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import type { Question } from '@/types/content';
import { useProgressStore } from '@/stores/progress';
import { useNotesStore } from '@/stores/notes';
import { useReviewStore } from '@/stores/review';
import { useSettingsStore } from '@/stores/settings';
import { useMarksStore, WRONG_REASON_OPTIONS, type WrongReason } from '@/stores/marks';
import { stripHtml, useSpeechController } from '@/composables/useSpeech';
import { exportQuestionMarkdown } from '@/composables/useExport';
import { useContent } from '@/composables/useContent';
import { buildPrompt, chatGptUrl, domesticAiUrl } from '@/lib/ai';
import { scoreAnswer } from '@/lib/answerScoring';
import { buildReciteCards } from '@/lib/learningExperience';
import AppIcon from '@/components/icon/AppIcon.vue';
import { useAIStore } from '@/stores/ai';

const ShareDialog = defineAsyncComponent(() => import('@/components/share/ShareDialog.vue'));
const CodeRunner = defineAsyncComponent(() => import('@/components/runner/CodeRunner.vue'));
const AIChatPanel = defineAsyncComponent(() => import('@/components/ai/AIChatPanel.vue'));

const props = defineProps<{
  question: Question;
  index?: number;
  defaultOpen?: boolean;
}>();

const progress = useProgressStore();
const notes = useNotesStore();
const review = useReviewStore();
const settings = useSettingsStore();
const marks = useMarksStore();
const router = useRouter();
const { questionMap } = useContent();

const open = ref<boolean>(!!props.defaultOpen || settings.state.showAnswerByDefault);
const revealLevel = ref(settings.state.showAnswerByDefault ? 4 : 1);
const showNote = ref(false);
const shareOpen = ref(false);
const showRunner = ref(false);
const showAIPanel = ref(false);
const showMoreActions = ref(false);
const draftAnswer = ref('');
const aiStore = useAIStore();
const reciteIndex = ref(0);
const MOBILE_READONLY_BREAKPOINT = 768;
const isMobileReadonly = ref(false);
const AI_TIP_KEYS = {
  gpt: 'kap-ai-explain-gpt-tip-seen',
  kimi: 'kap-ai-explain-kimi-tip-seen',
} as const;

const status = computed(() => progress.get(props.question.id).status);
const followupQuestions = computed(() =>
  (props.question.followupQuestionIds || [])
    .map((id) => questionMap.get(id))
    .filter((q): q is Question => Boolean(q)),
);
const parentQuestion = computed(() =>
  props.question.parentId ? questionMap.get(props.question.parentId) : undefined,
);
const relatedQuestions = computed(() =>
  (props.question.relatedQuestionIds || [])
    .map((id) => questionMap.get(id))
    .filter((q): q is Question => Boolean(q)),
);
const localScore = computed(() =>
  draftAnswer.value.trim() ? scoreAnswer(draftAnswer.value, props.question) : undefined,
);
const timelineEvents = computed(() => progress.get(props.question.id).events || []);
const reciteCards = computed(() => buildReciteCards(props.question));
const currentReciteCard = computed(
  () => reciteCards.value[reciteIndex.value] || reciteCards.value[0],
);
const allowWritableInteraction = computed(() => !isMobileReadonly.value);

const { isSpeaking, toggle: toggleSpeak } = useSpeechController(() =>
  stripHtml(props.question.question + ' ' + props.question.answer),
);

function toggle() {
  open.value = !open.value;
  if (open.value) revealLevel.value = Math.max(revealLevel.value, 1);
}

function setStatus(s: 'mastered' | 'review' | 'fuzzy' | 'todo') {
  if (status.value === s) return;
  progress.setStatus(props.question.id, s);
  if (s === 'review' || s === 'fuzzy') review.queueNow(props.question.id, s === 'fuzzy' ? 1 : 0);
  if (s === 'mastered') review.rate(props.question.id, 2);
  if (s === 'todo') review.remove(props.question.id);
}

function markMastered(): void {
  setStatus('mastered');
}

function markReview(): void {
  setStatus('review');
}

function toggleNotePanel(): void {
  showNote.value = !showNote.value;
}

function setReveal(level: number): void {
  revealLevel.value = revealLevel.value >= level ? level - 1 : level;
}

function toggleWrongReason(reason: WrongReason): void {
  const hadReason = marks.hasWrongReason(props.question.id, reason);
  marks.toggleWrongReason(props.question.id, reason);
  progress.addEvent(props.question.id, {
    type: 'wrong-reason',
    label: hadReason ? `移除错因：${reason}` : `新增错因：${reason}`,
    detail: '错因标签调整',
  });
  if (!marks.isStarred(props.question.id)) marks.toggleStar(props.question.id);
}

const noteText = computed({
  get: () => notes.get(props.question.id),
  set: (v) => notes.set(props.question.id, v),
});

function shouldOpenAfterFirstTip(key: string, message: string): boolean {
  try {
    if (window.localStorage.getItem(key)) return true;
  } catch {
    return true;
  }

  const ok = window.confirm(message);
  try {
    window.localStorage.setItem(key, '1');
  } catch {
    // Storage can be unavailable in private mode; skip persistence in that case.
  }
  return ok;
}

async function aiExplain() {
  const prompt = buildPrompt(props.question);
  await navigator.clipboard?.writeText(prompt).catch(() => undefined);
  const ok = shouldOpenAfterFirstTip(
    AI_TIP_KEYS.gpt,
    '将打开外部 ChatGPT，并把当前题目 Prompt 放入 URL。Prompt 已尝试复制到剪贴板；如果你不想把题目内容放到 URL，可取消后手动粘贴。',
  );
  if (!ok) return;
  const opened = window.open(chatGptUrl(prompt), '_blank', 'noopener,noreferrer');
  if (opened) opened.opener = null;
}

async function domesticAiExplain() {
  const prompt = buildPrompt(props.question);
  await navigator.clipboard?.writeText(prompt).catch(() => undefined);
  const ok = shouldOpenAfterFirstTip(
    AI_TIP_KEYS.kimi,
    '将打开国内可访问的 Kimi，并已尝试复制讲解 Prompt。打开后可直接粘贴提问。',
  );
  if (!ok) return;
  const opened = window.open(domesticAiUrl(), '_blank', 'noopener,noreferrer');
  if (opened) opened.opener = null;
}

function copyPromptToClipboard() {
  const prompt = buildPrompt(props.question);
  navigator.clipboard?.writeText(prompt);
}

function clearWrongReasons(): void {
  marks.clearWrongReasons(props.question.id);
  progress.addEvent(props.question.id, {
    type: 'wrong-reason',
    label: '清空错因标签',
  });
}

function formatTime(ts: number): string {
  if (!ts) return '暂无记录';
  return new Date(ts).toLocaleString(undefined, {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function gotoDetail() {
  router.push({
    name: 'question',
    params: { categoryId: props.question.categoryId, slug: props.question.slug },
  });
}

function gotoQuestion(q: Question) {
  router.push({
    name: 'question',
    params: { categoryId: q.categoryId, slug: q.slug },
  });
}

function startFollowupChain(): void {
  router.push({
    name: 'followup-chain',
    params: { categoryId: props.question.categoryId, slug: props.question.slug },
  });
}

function syncMobileReadonly(): void {
  isMobileReadonly.value = window.innerWidth <= MOBILE_READONLY_BREAKPOINT;
}

watch(
  open,
  (isOpen) => {
    if (isOpen) progress.markViewed(props.question.id, '题卡展开');
  },
  { immediate: true },
);

watch(isMobileReadonly, (mobile) => {
  if (!mobile) return;
  showNote.value = false;
  showRunner.value = false;
  showAIPanel.value = false;
});

onMounted(() => {
  syncMobileReadonly();
  window.addEventListener('resize', syncMobileReadonly);
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', syncMobileReadonly);
});

defineExpose({ toggle, markMastered, markReview, toggleNotePanel });
</script>

<template>
  <article class="qcard card" :class="{ 'is-open': open, [`status-${status}`]: true }">
    <header class="hd">
      <div class="hd-left">
        <button class="num" :title="`点击进入详情 #${index ?? ''}`" @click="gotoDetail">
          #{{ index ?? '' }}
        </button>
        <button class="title" :aria-expanded="open" @click="toggle">{{ question.title }}</button>
        <span class="tag" :class="`tag-difficulty-${question.difficulty}`">
          {{ question.difficulty }}
        </span>
        <span v-for="t in question.tags" :key="t" class="tag">#{{ t }}</span>
      </div>
      <div class="hd-right question-actions">
        <button
          class="btn btn-ghost icon-btn"
          :class="{ active: marks.isStarred(question.id) }"
          :title="marks.isStarred(question.id) ? '取消收藏' : '收藏（标星）'"
          :aria-label="marks.isStarred(question.id) ? '取消收藏' : '收藏题目'"
          :aria-pressed="marks.isStarred(question.id)"
          @click="marks.toggleStar(question.id)"
        >
          <AppIcon name="star" />
        </button>
        <button
          class="btn btn-ghost icon-btn"
          :class="{ active: marks.isSkipped(question.id) }"
          :title="marks.isSkipped(question.id) ? '取消跳过' : '跳过这道题（默认列表隐藏）'"
          :aria-label="marks.isSkipped(question.id) ? '取消跳过' : '跳过题目'"
          :aria-pressed="marks.isSkipped(question.id)"
          @click="marks.toggleSkip(question.id)"
        >
          <AppIcon name="skip" />
        </button>
        <span v-if="status === 'mastered'" class="status-badge ok">已掌握</span>
        <span v-else-if="status === 'review' || status === 'fuzzy'" class="status-badge warn">
          需复习
        </span>
        <span v-else class="status-badge mute">未做</span>
        <button
          class="btn btn-ghost"
          :title="open ? '收起（快捷键 Space）' : '展开（快捷键 Space）'"
          :aria-expanded="open"
          @click="toggle"
        >
          {{ open ? '收起' : '展开' }}
        </button>
      </div>
    </header>

    <section class="body">
      <div v-if="question.summary" class="summary">
        <span class="summary-tag">一句话</span>
        <div class="markdown-body" v-html="question.summary" />
      </div>
      <div v-if="open" class="reveal-toolbar">
        <button
          class="chip"
          :class="{ active: revealLevel >= 1 }"
          :aria-pressed="revealLevel >= 1"
          aria-label="显示或隐藏题目"
          title="显示 / 隐藏题目"
          @click="setReveal(1)"
        >
          题目
        </button>
        <button
          class="chip"
          :class="{ active: revealLevel >= 2 }"
          :aria-pressed="revealLevel >= 2"
          aria-label="显示或隐藏核心答案"
          title="显示 / 隐藏核心答案"
          @click="setReveal(2)"
        >
          核心答案
        </button>
        <button
          class="chip"
          :class="{ active: revealLevel >= 3 }"
          :aria-pressed="revealLevel >= 3"
          aria-label="显示或隐藏误区与追问"
          title="显示 / 隐藏误区和追问"
          @click="setReveal(3)"
        >
          误区 / 追问
        </button>
        <button
          class="chip"
          :class="{ active: revealLevel >= 4 }"
          :aria-pressed="revealLevel >= 4"
          aria-label="显示或隐藏完整内容"
          title="显示 / 隐藏完整内容"
          @click="setReveal(4)"
        >
          完整展开
        </button>
      </div>
      <div
        v-if="open && revealLevel >= 1"
        class="markdown-body question-content"
        v-html="question.question"
      />
      <Transition name="fade">
        <div v-if="open" class="answer">
          <div v-if="allowWritableInteraction && revealLevel < 2" class="self-check card-soft">
            <h4><AppIcon name="edit" /> 先试着自己答</h4>
            <textarea
              v-model="draftAnswer"
              rows="4"
              placeholder="先写 3-5 句话，再点「核心答案」对照。"
            />
            <p v-if="localScore" class="score-line">
              当前草稿：<b>{{ localScore.total }}</b> 分 · {{ localScore.level }}
            </p>
          </div>
          <div v-if="revealLevel >= 2" class="markdown-body" v-html="question.answer" />
          <div
            v-if="revealLevel >= 2 && question.code"
            class="markdown-body"
            v-html="question.code"
          />
          <div v-if="revealLevel >= 3 && question.pitfall" class="markdown-body block-pitfall">
            <h4><AppIcon name="warning" /> 常见误区 / 反例</h4>
            <div v-html="question.pitfall" />
          </div>
          <div v-if="revealLevel >= 3 && question.followup" class="markdown-body block-followup">
            <h4><AppIcon name="question" /> 面试官追问</h4>
            <button
              v-if="followupQuestions.length"
              class="btn btn-ghost chain-entry"
              @click="startFollowupChain"
            >
              <AppIcon name="experiment" /> 开始追问链
            </button>
            <ul v-if="followupQuestions.length" class="followup-link-list">
              <li v-for="item in followupQuestions" :key="item.id">
                <button
                  class="followup-link"
                  :title="`查看追问题：${item.title}`"
                  @click="gotoQuestion(item)"
                >
                  {{ item.title.replace(/^追问：/, '') }}
                </button>
              </li>
            </ul>
            <div v-else v-html="question.followup" />
          </div>
          <div v-if="revealLevel >= 4 && parentQuestion" class="related-questions">
            <h4><AppIcon name="bookmark" /> 原题</h4>
            <button
              class="btn btn-ghost related-question"
              :title="`返回原题：${parentQuestion.title}`"
              @click="gotoQuestion(parentQuestion)"
            >
              {{ parentQuestion.title }}
            </button>
          </div>
          <div
            v-if="revealLevel >= 4 && relatedQuestions.length"
            class="related-questions related-links"
          >
            <h4><AppIcon name="link" /> 相关题目</h4>
            <button
              v-for="item in relatedQuestions"
              :key="item.id"
              class="btn btn-ghost related-question"
              :title="`查看相关题目：${item.title}`"
              @click="gotoQuestion(item)"
            >
              <span class="related-title">{{ item.title }}</span>
              <span class="tag" :class="`tag-difficulty-${item.difficulty}`">
                {{ item.difficulty }}
              </span>
            </button>
          </div>
          <div v-if="revealLevel >= 4 && question.extra" class="markdown-body extra-block">
            <h4><AppIcon name="bookmark" /> 延伸</h4>
            <div v-html="question.extra" />
          </div>

          <div v-if="revealLevel >= 2 && currentReciteCard" class="recite-cards card-soft">
            <div class="recite-head">
              <h4><AppIcon name="read" /> 答案背诵卡片</h4>
              <span>{{ reciteIndex + 1 }} / {{ reciteCards.length }}</span>
            </div>
            <article class="recite-card">
              <b>{{ currentReciteCard.title }}</b>
              <p>{{ currentReciteCard.body }}</p>
            </article>
            <div class="recite-nav">
              <button
                class="btn btn-ghost"
                :disabled="reciteIndex === 0"
                @click="reciteIndex = Math.max(0, reciteIndex - 1)"
              >
                上一张
              </button>
              <button
                class="btn btn-ghost"
                :disabled="reciteIndex >= reciteCards.length - 1"
                @click="reciteIndex = Math.min(reciteCards.length - 1, reciteIndex + 1)"
              >
                下一张
              </button>
            </div>
          </div>

          <div v-if="allowWritableInteraction && revealLevel >= 2" class="answer-score card-soft">
            <h4><AppIcon name="trophy" /> 面试回答评分</h4>
            <textarea
              v-model="draftAnswer"
              rows="4"
              placeholder="把你的口述答案写在这里，本地规则会按结论、原理、场景、误区、追问和结构打分。"
            />
            <div v-if="localScore" class="score-result">
              <b>{{ localScore.total }} 分 · {{ localScore.level }}</b>
              <ul v-if="localScore.suggestions.length">
                <li v-for="tip in localScore.suggestions" :key="tip">{{ tip }}</li>
              </ul>
            </div>
          </div>

          <CodeRunner
            v-if="allowWritableInteraction && showRunner"
            :code-html="question.code || ''"
          />

          <AIChatPanel v-if="allowWritableInteraction && showAIPanel" :question="question" />

          <div v-if="allowWritableInteraction && showNote" class="note-box">
            <textarea
              v-model="noteText"
              rows="4"
              placeholder="写下你对这题的理解、补充例子、踩过的坑..."
            />
          </div>

          <div class="wrong-reasons card-soft">
            <h4><AppIcon name="warning" /> 错因标签</h4>
            <div class="wrong-reasons-tags">
              <button
                v-for="reason in WRONG_REASON_OPTIONS"
                :key="reason"
                class="chip"
                :class="{ active: marks.hasWrongReason(question.id, reason) }"
                :aria-pressed="marks.hasWrongReason(question.id, reason)"
                @click="toggleWrongReason(reason)"
              >
                {{ reason }}
              </button>
              <button
                v-if="marks.wrongReasonsOf(question.id).length"
                class="chip"
                aria-label="清空当前题目的错因标签"
                @click="clearWrongReasons"
              >
                清空错因
              </button>
            </div>
          </div>

          <div v-if="timelineEvents.length" class="timeline card-soft">
            <h4><AppIcon name="clock" /> 掌握度时间线</h4>
            <ol>
              <li v-for="event in timelineEvents.slice(0, 6)" :key="`${event.at}-${event.label}`">
                <time>{{ formatTime(event.at) }}</time>
                <span>{{ event.label }}</span>
                <em v-if="event.detail">{{ event.detail }}</em>
              </li>
            </ol>
          </div>

          <div
            class="actions question-actions"
            :class="{ 'show-secondary': showMoreActions }"
            role="group"
            aria-label="题目学习操作"
          >
            <div :id="`q-actions-${question.id}`" class="action-scroll">
              <button
                class="btn primary-action"
                :class="{ 'btn-primary': status === 'mastered' }"
                :title="`标记为已掌握（快捷键 m）`"
                :aria-pressed="status === 'mastered'"
                @click="setStatus('mastered')"
              >
                <AppIcon name="checkCircle" /> 记得
              </button>
              <button
                class="btn primary-action"
                :class="{ 'btn-primary': status === 'fuzzy' }"
                title="标记为模糊（仍记得概念但不熟）"
                :aria-pressed="status === 'fuzzy'"
                @click="setStatus('fuzzy')"
              >
                <AppIcon name="question" /> 模糊
              </button>
              <button
                class="btn primary-action"
                :class="{ 'btn-primary': status === 'review' }"
                title="标记为需要复习（快捷键 r）"
                :aria-pressed="status === 'review'"
                @click="setStatus('review')"
              >
                <AppIcon name="reload" /> 需复习
              </button>
              <button
                v-if="allowWritableInteraction"
                class="btn btn-ghost primary-action note-input-action"
                title="编辑这道题的笔记（快捷键 n）"
                :aria-pressed="showNote"
                @click="showNote = !showNote"
              >
                <AppIcon name="edit" /> 笔记
              </button>
              <button
                class="btn btn-ghost secondary-action more-only-action"
                :title="isSpeaking ? '点击停止朗读' : '朗读题目和答案'"
                :class="{ active: isSpeaking }"
                @click="toggleSpeak"
              >
                <AppIcon :name="isSpeaking ? 'pause' : 'sound'" />
                {{ isSpeaking ? '停止朗读' : '朗读' }}
              </button>
              <button
                v-if="allowWritableInteraction && aiStore.isReady"
                class="btn btn-ghost secondary-action"
                :class="{ active: showAIPanel }"
                :title="showAIPanel ? '收起 AI 站内讲解' : '展开 AI 站内讲解（流式）'"
                @click="showAIPanel = !showAIPanel"
              >
                <AppIcon name="robot" /> AI 讲解（站内）
              </button>
              <button
                class="btn btn-ghost secondary-action"
                title="用 ChatGPT 打开预设 Prompt 求讲解"
                @click="aiExplain"
              >
                <AppIcon name="robot" /> AI 讲解(gpt)
              </button>
              <button
                class="btn btn-ghost"
                title="复制 Prompt 并打开国内免费模型 Kimi"
                @click="domesticAiExplain"
              >
                <AppIcon name="robot" /> AI 讲解(kimi)
              </button>
              <button
                class="btn btn-ghost secondary-action"
                title="复制 AI 讲解的 Prompt 到剪贴板"
                @click="copyPromptToClipboard"
              >
                <AppIcon name="copy" /> 复制 Prompt
              </button>
              <button
                v-if="allowWritableInteraction && question.code"
                class="btn btn-ghost secondary-action"
                :title="showRunner ? '关闭代码沙盒' : '在沙盒里运行示例代码'"
                @click="showRunner = !showRunner"
              >
                <AppIcon :name="showRunner ? 'close' : 'play'" />
                {{ showRunner ? '关闭沙盒' : '在沙盒运行' }}
              </button>
              <button
                class="btn btn-ghost secondary-action more-only-action"
                title="分享题目链接 / 二维码"
                @click="shareOpen = true"
              >
                <AppIcon name="share" /> 分享
              </button>
              <button
                class="btn btn-ghost secondary-action more-only-action"
                title="导出为 Markdown 文件"
                @click="exportQuestionMarkdown(question)"
              >
                <AppIcon name="download" /> MD
              </button>
            </div>
            <button
              class="btn btn-ghost more-toggle"
              :class="{ active: showMoreActions }"
              :aria-expanded="showMoreActions"
              :aria-controls="`q-actions-${question.id}`"
              @click="showMoreActions = !showMoreActions"
            >
              <AppIcon name="appstore" /> {{ showMoreActions ? '收起更多' : '更多' }}
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
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.hd-left {
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  gap: 8px;
  flex-wrap: wrap;
  min-width: 0;
}
.hd-right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
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
  flex: 1 1 360px;
  min-width: min(100%, 220px);
  font-size: 16px;
  line-height: 1.45;
  font-weight: 600;
  color: var(--c-text);
  text-align: left;
  background: transparent;
  padding: 0;
  white-space: normal;
  overflow-wrap: anywhere;
}
.title:hover {
  color: var(--c-primary);
}
.body {
  margin-top: 10px;
}
.summary {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 14px;
  margin-bottom: 10px;
  background: linear-gradient(
    90deg,
    var(--c-primary-soft, rgba(14, 165, 233, 0.12)) 0%,
    transparent 100%
  );
  border-left: 3px solid var(--c-primary);
  border-radius: var(--radius);
  font-size: 14px;
  color: var(--c-text);
}
.summary-tag {
  flex-shrink: 0;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--c-primary);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  margin-top: 1px;
}
.summary :deep(p) {
  margin: 0;
  line-height: 1.6;
}
.answer {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--c-border);
}
.reveal-toolbar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin: 10px 0;
}
.wrong-reasons {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 10px 0;
}
.wrong-reasons-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}
.chip {
  border: 1px solid var(--c-border);
  border-radius: 999px;
  padding: 6px 10px;
  background: var(--c-surface);
  color: var(--c-text-soft);
  font-size: 13px;
}
.chip.active {
  border-color: var(--c-primary);
  color: var(--c-primary);
  background: color-mix(in srgb, var(--c-primary) 10%, transparent);
}
.card-soft {
  padding: 12px;
  margin: 10px 0;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  background: var(--c-bg-soft);
}
.card-soft h4 {
  margin: 0 0 8px;
}
.recite-head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: center;
}
.recite-head span {
  color: var(--c-text-mute);
  font-size: 12px;
}
.recite-card {
  padding: 12px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  background: var(--c-surface);
}
.recite-card b {
  color: var(--c-primary);
}
.recite-card p {
  margin: 8px 0 0;
  line-height: 1.7;
}
.recite-nav {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.timeline ol {
  display: grid;
  gap: 8px;
  padding-left: 20px;
  margin: 0;
}
.timeline time {
  margin-right: 8px;
  color: var(--c-text-mute);
  font-size: 12px;
}
.timeline em {
  display: block;
  margin-top: 2px;
  color: var(--c-text-mute);
  font-style: normal;
  font-size: 12px;
}
.card-soft textarea {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  background: var(--c-surface);
  color: var(--c-text);
  line-height: 1.6;
  resize: vertical;
}
.score-line,
.score-result {
  color: var(--c-primary);
  font-size: 13px;
}
.score-result ul {
  margin: 6px 0 0;
  color: var(--c-text-soft);
}
.answer > .markdown-body :deep(h4) {
  display: inline-flex;
  align-items: center;
  margin: 14px 0 6px;
  padding: 2px 10px;
  border-radius: 999px;
  background: var(--c-bg-mute);
  color: var(--c-text-soft);
  font-size: 13px;
}
.answer > .markdown-body :deep(ul) {
  padding-left: 22px;
}
.answer > .markdown-body :deep(li) {
  margin: 6px 0;
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
.block-pitfall,
.block-followup {
  margin-top: 10px;
  padding: 10px 14px;
  border-radius: var(--radius);
  border-left: 3px solid;
}
.block-pitfall {
  background: rgba(245, 158, 11, 0.08);
  border-left-color: var(--c-warning, #f59e0b);
}
.block-followup {
  background: rgba(99, 102, 241, 0.08);
  border-left-color: #6366f1;
}
.block-pitfall h4,
.block-followup h4 {
  margin: 0 0 6px;
  font-size: 13px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.block-pitfall h4 {
  color: var(--c-warning, #d97706);
}
.block-followup h4 {
  color: #4f46e5;
}
.block-pitfall :deep(p),
.block-followup :deep(p) {
  margin: 4px 0;
}
.followup-link-list {
  margin: 6px 0 0;
  padding-left: 20px;
}
.followup-link-list li {
  margin: 6px 0;
  padding-left: 2px;
}
.followup-link {
  color: var(--c-text);
  line-height: 1.7;
  text-align: left;
  text-decoration: none;
  background: transparent;
  padding: 0;
}
.followup-link:hover {
  color: var(--c-primary);
}
.chain-entry {
  margin: 4px 0 6px;
}
.related-questions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 10px;
  padding: 10px 14px;
  border-radius: var(--radius);
  background: var(--c-bg-soft);
}
.related-questions h4 {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  margin: 0;
  font-size: 13px;
  color: var(--c-text-soft);
}
.related-question {
  max-width: 100%;
  text-align: left;
}
.related-links {
  align-items: flex-start;
}
.related-links h4 {
  padding-top: 6px;
}
.related-links .related-question {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: normal;
}
.related-title {
  overflow-wrap: anywhere;
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
  align-items: center;
  gap: 6px;
  margin-top: 14px;
  overflow: visible;
}
.action-scroll {
  display: flex;
  flex: 1 1 auto;
  gap: 6px;
  min-width: 0;
  overflow-x: auto;
  padding-bottom: 4px;
}
.actions .btn {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  gap: 4px;
  white-space: nowrap;
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
.actions .btn.active {
  color: var(--c-primary);
  background: var(--c-primary-soft);
}
.more-toggle {
  display: inline-flex;
  flex: 0 0 auto;
  justify-content: center;
  margin-left: auto;
}
.actions .secondary-action {
  display: none;
}
.actions.show-secondary .secondary-action {
  display: inline-flex;
}
.icon-btn {
  padding: 4px 8px;
}
.icon-btn.active {
  color: var(--c-primary);
  background: var(--c-primary-soft);
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
@media (max-width: 768px) {
  .self-check,
  .answer-score,
  .note-box,
  .note-input-action {
    display: none;
  }
}
@media (max-width: 560px) {
  .qcard {
    padding: 14px;
    margin-bottom: 12px;
  }
  .hd {
    gap: 10px;
  }
  .hd-left,
  .hd-right {
    width: 100%;
  }
  .hd-right {
    justify-content: space-between;
    gap: 6px;
  }
  .title {
    flex-basis: 100%;
    min-width: 0;
    font-size: 15px;
  }
  .summary {
    flex-direction: column;
    gap: 6px;
    padding: 10px 12px;
  }
  .actions {
    align-items: stretch;
    flex-wrap: wrap;
  }
  .action-scroll {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    overflow: visible;
  }
  .actions .btn {
    width: 100%;
    justify-content: center;
  }
  .action-scroll .primary-action {
    min-height: 40px;
  }
  .more-toggle {
    width: 100%;
    min-height: 40px;
  }
  .actions kbd {
    display: none;
  }
  .icon-btn {
    min-width: 40px;
    min-height: 40px;
  }
}
</style>
