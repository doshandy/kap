---
id: 27-data-platform-cases
title: 数据平台业务场景
order: 27
icon: 🏗️
description: 来自真实数据平台（DataLumina / DataPilot）的复杂业务场景：SQL 工作台、AI Agent、调度依赖、多国部署等高频面试题。
---

## sql-workbench-architecture

title: 设计一个浏览器内的 SQL 工作台，整体架构怎么拆？
followups: [sql-workbench-architecture-followup-1, sql-workbench-architecture-followup-2, sql-workbench-architecture-followup-3]
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

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 设计一个浏览器内的 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 设计一个浏览器内的，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「设计一个浏览器内的 SQL 工作台，整体架构怎么拆」按阶段灰度，每阶段可验收可撤回。

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

- 推动「设计一个浏览器内的 SQL 工作台，整体架构怎么拆」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「设计一个浏览器内的 SQL 工作台，整体架构怎么拆？」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 架构、SQL、Monaco，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 性能预算：编辑器初次加载 < 800ms（懒加载 monaco-editor + worker chunk）
- 高级能力：SQL 格式化（formatter）、Lineage 血缘图、SQL Lint、AI 改写
- 类似产品：Hue、DataGrip、DBeaver、Apache Superset、字节 ByteHouse

## monaco-multi-pane-isolation

title: Monaco 多 Tab 编辑器实例之间怎么做隔离？
followups: [monaco-multi-pane-isolation-followup-1, monaco-multi-pane-isolation-followup-2, monaco-multi-pane-isolation-followup-3]
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

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「Monaco 多 Tab 编辑器实例之间怎么做隔离」必须先给 Monaco 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，Monaco 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 Monaco 的计算与缓存路径。

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

- 你会先看哪些指标来判断「Monaco 多 Tab 编辑器实例之间怎么做隔离」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「Monaco 多 Tab 编辑器实例之间怎么做隔离？」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 Monaco、多实例、内存，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- @vue/repl / Stackblitz 都是基于 Monaco 多文件
- 一些团队选择"全局一个 Monaco editor + 切换 model"省内存，代价是 viewState 维护更复杂
- monaco-editor-textmate 可加更精细的语法高亮，但会显著增加首屏体积

## sql-completion-with-worker

title: SQL 自动补全 / 校验怎么做才不卡 UI？
followups: [sql-completion-with-worker-followup-1, sql-completion-with-worker-followup-2, sql-completion-with-worker-followup-3]
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

#### 标准补充（边界/失败/取舍）

- 界定条件：只有在 SQL 的瓶颈被数据证实、回归方案准备完成时，答案里的优化建议才可直接执行。
- 失败场景：例如主线程在首屏阶段执行重计算，SQL 指标会从可接受直接退化到用户可感知卡顿；修复要拆分任务并回归验证。
- 替代方案与取舍：可选一次性大重构追求极致性能，但交付风险高；当前对「SQL 自动补全 / 校验怎么做才不卡 UI」采用小步优化更稳。

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

- 你会先看哪些指标来判断「SQL 自动补全 / 校验怎么做才不卡 UI」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「SQL 自动补全 / 校验怎么做才不卡 UI？」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 Monaco、SQL、Worker，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- antlr4ts 生成的 parser 体积巨大，按需 chunk + Worker 是最佳实践
- 多方言（Hive/Spark/Presto/MySQL）：用策略模式 + 方言切换
- 上下文相关关键字：把"在某些位置不应该提示"列成黑名单，避免误导

## metadata-cache-inflight

title: 元数据接口高并发去重 + 缓存怎么设计？
followups: [metadata-cache-inflight-followup-1, metadata-cache-inflight-followup-2, metadata-cache-inflight-followup-3]
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

#### 标准补充（边界/失败/取舍）

- 界定条件：只有在 元数据接口高并发去重 的瓶颈被数据证实、回归方案准备完成时，答案里的优化建议才可直接执行。
- 失败场景：例如主线程在首屏阶段执行重计算，元数据接口高并发去重 指标会从可接受直接退化到用户可感知卡顿；修复要拆分任务并回归验证。
- 替代方案与取舍：可选一次性大重构追求极致性能，但交付风险高；当前对「元数据接口高并发去重 + 缓存怎么设计」采用小步优化更稳。

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

- 你会先看哪些指标来判断「元数据接口高并发去重 + 缓存怎么设计」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「元数据接口高并发去重 + 缓存怎么设计？」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 缓存、并发、高频，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- React Query / SWR 内置了类似的"deduping + stale-time + cache-time"行为
- 高级版本：LRU 限制条数 + 持久化到 IndexedDB（跨 Tab 共享）
- BroadcastChannel 同步多 Tab 的 invalidate

## indexeddb-pane-persistence

title: 多 Tab 编辑器状态怎么持久化（投影模式）
followups: [indexeddb-pane-persistence-followup-1, indexeddb-pane-persistence-followup-2, indexeddb-pane-persistence-followup-3]
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

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「为什么不用 localStorage」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「大小限制（5MB），结果集随便几万行就爆」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「多 Tab 编辑器状态怎么持久化（投影模式）」风险偏高；当前方案可验证、可灰度、可回滚。

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

- 「多 Tab 编辑器状态怎么持久化（投影模式）」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「多 Tab 编辑器状态怎么持久化（投影模式）」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 IndexedDB、持久化、状态，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 同源跨 Tab 共享需要 BroadcastChannel 通知 invalidate
- 浏览器存储配额：可用 `navigator.storage.estimate()` 监控
- 进阶："增量持久化" + 操作日志，可恢复到任意时间点

## sql-result-polling

title: 长 SQL 异步执行 + 前端轮询结果怎么设计
followups: [sql-result-polling-followup-1, sql-result-polling-followup-2, sql-result-polling-followup-3]
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

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「长 SQL 异步执行 + 前端轮询结果怎么设计」必须先给 SQL 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，SQL 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 SQL 的计算与缓存路径。

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

- 你会先看哪些指标来判断「长 SQL 异步执行 + 前端轮询结果怎么设计」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「长 SQL 异步执行 + 前端轮询结果怎么设计」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 轮询、异步、性能，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 优雅替代：SSE / WebSocket 推送状态变更（节省 API 请求量）
- 大型平台一般 SSE 推 status，REST 拉详情，混合使用
- 进度感知：把后端的 stage（解析 / 执行 / 写文件）展示给用户

## ai-agent-streaming-render

title: AI Agent 流式对话怎么渲染才不卡
followups: [ai-agent-streaming-render-followup-1, ai-agent-streaming-render-followup-2, ai-agent-streaming-render-followup-3]
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

#### 标准补充（边界/失败/取舍）

- 界定条件：只有在 AI 的瓶颈被数据证实、回归方案准备完成时，答案里的优化建议才可直接执行。
- 失败场景：例如主线程在首屏阶段执行重计算，AI 指标会从可接受直接退化到用户可感知卡顿；修复要拆分任务并回归验证。
- 替代方案与取舍：可选一次性大重构追求极致性能，但交付风险高；当前对「AI Agent 流式对话怎么渲染才不卡」采用小步优化更稳。

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

- 你会先看哪些指标来判断「AI Agent 流式对话怎么渲染才不卡」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「AI Agent 流式对话怎么渲染才不卡」时如果只谈模型能力，不覆盖评估、成本、隐私和兜底，会缺少产品化视角。
- 只调 prompt，不建立评估集、成本预算、超时重试、内容安全和人工兜底。
- 把模型输出当确定结果使用，忽略幻觉、上下文污染、隐私泄露和可观测性。
- 相关标签是 AI、流式、Markdown，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- markdown-it 大文本渲染要做缓存（避免重复解析整段）
- 代码块高亮可以"延迟到流结束后"再统一处理
- 多模态：图片 / 表格 / 工具调用回包 都按事件类型分发

## sql-copilot-diff

title: AI 改写 SQL 的 Diff 接受/拒绝交互怎么做
followups: [sql-copilot-diff-followup-1, sql-copilot-diff-followup-2, sql-copilot-diff-followup-3]
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

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「AI 改写 SQL 的 Diff 接受/拒绝交互怎么做」时要先定义 AI 的效果阈值、延迟预算、成本上限和安全红线，四项缺一不可。
- 失败场景：例如成本阈值被击穿，AI 请求被限流导致体验抖动；应切轻量模型并启用缓存回退。
- 替代方案与取舍：也可全规则化避免幻觉，但覆盖有限；当前采用“模型 + 规则校验 + 人工兜底”。

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

- 在「AI 改写 SQL 的 Diff 接受/拒绝交互怎么做」场景下，围绕「AI 改写 SQL 的 Diff 接受/拒绝交互怎么做」发布前准备，你会如何安排评估集、预算上限和风险防护？
- 在「AI 改写 SQL 的 Diff 接受/拒绝交互怎么做」场景下，模型输出不稳定或出现幻觉时，产品和工程上你会如何为「AI 改写 SQL 的 Diff 接受/拒绝交互怎么做」分别兜底？
- 以「AI 改写 SQL 的 Diff 接受/拒绝交互怎么做」为例，在「AI 改写 SQL 的 Diff 接受/拒绝交互怎么做」场景里，你会如何围绕 AI 定义“优先保准确”与“优先保时延”的切换条件？

### 常见误区

- 回答「AI 改写 SQL 的 Diff 接受/拒绝交互怎么做」时如果只谈模型能力，不覆盖评估、成本、隐私和兜底，会缺少产品化视角。
- 把模型输出当确定结果使用，忽略幻觉、上下文污染、隐私泄露和可观测性。
- 只调 prompt，不建立评估集、成本预算、超时重试、内容安全和人工兜底。
- 相关标签是 AI、Monaco、Diff，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Cursor / Copilot Chat 的 Apply 流程类似
- 大段重写时可以走 diff editor（Monaco 内置 `createDiffEditor`），并排显示
- 注意"用户输入与 AI 输出冲突"：edit 应用前先比较行号是否还有效（用户可能已修改）

## task-dependency-dag

title: 任务调度 DAG 依赖图怎么前端展示和交互
followups: [task-dependency-dag-followup-1, task-dependency-dag-followup-2, task-dependency-dag-followup-3]
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

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的答案必须覆盖空值、重复值、越界输入；漏掉任一边界都会让 任务调度 结论失真。
- 失败场景：例如忽略极端输入规模，任务调度 的复杂度会在高峰期失控，导致超时或 OOM；修复要改数据结构并做压测。
- 替代方案与取舍：可选更直观但复杂度更高的写法快速交付；当前在「任务调度 DAG 依赖图怎么前端展示和交互」优先保证规模上限可控。

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

- 「任务调度 DAG 依赖图怎么前端展示和交互」有哪些容易漏掉的边界输入和复杂度陷阱？
- 如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案？
- 你会怎么证明实现正确，而不是只靠几个样例跑通？

### 常见误区

- 回答「任务调度 DAG 依赖图怎么前端展示和交互」时如果只写代码，不解释复杂度和边界输入，无法体现工程可靠性。
- 只讲实现步骤，不说明边界输入、稳定性、性能成本和替代方案。
- 没有考虑数据量、运行环境、异常输入和极端规模，方案容易在真实页面里失效。
- 相关标签是 可视化、DAG、调度，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 调度平台典型代表：Airflow、DolphinScheduler、字节 Aeolus
- DAG 里的"诊断"高级功能：上下游断链定位、SLA 倒推
- 可视化超大数据用 Apache ECharts 5 的 graphGL，或自研 GPU 渲染

## multi-stage-deployment

title: 多国 / 多环境部署（CN / ID / SP / MX）怎么管理差异
followups: [multi-stage-deployment-followup-1, multi-stage-deployment-followup-2, multi-stage-deployment-followup-3]
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
  - 构建期 import 对应 JSON：`import config from \`./config/${STAGE}.json\``
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

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 多国 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 多国，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「多国 / 多环境部署（CN / ID / SP / MX）怎么管理差异」按阶段灰度，每阶段可验收可撤回。

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

- 推动「多国 / 多环境部署（CN / ID / SP / MX）怎么管理差异」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「多国 / 多环境部署（CN / ID / SP / MX）怎么管理差异」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 架构、部署、i18n，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 国家差异不仅在 UI，还在数据合规（GDPR / 印尼 PDP / 中国数据出境）
- 把"特性开关 + 权限点 + 合规字段"封装成统一 SDK，业务零知识接入
- A/B 测试也走同一套基础设施

## permission-matrix-frontend

title: 复杂权限体系（数据 + 操作）前端怎么做
followups: [permission-matrix-frontend-followup-1, permission-matrix-frontend-followup-2, permission-matrix-frontend-followup-3]
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

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 复杂权限体系 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，复杂权限体系 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「复杂权限体系（数据 + 操作）前端怎么做」风险不足；当前优先服务端强校验，因为可审计、可回滚。

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

- 如果把「复杂权限体系（数据 + 操作）前端怎么做」放到真实业务里，你会怎么划分信任边界和服务端兜底？
- 你会如何证明这个安全方案没有被绕过，并监控异常攻击流量？
- 当安全性、用户体验和研发成本冲突时，你会如何取舍？

### 常见误区

- 回答「复杂权限体系（数据 + 操作）前端怎么做」时如果只列防护点，不先说明资产、攻击面和信任边界，方案会显得不可信。
- 只做前端校验而忽略服务端鉴权、审计和最小权限，容易把安全边界放错位置。
- 把“能跑通”当成“安全”，没有考虑重放、绕过、降级、错误提示泄露和第三方依赖风险。
- 相关标签是 权限、架构、高频，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 复杂条件（"自己创建的可以删 / 别人的不能删"）走表达式，比如 `metric:delete:own`
- 大型公司用 OPA / Casbin 做策略引擎，前端只查询"能不能"
- 注意 i18n 时把权限"隐藏"还是"置灰提示原因"，体验差异很大

## big-table-virtualization

title: 数据平台几十万行结果集表格怎么不卡
followups: [big-table-virtualization-followup-1, big-table-virtualization-followup-2, big-table-virtualization-followup-3]
links: [28-customer-service-im/chat-perf-virtual-list, 21-interview-special/design-virtual-list]
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

#### 标准补充（边界/失败/取舍）

- 界定条件：只有在 数据平台几十万行结果 的瓶颈被数据证实、回归方案准备完成时，答案里的优化建议才可直接执行。
- 失败场景：例如主线程在首屏阶段执行重计算，数据平台几十万行结果 指标会从可接受直接退化到用户可感知卡顿；修复要拆分任务并回归验证。
- 替代方案与取舍：可选一次性大重构追求极致性能，但交付风险高；当前对「数据平台几十万行结果集表格怎么不卡」采用小步优化更稳。

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

- 你会先看哪些指标来判断「数据平台几十万行结果集表格怎么不卡」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「数据平台几十万行结果集表格怎么不卡」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 虚拟列表、表格、性能，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 虚拟滚动复杂场景：合并单元格、可编辑、行展开（vxe-table 都支持）
- 极端大数据（千万级）：必须流式 + 服务端聚合，前端只能看"汇总"
- 监控渲染帧率：`PerformanceObserver({ entryTypes: ['frame'] })` 找掉帧

## upload-large-file

title: 大文件分片上传怎么实现
followups: [upload-large-file-followup-1, upload-large-file-followup-2, upload-large-file-followup-3]
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

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「大文件分片上传怎么实现」时先约定 大文件分片上传怎么实 的输入输出契约、异常输入处理和边界行为（如取消、重入、幂等），否则实现不算完整。
- 失败场景：例如 大文件分片上传怎么实 实现忽略 this/参数透传，线上会出现行为与预期不一致；应补调用语义测试并明确默认行为。
- 替代方案与取舍：也可只给伪代码说明思路，但可靠性细节会缺失；当前给可运行实现并补异常路径更符合资深标准。

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

- 「大文件分片上传怎么实现」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「大文件分片上传怎么实现」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。
- 相关标签是 上传、分片、高频，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 断点续传 hash 不可少；秒传是 hash 的副产品
- 极大文件（> 50 GB）建议直传 OSS / S3 multipart
- 弱网场景：根据网络状况动态调小 chunk size

## g2-charts-perf

title: 数据看板（Dashboard）几十个图表同时渲染怎么不卡
followups: [g2-charts-perf-followup-1, g2-charts-perf-followup-2, g2-charts-perf-followup-3]
links: [19-visualization/chart-performance]
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

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「数据看板（Dashboard）几十个图表同时渲染怎么不卡」必须先给 数据看板 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，数据看板 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 数据看板 的计算与缓存路径。

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

- 你会先看哪些指标来判断「数据看板（Dashboard）几十个图表同时渲染怎么不卡」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「数据看板（Dashboard）几十个图表同时渲染怎么不卡」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 图表、看板、性能，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 大数据可视化首选 ECharts 5.x（支持 Canvas + WebGL + GPU）
- 看板布局用 grid-stack / vue-grid-layout，状态存后端
- 性能预算：单图首次渲染 < 100ms，全屏 30 个图 < 1.5s

## release-rollback-frontend

