<script setup lang="ts">
import { computed, watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useContent } from '@/composables/useContent';
import QuestionCard from '@/components/question/QuestionCard.vue';

const route = useRoute();
const router = useRouter();
const { getQuestion, getCategory, allQuestions } = useContent();

const q = computed(() =>
  getQuestion(route.params.categoryId as string, route.params.slug as string),
);
const cat = computed(() => (q.value ? getCategory(q.value.categoryId) : undefined));

watchEffect(() => {
  if (q.value) document.title = `${q.value.title} · KAP`;
});

const idx = computed(() =>
  q.value ? allQuestions.value.findIndex((x) => x.id === q.value!.id) : -1,
);

function gotoOffset(d: number) {
  if (idx.value < 0) return;
  const next =
    allQuestions.value[(idx.value + d + allQuestions.value.length) % allQuestions.value.length];
  router.push({ name: 'question', params: { categoryId: next.categoryId, slug: next.slug } });
}
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
    <QuestionCard :question="q" :index="idx + 1" :default-open="true" />
    <div class="paging">
      <button class="btn" @click="gotoOffset(-1)">← 上一题 (k)</button>
      <button class="btn" @click="gotoOffset(1)">下一题 → (j)</button>
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
