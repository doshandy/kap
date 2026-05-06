<script setup lang="ts">
import { computed } from 'vue';
import { markdown } from '@/lib/parseMarkdown';
import raw from '../../CHANGELOG.md?raw';

const html = computed(() => markdown.render(raw));
</script>

<template>
  <div class="cl">
    <header>
      <h1>📝 更新日志</h1>
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
}
</style>
