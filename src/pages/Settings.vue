<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
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
import { useAIStore } from '@/stores/ai';
import AppIcon from '@/components/icon/AppIcon.vue';
import { useAppUpdate } from '@/composables/useAppUpdate';

const settings = useSettingsStore();
const update = useAppUpdate();
const updateMsg = ref('');
const forcing = ref(false);
let updateMsgTimer: number | null = null;

function setTransientMessage(message: string, ms = 5000): void {
  updateMsg.value = message;
  if (updateMsgTimer != null) window.clearTimeout(updateMsgTimer);
  if (ms <= 0) {
    updateMsgTimer = null;
    return;
  }
  updateMsgTimer = window.setTimeout(() => {
    updateMsg.value = '';
    updateMsgTimer = null;
  }, ms);
}

async function onCheckUpdate() {
  setTransientMessage('正在检查更新…', 0);
  try {
    const has = await update.checkForUpdates();
    setTransientMessage(
      has ? '✅ 已检测到新版本，请在更新提示中点击「立即更新」' : '✅ 当前已经是最新版本',
    );
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    setTransientMessage(`❌ 检查更新失败：${reason}`);
  }
}

async function onForceReload() {
  if (
    !confirm(
      '强制更新会卸载本地缓存（Service Worker / 离线资源）并刷新页面，本地学习数据不会丢失。是否继续？',
    )
  ) {
    return;
  }
  forcing.value = true;
  try {
    await update.forceReload();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    setTransientMessage(`❌ 强制更新失败：${reason}`);
  } finally {
    forcing.value = false;
  }
}
const ai = useAIStore();
const fileRef = ref<HTMLInputElement | null>(null);
const message = ref('');
const fieldIds = {
  theme: 'settings-theme',
  fontSize: 'settings-font-size',
  showAnswer: 'settings-show-answer',
  shortcuts: 'settings-shortcuts',
  backupFile: 'settings-backup-file',
  aiEnabled: 'settings-ai-enabled',
  aiProvider: 'settings-ai-provider',
  aiBaseUrl: 'settings-ai-base-url',
  aiApiKey: 'settings-ai-api-key',
  aiRemember: 'settings-ai-remember',
  aiModel: 'settings-ai-model',
  aiRole: 'settings-ai-role',
  aiTemperature: 'settings-ai-temperature',
  exportSource: 'settings-export-source',
} as const;
const messageId = 'settings-message';
const updateMessageId = 'settings-update-message';

const { allQuestions } = useContent();
const marks = useMarksStore();
const progress = useProgressStore();

type ExportSource = 'all' | 'starred' | 'review' | 'mastered';
const exportSource = ref<ExportSource>('starred');
const exportCountBySource = computed(() => {
  let starred = 0;
  let review = 0;
  let mastered = 0;
  for (const question of allQuestions.value) {
    if (marks.isStarred(question.id)) starred++;
    const status = progress.get(question.id).status;
    if (status === 'review' || status === 'fuzzy') review++;
    if (status === 'mastered') mastered++;
  }
  return {
    starred,
    review,
    mastered,
    all: allQuestions.value.length,
  };
});

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
  if (fileRef.value) fileRef.value.value = '';
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

onBeforeUnmount(() => {
  if (updateMsgTimer != null) window.clearTimeout(updateMsgTimer);
  updateMsgTimer = null;
});
</script>

