---
id: 27-data-platform-cases
title: 数据平台业务场景
order: 27
icon: 🏗️
description: 来自真实数据平台（DataLumina / DataPilot）的复杂业务场景：SQL 工作台、AI Agent、调度依赖、多国部署等高频面试题。
---

## sql-workbench-architecture

title: 设计一个浏览器内的 SQL 工作台，整体架构怎么拆？
followups: [sql-workbench-architecture-followup-1]
difficulty: 资深
tags: [架构, SQL, Monaco, 高频]

### 一句话

分四层：编辑器层（Monaco + 自定义 SQL 补全 / 校验）+ 业务状态层（多 Tab Pane + IndexedDB 持久化）+ 数据服务层（元数据缓存 + 历史快照）+ 执行通道（提交 → 轮询结果 → 长任务异步）。

### 题目

你做过浏览器内的 SQL 工作台（类似 DBeaver / Hue 的 web 版），请讲讲整体架构、关键模块和踩过的坑。

### 答案要点

- **顶层布局**：左侧元数据树（数据源 / 库 / 表 / 字段）+ 中间多 Tab 编辑器 + 下方结果区
- **编辑器层（Monaco）**
  - 一份 model 对应一个 Pane（用 URI 隔离）
  - 注册一次语言（hive/mysql），多个实例复用 Provider，避免重复注册卡顿
  - 自定义 SQL 补全 / 校验 / 参数提示（Signature Help / Hover）
  - Web Worker 跑解析器，防止大 SQL 主线程卡顿
- **状态层**
  - 多 Tab Pane：每个 Pane 自带 SQL 文本、结果列表、扩展信息、当前执行 ID
  - 持久化用 IndexedDB（不能用 localStorage，量大且同步）
  - 投影策略：只落"刷新后立即渲染所需的最小字段"，瞬态字段（loading、error、Copilot diff session）不落盘
- **数据服务**
  - 元数据缓存（库表字段，TTL + inflight 去重）
  - SQL 历史 / 收藏 / 下载中心
- **执行通道**
  - 长 SQL 走异步：提交后拿任务 ID，前端按指数退避轮询；可取消
  - 大结果集分页 / 流式拉取（避免一次拿百万行）
- **常见坑**
  - 多 model 共享同一 URI 会内容串扰
  - hive 关键字与方言保留字冲突，需要"上下文相关关键字"判断
  - 切走 Tab 又切回来时 Monaco focus / 光标位置丢失，需要保存 viewState

### 代码示例

```ts
const PANE_TRANSIENT_KEYS = new Set([
  'titleEditing',
  'saveVisible',
  'explain',
  'isNew',
  'copilotSqlEdits',
  'diffChangeRemainingCount',
]);

export const toPersistedPane = (pane: any) => {
  const out: Record<string, any> = {};
  for (const key of Object.keys(pane)) {
    if (PANE_TRANSIENT_KEYS.has(key)) continue;
    if (key === 'extraInfo' || key === 'resultList') continue;
    out[key] = pane[key];
  }
  if (Array.isArray(pane.resultList)) {
    out.resultList = pane.resultList.map(projectResultItem);
  }
  return out;
};
```

### 追问

- 如果把「设计一个浏览器内的 SQL 工作台，整体架构怎么拆？」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- 性能预算：编辑器初次加载 < 800ms（懒加载 monaco-editor + worker chunk）
- 高级能力：SQL 格式化（formatter）、Lineage 血缘图、SQL Lint、AI 改写
- 类似产品：Hue、DataGrip、DBeaver、Apache Superset、字节 ByteHouse

## monaco-multi-pane-isolation

title: Monaco 多 Tab 编辑器实例之间怎么做隔离？
followups: [monaco-multi-pane-isolation-followup-1]
difficulty: 资深
tags: [Monaco, 多实例, 内存]

### 一句话

每个 Tab 用独立 URI 创建独立 model；语言 / 补全 Provider 全局注册一次（用模块级 flag 判重）；Tab 关闭时主动 dispose model 释放内存；切 Tab 保存 / 恢复 viewState 维持光标位置。

### 题目

项目里需要同时打开多个 SQL Tab，每个 Tab 一个独立编辑器。怎么避免 Tab 间内容串扰、内存泄漏、光标丢失？

### 答案要点

- **URI 隔离**：`monaco.Uri.parse('inmemory://pane/<paneKey>')`；同一个 URI 全局只有一份 model，多实例共享会出问题
- **匿名 Pane**：模态预览等没有 paneKey 的实例，需要分配自增序号 URI，避免几个匿名实例共享同一 model
- **Provider 一次性注册**：用模块级布尔变量 `hiveProvidersRegistered` 守卫，避免每次 mount 重复注册导致补全候选项重复
- **Editor vs Model 生命周期**
  - Editor 实例随组件销毁而 dispose
  - Model 可能在多个 editor 间复用（diff editor / 主编辑器），切 Tab 时不要直接 dispose
  - Tab 真正关闭时再 `model.dispose()`
- **viewState 保存 / 恢复**
  - 切走前 `editor.saveViewState()` 存到 Pane
  - 切回时 `editor.setModel(model); editor.restoreViewState(state); editor.focus()`
- **内存监控**
  - DevTools → Memory → Heap snapshot 看 monaco model / editor 实例数量
  - 排查泄漏方法：关 Tab 后强制 GC，再看 detached 节点

### 代码示例

```ts
let hiveLanguageRegistered = false;
let hiveProvidersRegistered = false;
let anonymousPaneSeq = 0;

function ensureHiveLanguage(monaco: any) {
  if (hiveLanguageRegistered) return;
  monaco.languages.register({ id: 'hive' });
  monaco.languages.setMonarchTokensProvider('hive', hiveLanguage);
  hiveLanguageRegistered = true;
}

function getModelUri(paneKey?: string) {
  return monaco.Uri.parse(
    paneKey ? `inmemory://pane/${paneKey}` : `inmemory://anon/${++anonymousPaneSeq}`,
  );
}

const viewStateMap = new Map<string, monaco.editor.ICodeEditorViewState>();

function switchToPane(paneKey: string, model: monaco.editor.ITextModel) {
  const old = editor.getModel();
  if (old) viewStateMap.set(currentKey, editor.saveViewState()!);
  editor.setModel(model);
  const state = viewStateMap.get(paneKey);
  if (state) editor.restoreViewState(state);
  editor.focus();
}
```

### 追问

- 如果把「Monaco 多 Tab 编辑器实例之间怎么做隔离？」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- @vue/repl / Stackblitz 都是基于 Monaco 多文件
- 一些团队选择"全局一个 Monaco editor + 切换 model"省内存，代价是 viewState 维护更复杂
- monaco-editor-textmate 可加更精细的语法高亮，但会显著增加首屏体积

## sql-completion-with-worker

title: SQL 自动补全 / 校验怎么做才不卡 UI？
followups: [sql-completion-with-worker-followup-1]
difficulty: 资深
tags: [Monaco, SQL, Worker, 性能]

### 一句话

解析放 Web Worker 跑（主线程不卡）；校验做防抖（默认 400ms，每个 model URI 一个 timer）；业务变量占位符 `${var}` 等长替换为合法 identifier 避免误报；补全候选项异步返回。

### 题目

SQL 编辑器要支持基于 AST 的精确补全和语法校验，怎么做？

### 答案要点

- **解析迁移到 Worker**
  - SQL parser（dt-sql-parser / antlr 生成）解析大文件可能 100ms+，放主线程会卡输入
  - `parser.worker.ts`：`onmessage` 收文本 → 解析 → `postMessage(result)`
  - 主线程拿到 `parseResult` 给 Monaco 的 `provideCompletionItems` 用
- **校验防抖**
  - 用户连续输入会触发大量 onDidChangeModelContent，每次解析浪费
  - 每个 model URI 维护一个 setTimeout（400ms），新输入清掉旧 timer
  - 解析结果转 Monaco MarkerData，通过 `setModelMarkers(model, owner, markers)` 渲染红色波浪线
- **业务变量占位符处理**
  - 真实 SQL 里有 `${p_date}` 这种业务变量，不是合法 SQL token
  - 校验前等长替换为字母 x 序列 `xxxxxxxx`：保持行列号对齐，错误位置不偏移
  - 注意保留 `\n \r`，跨行占位符也要正确
  - 不能用 `_`：Hive lexer 对纯下划线序列有 LIKE 通配符特殊处理，会误报
- **补全候选项**
  - 表名 / 字段名来自元数据接口，调用 `metadataCache.getOrFetch` 命中本地缓存
  - 关键字补全靠 parser 的 nextMatchings 拿到上下文期望的 token
  - "上下文相关关键字"：把保留字按当前位置过滤（如 SELECT 后才提示 FROM）
- **失败兜底**
  - parser 自身可能崩溃 → try/catch + 清空已有 marker 避免展示过时错误
  - Worker 崩溃后自动重启
- **测试**
  - 写 markdown 测试用例（autocomplete.test.md）维护：输入 → 期望补全列表

### 代码示例

```ts
const VAR_PLACEHOLDER_RE = /\$\{[^}]+\}/g;

