import { defineStore } from 'pinia';
import { computed, reactive, watch } from 'vue';
import { readState, removeState, writeState } from './persist';

const KEY = 'ai-config';

export type AIProvider = 'openai' | 'anthropic' | 'custom';

export interface AIConfig {
  enabled: boolean;
  provider: AIProvider;
  apiKey: string;
  rememberApiKey: boolean;
  /** 自定义 base URL，OpenAI 兼容路径，如 https://api.deepseek.com */
  baseUrl: string;
  model: string;
  temperature: number;
  systemRole: 'mentor' | 'interviewer' | 'concise';
}

const DEFAULTS: AIConfig = {
  enabled: false,
  provider: 'openai',
  apiKey: '',
  rememberApiKey: false,
  baseUrl: 'https://api.openai.com',
  model: 'gpt-4o-mini',
  temperature: 0.3,
  systemRole: 'mentor',
};

const PROVIDER_DEFAULTS: Record<AIProvider, Pick<AIConfig, 'baseUrl' | 'model'>> = {
  openai: { baseUrl: 'https://api.openai.com', model: 'gpt-4o-mini' },
  anthropic: { baseUrl: 'https://api.anthropic.com', model: 'claude-3-5-sonnet-latest' },
  custom: { baseUrl: '', model: '' },
};

export const useAIStore = defineStore('ai', () => {
  const persisted = readState<Partial<AIConfig>>(KEY, {});
  const state = reactive<AIConfig>({
    ...DEFAULTS,
    ...persisted,
    apiKey: persisted.rememberApiKey ? persisted.apiKey || '' : '',
    rememberApiKey: !!persisted.rememberApiKey,
  });
  watch(
    state,
    (v) => {
      writeState(KEY, {
        ...v,
        apiKey: v.rememberApiKey ? v.apiKey : '',
      });
    },
    { deep: true },
  );

  const baseUrlWarning = computed(() => getBaseUrlWarning(state.baseUrl));
  const readinessMessage = computed(() => {
    if (!state.enabled) return 'AI 讲解尚未启用。';
    if (!state.apiKey.trim()) return '请先配置 API Key。';
    if (!state.model.trim()) return '请先配置模型名称。';
    if (!state.baseUrl.trim()) return '请先配置 Base URL。';
    return baseUrlWarning.value;
  });
  const isReady = computed(() => !readinessMessage.value);

  function reset(): void {
    Object.assign(state, DEFAULTS);
    removeState(KEY);
  }

  function forgetApiKey(): void {
    state.apiKey = '';
    state.rememberApiKey = false;
    writeState(KEY, { ...state, apiKey: '', rememberApiKey: false });
  }

  function setProvider(provider: AIProvider): void {
    const oldDefault = PROVIDER_DEFAULTS[state.provider];
    state.provider = provider;
    const nextDefault = PROVIDER_DEFAULTS[provider];
    if (!state.baseUrl || state.baseUrl === oldDefault.baseUrl) {
      state.baseUrl = nextDefault.baseUrl;
    }
    if (!state.model || state.model === oldDefault.model) {
      state.model = nextDefault.model;
    }
  }

  return { state, isReady, baseUrlWarning, readinessMessage, reset, forgetApiKey, setProvider };
});

export function getBaseUrlWarning(baseUrl: string): string {
  const raw = baseUrl.trim();
  if (!raw) return '';
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return 'Base URL 不是有效 URL，AI 请求将不会发送。';
  }
  if (!['https:', 'http:'].includes(url.protocol)) {
    return 'Base URL 仅支持 http/https。';
  }
  const isLocal = ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !isLocal) {
    return '非 HTTPS 地址会暴露 API Key，建议只用于本地代理或可信内网。';
  }
  return '';
}

export const SYSTEM_PROMPTS: Record<AIConfig['systemRole'], string> = {
  mentor:
    '你是一位资深前端工程师导师，用简单直白的中文给出答案。优先解释「为什么」，提供踩过的坑、最佳实践、代码示例。回答控制在 600 字以内。',
  interviewer:
    '你扮演一名严格的资深前端面试官。先给一个简短的"评分"（基础/合格/优秀）和理由，然后追问 1-2 个加深问题。语言简洁，不要啰嗦客套。',
  concise:
    '你是一位极简的中文回答助手。只输出关键要点（5 条以内），不寒暄、不重复问题，必要时附最小可运行代码示例。',
};