title: 前端版本灰度 + 回滚怎么做
followups: [release-rollback-frontend-followup-1, release-rollback-frontend-followup-2, release-rollback-frontend-followup-3]
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

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 前端版本灰度 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 前端版本灰度，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「前端版本灰度 + 回滚怎么做」按阶段灰度，每阶段可验收可撤回。

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

- 推动「前端版本灰度 + 回滚怎么做」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「前端版本灰度 + 回滚怎么做」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 发布、灰度、工程化，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- Vercel / Netlify 内置不可变部署 + 回滚（一键切之前任意版本）
- 自建 CI：argo rollouts / spinnaker 做精细灰度
- 回滚前别忘了"数据库 schema 变更"：发版前后兼容是基本功

## interview-system-design-bigreport

title: 系统设计题：从 0 设计一个数据平台前端，你怎么拆？
followups: [interview-system-design-bigreport-followup-1, interview-system-design-bigreport-followup-2, interview-system-design-bigreport-followup-3]
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

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「系统设计题：从 0 设计一个数据平台前端，你怎么拆」时要先定义 系统设计题 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，系统设计题 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 系统设计题 关键链路先收敛再替换。

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

- 推动「系统设计题：从 0 设计一个数据平台前端，你怎么拆」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「系统设计题：从 0 设计一个数据平台前端，你怎么拆？」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 系统设计、架构、高频，回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。

### 延伸

- 系统设计回答的精髓不是"选了什么技术"，而是"为什么 + 怎么演进 + 如何度量"
- 准备 1-2 个具体业务点的细节展开（比如 SQL 工作台多 Pane 持久化）
- 主动谈"风险 + 兜底"是加分项：性能预算、错误率红线、回滚预案

## sql-workbench-architecture-followup-1

title: 追问：以「设计一个浏览器内的 SQL 工作台，整体架构怎么拆」为例，真要把「设计一个浏览器内的 SQL 工作台，整体架构怎么拆」推到线上，你会如何围绕 架构 设计灰度节奏、回滚条件和迁移路径
difficulty: 资深
tags: [架构, SQL, Monaco, 高频, 追问]
parent: sql-workbench-architecture

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「设计一个浏览器内的 SQL 工作台，整体架构怎么拆」拆成可验证的小步骤，逐步替换高风险部分。

### 题目

如果面试官追问：以「设计一个浏览器内的 SQL 工作台，整体架构怎么拆」为例，真要把「设计一个浏览器内的 SQL 工作台，整体架构怎么拆」推到线上，你会如何围绕 架构 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：顶层布局：左侧元数据树（数据源 / 库 / 表 / 字段）+ 中间多 Tab 编辑器 + 下方结果区
- 机制：编辑器层（Monaco）；一份 model 对应一个 Pane（用 URI 隔离）
- 落地动作：回答「以「设计一个浏览器内的 SQL 工作台，整体架构怎么拆」为例，真要把「设计一个浏览器内的 SQL 工作台，整体架构怎么拆」推到线上，你会如何围绕 架构 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 设计一个浏览器内的 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 设计一个浏览器内的，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「以「设计一个浏览器内的 SQL 工作台，整体架构怎么拆」为例，真要把「设计一个浏览器内的 SQL 工作台，整体架构怎么拆」推到线上，你会如何围绕 架构 设计灰度节奏、回滚条件和迁移路径」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 顶层布局：左侧元数据树（数据源 / 库 / 表 / 字段）+ 中间多 Tab 编辑器 + 下方结果区
- 编辑器层（Monaco）
- 一份 model 对应一个 Pane（用 URI 隔离）

## monaco-multi-pane-isolation-followup-1

title: 追问：你会如何把用户侧体验指标和系统侧资源指标结合，判断「Monaco 多 Tab 编辑器实例之间怎么做隔离」是否该优先优化
difficulty: 资深
tags: [Monaco, 多实例, 内存, 追问]
parent: monaco-multi-pane-isolation

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「Monaco 多 Tab 编辑器实例之间怎么做隔离」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：你会如何把用户侧体验指标和系统侧资源指标结合，判断「Monaco 多 Tab 编辑器实例之间怎么做隔离」是否该优先优化？

### 答案要点

#### 标准回答（直接作答）

- 结论：URI 隔离：monaco.Uri.parse('inmemory://pane/')；同一个 URI 全局只有一份 model，多实例共享会出问题
- 机制：匿名 Pane：模态预览等没有 paneKey 的实例，需要分配自增序号 URI，避免几个匿名实例共享同一 model；Provider 一次性注册：用模块级布尔变量 hiveProvidersRegistered 守卫，避免每次 mount 重复注册导致补全候选项重复
- 落地动作：回答「你会如何把用户侧体验指标和系统侧资源指标结合，判断「Monaco 多 Tab 编辑器实例之间怎么做隔离」是否该优先优化」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「你会如何把用户侧体验指标和系统侧资源指标结合，判断「Monaco 多 Tab 编辑器实例之间怎么做隔离」是否该优先优化」必须先给 你会如何把用户侧体验 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，你会如何把用户侧体验 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 你会如何把用户侧体验 的计算与缓存路径。

#### 关键细节（可追问）

- URI 隔离：monaco.Uri.parse('inmemory://pane/')；同一个 URI 全局只有一份 model，多实例共享会出问题
- 匿名 Pane：模态预览等没有 paneKey 的实例，需要分配自增序号 URI，避免几个匿名实例共享同一 model
- Provider 一次性注册：用模块级布尔变量 hiveProvidersRegistered 守卫，避免每次 mount 重复注册导致补全候选项重复

## sql-completion-with-worker-followup-1

title: 追问：你会先看哪些与 Monaco 相关的指标来判断「SQL 自动补全 / 校验怎么做才不卡 UI」是不是当前性能瓶颈
difficulty: 资深
tags: [Monaco, SQL, Worker, 性能, 追问]
parent: sql-completion-with-worker

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「SQL 自动补全 / 校验怎么做才不卡 UI」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：你会先看哪些与 Monaco 相关的指标来判断「SQL 自动补全 / 校验怎么做才不卡 UI」是不是当前性能瓶颈？

### 答案要点

#### 标准回答（直接作答）

- 结论：解析迁移到 Worker
- 机制：SQL parser（dt-sql-parser / antlr 生成）解析大文件可能 100ms+，放主线程会卡输入；parser.worker.ts：onmessage 收文本 → 解析 → postMessage(result)
- 落地动作：回答「你会先看哪些与 Monaco 相关的指标来判断「SQL 自动补全 / 校验怎么做才不卡 UI」是不是当前性能瓶颈」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「你会先看哪些与 Monaco 相关的指标来判断「SQL 自动补全 / 校验怎么做才不卡 UI」是不是当前性能瓶颈」必须先给 你会先看哪些与 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，你会先看哪些与 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 你会先看哪些与 的计算与缓存路径。

#### 关键细节（可追问）

- 解析迁移到 Worker
- SQL parser（dt-sql-parser / antlr 生成）解析大文件可能 100ms+，放主线程会卡输入
- parser.worker.ts：onmessage 收文本 → 解析 → postMessage(result)

## metadata-cache-inflight-followup-1

title: 追问：在当前团队与业务约束下，你会先看哪些与 缓存 相关的指标来判断「元数据接口高并发去重 + 缓存怎么设计」是不是当前性能瓶颈
difficulty: 进阶
tags: [缓存, 并发, 高频, 追问]
parent: metadata-cache-inflight

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「元数据接口高并发去重 + 缓存怎么设计」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：在当前团队与业务约束下，你会先看哪些与 缓存 相关的指标来判断「元数据接口高并发去重 + 缓存怎么设计」是不是当前性能瓶颈？

### 答案要点

#### 标准回答（直接作答）

- 结论：一个页面 5 个组件同时挂载都要查 db.users 表的字段
- 机制：没有缓存：5 次重复请求；简单 Promise 缓存（一直存 Promise）：失败了也卡住
- 落地动作：回答「在当前团队与业务约束下，你会先看哪些与 缓存 相关的指标来判断「元数据接口高并发去重 + 缓存怎么设计」是不是当前性能瓶颈」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在当前团队与业务约束下，你会先看哪些与 缓存 相关的指标来判断「元数据接口高并发去重 + 缓存怎么设计」是不是当前性能瓶颈」必须先给 你会先看哪些与 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，你会先看哪些与 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 你会先看哪些与 的计算与缓存路径。

#### 关键细节（可追问）

- 一个页面 5 个组件同时挂载都要查 db.users 表的字段
- 没有缓存：5 次重复请求
- 简单 Promise 缓存（一直存 Promise）：失败了也卡住

## indexeddb-pane-persistence-followup-1

title: 追问：如果要评估「多 Tab 编辑器状态怎么持久化（投影模式）」的落地风险，你会优先检查哪些 IndexedDB 约束是否成立
difficulty: 资深
tags: [IndexedDB, 持久化, 状态, 追问]
parent: indexeddb-pane-persistence

### 一句话

先界定「多 Tab 编辑器状态怎么持久化（投影模式）」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：如果要评估「多 Tab 编辑器状态怎么持久化（投影模式）」的落地风险，你会优先检查哪些 IndexedDB 约束是否成立？

### 答案要点

#### 标准回答（直接作答）

- 结论：为什么不用 localStorage
- 机制：大小限制（5MB），结果集随便几万行就爆；同步 API，写入大对象会阻塞主线程
- 落地动作：回答「如果要评估「多 Tab 编辑器状态怎么持久化（投影模式）」的落地风险，你会优先检查哪些 IndexedDB 约束是否成立」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「如果要评估「多 Tab 编辑器状态怎么持久化（投影模式）」的落地风险，你会优先检查哪些 IndexedDB 约束是否成立」时要把 Tab 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，Tab 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「如果要评估「多 Tab 编辑器状态怎么持久化（投影模式）」的落地风险，你会优先检查哪些 IndexedDB 约束是否成立」里当前按阶段替换更稳。

#### 关键细节（可追问）

- 为什么不用 localStorage
- 大小限制（5MB），结果集随便几万行就爆
- 同步 API，写入大对象会阻塞主线程

## sql-result-polling-followup-1

title: 追问：结合真实业务约束，你会先看哪些与 轮询 相关的指标来判断「长 SQL 异步执行 + 前端轮询结果怎么设计」是不是当前性能瓶颈
difficulty: 进阶
tags: [轮询, 异步, 性能, 追问]
parent: sql-result-polling

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「长 SQL 异步执行 + 前端轮询结果怎么设计」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：结合真实业务约束，你会先看哪些与 轮询 相关的指标来判断「长 SQL 异步执行 + 前端轮询结果怎么设计」是不是当前性能瓶颈？

### 答案要点

#### 标准回答（直接作答）

- 结论：不要 long polling 单连接：浪费连接、网关常见超时 30s
- 机制：提交：POST /sql/submit → { taskId }；轮询：GET /sql/status?taskId=xxx → { status, result?, errorMsg? }
- 落地动作：回答「结合真实业务约束，你会先看哪些与 轮询 相关的指标来判断「长 SQL 异步执行 + 前端轮询结果怎么设计」是不是当前性能瓶颈」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，你会先看哪些与 轮询 相关的指标来判断「长 SQL 异步执行 + 前端轮询结果怎么设计」是不是当前性能瓶颈」必须先给 你会先看哪些与 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，你会先看哪些与 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 你会先看哪些与 的计算与缓存路径。

#### 关键细节（可追问）

- 不要 long polling 单连接：浪费连接、网关常见超时 30s
- 提交：POST /sql/submit → { taskId }
- 轮询：GET /sql/status?taskId=xxx → { status, result?, errorMsg? }

## ai-agent-streaming-render-followup-1

title: 追问：要让「AI Agent 流式对话怎么渲染才不卡」上线更稳，你会如何设计效果验证、预算预警和安全兜底机制
difficulty: 资深
tags: [AI, 流式, Markdown, 性能, 追问]
parent: ai-agent-streaming-render

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「AI Agent 流式对话怎么渲染才不卡」不是只在理想输入下成立。；再补可观测指标：效果与风险应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：要让「AI Agent 流式对话怎么渲染才不卡」上线更稳，你会如何设计效果验证、预算预警和安全兜底机制？

### 答案要点

#### 标准回答（直接作答）

- 结论：传输协议：SSE（单向、自动重连、event ID）；OpenAI / Anthropic / DeepSeek 都是 SSE
- 机制：fetch + ReadableStream（比 EventSource 灵活，支持自定义 header / POST）；TextDecoder 流式解码
- 落地动作：回答「要让「AI Agent 流式对话怎么渲染才不卡」上线更稳，你会如何设计效果验证、预算预警和安全兜底机制」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「要让「AI Agent 流式对话怎么渲染才不卡」上线更稳，你会如何设计效果验证、预算预警和安全兜底机制」时要先确认 要让 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，要让 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 要让 链路分层收口再逐步统一。

#### 关键细节（可追问）

- 传输协议：SSE（单向、自动重连、event ID）；OpenAI / Anthropic / DeepSeek 都是 SSE
- fetch + ReadableStream（比 EventSource 灵活，支持自定义 header / POST）
- TextDecoder 流式解码

## sql-copilot-diff-followup-1

title: 追问：围绕「AI 改写 SQL 的 Diff 接受/拒绝交互怎么做」发布前准备，你会如何安排评估集、预算上限和风险防护
difficulty: 资深
tags: [AI, Monaco, Diff, 追问]
parent: sql-copilot-diff

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「AI 改写 SQL 的 Diff 接受/拒绝交互怎么做」不是只在理想输入下成立。；再补可观测指标：效果与风险应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：围绕「AI 改写 SQL 的 Diff 接受/拒绝交互怎么做」发布前准备，你会如何安排评估集、预算上限和风险防护？

### 答案要点

#### 标准回答（直接作答）

- 结论：sqlEdits: { id, type: 'ADD'|'DELETE'|'UPDATE', startLine, endLine, newText }[]
- 机制：sessionId / requestId：用于撤销 / 反馈；Monaco 的 deltaDecorations 给增加段加绿色背景、删除段加红色删除线
- 落地动作：回答「围绕「AI 改写 SQL 的 Diff 接受/拒绝交互怎么做」发布前准备，你会如何安排评估集、预算上限和风险防护」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 AI 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 AI，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「围绕「AI 改写 SQL 的 Diff 接受/拒绝交互怎么做」发布前准备，你会如何安排评估集、预算上限和风险防护」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- sqlEdits: { id, type: 'ADD'|'DELETE'|'UPDATE', startLine, endLine, newText }[]
- sessionId / requestId：用于撤销 / 反馈
- Monaco 的 deltaDecorations 给增加段加绿色背景、删除段加红色删除线

## task-dependency-dag-followup-1

title: 追问：围绕「任务调度 DAG 依赖图怎么前端展示和交互」做稳定性评审时，你会先盯哪些边界条件来预防风险
difficulty: 资深
tags: [可视化, DAG, 调度, 追问]
parent: task-dependency-dag

### 一句话

先界定「任务调度 DAG 依赖图怎么前端展示和交互」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕复杂度和正确性展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：围绕「任务调度 DAG 依赖图怎么前端展示和交互」做稳定性评审时，你会先盯哪些边界条件来预防风险？

### 答案要点

#### 标准回答（直接作答）

- 结论：后端只返回当前节点 N 跳之内的子图（避免一次拉几万节点）
- 机制：节点 / 边都做 ID 唯一化，前端用 Map 索引；选 dagre / elk.js 做层次布局
- 落地动作：回答「围绕「任务调度 DAG 依赖图怎么前端展示和交互」做稳定性评审时，你会先盯哪些边界条件来预防风险」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的答案必须覆盖空值、重复值、越界输入；漏掉任一边界都会让 任务调度 结论失真。
- 失败场景：例如忽略极端输入规模，任务调度 的复杂度会在高峰期失控，导致超时或 OOM；修复要改数据结构并做压测。
- 替代方案与取舍：可选更直观但复杂度更高的写法快速交付；当前在「围绕「任务调度 DAG 依赖图怎么前端展示和交互」做稳定性评审时，你会先盯哪些边界条件来预防风险」优先保证规模上限可控。

#### 关键细节（可追问）

- 后端只返回当前节点 N 跳之内的子图（避免一次拉几万节点）
- 节点 / 边都做 ID 唯一化，前端用 Map 索引
- 选 dagre / elk.js 做层次布局

## multi-stage-deployment-followup-1

title: 追问：真要把「多国 / 多环境部署（CN / ID / SP / MX）怎么管理差异」推到线上，你会如何围绕 架构 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [架构, 部署, i18n, 追问]
parent: multi-stage-deployment

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写。

### 题目