function sanitizeForValidate(src: string): string {
  return src.replace(VAR_PLACEHOLDER_RE, (m) => m.replace(/[^\r\n]/g, 'x'));
}

const pendingTimers = new Map<string, number>();
const DEBOUNCE_MS = 400;

export function scheduleValidate(model: monaco.editor.ITextModel) {
  const key = model.uri.toString();
  const prev = pendingTimers.get(key);
  if (prev) window.clearTimeout(prev);

  const timer = window.setTimeout(() => {
    pendingTimers.delete(key);
    if (model.isDisposed()) return;
    try {
      const errors = validator.validate(sanitizeForValidate(model.getValue()));
      monaco.editor.setModelMarkers(model, 'hive-sql-syntax', errors.map(toMarker));
    } catch {
      monaco.editor.setModelMarkers(model, 'hive-sql-syntax', []);
    }
  }, DEBOUNCE_MS);

  pendingTimers.set(key, timer);
}
```

### 追问

- 如果把「SQL 自动补全 / 校验怎么做才不卡 UI？」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- antlr4ts 生成的 parser 体积巨大，按需 chunk + Worker 是最佳实践
- 多方言（Hive/Spark/Presto/MySQL）：用策略模式 + 方言切换
- 上下文相关关键字：把"在某些位置不应该提示"列成黑名单，避免误导

## metadata-cache-inflight

title: 元数据接口高并发去重 + 缓存怎么设计？
followups: [metadata-cache-inflight-followup-1]
difficulty: 进阶
tags: [缓存, 并发, 高频]

### 一句话

两层防护：缓存（TTL 5min）+ inflight Map（同 key 的并发请求共享同一个 Promise）。命中缓存直接返回，没有就发请求且把 promise 存进 inflight，后续并发请求直接 await 这个 promise。

### 题目

SQL 工作台元数据（库 / 表 / 字段）请求很频繁，且同一个 key 经常被多个组件同时请求。如何避免重复发请求又保证错误能正确传播？

### 答案要点

- **问题场景**
  - 一个页面 5 个组件同时挂载都要查 `db.users` 表的字段
  - 没有缓存：5 次重复请求
  - 简单 Promise 缓存（一直存 Promise）：失败了也卡住
- **设计**
  - `cache: Map<key, { data, expireAt }>` —— TTL 缓存，过期后失效
  - `inflight: Map<key, Promise>` —— 进行中请求的 Promise 池
  - 流程：
    1. 命中未过期缓存 → 直接返回
    2. inflight 有 → 复用同一个 promise（自动 await）
    3. 都没有 → 发起请求，把 promise 放进 inflight
    4. 成功：写缓存 + 从 inflight 删除
    5. 失败：从 inflight 删除（让下次还能重试），不缓存错误
- **使部分作废 invalidate**
  - 元数据被外部修改（用户在另一个 Tab 改了表结构），按前缀作废
  - `invalidateByPrefix('db.users.')`
- **极端场景**
  - 离线时不发请求，直接返回旧缓存（stale-while-offline）
  - 强制刷新需要 `forceFresh` 选项

### 代码示例

```ts
class MetadataCache {
  private cache = new Map<string, { data: any; expireAt: number }>();
  private inflight = new Map<string, Promise<any>>();
  private TTL = 5 * 60 * 1000;

  async getOrFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const hit = this.cache.get(key);
    if (hit && Date.now() < hit.expireAt) return hit.data as T;

    const inflight = this.inflight.get(key);
    if (inflight) return inflight;

    const p = fetcher()
      .then((data) => {
        this.cache.set(key, { data, expireAt: Date.now() + this.TTL });
        this.inflight.delete(key);
        return data;
      })
      .catch((e) => {
        this.inflight.delete(key);
        throw e;
      });

    this.inflight.set(key, p);
    return p;
  }

  invalidateByPrefix(prefix: string) {
    for (const k of this.cache.keys()) {
      if (k.startsWith(prefix)) this.cache.delete(k);
    }
  }
}
```

### 追问

- 如果把「元数据接口高并发去重 + 缓存怎么设计？」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- React Query / SWR 内置了类似的"deduping + stale-time + cache-time"行为
- 高级版本：LRU 限制条数 + 持久化到 IndexedDB（跨 Tab 共享）
- BroadcastChannel 同步多 Tab 的 invalidate

## indexeddb-pane-persistence

title: 多 Tab 编辑器状态怎么持久化（投影模式）
followups: [indexeddb-pane-persistence-followup-1]
difficulty: 资深
tags: [IndexedDB, 持久化, 状态]

### 一句话

不要无脑序列化整个 store——按"投影"思路只保留刷新后还有意义的字段；瞬态字段（loading、流式 diff session、临时 UI 状态）剔除；大字段（结果集 body）由后端按需补回。

### 题目

SQL 工作台关掉浏览器再打开，需要恢复全部 Tab + 输入内容 + 上次执行结果。怎么持久化才不卡也不留脏数据？

### 答案要点

- **为什么不用 localStorage**
  - 大小限制（5MB），结果集随便几万行就爆
  - 同步 API，写入大对象会阻塞主线程
- **为什么用 IndexedDB**
  - 异步、容量大（数百 MB）
  - 支持事务、二进制
  - 推荐用 idb-keyval / Dexie 简化 API
- **投影策略（核心）**
  - 定义"持久化字段白名单"，比如 ResultItem 只留 `key/id/status/resultType/engine/errorLine`
  - 大 body（百万行结果）不落盘；刷新后由 `fetchSqlInfo` 轮询从后端补回
  - 瞬态字段（titleEditing/saveVisible/copilotSqlEdits）显式剔除——避免刷新后 UI 出现"僵尸状态"
- **写入时机**
  - 不要每次 setState 都写：用 watch 加防抖（500ms）批量落盘
  - 离开页面时 `beforeunload` 同步触发一次最终保存
- **读取时机**
  - 应用启动时一次性读出所有 Pane → 立即渲染
  - 状态恢复后再启动后端轮询补全大字段
- **版本化**
  - schema 版本号字段；升级时 migrate / 弃旧
  - 兼容用户跨版本回滚

### 代码示例

```ts
const PANE_TRANSIENT_KEYS = new Set([
  'titleEditing',
  'saveVisible',
  'explain',
  'isNew',
  'copilotSqlEdits',
  'diffChangeRemainingCount',
]);

const RESULT_ITEM_KEYS = ['key', 'id', 'currentId', 'status', 'resultType', 'engine', 'errorLine'];

function projectResultItem(item: any) {
  const out: Record<string, any> = {};
  for (const k of RESULT_ITEM_KEYS) {
    if (item?.[k] !== undefined) out[k] = item[k];
  }
  return out;
}

