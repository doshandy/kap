<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useContent } from '@/composables/useContent';
import { useMarksStore } from '@/stores/marks';
import { useProgressStore } from '@/stores/progress';
import { useSettingsStore } from '@/stores/settings';
import QuestionCard from '@/components/question/QuestionCard.vue';

const route = useRoute();
const router = useRouter();
const { getQuestion, getCategory, allQuestions } = useContent();
const marks = useMarksStore();
const progress = useProgressStore();
const settings = useSettingsStore();

type QuestionCardExpose = {
  toggle: () => void;
  markMastered: () => void;
  markReview: () => void;
  toggleNotePanel: () => void;
};
const cardRef = ref<QuestionCardExpose | null>(null);

const q = computed(() =>
  getQuestion(route.params.categoryId as string, route.params.slug as string),
);
const cat = computed(() => (q.value ? getCategory(q.value.categoryId) : undefined));
const activeQuestions = computed(() =>
  allQuestions.value.filter((item) => !marks.isSkipped(item.id)),
);
const activeQuestionIds = computed(() => new Set(activeQuestions.value.map((item) => item.id)));

watchEffect(() => {
  if (q.value) document.title = `${q.value.title} · KAP`;
});

watch(
  () => q.value?.id,
  (id) => {
    if (!id || marks.isSkipped(id)) return;
    progress.markViewed(id, '题目详情');
  },
  { immediate: true },
);

const idx = computed(() =>
  q.value ? activeQuestions.value.findIndex((x) => x.id === q.value!.id) : -1,
);

const canPage = computed(() => {
  if (!q.value) return false;
  if (!marks.isSkipped(q.value.id)) return activeQuestions.value.length > 1;
  return activeQuestions.value.length > 0;
});

function gotoOffset(d: number) {
  const question = q.value;
  if (!question || !canPage.value) return;

  if (!marks.isSkipped(question.id)) {
    if (idx.value < 0 || !activeQuestions.value.length) return;
    const next =
      activeQuestions.value[
        (idx.value + d + activeQuestions.value.length) % activeQuestions.value.length
      ];
    router.push({ name: 'question', params: { categoryId: next.categoryId, slug: next.slug } });
    return;
  }

  const all = allQuestions.value;
  const start = all.findIndex((item) => item.id === question.id);
  if (start < 0) return;
  for (let step = 1; step <= all.length; step++) {
    const cursor = (start + d * step + all.length) % all.length;
    const candidate = all[cursor];
    if (activeQuestionIds.value.has(candidate.id)) {
      router.push({
        name: 'question',
        params: { categoryId: candidate.categoryId, slug: candidate.slug },
      });
      return;
    }
  }
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  return tag === 'input' || tag === 'textarea' || target.isContentEditable;
}

function onShortcutKey(event: KeyboardEvent): void {
  if (!settings.state.shortcutsEnabled) return;
  if (isEditableTarget(event.target)) return;
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  if (!cardRef.value) return;

  if (event.key === ' ') {
    event.preventDefault();
    cardRef.value.toggle();
  } else if (event.key === 'm') {
    event.preventDefault();
    cardRef.value.markMastered();
  } else if (event.key === 'r') {
    event.preventDefault();
    cardRef.value.markReview();
  } else if (event.key === 'n') {
    event.preventDefault();
    cardRef.value.toggleNotePanel();
  }
}

onMounted(() => {
  window.addEventListener('keydown', onShortcutKey);
});

onUnmounted(() => {
  window.removeEventListener('keydown', onShortcutKey);
});
</script>

<template>
  <div v-if="q" class="qd">
    <nav class="crumb">
      <RouterLink to="/">总览</RouterLink>
      <span> / </span>
      <RouterLink :to="`/c/${q.categoryId}`"> {{ cat?.icon }} {{ cat?.title }} </RouterLink>
      <span> / </span>
      <span>{{ q.title }}</span>
    </nav>
    <QuestionCard
      ref="cardRef"
      :question="q"
      :index="idx >= 0 ? idx + 1 : undefined"
      :default-open="true"
    />
    <p v-if="marks.isSkipped(q.id)" class="skip-note">
      这道题已标记为跳过；上一题/下一题会自动跳转到附近未跳过题目。
    </p>
    <div class="paging">
      <button class="btn" :disabled="!canPage" @click="gotoOffset(-1)">← 上一题 (k)</button>
      <button class="btn" :disabled="!canPage" @click="gotoOffset(1)">下一题 → (j)</button>
    </div>
  </div>
  <div v-else class="empty">
    <p>该题目不存在，可能是链接拼错或题目已重命名。</p>
    <p class="hint">分享时请使用页面右上角的"分享"按钮自动生成正确链接。</p>
    <RouterLink to="/" class="btn btn-primary">回到总览</RouterLink>
  </div>
</template>

<style scoped>
.qd {
  max-width: 920px;
  margin: 0 auto;
}
.crumb {
  font-size: 12px;
  color: var(--c-text-mute);
  margin-bottom: 12px;
}
.crumb a {
  color: var(--c-text-soft);
}
.paging {
  display: flex;
  justify-content: space-between;
  margin-top: 16px;
}
.skip-note {
  margin-top: 10px;
  font-size: 12px;
  color: var(--c-text-mute);
}
.empty {
  padding: 60px 20px;
  text-align: center;
  color: var(--c-text-mute);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.empty .hint {
  font-size: 12px;
}
@media (max-width: 560px) {
  .crumb {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .paging {
    gap: 8px;
  }
  .paging .btn {
    flex: 1;
    justify-content: center;
    text-align: center;
  }
}
</style>