如果面试官追问：真要把「多国 / 多环境部署（CN / ID / SP / MX）怎么管理差异」推到线上，你会如何围绕 架构 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：Vite / Webpack define 把 **STAGE** 注入为字符串常量（'cn' / 'id' / ...）
- 机制：Tree shaking 后，if (**STAGE** === 'cn') 在非 CN 包里整段消失；每个 stage 一份 JSON：CDN 域名、API 域名、特性开关、权限点、合规字段
- 落地动作：回答「真要把「多国 / 多环境部署（CN / ID / SP / MX）怎么管理差异」推到线上，你会如何围绕 架构 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「真要把「多国 / 多环境部署（CN / ID / SP / MX）怎么管理差异」推到线上，你会如何围绕 架构 设计灰度节奏、回滚条件和迁移路径」时要先定义 真要把 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，真要把 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 真要把 关键链路先收敛再替换。

#### 关键细节（可追问）

- Vite / Webpack define 把 **STAGE** 注入为字符串常量（'cn' / 'id' / ...）
- Tree shaking 后，if (**STAGE** === 'cn') 在非 CN 包里整段消失
- 每个 stage 一份 JSON：CDN 域名、API 域名、特性开关、权限点、合规字段

## permission-matrix-frontend-followup-1

title: 追问：在「复杂权限体系（数据 + 操作）前端怎么做」场景下，真把「复杂权限体系（数据 + 操作）前端怎么做」放到生产环境后，你会如何围绕 权限 划清信任边界并安排服务端兜底
difficulty: 资深
tags: [权限, 架构, 高频, 追问]
parent: permission-matrix-frontend

### 一句话

先画清信任边界：哪些输入来自用户、第三方或模型，哪些校验必须在服务端完成。；证明没有被绕过要靠攻击样例、审计日志、告警阈值和最小权限，而不是只说前端做了过滤。；一旦发现异常，要能降级到只读、禁用高危能力、刷新凭证或触发人工审核。

### 题目

如果面试官追问：在「复杂权限体系（数据 + 操作）前端怎么做」场景下，真把「复杂权限体系（数据 + 操作）前端怎么做」放到生产环境后，你会如何围绕 权限 划清信任边界并安排服务端兜底？

### 答案要点

#### 标准回答（直接作答）

- 结论：前端只做"看见 / 不可点"，关键操作的最终鉴权永远在后端
- 机制：权限不是布尔值，是字符串集合（['metric:create', 'datasource:read']）；数据权限（行级 / 列级）通常由后端在数据返回时已过滤
- 落地动作：回答「在「复杂权限体系（数据 + 操作）前端怎么做」场景下，真把「复杂权限体系（数据 + 操作）前端怎么做」放到生产环境后，你会如何围绕 权限 划清信任边界并安排服务端兜底」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「复杂权限体系（数据 + 操作）前端怎么做」场景下，真把「复杂权限体系（数据 + 操作）前端怎么做」放到生产环境后，你会如何围绕 权限 划清信任边界并安排服务端兜底」时要先确认 复杂权限体系 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，复杂权限体系 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 复杂权限体系 链路分层收口再逐步统一。

#### 关键细节（可追问）

- 前端只做"看见 / 不可点"，关键操作的最终鉴权永远在后端
- 权限不是布尔值，是字符串集合（['metric:create', 'datasource:read']）
- 数据权限（行级 / 列级）通常由后端在数据返回时已过滤

## big-table-virtualization-followup-1

title: 追问：从工程落地角度看，你会先看哪些与 虚拟列表 相关的指标来判断「数据平台几十万行结果集表格怎么不卡」是不是当前性能瓶颈
difficulty: 资深
tags: [虚拟列表, 表格, 性能, 高频, 追问]
parent: big-table-virtualization

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「数据平台几十万行结果集表格怎么不卡」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：从工程落地角度看，你会先看哪些与 虚拟列表 相关的指标来判断「数据平台几十万行结果集表格怎么不卡」是不是当前性能瓶颈？

### 答案要点

#### 标准回答（直接作答）

- 结论：vxe-table 4.x：性能好，复杂功能（编辑、树表、导出）齐全
- 机制：ag-grid：商业级，pivot / aggregation 强大，社区版够用；TanStack Table（前 react-table）：headless，自己控制渲染
- 落地动作：回答「从工程落地角度看，你会先看哪些与 虚拟列表 相关的指标来判断「数据平台几十万行结果集表格怎么不卡」是不是当前性能瓶颈」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：只有在 从工程落地角度看 的瓶颈被数据证实、回归方案准备完成时，答案里的优化建议才可直接执行。
- 失败场景：例如主线程在首屏阶段执行重计算，从工程落地角度看 指标会从可接受直接退化到用户可感知卡顿；修复要拆分任务并回归验证。
- 替代方案与取舍：可选一次性大重构追求极致性能，但交付风险高；当前对「从工程落地角度看，你会先看哪些与 虚拟列表 相关的指标来判断「数据平台几十万行结果集表格怎么不卡」是不是当前性能瓶颈」采用小步优化更稳。

#### 关键细节（可追问）

- vxe-table 4.x：性能好，复杂功能（编辑、树表、导出）齐全
- ag-grid：商业级，pivot / aggregation 强大，社区版够用
- TanStack Table（前 react-table）：headless，自己控制渲染

## upload-large-file-followup-1

title: 追问：从工程落地角度看，如果要评估「大文件分片上传怎么实现」的落地风险，你会优先检查哪些 上传 约束是否成立
difficulty: 进阶
tags: [上传, 分片, 高频, 追问]
parent: upload-large-file

### 一句话

先界定「大文件分片上传怎么实现」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：从工程落地角度看，如果要评估「大文件分片上传怎么实现」的落地风险，你会优先检查哪些 上传 约束是否成立？

### 答案要点

#### 标准回答（直接作答）

- 结论：前端选文件后用 Web Worker 计算 hash（spark-md5）
- 机制：调 /upload/check 问后端：这个 hash 是否已上传过；已上传：秒传成功（无需上传任何分片）
- 落地动作：回答「从工程落地角度看，如果要评估「大文件分片上传怎么实现」的落地风险，你会优先检查哪些 上传 约束是否成立」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题要先说清 从工程落地角度看 的函数签名、时序语义和资源释放策略；如果这些口径不统一，代码再长也不是标准答案。
- 失败场景：例如 从工程落地角度看 实现里定时器或订阅未正确释放，连续操作后会出现重复执行或内存泄漏；修复要补清理逻辑和回归用例。
- 替代方案与取舍：可直接引入成熟库快速上线，但在「从工程落地角度看，如果要评估「大文件分片上传怎么实现」的落地风险，你会优先检查哪些 上传 约束是否成立」这题里仍要讲清底层语义；当前保留手写版本便于解释边界与调试。

#### 关键细节（可追问）

- 前端选文件后用 Web Worker 计算 hash（spark-md5）
- 调 /upload/check 问后端：这个 hash 是否已上传过
- 已上传：秒传成功（无需上传任何分片）

## g2-charts-perf-followup-1

title: 追问：在当前团队与业务约束下，你会先看哪些与 图表 相关的指标来判断「数据看板（Dashboard）几十个图表同时渲染怎么不卡」是不是当前性能瓶颈
difficulty: 进阶
tags: [图表, 看板, 性能, 追问]
parent: g2-charts-perf

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「数据看板（Dashboard）几十个图表同时渲染怎么不卡」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：在当前团队与业务约束下，你会先看哪些与 图表 相关的指标来判断「数据看板（Dashboard）几十个图表同时渲染怎么不卡」是不是当前性能瓶颈？

### 答案要点

#### 标准回答（直接作答）

- 结论：后端预聚合（按天 / 按小时分桶），前端拿到几十几百行
- 机制：千万级数据走 OLAP（ClickHouse / Druid）；大图表数据按需加载（点击展开才请求）
- 落地动作：回答「在当前团队与业务约束下，你会先看哪些与 图表 相关的指标来判断「数据看板（Dashboard）几十个图表同时渲染怎么不卡」是不是当前性能瓶颈」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在当前团队与业务约束下，你会先看哪些与 图表 相关的指标来判断「数据看板（Dashboard）几十个图表同时渲染怎么不卡」是不是当前性能瓶颈」必须先给 你会先看哪些与 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，你会先看哪些与 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 你会先看哪些与 的计算与缓存路径。

#### 关键细节（可追问）

- 后端预聚合（按天 / 按小时分桶），前端拿到几十几百行
- 千万级数据走 OLAP（ClickHouse / Druid）
- 大图表数据按需加载（点击展开才请求）

## release-rollback-frontend-followup-1

title: 追问：从工程落地角度看，真要把「前端版本灰度 + 回滚怎么做」推到线上，你会如何围绕 发布 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [发布, 灰度, 工程化, 追问]
parent: release-rollback-frontend

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「前端版本灰度 + 回滚怎么做」拆成可验证的小步骤，逐步替换高风险部分。

### 题目

如果面试官追问：从工程落地角度看，真要把「前端版本灰度 + 回滚怎么做」推到线上，你会如何围绕 发布 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：每个版本独立目录：/static/v1.2.3/index.js, vendor.js
- 机制：HTML 引用具体版本目录的资源；老版本资源至少保留 7 天（防 SW 缓存的用户加载老 HTML）
- 落地动作：回答「从工程落地角度看，真要把「前端版本灰度 + 回滚怎么做」推到线上，你会如何围绕 发布 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 从工程落地角度看 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 从工程落地角度看，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「从工程落地角度看，真要把「前端版本灰度 + 回滚怎么做」推到线上，你会如何围绕 发布 设计灰度节奏、回滚条件和迁移路径」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 每个版本独立目录：/static/v1.2.3/index.js, vendor.js
- HTML 引用具体版本目录的资源
- 老版本资源至少保留 7 天（防 SW 缓存的用户加载老 HTML）

## interview-system-design-bigreport-followup-1

title: 追问：以「系统设计题：从 0 设计一个数据平台前端，你怎么拆」为例，真要把「系统设计题：从 0 设计一个数据平台前端，你怎么拆」推到线上，你会如何围绕 系统设计 设计灰度节奏、回滚条件和迁移路径
difficulty: 资深
tags: [系统设计, 架构, 高频, 追问]
parent: interview-system-design-bigreport

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「系统设计题：从 0 设计一个数据平台前端，你怎么拆」拆成可验证的小步骤，逐步替换高风险部分。

### 题目

如果面试官追问：以「系统设计题：从 0 设计一个数据平台前端，你怎么拆」为例，真要把「系统设计题：从 0 设计一个数据平台前端，你怎么拆」推到线上，你会如何围绕 系统设计 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：用户角色：分析师 / 开发 / 数仓 / 业务方 / 管理员
- 机制：关键场景：日常查数、临时分析、项目化开发、运维排查；性能 SLA：首屏 < 1.5s，操作响应 < 200ms
- 落地动作：回答「以「系统设计题：从 0 设计一个数据平台前端，你怎么拆」为例，真要把「系统设计题：从 0 设计一个数据平台前端，你怎么拆」推到线上，你会如何围绕 系统设计 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 系统设计题 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 系统设计题，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「以「系统设计题：从 0 设计一个数据平台前端，你怎么拆」为例，真要把「系统设计题：从 0 设计一个数据平台前端，你怎么拆」推到线上，你会如何围绕 系统设计 设计灰度节奏、回滚条件和迁移路径」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 用户角色：分析师 / 开发 / 数仓 / 业务方 / 管理员
- 关键场景：日常查数、临时分析、项目化开发、运维排查
- 性能 SLA：首屏 < 1.5s，操作响应 < 200ms

## sql-workbench-architecture-followup-2

title: 追问：结合真实业务约束，面对团队能力差异，你会如何围绕 架构 把「设计一个浏览器内的 SQL 工作台，整体架构怎么拆」拆成可并行推进的小阶段
difficulty: 资深
tags: [架构, SQL, Monaco, 高频, 追问]
parent: sql-workbench-architecture
generated: followup-script

### 一句话

推动「设计一个浏览器内的 SQL 工作台，整体架构怎么拆」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；「设计一个浏览器内的 SQL 工作台，整体架构怎么拆」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。。

### 题目

如果面试官追问：结合真实业务约束，面对团队能力差异，你会如何围绕 架构 把「设计一个浏览器内的 SQL 工作台，整体架构怎么拆」拆成可并行推进的小阶段？

### 答案要点

#### 标准回答（直接作答）

- 结论：顶层布局：左侧元数据树（数据源 / 库 / 表 / 字段）+ 中间多 Tab 编辑器 + 下方结果区
- 机制：编辑器层（Monaco）；一份 model 对应一个 Pane（用 URI 隔离）
- 落地动作：回答「结合真实业务约束，面对团队能力差异，你会如何围绕 架构 把「设计一个浏览器内的 SQL 工作台，整体架构怎么拆」拆成可并行推进的小阶段」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 面对团队能力差异 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 面对团队能力差异，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「结合真实业务约束，面对团队能力差异，你会如何围绕 架构 把「设计一个浏览器内的 SQL 工作台，整体架构怎么拆」拆成可并行推进的小阶段」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 顶层布局：左侧元数据树（数据源 / 库 / 表 / 字段）+ 中间多 Tab 编辑器 + 下方结果区
- 编辑器层（Monaco）
- 一份 model 对应一个 Pane（用 URI 隔离）

## sql-workbench-architecture-followup-3

title: 追问：以「设计一个浏览器内的 SQL 工作台，整体架构怎么拆」为例，你会如何用可观测数据衡量「设计一个浏览器内的 SQL 工作台，整体架构怎么拆」在 架构方案 上的维护成本和收益平衡
difficulty: 资深
tags: [架构, SQL, Monaco, 高频, 追问]
parent: sql-workbench-architecture
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「设计一个浏览器内的 SQL 工作台，整体架构怎么拆」时要能同时解释收益、代价和失败信号。；回答顺序可用「现状问题 -> 架构方案 方案动作 -> 验证结果」，并用「设计一个浏览器内的 SQL 工作台。

### 题目

如果面试官追问：以「设计一个浏览器内的 SQL 工作台，整体架构怎么拆」为例，你会如何用可观测数据衡量「设计一个浏览器内的 SQL 工作台，整体架构怎么拆」在 架构方案 上的维护成本和收益平衡？

### 答案要点

#### 标准回答（直接作答）

- 结论：顶层布局：左侧元数据树（数据源 / 库 / 表 / 字段）+ 中间多 Tab 编辑器 + 下方结果区
- 机制：编辑器层（Monaco）；一份 model 对应一个 Pane（用 URI 隔离）
- 落地动作：回答「以「设计一个浏览器内的 SQL 工作台，整体架构怎么拆」为例，你会如何用可观测数据衡量「设计一个浏览器内的 SQL 工作台，整体架构怎么拆」在 架构方案 上的维护成本和收益平衡」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 设计一个浏览器内的 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 设计一个浏览器内的，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「以「设计一个浏览器内的 SQL 工作台，整体架构怎么拆」为例，你会如何用可观测数据衡量「设计一个浏览器内的 SQL 工作台，整体架构怎么拆」在 架构方案 上的维护成本和收益平衡」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 顶层布局：左侧元数据树（数据源 / 库 / 表 / 字段）+ 中间多 Tab 编辑器 + 下方结果区
- 编辑器层（Monaco）
- 一份 model 对应一个 Pane（用 URI 隔离）

## monaco-multi-pane-isolation-followup-2

title: 追问：你会怎样验证「Monaco 多 Tab 编辑器实例之间怎么做隔离」在 Monaco 维度上的优化收益在真实设备和真实网络下也成立
difficulty: 资深
tags: [Monaco, 多实例, 内存, 追问]
parent: monaco-multi-pane-isolation
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「Monaco 多 Tab 编辑器实例之间怎么做隔离」在当前约束下为什么成立。；回答结构可按「触发条件 -> Monaco 机制 -> 风险兜底」展开。

### 题目

如果面试官追问：你会怎样验证「Monaco 多 Tab 编辑器实例之间怎么做隔离」在 Monaco 维度上的优化收益在真实设备和真实网络下也成立？

### 答案要点

#### 标准回答（直接作答）

- 结论：URI 隔离：monaco.Uri.parse('inmemory://pane/')；同一个 URI 全局只有一份 model，多实例共享会出问题
- 机制：匿名 Pane：模态预览等没有 paneKey 的实例，需要分配自增序号 URI，避免几个匿名实例共享同一 model；Provider 一次性注册：用模块级布尔变量 hiveProvidersRegistered 守卫，避免每次 mount 重复注册导致补全候选项重复
- 落地动作：回答「你会怎样验证「Monaco 多 Tab 编辑器实例之间怎么做隔离」在 Monaco 维度上的优化收益在真实设备和真实网络下也成立」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「你会怎样验证「Monaco 多 Tab 编辑器实例之间怎么做隔离」在 Monaco 维度上的优化收益在真实设备和真实网络下也成立」必须先给 你会怎样验证 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，你会怎样验证 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 你会怎样验证 的计算与缓存路径。

#### 关键细节（可追问）

- URI 隔离：monaco.Uri.parse('inmemory://pane/')；同一个 URI 全局只有一份 model，多实例共享会出问题
- 匿名 Pane：模态预览等没有 paneKey 的实例，需要分配自增序号 URI，避免几个匿名实例共享同一 model
- Provider 一次性注册：用模块级布尔变量 hiveProvidersRegistered 守卫，避免每次 mount 重复注册导致补全候选项重复