function toPersistedPane(pane: any) {
  const out: Record<string, any> = {};
  for (const key of Object.keys(pane)) {
    if (PANE_TRANSIENT_KEYS.has(key)) continue;
    if (key === 'extraInfo' || key === 'resultList') continue;
    out[key] = pane[key];
  }
  if (Array.isArray(pane.resultList)) {
    out.resultList = pane.resultList.map(projectResultItem);
  }
  return out;
}

import { set, get } from 'idb-keyval';
import { debounce } from 'lodash-es';

const persist = debounce(async (paneList) => {
  await set('panes', paneList.map(toPersistedPane));
}, 500);
```

### 追问

- 如果把「多 Tab 编辑器状态怎么持久化（投影模式）」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- 同源跨 Tab 共享需要 BroadcastChannel 通知 invalidate
- 浏览器存储配额：可用 `navigator.storage.estimate()` 监控
- 进阶："增量持久化" + 操作日志，可恢复到任意时间点

## sql-result-polling

title: 长 SQL 异步执行 + 前端轮询结果怎么设计
followups: [sql-result-polling-followup-1]
difficulty: 进阶
tags: [轮询, 异步, 性能]

### 一句话

前端提交 SQL 拿到 task ID → 指数退避轮询 status；可取消、可后台运行；完成时再拉详情；同 Tab 关闭后任务在后端继续，下次打开恢复结果。

### 题目

SQL 平均跑 30s 到 10min，前端怎么处理"提交-等待-取结果"的全流程？

### 答案要点

- **不要 long polling 单连接**：浪费连接、网关常见超时 30s
- **任务化**
  - 提交：POST /sql/submit → `{ taskId }`
  - 轮询：GET /sql/status?taskId=xxx → `{ status, result?, errorMsg? }`
  - 取消：POST /sql/cancel
- **轮询策略**
  - 指数退避：1s → 2s → 4s → 8s → 16s（封顶）
  - 用户操作（再次点击运行）立即重置间隔
  - 用 `setTimeout` 递归调度而非 `setInterval`，避免重叠请求
- **生命周期**
  - 切走 Tab：继续轮询（任务对用户来说还要展示）
  - 关闭 Tab：停止轮询（但任务还在后端跑）
  - 重新打开应用：从 IndexedDB 恢复 Pane 后，再发起 status 查询
- **可取消**
  - AbortController 取消 fetch
  - 同时调 `/cancel` 让后端中断
- **失败重试**
  - 网络错误：限制次数（3 次）后给用户报错
  - 业务错误（语法/权限）：不重试，直接展示错误位置（errorLine）
- **结果分页**
  - 总行数大时按 cursor 分页拉取
  - 表格组件支持虚拟滚动 + 异步加载更多

### 代码示例

```ts
async function pollStatus(taskId: string, signal: AbortSignal) {
  let interval = 1000;
  const MAX = 16000;
  while (!signal.aborted) {
    const { status, result, errorMsg } = await fetchStatus(taskId, signal);
    if (status === 'SUCCESS') return result;
    if (status === 'FAILED') throw new Error(errorMsg);
    if (status === 'CANCELED') throw new Error('已取消');
    await sleep(interval, signal);
    interval = Math.min(interval * 2, MAX);
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(t);
      reject(new Error('aborted'));
    });
  });
}

const ctrl = new AbortController();
try {
  const result = await pollStatus(taskId, ctrl.signal);
} catch (e) {
  if (e.message !== 'aborted') showError(e);
}
```

### 追问

- 如果把「长 SQL 异步执行 + 前端轮询结果怎么设计」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- 优雅替代：SSE / WebSocket 推送状态变更（节省 API 请求量）
- 大型平台一般 SSE 推 status，REST 拉详情，混合使用
- 进度感知：把后端的 stage（解析 / 执行 / 写文件）展示给用户

## ai-agent-streaming-render

title: AI Agent 流式对话怎么渲染才不卡
followups: [ai-agent-streaming-render-followup-1]
difficulty: 资深
tags: [AI, 流式, Markdown, 性能]

### 一句话

后端用 SSE 推 token；前端拿 chunk 拼到 streamingContent；watch 它做"节流式"markdown 渲染（短文本逐字、长文本每 N 个 chunk 才渲染一次），并提供"停止生成"按钮（AbortController）。

### 题目

做一个 AI 对话页（类似 ChatGPT），后端流式返回 markdown，前端如何边收边渲染、不丢消息、不掉帧、可中断？

### 答案要点

- **传输协议**：SSE（单向、自动重连、event ID）；OpenAI / Anthropic / DeepSeek 都是 SSE
- **前端接收**
  - `fetch` + `ReadableStream`（比 EventSource 灵活，支持自定义 header / POST）
  - `TextDecoder` 流式解码
  - 按 `\n\n` 切分事件、解析 `data: {...}` JSON
- **增量拼接**
  - 维护一个 `streamingContent` ref，新 token append 上去
  - 用 watch 触发 markdown 渲染：但每个 token 都渲染会卡（markdown-it 解析整段 + DOMPurify 转换）
  - 节流策略：内容 < 200 字时每个 chunk 都渲染（用户看着字蹦出来很爽）；> 200 后每 3 个 chunk 才渲染一次
- **DOM 更新性能**
  - v-html 整段替换会重建子树 → 浏览器很可能能复用大部分（但代码块有 prismjs 高亮，重复处理浪费）
  - 进阶方案：把"已稳定的段落"用 stable key 缓存；只渲染最后一段
  - 滚动到底部用 `requestAnimationFrame` 而非 sync，避免每次 reflow
- **可中断**
  - `streamAbortController = new AbortController()` 传给 fetch
  - 用户点"停止生成" → controller.abort() → 流自然结束
  - 已收到的内容保留为最终消息
- **错误恢复**
  - SSE 断流（网络抖动）：重连，根据 last event id 续传（如果后端支持）
  - 否则提示"网络中断，是否重新生成"
- **状态机**
  - idle → sending → receiving → done / error / aborted
  - 每个状态对应不同 UI（按钮文案、loading 动画、骨架）

### 代码示例

```ts
const streamingContent = ref('');
const streamingContentHtml = ref('');
const streamAbortController = ref<AbortController | null>(null);
let renderCount = 0;

watch(streamingContent, (val) => {
  if (!val) {
    streamingContentHtml.value = '';
    renderCount = 0;
    return;
  }
  renderCount++;
  if (renderCount % 3 !== 0 && val.length >= 200) return;
  try {
    streamingContentHtml.value = renderAgentMarkdown(val);
  } catch {
    streamingContentHtml.value = '';
  }
});

async function send(prompt: string) {
  streamAbortController.value = new AbortController();
  const res = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
    signal: streamAbortController.value.signal,
  });
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const events = buf.split('\n\n');
    buf = events.pop() || '';
    for (const ev of events) {
      const m = ev.match(/^data: (.+)$/);
      if (m) {
        const data = JSON.parse(m[1]);
        if (data.delta) streamingContent.value += data.delta;
      }
    }
  }
}

