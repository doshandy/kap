import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  extractHeaderMap,
  extractMetaHttpEquiv,
  extractMetaName,
  extractNetlifyHeader,
  REQUIRED_KEYS,
  type SecurityKey,
  validateCspPolicy,
} from './shared/securityValidate';

const ROOT = process.cwd();
const HEADER_FILE = join(ROOT, 'public/_headers');
const INDEX_HTML = join(ROOT, 'index.html');
const NOT_FOUND_HTML = join(ROOT, 'public/404.html');
const NETLIFY_TOML = join(ROOT, 'netlify.toml');

const errors: string[] = [];
const warnings: string[] = [];

if (!existsSync(HEADER_FILE)) {
  errors.push('缺少 public/_headers，无法校验响应头级安全策略。');
} else {
  const headerMap = extractHeaderMap(readFileSync(HEADER_FILE, 'utf8'));
  for (const key of REQUIRED_KEYS) {
    if (!headerMap[key]) errors.push(`public/_headers 缺少 ${key}`);
  }

  if (existsSync(INDEX_HTML)) {
    const html = readFileSync(INDEX_HTML, 'utf8');
    const csp = extractMetaHttpEquiv(html, 'Content-Security-Policy');
    const xcto = extractMetaHttpEquiv(html, 'X-Content-Type-Options');
    const policy = extractMetaHttpEquiv(html, 'Permissions-Policy');
    const referrer = extractMetaName(html, 'referrer');
    const expected: Record<SecurityKey, string | undefined> = {
      'Content-Security-Policy': csp,
      'X-Content-Type-Options': xcto,
      'Referrer-Policy': referrer,
      'Permissions-Policy': policy,
    };
    for (const key of REQUIRED_KEYS) {
      if (!expected[key]) {
        errors.push(`index.html 缺少 ${key} 的 meta 兜底配置`);
        continue;
      }
      if (headerMap[key] !== expected[key]) {
        errors.push(`index.html 的 ${key} 与 public/_headers 不一致`);
      }
    }
  } else {
    errors.push('缺少 index.html，无法校验 meta 安全策略。');
  }

  warnings.push(
    '提醒：meta 策略仅作 GitHub Pages 兜底，无法完全替代响应头（建议生产优先使用 _headers / Netlify headers）。',
  );

  if (existsSync(NOT_FOUND_HTML)) {
    const html = readFileSync(NOT_FOUND_HTML, 'utf8');
    const csp = extractMetaHttpEquiv(html, 'Content-Security-Policy');
    const xcto = extractMetaHttpEquiv(html, 'X-Content-Type-Options');
    const policy = extractMetaHttpEquiv(html, 'Permissions-Policy');
    const referrer = extractMetaName(html, 'referrer');
    const expected: Record<SecurityKey, string | undefined> = {
      'Content-Security-Policy': csp,
      'X-Content-Type-Options': xcto,
      'Referrer-Policy': referrer,
      'Permissions-Policy': policy,
    };
    for (const key of REQUIRED_KEYS) {
      if (!expected[key]) {
        errors.push(`public/404.html 缺少 ${key} 的 meta 兜底配置`);
        continue;
      }
      if (headerMap[key] !== expected[key]) {
        errors.push(`public/404.html 的 ${key} 与 public/_headers 不一致`);
      }
    }
  } else {
    warnings.push('缺少 public/404.html，已跳过 404 meta 安全策略校验。');
  }

  const cspResult = validateCspPolicy(headerMap['Content-Security-Policy'] || '');
  errors.push(...cspResult.errors);
  warnings.push(...cspResult.warnings);

  if (existsSync(NETLIFY_TOML)) {
    const netlify = readFileSync(NETLIFY_TOML, 'utf8');
    for (const key of REQUIRED_KEYS) {
      const value = extractNetlifyHeader(netlify, key);
      if (!value) {
        errors.push(`netlify.toml 缺少 ${key}`);
        continue;
      }
      if (value !== headerMap[key]) {
        errors.push(`netlify.toml 的 ${key} 与 public/_headers 不一致`);
      }
    }
  } else {
    warnings.push('未检测到 netlify.toml，跳过 Netlify 头配置一致性校验。');
  }
}

if (errors.length) {
  console.error('❌ 安全策略校验失败：');
  errors.forEach((message) => console.error('  - ' + message));
  process.exit(1);
}

if (warnings.length) {
  console.warn('⚠ 安全策略校验通过，但有提示：');
  warnings.forEach((message) => console.warn('  - ' + message));
}

console.log('✅ 安全策略校验通过：header 与 meta 配置一致');
