<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';
import AppIcon from '@/components/icon/AppIcon.vue';

const props = defineProps<{ codeHtml: string }>();

const iframeRef = ref<HTMLIFrameElement | null>(null);
const logs = ref<string[]>([]);
const lang = ref<string>('javascript');
const tip = ref<string>('');
const MAX_LOG_LINES = 200;
const MAX_LOG_LENGTH = 4096;
const LOG_TRUNCATED_MESSAGE = '⚠ 日志过多，后续输出已截断。';

interface ParsedBlock {
  language: string;
  code: string;
}

function parseBlocks(html: string): ParsedBlock[] {
  if (!html) return [];
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const blocks: ParsedBlock[] = [];
  tpl.content.querySelectorAll('pre > code').forEach((codeEl) => {
    const cls = codeEl.getAttribute('class') || '';
    const m = cls.match(/language-([\w+-]+)/);
    blocks.push({
      language: (m?.[1] || 'plain').toLowerCase(),
      code: codeEl.textContent ?? '',
    });
  });
  return blocks;
}

const blocks = computed(() => parseBlocks(props.codeHtml));

const supportedIndex = computed(() => {
  const i = blocks.value.findIndex((b) => isRunnableLang(b.language));
  return i === -1 ? 0 : i;
});

const currentIndex = ref(supportedIndex.value);

watch(supportedIndex, (i) => {
  currentIndex.value = i;
});

watch(blocks, (b) => {
  editable.value = b[currentIndex.value]?.code ?? '';
  lang.value = b[currentIndex.value]?.language ?? 'plain';
  updateTip();
});

watch(currentIndex, (i) => {
  editable.value = blocks.value[i]?.code ?? '';
  lang.value = blocks.value[i]?.language ?? 'plain';
  updateTip();
});

const editable = ref(blocks.value[currentIndex.value]?.code ?? '');
lang.value = blocks.value[currentIndex.value]?.language ?? 'plain';

function isRunnableLang(l: string): boolean {
  return ['js', 'javascript', 'ts', 'typescript', 'jsx', 'tsx'].includes(l);
}

function updateTip() {
  const l = lang.value;
  if (['vue', 'html', 'markup'].includes(l)) {
    tip.value = 'Vue / HTML 模板暂不在沙盒运行，请到本地工程里跑。';
  } else if (['css', 'scss', 'sass'].includes(l)) {
    tip.value = 'CSS 样例无可执行逻辑，沙盒不会运行。';
  } else if (['json', 'yaml', 'bash', 'shell', 'sh', 'diff'].includes(l)) {
    tip.value = '该代码块不是 JS/TS，沙盒不支持运行。';
  } else if (!isRunnableLang(l)) {
    tip.value = '当前语言（' + l + '）沙盒不支持，仅支持 js/ts/jsx/tsx 片段。';
  } else {
    tip.value = '';
  }
}
updateTip();

/**
 * 简单的 TS → JS 转译：覆盖大多数题目代码片段
 * - 移除 import / export 语句（沙盒不能解析模块）
 * - 移除类型注解、interface / type 声明、泛型
 * - 移除 readonly / public / private / protected / declare 修饰
 *
 * 注意：这是"演示级"转译，不能保证 100% 正确。复杂代码请到本地跑。
 */
/**
 * 顶层标识符抽取：从已经做过 TS 转译的 JS 源码里，
 * 提取 const/let/var/function/class 的顶层名字（含解构）。
 * 仅做"看起来像顶层"的简单匹配，目的是为运行后追加 console.log 演示输出。
 */
