import { describe, expect, it } from 'vitest';
import { normalizeBase, normalizePathname, scopeMatchesAppBase } from './useAppUpdate';

describe('useAppUpdate helpers', () => {
  it('normalizeBase 统一前后斜杠', () => {
    expect(normalizeBase(undefined)).toBe('/');
    expect(normalizeBase('/kap')).toBe('/kap/');
    expect(normalizeBase('kap')).toBe('/kap/');
    expect(normalizeBase('/')).toBe('/');
  });

  it('normalizePathname 保持根路径稳定', () => {
    expect(normalizePathname('/')).toBe('/');
    expect(normalizePathname('/kap')).toBe('/kap/');
    expect(normalizePathname('/kap/')).toBe('/kap/');
  });

  it('scopeMatchesAppBase 支持根路径与子路径部署', () => {
    expect(scopeMatchesAppBase('https://a.com/', '/')).toBe(true);
    expect(scopeMatchesAppBase('https://a.com/kap/', '/')).toBe(false);

    expect(scopeMatchesAppBase('https://a.com/kap/', '/kap/')).toBe(true);
    expect(scopeMatchesAppBase('https://a.com/kap/sub/', '/kap/')).toBe(true);
    expect(scopeMatchesAppBase('https://a.com/other/', '/kap/')).toBe(false);
  });
});
