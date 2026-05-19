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
const WRITE_CACHE = new Map<string, string>();
const VALID_WRONG_REASONS = new Set([
  '概念不清',
  '代码不会写',
  '边界遗漏',
  '表达不顺',
  '性能/安全没答到',
]);

export function readState<T>(key: string, fallback: T): T {
  try {
    if (!ALLOWED_KEY_SET.has(key)) return fallback;
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    WRITE_CACHE.set(key, raw);
    return isValidState(key, parsed) ? (normalizeState(key, parsed) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeState(key: string, value: unknown): boolean {
  try {
    if (!ALLOWED_KEY_SET.has(key)) return false;
    const serialized = JSON.stringify(value);
    if (WRITE_CACHE.get(key) === serialized) return true;
    localStorage.setItem(PREFIX + key, serialized);
    WRITE_CACHE.set(key, serialized);
    return true;
  } catch {
    return false;
  }
}

export function removeState(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
    WRITE_CACHE.delete(key);
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
  keys.forEach((k) => {
    localStorage.removeItem(k);
    WRITE_CACHE.delete(k.slice(PREFIX.length));
  });
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
  const previous = new Map<string, string | null>();
  const previousCache = new Map(WRITE_CACHE);
  for (const key of ALLOWED_KEYS) {
    try {
      previous.set(key, localStorage.getItem(PREFIX + key));
    } catch {
      previous.set(key, null);
    }
  }
  const incoming = new Map<string, string>(serialized);
  try {
    for (const key of ALLOWED_KEYS) {
      const nextRaw = incoming.get(key);
      if (nextRaw == null) {
        localStorage.removeItem(PREFIX + key);
        WRITE_CACHE.delete(key);
      } else {
        localStorage.setItem(PREFIX + key, nextRaw);
        WRITE_CACHE.set(key, nextRaw);
      }
    }
  } catch {
    try {
      for (const key of ALLOWED_KEYS) {
        const oldRaw = previous.get(key);
        if (oldRaw == null) {
          localStorage.removeItem(PREFIX + key);
          WRITE_CACHE.delete(key);
        } else {
          localStorage.setItem(PREFIX + key, oldRaw);
          WRITE_CACHE.set(key, oldRaw);
        }
      }
    } catch {
      // Rollback failure is rare and should not throw.
    }
    WRITE_CACHE.clear();
    for (const [key, value] of previousCache) WRITE_CACHE.set(key, value);
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
      (item) => Array.isArray(item) && item.every((value) => typeof value === 'string'),
    )
  );
}

function isPlanSchedule(v: unknown): boolean {
  return (
    Array.isArray(v) &&
    v.every((day) => Array.isArray(day) && day.every((id) => typeof id === 'string'))
  );
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function isProgressEvents(v: unknown): boolean {
  return (
    v == null ||
    (Array.isArray(v) &&
      v.every(
        (event) =>
          isRecord(event) &&
          ['status', 'wrong-reason', 'note', 'view'].includes(String(event.type)) &&
          isNumber(event.at) &&
          typeof event.label === 'string' &&
          (event.detail == null || typeof event.detail === 'string'),
      ))
  );
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
            Object.values(item.history).every(isNumber) &&
            isProgressEvents(item.events),
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
        (v.pausedAt == null || isNumber(v.pausedAt)) &&
        (v.schedule == null || isPlanSchedule(v.schedule))
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
    const rawReasons = isRecord(v.wrongReasons) ? v.wrongReasons : {};
    const wrongReasons = Object.fromEntries(
      Object.entries(rawReasons)
        .map(([id, reasons]) => [
          id,
          Array.isArray(reasons)
            ? reasons.filter(
                (reason): reason is string =>
                  typeof reason === 'string' && VALID_WRONG_REASONS.has(reason),
              )
            : [],
        ])
        .filter(([, reasons]) => reasons.length > 0),
    );
    return {
      starred: isRecord(v.starred) ? v.starred : {},
      skipped: isRecord(v.skipped) ? v.skipped : {},
      wrongReasons,
    };
  }
  if (key === 'learning-plan' && isRecord(v)) {
    const days = Number(v.days);
    const safeDays = [0, 7, 14, 30].includes(days) ? (days as 0 | 7 | 14 | 30) : 0;
    const scheduleRaw = Array.isArray(v.schedule) ? v.schedule : null;
    const schedule =
      safeDays && scheduleRaw
        ? Array.from({ length: safeDays }, (_, index) => {
            const day = scheduleRaw[index];
            return Array.isArray(day)
              ? day.filter((id): id is string => typeof id === 'string')
              : [];
          })
        : [];
    return {
      ...v,
      days: safeDays,
      schedule,
    };
  }
  return v;
}
