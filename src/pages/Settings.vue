<script setup lang="ts">
import { computed, ref } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import {
  backupJSON,
  exportQuestionsToAnkiTSV,
  exportQuestionsToMarkdown,
  restoreJSON,
} from '@/composables/useExport';
import { clearAll } from '@/stores/persist';
import { useContent } from '@/composables/useContent';
import { useMarksStore } from '@/stores/marks';
import { useProgressStore } from '@/stores/progress';
import AppIcon from '@/components/icon/AppIcon.vue';

const settings = useSettingsStore();
const fileRef = ref<HTMLInputElement | null>(null);
const message = ref('');

const { allQuestions } = useContent();
const marks = useMarksStore();
const progress = useProgressStore();

type ExportSource = 'all' | 'starred' | 'review' | 'mastered';
const exportSource = ref<ExportSource>('starred');

const exportTarget = computed(() => {
  switch (exportSource.value) {
    case 'starred':
      return allQuestions.value.filter((q) => marks.isStarred(q.id));
    case 'review':
      return allQuestions.value.filter((q) => {
        const s = progress.get(q.id).status;
        return s === 'review' || s === 'fuzzy';
      });
    case 'mastered':
      return allQuestions.value.filter((q) => progress.get(q.id).status === 'mastered');
    default:
      return allQuestions.value;
  }
});

async function onFile(e: Event) {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  const ok = await restoreJSON(f);
  message.value = ok ? '✅ 导入成功，刷新生效' : '❌ 文件格式错误';
  if (ok) setTimeout(() => location.reload(), 1000);
}

function onClear() {
  if (confirm('确认清除所有本地数据？此操作不可撤销。')) {
    clearAll();
    location.reload();
  }
}

function onExportMarkdown() {
  const list = exportTarget.value;
  if (!list.length) {
    message.value = '⚠ 选中范围内没有题目可导出';
    return;
  }
  exportQuestionsToMarkdown(list, `kap-cheatsheet-${exportSource.value}.md`);
  message.value = `✅ 已导出 ${list.length} 道题（Markdown 小抄）`;
}

function onExportAnki() {
  const list = exportTarget.value;
  if (!list.length) {
    message.value = '⚠ 选中范围内没有题目可导出';
    return;
  }
  exportQuestionsToAnkiTSV(list, `kap-anki-${exportSource.value}.tsv`);
  message.value = `✅ 已导出 ${list.length} 张 Anki 卡片（TSV，可直接导入 Anki）`;
}
</script>

<template>
  <div class="st">
    <h1><AppIcon name="setting" /> 设置</h1>

    <section class="card grp">
      <h3>外观</h3>
      <div class="row">
        <label>主题：</label>
        <select :value="settings.state.theme" @change="settings.setTheme(($event.target as HTMLSelectElement).value as any)">
          <option value="auto">跟随系统</option>
          <option value="light">浅色</option>
          <option value="dark">深色</option>
        </select>
      </div>
      <div class="row">
        <label>字号：</label>
        <select v-model="settings.state.fontSize">
          <option value="sm">小</option>
          <option value="md">中</option>
          <option value="lg">大</option>
        </select>
      </div>
    </section>

    <section class="card grp">
      <h3>答题</h3>
      <div class="row">
        <label>默认展开答案：</label>
        <input v-model="settings.state.showAnswerByDefault" type="checkbox" />
      </div>
      <div class="row">
        <label>启用快捷键：</label>
        <input v-model="settings.state.shortcutsEnabled" type="checkbox" />
      </div>
    </section>

    <section class="card grp">
      <h3>数据备份</h3>
      <p class="muted">所有进度、笔记、复习状态都保存在本地。建议定期备份，或在切换浏览器时迁移。</p>
      <div class="row">
        <button class="btn btn-primary" @click="backupJSON">
          <AppIcon name="download" /> 导出 JSON 备份
        </button>
        <button class="btn" @click="fileRef?.click()">
          <AppIcon name="upload" /> 导入备份
        </button>
        <input ref="fileRef" type="file" accept="application/json" hidden @change="onFile" />
      </div>
      <div v-if="message" class="msg">{{ message }}</div>
    </section>

    <section class="card grp">
      <h3>导出题库 / 面试小抄</h3>
      <p class="muted">
        把题目导出为 Markdown 小抄方便打印 / 阅读，或导出 Anki 卡片做间隔重复。
      </p>
      <div class="row">
        <label>导出范围：</label>
        <select v-model="exportSource">
          <option value="starred">仅收藏（{{ allQuestions.filter((q) => marks.isStarred(q.id)).length }}）</option>
          <option value="review">仅复习 / 模糊</option>
          <option value="mastered">仅已掌握</option>
          <option value="all">全部题目（{{ allQuestions.length }}）</option>
        </select>
      </div>
      <div class="row">
        <button class="btn btn-primary" :disabled="!exportTarget.length" @click="onExportMarkdown">
          <AppIcon name="fileText" /> 导出 Markdown（{{ exportTarget.length }}）
        </button>
        <button class="btn" :disabled="!exportTarget.length" @click="onExportAnki">
          <AppIcon name="copy" /> 导出 Anki TSV
        </button>
      </div>
    </section>

    <section class="card grp danger">
      <h3>危险操作</h3>
      <button class="btn" @click="onClear">
        <AppIcon name="delete" /> 清除所有本地数据
      </button>
    </section>
  </div>
</template>

<style scoped>
.st {
  max-width: 720px;
  margin: 0 auto;
}
h1 {
  font-size: 22px;
  margin-bottom: 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.row .btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.grp {
  padding: 16px 20px;
  margin-bottom: 14px;
}
.grp h3 {
  font-size: 15px;
  margin-bottom: 10px;
}
.row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0;
}
.row label {
  min-width: 120px;
  font-size: 13px;
  color: var(--c-text-soft);
}
select {
  padding: 4px 10px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  background: var(--c-surface);
}
.muted {
  font-size: 12px;
  color: var(--c-text-mute);
}
.msg {
  margin-top: 8px;
  font-size: 13px;
}
.danger {
  border-left: 3px solid var(--c-danger);
}
</style>
