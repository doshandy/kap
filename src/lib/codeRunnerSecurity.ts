function isIdentifierStart(char: string): boolean {
  return /[A-Za-z_$]/.test(char);
}

function isIdentifierPart(char: string): boolean {
  return /[A-Za-z0-9_$]/.test(char);
}

function skipLineComment(source: string, start: number): number {
  let i = start;
  while (i < source.length && source[i] !== '\n') i++;
  return i;
}

function skipBlockComment(source: string, start: number): number {
  let i = start;
  while (i + 1 < source.length && !(source[i] === '*' && source[i + 1] === '/')) i++;
  return Math.min(source.length, i + 2);
}

function skipQuotedString(source: string, start: number, quote: '"' | "'"): number {
  let i = start + 1;
  while (i < source.length) {
    const current = source[i];
    if (current === '\\') {
      i += 2;
      continue;
    }
    if (current === quote) return i + 1;
    i++;
  }
  return source.length;
}

function skipTrivia(source: string, start: number, end = source.length): number {
  let i = start;
  while (i < end) {
    const ch = source[i];
    const next = source[i + 1];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '/' && next === '/') {
      i = skipLineComment(source, i + 2);
      continue;
    }
    if (ch === '/' && next === '*') {
      i = skipBlockComment(source, i + 2);
      continue;
    }
    break;
  }
  return i;
}

function scanForDynamicImport(source: string, start = 0, end = source.length): boolean {
  let i = start;
  while (i < end) {
    const ch = source[i];
    const next = source[i + 1];

    if (ch === '/' && next === '/') {
      i = skipLineComment(source, i + 2);
      continue;
    }
    if (ch === '/' && next === '*') {
      i = skipBlockComment(source, i + 2);
      continue;
    }

    if (ch === '"' || ch === "'") {
      i = skipQuotedString(source, i, ch);
      continue;
    }

    if (ch === '`') {
      i++;
      while (i < end) {
        const current = source[i];
        const templateNext = source[i + 1];
        if (current === '\\') {
          i += 2;
          continue;
        }
        if (current === '`') {
          i++;
          break;
        }
        if (current === '$' && templateNext === '{') {
          let depth = 1;
          let j = i + 2;
          while (j < end) {
            const ec = source[j];
            const en = source[j + 1];
            if (ec === '/' && en === '/') {
              j = skipLineComment(source, j + 2);
              continue;
            }
            if (ec === '/' && en === '*') {
              j = skipBlockComment(source, j + 2);
              continue;
            }
            if (ec === '"' || ec === "'") {
              j = skipQuotedString(source, j, ec);
              continue;
            }
            if (ec === '`') {
              let k = j + 1;
              while (k < end) {
                const tc = source[k];
                const tn = source[k + 1];
                if (tc === '\\') {
                  k += 2;
                  continue;
                }
                if (tc === '`') {
                  k++;
                  break;
                }
                if (tc === '$' && tn === '{') {
                  depth++;
                  k += 2;
                  continue;
                }
                if (tc === '}') {
                  depth = Math.max(1, depth - 1);
                }
                k++;
              }
              j = k;
              continue;
            }
            if (ec === '{') depth++;
            else if (ec === '}') {
              depth--;
              if (depth === 0) {
                if (scanForDynamicImport(source, i + 2, j)) return true;
                i = j + 1;
                break;
              }
            }
            j++;
          }
          if (depth > 0) {
            i = end;
            break;
          }
          continue;
        }
        i++;
      }
      continue;
    }

    if (isIdentifierStart(ch)) {
      const start = i;
      i++;
      while (i < end && isIdentifierPart(source[i])) i++;
      const word = source.slice(start, i);
      if (word === 'import') {
        const nextIndex = skipTrivia(source, i, end);
        if (source[nextIndex] === '(') return true;
      }
      continue;
    }

    i++;
  }
  return false;
}

/**
 * 安全扫描：识别可执行的 dynamic import 调用，忽略注释和普通字符串字面量。
 */
export function containsDynamicImport(source: string): boolean {
  return scanForDynamicImport(source);
}

