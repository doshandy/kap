function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function replaceOrInsertMetaLine(
  raw: string,
  key: string,
  value: string,
  aliases: string[] = [],
): string {
  const line = `${key}: ${value}`;
  const candidates = [key, ...aliases];

  for (const candidate of candidates) {
    const re = new RegExp(`^${escapeRegExp(candidate)}\\s*:.*$`, 'm');
    if (re.test(raw)) return raw.replace(re, line);
  }

  const firstSection = raw.search(/^###\s+/m);
  const insertAt = firstSection >= 0 ? firstSection : raw.length;
  return `${raw.slice(0, insertAt).replace(/\s+$/, '')}\n${line}\n\n${raw.slice(insertAt)}`;
}
