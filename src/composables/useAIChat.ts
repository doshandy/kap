import { ref } from 'vue';
import { SYSTEM_PROMPTS, useAIStore } from '@/stores/ai';
import type { Question } from '@/types/content';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatStreamHandle {
  abort: () => void;
}

/**
 * 调用 OpenAI 兼容 SSE 流接口（Anthropic provider 自动改路径 + 转协议）。
 * 注意：API key 直接发送到目标域；只在用户明确配置后启用。
 */
export async function streamChat(
  messages: ChatMessage[],
  onDelta: (text: string) => void,
  onDone?: () => void,
  onError?: (err: Error) => void,
): Promise<ChatStreamHandle> {
  const ai = useAIStore();
  const cfg = ai.state;

  const controller = new AbortController();
  const handle: ChatStreamHandle = { abort: () => controller.abort() };

  const isAnthropic = cfg.provider === 'anthropic';
  const url = isAnthropic
    ? joinUrl(cfg.baseUrl || 'https://api.anthropic.com', '/v1/messages')
    : joinUrl(cfg.baseUrl || 'https://api.openai.com', '/v1/chat/completions');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (isAnthropic) {
    headers['x-api-key'] = cfg.apiKey;
    headers['anthropic-version'] = '2023-06-01';
    headers['anthropic-dangerous-direct-browser-access'] = 'true';
  } else {
    headers['Authorization'] = `Bearer ${cfg.apiKey}`;
  }

  const body = isAnthropic
    ? buildAnthropicBody(cfg.model, cfg.temperature, messages)
    : buildOpenAIBody(cfg.model, cfg.temperature, messages);

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    onError?.(e as Error);
    return handle;
  }

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => res.statusText);
    onError?.(new Error(`AI 请求失败：${res.status} ${text.slice(0, 200)}`));
    return handle;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const ln of lines) {
        const trimmed = ln.trim();
        if (!trimmed.startsWith('data:')) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === '[DONE]') {
          onDone?.();
          return handle;
        }
        try {
          const json = JSON.parse(payload);
          const delta = isAnthropic ? extractAnthropicDelta(json) : extractOpenAIDelta(json);
          if (delta) onDelta(delta);
        } catch {
          // ignore malformed line
        }
      }
    }
    onDone?.();
  } catch (e) {
    onError?.(e as Error);
  }
  return handle;
}

function buildOpenAIBody(model: string, temperature: number, messages: ChatMessage[]) {
  return {
    model,
    temperature,
    stream: true,
    messages,
  };
}

function buildAnthropicBody(model: string, temperature: number, messages: ChatMessage[]) {
  const system = messages.find((m) => m.role === 'system')?.content;
  const rest = messages.filter((m) => m.role !== 'system');
  return {
    model,
    temperature,
    stream: true,
    max_tokens: 1024,
    system,
    messages: rest.map((m) => ({ role: m.role, content: m.content })),
  };
}

function extractOpenAIDelta(json: unknown): string | null {
  type OpenAIChunk = { choices?: { delta?: { content?: string } }[] };
  const c = (json as OpenAIChunk).choices?.[0]?.delta?.content;
  return typeof c === 'string' ? c : null;
}

function extractAnthropicDelta(json: unknown): string | null {
  type AnthropicEvent = { type?: string; delta?: { type?: string; text?: string } };
  const e = json as AnthropicEvent;
  if (e.type === 'content_block_delta' && e.delta?.type === 'text_delta') {
    return e.delta.text ?? null;
  }
  return null;
}

function joinUrl(base: string, path: string): string {
  return base.replace(/\/+$/, '') + path;
}

/**
 * 把当前题目转化为带"系统角色"的 chat messages。
 */
export function buildContextMessages(question: Question, userQuery?: string): ChatMessage[] {
  const ai = useAIStore();
  const system = SYSTEM_PROMPTS[ai.state.systemRole];

  const ctx = [
    `面试题分类：${question.categoryId}`,
    `难度：${question.difficulty}`,
    `标签：${question.tags.join('、')}`,
    `题目：${stripHtml(question.question)}`,
    `参考答案要点：${stripHtml(question.answer)}`,
  ].join('\n');

  const userText =
    userQuery && userQuery.trim()
      ? userQuery
      : '请用简单直白的中文讲一下这道题，重点解释为什么、容易踩的坑，并给一个最小代码示例。';

  return [
    { role: 'system', content: system },
    { role: 'user', content: `${ctx}\n\n问题：${userText}` },
  ];
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Vue 风格 composable：管理 streaming 状态、abort、可重发。
 */
export function useAIChat() {
  const text = ref('');
  const error = ref<string | null>(null);
  const loading = ref(false);
  let handle: ChatStreamHandle | null = null;

  async function send(messages: ChatMessage[]): Promise<void> {
    text.value = '';
    error.value = null;
    loading.value = true;
    handle?.abort();
    handle = await streamChat(
      messages,
      (delta) => {
        text.value += delta;
      },
      () => {
        loading.value = false;
      },
      (e) => {
        error.value = e.message;
        loading.value = false;
      },
    );
  }

  function abort(): void {
    handle?.abort();
    loading.value = false;
  }

  return { text, error, loading, send, abort };
}