## monaco-multi-pane-isolation-followup-3

title: 追问：结合真实业务约束，当「Monaco 多 Tab 编辑器实例之间怎么做隔离」在 Monaco 优化上可能影响兼容性时，你会如何设定推进与回退门槛
difficulty: 资深
tags: [Monaco, 多实例, 内存, 追问]
parent: monaco-multi-pane-isolation
generated: followup-script

### 一句话

规模变大后先重新评估「Monaco 多 Tab 编辑器实例之间怎么做隔离」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「Monaco 多 Tab 编辑器实例之间怎么做隔离」对应的性能收益被复杂度抵消。

### 题目

如果面试官追问：结合真实业务约束，当「Monaco 多 Tab 编辑器实例之间怎么做隔离」在 Monaco 优化上可能影响兼容性时，你会如何设定推进与回退门槛？

### 答案要点

#### 标准回答（直接作答）

- 结论：URI 隔离：monaco.Uri.parse('inmemory://pane/')；同一个 URI 全局只有一份 model，多实例共享会出问题
- 机制：匿名 Pane：模态预览等没有 paneKey 的实例，需要分配自增序号 URI，避免几个匿名实例共享同一 model；Provider 一次性注册：用模块级布尔变量 hiveProvidersRegistered 守卫，避免每次 mount 重复注册导致补全候选项重复
- 落地动作：回答「结合真实业务约束，当「Monaco 多 Tab 编辑器实例之间怎么做隔离」在 Monaco 优化上可能影响兼容性时，你会如何设定推进与回退门槛」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：只有在 Monaco 的瓶颈被数据证实、回归方案准备完成时，答案里的优化建议才可直接执行。
- 失败场景：例如主线程在首屏阶段执行重计算，Monaco 指标会从可接受直接退化到用户可感知卡顿；修复要拆分任务并回归验证。
- 替代方案与取舍：可选一次性大重构追求极致性能，但交付风险高；当前对「结合真实业务约束，当「Monaco 多 Tab 编辑器实例之间怎么做隔离」在 Monaco 优化上可能影响兼容性时，你会如何设定推进与回退门槛」采用小步优化更稳。

#### 关键细节（可追问）

- URI 隔离：monaco.Uri.parse('inmemory://pane/')；同一个 URI 全局只有一份 model，多实例共享会出问题
- 匿名 Pane：模态预览等没有 paneKey 的实例，需要分配自增序号 URI，避免几个匿名实例共享同一 model
- Provider 一次性注册：用模块级布尔变量 hiveProvidersRegistered 守卫，避免每次 mount 重复注册导致补全候选项重复

## sql-completion-with-worker-followup-2

title: 追问：你会怎样验证「SQL 自动补全 / 校验怎么做才不卡 UI」在 Monaco 维度上的优化收益在真实设备和真实网络下也成立
difficulty: 资深
tags: [Monaco, SQL, Worker, 性能, 追问]
parent: sql-completion-with-worker
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「SQL 自动补全 / 校验怎么做才不卡 UI」不是只在理想输入下成立。。

### 题目

如果面试官追问：你会怎样验证「SQL 自动补全 / 校验怎么做才不卡 UI」在 Monaco 维度上的优化收益在真实设备和真实网络下也成立？

### 答案要点

#### 标准回答（直接作答）

- 结论：解析迁移到 Worker
- 机制：SQL parser（dt-sql-parser / antlr 生成）解析大文件可能 100ms+，放主线程会卡输入；parser.worker.ts：onmessage 收文本 → 解析 → postMessage(result)
- 落地动作：回答「你会怎样验证「SQL 自动补全 / 校验怎么做才不卡 UI」在 Monaco 维度上的优化收益在真实设备和真实网络下也成立」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「你会怎样验证「SQL 自动补全 / 校验怎么做才不卡 UI」在 Monaco 维度上的优化收益在真实设备和真实网络下也成立」必须先给 你会怎样验证 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，你会怎样验证 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 你会怎样验证 的计算与缓存路径。

#### 关键细节（可追问）

- 解析迁移到 Worker
- SQL parser（dt-sql-parser / antlr 生成）解析大文件可能 100ms+，放主线程会卡输入
- parser.worker.ts：onmessage 收文本 → 解析 → postMessage(result)

## sql-completion-with-worker-followup-3

title: 追问：以「SQL 自动补全 / 校验怎么做才不卡 UI」为例，如果优化带来复杂度或兼容性成本，你会怎么评估「SQL 自动补全 / 校验怎么做才不卡 UI」是否值得做
difficulty: 资深
tags: [Monaco, SQL, Worker, 性能, 追问]
parent: sql-completion-with-worker
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「SQL 自动补全 / 校验怎么做才不卡 UI」不是只在理想输入下成立。。

### 题目

如果面试官追问：以「SQL 自动补全 / 校验怎么做才不卡 UI」为例，如果优化带来复杂度或兼容性成本，你会怎么评估「SQL 自动补全 / 校验怎么做才不卡 UI」是否值得做？

### 答案要点

#### 标准回答（直接作答）

- 结论：解析迁移到 Worker
- 机制：SQL parser（dt-sql-parser / antlr 生成）解析大文件可能 100ms+，放主线程会卡输入；parser.worker.ts：onmessage 收文本 → 解析 → postMessage(result)
- 落地动作：回答「以「SQL 自动补全 / 校验怎么做才不卡 UI」为例，如果优化带来复杂度或兼容性成本，你会怎么评估「SQL 自动补全 / 校验怎么做才不卡 UI」是否值得做」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「以「SQL 自动补全 / 校验怎么做才不卡 UI」为例，如果优化带来复杂度或兼容性成本，你会怎么评估「SQL 自动补全 / 校验怎么做才不卡 UI」是否值得做」必须先给 SQL 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，SQL 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 SQL 的计算与缓存路径。

#### 关键细节（可追问）

- 解析迁移到 Worker
- SQL parser（dt-sql-parser / antlr 生成）解析大文件可能 100ms+，放主线程会卡输入
- parser.worker.ts：onmessage 收文本 → 解析 → postMessage(result)

## metadata-cache-inflight-followup-2

title: 追问：在「元数据接口高并发去重 + 缓存怎么设计」场景下，你会如何结合 缓存 指标，避免把「元数据接口高并发去重 + 缓存怎么设计」的实验室提升误判为真实用户体验改善
difficulty: 进阶
tags: [缓存, 并发, 高频, 追问]
parent: metadata-cache-inflight
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「元数据接口高并发去重 + 缓存怎么设计」不是只在理想输入下成立。；再补可观测指标：围绕「元数据接口高并发去重 + 缓存怎么设计」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察。

### 题目

如果面试官追问：在「元数据接口高并发去重 + 缓存怎么设计」场景下，你会如何结合 缓存 指标，避免把「元数据接口高并发去重 + 缓存怎么设计」的实验室提升误判为真实用户体验改善？

### 答案要点

#### 标准回答（直接作答）

- 结论：一个页面 5 个组件同时挂载都要查 db.users 表的字段
- 机制：没有缓存：5 次重复请求；简单 Promise 缓存（一直存 Promise）：失败了也卡住
- 落地动作：回答「在「元数据接口高并发去重 + 缓存怎么设计」场景下，你会如何结合 缓存 指标，避免把「元数据接口高并发去重 + 缓存怎么设计」的实验室提升误判为真实用户体验改善」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：只有在 元数据接口高并发去重 的瓶颈被数据证实、回归方案准备完成时，答案里的优化建议才可直接执行。
- 失败场景：例如主线程在首屏阶段执行重计算，元数据接口高并发去重 指标会从可接受直接退化到用户可感知卡顿；修复要拆分任务并回归验证。
- 替代方案与取舍：可选一次性大重构追求极致性能，但交付风险高；当前对「在「元数据接口高并发去重 + 缓存怎么设计」场景下，你会如何结合 缓存 指标，避免把「元数据接口高并发去重 + 缓存怎么设计」的实验室提升误判为真实用户体验改善」采用小步优化更稳。

#### 关键细节（可追问）

- 一个页面 5 个组件同时挂载都要查 db.users 表的字段
- 没有缓存：5 次重复请求
- 简单 Promise 缓存（一直存 Promise）：失败了也卡住

## metadata-cache-inflight-followup-3

title: 追问：从工程落地角度看，你会怎样比较「元数据接口高并发去重 + 缓存怎么设计」在 缓存策略 优化上的短期收益和长期负担，决定是否落地
difficulty: 进阶
tags: [缓存, 并发, 高频, 追问]
parent: metadata-cache-inflight
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「元数据接口高并发去重 + 缓存怎么设计」讲成只在理想输入下可用。；建议按「输入约束 -> 缓存策略 执行链路 -> 结果验证」展开，并结合「元数据接口高并发去重 + 缓存怎么设计」给出一条可复核结果。

### 题目

如果面试官追问：从工程落地角度看，你会怎样比较「元数据接口高并发去重 + 缓存怎么设计」在 缓存策略 优化上的短期收益和长期负担，决定是否落地？

### 答案要点

#### 标准回答（直接作答）

- 结论：一个页面 5 个组件同时挂载都要查 db.users 表的字段
- 机制：没有缓存：5 次重复请求；简单 Promise 缓存（一直存 Promise）：失败了也卡住
- 落地动作：回答「从工程落地角度看，你会怎样比较「元数据接口高并发去重 + 缓存怎么设计」在 缓存策略 优化上的短期收益和长期负担，决定是否落地」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「从工程落地角度看，你会怎样比较「元数据接口高并发去重 + 缓存怎么设计」在 缓存策略 优化上的短期收益和长期负担，决定是否落地」必须先给 从工程落地角度看 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，从工程落地角度看 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 从工程落地角度看 的计算与缓存路径。

#### 关键细节（可追问）

- 一个页面 5 个组件同时挂载都要查 db.users 表的字段
- 没有缓存：5 次重复请求
- 简单 Promise 缓存（一直存 Promise）：失败了也卡住

## sql-result-polling-followup-2

title: 追问：在「长 SQL 异步执行 + 前端轮询结果怎么设计」场景下，当「长 SQL 异步执行 + 前端轮询结果怎么设计」优化后，你会优先看哪些真实用户信号来确认收益
difficulty: 进阶
tags: [轮询, 异步, 性能, 追问]
parent: sql-result-polling
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「长 SQL 异步执行 + 前端轮询结果怎么设计」讲成只在理想输入下可用。；建议按「输入约束 -> 轮询 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：在「长 SQL 异步执行 + 前端轮询结果怎么设计」场景下，当「长 SQL 异步执行 + 前端轮询结果怎么设计」优化后，你会优先看哪些真实用户信号来确认收益？

### 答案要点

#### 标准回答（直接作答）

- 结论：不要 long polling 单连接：浪费连接、网关常见超时 30s
- 机制：提交：POST /sql/submit → { taskId }；轮询：GET /sql/status?taskId=xxx → { status, result?, errorMsg? }
- 落地动作：回答「在「长 SQL 异步执行 + 前端轮询结果怎么设计」场景下，当「长 SQL 异步执行 + 前端轮询结果怎么设计」优化后，你会优先看哪些真实用户信号来确认收益」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「长 SQL 异步执行 + 前端轮询结果怎么设计」场景下，当「长 SQL 异步执行 + 前端轮询结果怎么设计」优化后，你会优先看哪些真实用户信号来确认收益」必须先给 SQL 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，SQL 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 SQL 的计算与缓存路径。

#### 关键细节（可追问）

- 不要 long polling 单连接：浪费连接、网关常见超时 30s
- 提交：POST /sql/submit → { taskId }
- 轮询：GET /sql/status?taskId=xxx → { status, result?, errorMsg? }

## sql-result-polling-followup-3

title: 追问：在「长 SQL 异步执行 + 前端轮询结果怎么设计」场景下，围绕「长 SQL 异步执行 + 前端轮询结果怎么设计」在 轮询 上的优化决策，你会如何量化收益、风险和长期维护成本
difficulty: 进阶
tags: [轮询, 异步, 性能, 追问]
parent: sql-result-polling
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「长 SQL 异步执行 + 前端轮询结果怎么设计」在当前约束下为什么成立。；建议按「输入约束 -> 轮询 执行链路 -> 结果验证」展开，并结合「长 SQL 异步执行 + 前端轮询结果怎么设计」给出一条可复核结果。

### 题目

如果面试官追问：在「长 SQL 异步执行 + 前端轮询结果怎么设计」场景下，围绕「长 SQL 异步执行 + 前端轮询结果怎么设计」在 轮询 上的优化决策，你会如何量化收益、风险和长期维护成本？

### 答案要点

#### 标准回答（直接作答）

- 结论：不要 long polling 单连接：浪费连接、网关常见超时 30s
- 机制：提交：POST /sql/submit → { taskId }；轮询：GET /sql/status?taskId=xxx → { status, result?, errorMsg? }
- 落地动作：回答「在「长 SQL 异步执行 + 前端轮询结果怎么设计」场景下，围绕「长 SQL 异步执行 + 前端轮询结果怎么设计」在 轮询 上的优化决策，你会如何量化收益、风险和长期维护成本」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：只有在 SQL 的瓶颈被数据证实、回归方案准备完成时，答案里的优化建议才可直接执行。
- 失败场景：例如主线程在首屏阶段执行重计算，SQL 指标会从可接受直接退化到用户可感知卡顿；修复要拆分任务并回归验证。
- 替代方案与取舍：可选一次性大重构追求极致性能，但交付风险高；当前对「在「长 SQL 异步执行 + 前端轮询结果怎么设计」场景下，围绕「长 SQL 异步执行 + 前端轮询结果怎么设计」在 轮询 上的优化决策，你会如何量化收益、风险和长期维护成本」采用小步优化更稳。

#### 关键细节（可追问）

- 不要 long polling 单连接：浪费连接、网关常见超时 30s
- 提交：POST /sql/submit → { taskId }
- 轮询：GET /sql/status?taskId=xxx → { status, result?, errorMsg? }

## ai-agent-streaming-render-followup-2

title: 追问：在当前团队与业务约束下，当「AI Agent 流式对话怎么渲染才不卡」优化后，你会优先看哪些真实用户信号来确认收益
difficulty: 资深
tags: [AI, 流式, Markdown, 性能, 追问]
parent: ai-agent-streaming-render
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「AI Agent 流式对话怎么渲染才不卡」时要能同时解释收益、代价和失败信号。；讲「AI Agent 流式对话怎么渲染才不卡」时先给 AI 应用链路 的判断口径，再补执行动作和回退条件，会更像真实评审发言。。

### 题目

如果面试官追问：在当前团队与业务约束下，当「AI Agent 流式对话怎么渲染才不卡」优化后，你会优先看哪些真实用户信号来确认收益？

### 答案要点

#### 标准回答（直接作答）

- 结论：传输协议：SSE（单向、自动重连、event ID）；OpenAI / Anthropic / DeepSeek 都是 SSE
- 机制：fetch + ReadableStream（比 EventSource 灵活，支持自定义 header / POST）；TextDecoder 流式解码
- 落地动作：回答「在当前团队与业务约束下，当「AI Agent 流式对话怎么渲染才不卡」优化后，你会优先看哪些真实用户信号来确认收益」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在当前团队与业务约束下，当「AI Agent 流式对话怎么渲染才不卡」优化后，你会优先看哪些真实用户信号来确认收益」必须先给 AI 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，AI 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 AI 的计算与缓存路径。

#### 关键细节（可追问）

- 传输协议：SSE（单向、自动重连、event ID）；OpenAI / Anthropic / DeepSeek 都是 SSE
- fetch + ReadableStream（比 EventSource 灵活，支持自定义 header / POST）
- TextDecoder 流式解码

## ai-agent-streaming-render-followup-3

title: 追问：在当前团队与业务约束下，围绕「AI Agent 流式对话怎么渲染才不卡」在 AI 应用链路 上的优化决策，你会如何量化收益、风险和长期维护成本
difficulty: 资深
tags: [AI, 流式, Markdown, 性能, 追问]
parent: ai-agent-streaming-render
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「AI Agent 流式对话怎么渲染才不卡」在当前约束下为什么成立。；回答结构可按「触发条件 -> AI 应用链路 机制 -> 风险兜底」展开，并以「AI Agent 流式对话怎么渲染才不卡」补一条失败场景。

### 题目

如果面试官追问：在当前团队与业务约束下，围绕「AI Agent 流式对话怎么渲染才不卡」在 AI 应用链路 上的优化决策，你会如何量化收益、风险和长期维护成本？

### 答案要点

#### 标准回答（直接作答）

- 结论：传输协议：SSE（单向、自动重连、event ID）；OpenAI / Anthropic / DeepSeek 都是 SSE
- 机制：fetch + ReadableStream（比 EventSource 灵活，支持自定义 header / POST）；TextDecoder 流式解码
- 落地动作：回答「在当前团队与业务约束下，围绕「AI Agent 流式对话怎么渲染才不卡」在 AI 应用链路 上的优化决策，你会如何量化收益、风险和长期维护成本」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在当前团队与业务约束下，围绕「AI Agent 流式对话怎么渲染才不卡」在 AI 应用链路 上的优化决策，你会如何量化收益、风险和长期维护成本」必须先给 AI 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，AI 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 AI 的计算与缓存路径。