<template>
  <div class="st">
    <h1><AppIcon name="setting" /> 设置</h1>

    <section class="card grp">
      <h3>外观</h3>
      <div class="row">
        <label :for="fieldIds.theme">主题：</label>
        <select
          :id="fieldIds.theme"
          class="ui-select"
          :value="settings.state.theme"
          @change="settings.setTheme(($event.target as HTMLSelectElement).value as any)"
        >
          <option value="auto">跟随系统</option>
          <option value="light">浅色</option>
          <option value="dark">深色</option>
        </select>
      </div>
      <div class="row">
        <label :for="fieldIds.fontSize">字号：</label>
        <select :id="fieldIds.fontSize" v-model="settings.state.fontSize" class="ui-select">
          <option value="sm">小</option>
          <option value="md">中</option>
          <option value="lg">大</option>
        </select>
      </div>
    </section>

    <section class="card grp">
      <h3>答题</h3>
      <div class="row">
        <label :for="fieldIds.showAnswer">默认展开答案：</label>
        <input
          :id="fieldIds.showAnswer"
          v-model="settings.state.showAnswerByDefault"
          class="ui-checkbox"
          type="checkbox"
        />
      </div>
      <div class="row">
        <label :for="fieldIds.shortcuts">启用快捷键：</label>
        <input
          :id="fieldIds.shortcuts"
          v-model="settings.state.shortcutsEnabled"
          class="ui-checkbox"
          type="checkbox"
        />
      </div>
    </section>

    <section class="card grp">
      <h3>数据备份</h3>
      <p class="muted">
        所有进度、笔记、复习状态都保存在本地。建议定期备份，或在切换浏览器时迁移。
      </p>
      <div class="row">
        <button type="button" class="btn btn-primary" @click="backupJSON">
          <AppIcon name="download" /> 导出 JSON 备份
        </button>
        <button
          type="button"
          class="btn"
          :aria-controls="fieldIds.backupFile"
          @click="fileRef?.click()"
        >
          <AppIcon name="upload" /> 导入备份
        </button>
        <input
          :id="fieldIds.backupFile"
          ref="fileRef"
          type="file"
          accept="application/json"
          hidden
          @change="onFile"
        />
      </div>
      <div v-if="message" :id="messageId" class="msg" role="status" aria-live="polite">
        {{ message }}
      </div>
    </section>

    <section class="card grp">
      <h3>AI 讲解（可选）</h3>
      <p class="muted">
        配置后可在题目页内嵌 AI 流式讲解 / 模拟面试官追问。所有请求由你的浏览器直接发往 OpenAI /
        Anthropic / 兼容 API；KAP 服务端永远不会经手 API Key 或对话内容。
      </p>
      <p class="muted">
        默认情况下 API Key 只保存在当前页面会话中；只有勾选“记住 API Key”才会写入本机 localStorage。
      </p>
      <div class="row">
        <label :for="fieldIds.aiEnabled">启用：</label>
        <input
          :id="fieldIds.aiEnabled"
          v-model="ai.state.enabled"
          class="ui-checkbox"
          type="checkbox"
        />
      </div>
      <div class="row">
        <label :for="fieldIds.aiProvider">提供方：</label>
        <select
          :id="fieldIds.aiProvider"
          class="ui-select"
          :value="ai.state.provider"
          @change="ai.setProvider(($event.target as HTMLSelectElement).value as any)"
        >
          <option value="openai">OpenAI 兼容（GPT、DeepSeek、Kimi、SiliconFlow 等）</option>
          <option value="anthropic">Anthropic Claude</option>
          <option value="custom">自定义</option>
        </select>
      </div>
      <div class="row">
        <label :for="fieldIds.aiBaseUrl">Base URL：</label>
        <input
          :id="fieldIds.aiBaseUrl"
          v-model="ai.state.baseUrl"
          class="ui-input"
          placeholder="https://api.openai.com"
          :aria-describedby="ai.baseUrlWarning ? 'ai-base-url-warning' : undefined"
        />
      </div>
      <p
        v-if="ai.baseUrlWarning"
        id="ai-base-url-warning"
        class="warn-msg"
        role="status"
        aria-live="polite"
      >
        {{ ai.baseUrlWarning }}
      </p>
      <div class="row">
        <label :for="fieldIds.aiApiKey">API Key：</label>
        <input
          :id="fieldIds.aiApiKey"
          v-model="ai.state.apiKey"
          class="ui-input"
          type="password"
          placeholder="sk-..."
          autocomplete="off"
          spellcheck="false"
          autocapitalize="off"
          autocorrect="off"
          inputmode="text"
          name="kap-ai-apikey"
        />
        <button
          v-if="ai.state.apiKey"
          type="button"
          class="link-btn"
          title="清除 API Key"
          @click="ai.forgetApiKey()"
        >
          清除
        </button>
      </div>
      <div class="row">
        <label :for="fieldIds.aiRemember">记住 API Key：</label>
        <input
          :id="fieldIds.aiRemember"
          v-model="ai.state.rememberApiKey"
          class="ui-checkbox"
          type="checkbox"
        />
        <span id="ai-remember-hint" class="hint"
          >仅在自己的设备上使用；关闭后会清除本地保存的 Key。</span
        >
      </div>
      <p class="muted" style="font-size: 12px; margin-top: -4px">
        浏览器直连会把 Key 发送到上面的 Base URL。生产环境推荐自建代理后端，避免在端上落 Key。
      </p>
      <div class="row">
        <label :for="fieldIds.aiModel">模型：</label>
        <input
          :id="fieldIds.aiModel"
          v-model="ai.state.model"
          class="ui-input"
          placeholder="gpt-4o-mini / claude-3-5-sonnet-..."
        />
      </div>
      <div class="row">
        <label :for="fieldIds.aiRole">角色：</label>
        <select :id="fieldIds.aiRole" v-model="ai.state.systemRole" class="ui-select">
          <option value="mentor">资深导师（讲解为主）</option>
          <option value="interviewer">严格面试官（追问为主）</option>
          <option value="concise">极简助手（要点为主）</option>
        </select>
      </div>
      <div class="row">
        <label :for="fieldIds.aiTemperature">Temperature：</label>
        <input
          :id="fieldIds.aiTemperature"
          v-model.number="ai.state.temperature"
          class="ui-input"
          type="number"
          min="0"
          max="1"
          step="0.1"
          style="width: 80px"
          aria-describedby="ai-temperature-hint"
        />
        <span id="ai-temperature-hint" class="hint">0 严谨 → 1 发散</span>
      </div>
      <p
        v-if="!ai.state.apiKey && ai.state.enabled"
        class="warn-msg"
        role="status"
        aria-live="polite"
      >
        ⚠ 启用了 AI 但还没填 API Key，题目页将仍提示"未启用"。
      </p>
    </section>

    <section class="card grp">
      <h3>导出题库 / 面试小抄</h3>
      <p class="muted">把题目导出为 Markdown 小抄方便打印 / 阅读，或导出 Anki 卡片做间隔重复。</p>
      <div class="row">
        <label :for="fieldIds.exportSource">导出范围：</label>
        <select :id="fieldIds.exportSource" v-model="exportSource" class="ui-select">
          <option value="starred">仅收藏（{{ exportCountBySource.starred }}）</option>
          <option value="review">仅复习 / 模糊（{{ exportCountBySource.review }}）</option>
          <option value="mastered">仅已掌握（{{ exportCountBySource.mastered }}）</option>
          <option value="all">全部题目（{{ exportCountBySource.all }}）</option>
        </select>
      </div>
      <div class="row">
        <button
          type="button"
          class="btn btn-primary"
          :disabled="!exportTarget.length"
          @click="onExportMarkdown"
        >
          <AppIcon name="fileText" /> 导出 Markdown（{{ exportTarget.length }}）
        </button>
        <button type="button" class="btn" :disabled="!exportTarget.length" @click="onExportAnki">
          <AppIcon name="copy" /> 导出 Anki TSV
        </button>
      </div>
    </section>

    <section class="card grp">
      <h3>应用更新</h3>
      <p class="muted">
        KAP 是一个 PWA，离线资源会被缓存以提升加载速度。如果发现题目数量、UI
        与最新版本不一致（例如部署后看到的还是旧版），可以在这里手动检查或强制刷新。
      </p>
      <div class="row">
        <button type="button" class="btn" :disabled="update.checking.value" @click="onCheckUpdate">
          <AppIcon name="reload" />
          {{ update.checking.value ? '检查中…' : '检查更新' }}
        </button>
        <button type="button" class="btn" :disabled="forcing" @click="onForceReload">
          <AppIcon name="warning" />
          {{ forcing ? '正在重置…' : '强制更新（清缓存）' }}
        </button>
      </div>
      <p v-if="update.needRefresh.value" class="hint">
        当前有新版本可用，可直接点屏幕右下角的「立即更新」。
      </p>
      <p v-if="update.offlineReady.value" class="hint">✅ 已支持离线访问。</p>
      <div v-if="updateMsg" :id="updateMessageId" class="msg" role="status" aria-live="polite">
        {{ updateMsg }}
      </div>
    </section>

    <section class="card grp danger">
      <h3>危险操作</h3>
      <button type="button" class="btn" @click="onClear">
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
.link-btn {
  background: transparent;
  border: none;
  color: var(--c-primary);
  cursor: pointer;
  font-size: 12px;
  padding: 4px 8px;
}
.link-btn:hover {
  text-decoration: none;
  opacity: 0.9;
}
h1 {
  font-size: 20px;
  margin-bottom: 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.grp {
  padding: 14px 18px;
  margin-bottom: 12px;
}
.grp h3 {
  font-size: 14px;
  margin-bottom: 10px;
  font-weight: 600;
  color: var(--c-text);
}

.row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 6px 0;
  font-size: 13px;
}
.row label {
  flex-shrink: 0;
  width: 88px;
  font-size: 12.5px;
  color: var(--c-text-soft);
}
.row .btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  padding: 5px 12px;
}

