<script setup lang="ts">
import { computed } from 'vue';
import { markdown } from '@/lib/parseMarkdown';
import raw from '../../CHANGELOG.md?raw';
import AppIcon from '@/components/icon/AppIcon.vue';

const html = computed(() => markdown.render(raw));
</script>

<template>
  <div class="cl">
    <header>
      <h1><AppIcon name="fileText" /> 更新日志</h1>
    </header>
    <div class="markdown-body" v-html="html" />
  </div>
</template>

<style scoped>
.cl {
  max-width: 800px;
  margin: 0 auto;
}
header h1 {
  font-size: 22px;
  margin-bottom: 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
</style>