function stop() {
  streamAbortController.value?.abort();
}
```

### 追问

- 如果把「AI Agent 流式对话怎么渲染才不卡」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- markdown-it 大文本渲染要做缓存（避免重复解析整段）
- 代码块高亮可以"延迟到流结束后"再统一处理
- 多模态：图片 / 表格 / 工具调用回包 都按事件类型分发

## sql-copilot-diff

title: AI 改写 SQL 的 Diff 接受/拒绝交互怎么做
followups: [sql-copilot-diff-followup-1]
difficulty: 资深
tags: [AI, Monaco, Diff]

### 一句话

后端返回结构化 sqlEdits 列表（每条带类型 ADD/DELETE/UPDATE + 行号 + 新内容）；前端在 Monaco 用 inline decorator 标出来，提供"逐条接受 / 全部接受 / 拒绝"；状态绑定到当前 Pane 但不持久化（刷新即清空避免僵尸 diff）。

### 题目

SQL 编辑器接入 AI Copilot：用户提需求，AI 给一段改动建议，怎么做"GitHub PR 风格"的逐块审查？

### 答案要点

- **数据结构**
  - sqlEdits: `{ id, type: 'ADD'|'DELETE'|'UPDATE', startLine, endLine, newText }[]`
  - sessionId / requestId：用于撤销 / 反馈
- **可视化**
  - Monaco 的 `deltaDecorations` 给增加段加绿色背景、删除段加红色删除线
  - 行号旁加小图标按钮"✓接受 / ✗拒绝"（用 contentWidget / overlay）
  - 全局浮条："剩余 N 处变更 / 全部接受 / 全部拒绝"
- **状态管理**
  - 把 `copilotSqlEdits` + `diffChangeRemainingCount` 挂在 Pane 对象上
  - 每个 Pane 独立（切 Tab 不影响其他 Tab）
- **刷新清理（关键）**
  - Diff 状态依赖运行期的 WebSocket session，刷新后无法继续接受 / 拒绝
  - 落盘投影时**显式排除** `copilotSqlEdits` / `diffChangeRemainingCount`
  - 否则刷新后 toolbar 出现"剩余 N 处变更"但点击没反应的僵尸条
- **应用变更**
  - 用 `editor.executeEdits(source, [{ range, text }])` 单条应用
  - 应用后从 `copilotSqlEdits` 移除该条
  - 全部应用完清空状态 + 关闭浮条
- **反馈 / 学习**
  - 接受率 / 拒绝率上报给后端用于 Prompt 调优
  - 用户可对单条改动点"赞 / 踩"

### 代码示例

```ts
type SuggestionChunk = {
  sessionId?: string;
  requestId?: string;
  id: string;
  type: 'ADD' | 'DELETE' | 'UPDATE';
  startLine: number;
  endLine: number;
  newText: string;
  oldText?: string;
};

const copilotSqlEdits = ref<SuggestionChunk[]>([]);

const persistToPane = () => {
  const pane = getPane();
  if (!pane) return;
  pane.copilotSqlEdits = [...copilotSqlEdits.value];
  pane.diffChangeRemainingCount = copilotSqlEdits.value.length;
};

const acceptOne = (id: string) => {
  const edit = copilotSqlEdits.value.find((e) => e.id === id);
  if (!edit) return;
  editor.executeEdits('copilot', [
    {
      range: new monaco.Range(edit.startLine, 1, edit.endLine, Number.MAX_SAFE_INTEGER),
      text: edit.newText,
    },
  ]);
  copilotSqlEdits.value = copilotSqlEdits.value.filter((e) => e.id !== id);
  persistToPane();
  reportFeedback({ id, action: 'accept' });
};

const PANE_TRANSIENT_KEYS = new Set(['copilotSqlEdits', 'diffChangeRemainingCount']);
```

### 追问

- 如果把「AI 改写 SQL 的 Diff 接受/拒绝交互怎么做」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- Cursor / Copilot Chat 的 Apply 流程类似
- 大段重写时可以走 diff editor（Monaco 内置 `createDiffEditor`），并排显示
- 注意"用户输入与 AI 输出冲突"：edit 应用前先比较行号是否还有效（用户可能已修改）

## task-dependency-dag

title: 任务调度 DAG 依赖图怎么前端展示和交互
followups: [task-dependency-dag-followup-1]
difficulty: 资深
tags: [可视化, DAG, 调度]

### 一句话

用 DAG 可视化库（dagre + G6 / antv X6 / vue-flow）把节点 + 边布局；前端只渲染当前视口（虚拟化）+ 节点里再放轻量 ECharts 缩略图；点击节点查看上下游、双击展开子图。

### 题目

数据调度平台需要展示几千个任务的 DAG 依赖关系（上下游链路），前端怎么做才不会卡？

### 答案要点

- **数据准备**
  - 后端只返回当前节点 N 跳之内的子图（避免一次拉几万节点）
  - 节点 / 边都做 ID 唯一化，前端用 Map 索引
- **布局算法**
  - 选 dagre / elk.js 做层次布局
  - 计算成本高，搬到 Web Worker
  - 缓存布局结果（hash 子图 ID 列表 → 位置）
- **渲染选型**
  - 千级节点：SVG（D3 / antv X6）+ DOM 事件，体验好但极限 1-2k
  - 万级节点：Canvas（G6）+ 自定义 hitTest
  - 十万级：WebGL（Sigma.js / Pixi.js）
- **虚拟化**
  - 视口外的节点不绘制
  - 缩放分级 LOD：远视图只显示矩形 + 颜色，近视图才画文字
- **交互**
  - 双击展开 / 折叠子树
  - 点击节点高亮上下游链路（DFS / BFS 遍历）
  - 右键菜单：补数据 / 重跑 / 查日志
- **诊断模式**
  - 失败链路一键高亮（飘红）
  - 阻塞分析：最长路径、瓶颈节点
- **持久化**
  - 用户的视图状态（zoom / pan / 展开节点）存 localStorage 跨刷新

### 代码示例

```ts
import { Graph } from '@antv/g6';
import dagre from 'dagre';

function layoutDag(nodes, edges) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', ranksep: 60, nodesep: 30 });
  nodes.forEach((n) => g.setNode(n.id, { width: 160, height: 60 }));
  edges.forEach((e) => g.setEdge(e.source, e.target));
  dagre.layout(g);
  return {
    nodes: nodes.map((n) => ({ ...n, x: g.node(n.id).x, y: g.node(n.id).y })),
    edges,
  };
}

function highlightUpstream(graph, nodeId) {
  const visited = new Set([nodeId]);
  const stack = [nodeId];
  while (stack.length) {
    const id = stack.pop()!;
    graph.getNodeEdges(id, 'in').forEach((e) => {
      const src = e.source;
      if (!visited.has(src)) {
        visited.add(src);
        stack.push(src);
      }
    });
  }
  graph.updateNodeStyle((n) => (visited.has(n.id) ? { fill: '#1677ff' } : {}));
}
```

### 追问

- 如果把「任务调度 DAG 依赖图怎么前端展示和交互」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- 调度平台典型代表：Airflow、DolphinScheduler、字节 Aeolus
- DAG 里的"诊断"高级功能：上下游断链定位、SLA 倒推
- 可视化超大数据用 Apache ECharts 5 的 graphGL，或自研 GPU 渲染

## multi-stage-deployment

title: 多国 / 多环境部署（CN / ID / SP / MX）怎么管理差异
followups: [multi-stage-deployment-followup-1]
difficulty: 进阶
tags: [架构, 部署, i18n]

### 一句话

用 `__STAGE__` 环境变量在构建期定义；运行期通过条件分支与配置文件加载差异（权限点、CDN 域名、日期格式、合规字段）；不要把"国家"散落在业务组件里，统一封装在 `useStage` / `getStageConfig` 入口。

### 题目

同一份代码部署到中国、印尼、西班牙、墨西哥四个国家，每个国家有不同的 CDN、合规要求、日期 / 货币格式、菜单权限。怎么设计才不会变成 if-else 地狱？

### 答案要点

- **构建期注入**
  - Vite / Webpack `define` 把 `__STAGE__` 注入为字符串常量（'cn' / 'id' / ...）
  - Tree shaking 后，`if (__STAGE__ === 'cn')` 在非 CN 包里整段消失
- **运行期配置中心**
  - 每个 stage 一份 JSON：CDN 域名、API 域名、特性开关、权限点、合规字段
  - 构建期 import 对应 JSON：`import config from \`./config/${**STAGE**}.json\``
- **统一入口**
  - `useStage()`：返回当前 stage / 对应配置 / 是否启用某特性
  - 业务组件不直接判断国家，调用 `useFeature('xxx')` 或 `getRegionConfig().dateFormat`
- **本地化**
  - 日期 / 数字 / 货币用 Intl，避免硬编码字符串
  - 文案放 i18n，按 stage 默认语言（CN→zh-CN，ID→id-ID，SP→es-ES，MX→es-MX）
- **权限差异**
  - 菜单按 stage + 用户角色做 union，前后端双重校验
  - 部分国家不开放某些功能（合规要求）：在路由 guard 拦截