function isWordAt(source: string, start: number, word: string): boolean {
  if (!source.startsWith(word, start)) return false;
  const before = source[start - 1];
  const after = source[start + word.length];
  const beforeOk = !before || !isIdentifierPart(before);
  const afterOk = !after || !isIdentifierPart(after);
  return beforeOk && afterOk;
}

function scanForBlockedCodeExecution(source: string, start = 0, end = source.length): boolean {
  let i = start;
  while (i < end) {
    const ch = source[i];
    const next = source[i + 1];

    if (ch === '/' && next === '/') {
      i = skipLineComment(source, i + 2);
      continue;
    }
    if (ch === '/' && next === '*') {
      i = skipBlockComment(source, i + 2);
      continue;
    }

    if (ch === '"' || ch === "'") {
      i = skipQuotedString(source, i, ch);
      continue;
    }

    if (ch === '`') {
      i++;
      while (i < end) {
        const current = source[i];
        const templateNext = source[i + 1];
        if (current === '\\') {
          i += 2;
          continue;
        }
        if (current === '`') {
          i++;
          break;
        }
        if (current === '$' && templateNext === '{') {
          let depth = 1;
          let j = i + 2;
          while (j < end) {
            const ec = source[j];
            const en = source[j + 1];
            if (ec === '/' && en === '/') {
              j = skipLineComment(source, j + 2);
              continue;
            }
            if (ec === '/' && en === '*') {
              j = skipBlockComment(source, j + 2);
              continue;
            }
            if (ec === '"' || ec === "'") {
              j = skipQuotedString(source, j, ec);
              continue;
            }
            if (ec === '`') {
              let k = j + 1;
              while (k < end) {
                const tc = source[k];
                const tn = source[k + 1];
                if (tc === '\\') {
                  k += 2;
                  continue;
                }
                if (tc === '`') {
                  k++;
                  break;
                }
                if (tc === '$' && tn === '{') {
                  depth++;
                  k += 2;
                  continue;
                }
                if (tc === '}') {
                  depth = Math.max(1, depth - 1);
                }
                k++;
              }
              j = k;
              continue;
            }
            if (ec === '{') depth++;
            else if (ec === '}') {
              depth--;
              if (depth === 0) {
                if (scanForBlockedCodeExecution(source, i + 2, j)) return true;
                i = j + 1;
                break;
              }
            }
            j++;
          }
          if (depth > 0) {
            i = end;
            break;
          }
          continue;
        }
        i++;
      }
      continue;
    }

    if (isIdentifierStart(ch)) {
      const startIndex = i;
      i++;
      while (i < end && isIdentifierPart(source[i])) i++;
      const word = source.slice(startIndex, i);

      if (word === 'eval' || word === 'Function') {
        const callStart = skipTrivia(source, i, end);
        if (source[callStart] === '(') return true;
      }

      if (word === 'setTimeout' || word === 'setInterval') {
        const callStart = skipTrivia(source, i, end);
        if (source[callStart] === '(') {
          const argStart = skipTrivia(source, callStart + 1, end);
          const arg = source[argStart];
          if (arg === '"' || arg === "'" || arg === '`') return true;
        }
      }
      continue;
    }

    if (ch === '.' || (ch === '?' && next === '.')) {
      const propStart = ch === '.' ? i + 1 : i + 2;
      const wordStart = skipTrivia(source, propStart, end);
      if (isWordAt(source, wordStart, 'constructor')) {
        const callStart = skipTrivia(source, wordStart + 'constructor'.length, end);
        if (source[callStart] === '(') return true;
      }
      i = propStart;
      continue;
    }

    if (ch === '[') {
      let j = skipTrivia(source, i + 1, end);
      const quote = source[j];
      if (quote === '"' || quote === "'") {
        const endQuote = skipQuotedString(source, j, quote);
        const key = source.slice(j + 1, Math.max(j + 1, endQuote - 1));
        j = skipTrivia(source, endQuote, end);
        if (key === 'constructor' && source[j] === ']') {
          const callStart = skipTrivia(source, j + 1, end);
          if (source[callStart] === '(') return true;
        }
      }
    }

    i++;
  }
  return false;
}

/**
 * 安全扫描：识别可执行字符串求值路径（eval / Function / constructor / 字符串 timer）。
 */
export function containsBlockedCodeExecution(source: string): boolean {
  return scanForBlockedCodeExecution(source);
}
