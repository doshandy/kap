import { beforeAll, describe, expect, it } from 'vitest';

let validateCspPolicy: (csp: string) => { errors: string[]; warnings: string[] };
let readCspDirectiveValues: (csp: string, directive: string) => string[];

beforeAll(async () => {
  const modulePath = '../../scripts/shared/' + 'securityValidate.ts';
  const mod = (await import(modulePath)) as {
    validateCspPolicy: typeof validateCspPolicy;
    readCspDirectiveValues: typeof readCspDirectiveValues;
  };
  validateCspPolicy = mod.validateCspPolicy;
  readCspDirectiveValues = mod.readCspDirectiveValues;
});

describe('readCspDirectiveValues', () => {
  it('提取指定指令值列表', () => {
    const csp =
      "default-src 'self'; script-src 'self' https://a.com 'unsafe-inline'; object-src 'none'";
    expect(readCspDirectiveValues(csp, 'script-src')).toEqual([
      "'self'",
      'https://a.com',
      "'unsafe-inline'",
    ]);
    expect(readCspDirectiveValues(csp, 'worker-src')).toEqual([]);
  });
});

describe('validateCspPolicy', () => {
  it('安全基线配置无错误', () => {
    const csp =
      "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self'; connect-src 'self' https://api.openai.com; worker-src 'self' blob:";
    const result = validateCspPolicy(csp);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('识别 script-src 的 unsafe-eval 与 unsafe-inline', () => {
    const csp =
      "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; worker-src 'self'";
    const result = validateCspPolicy(csp);
    expect(result.errors.some((item) => item.includes("'unsafe-eval'"))).toBe(true);
    expect(result.errors.some((item) => item.includes("'unsafe-inline'"))).toBe(true);
  });

  it('识别过宽 script-src 与 worker-src 来源', () => {
    const csp =
      "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self' https: blob:; worker-src 'self' https://cdn.example.com";
    const result = validateCspPolicy(csp);
    expect(result.errors.some((item) => item.includes('script-src 存在高风险来源'))).toBe(true);
    expect(result.errors.some((item) => item.includes('worker-src 存在过宽来源'))).toBe(true);
  });

  it('对宽泛 connect-src 给出警告', () => {
    const csp =
      "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; script-src 'self'; worker-src 'self'; connect-src 'self' https:";
    const result = validateCspPolicy(csp);
    expect(result.warnings.some((item) => item.includes('connect-src 仍较宽'))).toBe(true);
  });

  it('缺少关键指令时报错', () => {
    const csp = "default-src 'self'; script-src 'self'; object-src 'none'";
    const result = validateCspPolicy(csp);
    expect(result.errors.some((item) => item.includes("base-uri 'self'"))).toBe(true);
    expect(result.errors.some((item) => item.includes("frame-ancestors 'none'"))).toBe(true);
  });
});