.row .ui-input,
.row .ui-select,
.row input[type='text'],
.row input[type='password'],
.row input[type='url'],
.row input[type='number'],
.row input:not([type]),
.row select {
  flex: 1;
  min-width: 0;
  height: 32px;
  padding: 0 10px;
  font-size: 12.5px;
  line-height: 1.4;
  font-family: inherit;
  box-sizing: border-box;
}
.row input[type='number'] {
  flex: 0 0 auto;
  width: 90px;
}

.row .ui-select {
  cursor: pointer;
}
.row input::placeholder {
  color: var(--c-text-mute);
}

.row .ui-checkbox {
  flex: 0 0 auto;
}

.muted {
  font-size: 12px;
  color: var(--c-text-mute);
  line-height: 1.6;
}
.msg {
  margin-top: 8px;
  font-size: 12.5px;
  color: var(--c-text-soft);
}
.danger {
  border-left: 3px solid var(--c-danger);
}
.hint {
  font-size: 11.5px;
  color: var(--c-text-mute);
  margin-top: 6px;
}
.warn-msg {
  margin-top: 8px;
  font-size: 12px;
  color: var(--c-warning, #d97706);
}

@media (max-width: 560px) {
  .st {
    max-width: none;
  }
  h1 {
    font-size: 18px;
  }
  .grp {
    padding: 14px;
  }
  .row {
    align-items: stretch;
    gap: 8px;
    margin: 10px 0;
    font-size: 14px;
  }
  .row label {
    width: 100%;
    font-size: 13px;
  }
  .row .btn,
  .link-btn {
    min-height: 44px;
    justify-content: center;
    font-size: 14px;
  }
  .row .ui-input,
  .row .ui-select,
  .row input[type='text'],
  .row input[type='password'],
  .row input[type='url'],
  .row input[type='number'],
  .row input:not([type]),
  .row select {
    flex: 1 1 100%;
    width: 100%;
    min-height: 44px;
    font-size: 16px;
  }
  .hint,
  .muted,
  .msg,
  .warn-msg {
    font-size: 13px;
  }
}
</style>
