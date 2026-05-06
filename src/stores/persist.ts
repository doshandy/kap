const VERSION = 1;
const PREFIX = `kap.v${VERSION}.`;

export function readState<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeState(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // ignore quota
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
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(PREFIX)) {
      const short = k.slice(PREFIX.length);
      try {
        data[short] = JSON.parse(localStorage.getItem(k) || 'null');
      } catch {
        // skip
      }
    }
  }
  return data;
}

export function importAll(data: Record<string, unknown>): boolean {
  if (!data || typeof data !== 'object') return false;
  for (const [k, v] of Object.entries(data)) {
    if (k === 'version') continue;
    writeState(k, v);
  }
  return true;
}
