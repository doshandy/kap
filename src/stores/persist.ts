const VERSION = 1;
const PREFIX = `kap.v${VERSION}.`;
const ALLOWED_KEYS = [
  'settings',
  'progress',
  'review',
  'notes',
  'marks',
  'ai-config',
  'learning-plan',
  'content-updates',
] as const;
const ALLOWED_KEY_SET = new Set<string>(ALLOWED_KEYS);

export function readState<T>(key: string, fallback: T): T {
  try {
    if (!ALLOWED_KEY_SET.has(key)) return fallback;
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return isValidState(key, parsed) ? (normalizeState(key, parsed) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeState(key: string, value: unknown): boolean {
  try {
    if (!ALLOWED_KEY_SET.has(key)) return false;
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeState(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    // ignore
  }
}

export function clearAll(): void {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) keys.push(k);
  }
  keys.forEach((k) => localStorage.removeItem(k));
}

export function exportAll(): Record<string, unknown> {
  const data: Record<string, unknown> = { version: VERSION };
  for (const key of ALLOWED_KEYS) {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (!raw) continue;
      const parsed: unknown = JSON.parse(raw);
      if (isValidState(key, parsed))
        data[key] = normalizeState(key, parsed, { redactSecrets: true });
    } catch {
      // skip malformed state
    }
  }
  return data;
}

export function importAll(data: Record<string, unknown>): boolean {
  if (!data || typeof data !== 'object') return false;
  if (data.version !== VERSION) return false;
  const normalized = new Map<string, unknown>();
  for (const [k, v] of Object.entries(data)) {
    if (k === 'version') continue;
    if (!ALLOWED_KEY_SET.has(k) || !isValidState(k, v)) return false;
    normalized.set(k, normalizeState(k, v));
  }
  const serialized: [string, string][] = [];
  for (const [k, v] of normalized) {
    try {
      serialized.push([k, JSON.stringify(v)]);
    } catch {
      return false;
    }
  }
  for (const key of ALLOWED_KEYS) removeState(key);
  try {
    for (const [k, raw] of serialized) {
      localStorage.setItem(PREFIX + k, raw);
    }
  } catch {
    return false;
  }
  return true;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function isBooleanMap(v: unknown): boolean {
  return isRecord(v) && Object.values(v).every((item) => typeof item === 'boolean');
}

function isStringMap(v: unknown): boolean {
  return isRecord(v) && Object.values(v).every((item) => typeof item === 'string');
}

function isStringArrayMap(v: unknown): boolean {
  return (
    isRecord(v) &&
    Object.values(v).every(
      (item) => Array.isArray(item) && item.every((v) => typeof v === 'string'),
    )
  );
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isValidState(key: string, v: unknown): boolean {
  if (!isRecord(v)) return false;
  switch (key) {
    case 'settings':
      return (
        ['light', 'dark', 'auto'].includes(String(v.theme)) &&
        typeof v.shortcutsEnabled === 'boolean' &&
        ['sm', 'md', 'lg'].includes(String(v.fontSize)) &&
        typeof v.showAnswerByDefault === 'boolean'
      );
    case 'marks':
      return (
        isBooleanMap(v.starred) &&
        isBooleanMap(v.skipped) &&
        (v.wrongReasons == null || isStringArrayMap(v.wrongReasons))
      );
    case 'notes':
      return isStringMap(v.map);
    case 'progress':
      return (
        isRecord(v.records) &&
        Object.values(v.records).every(
          (item) =>
            isRecord(item) &&
            ['todo', 'mastered', 'fuzzy', 'review'].includes(String(item.status)) &&
            isNumber(item.viewedAt) &&
            isNumber(item.reviewedTimes) &&
            isRecord(item.history) &&
            Object.values(item.history).every(isNumber),
        )
      );
    case 'review':
      return (
        isRecord(v.items) &&
        Object.values(v.items).every(
          (item) =>
            isRecord(item) &&
            isNumber(item.ef) &&
            isNumber(item.interval) &&
            isNumber(item.reps) &&
            isNumber(item.due) &&
            isNumber(item.lastReviewed),
        )
      );
    case 'ai-config':
      return (
        typeof v.enabled === 'boolean' &&
        ['openai', 'anthropic', 'custom'].includes(String(v.provider)) &&
        typeof v.apiKey === 'string' &&
        typeof v.rememberApiKey === 'boolean' &&
        typeof v.baseUrl === 'string' &&
        typeof v.model === 'string' &&
        isNumber(v.temperature) &&
        ['mentor', 'interviewer', 'concise'].includes(String(v.systemRole))
      );
    case 'learning-plan':
      return (
        [0, 7, 14, 30].includes(Number(v.days)) &&
        isNumber(v.startedAt) &&
        (v.pausedAt == null || isNumber(v.pausedAt))
      );
    case 'content-updates':
      return typeof v.seenFingerprint === 'string' && isNumber(v.seenAt);
    default:
      return false;
  }
}

function normalizeState(
  key: string,
  v: unknown,
  options: { redactSecrets?: boolean } = {},
): unknown {
  if (key === 'ai-config' && isRecord(v)) {
    return {
      ...v,
      apiKey: options.redactSecrets ? '' : v.rememberApiKey === true ? v.apiKey : '',
    };
  }
  if (key === 'marks' && isRecord(v)) {
    return {
      starred: isRecord(v.starred) ? v.starred : {},
      skipped: isRecord(v.skipped) ? v.skipped : {},
      wrongReasons: isRecord(v.wrongReasons) ? v.wrongReasons : {},
    };
  }
  return v;
}
