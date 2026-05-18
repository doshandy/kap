<script setup lang="ts">
import { computed } from 'vue';
import guideRaw from '../../docs/interview-guide.md?raw';
import { renderMarkdown } from '@/lib/parseMarkdown';
import AppIcon from '@/components/icon/AppIcon.vue';

const html = computed(() => renderMarkdown(guideRaw));
const sections = computed(() =>
  [...html.value.matchAll(/<h2[^>]*id="([^"]+)"[^>]*>(.*?)<\/h2>/g)].map((match) => {
    return {
      title: match[2].replace(/<[^>]+>/g, ''),
      hash: `#${match[1]}`,
    };
  }),
);
</script>

<template>
  <div class="guide-page">
    <header class="head card">
      <div>
        <p class="eyebrow">阅读资料</p>
        <h1><AppIcon name="fileText" /> 面试技巧与常见问题</h1>
        <p class="muted">
          这个模块不进入学习计划、复习、抽题和临考，只作为专业技能以外的面试准备手册。
        </p>
      </div>
    </header>

    <div class="layout">
      <aside class="toc card">
        <h2>目录</h2>
        <a v-for="section in sections" :key="section.hash" :href="section.hash">{{
          section.title
        }}</a>
      </aside>
      <article class="card markdown-body guide-content" v-html="html" />
    </div>
  </div>
</template>

<style scoped>
.guide-page {
  max-width: 1180px;
  margin: 0 auto;
}
.head {
  padding: 20px 22px;
  margin-bottom: 14px;
}
.head h1 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}
.eyebrow {
  margin: 0 0 6px;
  color: var(--c-primary);
  font-size: 12px;
  font-weight: 700;
}
.muted {
  color: var(--c-text-mute);
  font-size: 13px;
}
.layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 14px;
  align-items: start;
}
.toc {
  position: sticky;
  top: 16px;
  display: grid;
  gap: 4px;
  padding: 14px;
  max-height: calc(100vh - 120px);
  overflow: auto;
}
.toc h2 {
  margin: 0 0 8px;
  font-size: 15px;
}
.toc a {
  padding: 7px 8px;
  border-radius: var(--radius);
  color: var(--c-text-soft);
  text-decoration: none;
  font-size: 13px;
}
.toc a:hover {
  background: var(--c-bg-soft);
  color: var(--c-primary);
}
.guide-content {
  padding: 22px;
}
.guide-content :deep(h1) {
  display: none;
}
.guide-content :deep(h2) {
  scroll-margin-top: 24px;
}
@media (max-width: 820px) {
  .layout {
    grid-template-columns: 1fr;
  }
  .toc {
    position: static;
    max-height: 220px;
  }
  .guide-content {
    padding: 16px;
  }
}
</style>