- **运维 / 发布**
  - 同一份 git 仓库，CI 矩阵构建出 N 份 dist
  - CDN 命名空间隔离：`cdn-cn.x.com / cdn-id.x.com`
  - 灰度先在 ID（用户量小）做 1 周，再放 CN
- **监控**
  - 错误监控按 stage 拆分 dashboard
  - 指标对比：同一功能在 4 个国家的表现是否异常

### 代码示例

```ts
declare const __STAGE__: 'cn' | 'id' | 'sp' | 'mx';

import cnConfig from './config/cn.json';
import idConfig from './config/id.json';

const configMap = { cn: cnConfig, id: idConfig };
export const stageConfig = configMap[__STAGE__];

export function useStage() {
  return {
    stage: __STAGE__,
    isCN: __STAGE__ === 'cn',
    config: stageConfig,
    feature: (key: string) => stageConfig.features[key] === true,
    formatDate: (d: Date) => new Intl.DateTimeFormat(stageConfig.locale).format(d),
  };
}

const { feature, formatDate } = useStage();
if (feature('aiCopilot')) {
}
```

### 追问

- 如果把「多国 / 多环境部署（CN / ID / SP / MX）怎么管理差异」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- 国家差异不仅在 UI，还在数据合规（GDPR / 印尼 PDP / 中国数据出境）
- 把"特性开关 + 权限点 + 合规字段"封装成统一 SDK，业务零知识接入
- A/B 测试也走同一套基础设施

## permission-matrix-frontend

title: 复杂权限体系（数据 + 操作）前端怎么做
followups: [permission-matrix-frontend-followup-1]
difficulty: 资深
tags: [权限, 架构, 高频]

### 一句话

分两层：菜单 / 路由层（路由 guard 拦截）+ 组件 / 按钮层（用 `v-permission` 指令或 `<HasPerm>` 组件包裹）；权限点字符串化（`metric:create`），后端是唯一真源，前端只做 UI 遮蔽（关键操作仍由后端二次校验）。

### 题目

数据平台有几百个权限点，资源（数据源 / 表 / 指标）和操作（增删改查 / 审核 / 下载）各成体系。前端怎么实现才不会到处 if-else？

### 答案要点

- **核心理念**
  - 前端只做"看见 / 不可点"，关键操作的最终鉴权永远在后端
  - 权限不是布尔值，是字符串集合（`['metric:create', 'datasource:read']`）
  - 数据权限（行级 / 列级）通常由后端在数据返回时已过滤
- **数据来源**
  - 登录后拉一次 user.permissions[]
  - 缓存到 Pinia + localStorage，刷新不丢失（注意安全：仅 UI hint）
- **路由级**
  - 路由 meta：`{ permissions: ['datasource:list'] }`
  - 全局 guard 检查；不通过跳 403 / 提示
- **组件级**
  - 自定义指令：`<Button v-permission="'metric:create'">创建</Button>` 不通过则隐藏（或 disabled + tooltip）
  - 高阶组件：`<HasPerm code="metric:create">...</HasPerm>` 适合复杂条件
  - 复合：`v-permission="['a', 'b']"` 默认 ALL；可加 modifier `v-permission.any="['a','b']"`
- **数据权限**
  - 行级（用户只能看自己部门数据）：后端返回时已过滤
  - 列级（用户不能看身份证字段）：后端 mask 或前端按 `record._maskedFields` 处理
- **操作流程**
  - 进入页面 → 检查菜单权限
  - 渲染按钮 → 检查操作权限
  - 提交请求 → 后端再次校验
  - 任一不通过 → 友好降级（不是直接报错）
- **设计陷阱**
  - 不要直接 `v-if="user.role === 'admin'"`，role 在跨业务时不通用
  - 不要把权限分散到组件内部，集中维护权限点常量
  - 权限变更（管理员调整）需要做"广播"或下次刷新生效

### 代码示例

```ts
export const PERMS = {
  METRIC_CREATE: 'metric:create',
  METRIC_DELETE: 'metric:delete',
  DATASOURCE_LIST: 'datasource:list',
} as const;

import type { Directive } from 'vue';
import { useUserStore } from '@/store/user';

export const vPermission: Directive<HTMLElement, string | string[]> = {
  mounted(el, binding) {
    const need = ([] as string[]).concat(binding.value);
    const ok = useUserStore().hasAll(need);
    if (!ok) el.style.display = 'none';
  },
};

router.beforeEach((to) => {
  const need = (to.meta?.permissions || []) as string[];
  if (need.length && !useUserStore().hasAll(need)) {
    return { name: 'forbidden' };
  }
});
```

```vue
<HasPerm :code="PERMS.METRIC_CREATE">
  <Button @click="onCreate">创建指标</Button>
</HasPerm>
```

### 追问

- 如果把「复杂权限体系（数据 + 操作）前端怎么做」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- 复杂条件（"自己创建的可以删 / 别人的不能删"）走表达式，比如 `metric:delete:own`
- 大型公司用 OPA / Casbin 做策略引擎，前端只查询"能不能"
- 注意 i18n 时把权限"隐藏"还是"置灰提示原因"，体验差异很大

## big-table-virtualization

title: 数据平台几十万行结果集表格怎么不卡
followups: [big-table-virtualization-followup-1]
difficulty: 资深
tags: [虚拟列表, 表格, 性能, 高频]

### 一句话

用支持虚拟滚动的表格组件（vxe-table / ag-grid / TanStack Table）；行虚拟化 + 列虚拟化都开；分页拉数据 + 服务端排序 / 筛选；大单元格内容（JSON、长文本）懒展开。

### 题目

SQL 跑出 50 万行结果，前端要展示 + 排序 + 筛选 + 复制 + 导出，怎么做？

### 答案要点

- **表格选型**
  - vxe-table 4.x：性能好，复杂功能（编辑、树表、导出）齐全
  - ag-grid：商业级，pivot / aggregation 强大，社区版够用
  - TanStack Table（前 react-table）：headless，自己控制渲染
- **行虚拟化（必须）**
  - 50 万行不可能 DOM 全渲染——只渲染视口 + 上下 buffer 行
  - 关键：每行高度固定（不固定时性能下降明显）
- **列虚拟化（按需）**
  - 列数 > 30 时建议开
  - 注意：固定列 / 列拖动 / 列调宽兼容
- **数据流**
  - 全量数据放内存（50 万行 × 平均 20 字段 ≈ 几十 MB，可承受）
  - 不可承受时：服务端分页 + 滚动到底加载下一页
- **排序 / 筛选**
  - 数据量大时，前端排序会卡几秒 → 改服务端排序，URL 带参数
  - 筛选同理；前端只做"已加载部分"的快速筛选
- **导出**
  - 浏览器内导出 50 万行 Excel 卡死 → 让后端生成下载链接
  - 必须前端导：用 SheetJS（xlsx）+ Web Worker，分批写入
- **复制**
  - "复制整列 / 整行"：用 navigator.clipboard.writeText
  - 大量数据走"复制为 CSV / TSV"格式（Excel 粘贴友好）
- **优化技巧**
  - 单元格懒渲染：JSON 字段 > 200 字符时显示 `[展开]`
  - 浮点数 / 大整数用 toLocaleString 格式化（千分位）
  - 表格渲染前先 `Object.freeze` 数据，跳过 Vue / React 响应式追踪
  - 避免在 render 函数里创建对象，用 memo / 缓存

### 代码示例

```vue
<vxe-table
  :data="rows"
  :scroll-y="{ enabled: true, gt: 0 }"
  :scroll-x="{ enabled: true, gt: 30 }"
  :row-config="{ height: 32, isHover: true }"
  show-overflow
  border
>
  <vxe-column
    v-for="col in columns"
    :key="col.field"
    :field="col.field"
    :title="col.title"
    :width="col.width"
  />
</vxe-table>

<script setup>
import { shallowRef, markRaw } from 'vue';

const rows = shallowRef([]);
async function load() {
  const data = await fetchSqlResult();
  rows.value = markRaw(Object.freeze(data));
}
</script>
```

