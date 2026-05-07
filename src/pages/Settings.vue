<script setup lang="ts">
import { ref } from 'vue';
import { useSettingsStore } from '@/stores/settings';
import { backupJSON, restoreJSON } from '@/composables/useExport';
import { clearAll } from '@/stores/persist';
import AppIcon from '@/components/icon/AppIcon.vue';

const settings = useSettingsStore();
const fileRef = ref<HTMLInputElement | null>(null);
const message = ref('');

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
