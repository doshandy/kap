export const REQUIRED_KEYS = [
  'Content-Security-Policy',
  'X-Content-Type-Options',
  'Referrer-Policy',
  'Permissions-Policy',
] as const;

export type SecurityKey = (typeof REQUIRED_KEYS)[number];

export function extractHeaderMap(content: string): Record<string, string> {
  const map: Record<string, string> = {};
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z-]+)\s*:\s*(.+?)\s*$/);
    if (!match) continue;
    map[match[1]] = match[2];
  }
  return map;
}

export function extractMetaHttpEquiv(html: string, key: string): string | undefined {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `<meta\\s+[^>]*http-equiv=["']${escaped}["'][^>]*content=(["'])([\\s\\S]*?)\\1[^>]*>`,
    'i',
  );
  return html.match(re)?.[2];
}

export function extractMetaName(html: string, key: string): string | undefined {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(
    `<meta\\s+[^>]*name=["']${escaped}["'][^>]*content=(["'])([\\s\\S]*?)\\1[^>]*>`,
    'i',
  );
  return html.match(re)?.[2];
}

export function extractNetlifyHeader(content: string, key: string): string | undefined {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^\\s*${escaped}\\s*=\\s*"([^"]+)"\\s*$`, 'm');
  return content.match(re)?.[1];
}

export function readCspDirectiveValues(csp: string, directive: string): string[] {
  const escaped = directive.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(?:^|;)\\s*${escaped}\\s+([^;]+)`, 'i');
  const match = csp.match(re)?.[1];
  if (!match) return [];
  return match.trim().split(/\s+/).filter(Boolean);
}

export function isBroadNetworkSource(token: string): boolean {
  return (
    token === '*' ||
    token === 'http:' ||
    token === 'https:' ||
    token === 'ws:' ||
    token === 'wss:' ||
    token.startsWith('http://') ||
    token.startsWith('https://') ||
    token.startsWith('ws://') ||
    token.startsWith('wss://')
  );
}

export function validateCspPolicy(csp: string): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const requiredDirective of [
    "default-src 'self'",
    "script-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ]) {
    if (!csp.includes(requiredDirective)) {
      errors.push(`Content-Security-Policy 缺少关键指令：${requiredDirective}`);
    }
  }

  const scriptSrc = readCspDirectiveValues(csp, 'script-src');
  if (scriptSrc.includes("'unsafe-inline'")) {
    errors.push("Content-Security-Policy 的 script-src 不应包含 'unsafe-inline'");
  }
  if (scriptSrc.includes("'unsafe-eval'")) {
    errors.push("Content-Security-Policy 的 script-src 不应包含 'unsafe-eval'");
  }
  const broadScriptSources = scriptSrc.filter(
    (token) => isBroadNetworkSource(token) || token === 'data:' || token === 'blob:',
  );
  if (broadScriptSources.length) {
    errors.push(
      `Content-Security-Policy 的 script-src 存在高风险来源：${[...new Set(broadScriptSources)].join(', ')}`,
    );
  }

  const workerSrc = readCspDirectiveValues(csp, 'worker-src');
  const broadWorkerSources = workerSrc.filter((token) => isBroadNetworkSource(token));
  if (broadWorkerSources.length) {
    errors.push(
      `Content-Security-Policy 的 worker-src 存在过宽来源：${[...new Set(broadWorkerSources)].join(', ')}`,
    );
  }

  const connectSrc = readCspDirectiveValues(csp, 'connect-src');
  if (
    connectSrc.some(
      (token) =>
        token === '*' ||
        token === 'http:' ||
        token === 'https:' ||
        token === 'ws:' ||
        token === 'wss:',
    )
  ) {
    warnings.push('Content-Security-Policy 的 connect-src 仍较宽，建议使用明确域名白名单。');
  }

  return { errors, warnings };
}