### 追问

- 如果把「数据平台几十万行结果集表格怎么不卡」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- 虚拟滚动复杂场景：合并单元格、可编辑、行展开（vxe-table 都支持）
- 极端大数据（千万级）：必须流式 + 服务端聚合，前端只能看"汇总"
- 监控渲染帧率：`PerformanceObserver({ entryTypes: ['frame'] })` 找掉帧

## upload-large-file

title: 大文件分片上传怎么实现
followups: [upload-large-file-followup-1]
difficulty: 进阶
tags: [上传, 分片, 高频]

### 一句话

切片（每片 5MB）+ 计算文件 hash（秒传判重）+ 并发上传分片（限制 3-5 个）+ 失败重试 + 后端合并。带断点续传时每片单独标记完成状态。

### 题目

做一个支持几 GB 大文件的上传：要秒传、断点续传、失败重试、能显示进度。请描述实现思路。

### 答案要点

- **整体流程**
  1. 前端选文件后用 Web Worker 计算 hash（spark-md5）
  2. 调 `/upload/check` 问后端：这个 hash 是否已上传过
     - 已上传：秒传成功（无需上传任何分片）
     - 部分上传：返回已收到的分片列表
  3. 切片 `file.slice(start, end)`，每片 5MB
  4. 并发上传未完成的分片（concurrency=3）
  5. 全部完成后调 `/upload/merge` 让后端合并
- **hash 计算**
  - 大文件全文件 md5 太慢（GB 级 30s+）
  - 优化方案：抽样 hash（首尾 + 中间各取 N MB），90%+ 可信度，速度快 100x
- **并发控制**
  - 不能 `Promise.all` 全部并发（会撑爆带宽 / 后端连接数）
  - 用并发池：`pLimit(3)` 或自实现"令牌桶"
- **断点续传**
  - 后端记录每个 chunkIndex 的接收状态
  - 前端先查询，过滤掉已上传的，只传缺失的
  - 关页面 / 网络断开 / 刷新都不丢进度
- **重试**
  - 单片失败：限次数（3 次）退避重试
  - 全部失败：保留断点，提示用户"恢复上传"
- **进度**
  - 整体进度 = 已完成片数 / 总片数
  - 可选：监听 xhr 的 progress 事件做"片内进度"
- **错误**
  - 网络 / 服务器错误：自动重试
  - 文件被改 / hash 不一致：让用户重选

### 代码示例

```ts
const CHUNK_SIZE = 5 * 1024 * 1024;

async function uploadFile(file: File) {
  const hash = await calcHashInWorker(file);
  const { uploaded, completed } = await fetch('/upload/check', {
    method: 'POST',
    body: JSON.stringify({ hash, name: file.name, size: file.size }),
  }).then((r) => r.json());

  if (completed) return;

  const total = Math.ceil(file.size / CHUNK_SIZE);
  const todo = Array.from({ length: total }, (_, i) => i).filter((i) => !uploaded.includes(i));

  await runWithConcurrency(
    3,
    todo.map((index) => async () => {
      const start = index * CHUNK_SIZE;
      const blob = file.slice(start, start + CHUNK_SIZE);
      const fd = new FormData();
      fd.append('hash', hash);
      fd.append('index', String(index));
      fd.append('chunk', blob);
      await retry(() => fetch('/upload/chunk', { method: 'POST', body: fd }), 3);
      onProgress(index, total);
    }),
  );

  await fetch('/upload/merge', {
    method: 'POST',
    body: JSON.stringify({ hash, name: file.name, total }),
  });
}

function runWithConcurrency<T>(limit: number, tasks: Array<() => Promise<T>>) {
  return new Promise<T[]>((resolve, reject) => {
    const out: T[] = [];
    let i = 0,
      done = 0;
    const next = () => {
      if (i === tasks.length && done === tasks.length) return resolve(out);
      while (i < tasks.length && i - done < limit) {
        const idx = i++;
        tasks[idx]()
          .then((r) => {
            out[idx] = r;
            done++;
            next();
          })
          .catch(reject);
      }
    };
    next();
  });
}
```

### 追问

- 如果把「大文件分片上传怎么实现」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- 断点续传 hash 不可少；秒传是 hash 的副产品
- 极大文件（> 50 GB）建议直传 OSS / S3 multipart
- 弱网场景：根据网络状况动态调小 chunk size

## g2-charts-perf

title: 数据看板（Dashboard）几十个图表同时渲染怎么不卡
followups: [g2-charts-perf-followup-1]
difficulty: 进阶
tags: [图表, 看板, 性能]

### 一句话

按视口懒加载（IntersectionObserver）+ 数据预聚合（前端不要拿百万行）+ 图表实例复用（销毁前 dispose）+ 防 resize 抖动（ResizeObserver 节流）+ 切主题统一通过 CSS 变量。

### 题目

看板页面有 30+ 个 G2 / ECharts 图表，同时渲染时浏览器卡死。请优化。

### 答案要点

- **数据层**
  - 后端预聚合（按天 / 按小时分桶），前端拿到几十几百行
  - 千万级数据走 OLAP（ClickHouse / Druid）
  - 大图表数据按需加载（点击展开才请求）
- **渲染层**
  - 图表组件用 `v-if` + IntersectionObserver 懒加载（视口外不渲染）
  - 复用已渲染图表实例，避免重复 init / dispose
  - SVG 节点 < 1k 用 SVG 渲染（交互好）；> 1k 切 Canvas
- **响应式 resize**
  - 容器尺寸变化要 resize，但拖动时会触发几十次 → ResizeObserver + 节流（rAF / 100ms throttle）
- **多图协同**
  - 共享 Tooltip / Legend：统一管理，避免每个图表自己 query DOM
  - 联动高亮：通过 EventBus 或 Pinia store 同步状态
- **主题切换**
  - 用 CSS 变量传给图表：`color: var(--c-primary)`
  - 切主题时 watch CSS 变量重新 setOption
- **导出 / 截图**
  - `chart.getDataURL()` / html2canvas
  - 导出 PDF：jsPDF + html2canvas，注意字体嵌入
- **常见坑**
  - tooltip 不消失：路由切走没 dispose 实例
  - resize 死循环：ResizeObserver 触发 resize → 改容器尺寸 → 又触发
  - 内存泄漏：定时器 / 事件监听器没清除

### 代码示例

```vue
<script setup>
import * as echarts from 'echarts/core';
import { onBeforeUnmount, onMounted, ref } from 'vue';

const chartRef = ref<HTMLDivElement | null>(null);
let chart: echarts.ECharts | null = null;
let ro: ResizeObserver | null = null;

onMounted(() => {
  const io = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    chart = echarts.init(chartRef.value!);
    chart.setOption(getOption());
    ro = new ResizeObserver(throttle(() => chart?.resize(), 100));
    ro.observe(chartRef.value!);
    io.disconnect();
  });
  io.observe(chartRef.value!);
});

onBeforeUnmount(() => {
  ro?.disconnect();
  chart?.dispose();
  chart = null;
});
</script>
```

### 追问

- 如果把「数据看板（Dashboard）几十个图表同时渲染怎么不卡」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- 大数据可视化首选 ECharts 5.x（支持 Canvas + WebGL + GPU）
- 看板布局用 grid-stack / vue-grid-layout，状态存后端
- 性能预算：单图首次渲染 < 100ms，全屏 30 个图 < 1.5s

## release-rollback-frontend

title: 前端版本灰度 + 回滚怎么做
followups: [release-rollback-frontend-followup-1]
difficulty: 进阶
tags: [发布, 灰度, 工程化]

### 一句话

HTML 走 `Cache-Control: no-cache`，每次都校验最新；JS / CSS 走带 hash 文件名 + 长缓存。灰度按版本目录隔离（`/static/v1.2.3/...`），新版本 bug 时只切 HTML 入口指向旧版本即可。

### 题目

