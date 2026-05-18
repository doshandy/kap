import { beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import { createPinia, setActivePinia } from 'pinia';

const memoryLS = (() => {
  const m = new Map<string, string>();
  return {
    getItem: (k: string) => (m.has(k) ? m.get(k)! : null),
    setItem: (k: string, v: string) => m.set(k, v),
    removeItem: (k: string) => m.delete(k),
    clear: () => m.clear(),
    key: (i: number) => Array.from(m.keys())[i] ?? null,
    get length() {
      return m.size;
    },
  };
})();

vi.stubGlobal('localStorage', memoryLS);

import { getBaseUrlWarning, useAIStore } from './ai';

describe('useAIStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    memoryLS.clear();
  });

  it('默认不持久化 API Key 明文', async () => {
    const ai = useAIStore();
    ai.state.apiKey = 'sk-secret';
    await nextTick();

    const raw = memoryLS.getItem('kap.v1.ai-config');
    expect(raw).toBeTruthy();
    expect(JSON.parse(raw!).apiKey).toBe('');
  });

  it('明确记住后才持久化 API Key', async () => {
    const ai = useAIStore();
    ai.state.rememberApiKey = true;
    ai.state.apiKey = 'sk-secret';
    await nextTick();

    expect(JSON.parse(memoryLS.getItem('kap.v1.ai-config')!).apiKey).toBe('sk-secret');
  });

  it('提示不安全或无效 Base URL', () => {
    expect(getBaseUrlWarning('notaurl')).toContain('不是有效 URL');
    expect(getBaseUrlWarning('http://example.com')).toContain('非 HTTPS');
    expect(getBaseUrlWarning('https://api.openai.com')).toBe('');
  });
});
