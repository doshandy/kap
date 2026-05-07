import { defineStore } from 'pinia';
import { computed, reactive, watch } from 'vue';
import { readState, writeState } from './persist';

const KEY = 'ai-config';

export type AIProvider = 'openai' | 'anthropic' | 'custom';

export interface AIConfig {
  enabled: boolean;
  provider: AIProvider;
  apiKey: string;
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
  baseUrl: 'https://api.openai.com',
  model: 'gpt-4o-mini',
  temperature: 0.3,
  systemRole: 'mentor',
};

export const useAIStore = defineStore('ai', () => {
  const state = reactive<AIConfig>(readState<AIConfig>(KEY, DEFAULTS));
  watch(state, (v) => writeState(KEY, v), { deep: true });

  const isReady = computed(() => state.enabled && !!state.apiKey);

  function reset(): void {
    Object.assign(state, DEFAULTS);
  }

  return { state, isReady, reset };
});

export const SYSTEM_PROMPTS: Record<AIConfig['systemRole'], string> = {
  mentor:
    '你是一位资深前端工程师导师，用简单直白的中文给出答案。优先解释「为什么」，提供踩过的坑、最佳实践、代码示例。回答控制在 600 字以内。',
  interviewer:
    '你扮演一名严格的资深前端面试官。先给一个简短的"评分"（基础/合格/优秀）和理由，然后追问 1-2 个加深问题。语言简洁，不要啰嗦客套。',
  concise:
    '你是一位极简的中文回答助手。只输出关键要点（5 条以内），不寒暄、不重复问题，必要时附最小可运行代码示例。',
};