前端发版后发现严重 bug，能在 5 分钟内回滚而不影响用户体验吗？怎么设计才能做到？

### 答案要点

- **目录结构**
  - 每个版本独立目录：`/static/v1.2.3/index.js, vendor.js`
  - HTML 引用具体版本目录的资源
  - 老版本资源至少保留 7 天（防 SW 缓存的用户加载老 HTML）
- **缓存策略**
  - HTML：`Cache-Control: no-cache, must-revalidate` + ETag
  - 静态资源（带 hash）：`Cache-Control: max-age=31536000, immutable`
- **灰度方案**
  - Nginx + lua 按 cookie / IP / 用户 ID 决定返回哪个 HTML
  - 1% → 10% → 50% → 100% 逐步放量
  - 异常指标（错误率 / LCP / 业务转化）超阈值自动暂停
- **回滚**
  - 紧急回滚：CDN HTML 入口切回上版本（30 秒生效）
  - 完整回滚：CI 重发上版本镜像
- **ChunkLoadError 兜底**
  - 用户已加载老 HTML 中引用的某个 chunk，发版后这个 chunk 不存在了
  - 全局监听 `ChunkLoadError` 后强制 `location.reload()`
  - Service Worker 的 HTML 改 network-first，避免拿到老 HTML
- **A/B 测试**
  - 同套基建可以做实验：新功能在 5% 用户开
  - 必须前后端打通实验 ID
- **审批 / 流程**
  - 发版前自动跑回归测试
  - 关键功能要求双人审批
  - 上线后第一个小时密切观察 RUM
- **配套监控**
  - 错误率（Sentry）
  - 业务关键指标（转化漏斗）
  - 性能指标（Web Vitals）
  - 触发告警自动 @ on-call 群

### 代码示例

```nginx
location = /index.html {
  add_header Cache-Control "no-cache, must-revalidate";
  set $version "v1.2.3";
  if ($cookie_grayscale = "true") {
    set $version "v1.3.0";
  }
  alias /var/www/$version/index.html;
}

location /static/ {
  add_header Cache-Control "public, max-age=31536000, immutable";
  alias /var/www/static/;
}
```

```ts
window.addEventListener('error', (e) => {
  if (e.message?.includes('Loading chunk') || e.message?.includes('ChunkLoadError')) {
    if (sessionStorage.getItem('chunk-reloaded') !== '1') {
      sessionStorage.setItem('chunk-reloaded', '1');
      location.reload();
    }
  }
});
```

### 追问

- 如果把「前端版本灰度 + 回滚怎么做」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- Vercel / Netlify 内置不可变部署 + 回滚（一键切之前任意版本）
- 自建 CI：argo rollouts / spinnaker 做精细灰度
- 回滚前别忘了"数据库 schema 变更"：发版前后兼容是基本功

## interview-system-design-bigreport

title: 系统设计题：从 0 设计一个数据平台前端，你怎么拆？
followups: [interview-system-design-bigreport-followup-1]
difficulty: 资深
tags: [系统设计, 架构, 高频]

### 一句话

按"用户旅程"切分模块（探索 SQL → 开发数据 → 调度运维 → 看板 → 协作）；技术上分四层（基础组件库 / 业务 hooks / 业务页面 / 集成层）；横切关注点（权限、监控、i18n、实验）走中台 SDK；存储分内存 / IndexedDB / 后端三级。

### 题目

现在公司需要从零开发一个面向数据分析师的 web 平台，需求包括 SQL 查询、数据开发、看板可视化、任务调度、AI 助手。请你做技术选型和架构设计。

### 答案要点

- **第一步：搞清边界**
  - 用户角色：分析师 / 开发 / 数仓 / 业务方 / 管理员
  - 关键场景：日常查数、临时分析、项目化开发、运维排查
  - 性能 SLA：首屏 < 1.5s，操作响应 < 200ms
  - 多端：PC 主，移动看板可视化
- **技术选型**
  - 框架：Vue 3 + TS（生态稳定，团队熟悉）
  - 构建：Vite + Rolldown（dev / prod 都快）
  - UI：ant-design-vue 4 + vxe-table（表格交互复杂）
  - 状态：Pinia（轻量，TS 友好）
  - 路由：vue-router 4（懒加载所有大页面）
  - 编辑器：Monaco（SQL 是主战场）
  - 图表：ECharts 5（看板）+ G2 5（探索分析）
  - i18n：vue-i18n 9（默认中英文，易扩展）
  - 测试：Vitest（单元）+ Playwright（E2E）
- **架构分层**
  - L1 基础组件库：Button / Modal 等内部 design system
  - L2 业务组件：MetadataTree / SQLEditor / DAGCanvas
  - L3 业务 hooks：useMetadataCache / useStreamingChat / usePermission
  - L4 页面：sql / metric / schedule / dashboard / agent
  - L5 集成层：API client / 鉴权 / 监控 / 埋点 / 实验
- **横切关注点**
  - 权限：路由 guard + v-permission 指令 + 后端校验三层
  - 监控：Sentry（错误）+ 自研 RUM（性能）+ 神策（埋点）
  - 多国部署：**STAGE** 注入 + stage 配置
  - 错误体验：全局 ErrorBoundary + ChunkLoadError 兜底
- **数据 / 存储**
  - 内存：Pinia
  - 持久化：IndexedDB（编辑器状态、SQL 历史、用户偏好）
  - 服务端：所有业务数据
- **协作 / 工程化**
  - Monorepo：核心 design system + 公共 hooks 单仓
  - CI：lint / typecheck / build / E2E
  - 灰度 + 回滚机制（参考前一题）
- **演进路线**
  - MVP（3 月）：SQL 工作台 + 基础看板
  - V1（6 月）：调度 + 协作
  - V2（9 月）：AI Copilot + 自助分析

### 代码示例

```text
src/
├── components/        # L2 业务组件
│   ├── monaco-editor/
│   ├── metadata-tree/
│   ├── g2-chart/
│   └── dag-canvas/
├── hooks/             # L3 业务 hooks
│   ├── use-metadata-cache.ts
│   ├── use-streaming-chat.ts
│   └── use-permission.ts
├── pages/             # L4 页面
│   ├── explore/sql/
│   ├── explore/board/
│   ├── schedule/
│   ├── metric/
│   └── ai/agent/
├── resources/         # L5 API
├── store/             # Pinia
├── storage/           # IndexedDB 封装
└── plugins/           # vue plugin / directive
```

### 追问

- 如果把「系统设计题：从 0 设计一个数据平台前端，你怎么拆？」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- 系统设计回答的精髓不是"选了什么技术"，而是"为什么 + 怎么演进 + 如何度量"
- 准备 1-2 个具体业务点的细节展开（比如 SQL 工作台多 Pane 持久化）
- 主动谈"风险 + 兜底"是加分项：性能预算、错误率红线、回滚预案

## sql-workbench-architecture-followup-1

title: 追问：如果把「设计一个浏览器内的 SQL 工作台，整体架构怎么拆？」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 资深
tags: [架构, SQL, Monaco, 高频, 追问]
parent: sql-workbench-architecture

### 题目

如果面试官追问：如果把「设计一个浏览器内的 SQL 工作台，整体架构怎么拆？」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 一份 model 对应一个 Pane（用 URI 隔离）
- 注册一次语言（hive/mysql），多个实例复用 Provider，避免重复注册卡顿
- 自定义 SQL 补全 / 校验 / 参数提示（Signature Help / Hover）
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## monaco-multi-pane-isolation-followup-1

title: 追问：如果把「Monaco 多 Tab 编辑器实例之间怎么做隔离？」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 资深
tags: [Monaco, 多实例, 内存, 追问]
parent: monaco-multi-pane-isolation

### 题目

如果面试官追问：如果把「Monaco 多 Tab 编辑器实例之间怎么做隔离？」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- URI 隔离：monaco.Uri.parse('inmemory://pane/')；同一个 URI 全局只有一份 model，多实例共享会出问题
- Model 可能在多个 editor 间复用（diff editor / 主编辑器），切 Tab 时不要直接 dispose
- Tab 真正关闭时再 model.dispose()
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## sql-completion-with-worker-followup-1

