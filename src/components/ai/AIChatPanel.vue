<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useAIStore } from '@/stores/ai';
import { buildContextMessages, useAIChat } from '@/composables/useAIChat';
import AppIcon from '@/components/icon/AppIcon.vue';
import type { Question } from '@/types/content';

const props = defineProps<{ question: Question }>();

const ai = useAIStore();
const { text, error, loading, send, abort } = useAIChat();
const readinessMessage = computed(() => ai.readinessMessage || '请到设置页补全 AI 配置。');

const userQuery = ref('');
const presetQueries = [
  {
    label: '简单讲讲',
    value: '请用简单直白的中文讲一下这道题，重点解释为什么、容易踩的坑，并给一个最小代码示例。',
  },
  {
    label: '面试官追问',
    value: '请扮演面试官，针对我的回答继续追问 2 个深入问题，并给出参考答案。',
  },
  { label: '极简要点', value: '请用 5 条以内的要点回答这道题，每条不超过 2 行。' },
  {
    label: '反例 / 错误答案',
    value: '列出 3 个候选人在这题上常给的错误或不完整答案，并解释错在哪。',
  },
];

function startPreset(q: string) {
  userQuery.value = q;
  start();
}

function start() {
  if (!ai.isReady) return;
  const msgs = buildContextMessages(props.question, userQuery.value);
  send(msgs);
}

function stop() {
  abort();
}

const outputRef = ref<HTMLDivElement | null>(null);
watch(text, () => {
  nextTick(() => {
    if (outputRef.value) outputRef.value.scrollTop = outputRef.value.scrollHeight;
  });
});

onBeforeUnmount(() => abort());
</script>

<template>
  <div class="ai-panel card">
    <div class="hd">
      <h4><AppIcon name="robot" /> AI 讲解（站内对话）</h4>
      <div class="role-tag">
        角色：{{
          ai.state.systemRole === 'mentor'
            ? '导师'
            : ai.state.systemRole === 'interviewer'
              ? '面试官'
              : '极简'
        }}
      </div>
    </div>

    <div v-if="!ai.isReady" class="not-ready">
      <p>
        {{ readinessMessage }} 请到 <RouterLink to="/settings">设置</RouterLink> 补全配置后开启。
      </p>
      <p class="muted small">
        所有请求均由你的浏览器直接发往目标 API 域名，KAP 不会经手任何 Key 或对话内容。
      </p>
    </div>

    <template v-else>
      <div class="presets">
        <button
          v-for="p in presetQueries"
          :key="p.label"
          class="chip"
          :disabled="loading"
          @click="startPreset(p.value)"
        >
          {{ p.label }}
        </button>
      </div>

      <div class="input-row">
        <textarea
          v-model="userQuery"
          rows="2"
          placeholder="也可以输入自己的提问，比如「这道题在 React 18 下的差异？」"
          @keydown.ctrl.enter="start"
          @keydown.meta.enter="start"
        />
        <div class="actions">
          <button v-if="!loading" class="btn btn-primary" @click="start">
            <AppIcon name="thunderbolt" /> 提问 (⌘↵)
          </button>
          <button v-else class="btn" @click="stop"><AppIcon name="close" /> 停止</button>
        </div>
      </div>

      <div v-if="error" class="error">⚠ {{ error }}</div>

      <div v-if="text || loading" ref="outputRef" class="output">
        <pre>{{ text }}{{ loading ? '▍' : '' }}</pre>
      </div>
    </template>
  </div>
</template>

<style scoped>
.ai-panel {
  margin-top: 12px;
  padding: 14px 16px;
  background: linear-gradient(180deg, rgba(99, 102, 241, 0.06), transparent);
  border-left: 3px solid #6366f1;
}
.hd {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.hd h4 {
  margin: 0;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.role-tag {
  font-size: 11px;
  color: var(--c-text-mute);
  background: var(--c-bg-mute);
  padding: 2px 8px;
  border-radius: 999px;
}
.not-ready {
  font-size: 13px;
  color: var(--c-text-soft);
}
.not-ready a {
  color: var(--c-primary);
}
.muted.small {
  font-size: 11px;
  color: var(--c-text-mute);
}
.presets {
  margin: 10px 0 8px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.chip {
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--c-bg-mute);
  border: 1px solid var(--c-border);
  font-size: 12px;
  color: var(--c-text);
  cursor: pointer;
}
.chip:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.chip:hover:not(:disabled) {
  background: var(--c-primary-soft);
  border-color: var(--c-primary);
  color: var(--c-primary);
}

.input-row {
  display: flex;
  gap: 8px;
  align-items: stretch;
}
.input-row textarea {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  background: var(--c-bg);
  color: var(--c-text);
  font-size: 13px;
  resize: vertical;
}
.input-row .actions {
  display: flex;
  align-items: center;
}

.error {
  margin-top: 8px;
  padding: 8px 10px;
  border-radius: var(--radius);
  font-size: 12px;
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.output {
  margin-top: 10px;
  max-height: 360px;
  overflow: auto;
  padding: 12px;
  background: var(--c-bg);
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
}
.output pre {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.6;
  color: var(--c-text);
}
</style>
