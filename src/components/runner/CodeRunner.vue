<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue';

const props = defineProps<{ codeHtml: string }>();

const iframeRef = ref<HTMLIFrameElement | null>(null);
const logs = ref<string[]>([]);

const code = computed(() => extractFirstCode(props.codeHtml));

function extractFirstCode(html: string): string {
  const m = html.match(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/);
  if (!m) return '';
  return decodeHtml(m[1]);
}

function decodeHtml(s: string): string {
  const t = document.createElement('textarea');
  t.innerHTML = s.replace(/<[^>]+>/g, '');
  return t.value;
}

const editable = ref(code.value);
watch(() => props.codeHtml, () => (editable.value = code.value));

function run() {
  logs.value = [];
  if (!iframeRef.value) return;
  const safeCode = editable.value;
  const scriptCloseTag = '</scr' + 'ipt>';
  const html = `<!doctype html><html><body><script>
    const log = (...a)=>parent.postMessage({t:'log', m: a.map(v=>{ try{return typeof v==='string'?v:JSON.stringify(v)}catch{return String(v)} }).join(' ')}, '*');
    const c = console;
    console.log = (...a)=>{log(...a); c.log(...a);};
    console.warn = (...a)=>{log('⚠', ...a);};
    console.error = (...a)=>{log('✖', ...a);};
    window.onerror = (m)=>log('✖', m);
    window.addEventListener('unhandledrejection', e => log('✖ unhandledrejection:', e.reason));
    try {
      ${safeCode}
    } catch (e) { log('✖', e && e.message ? e.message : String(e)); }
  ${scriptCloseTag}</body></html>`;
  iframeRef.value.srcdoc = html;
}

function onMessage(e: MessageEvent) {
  if (!e.data || e.data.t !== 'log') return;
  logs.value.push(String(e.data.m));
}

window.addEventListener('message', onMessage);
onUnmounted(() => window.removeEventListener('message', onMessage));
</script>

<template>
  <div class="runner">
    <header>
      <span>▶️ 代码沙盒（仅适合 JS/TS 片段，仅用于本地测试）</span>
      <button class="btn btn-primary" @click="run">运行</button>
    </header>
    <textarea v-model="editable" rows="10" spellcheck="false" />
    <iframe
      ref="iframeRef"
      class="hidden-iframe"
      sandbox="allow-scripts"
      title="sandbox"
    />
    <pre class="logs">{{ logs.join('\n') || '运行后日志在此显示...' }}</pre>
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
}
textarea {
  width: 100%;
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  background: var(--c-surface);
  padding: 10px;
  resize: vertical;
  min-height: 160px;
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
  min-height: 60px;
  white-space: pre-wrap;
  font-size: 12px;
  color: var(--c-text);
}
</style>