title: 追问：如果把「SQL 自动补全 / 校验怎么做才不卡 UI？」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 资深
tags: [Monaco, SQL, Worker, 性能, 追问]
parent: sql-completion-with-worker

### 题目

如果面试官追问：如果把「SQL 自动补全 / 校验怎么做才不卡 UI？」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- SQL parser（dt-sql-parser / antlr 生成）解析大文件可能 100ms+，放主线程会卡输入
- 真实 SQL 里有 ${p_date} 这种业务变量，不是合法 SQL token
- 校验前等长替换为字母 x 序列 xxxxxxxx：保持行列号对齐，错误位置不偏移
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## metadata-cache-inflight-followup-1

title: 追问：如果把「元数据接口高并发去重 + 缓存怎么设计？」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 进阶
tags: [缓存, 并发, 高频, 追问]
parent: metadata-cache-inflight

### 题目

如果面试官追问：如果把「元数据接口高并发去重 + 缓存怎么设计？」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 没有缓存：5 次重复请求
- 简单 Promise 缓存（一直存 Promise）：失败了也卡住
- cache: Map —— TTL 缓存，过期后失效
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## indexeddb-pane-persistence-followup-1

title: 追问：如果把「多 Tab 编辑器状态怎么持久化」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 资深
tags: [IndexedDB, 持久化, 状态, 追问]
parent: indexeddb-pane-persistence

### 题目

如果面试官追问：如果把「多 Tab 编辑器状态怎么持久化（投影模式）」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 定义"持久化字段白名单"，比如 ResultItem 只留 key/id/status/resultType/engine/errorLine
- 同源跨 Tab 共享需要 BroadcastChannel 通知 invalidate
- 进阶："增量持久化" + 操作日志，可恢复到任意时间点
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## sql-result-polling-followup-1

title: 追问：如果把「长 SQL 异步执行 + 前端轮询结果怎么设计」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 进阶
tags: [轮询, 异步, 性能, 追问]
parent: sql-result-polling

### 题目

如果面试官追问：如果把「长 SQL 异步执行 + 前端轮询结果怎么设计」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 提交：POST /sql/submit → { taskId }
- 轮询：GET /sql/status?taskId=xxx → { status, result?, errorMsg? }
- 取消：POST /sql/cancel
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## ai-agent-streaming-render-followup-1

title: 追问：如果把「AI Agent 流式对话怎么渲染才不卡」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 资深
tags: [AI, 流式, Markdown, 性能, 追问]
parent: ai-agent-streaming-render

### 题目

如果面试官追问：如果把「AI Agent 流式对话怎么渲染才不卡」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 传输协议：SSE（单向、自动重连、event ID）；OpenAI / Anthropic / DeepSeek 都是 SSE
- TextDecoder 流式解码
- 用 watch 触发 markdown 渲染：但每个 token 都渲染会卡（markdown-it 解析整段 + DOMPurify 转换）
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## sql-copilot-diff-followup-1

title: 追问：如果把「AI 改写 SQL 的 Diff 接受/拒绝交互怎么做」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 资深
tags: [AI, Monaco, Diff, 追问]
parent: sql-copilot-diff

### 题目

如果面试官追问：如果把「AI 改写 SQL 的 Diff 接受/拒绝交互怎么做」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- sqlEdits: { id, type: 'ADD'|'DELETE'|'UPDATE', startLine, endLine, newText }[]
- 行号旁加小图标按钮"✓接受 / ✗拒绝"（用 contentWidget / overlay）
- 全局浮条："剩余 N 处变更 / 全部接受 / 全部拒绝"
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## task-dependency-dag-followup-1

title: 追问：如果把「任务调度 DAG 依赖图怎么前端展示和交互」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 资深
tags: [可视化, DAG, 调度, 追问]
parent: task-dependency-dag

### 题目

如果面试官追问：如果把「任务调度 DAG 依赖图怎么前端展示和交互」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 选 dagre / elk.js 做层次布局
- 调度平台典型代表：Airflow、DolphinScheduler、字节 Aeolus
- DAG 里的"诊断"高级功能：上下游断链定位、SLA 倒推
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## multi-stage-deployment-followup-1

title: 追问：如果把「多国 / 多环境部署怎么管理差异」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 进阶
tags: [架构, 部署, i18n, 追问]
parent: multi-stage-deployment

### 题目

如果面试官追问：如果把「多国 / 多环境部署（CN / ID / SP / MX）怎么管理差异」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- Vite / Webpack define 把 **STAGE** 注入为字符串常量（'cn' / 'id' / ...）
- Tree shaking 后，if (**STAGE** === 'cn') 在非 CN 包里整段消失
- 文案放 i18n，按 stage 默认语言（CN→zh-CN，ID→id-ID，SP→es-ES，MX→es-MX）
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## permission-matrix-frontend-followup-1

title: 追问：如果把「复杂权限体系前端怎么做」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 资深
tags: [权限, 架构, 高频, 追问]
parent: permission-matrix-frontend

### 题目

如果面试官追问：如果把「复杂权限体系（数据 + 操作）前端怎么做」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 前端只做"看见 / 不可点"，关键操作的最终鉴权永远在后端
- 权限不是布尔值，是字符串集合（['metric:create', 'datasource:read']）
- 数据权限（行级 / 列级）通常由后端在数据返回时已过滤
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## big-table-virtualization-followup-1

title: 追问：如果把「数据平台几十万行结果集表格怎么不卡」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 资深
tags: [虚拟列表, 表格, 性能, 高频, 追问]
parent: big-table-virtualization

### 题目

如果面试官追问：如果把「数据平台几十万行结果集表格怎么不卡」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 50 万行不可能 DOM 全渲染——只渲染视口 + 上下 buffer 行
- 全量数据放内存（50 万行 × 平均 20 字段 ≈ 几十 MB，可承受）
- 数据量大时，前端排序会卡几秒 → 改服务端排序，URL 带参数
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## upload-large-file-followup-1

title: 追问：如果把「大文件分片上传怎么实现」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 进阶
tags: [上传, 分片, 高频, 追问]
parent: upload-large-file

### 题目

如果面试官追问：如果把「大文件分片上传怎么实现」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 大文件全文件 md5 太慢（GB 级 30s+）
- 极大文件（> 50 GB）建议直传 OSS / S3 multipart
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## g2-charts-perf-followup-1

title: 追问：如果把「数据看板几十个图表同时渲染怎么不卡」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 进阶
tags: [图表, 看板, 性能, 追问]
parent: g2-charts-perf

### 题目

如果面试官追问：如果把「数据看板（Dashboard）几十个图表同时渲染怎么不卡」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 后端预聚合（按天 / 按小时分桶），前端拿到几十几百行
- 千万级数据走 OLAP（ClickHouse / Druid）
- 大图表数据按需加载（点击展开才请求）
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## release-rollback-frontend-followup-1

title: 追问：如果把「前端版本灰度 + 回滚怎么做」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 进阶
tags: [发布, 灰度, 工程化, 追问]
parent: release-rollback-frontend

### 题目

如果面试官追问：如果把「前端版本灰度 + 回滚怎么做」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 每个版本独立目录：/static/v1.2.3/index.js, vendor.js
- HTML 引用具体版本目录的资源
- 老版本资源至少保留 7 天（防 SW 缓存的用户加载老 HTML）
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## interview-system-design-bigreport-followup-1

title: 追问：如果把「系统设计题：从 0 设计一个数据平台前端，你怎么拆？」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 资深
tags: [系统设计, 架构, 高频, 追问]
parent: interview-system-design-bigreport

### 题目

如果面试官追问：如果把「系统设计题：从 0 设计一个数据平台前端，你怎么拆？」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 关键场景：日常查数、临时分析、项目化开发、运维排查
- 系统设计回答的精髓不是"选了什么技术"，而是"为什么 + 怎么演进 + 如何度量"
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。