#### 关键细节（可追问）

- 传输协议：SSE（单向、自动重连、event ID）；OpenAI / Anthropic / DeepSeek 都是 SSE
- fetch + ReadableStream（比 EventSource 灵活，支持自定义 header / POST）
- TextDecoder 流式解码

## sql-copilot-diff-followup-2

title: 追问：在当前团队与业务约束下，在「AI 改写 SQL 的 Diff 接受/拒绝交互怎么做」场景下，模型输出不稳定或出现幻觉时，产品和工程上你会如何为「AI 改写 SQL 的 Diff 接受/拒绝交互怎么做」分别兜底
difficulty: 资深
tags: [AI, Monaco, Diff, 追问]
parent: sql-copilot-diff
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「AI 改写 SQL 的 Diff 接受/拒绝交互怎么做」在当前约束下为什么成立。；建议按「输入约束 -> AI 应用链路 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：在当前团队与业务约束下，在「AI 改写 SQL 的 Diff 接受/拒绝交互怎么做」场景下，模型输出不稳定或出现幻觉时，产品和工程上你会如何为「AI 改写 SQL 的 Diff 接受/拒绝交互怎么做」分别兜底？

### 答案要点

#### 标准回答（直接作答）

- 结论：sqlEdits: { id, type: 'ADD'|'DELETE'|'UPDATE', startLine, endLine, newText }[]
- 机制：sessionId / requestId：用于撤销 / 反馈；Monaco 的 deltaDecorations 给增加段加绿色背景、删除段加红色删除线
- 落地动作：回答「在当前团队与业务约束下，在「AI 改写 SQL 的 Diff 接受/拒绝交互怎么做」场景下，模型输出不稳定或出现幻觉时，产品和工程上你会如何为「AI 改写 SQL 的 Diff 接受/拒绝交互怎么做」分别兜底」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在当前团队与业务约束下，在「AI 改写 SQL 的 Diff 接受/拒绝交互怎么做」场景下，模型输出不稳定或出现幻觉时，产品和工程上你会如何为「AI 改写 SQL 的 Diff 接受/拒绝交互怎么做」分别兜底」时要先定义 AI 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，AI 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 AI 关键链路先收敛再替换。

#### 关键细节（可追问）

- sqlEdits: { id, type: 'ADD'|'DELETE'|'UPDATE', startLine, endLine, newText }[]
- sessionId / requestId：用于撤销 / 反馈
- Monaco 的 deltaDecorations 给增加段加绿色背景、删除段加红色删除线

## sql-copilot-diff-followup-3

title: 追问：以「AI 改写 SQL 的 Diff 接受/拒绝交互怎么做」为例，在「AI 改写 SQL 的 Diff 接受/拒绝交互怎么做」场景里，你会如何围绕 AI 定义“优先保准确”与“优先保时延”的切换条件
difficulty: 资深
tags: [AI, Monaco, Diff, 追问]
parent: sql-copilot-diff
generated: followup-script

### 一句话

规模变大后先重新评估「AI 改写 SQL 的 Diff 接受/拒绝交互怎么做」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「AI 改写 SQL 的 Diff 接受/拒绝交互怎么做」对应的效果与风险收益被复杂度抵消。

### 题目

如果面试官追问：以「AI 改写 SQL 的 Diff 接受/拒绝交互怎么做」为例，在「AI 改写 SQL 的 Diff 接受/拒绝交互怎么做」场景里，你会如何围绕 AI 定义“优先保准确”与“优先保时延”的切换条件？

### 答案要点

#### 标准回答（直接作答）

- 结论：sqlEdits: { id, type: 'ADD'|'DELETE'|'UPDATE', startLine, endLine, newText }[]
- 机制：sessionId / requestId：用于撤销 / 反馈；Monaco 的 deltaDecorations 给增加段加绿色背景、删除段加红色删除线
- 落地动作：回答「以「AI 改写 SQL 的 Diff 接受/拒绝交互怎么做」为例，在「AI 改写 SQL 的 Diff 接受/拒绝交互怎么做」场景里，你会如何围绕 AI 定义“优先保准确”与“优先保时延”的切换条件」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「以「AI 改写 SQL 的 Diff 接受/拒绝交互怎么做」为例，在「AI 改写 SQL 的 Diff 接受/拒绝交互怎么做」场景里，你会如何围绕 AI 定义“优先保准确”与“优先保时延”的切换条件」时要先定义 AI 的效果阈值、延迟预算、成本上限和安全红线，四项缺一不可。
- 失败场景：例如成本阈值被击穿，AI 请求被限流导致体验抖动；应切轻量模型并启用缓存回退。
- 替代方案与取舍：也可全规则化避免幻觉，但覆盖有限；当前采用“模型 + 规则校验 + 人工兜底”。

#### 关键细节（可追问）

- sqlEdits: { id, type: 'ADD'|'DELETE'|'UPDATE', startLine, endLine, newText }[]
- sessionId / requestId：用于撤销 / 反馈
- Monaco 的 deltaDecorations 给增加段加绿色背景、删除段加红色删除线

## task-dependency-dag-followup-2

title: 追问：以「任务调度 DAG 依赖图怎么前端展示和交互」为例，如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案
difficulty: 资深
tags: [可视化, DAG, 调度, 追问]
parent: task-dependency-dag
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「任务调度 DAG 依赖图怎么前端展示和交互」在当前约束下为什么成立。；回答结构可按「触发条件 -> 可视化 机制 -> 风险兜底」展开，并以「任务调度 DAG 依赖图怎么前端展示和交互」补一条失败场景。

### 题目

如果面试官追问：以「任务调度 DAG 依赖图怎么前端展示和交互」为例，如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案？

### 答案要点

#### 标准回答（直接作答）

- 结论：后端只返回当前节点 N 跳之内的子图（避免一次拉几万节点）
- 机制：节点 / 边都做 ID 唯一化，前端用 Map 索引；选 dagre / elk.js 做层次布局
- 落地动作：回答「以「任务调度 DAG 依赖图怎么前端展示和交互」为例，如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的答案必须覆盖空值、重复值、越界输入；漏掉任一边界都会让 任务调度 结论失真。
- 失败场景：例如忽略极端输入规模，任务调度 的复杂度会在高峰期失控，导致超时或 OOM；修复要改数据结构并做压测。
- 替代方案与取舍：可选更直观但复杂度更高的写法快速交付；当前在「以「任务调度 DAG 依赖图怎么前端展示和交互」为例，如果数据量、并发量或页面复杂度扩大一个数量级，你会如何调整方案」优先保证规模上限可控。

#### 关键细节（可追问）

- 后端只返回当前节点 N 跳之内的子图（避免一次拉几万节点）
- 节点 / 边都做 ID 唯一化，前端用 Map 索引
- 选 dagre / elk.js 做层次布局

## task-dependency-dag-followup-3

title: 追问：以「任务调度 DAG 依赖图怎么前端展示和交互」为例，为了让团队信服「任务调度 DAG 依赖图怎么前端展示和交互」正确，你会先补哪几类高价值校验与断言
difficulty: 资深
tags: [可视化, DAG, 调度, 追问]
parent: task-dependency-dag
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「任务调度 DAG 依赖图怎么前端展示和交互」落到真实交付，而不是停在概念层。；讲「任务调度 DAG 依赖图怎么前端展示和交互」时先给 可视化 的判断口径，再补执行动作和回退条件，会更像真实评审发言。。

### 题目

如果面试官追问：以「任务调度 DAG 依赖图怎么前端展示和交互」为例，为了让团队信服「任务调度 DAG 依赖图怎么前端展示和交互」正确，你会先补哪几类高价值校验与断言？

### 答案要点

#### 标准回答（直接作答）

- 结论：后端只返回当前节点 N 跳之内的子图（避免一次拉几万节点）
- 机制：节点 / 边都做 ID 唯一化，前端用 Map 索引；选 dagre / elk.js 做层次布局
- 落地动作：回答「以「任务调度 DAG 依赖图怎么前端展示和交互」为例，为了让团队信服「任务调度 DAG 依赖图怎么前端展示和交互」正确，你会先补哪几类高价值校验与断言」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的答案必须覆盖空值、重复值、越界输入；漏掉任一边界都会让 任务调度 结论失真。
- 失败场景：例如忽略极端输入规模，任务调度 的复杂度会在高峰期失控，导致超时或 OOM；修复要改数据结构并做压测。
- 替代方案与取舍：可选更直观但复杂度更高的写法快速交付；当前在「以「任务调度 DAG 依赖图怎么前端展示和交互」为例，为了让团队信服「任务调度 DAG 依赖图怎么前端展示和交互」正确，你会先补哪几类高价值校验与断言」优先保证规模上限可控。

#### 关键细节（可追问）

- 后端只返回当前节点 N 跳之内的子图（避免一次拉几万节点）
- 节点 / 边都做 ID 唯一化，前端用 Map 索引
- 选 dagre / elk.js 做层次布局

## multi-stage-deployment-followup-2

title: 追问：当团队成熟度不一致时，你会如何围绕 架构 定义「多国 / 多环境部署（CN / ID / SP / MX）怎么管理差异」的先后改造顺序
difficulty: 进阶
tags: [架构, 部署, i18n, 追问]
parent: multi-stage-deployment
generated: followup-script

### 一句话

推动「多国 / 多环境部署（CN / ID / SP / MX）怎么管理差异」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。。

### 题目

如果面试官追问：当团队成熟度不一致时，你会如何围绕 架构 定义「多国 / 多环境部署（CN / ID / SP / MX）怎么管理差异」的先后改造顺序？

### 答案要点

#### 标准回答（直接作答）

- 结论：Vite / Webpack define 把 **STAGE** 注入为字符串常量（'cn' / 'id' / ...）
- 机制：Tree shaking 后，if (**STAGE** === 'cn') 在非 CN 包里整段消失；每个 stage 一份 JSON：CDN 域名、API 域名、特性开关、权限点、合规字段
- 落地动作：回答「当团队成熟度不一致时，你会如何围绕 架构 定义「多国 / 多环境部署（CN / ID / SP / MX）怎么管理差异」的先后改造顺序」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「当团队成熟度不一致时，你会如何围绕 架构 定义「多国 / 多环境部署（CN / ID / SP / MX）怎么管理差异」的先后改造顺序」时要先定义 当团队成熟度不一致时 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，当团队成熟度不一致时 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 当团队成熟度不一致时 关键链路先收敛再替换。

#### 关键细节（可追问）

- Vite / Webpack define 把 **STAGE** 注入为字符串常量（'cn' / 'id' / ...）
- Tree shaking 后，if (**STAGE** === 'cn') 在非 CN 包里整段消失
- 每个 stage 一份 JSON：CDN 域名、API 域名、特性开关、权限点、合规字段

## multi-stage-deployment-followup-3

title: 追问：结合真实业务约束，半年后要做去留决策时，你会拿哪些数据判断「多国 / 多环境部署（CN / ID / SP / MX）怎么管理差异」还值不值得继续维护
difficulty: 进阶
tags: [架构, 部署, i18n, 追问]
parent: multi-stage-deployment
generated: followup-script

### 一句话

规模变大后先重新评估「多国 / 多环境部署（CN / ID / SP / MX）怎么管理差异」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。。

### 题目

如果面试官追问：结合真实业务约束，半年后要做去留决策时，你会拿哪些数据判断「多国 / 多环境部署（CN / ID / SP / MX）怎么管理差异」还值不值得继续维护？

### 答案要点

#### 标准回答（直接作答）

- 结论：Vite / Webpack define 把 **STAGE** 注入为字符串常量（'cn' / 'id' / ...）
- 机制：Tree shaking 后，if (**STAGE** === 'cn') 在非 CN 包里整段消失；每个 stage 一份 JSON：CDN 域名、API 域名、特性开关、权限点、合规字段
- 落地动作：回答「结合真实业务约束，半年后要做去留决策时，你会拿哪些数据判断「多国 / 多环境部署（CN / ID / SP / MX）怎么管理差异」还值不值得继续维护」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 半年后要做去留决策时 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 半年后要做去留决策时，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「结合真实业务约束，半年后要做去留决策时，你会拿哪些数据判断「多国 / 多环境部署（CN / ID / SP / MX）怎么管理差异」还值不值得继续维护」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- Vite / Webpack define 把 **STAGE** 注入为字符串常量（'cn' / 'id' / ...）
- Tree shaking 后，if (**STAGE** === 'cn') 在非 CN 包里整段消失
- 每个 stage 一份 JSON：CDN 域名、API 域名、特性开关、权限点、合规字段

## permission-matrix-frontend-followup-2

title: 追问：从工程落地角度看，要证明「复杂权限体系（数据 + 操作）前端怎么做」防护可信，你会如何结合攻击样例、审计日志和告警阈值
difficulty: 资深
tags: [权限, 架构, 高频, 追问]
parent: permission-matrix-frontend
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「复杂权限体系（数据 + 操作）前端怎么做」不是只在理想输入下成立。。

### 题目

如果面试官追问：从工程落地角度看，要证明「复杂权限体系（数据 + 操作）前端怎么做」防护可信，你会如何结合攻击样例、审计日志和告警阈值？

### 答案要点

#### 标准回答（直接作答）

- 结论：前端只做"看见 / 不可点"，关键操作的最终鉴权永远在后端
- 机制：权限不是布尔值，是字符串集合（['metric:create', 'datasource:read']）；数据权限（行级 / 列级）通常由后端在数据返回时已过滤
- 落地动作：回答「从工程落地角度看，要证明「复杂权限体系（数据 + 操作）前端怎么做」防护可信，你会如何结合攻击样例、审计日志和告警阈值」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 从工程落地角度看 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，从工程落地角度看 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「从工程落地角度看，要证明「复杂权限体系（数据 + 操作）前端怎么做」防护可信，你会如何结合攻击样例、审计日志和告警阈值」风险不足；当前优先服务端强校验，因为可审计、可回滚。

#### 关键细节（可追问）

- 前端只做"看见 / 不可点"，关键操作的最终鉴权永远在后端
- 权限不是布尔值，是字符串集合（['metric:create', 'datasource:read']）
- 数据权限（行级 / 列级）通常由后端在数据返回时已过滤

## permission-matrix-frontend-followup-3

title: 追问：在「复杂权限体系前端怎么做」场景下，面对「复杂权限体系前端怎么做」的多目标冲突，你会如何给团队讲清取舍依据和回退预案
difficulty: 资深
tags: [权限, 架构, 高频, 追问]
parent: permission-matrix-frontend
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「复杂权限体系前端怎么做」时要能同时解释收益、代价和失败信号。；讲「复杂权限体系前端怎么做」时先给 权限 的判断口径，再补执行动作和回退条件，会更像真实评审发言。；如果涉及「复杂权限体系前端怎么做」的技术细节。

### 题目

如果面试官追问：在「复杂权限体系前端怎么做」场景下，面对「复杂权限体系前端怎么做」的多目标冲突，你会如何给团队讲清取舍依据和回退预案？

### 答案要点

#### 标准回答（直接作答）

- 结论：前端只做"看见 / 不可点"，关键操作的最终鉴权永远在后端
- 机制：权限不是布尔值，是字符串集合（['metric:create', 'datasource:read']）；数据权限（行级 / 列级）通常由后端在数据返回时已过滤
- 落地动作：回答「在「复杂权限体系前端怎么做」场景下，面对「复杂权限体系前端怎么做」的多目标冲突，你会如何给团队讲清取舍依据和回退预案」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「复杂权限体系前端怎么做」场景下，面对「复杂权限体系前端怎么做」的多目标冲突，你会如何给团队讲清取舍依据和回退预案」时要先确认 复杂权限体系前端怎么 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，复杂权限体系前端怎么 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 复杂权限体系前端怎么 链路分层收口再逐步统一。

#### 关键细节（可追问）

- 前端只做"看见 / 不可点"，关键操作的最终鉴权永远在后端
- 权限不是布尔值，是字符串集合（['metric:create', 'datasource:read']）
- 数据权限（行级 / 列级）通常由后端在数据返回时已过滤

## big-table-virtualization-followup-2

title: 追问：以「数据平台几十万行结果集表格怎么不卡」为例，围绕「数据平台几十万行结果集表格怎么不卡」上线效果，你会优先看哪些和 虚拟列表 相关的真实用户指标来佐证体验提升
difficulty: 资深
tags: [虚拟列表, 表格, 性能, 高频, 追问]
parent: big-table-virtualization
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「数据平台几十万行结果集表格怎么不卡」不是只在理想输入下成立。；再补可观测指标：围绕「数据平台几十万行结果集表格怎么不卡」的性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。。

### 题目