function collectTopLevelNames(src: string): string[] {
  const names = new Set<string>();
  const lines = src.split(/\r?\n/);
  let depth = 0;
  for (const raw of lines) {
    const line = raw.replace(/\/\/.*$/, '');
    const trimmed = line.trim();
    if (depth === 0 && trimmed) {
      const decl = trimmed.match(/^(?:const|let|var)\s+([^=;]+?)\s*=/);
      if (decl) {
        const head = decl[1].trim();
        if (head.startsWith('{') || head.startsWith('[')) {
          const inner = head.replace(/[{}[\]]/g, '');
          inner.split(',').forEach((part) => {
            const name = part
              .split(':')
              .pop()!
              .split('=')[0]
              .trim()
              .replace(/^\.\.\./, '');
            if (/^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
          });
        } else {
          const name = head.split(/[\s,]/)[0];
          if (/^[A-Za-z_$][\w$]*$/.test(name)) names.add(name);
        }
      }
      const fn = trimmed.match(/^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/);
      if (fn) names.add(fn[1]);
      const cls = trimmed.match(/^class\s+([A-Za-z_$][\w$]*)/);
      if (cls) names.add(cls[1]);
    }
    for (const ch of line) {
      if (ch === '{' || ch === '(' || ch === '[') depth++;
      else if (ch === '}' || ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    }
  }
  return Array.from(names);
}

/**
 * 给运行结果生成 demo 输出：
 * - 已经有 console.* 调用：不画蛇添足，仅在末尾加一条总结
 * - 没有任何 console：根据顶层声明的标识符自动打印它们的值
 * 返回追加到代码末尾的 JS 片段。
 */
function buildDemoTail(src: string, names: string[]): string {
  const hasConsole = /\bconsole\s*\.\s*(log|info|warn|error|debug|table|dir)\s*\(/.test(src);
  const lines: string[] = [];
  lines.push('try {');
  if (!hasConsole && names.length) {
    lines.push('  console.info("ℹ 自动演示：以下是顶层声明的值");');
    for (const n of names) {
      lines.push(`  try {`);
      lines.push(`    var __v = ${n};`);
      lines.push(`    if (typeof __v === "function") {`);
      lines.push(
        `      console.log("· ${n} =", "[Function" + (${n}.name ? " " + ${n}.name : "") + "]");`,
      );
      lines.push(`    } else if (typeof __v === "object" && __v !== null) {`);
      lines.push(`      var __k = Object.keys(__v).slice(0, 8);`);
      lines.push(`      console.log("· ${n} =", __v);`);
      lines.push(`      if (__k.length) console.log("  keys:", __k);`);
      lines.push(`    } else {`);
      lines.push(`      console.log("· ${n} =", __v);`);
      lines.push(`    }`);
      lines.push(`  } catch (e) {}`);
    }
  } else if (!hasConsole && !names.length) {
    lines.push(
      '  console.info("ℹ 该代码片段没有显式输出，多用于演示语法/类型；以下为代码摘要：");',
    );
  }
  lines.push('} catch (e) {}');
  return lines.join('\n');
}

/**
 * 代码摘要：给"无副作用"的片段一个友好的输出。
 */
function summarizeCode(src: string): { lineCount: number; charCount: number; apis: string[] } {
  const KEY_APIS = [
    'fetch',
    'Promise',
    'async',
    'await',
    'setTimeout',
    'setInterval',
    'addEventListener',
    'IntersectionObserver',
    'ResizeObserver',
    'MutationObserver',
    'localStorage',
    'sessionStorage',
    'indexedDB',
    'navigator',
    'document',
    'window',
    'requestAnimationFrame',
    'requestIdleCallback',
    'Worker',
    'BroadcastChannel',
    'Map',
    'Set',
    'WeakMap',
    'WeakRef',
    'Proxy',
    'Reflect',
    'Symbol',
    'Object.',
    'Array.',
    'JSON.',
  ];
  const apis = KEY_APIS.filter((k) => src.includes(k));
  return {
    lineCount: src.split(/\r?\n/).filter((l) => l.trim()).length,
    charCount: src.length,
    apis,
  };
}

function transformTS(src: string): string {
  let s = src;
  s = s.replace(/^\s*(import|export)\b[^\n]*?(;|$)\s*/gm, (m) => {
    if (/^export\s+(default\s+)?(?!type|interface)/.test(m.trim())) {
      return m.replace(/^\s*export\s+(default\s+)?/, '');
    }
    return '';
  });
  s = s.replace(/^\s*(interface|type)\s+\w+[^\n]*\{[\s\S]*?\n\}\s*/gm, '');
  s = s.replace(/^\s*type\s+\w+\s*=[^\n;]+;?\s*$/gm, '');
  s = s.replace(/\bdeclare\s+(const|let|var|function|class|module|namespace)\b[^\n]*\n?/g, '');
  s = s.replace(/\b(public|private|protected|readonly|abstract)\s+/g, '');
  s = s.replace(/\benum\b/g, 'const');
  s = s.replace(/(\)|\b\w+|\])\s*:\s*[^=,)\]{}\n;]+(?=([,)\]=;\n]|$))/g, '$1');
  s = s.replace(/<[A-Z][\w<>,\s|&[\]'"`]*>(?=\()/g, '');
  s = s.replace(/(\bas\s+(unknown\s+as\s+)?[\w<>[\]\s|&,'"`.]+)/g, '');
  s = s.replace(/\?\s*:/g, ':');
  s = s.replace(/(\w+)\?\s*([,)\]=])/g, '$1$2');
  s = s.replace(/\bnon-null!/g, '');
  s = s.replace(/(\w)!(\.|\[|\()/g, '$1$2');
  return s;
}

let messageBound = false;
function bindMessageOnce() {
  if (messageBound) return;
  window.addEventListener('message', onMessage);
  messageBound = true;
}

function appendLog(message: string) {
  const normalized =
    message.length > MAX_LOG_LENGTH
      ? `${message.slice(0, MAX_LOG_LENGTH)}\n…（单条日志已截断）`
      : message;
  if (logs.value.length >= MAX_LOG_LINES) {
    if (logs.value[logs.value.length - 1] !== LOG_TRUNCATED_MESSAGE) {
      logs.value.push(LOG_TRUNCATED_MESSAGE);
    }
    return;
  }
  logs.value.push(normalized);
}

function run() {
  if (!isRunnableLang(lang.value)) {
    logs.value = ['❌ ' + tip.value];
    return;
  }
  if (!iframeRef.value) return;
  bindMessageOnce();
  logs.value = [];

  let code = editable.value;
  if (['ts', 'typescript', 'tsx'].includes(lang.value)) {
    try {
      code = transformTS(code);
    } catch (e) {
      appendLog('⚠ TS 转译失败：' + (e instanceof Error ? e.message : String(e)));
    }
  }

  const summary = summarizeCode(code);
  const names = collectTopLevelNames(code);
  const demoTail = buildDemoTail(code, names);
  const finalSummary = [
    'try {',
    '  console.info("✦ 摘要：" + ' +
      JSON.stringify(`${summary.lineCount} 行 / ${summary.charCount} 字符`) +
      ');',
    summary.apis.length
      ? '  console.info("✦ 涉及 API：" + ' + JSON.stringify(summary.apis.join(', ')) + ');'
      : '',
    names.length
      ? '  console.info("✦ 顶层声明：" + ' + JSON.stringify(names.join(', ')) + ');'
      : '',
    '} catch (e) {}',
  ]
    .filter(Boolean)
    .join('\n');

  const closeTag = '</' + 'script>';
  const html = [
    '<!doctype html><html><head><meta charset="utf-8">',
    "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline';\">",
    '</head><body><script>',
    '(function(){',
    'var origin = ' + JSON.stringify(window.location.origin) + ';',
    'function send(level, args) {',
    '  try {',
    '    var msg = args.map(function(v){',
    '      try { return typeof v === "string" ? v : JSON.stringify(v, null, 2); }',
    '      catch(_) { return String(v); }',
    '    }).join(" ");',
    '    parent.postMessage({ __kapLog: true, level: level, message: msg }, "*");',
    '  } catch (_) {}',
    '}',
    'console.log = function(){ send("log", [].slice.call(arguments)); };',
    'console.info = function(){ send("info", [].slice.call(arguments)); };',
    'console.warn = function(){ send("warn", [].slice.call(arguments)); };',
    'console.error = function(){ send("error", [].slice.call(arguments)); };',
    'console.debug = function(){ send("debug", [].slice.call(arguments)); };',
    'window.onerror = function(m){ send("error", [String(m)]); };',
    'window.addEventListener("unhandledrejection", function(e){ send("error", ["unhandledrejection:", String(e.reason)]); });',
    'try {',
    code,
    demoTail,
    finalSummary,
    '} catch (e) { send("error", [(e && e.stack) ? e.stack : String(e)]); }',
    'send("done", ["✅ 运行结束"]);',
    '})();',
    closeTag,
    '</body></html>',
  ].join('\n');

  iframeRef.value.srcdoc = html;
}

function clear() {
  logs.value = [];
}

function selectBlock(event: Event) {
  currentIndex.value = Number((event.target as HTMLSelectElement).value);
}

interface KapLogPayload {
  __kapLog?: boolean;
  level?: string;
  message?: string;
}
function onMessage(e: MessageEvent<KapLogPayload>) {
  if (e.source !== iframeRef.value?.contentWindow) return;
  const data = e.data;
  if (!data || data.__kapLog !== true) return;
  const prefix =
    (
      {
        error: '❌',
        warn: '⚠',
        info: 'ℹ',
        debug: '·',
        done: '',
        log: '›',
      } as Record<string, string>
    )[data.level || 'log'] ?? '›';
  appendLog((prefix ? prefix + ' ' : '') + (data.message ?? ''));
}

onUnmounted(() => {
  if (messageBound) window.removeEventListener('message', onMessage);
});

const hasMultiBlocks = computed(() => blocks.value.length > 1);
</script>

<template>
  <div class="runner">
    <header>
      <span class="hint">
        <AppIcon name="code" /> 代码沙盒 · 仅支持 JS / TS 片段，TS 会做轻量转译
        <span v-if="lang" class="lang">{{ lang }}</span>
      </span>
      <div class="actions">
        <select v-if="hasMultiBlocks" :value="currentIndex" class="picker" @change="selectBlock">
          <option v-for="(b, i) in blocks" :key="i" :value="i">
            片段 {{ i + 1 }} · {{ b.language }}
          </option>
        </select>
        <button class="btn btn-ghost" title="清空运行日志" @click="clear">
          <AppIcon name="clear" /> 清空
        </button>
        <button
          class="btn btn-primary"
          :title="isRunnableLang(lang) ? '在浏览器沙盒中运行当前代码' : '当前语言不支持沙盒运行'"
          :disabled="!isRunnableLang(lang)"
          @click="run"
        >
          <AppIcon name="play" /> 运行
        </button>
      </div>
    </header>
    <div v-if="tip" class="tip">{{ tip }}</div>
    <textarea v-model="editable" rows="12" spellcheck="false" aria-label="代码沙盒编辑器" />
    <iframe
      ref="iframeRef"
      class="hidden-iframe"
      sandbox="allow-scripts"
      title="代码运行沙盒（受限）"
      aria-hidden="true"
    />
    <pre class="logs">{{
      logs.length ? logs.join('\n') : '点击"运行"，控制台日志会显示在这里…'
    }}</pre>
  </div>
</template>

<style scoped>
.runner {
  margin-top: 14px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  background: var(--c-bg-soft);
  padding: 10px;
}
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--c-text-soft);
  gap: 8px;
  flex-wrap: wrap;
}
.hint {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.lang {
  display: inline-block;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--c-bg-mute);
  font-family: monospace;
  font-size: 11px;
  color: var(--c-text);
}
.tip {
  margin: 0 0 8px;
  padding: 8px 10px;
  background: rgba(245, 158, 11, 0.1);
  color: var(--c-warning);
  border-radius: var(--radius);
  font-size: 12px;
}
.actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.actions .btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.picker {
  padding: 4px 8px;
  border-radius: var(--radius);
  border: 1px solid var(--c-border);
  background: var(--c-surface);
  color: var(--c-text);
  font-size: 12px;
}
textarea {
  width: 100%;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  background: var(--c-surface);
  color: var(--c-text);
  padding: 10px;
  resize: vertical;
  min-height: 200px;
  line-height: 1.55;
}
.hidden-iframe {
  width: 0;
  height: 0;
  border: 0;
}
.logs {
  margin-top: 8px;
  background: var(--c-code-bg);
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  padding: 10px 12px;
  min-height: 80px;
  max-height: 280px;
  overflow: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font-size: 12px;
  color: var(--c-text);
}
</style>
