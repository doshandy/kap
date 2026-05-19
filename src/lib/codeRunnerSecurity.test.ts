import { describe, expect, it } from 'vitest';
import { containsBlockedCodeExecution, containsDynamicImport } from './codeRunnerSecurity';

describe('codeRunnerSecurity', () => {
  it('识别直接 dynamic import', () => {
    expect(containsDynamicImport('await import("https://example.com/mod.js")')).toBe(true);
  });

  it('识别注释夹杂的 dynamic import', () => {
    expect(containsDynamicImport('const mod = import /* x */ ("/mod.js")')).toBe(true);
  });

  it('忽略字符串和注释里的 import(', () => {
    const source = `
      const text = "import('/fake.js')";
      // import('/also-fake.js')
      /* import('/still-fake.js') */
      const x = 1;
    `;
    expect(containsDynamicImport(source)).toBe(false);
  });

  it('忽略静态 import 语句', () => {
    expect(containsDynamicImport("import x from './x'")).toBe(false);
  });

  it('识别模板字符串插值中的 dynamic import', () => {
    const source = 'const x = `${import("https://example.com/mod.js")}`;';
    expect(containsDynamicImport(source)).toBe(true);
  });

  it('识别 constructor / eval / Function 字符串执行路径', () => {
    expect(containsBlockedCodeExecution('eval("console.log(1)")')).toBe(true);
    expect(containsBlockedCodeExecution('Function("return 1")()')).toBe(true);
    expect(containsBlockedCodeExecution('([]).constructor("return 1")()')).toBe(true);
    expect(containsBlockedCodeExecution('({})["constructor"]("return 1")()')).toBe(true);
    expect(containsBlockedCodeExecution('obj?.constructor("return 1")()')).toBe(true);
    expect(containsBlockedCodeExecution('setTimeout("console.log(1)", 0)')).toBe(true);
    expect(containsBlockedCodeExecution('setInterval(`console.log(1)`, 0)')).toBe(true);
  });

  it('忽略注释和字符串中的危险关键词', () => {
    const source = `
      const hint = "Function('x')";
      // eval("x")
      /* setTimeout("x", 0) */
      const ok = 1;
    `;
    expect(containsBlockedCodeExecution(source)).toBe(false);
  });

  it('允许只读取 constructor 属性但不执行', () => {
    expect(containsBlockedCodeExecution('const ctor = arr.constructor;')).toBe(false);
    expect(containsBlockedCodeExecution('const ctor = map?.constructor;')).toBe(false);
  });
});