如果面试官追问：以「数据平台几十万行结果集表格怎么不卡」为例，围绕「数据平台几十万行结果集表格怎么不卡」上线效果，你会优先看哪些和 虚拟列表 相关的真实用户指标来佐证体验提升？

### 答案要点

#### 标准回答（直接作答）

- 结论：vxe-table 4.x：性能好，复杂功能（编辑、树表、导出）齐全
- 机制：ag-grid：商业级，pivot / aggregation 强大，社区版够用；TanStack Table（前 react-table）：headless，自己控制渲染
- 落地动作：回答「以「数据平台几十万行结果集表格怎么不卡」为例，围绕「数据平台几十万行结果集表格怎么不卡」上线效果，你会优先看哪些和 虚拟列表 相关的真实用户指标来佐证体验提升」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「以「数据平台几十万行结果集表格怎么不卡」为例，围绕「数据平台几十万行结果集表格怎么不卡」上线效果，你会优先看哪些和 虚拟列表 相关的真实用户指标来佐证体验提升」必须先给 数据平台几十万行结果 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，数据平台几十万行结果 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 数据平台几十万行结果 的计算与缓存路径。

#### 关键细节（可追问）

- vxe-table 4.x：性能好，复杂功能（编辑、树表、导出）齐全
- ag-grid：商业级，pivot / aggregation 强大，社区版够用
- TanStack Table（前 react-table）：headless，自己控制渲染

## big-table-virtualization-followup-3

title: 追问：结合真实业务约束，如果「数据平台几十万行结果集表格怎么不卡」在 虚拟列表 上的收益和维护成本打架，你会怎么做取舍判断
difficulty: 资深
tags: [虚拟列表, 表格, 性能, 高频, 追问]
parent: big-table-virtualization
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「数据平台几十万行结果集表格怎么不卡」时要能同时解释收益、代价和失败信号。；回答顺序可用「现状问题 -> 虚拟列表 方案动作 -> 验证结果」，并用「数据平台几十万行结果集表格怎么不卡」举一条主链路说明。。

### 题目

如果面试官追问：结合真实业务约束，如果「数据平台几十万行结果集表格怎么不卡」在 虚拟列表 上的收益和维护成本打架，你会怎么做取舍判断？

### 答案要点

#### 标准回答（直接作答）

- 结论：vxe-table 4.x：性能好，复杂功能（编辑、树表、导出）齐全
- 机制：ag-grid：商业级，pivot / aggregation 强大，社区版够用；TanStack Table（前 react-table）：headless，自己控制渲染
- 落地动作：回答「结合真实业务约束，如果「数据平台几十万行结果集表格怎么不卡」在 虚拟列表 上的收益和维护成本打架，你会怎么做取舍判断」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，如果「数据平台几十万行结果集表格怎么不卡」在 虚拟列表 上的收益和维护成本打架，你会怎么做取舍判断」必须先给 数据平台几十万行结果 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，数据平台几十万行结果 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 数据平台几十万行结果 的计算与缓存路径。

#### 关键细节（可追问）

- vxe-table 4.x：性能好，复杂功能（编辑、树表、导出）齐全
- ag-grid：商业级，pivot / aggregation 强大，社区版够用
- TanStack Table（前 react-table）：headless，自己控制渲染

## g2-charts-perf-followup-2

title: 追问：你会怎样验证「数据看板几十个图表同时渲染怎么不卡」在 图表 维度上的优化收益在真实设备和真实网络下也成立
difficulty: 进阶
tags: [图表, 看板, 性能, 追问]
parent: g2-charts-perf
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「数据看板几十个图表同时渲染怎么不卡」时要能同时解释收益、代价和失败信号。；讲「数据看板几十个图表同时渲染怎么不卡」时先给 图表 的判断口径，再补执行动作和回退条件，会更像真实评审发言。。

### 题目

如果面试官追问：你会怎样验证「数据看板几十个图表同时渲染怎么不卡」在 图表 维度上的优化收益在真实设备和真实网络下也成立？

### 答案要点

#### 标准回答（直接作答）

- 结论：后端预聚合（按天 / 按小时分桶），前端拿到几十几百行
- 机制：千万级数据走 OLAP（ClickHouse / Druid）；大图表数据按需加载（点击展开才请求）
- 落地动作：回答「你会怎样验证「数据看板几十个图表同时渲染怎么不卡」在 图表 维度上的优化收益在真实设备和真实网络下也成立」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：只有在 你会怎样验证 的瓶颈被数据证实、回归方案准备完成时，答案里的优化建议才可直接执行。
- 失败场景：例如主线程在首屏阶段执行重计算，你会怎样验证 指标会从可接受直接退化到用户可感知卡顿；修复要拆分任务并回归验证。
- 替代方案与取舍：可选一次性大重构追求极致性能，但交付风险高；当前对「你会怎样验证「数据看板几十个图表同时渲染怎么不卡」在 图表 维度上的优化收益在真实设备和真实网络下也成立」采用小步优化更稳。

#### 关键细节（可追问）

- 后端预聚合（按天 / 按小时分桶），前端拿到几十几百行
- 千万级数据走 OLAP（ClickHouse / Druid）
- 大图表数据按需加载（点击展开才请求）

## g2-charts-perf-followup-3

title: 追问：如果「数据看板（Dashboard）几十个图表同时渲染怎么不卡」在 图表 相关优化中让代码复杂度上升，你会如何判断继续推进还是止损
difficulty: 进阶
tags: [图表, 看板, 性能, 追问]
parent: g2-charts-perf
generated: followup-script

### 一句话

推动「数据看板（Dashboard）几十个图表同时渲染怎么不卡」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；「数据看板（Dashboard）几十个图表同时渲染怎么不卡」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。。

### 题目

如果面试官追问：如果「数据看板（Dashboard）几十个图表同时渲染怎么不卡」在 图表 相关优化中让代码复杂度上升，你会如何判断继续推进还是止损？

### 答案要点

#### 标准回答（直接作答）

- 结论：后端预聚合（按天 / 按小时分桶），前端拿到几十几百行
- 机制：千万级数据走 OLAP（ClickHouse / Druid）；大图表数据按需加载（点击展开才请求）
- 落地动作：回答「如果「数据看板（Dashboard）几十个图表同时渲染怎么不卡」在 图表 相关优化中让代码复杂度上升，你会如何判断继续推进还是止损」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「如果「数据看板（Dashboard）几十个图表同时渲染怎么不卡」在 图表 相关优化中让代码复杂度上升，你会如何判断继续推进还是止损」必须先给 数据看板 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，数据看板 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 数据看板 的计算与缓存路径。

#### 关键细节（可追问）

- 后端预聚合（按天 / 按小时分桶），前端拿到几十几百行
- 千万级数据走 OLAP（ClickHouse / Druid）
- 大图表数据按需加载（点击展开才请求）

## release-rollback-frontend-followup-2

title: 追问：在当前团队与业务约束下，老系统包袱重、牵一发而动全身时，你会怎么围绕 发布链路 安排「前端版本灰度 + 回滚怎么做」的渐进改造路线
difficulty: 进阶
tags: [发布, 灰度, 工程化, 追问]
parent: release-rollback-frontend
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「前端版本灰度 + 回滚怎么做」时要能同时解释收益、代价和失败信号。；讲「前端版本灰度 + 回滚怎么做」时先给 发布链路 的判断口径，再补执行动作和回退条件，会更像真实评审发言。。

### 题目

如果面试官追问：在当前团队与业务约束下，老系统包袱重、牵一发而动全身时，你会怎么围绕 发布链路 安排「前端版本灰度 + 回滚怎么做」的渐进改造路线？

### 答案要点

#### 标准回答（直接作答）

- 结论：每个版本独立目录：/static/v1.2.3/index.js, vendor.js
- 机制：HTML 引用具体版本目录的资源；老版本资源至少保留 7 天（防 SW 缓存的用户加载老 HTML）
- 落地动作：回答「在当前团队与业务约束下，老系统包袱重、牵一发而动全身时，你会怎么围绕 发布链路 安排「前端版本灰度 + 回滚怎么做」的渐进改造路线」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 老系统包袱重 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 老系统包袱重，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「在当前团队与业务约束下，老系统包袱重、牵一发而动全身时，你会怎么围绕 发布链路 安排「前端版本灰度 + 回滚怎么做」的渐进改造路线」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 每个版本独立目录：/static/v1.2.3/index.js, vendor.js
- HTML 引用具体版本目录的资源
- 老版本资源至少保留 7 天（防 SW 缓存的用户加载老 HTML）

## release-rollback-frontend-followup-3

title: 追问：在当前团队与业务约束下，为了确认「前端版本灰度 + 回滚怎么做」在 发布 上能持续跑稳，你会长期追哪些稳定性和效率信号
difficulty: 进阶
tags: [发布, 灰度, 工程化, 追问]
parent: release-rollback-frontend
generated: followup-script

### 一句话

推动「前端版本灰度 + 回滚怎么做」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；「前端版本灰度 + 回滚怎么做」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写。

### 题目

如果面试官追问：在当前团队与业务约束下，为了确认「前端版本灰度 + 回滚怎么做」在 发布 上能持续跑稳，你会长期追哪些稳定性和效率信号？

### 答案要点

#### 标准回答（直接作答）

- 结论：每个版本独立目录：/static/v1.2.3/index.js, vendor.js
- 机制：HTML 引用具体版本目录的资源；老版本资源至少保留 7 天（防 SW 缓存的用户加载老 HTML）
- 落地动作：回答「在当前团队与业务约束下，为了确认「前端版本灰度 + 回滚怎么做」在 发布 上能持续跑稳，你会长期追哪些稳定性和效率信号」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 为了确认 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 为了确认，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「在当前团队与业务约束下，为了确认「前端版本灰度 + 回滚怎么做」在 发布 上能持续跑稳，你会长期追哪些稳定性和效率信号」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 每个版本独立目录：/static/v1.2.3/index.js, vendor.js
- HTML 引用具体版本目录的资源
- 老版本资源至少保留 7 天（防 SW 缓存的用户加载老 HTML）

## interview-system-design-bigreport-followup-2

title: 追问：从工程落地角度看，团队里有人熟有人新时，你会怎么围绕 系统设计 把「系统设计题：从 0 设计一个数据平台前端，你怎么拆」拆成几段推进，确保每段都能独立验收
difficulty: 资深
tags: [系统设计, 架构, 高频, 追问]
parent: interview-system-design-bigreport
generated: followup-script

### 一句话

推动「系统设计题：从 0 设计一个数据平台前端，你怎么拆」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；「系统设计题：从 0 设计一个数据平台前端，你怎么拆」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。。

### 题目

如果面试官追问：从工程落地角度看，团队里有人熟有人新时，你会怎么围绕 系统设计 把「系统设计题：从 0 设计一个数据平台前端，你怎么拆」拆成几段推进，确保每段都能独立验收？

### 答案要点

#### 标准回答（直接作答）

- 结论：用户角色：分析师 / 开发 / 数仓 / 业务方 / 管理员
- 机制：关键场景：日常查数、临时分析、项目化开发、运维排查；性能 SLA：首屏 < 1.5s，操作响应 < 200ms
- 落地动作：回答「从工程落地角度看，团队里有人熟有人新时，你会怎么围绕 系统设计 把「系统设计题：从 0 设计一个数据平台前端，你怎么拆」拆成几段推进，确保每段都能独立验收」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「从工程落地角度看，团队里有人熟有人新时，你会怎么围绕 系统设计 把「系统设计题：从 0 设计一个数据平台前端，你怎么拆」拆成几段推进，确保每段都能独立验收」时要先定义 从工程落地角度看 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，从工程落地角度看 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 从工程落地角度看 关键链路先收敛再替换。

#### 关键细节（可追问）

- 用户角色：分析师 / 开发 / 数仓 / 业务方 / 管理员
- 关键场景：日常查数、临时分析、项目化开发、运维排查
- 性能 SLA：首屏 < 1.5s，操作响应 < 200ms

## interview-system-design-bigreport-followup-3

title: 追问：从工程落地角度看，你会怎样定义「系统设计题：从 0 设计一个数据平台前端，你怎么拆」的长期健康度，并通过指标持续校准
difficulty: 资深
tags: [系统设计, 架构, 高频, 追问]
parent: interview-system-design-bigreport
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「系统设计题：从 0 设计一个数据平台前端，你怎么拆」在当前约束下为什么成立。；建议按「输入约束 -> 系统设计 执行链路 -> 结果验证」展开，并结合「系统设计题：从 0 设计一个数据平台前端。

### 题目

如果面试官追问：从工程落地角度看，你会怎样定义「系统设计题：从 0 设计一个数据平台前端，你怎么拆」的长期健康度，并通过指标持续校准？

### 答案要点

#### 标准回答（直接作答）

- 结论：用户角色：分析师 / 开发 / 数仓 / 业务方 / 管理员
- 机制：关键场景：日常查数、临时分析、项目化开发、运维排查；性能 SLA：首屏 < 1.5s，操作响应 < 200ms
- 落地动作：回答「从工程落地角度看，你会怎样定义「系统设计题：从 0 设计一个数据平台前端，你怎么拆」的长期健康度，并通过指标持续校准」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 从工程落地角度看 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 从工程落地角度看，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「从工程落地角度看，你会怎样定义「系统设计题：从 0 设计一个数据平台前端，你怎么拆」的长期健康度，并通过指标持续校准」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 用户角色：分析师 / 开发 / 数仓 / 业务方 / 管理员
- 关键场景：日常查数、临时分析、项目化开发、运维排查
- 性能 SLA：首屏 < 1.5s，操作响应 < 200ms

## indexeddb-pane-persistence-followup-2

title: 追问：在当前团队与业务约束下，你会如何围绕 IndexedDB 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖
difficulty: 资深
tags: [IndexedDB, 持久化, 状态, 追问]
parent: indexeddb-pane-persistence
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「多 Tab 编辑器状态怎么持久化」时要能同时解释收益、代价和失败信号。；回答顺序可用「现状问题 -> IndexedDB 方案动作 -> 验证结果」，并用「多 Tab 编辑器状态怎么持久化」举一条主链路说明。。

### 题目

如果面试官追问：在当前团队与业务约束下，你会如何围绕 IndexedDB 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖？

### 答案要点

#### 标准回答（直接作答）

- 结论：为什么不用 localStorage
- 机制：大小限制（5MB），结果集随便几万行就爆；同步 API，写入大对象会阻塞主线程
- 落地动作：回答「在当前团队与业务约束下，你会如何围绕 IndexedDB 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在当前团队与业务约束下，你会如何围绕 IndexedDB 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖」时要把 你会如何围绕 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，你会如何围绕 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「在当前团队与业务约束下，你会如何围绕 IndexedDB 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖」里当前按阶段替换更稳。

#### 关键细节（可追问）

- 为什么不用 localStorage
- 大小限制（5MB），结果集随便几万行就爆
- 同步 API，写入大对象会阻塞主线程

## indexeddb-pane-persistence-followup-3

title: 追问：结合真实业务约束，面对规模与资源变化并存时，你会如何围绕 IndexedDB 调整「多 Tab 编辑器状态怎么持久化（投影模式）」的推进顺序
difficulty: 资深
tags: [IndexedDB, 持久化, 状态, 追问]
parent: indexeddb-pane-persistence
generated: followup-script

### 一句话

规模变大后先重新评估「多 Tab 编辑器状态怎么持久化（投影模式）」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「多 Tab 编辑器状态怎么持久化（投影模式）」对应的核心机制收益被复杂度抵消。

### 题目

如果面试官追问：结合真实业务约束，面对规模与资源变化并存时，你会如何围绕 IndexedDB 调整「多 Tab 编辑器状态怎么持久化（投影模式）」的推进顺序？

### 答案要点

#### 标准回答（直接作答）

- 结论：为什么不用 localStorage
- 机制：大小限制（5MB），结果集随便几万行就爆；同步 API，写入大对象会阻塞主线程
- 落地动作：回答「结合真实业务约束，面对规模与资源变化并存时，你会如何围绕 IndexedDB 调整「多 Tab 编辑器状态怎么持久化（投影模式）」的推进顺序」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，面对规模与资源变化并存时，你会如何围绕 IndexedDB 调整「多 Tab 编辑器状态怎么持久化（投影模式）」的推进顺序」时要把 面对规模与资源变化并 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，面对规模与资源变化并 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「结合真实业务约束，面对规模与资源变化并存时，你会如何围绕 IndexedDB 调整「多 Tab 编辑器状态怎么持久化（投影模式）」的推进顺序」里当前按阶段替换更稳。

#### 关键细节（可追问）

- 为什么不用 localStorage
- 大小限制（5MB），结果集随便几万行就爆
- 同步 API，写入大对象会阻塞主线程

## upload-large-file-followup-2

title: 追问：在当前团队与业务约束下，为了证明这个方案在 上传 维度有效，你会怎么设计测试闭环和线上观测指标
difficulty: 进阶
tags: [上传, 分片, 高频, 追问]
parent: upload-large-file
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「大文件分片上传怎么实现」在当前约束下为什么成立。；围绕「大文件分片上传怎么实现」组织答案时，建议按「约束来源 -> 上传 关键决策 -> 验证闭环」展开。；不要只罗列工具名或 API。

