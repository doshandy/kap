import { beforeAll, describe, expect, it } from 'vitest';

let parseCommonScriptArgs: (args: string[]) => {
  write: boolean;
  dryRun: boolean;
  onlyFile: string;
};
let resolveOnlyContentFiles: (files: string[], onlyFile: string) => string[];

beforeAll(async () => {
  const modulePath = '../../scripts/shared/' + 'args.ts';
  const mod = (await import(modulePath)) as {
    parseCommonScriptArgs: typeof parseCommonScriptArgs;
    resolveOnlyContentFiles: typeof resolveOnlyContentFiles;
  };
  parseCommonScriptArgs = mod.parseCommonScriptArgs;
  resolveOnlyContentFiles = mod.resolveOnlyContentFiles;
});

describe('parseCommonScriptArgs', () => {
  it('默认是 dry-run，未指定 --write', () => {
    const parsed = parseCommonScriptArgs([]);
    expect(parsed.write).toBe(false);
    expect(parsed.dryRun).toBe(true);
    expect(parsed.onlyFile).toBe('');
  });

  it('识别 --write 并关闭 dry-run', () => {
    const parsed = parseCommonScriptArgs(['--write', '--only=03-vue']);
    expect(parsed.write).toBe(true);
    expect(parsed.dryRun).toBe(false);
    expect(parsed.onlyFile).toBe('03-vue');
  });

  it('显式 dry-run 可以覆盖 --write', () => {
    const parsed = parseCommonScriptArgs(['--write', '--dry-run', '--only=03-vue.md']);
    expect(parsed.write).toBe(true);
    expect(parsed.dryRun).toBe(true);
    expect(parsed.onlyFile).toBe('03-vue.md');
  });
});

describe('resolveOnlyContentFiles', () => {
  const files = ['01-js.md', '02-ts.md', '03-vue.md'];

  it('未传 only 时返回原始文件列表', () => {
    expect(resolveOnlyContentFiles(files, '')).toEqual(files);
  });

  it('支持 categoryId 形式匹配', () => {
    expect(resolveOnlyContentFiles(files, '03-vue')).toEqual(['03-vue.md']);
  });

  it('支持文件名形式匹配', () => {
    expect(resolveOnlyContentFiles(files, '02-ts.md')).toEqual(['02-ts.md']);
  });

  it('only 空白会按未命中报错', () => {
    expect(() => resolveOnlyContentFiles(files, '   ')).toThrow(/未匹配任何 content\/\*\.md 文件/);
  });

  it('未命中时抛出清晰错误', () => {
    expect(() => resolveOnlyContentFiles(files, 'not-exists')).toThrow(
      '--only=not-exists 未匹配任何 content/*.md 文件',
    );
  });
});
