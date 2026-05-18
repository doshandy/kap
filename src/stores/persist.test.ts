import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exportAll, importAll } from './persist';

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

describe('persist import/export', () => {
  beforeEach(() => {
    memoryLS.clear();
  });

  it('导入合法备份', () => {
    const ok = importAll({
      version: 1,
      settings: {
        theme: 'auto',
        shortcutsEnabled: true,
        fontSize: 'md',
        showAnswerByDefault: false,
      },
      marks: { starred: { q1: true }, skipped: {} },
    });
    expect(ok).toBe(true);
    expect(exportAll().marks).toEqual({ starred: { q1: true }, skipped: {}, wrongReasons: {} });
  });

  it('拒绝未知 key 和畸形结构', () => {
    expect(importAll({ version: 1, evil: { payload: true } })).toBe(false);
    expect(importAll({ version: 1, marks: { starred: { q1: 'yes' }, skipped: {} } })).toBe(false);
  });

  it('拒绝不兼容版本', () => {
    expect(importAll({ version: 999, marks: { starred: {}, skipped: {} } })).toBe(false);
  });

  it('导入和导出时会按 rememberApiKey 脱敏 AI Key', () => {
    expect(
      importAll({
        version: 1,
        'ai-config': {
          enabled: true,
          provider: 'openai',
          apiKey: 'sk-secret',
          rememberApiKey: false,
          baseUrl: 'https://api.openai.com',
          model: 'gpt-4o-mini',
          temperature: 0.3,
          systemRole: 'mentor',
        },
      }),
    ).toBe(true);

    expect((exportAll()['ai-config'] as { apiKey: string }).apiKey).toBe('');
  });

  it('导出时排除非备份核心数据，避免导出后无法导回', () => {
    localStorage.setItem('kap.v1.searchHistory', JSON.stringify(['vue', 'react']));
    localStorage.setItem('kap.v1.marks', JSON.stringify({ starred: {}, skipped: {} }));

    const backup = exportAll();
    expect(backup.searchHistory).toBeUndefined();
    expect(importAll(backup)).toBe(true);
  });

  it('导出时默认不包含明文 AI Key，即使用户选择记住', () => {
    localStorage.setItem(
      'kap.v1.ai-config',
      JSON.stringify({
        enabled: true,
        provider: 'openai',
        apiKey: 'sk-secret',
        rememberApiKey: true,
        baseUrl: 'https://api.openai.com',
        model: 'gpt-4o-mini',
        temperature: 0.3,
        systemRole: 'mentor',
      }),
    );

    expect((exportAll()['ai-config'] as { apiKey: string }).apiKey).toBe('');
  });
});