### 题目

如果面试官追问：在当前团队与业务约束下，为了证明这个方案在 上传 维度有效，你会怎么设计测试闭环和线上观测指标？

### 答案要点

#### 标准回答（直接作答）

- 结论：前端选文件后用 Web Worker 计算 hash（spark-md5）
- 机制：调 /upload/check 问后端：这个 hash 是否已上传过；已上传：秒传成功（无需上传任何分片）
- 落地动作：回答「在当前团队与业务约束下，为了证明这个方案在 上传 维度有效，你会怎么设计测试闭环和线上观测指标」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在当前团队与业务约束下，为了证明这个方案在 上传 维度有效，你会怎么设计测试闭环和线上观测指标」要明确 为了证明这个方案在 的边界用例、回归用例和验收指标；只给 happy path 不算标准答案。
- 失败场景：例如测试强绑实现细节，重构后误报激增，团队忽略告警；要改为行为断言并分层执行测试。
- 替代方案与取舍：也可只保留冒烟测试提速，但回归信心不足；当前优先覆盖 为了证明这个方案在 的高风险边界。

#### 关键细节（可追问）

- 前端选文件后用 Web Worker 计算 hash（spark-md5）
- 调 /upload/check 问后端：这个 hash 是否已上传过
- 已上传：秒传成功（无需上传任何分片）

## upload-large-file-followup-3

title: 追问：如果目标不变但约束更严，你会如何围绕 上传 调整「大文件分片上传怎么实现」方案的边界和节奏
difficulty: 进阶
tags: [上传, 分片, 高频, 追问]
parent: upload-large-file
generated: followup-script

### 一句话

规模变大后先重新评估「大文件分片上传怎么实现」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果「大文件分片上传怎么实现」对应的核心机制收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。。

### 题目

如果面试官追问：如果目标不变但约束更严，你会如何围绕 上传 调整「大文件分片上传怎么实现」方案的边界和节奏？

### 答案要点

#### 标准回答（直接作答）

- 结论：前端选文件后用 Web Worker 计算 hash（spark-md5）
- 机制：调 /upload/check 问后端：这个 hash 是否已上传过；已上传：秒传成功（无需上传任何分片）
- 落地动作：回答「如果目标不变但约束更严，你会如何围绕 上传 调整「大文件分片上传怎么实现」方案的边界和节奏」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题要先说清 你会如何围绕 的函数签名、时序语义和资源释放策略；如果这些口径不统一，代码再长也不是标准答案。
- 失败场景：例如 你会如何围绕 实现里定时器或订阅未正确释放，连续操作后会出现重复执行或内存泄漏；修复要补清理逻辑和回归用例。
- 替代方案与取舍：可直接引入成熟库快速上线，但在「如果目标不变但约束更严，你会如何围绕 上传 调整「大文件分片上传怎么实现」方案的边界和节奏」这题里仍要讲清底层语义；当前保留手写版本便于解释边界与调试。

#### 关键细节（可追问）

- 前端选文件后用 Web Worker 计算 hash（spark-md5）
- 调 /upload/check 问后端：这个 hash 是否已上传过
- 已上传：秒传成功（无需上传任何分片）

## sql-cost-guardrail-frontend

title: SQL 成本护栏：前端如何做查询预算、限流与止损提示
difficulty: 资深
tags: [SQL, 成本治理, 守护]
followups: [sql-cost-guardrail-frontend-followup-1, sql-cost-guardrail-frontend-followup-2, sql-cost-guardrail-frontend-followup-3]

### 一句话

数据平台大故障常由“高成本查询误触发”引起：前端在提交前给出成本预估、风险提示和执行护栏，能显著降低对计算资源和核心链路的冲击。

### 题目

你会如何在 SQL 工作台前端实现“查询成本护栏”，既不影响高级用户效率，又能避免高风险误操作？

### 答案要点

- 提交前做成本预估：结合表规模、分区条件、选择列数、历史执行统计给出风险等级。
- 分级策略清晰：低风险直跑，中风险二次确认，高风险需要审批或异步队列执行。
- 对关键资源设预算：单次扫描行数、执行时长、并发会话数设置阈值并可按租户定制。
- 前端提示要可执行：不仅报“危险”，还应给优化建议（加分区过滤、加 LIMIT、减少 JOIN）。
- 超预算止损策略：支持用户主动取消、自动超时、资源熔断后的兜底提示。
- 线上复盘闭环：跟踪高风险查询命中率、取消率、超时率和误伤率持续调参。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 SQL 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 SQL，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「SQL 成本护栏：前端如何做查询预算、限流与止损提示」按阶段灰度，每阶段可验收可撤回。

### 代码示例

```ts
type CostLevel = 'low' | 'medium' | 'high';

function estimateCost(input: {
  hasPartitionFilter: boolean;
  hasLimit: boolean;
  joinCount: number;
}): CostLevel {
  let score = 0;
  if (!input.hasPartitionFilter) score += 3;
  if (!input.hasLimit) score += 2;
  if (input.joinCount >= 3) score += 2;
  if (score >= 5) return 'high';
  if (score >= 3) return 'medium';
  return 'low';
}
```

```ts
function canSubmit(level: CostLevel, approved: boolean) {
  if (level === 'high' && !approved) return false;
  return true;
}
```

### 追问

- 「SQL 成本护栏：前端如何做查询预算、限流与止损提示」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只做静态规则，不结合历史执行数据，误报和漏报都偏高。
- 只拦截不指导，用户不知道如何改写 SQL 仍会重复触发风险。
- 护栏策略全局统一，忽略租户和业务优先级差异。

### 延伸

- 可将成本护栏与 AI SQL Copilot 联动，自动给出低成本改写建议。
- 对夜间离峰任务可配置差异化阈值，提高资源利用率。

## metric-definition-versioning

title: 指标口径版本治理：定义演进、兼容查询与回溯审计
difficulty: 资深
tags: [指标治理, 版本化, 审计]
followups: [metric-definition-versioning-followup-1, metric-definition-versioning-followup-2, metric-definition-versioning-followup-3]

### 一句话

数据平台“数字对不上”常不是算错，而是口径在悄悄变化：通过指标定义版本化与审计链路，可以让口径变更可追溯、可回退、可解释。

### 题目

当业务频繁调整指标定义（口径、过滤条件、维度）时，你会如何设计前端与平台协同机制，避免同名指标前后语义混乱？

### 答案要点

- 指标定义要版本化：同名指标变更口径时产生新版本，旧版本保留可查询能力。
- 查询界面显示“版本上下文”：看板与导出都标注指标版本、生效时间和定义摘要。
- 变更必须带兼容策略：新增维度可选、语义变更需迁移提示，重大变更支持双轨对比期。
- 审计链路完整：记录谁在何时修改了什么、影响了哪些看板和告警。
- 回滚机制可执行：口径变更上线后若异常，可快速切回上一稳定版本。
- 指标质量治理常态化：跟踪口径冲突率、回滚率、下游告警误触发率持续优化流程。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「指标口径版本治理：定义演进、兼容查询与回溯审计」时要先定义 指标口径版本治理 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，指标口径版本治理 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 指标口径版本治理 关键链路先收敛再替换。

### 代码示例

```ts
type MetricVersion = {
  metricId: string;
  version: string;
  effectiveAt: string;
  definitionHash: string;
};

function pickMetricVersion(versions: MetricVersion[], at: Date) {
  return versions
    .filter((v) => new Date(v.effectiveAt) <= at)
    .sort((a, b) => b.effectiveAt.localeCompare(a.effectiveAt))[0];
}
```

```ts
function showMetricBadge(v: MetricVersion) {
  return `${v.metricId}@${v.version}`;
}
```

### 追问

- 「指标口径版本治理：定义演进、兼容查询与回溯审计」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 指标定义只在文档更新，不和查询结果绑定版本上下文。
- 口径变更直接覆盖旧定义，导致历史报表无法复盘。
- 有版本号但无审计细节，出问题时无法追责和复现。

### 延伸

- 指标版本可与告警规则绑定，避免“口径变了告警没变”。
- 关键指标建议保留自动对比看板，持续观察新旧口径偏移。

## sql-cost-guardrail-frontend-followup-1

title: 追问：从工程落地角度看，当「SQL 成本护栏：前端如何做查询预算、限流与止损提示」进入复杂业务场景时，你会先确认哪些边界条件是否可控
difficulty: 资深
tags: [SQL, 成本治理, 守护, 追问]
parent: sql-cost-guardrail-frontend
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「SQL 成本护栏：前端如何做查询预算、限流与止损提示」在当前约束下为什么成立。；围绕「SQL 成本护栏：前端如何做查询预算、限流与止损提示」组织答案时。

### 题目

如果面试官追问：从工程落地角度看，当「SQL 成本护栏：前端如何做查询预算、限流与止损提示」进入复杂业务场景时，你会先确认哪些边界条件是否可控？

### 答案要点

#### 标准回答（直接作答）

- 结论：提交前做成本预估：结合表规模、分区条件、选择列数、历史执行统计给出风险等级
- 机制：分级策略清晰：低风险直跑，中风险二次确认，高风险需要审批或异步队列执行；对关键资源设预算：单次扫描行数、执行时长、并发会话数设置阈值并可按租户定制
- 落地动作：回答「从工程落地角度看，当「SQL 成本护栏：前端如何做查询预算、限流与止损提示」进入复杂业务场景时，你会先确认哪些边界条件是否可控」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 从工程落地角度看 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 从工程落地角度看，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「从工程落地角度看，当「SQL 成本护栏：前端如何做查询预算、限流与止损提示」进入复杂业务场景时，你会先确认哪些边界条件是否可控」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 提交前做成本预估：结合表规模、分区条件、选择列数、历史执行统计给出风险等级
- 分级策略清晰：低风险直跑，中风险二次确认，高风险需要审批或异步队列执行
- 对关键资源设预算：单次扫描行数、执行时长、并发会话数设置阈值并可按租户定制

## sql-cost-guardrail-frontend-followup-2

title: 追问：在「SQL 成本护栏：前端如何做查询预算、限流与止损提示」场景下，老系统包袱重、牵一发而动全身时，你会怎么围绕 SQL 安排「SQL 成本护栏：前端如何做查询预算、限流与止损提示」的渐进改造路线
difficulty: 资深
tags: [SQL, 成本治理, 守护, 追问]
parent: sql-cost-guardrail-frontend
generated: followup-script

### 一句话

先把「SQL 成本护栏：前端如何做查询预算、限流与止损提示」链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。；弱网、重试和超时会放大「SQL 成本护栏：前端如何做查询预算、限流与止损提示」里的边界问题。

### 题目

如果面试官追问：在「SQL 成本护栏：前端如何做查询预算、限流与止损提示」场景下，老系统包袱重、牵一发而动全身时，你会怎么围绕 SQL 安排「SQL 成本护栏：前端如何做查询预算、限流与止损提示」的渐进改造路线？

### 答案要点

#### 标准回答（直接作答）

- 结论：提交前做成本预估：结合表规模、分区条件、选择列数、历史执行统计给出风险等级
- 机制：分级策略清晰：低风险直跑，中风险二次确认，高风险需要审批或异步队列执行；对关键资源设预算：单次扫描行数、执行时长、并发会话数设置阈值并可按租户定制
- 落地动作：回答「在「SQL 成本护栏：前端如何做查询预算、限流与止损提示」场景下，老系统包袱重、牵一发而动全身时，你会怎么围绕 SQL 安排「SQL 成本护栏：前端如何做查询预算、限流与止损提示」的渐进改造路线」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「SQL 成本护栏：前端如何做查询预算、限流与止损提示」场景下，老系统包袱重、牵一发而动全身时，你会怎么围绕 SQL 安排「SQL 成本护栏：前端如何做查询预算、限流与止损提示」的渐进改造路线」时要先定义 SQL 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，SQL 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 SQL 关键链路先收敛再替换。

#### 关键细节（可追问）

- 提交前做成本预估：结合表规模、分区条件、选择列数、历史执行统计给出风险等级
- 分级策略清晰：低风险直跑，中风险二次确认，高风险需要审批或异步队列执行
- 对关键资源设预算：单次扫描行数、执行时长、并发会话数设置阈值并可按租户定制

## sql-cost-guardrail-frontend-followup-3

title: 追问：在当前团队与业务约束下，要判断「SQL 成本护栏：前端如何做查询预算、限流与止损提示」值不值得长期维护，你会先盯哪些和 SQL 相关的核心指标
difficulty: 资深
tags: [SQL, 成本治理, 守护, 追问]
parent: sql-cost-guardrail-frontend
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「SQL 成本护栏：前端如何做查询预算、限流与止损提示」不是只在理想输入下成立。。

### 题目

如果面试官追问：在当前团队与业务约束下，要判断「SQL 成本护栏：前端如何做查询预算、限流与止损提示」值不值得长期维护，你会先盯哪些和 SQL 相关的核心指标？

### 答案要点

#### 标准回答（直接作答）

- 结论：提交前做成本预估：结合表规模、分区条件、选择列数、历史执行统计给出风险等级
- 机制：分级策略清晰：低风险直跑，中风险二次确认，高风险需要审批或异步队列执行；对关键资源设预算：单次扫描行数、执行时长、并发会话数设置阈值并可按租户定制
- 落地动作：回答「在当前团队与业务约束下，要判断「SQL 成本护栏：前端如何做查询预算、限流与止损提示」值不值得长期维护，你会先盯哪些和 SQL 相关的核心指标」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 要判断 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 要判断，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「在当前团队与业务约束下，要判断「SQL 成本护栏：前端如何做查询预算、限流与止损提示」值不值得长期维护，你会先盯哪些和 SQL 相关的核心指标」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 提交前做成本预估：结合表规模、分区条件、选择列数、历史执行统计给出风险等级
- 分级策略清晰：低风险直跑，中风险二次确认，高风险需要审批或异步队列执行
- 对关键资源设预算：单次扫描行数、执行时长、并发会话数设置阈值并可按租户定制

## metric-definition-versioning-followup-1

title: 追问：真要把「指标口径版本治理：定义演进、兼容查询与回溯审计」推到线上，你会如何围绕 指标治理 设计灰度节奏、回滚条件和迁移路径
difficulty: 资深
tags: [指标治理, 版本化, 审计, 追问]
parent: metric-definition-versioning
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「指标口径版本治理：定义演进、兼容查询与回溯审计」不是只在理想输入下成立。。

### 题目

如果面试官追问：真要把「指标口径版本治理：定义演进、兼容查询与回溯审计」推到线上，你会如何围绕 指标治理 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：指标定义要版本化：同名指标变更口径时产生新版本，旧版本保留可查询能力
- 机制：查询界面显示“版本上下文”：看板与导出都标注指标版本、生效时间和定义摘要；变更必须带兼容策略：新增维度可选、语义变更需迁移提示，重大变更支持双轨对比期
- 落地动作：回答「真要把「指标口径版本治理：定义演进、兼容查询与回溯审计」推到线上，你会如何围绕 指标治理 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 真要把 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 真要把，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「真要把「指标口径版本治理：定义演进、兼容查询与回溯审计」推到线上，你会如何围绕 指标治理 设计灰度节奏、回滚条件和迁移路径」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 指标定义要版本化：同名指标变更口径时产生新版本，旧版本保留可查询能力
- 查询界面显示“版本上下文”：看板与导出都标注指标版本、生效时间和定义摘要
- 变更必须带兼容策略：新增维度可选、语义变更需迁移提示，重大变更支持双轨对比期

## metric-definition-versioning-followup-2

title: 追问：以「指标口径版本治理：定义演进、兼容查询与回溯审计」为例，你会如何围绕 指标治理 定义“方案生效”的判据，并通过测试与观测数据持续验证
difficulty: 资深
tags: [指标治理, 版本化, 审计, 追问]
parent: metric-definition-versioning
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「指标口径版本治理：定义演进、兼容查询与回溯审计」讲成只在理想输入下可用。；回答结构可按「触发条件 -> 指标治理 机制 -> 风险兜底」展开。

### 题目

如果面试官追问：以「指标口径版本治理：定义演进、兼容查询与回溯审计」为例，你会如何围绕 指标治理 定义“方案生效”的判据，并通过测试与观测数据持续验证？

### 答案要点

#### 标准回答（直接作答）

- 结论：指标定义要版本化：同名指标变更口径时产生新版本，旧版本保留可查询能力
- 机制：查询界面显示“版本上下文”：看板与导出都标注指标版本、生效时间和定义摘要；变更必须带兼容策略：新增维度可选、语义变更需迁移提示，重大变更支持双轨对比期
- 落地动作：回答「以「指标口径版本治理：定义演进、兼容查询与回溯审计」为例，你会如何围绕 指标治理 定义“方案生效”的判据，并通过测试与观测数据持续验证」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「以「指标口径版本治理：定义演进、兼容查询与回溯审计」为例，你会如何围绕 指标治理 定义“方案生效”的判据，并通过测试与观测数据持续验证」要明确 指标口径版本治理 的边界用例、回归用例和验收指标；只给 happy path 不算标准答案。
- 失败场景：例如测试强绑实现细节，重构后误报激增，团队忽略告警；要改为行为断言并分层执行测试。
- 替代方案与取舍：也可只保留冒烟测试提速，但回归信心不足；当前优先覆盖 指标口径版本治理 的高风险边界。

#### 关键细节（可追问）

- 指标定义要版本化：同名指标变更口径时产生新版本，旧版本保留可查询能力
- 查询界面显示“版本上下文”：看板与导出都标注指标版本、生效时间和定义摘要
- 变更必须带兼容策略：新增维度可选、语义变更需迁移提示，重大变更支持双轨对比期

## metric-definition-versioning-followup-3

title: 追问：在当前团队与业务约束下，如果团队要评估「指标口径版本治理：定义演进、兼容查询与回溯审计」的长期维护价值，你会优先看哪些指标再下结论
difficulty: 资深
tags: [指标治理, 版本化, 审计, 追问]
parent: metric-definition-versioning
generated: followup-script

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「指标口径版本治理：定义演进、兼容查询与回溯审计」不是只在理想输入下成立。。

### 题目

如果面试官追问：在当前团队与业务约束下，如果团队要评估「指标口径版本治理：定义演进、兼容查询与回溯审计」的长期维护价值，你会优先看哪些指标再下结论？

### 答案要点

#### 标准回答（直接作答）

- 结论：指标定义要版本化：同名指标变更口径时产生新版本，旧版本保留可查询能力
- 机制：查询界面显示“版本上下文”：看板与导出都标注指标版本、生效时间和定义摘要；变更必须带兼容策略：新增维度可选、语义变更需迁移提示，重大变更支持双轨对比期
- 落地动作：回答「在当前团队与业务约束下，如果团队要评估「指标口径版本治理：定义演进、兼容查询与回溯审计」的长期维护价值，你会优先看哪些指标再下结论」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在当前团队与业务约束下，如果团队要评估「指标口径版本治理：定义演进、兼容查询与回溯审计」的长期维护价值，你会优先看哪些指标再下结论」时要先定义 指标口径版本治理 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，指标口径版本治理 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 指标口径版本治理 关键链路先收敛再替换。

#### 关键细节（可追问）

- 指标定义要版本化：同名指标变更口径时产生新版本，旧版本保留可查询能力
- 查询界面显示“版本上下文”：看板与导出都标注指标版本、生效时间和定义摘要
- 变更必须带兼容策略：新增维度可选、语义变更需迁移提示，重大变更支持双轨对比期

## experiment-readout-decision-guardrail

title: 实验读数决策护栏：显著性、分层偏差与误读止损
difficulty: 资深
tags: [实验治理, 决策分析, 指标可信度]
followups: [experiment-readout-decision-guardrail-followup-1, experiment-readout-decision-guardrail-followup-2, experiment-readout-decision-guardrail-followup-3]

### 一句话

实验的风险不只在“实验做错”，更在“读数读错”：错误解读会把正确实验变成错误决策。

### 题目

A/B 实验结果显示总体转化率提升 1.2%，业务准备全量发布；但你发现高价值用户分层里是负向。你会如何设计读数决策护栏，避免误读造成损失？

### 答案要点

- 先定义读数准入门槛：样本量、显著性、最小可检测效果（MDE）和实验污染率必须达标。
- 读数必须分层查看：核心人群、渠道、端类型、地区分层至少覆盖一轮，避免总体掩盖局部风险。
- 标注不确定性信息：置信区间、效应方向稳定性、观测窗口长度要对齐展示。
- 对“总体正向但关键分层负向”设置硬护栏：先灰度或分层放量，不得直接全量。
- 输出结论要区分“可发布”“可继续实验”“应立即止损”三类动作，而非单一 yes/no。
- 复盘要保留读数证据链：原始口径、统计参数、版本快照，确保结论可审计。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 实验读数决策护栏 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 实验读数决策护栏，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「实验读数决策护栏：显著性、分层偏差与误读止损」按阶段灰度，每阶段可验收可撤回。

### 代码示例

```ts
type ExperimentReadout = {
  pValue: number;
  sampleRatioMismatch: boolean;
  overallLift: number;
  keySegmentLift: number;
};

function releaseDecision(r: ExperimentReadout) {
  if (r.sampleRatioMismatch || r.pValue > 0.05) return 'hold';
  if (r.overallLift > 0 && r.keySegmentLift < 0) return 'segment_rollout';
  return 'progressive_release';
}
```

```yaml
experiment_readout_guardrail:
  required_checks:
    - sample_size_pass
    - significance_pass
    - key_segment_consistency
    - contamination_under_threshold
  block_full_release_when:
    - key_segment_lift: '< 0'
```

### 追问

- 「实验读数决策护栏：显著性、分层偏差与误读止损」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只看总体 uplift，不看关键分层与业务约束。
- 用统计显著替代业务显著，忽略真实收益阈值。
- 实验结论没有版本快照，事后无法追溯争议来源。

### 延伸

- 可把“高风险分层负向”直接接入发布闸门自动阻断。
- 建议沉淀实验误读案例库，提升团队统计素养。

## attribution-dispute-resolution-playbook

title: 归因争议仲裁手册：一数多口径下如何达成可执行结论
difficulty: 资深
tags: [归因治理, 跨团队协作, 决策沟通]
followups: [attribution-dispute-resolution-playbook-followup-1, attribution-dispute-resolution-playbook-followup-2, attribution-dispute-resolution-playbook-followup-3]

### 一句话

归因争议的关键不在“谁赢辩论”，而在“能否形成可执行共识并可复核”。

### 题目

增长团队说某活动带来新增，渠道团队说是自然流量回升，产品团队说是版本改版驱动。三个团队都拿出“看起来有道理”的数据。你会如何仲裁归因争议并推进决策？

### 答案要点

- 先冻结争议范围：先回答“这次要做什么决策”，避免无限扩展成方法论争论。
- 统一输入口径：时间窗、去重规则、归因窗口、用户定义必须写成可复核协议。
- 采用多模型并行对比：首触/末触/位置归因结果并列展示，明确各自偏差来源。
- 对争议结论设置“证据等级”：强证据可直接执行，弱证据只允许小流量试探。
- 决策输出必须带后验验证计划：如果后续数据不符合预期，何时触发策略切换。
- 复盘沉淀仲裁记录：口径争议点、证伪过程、最终结论与影响范围。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「归因争议仲裁手册：一数多口径下如何达成可执行结论」时要先定义 归因争议仲裁手册 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，归因争议仲裁手册 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 归因争议仲裁手册 关键链路先收敛再替换。

### 代码示例

```ts
type AttributionInput = {
  timeWindowAligned: boolean;
  userDedupAligned: boolean;
  modelAgreementScore: number;
};

function canFinalizeAttribution(i: AttributionInput) {
  return i.timeWindowAligned && i.userDedupAligned && i.modelAgreementScore >= 0.7;
}
```

```yaml
attribution_dispute_flow:
  step1: lock_decision_scope
  step2: align_input_contract
  step3: compare_models
  step4: assign_evidence_level
  step5: publish_switch_conditions
```

### 追问

- 「归因争议仲裁手册：一数多口径下如何达成可执行结论」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 直接比较结论，不先比较输入口径是否一致。
- 争议会议只给观点，不给证据等级和后验验证计划。
- 得出结论后不设切换条件，导致错误策略持续执行。

### 延伸

- 可以把归因协议做成模板化 PRD 附件，减少重复争议。
- 建议为高影响决策引入“二次审核”机制，降低单团队偏见。

## experiment-readout-decision-guardrail-followup-1

title: 追问：实验读数护栏上线前必须验证哪些边界假设
difficulty: 资深
tags: [实验治理, 决策分析, 指标可信度, 追问]
parent: experiment-readout-decision-guardrail
generated: followup-script

### 一句话

我会先验证四个前提：样本分流是否均匀、实验污染是否可控、关键分层样本是否充足、埋点链路是否稳定。；只要任一前提不成立，就不能直接进入读数决策阶段。；对高风险业务线再加一层人工复核，避免统计正确但业务理解错误。

### 题目

如果面试官追问：实验读数护栏上线前，你会优先验证哪些边界假设，避免线上决策被误读？

### 答案要点

#### 标准回答（直接作答）

- 结论：先定义读数准入门槛：样本量、显著性、最小可检测效果（MDE）和实验污染率必须达标
- 机制：读数必须分层查看：核心人群、渠道、端类型、地区分层至少覆盖一轮，避免总体掩盖局部风险；标注不确定性信息：置信区间、效应方向稳定性、观测窗口长度要对齐展示
- 落地动作：回答「实验读数护栏上线前必须验证哪些边界假设」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「实验读数护栏上线前必须验证哪些边界假设」时要先定义 实验读数护栏上线前必 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，实验读数护栏上线前必 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 实验读数护栏上线前必 关键链路先收敛再替换。

#### 关键细节（可追问）

- 先定义读数准入门槛：样本量、显著性、最小可检测效果（MDE）和实验污染率必须达标
- 读数必须分层查看：核心人群、渠道、端类型、地区分层至少覆盖一轮，避免总体掩盖局部风险
- 标注不确定性信息：置信区间、效应方向稳定性、观测窗口长度要对齐展示

## experiment-readout-decision-guardrail-followup-2

title: 追问：你会如何构建实验结论的可复核证据链
difficulty: 资深
tags: [实验治理, 决策分析, 指标可信度, 追问]
parent: experiment-readout-decision-guardrail
generated: followup-script

### 一句话

证据链至少包含：原始数据快照、统计脚本版本、分层结果、最终决策记录。；我会要求“同输入可复算同结果”，避免结论依赖个人口头解释。；决策会议材料必须带证据等级与不确定性说明，防止过度承诺。

### 题目

如果面试官追问：怎么确保实验结论可复核，不会因为换个人读数就得出不同决策？

### 答案要点

#### 标准回答（直接作答）

- 结论：先定义读数准入门槛：样本量、显著性、最小可检测效果（MDE）和实验污染率必须达标
- 机制：读数必须分层查看：核心人群、渠道、端类型、地区分层至少覆盖一轮，避免总体掩盖局部风险；标注不确定性信息：置信区间、效应方向稳定性、观测窗口长度要对齐展示
- 落地动作：回答「你会如何构建实验结论的可复核证据链」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 你会如何构建实验结论 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 你会如何构建实验结论，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「你会如何构建实验结论的可复核证据链」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先定义读数准入门槛：样本量、显著性、最小可检测效果（MDE）和实验污染率必须达标
- 读数必须分层查看：核心人群、渠道、端类型、地区分层至少覆盖一轮，避免总体掩盖局部风险
- 标注不确定性信息：置信区间、效应方向稳定性、观测窗口长度要对齐展示

## experiment-readout-decision-guardrail-followup-3

title: 追问：长期看你会追哪些信号判断实验读数治理值不值
difficulty: 资深
tags: [实验治理, 决策分析, 指标可信度, 追问]
parent: experiment-readout-decision-guardrail
generated: followup-script

### 一句话

我会长期追三组信号：误读导致的决策反转率、实验到决策的周期时长、关键分层事故率。；如果周期缩短但反转率上升，说明“快了但不准”，治理方向要调整。；只有“准确性、效率、可审计性”同步改善，才说明这套治理值得持续投入。

### 题目

如果面试官追问：这套实验读数治理长期值不值得投入，你会持续追哪几组信号再做判断？

### 答案要点

#### 标准回答（直接作答）

- 结论：先定义读数准入门槛：样本量、显著性、最小可检测效果（MDE）和实验污染率必须达标
- 机制：读数必须分层查看：核心人群、渠道、端类型、地区分层至少覆盖一轮，避免总体掩盖局部风险；标注不确定性信息：置信区间、效应方向稳定性、观测窗口长度要对齐展示
- 落地动作：回答「长期看你会追哪些信号判断实验读数治理值不值」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 长期看你会追哪些信号 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 长期看你会追哪些信号，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「长期看你会追哪些信号判断实验读数治理值不值」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先定义读数准入门槛：样本量、显著性、最小可检测效果（MDE）和实验污染率必须达标
- 读数必须分层查看：核心人群、渠道、端类型、地区分层至少覆盖一轮，避免总体掩盖局部风险
- 标注不确定性信息：置信区间、效应方向稳定性、观测窗口长度要对齐展示

## attribution-dispute-resolution-playbook-followup-1

title: 追问：归因争议仲裁流程最容易失灵的边界在哪
difficulty: 资深
tags: [归因治理, 跨团队协作, 决策沟通, 追问]
parent: attribution-dispute-resolution-playbook
generated: followup-script

### 一句话

最容易失灵的点是：决策目标不清、输入口径没冻结、争议没有证据等级。；我会先锁“本次会议只解决哪一个决策”，其余争议转到后续验证清单。；若会议结束没有切换条件和责任人，就不算达成结论。

### 题目

如果面试官追问：归因争议仲裁流程经常开会很多但结论难落地，最容易失灵的边界在哪，你会怎么补？

### 答案要点

#### 标准回答（直接作答）

- 结论：先冻结争议范围：先回答“这次要做什么决策”，避免无限扩展成方法论争论
- 机制：统一输入口径：时间窗、去重规则、归因窗口、用户定义必须写成可复核协议；采用多模型并行对比：首触/末触/位置归因结果并列展示，明确各自偏差来源
- 落地动作：回答「归因争议仲裁流程最容易失灵的边界在哪」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 归因争议仲裁流程最容 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 归因争议仲裁流程最容，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「归因争议仲裁流程最容易失灵的边界在哪」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先冻结争议范围：先回答“这次要做什么决策”，避免无限扩展成方法论争论
- 统一输入口径：时间窗、去重规则、归因窗口、用户定义必须写成可复核协议
- 采用多模型并行对比：首触/末触/位置归因结果并列展示，明确各自偏差来源

## attribution-dispute-resolution-playbook-followup-2

title: 追问：你如何定义归因争议治理“生效”并持续验证
difficulty: 资深
tags: [归因治理, 跨团队协作, 决策沟通, 追问]
parent: attribution-dispute-resolution-playbook
generated: followup-script

### 一句话

生效判据至少包括：争议收敛时长下降、同议题重复争论次数下降、结论反转率下降。；同时看流程成本：仲裁周期不能无上限拉长，否则会拖慢业务决策。；如果争议减少但策略效果变差，说明“压制了争议但没提升质量”，需要调整机制。

### 题目

如果面试官追问：归因争议治理上线后，怎么才算生效？又如何持续证明它不是“流程变重”？

### 答案要点

#### 标准回答（直接作答）

- 结论：先冻结争议范围：先回答“这次要做什么决策”，避免无限扩展成方法论争论
- 机制：统一输入口径：时间窗、去重规则、归因窗口、用户定义必须写成可复核协议；采用多模型并行对比：首触/末触/位置归因结果并列展示，明确各自偏差来源
- 落地动作：回答「你如何定义归因争议治理“生效”并持续验证」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 你如何定义归因争议治 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 你如何定义归因争议治，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「你如何定义归因争议治理“生效”并持续验证」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先冻结争议范围：先回答“这次要做什么决策”，避免无限扩展成方法论争论
- 统一输入口径：时间窗、去重规则、归因窗口、用户定义必须写成可复核协议
- 采用多模型并行对比：首触/末触/位置归因结果并列展示，明确各自偏差来源

## attribution-dispute-resolution-playbook-followup-3

title: 追问：长期看你会用哪些信号判断归因治理是否值得继续投入
difficulty: 资深
tags: [归因治理, 跨团队协作, 决策沟通, 追问]
parent: attribution-dispute-resolution-playbook
generated: followup-script

### 一句话

我会长期看三组信号：争议事件密度、仲裁后策略成功率、跨团队信任度（复议率）。；如果争议少了但策略成功率没提升，说明只是把问题压住了，不是解决了。；只有“决策质量提升 + 协同成本下降”同时成立，才值得继续投入。

### 题目

如果面试官追问：这套归因治理长期是否值得继续投入，你会优先看哪些信号再决定加码或收缩？

### 答案要点

#### 标准回答（直接作答）

- 结论：先冻结争议范围：先回答“这次要做什么决策”，避免无限扩展成方法论争论
- 机制：统一输入口径：时间窗、去重规则、归因窗口、用户定义必须写成可复核协议；采用多模型并行对比：首触/末触/位置归因结果并列展示，明确各自偏差来源
- 落地动作：回答「长期看你会用哪些信号判断归因治理是否值得继续投入」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 长期看你会用哪些信号 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 长期看你会用哪些信号，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「长期看你会用哪些信号判断归因治理是否值得继续投入」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先冻结争议范围：先回答“这次要做什么决策”，避免无限扩展成方法论争论
- 统一输入口径：时间窗、去重规则、归因窗口、用户定义必须写成可复核协议
- 采用多模型并行对比：首触/末触/位置归因结果并列展示，明确各自偏差来源
