---
id: 28-customer-service-im
title: 客服 / IM 实战
order: 28
icon: 💬
description: 长连接、消息可靠性、多端同步、富文本安全、智能客服路由、海外部署、端到端加密——客服 / IM 平台高频面试题。
---

## im-protocol-design

title: IM 消息协议怎么设计？关键字段有哪些？
followups: [im-protocol-design-followup-1, im-protocol-design-followup-2, im-protocol-design-followup-3]
difficulty: 进阶
tags: [IM, 协议, 高频]

### 一句话

一条消息至少需要：`msg_id`（去重）+ `seq`（排序）+ `from/to/conv_id`（投递）+ `type`（文本/图片/卡片）+ `payload`（业务体）+ `ts`（时间戳）+ `client_ts`（弱网纠偏）。

### 题目

请设计一份 IM 客户端 ↔ 服务端的消息协议，包含必要字段、消息类型扩展性、协议层（WebSocket 之上）的封装方式。

### 答案要点

- **传输层**：WebSocket（双向） + JSON 或 Protobuf；移动端弱网选 Protobuf 体积小一半
- **分层**：外层是 envelope（type / cmd / req_id / status / data），内层是业务 body；服务端可路由
- **消息核心字段**：
  - `msg_id`：客户端预生成 UUID，用于去重 + 服务端 ack 回执
  - `seq`：服务端按会话单调递增，**排序的唯一来源**
  - `conv_id` / `from` / `to`：会话标识 + 双方 user_id
  - `type`：text / image / file / card / system / typing / receipt
  - `payload`：和 type 对应的结构化体（image 含 url + width/height + thumbnail）
  - `ts`：服务端时间戳（毫秒），客户端不可信
  - `client_ts`：客户端时间戳，仅用于"消息发送时长"统计
- **可扩展性**：
  - `type` 用字符串枚举不要数字，新加类型不会冲突
  - 未识别 type 客户端兜底显示"该消息无法显示，请升级"
  - 业务字段放 `payload`，envelope 字段不轻易变更

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「IM 消息协议怎么设计？关键字段有哪些」时要先定义 IM 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，IM 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 IM 关键链路先收敛再替换。

### 代码示例

```ts
type MsgType = 'text' | 'image' | 'file' | 'card' | 'system' | 'typing' | 'receipt';

interface Envelope<T = unknown> {
  cmd: 'send' | 'recv' | 'ack' | 'sync' | 'event';
  req_id: string;
  status?: 'ok' | 'fail';
  err?: { code: number; msg: string };
  data: T;
}

interface IMMessage {
  msg_id: string;
  seq: number;
  conv_id: string;
  from: string;
  to: string;
  type: MsgType;
  payload: unknown;
  ts: number;
  client_ts?: number;
}
```

### 常见误区

- 用客户端时间戳排序——多端时钟漂移会导致消息错位
- 用数据库主键当 seq——不同会话共享递增空间，单会话 seq 不连续
- 把所有字段平铺在 envelope —— 升级协议时全员崩溃；envelope 和 payload 必须分层

### 追问

- 为什么需要 `req_id` 和 `msg_id` 两个 id？（一个是请求级，一个是消息级）
- Protobuf vs JSON 在 IM 场景的取舍
- 大型卡片消息（产品卡片 + 订单卡片）payload 怎么版本化

### 延伸

- 飞书 / 钉钉 / 企业微信开放平台的协议都是 envelope + 业务 body 两层
- WebSocket 上加自定义"心跳 cmd"比 ping/pong frame 更可控

## websocket-heartbeat-reconnect

title: 长连接的心跳保活和断线重连怎么做？
followups: [websocket-heartbeat-reconnect-followup-1, websocket-heartbeat-reconnect-followup-2, websocket-heartbeat-reconnect-followup-3]
links: [06-network/websocket-vs-sse-vs-polling]
difficulty: 进阶
tags: [WebSocket, 心跳, 重连, 高频]

### 一句话

**心跳**：客户端每 20-30s 发一个 ping，超过 N 秒没收到 pong 就主动 close；**重连**：指数退避（1s → 2 → 4 → 8 → 最多 30s）+ 监听 `online` / `visibilitychange` 立即重连。

### 题目

WebSocket 客户端的心跳保活、断线重连、网络变化感知怎么设计？

### 答案要点

- **为什么要心跳**：NAT / 代理会在闲置时（一般 4-5 分钟）静默断开 TCP，应用层不感知；心跳让连接保持活跃，并能在第一时间感知断开
- **心跳策略**：
  - 客户端 setInterval 20-30s 发一个 `{cmd: 'ping'}`
  - 服务端必须回 `{cmd: 'pong'}`；客户端记录 `lastPongAt`
  - 超过 60s 没收到 pong → 主动 `socket.close()`，触发重连
  - 移动端在 `pagehide` 时关心跳，`pageshow` 立即重连
- **重连策略**：
  - 指数退避 + jitter：`delay = min(1000 * 2 ** retry, 30000) + random(0, 500)`
  - 失败 N 次后给用户一个提示（"连接异常，点击重试"），避免无限重试耗电
  - 重连成功后**必须发 sync** 拉取断线期间漏掉的消息（基于本地最大 seq）
- **网络变化感知**：
  - `window.addEventListener('online', reconnect)` —— 网络从断到通
  - `document.addEventListener('visibilitychange')` —— Tab 切回时立即检查连接
  - `navigator.connection.addEventListener('change')` —— 4G ↔ Wi-Fi 切换

#### 标准补充（边界/失败/取舍）

- 界定条件：这题默认 长连接的心跳保活和断 链路已定义超时、重试和幂等规则；若服务端语义不稳定，先补协议契约再谈优化。
- 失败场景：例如网关限流时仍持续重试，长连接的心跳保活和断 会放大故障并拖垮下游；应立即降级并限制重试窗口。
- 替代方案与取舍：也可吞掉错误换表面成功率，但定位成本极高；当前保留错误语义和回滚开关。

### 代码示例

```ts
class IMSocket {
  private ws: WebSocket | null = null;
  private retry = 0;
  private heartbeat?: number;
  private lastPongAt = 0;

  connect(url: string) {
    this.ws = new WebSocket(url);
    this.ws.onopen = () => {
      this.retry = 0;
      this.lastPongAt = Date.now();
      this.startHeartbeat();
      this.sync();
    };
    this.ws.onmessage = (e) => this.handle(JSON.parse(e.data));
    this.ws.onclose = () => this.scheduleReconnect();
    this.ws.onerror = () => this.ws?.close();
  }

  private startHeartbeat() {
    this.heartbeat = window.setInterval(() => {
      if (Date.now() - this.lastPongAt > 60_000) {
        this.ws?.close();
        return;
      }
      this.ws?.send(JSON.stringify({ cmd: 'ping' }));
    }, 25_000);
  }

  private scheduleReconnect() {
    clearInterval(this.heartbeat);
    const delay = Math.min(1000 * 2 ** this.retry, 30_000) + Math.random() * 500;
    this.retry++;
    setTimeout(() => this.connect(this.url), delay);
  }

  private handle(msg: { cmd: string }) {
    if (msg.cmd === 'pong') this.lastPongAt = Date.now();
  }

  private sync() {
    /* 发本地最大 seq，拉漏掉的消息 */
  }
}

window.addEventListener('online', () => imSocket.connect(URL));
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') imSocket.checkAlive();
});
```

### 常见误区

- 心跳间隔写死 30s，没考虑某些路由器更激进的 NAT 超时（< 30s）
- 重连不带退避——网络抖动时一秒发 100 次连接请求
- 重连成功后没补拉历史 → 用户感知"消息丢了"
- 用 setTimeout 而非 setInterval 还忘了清——内存泄漏

### 追问

- WebSocket 自带的 ping/pong frame 浏览器为什么不暴露？为什么要用应用层心跳
- 多 Tab 同一用户怎么办（共用一个 connection 还是各自连接）
- 弱网下心跳间隔自适应（RTT 长就拉长间隔）怎么做

### 延伸

- ShareWorker 可以在多 Tab 之间复用一个 WebSocket，省服务端连接数
- 移动端 H5 嵌入 App 时，原生侧的 long-running socket 通常更稳，可以考虑 JSBridge 透传

## message-reliability

title: 消息可靠性（不丢、不重、有序）怎么保证？
followups: [message-reliability-followup-1, message-reliability-followup-2, message-reliability-followup-3]
difficulty: 资深
tags: [IM, 可靠性, ack, 高频]

### 一句话

不丢靠**双向 ack**（客户端 → 服务端 + 服务端 → 接收端 + 接收端 → 服务端）；不重靠**msg_id 去重**；有序靠**服务端单调 seq**。

### 题目

描述一条消息从发送方到接收方完整的可靠投递流程，分别如何防止：丢失、重复、乱序、对端不在线？

### 答案要点

- **流程（三段 ack）**：
  1. 发送端 → 服务端：`send(msg_id, payload)`，服务端持久化后回 `ack(msg_id, seq, ts)`，发送端把"发送中"改为"已送达服务端"
  2. 服务端 → 接收端（在线）：直接推送
  3. 接收端 → 服务端：`recv_ack(msg_id)`，服务端把这条标记为"已送达接收端"，否则下次接收端上线时再推
- **防重复**：
  - 发送端预生成 `msg_id`（UUID v4 或 client_id+seq），服务端按 msg_id 去重
  - 接收端按 msg_id 维护一个"近 N 条"的 LRU 集合，重复消息直接丢
- **防丢失**：
  - 发送端本地 outbox：写入 IndexedDB → 发送 → 收到 ack 才删；启动时重发 outbox
  - 服务端持久化后才回 ack，避免"内存中接收，宕机就丢"
  - 离线消息存 N 天，上线 sync 时按 seq 拉取
- **防乱序**：
  - 服务端单会话单调递增 seq；接收端按 seq 排序而非到达顺序
  - 接收到非连续 seq（缺 seq=5）→ 触发 sync(min=4, max=6) 补洞
- **离线推送**：服务端检测对端不在线，落库 + 调 push（APNs / FCM / 国内厂商通道）

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「消息可靠性（不丢、不重、有序）怎么保证」时要把 消息可靠性 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，消息可靠性 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「消息可靠性（不丢、不重、有序）怎么保证」里当前按阶段替换更稳。

### 代码示例

```ts
class OutboxManager {
  async send(msg: IMMessage) {
    msg.msg_id = msg.msg_id ?? crypto.randomUUID();
    await idb.put('outbox', { ...msg, status: 'sending' });

    try {
      const { seq, ts } = await api.send(msg);
      msg.seq = seq;
      msg.ts = ts;
      await idb.put('outbox', { ...msg, status: 'sent' });
      await idb.put('messages', msg);
    } catch {
      // 留在 outbox 里，下次重试
    }
  }

  async retryAllOnReconnect() {
    const list = await idb.getAll('outbox');
    for (const m of list.filter((x) => x.status === 'sending')) {
      this.send(m);
    }
  }
}

class InboxDedup {
  private seen = new Map<string, number>();
  private MAX = 500;

  isDuplicate(msg: IMMessage): boolean {
    if (this.seen.has(msg.msg_id)) return true;
    this.seen.set(msg.msg_id, Date.now());
    if (this.seen.size > this.MAX) {
      const first = this.seen.keys().next().value;
      if (first !== undefined) this.seen.delete(first);
    }
    return false;
  }
}
```

### 常见误区

- 只做发送端 ack，没做接收端 ack —— "服务端收到不等于对端看到"
- 用接收时间戳排序 —— 弱网时晚到的早消息会显示在最下面
- 重发不带 msg_id（每次新生成）—— 服务端去不了重，对端收两份
- 离线 push 文案直接显示原文 → 隐私泄漏（锁屏页面任何人都能看到）

### 追问

- 消息撤回 / 编辑怎么做（指向原 msg_id 的 system message）
- "对方正在输入"信令要不要保证可靠（不需要，丢了无所谓）
- seq 用 64 位还是 32 位？哪种会溢出

### 延伸

- 微信"已送达 / 已读"是两个独立事件；钉钉企业 IM 还有"已读未读列表"
- Signal Protocol 在保证 E2EE 的同时还要保证消息不重不丢，更复杂

## unread-count-sync

title: 多端未读计数怎么做才不会"标已读了红点还在"？
followups: [unread-count-sync-followup-1, unread-count-sync-followup-2, unread-count-sync-followup-3]
difficulty: 进阶
tags: [IM, 未读, 多端同步, 高频]

### 一句话

**所有端的未读都从服务端的 read_seq 推导**：未读数 = `max_seq - read_seq`；任何端把消息看到 X，就把 read_seq 提到 X 并广播给所有端，红点立即同步。

### 题目

PC、手机、Pad 三端同时登录，怎么保证未读计数实时同步？怎么避免"在 PC 上读了，手机端红点还在"？

### 答案要点

- **核心原则**：服务端是**唯一真实来源**，客户端不要自己累加未读数
- **数据模型**：服务端为每个 (user, conv) 存一对值：`max_seq`（最新消息）、`read_seq`（已读到哪条）
- **未读数公式**：`unread = max_seq - read_seq`（这条会话内）；总未读 = `Σ 各会话未读`
- **更新流程**：
  1. 客户端打开会话，看到最后一条 seq=100 → 调 `markRead(conv_id, seq=100)`
  2. 服务端把 read_seq 提到 100（取 max，避免老端覆盖新端）
  3. 服务端通过长连接广播 `read_event` 给该用户的所有在线端
  4. 各端收到后局部更新 UI
- **离线端登录后**：拉取一次全量未读快照（`getUnreadSnapshot`），不依赖增量
- **群聊 / 客服会话**：增加"@我"未读单独计数，UI 高亮；机制相同
- **本地优化**：
  - 每个会话 read_seq 本地缓存，进入会话时立刻清红点（乐观更新），后台异步通知服务端
  - 失败时不回滚 UI（避免红点闪烁），只在 sync 时校准

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「核心原则：服务端是唯一真实来源，客户端不要自己累加未读数」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「数据模型：服务端为每个 (user, conv) 存一对值：max_seq（最新消息）、read_seq（已读到哪条）」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「多端未读计数怎么做才不会"标已读了红点还在"」风险偏高；当前方案可验证、可灰度、可回滚。

### 代码示例

```ts
interface UnreadStore {
  // conv_id -> { maxSeq, readSeq }
  state: Map<string, { maxSeq: number; readSeq: number }>;
}

function unreadOf(conv: string): number {
  const v = store.state.get(conv);
  if (!v) return 0;
  return Math.max(0, v.maxSeq - v.readSeq);
}

function totalUnread(): number {
  let n = 0;
  for (const v of store.state.values()) n += Math.max(0, v.maxSeq - v.readSeq);
  return n;
}

async function markRead(conv: string, seq: number) {
  const v = store.state.get(conv);
  if (!v) return;
  v.readSeq = Math.max(v.readSeq, seq);
  await api.markRead(conv, seq);
}

socket.on('read_event', ({ conv, readSeq }) => {
  const v = store.state.get(conv);
  if (v) v.readSeq = Math.max(v.readSeq, readSeq);
});
```

### 常见误区

- 客户端自己 `unread++` —— 多端不同步、漏消息时偏差越来越大
- 用"最后一次 mark_read 的时间戳"代替 seq —— 时钟漂移会导致已读判断错误
- markRead 用最新 seq 还是当前可见 seq？要用**当前可见**，否则用户上滑看一半就清空未读

### 追问

- 群聊几千人未读怎么存（每个 user 都存 read_seq 是不是太重？）
- 离线端 7 天后上线，未读上限要不要截断（如 99+）
- 怎么实现"标记会话所有消息已读"和"标记单条未读"

### 延伸

- 微信用了类似机制，红点动画是本地优化但数据来自服务端
- 钉钉的"已读未读列表"在 IM 协议层多了一个"已读用户列表"事件

## message-pagination-history

title: 历史消息分页和会话首屏加载怎么设计？
followups: [message-pagination-history-followup-1, message-pagination-history-followup-2, message-pagination-history-followup-3]
difficulty: 进阶
tags: [IM, 分页, 缓存, 高频]

### 一句话

首屏从本地 IndexedDB 直出最后 N 条（毫秒级显示），同时拉远端最新 seq 校准；上滑加载历史用 **before_seq + limit** 游标分页，永远不要用 offset。

### 题目

打开一个会话窗口，怎么做到"瞬间看到上次的消息"+"正确补齐离线期间的新消息"+"上滑加载更老的"？

### 答案要点

- **首屏三步走**：
  1. 本地 IndexedDB 按 `conv_id` + `seq desc` 取最后 30 条 → 立刻渲染（< 50ms 上屏）
  2. 同时发请求 `getMessages(conv, after_seq=本地最大seq)` 拉离线期间的新消息
  3. 把新消息合并进列表，自动跟随到底部（除非用户已上滑）
- **历史分页（上滑加载）**：
  - 接口签名：`getMessages(conv_id, before_seq, limit=30)`，返回 `seq < before_seq` 的最新 limit 条
  - **不要用 offset 分页**：消息数据流式追加，offset 翻页会有重复 / 漏；游标 (seq) 才是正确范式
  - 接口返回 `has_more` 字段，UI 判断是否继续显示"加载更多"
- **本地缓存策略**：
  - IndexedDB 表结构：`messages(conv_id, seq, msg_id, payload, ts)`，主键 `[conv_id, seq]`
  - 每次拉取后落库；超过容量（如 5000 条 / 会话）自动清理最老的
  - 启动时不全量加载，按需懒加载
- **性能要点**：
  - 渲染层用虚拟列表（详见专题）
  - 翻页时 prepend 内容会让滚动位置漂移，要在 prepend 前后维护 `scrollHeight`，prepend 后修正 `scrollTop`

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「历史消息分页和会话首屏加载怎么设计」必须先给 历史消息分页和会话首 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，历史消息分页和会话首 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 历史消息分页和会话首 的计算与缓存路径。

### 代码示例

```ts
async function openConversation(conv: string) {
  const local = await idb.getRange('messages', conv, { limit: 30, order: 'desc' });
  render(local.reverse());

  const localMaxSeq = local[local.length - 1]?.seq ?? 0;
  const remote = await api.getMessages(conv, { after_seq: localMaxSeq });
  if (remote.length) {
    await idb.putAll('messages', remote);
    appendMessages(remote);
    if (isAtBottom()) scrollToBottom();
  }
}

async function loadMore() {
  const oldest = list[0];
  const before = oldest?.seq ?? Number.MAX_SAFE_INTEGER;
  const prevHeight = container.scrollHeight;
  const more = await api.getMessages(conv, { before_seq: before, limit: 30 });
  if (more.length) {
    await idb.putAll('messages', more);
    prependMessages(more);
    container.scrollTop += container.scrollHeight - prevHeight;
  }
}
```

### 常见误区

- 用 offset/page 分页 —— 新消息插入后，page=2 拉到的内容和 page=1 重叠
- 首屏只等远端 → 弱网用户看到 1-3s 的白屏；本地 + 远端并发才对
- 上滑加载完忘记修正 scrollTop —— 视觉上"页面跳了一下"
- 切会话时不清旧数据，列表越堆越大

### 追问

- 跨设备会话已读位置同步（在另一端继续滚动到 PC 看到的位置）怎么实现
- 消息体很大（图片 base64 / 长卡片）IndexedDB 存哪些字段
- 关键字搜索全部历史消息要不要走全文索引（FTS / Lunr）

### 延伸

- 微信 / Telegram / Slack 全部走 cursor based pagination
- 飞书 / 钉钉 PC 端用 SQLite + FTS5 做本地全文搜索，比纯 IndexedDB 强

## typing-presence-indicator

title: "对方正在输入" / 在线状态 / 已读回执 高频信令怎么做？
followups: [typing-presence-indicator-followup-1, typing-presence-indicator-followup-2, typing-presence-indicator-followup-3]
difficulty: 进阶
tags: [IM, presence, 已读, 高频]

### 一句话

高频但**可丢失**的信令（typing / presence）走独立通道，客户端 1-2s 节流发，服务端不持久化；已读回执（read receipt）走可靠通道但批量发（合并 5s 内的多条）。

### 题目

正在输入、在线状态、已读回执这些"准实时小信号"频率高、量大，怎么设计才不影响主消息通道？

### 答案要点

- **分层**：核心消息（必达）、业务事件（必达，群操作 / 撤回）、**信令（可丢，typing / presence）**
- **信令特点**：状态而非事件——丢一两次没关系，下次还能补上；不能压垮服务端
- **typing**：
  - 输入框触发 `oninput` 时 `throttle(emitTyping, 2000)`
  - 服务端不持久化，直接转发给会话其他端
  - 接收端显示 3-5s 内有 typing 就显示"对方正在输入"，超时自动消失
- **presence**：
  - 用户上线时广播一次 `online`，下线时广播 `offline`
  - 需要时拉取（`getPresence(user_ids)`），不要客户端订阅所有联系人 presence —— 流量爆炸
  - 高级方案：客户端只订阅"当前打开会话的对方 + 联系人列表可见的几个" presence
- **已读回执**：
  - 滚到底部时不要逐条 ack，节流 2-5s 批量发 `markRead(conv, max_seq)`
  - 客服场景的"已读"对用户体验很关键（坐席知道客户看到回复没），优先级提一档
- **服务端**：信令通道独立 channel / queue；持久化通道独立。前端单 WebSocket 也可在 envelope 层标记 `qos`

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「分层：核心消息（必达）、业务事件（必达，群操作 / 撤回）、信令（可丢，typing / presence）」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「信令特点：状态而非事件——丢一两次没关系，下次还能补上；不能压垮服务端」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「"对方正在输入" / 在线状态 / 已读回执 高频信令怎么做」风险偏高；当前方案可验证、可灰度、可回滚。

### 代码示例

```ts
const emitTyping = throttle(() => {
  socket.send({ cmd: 'typing', data: { conv_id, user_id } });
}, 2000);

inputEl.addEventListener('input', emitTyping);

const typingState = new Map<string, number>();

socket.on('typing', ({ conv_id, user_id }) => {
  typingState.set(conv_id + ':' + user_id, Date.now());
  showTypingIndicator(conv_id);
});

setInterval(() => {
  const now = Date.now();
  for (const [k, t] of typingState) {
    if (now - t > 5000) {
      typingState.delete(k);
      hideTypingIndicator(k.split(':')[0]);
    }
  }
}, 1000);

const markReadDebounced = throttle(() => {
  socket.send({ cmd: 'mark_read', data: { conv_id, seq: lastVisibleSeq } });
}, 3000);

scrollContainer.addEventListener('scroll', () => {
  if (isAtBottom()) markReadDebounced();
});
```

### 常见误区

- typing 不节流，每个 keystroke 发一次 —— 服务端被 typing 信令打爆
- 客户端订阅所有联系人 presence —— 千人通讯录瞬间发送上千条订阅
- 用主消息通道发 typing —— 信令多到挤掉真消息推送
- 已读回执每条单发，客户阅读 50 条历史发 50 个 ack，服务端写库 50 次

### 追问

- 群聊"几个人在输入"怎么显示（最多 3 个名字 + 省略号）
- 移动端 App 切到后台时 presence 是否立即变 offline
- 客服侧坐席"挂起 / 离开 / 在线"状态变更怎么广播给所有客户

### 延伸

- WhatsApp 的"两个对勾"（已送达 / 已读）就是这个机制
- Slack 的 presence 走专门的 RTM API，和主消息通道分离

## chat-rich-text-safe-render

title: 聊天消息支持富文本（链接 / 表情 / @ / 卡片 / 图片），怎么渲染才安全？
followups: [chat-rich-text-safe-render-followup-1, chat-rich-text-safe-render-followup-2, chat-rich-text-safe-render-followup-3]
links: [13-security/xss, 11-ai-frontend/llm-frontend-security-checklist, 13-security/xss-csrf-defense]
difficulty: 资深
tags: [IM, XSS, 富文本, 安全, 高频]

### 一句话

**永远不要直接 v-html / dangerouslySetInnerHTML 用户输入**：客户端只允许结构化 payload（文本 + entities 数组），渲染时按类型生成元素；如果必须渲染 HTML，用 DOMPurify 严格白名单 + CSP 兜底。

### 题目

客服聊天里要支持：链接自动识别、@ 提及、表情、产品卡片、图片预览、富文本粘贴。怎么设计协议和渲染才不会被 XSS？

### 答案要点

- **首选方案：结构化 payload（不是 HTML）**
  - 服务端只下发结构化数据：`{ text: '你好 @张三', entities: [{ type: 'mention', offset: 3, len: 3, user_id: 'u1' }] }`
  - 客户端按 entity 渲染：text → `<span>`，mention → `<a>`，link → `<a target="_blank" rel="noopener noreferrer">`
  - 永远不会有 `<script>` 跑出来——因为根本没 HTML
- **如果一定要 HTML（粘贴富文本场景）**：
  - 服务端入库前用白名单清洗（如 sanitize-html / DOMPurify-server）
  - 客户端**再清洗一遍**（深防御）：DOMPurify.sanitize + 白名单允许 `b/i/u/strong/em/a/img/br/p`
  - 严格禁止 `script/style/iframe/object/embed/svg/on*` 属性
- **链接安全**：
  - `target="_blank"` 必带 `rel="noopener noreferrer"`，否则被钓鱼页通过 `window.opener` 接管
  - 协议白名单：仅 `http/https/mailto`，禁 `javascript:` / `data:`
- **图片安全**：
  - 服务端转存到自有 OSS / CDN，不直接渲染外链 URL（防 SSRF + 防追踪像素）
  - `<img>` 加 `referrerpolicy="no-referrer"` 防止泄漏来源 URL
- **CSP 兜底**：`script-src 'self'; object-src 'none'; base-uri 'self'`，万一漏了 sanitize 也不能跑外部脚本

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 聊天消息支持富文本 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，聊天消息支持富文本 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「聊天消息支持富文本（链接 / 表情 / @ / 卡片 / 图片），怎么渲染才安全」风险不足；当前优先服务端强校验，因为可审计、可回滚。

### 代码示例

```ts
type Entity =
  | { type: 'mention'; offset: number; len: number; user_id: string }
  | { type: 'link'; offset: number; len: number; url: string }
  | { type: 'emoji'; offset: number; len: number; key: string };

interface RichText {
  text: string;
  entities: Entity[];
}

import DOMPurify from 'dompurify';

function safeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'br', 'p', 'a', 'img', 'span'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'class'],
    ALLOWED_URI_REGEXP: /^(https?:|mailto:)/,
  });
}

function renderRich(rich: RichText): VNode[] {
  const out: VNode[] = [];
  let cursor = 0;
  for (const e of rich.entities.sort((a, b) => a.offset - b.offset)) {
    if (e.offset > cursor) out.push(h('span', rich.text.slice(cursor, e.offset)));
    const segment = rich.text.slice(e.offset, e.offset + e.len);
    if (e.type === 'mention') {
      out.push(h('a', { class: 'mention', href: `/user/${e.user_id}` }, segment));
    } else if (e.type === 'link') {
      out.push(h('a', { href: e.url, target: '_blank', rel: 'noopener noreferrer' }, segment));
    }
    cursor = e.offset + e.len;
  }
  if (cursor < rich.text.length) out.push(h('span', rich.text.slice(cursor)));
  return out;
}
```

### 常见误区

- 用正则在客户端识别链接 + innerHTML 拼接 —— 用户输入 `https://x.com/<img onerror=...>` 直接 XSS
- target=\_blank 没加 rel=noopener —— `window.opener.location = 'phishing.com'` 钓鱼经典
- 信任服务端 sanitize，前端不再清 —— 服务端被攻破或绕过时无防护
- 用 v-html 渲染对方头像 / 昵称 —— 昵称里的 `<img onerror>` 直接打穿

### 追问

- 富文本编辑器（@toast-ui / TipTap）输出的 HTML 怎么过 sanitize 还保留样式
- 客服侧粘贴 Excel 表格怎么处理（mime 是 HTML，但要降级）
- 图片防盗链要不要服务端代理 + token

### 延伸

- 飞书 / 钉钉的卡片消息（互动卡片）就是结构化协议的高级形态
- Telegram 的 MessageEntity 是同类设计的标杆

## chat-attachment-upload

title: 客服聊天的文件 / 图片上传：断点续传 + 缩略图 + 安全检查
followups: [chat-attachment-upload-followup-1, chat-attachment-upload-followup-2, chat-attachment-upload-followup-3]
difficulty: 资深
tags: [上传, 文件, 断点续传, 安全, 高频]

### 一句话

**前端切片（5MB 一片）+ 直传 OSS（带 STS 临时凭证）+ md5 秒传 + 失败重试 + 缩略图本地生成 + 类型/大小白名单**——这一套是企业级聊天附件的标配。

### 题目

设计一个客服聊天的图片 + 文件上传方案，要求：进度条、暂停 / 续传、上传失败重试、秒传、安全。

### 答案要点

- **前端切片**：File.slice(start, end) 切成 5MB 一片，串行 / 并发上传（推荐 3-5 个并发）
- **预上传协议**：
  1. 客户端先发 `prepareUpload({ name, size, md5 })` —— 服务端按 md5 查是否已有 → "秒传"
  2. 没有就返回 `upload_id` + 临时 STS（OSS 直传凭证）
  3. 客户端按 chunk 调 OSS 分片上传 API
  4. 全部完成后调 `completeUpload(upload_id)` 触发服务端合并
- **断点续传**：每片成功后本地记录 `uploaded_chunks`，下次刷新页面也能续；服务端 `getUploadStatus(upload_id)` 返回已传分片，跳过重传
- **缩略图**：
  - 图片：本地用 `<canvas>` resize 生成 200×200 缩略图先行展示（消息上即可见）
  - 视频：`HTMLVideoElement.captureStream` 抽第 1 秒做封面
- **安全检查**：
  - 客户端先校验 MIME + 后缀 + magic number（前 4-8 字节）
  - 大小限制：图片 10MB / 视频 200MB / 文档 50MB（按客服业务定）
  - 文件名白名单：`[a-zA-Z0-9_\-.\u4e00-\u9fa5]`，去掉 `../` 路径穿越
  - 服务端二次扫描：病毒、敏感图（NSFW）、敏感关键词（OCR）
- **直传 vs 经服务端**：直传 OSS 省后端带宽；服务端只签 STS，单点压力小

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 客服聊天的文件 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，客服聊天的文件 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「客服聊天的文件 / 图片上传：断点续传 + 缩略图 + 安全检查」风险不足；当前优先服务端强校验，因为可审计、可回滚。

### 代码示例

```ts
async function uploadFile(file: File, conv_id: string) {
  const md5 = await calcMd5(file);
  const prep = await api.prepareUpload({
    name: file.name,
    size: file.size,
    md5,
    mime: file.type,
  });

  if (prep.fast) return prep.url;

  const CHUNK = 5 * 1024 * 1024;
  const total = Math.ceil(file.size / CHUNK);
  const status = await api.getUploadStatus(prep.upload_id);
  const done = new Set<number>(status.uploaded);

  await pLimit(
    3,
    Array.from({ length: total }, (_, i) => i),
    async (i) => {
      if (done.has(i)) return;
      const chunk = file.slice(i * CHUNK, (i + 1) * CHUNK);
      await retry(() => putChunk(prep.sts, prep.upload_id, i, chunk), 3);
      notifyProgress(((done.size + 1) / total) * 100);
    },
  );

  return await api.completeUpload(prep.upload_id);
}

async function calcMd5(file: File): Promise<string> {
  const ab = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', ab);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function genThumbnail(file: File, max = 200): Promise<Blob> {
  const img = await createImageBitmap(file);
  const ratio = Math.min(max / img.width, max / img.height, 1);
  const w = img.width * ratio;
  const h = img.height * ratio;
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.convertToBlob({ type: 'image/webp', quality: 0.8 });
}
```

### 常见误区

- 大文件 fetch.body 直传，浏览器内存爆炸 —— 必须切片
- 只信任 file.type（MIME）—— 用户改个后缀就能传任意类型；要看 magic number
- 没做秒传 —— 同事在群里发同一份 50MB 培训视频，每个客户都重新上传
- STS 给的权限太大（整个 bucket 写）—— 应该限定 prefix 或单 key

### 追问

- WebRTC 走 P2P 传文件适合什么场景（小文件 / 一对一）
- 海外用户上传到国内 OSS 慢，怎么用多区域分发桶（OSS 跨区域复制 / 海外加速节点）
- 上传中页面关闭怎么续传 —— Service Worker 后台上传 / 提示用户

### 延伸

- 阿里云 OSS / 腾讯云 COS / AWS S3 都支持分片上传 + STS 临时凭证
- 大文件传输的"接力"模式：CDN 边缘节点先收，再异步回源

## customer-service-routing

title: 智能客服路由：机器人优先 / 转人工 / 排队 / 坐席分配 怎么设计？
followups: [customer-service-routing-followup-1, customer-service-routing-followup-2, customer-service-routing-followup-3]
difficulty: 资深
tags: [客服, 路由, 调度, 高频]

### 一句话

**漏斗式三级路由**：先机器人（FAQ / 知识库）→ 解决不了→ 排队 → 按"技能 + 负载 + 优先级"分配空闲坐席；客户端每一步都用同一个 conv_id，状态在服务端流转。

### 题目

设计一个智能客服系统的会话路由：客户进入 → 机器人接待 → 转人工 → 坐席分配。怎么处理排队、技能匹配、SLA、坐席不在线？

### 答案要点

- **会话状态机**：`new → bot → queueing → assigned → closed`，转换由服务端驱动，前端只看 `conv.status` 和 `conv.assignee`
- **机器人接待**：
  - 进入会话先走"自助分流"卡片（账号问题 / 退款 / 投诉…）
  - LLM + RAG 命中知识库回答；高置信度直接答，低置信度提示"是否需要人工"
  - 触发转人工的信号：用户主动点"转人工"、N 轮没解决、用户情绪检测（关键词 / 模型）为愤怒
- **排队 + 坐席分配（核心算法）**：
  - 每个坐席有：`status (online/busy/away)`、`max_concurrent (5)`、`current_load`、`skills[]`、`priority`
  - 路由规则按权重打分：技能匹配 ×3 + 优先级 ×2 + 负载倒数 ×1，分高的先分配
  - VIP 客户优先级提升，跳过排队；同语言坐席优先（海外）
- **SLA**（服务等级）：
  - 等待时间 > 30s：UI 提示"前面还有 N 人"
  - 等待 > 2 分钟：自动调高优先级 / 通知主管
  - 坐席首次响应时间（FRT）/ 平均响应时间（ART）作为 KPI
- **坐席不在线 / 高峰**：
  - 全部坐席 busy → 留言模式：用户提交问题，坐席上线后异步回复 + 邮件 / 短信通知
  - 海外多时区轮班：跟随 region + 工作时间路由

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「智能客服路由：机器人优先 / 转人工 / 排队 / 坐席分配 怎么设计」时要先定义 智能客服路由 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，智能客服路由 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 智能客服路由 关键链路先收敛再替换。

### 代码示例

```ts
type ConvStatus = 'new' | 'bot' | 'queueing' | 'assigned' | 'closed';

interface Agent {
  id: string;
  status: 'online' | 'busy' | 'away';
  current_load: number;
  max_concurrent: number;
  skills: string[];
  priority: number;
  region: 'cn' | 'sea' | 'us' | 'eu';
}

interface QueuedConv {
  conv_id: string;
  required_skills: string[];
  user_priority: number;
  region: string;
  enqueued_at: number;
}

function pickAgent(conv: QueuedConv, agents: Agent[]): Agent | null {
  const candidates = agents.filter(
    (a) =>
      a.status === 'online' &&
      a.current_load < a.max_concurrent &&
      a.region === conv.region &&
      conv.required_skills.every((s) => a.skills.includes(s)),
  );
  if (!candidates.length) return null;

  return candidates
    .map((a) => ({
      a,
      score:
        conv.required_skills.filter((s) => a.skills.includes(s)).length * 3 +
        a.priority * 2 +
        (a.max_concurrent - a.current_load) * 1,
    }))
    .sort((x, y) => y.score - x.score)[0].a;
}

function showQueuePosition(pos: number, eta: number) {
  return pos === 0
    ? '正在为您分配客服...'
    : `前面还有 ${pos} 人，预计等待 ${Math.round(eta / 60)} 分钟`;
}
```

### 常见误区

- 把分配逻辑写在前端 —— 多坐席同时认领同一个会话，冲突
- 只看负载不看技能 —— 把"退款问题"分给"技术支持"坐席，又得二次转
- 没给坐席端"会话池上限"，单个坐席被堆 30 个会话直接崩溃
- 转人工后机器人对话历史丢了 —— 坐席从零开始问，客户体验崩

### 追问

- 怎么做"机器人辅助" —— 坐席输入框旁边给 AI 推荐回复（参考 ai-form-copilot）
- 多语言客服怎么路由（语言识别 + 翻译兜底）
- 怎么衡量机器人有效解决率（自助率 / 转人工率 / CSAT）

### 延伸

- Zendesk / Intercom / Freshdesk 都是这套漏斗 + 技能矩阵
- 大厂内的"客服路由"和"工单系统"通常是同一个调度引擎

## e2ee-web-crypto

title: 端到端加密的客服 IM 怎么实现？Web Crypto API 实战
followups: [e2ee-web-crypto-followup-1, e2ee-web-crypto-followup-2, e2ee-web-crypto-followup-3]
links: [13-security/web-crypto-fundamentals]
difficulty: 资深
tags: [E2EE, 加密, WebCrypto, 高频]

### 一句话

**ECDH 协商出共享密钥 → AES-GCM 对称加密消息 → 服务端只看密文**；密钥派生用 HKDF，每会话一对 ECDH 密钥；私钥永远不上传。

### 题目

设计一个端到端加密的客服 IM：服务端永远看不到明文消息，但还要支持多端同步、历史漫游。怎么做？

### 答案要点

- **不对称基础**：
  - 每个用户启动时本地生成 ECDH P-256 密钥对，私钥存 IndexedDB（不可导出），公钥上传服务端
  - 两人会话开始时各自取对方公钥 + 自己私钥 → ECDH → 共享密钥 → HKDF 派生 → AES 密钥
- **消息加密**：
  - AES-GCM（对称、自带认证）+ 每条消息一个 12 byte 随机 IV
  - 密文 + IV + 标签发到服务端；服务端只能透传，看不到明文
- **多端同步的难点**：每个设备私钥不一样 → 需要"per-device 密钥"或"主密钥 + 用户密码加密"的方案
  - 简单方案：用户登录时输入主密码，派生 AES 密钥加密"会话密钥包"，传到服务端；新设备用同样密码解开
  - 高级方案：参考 Signal Double Ratchet（密钥棘轮，前向安全）
- **历史漫游**：消息密文存服务端没问题；客户端用对应会话密钥解开
- **客服场景**：通常**只对客户消息加密**，坐席端用企业证书签发的密钥；监管要求时支持企业 admin 解密（"keys for compliance"）
- **正确性 > 性能**：千万别自己实现 AES / RSA，全部用 `crypto.subtle.*`

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「端到端加密的客服 IM 怎么实现？Web Crypto API 实战」时先约定 端到端加密的客服 的输入输出契约、异常输入处理和边界行为（如取消、重入、幂等），否则实现不算完整。
- 失败场景：例如 端到端加密的客服 实现忽略 this/参数透传，线上会出现行为与预期不一致；应补调用语义测试并明确默认行为。
- 替代方案与取舍：也可只给伪代码说明思路，但可靠性细节会缺失；当前给可运行实现并补异常路径更符合资深标准。

### 代码示例

```ts
async function genECDHKey() {
  return crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, [
    'deriveKey',
    'deriveBits',
  ]);
}

async function deriveAESKey(myPriv: CryptoKey, peerPub: CryptoKey) {
  const bits = await crypto.subtle.deriveBits({ name: 'ECDH', public: peerPub }, myPriv, 256);
  const baseKey = await crypto.subtle.importKey('raw', bits, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(16),
      info: new TextEncoder().encode('kap-im-aes-gcm'),
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encrypt(key: CryptoKey, plaintext: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  return { iv, cipher: new Uint8Array(cipher) };
}

async function decrypt(key: CryptoKey, iv: Uint8Array, cipher: Uint8Array) {
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return new TextDecoder().decode(plain);
}
```

### 常见误区

- 把私钥导出（extractable=true）存 localStorage —— XSS 一发就盗走
- IV 复用同一个 —— AES-GCM 复用 IV 等于把密钥送出去（直接破解）
- 用 `crypto.subtle.encrypt({ name: 'AES-CBC' })` 不带认证 —— 容易被 padding oracle 攻击
- 自己写 ECDH 实现（"我看了几个博客觉得能搞")—— 99% 是漏洞百出

### 追问

- "前向安全"是什么？Double Ratchet 怎么做到
- 客户挂了 24h 才看消息，期间 receiver 私钥变了怎么办（pre-key bundle）
- E2EE 和 GDPR / 国内监管的冲突点（可解性 vs 不可解性）

### 延伸

- WhatsApp / Signal / iMessage 的 E2EE 协议都基于 Signal Protocol
- 飞书 / 企业微信的"安全消息"是企业证书托管模式，admin 可审计

## intl-deployment-region

title: 海外客服系统多区域部署：怎么选接入点？怎么过合规？
followups: [intl-deployment-region-followup-1, intl-deployment-region-followup-2, intl-deployment-region-followup-3]
difficulty: 资深
tags: [海外, 部署, 合规, GDPR, 高频]

### 一句话

**用户就近接入 + 数据按地区落地 + 内部跨区复制按法律允许**；GDPR / CCPA 等要求用户数据**驻留在本地区**，跨境传输需要法律基础（SCC / 同意 / 必要性）。

### 题目

你们的客服系统要同时服务国内、东南亚、欧美用户，怎么设计部署架构？怎么处理 GDPR / 数据驻留 / 跨境数据合规？

### 答案要点

- **接入层（前端 / 网关）**：
  - 多 region 部署网关：cn-shanghai / sea-singapore / us-east-1 / eu-frankfurt
  - DNS 智能解析（GeoDNS）/ Anycast IP 把用户路由到最近接入点
  - 海外用户 RTT < 100ms 是底线，否则 IM 体感差
- **数据层（数据驻留）**：
  - 欧盟用户数据**必须**存在欧盟 region（GDPR），中国大陆数据按《个人信息保护法》本地化
  - 数据库按 region 分别部署，不做跨境实时同步
  - 跨境同步只在合规允许的范围（如同企业内员工沟通、有明确同意）
- **法律合规**：
  - GDPR：用户有"被遗忘权"——前端 / 后端要支持账号注销 + 30 天内彻底清除
  - GDPR：明确 consent banner（cookie + 数据使用同意）
  - CCPA（加州）：必须有"Do Not Sell My Info"链接
  - 中国 PIPL：数据出境前需个人单独同意 / 备案
- **CDN / 静态资源**：
  - 用 Cloudflare / Akamai 全球 CDN 分发前端 bundle，但**不要**让用户 Personal Data 进 CDN 缓存
  - 字体 / 图片可全球缓存；用户头像、聊天图片只在所在 region 的对象存储
- **客服坐席侧**：
  - 海外坐席跨区访问国内系统：走专线 / VPN，不走公网
  - 数据访问审计（谁、何时、看了哪个用户的对话）

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「海外客服系统多区域部署：怎么选接入点？怎么过合规」时要把 海外客服系统多区域部 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，海外客服系统多区域部 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「海外客服系统多区域部署：怎么选接入点？怎么过合规」里当前按阶段替换更稳。

### 代码示例

```ts
const REGION = (window as any).__KAP_REGION__ || detectRegion();

function detectRegion(): 'cn' | 'sea' | 'us' | 'eu' {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (tz.startsWith('Asia/Shanghai') || tz.startsWith('Asia/Chongqing')) return 'cn';
  if (tz.startsWith('Asia/Singapore') || tz.startsWith('Asia/Bangkok')) return 'sea';
  if (tz.startsWith('America/')) return 'us';
  if (tz.startsWith('Europe/')) return 'eu';
  return 'sea';
}

const API_BASE = {
  cn: 'https://api.cn.example.com',
  sea: 'https://api.sea.example.com',
  us: 'https://api.us.example.com',
  eu: 'https://api.eu.example.com',
}[REGION];

function geoDNSConfig() {
  return {
    // GeoDNS：根据用户 IP 返回不同 A 记录
    'api.example.com': {
      cn: '203.0.113.10',
      sea: '203.0.113.20',
      us: '203.0.113.30',
      eu: '203.0.113.40',
    },
  };
}
```

### 常见误区

- 全球用一个 region —— 海外用户首屏 3-5s，IM 信令延迟 300ms+
- 把用户聊天记录跨境同步到国内做"数据分析" —— GDPR 罚单分分钟
- 前端把 region 写死成 cn —— 海外公司用户被卡墙
- CDN 缓存了带用户 token 的接口 —— 别人能拿到别人的数据

### 追问

- Cloudflare Workers / AWS Lambda@Edge 在海外 IM 接入层有什么应用
- 数据出境的 SCC（标准合同条款）是什么
- 移动端怎么在 App 启动时高效完成 region 检测（避免一开始连错 region）

### 延伸

- TikTok 的"Project Texas"（美区数据托管 Oracle）就是数据驻留典型案例
- 阿里云 / 腾讯云 / AWS / Cloudflare 都提供 Multi-Region 数据库（同步级别可调）

## intl-time-locale

title: 多时区 + 多语言客服会话：时间显示和消息排序怎么做不出错？
followups: [intl-time-locale-followup-1, intl-time-locale-followup-2, intl-time-locale-followup-3]
difficulty: 进阶
tags: [国际化, 时区, locale, 高频]

### 一句话

**存 UTC 时间戳 + 显示用户本地时区**；消息排序用服务端 seq 不要用时间戳；货币 / 日期 / 数字一律走 `Intl.*` API；语言用 BCP-47 标签。

### 题目

客服会话里坐席在中国（UTC+8），客户在德国（UTC+1），消息时间怎么显示？怎么处理多语言、货币、数字格式？

### 答案要点

- **时间存储**：服务端永远存 UTC ms（`Date.now()` / `new Date().toISOString()`），不要存任何带时区的字符串
- **时间显示**：
  - 客户端用 `Intl.DateTimeFormat(locale, { timeZone })` 转用户本地
  - 客服坐席侧默认用坐席本地，提供切换"按客户时区显示"
  - 相对时间（"5 分钟前"）适合最近 24h；超过显示绝对时间
- **消息排序**：用 **seq** 不要用时间戳——时钟漂移 / NTP 不同步会导致排序错乱
- **多语言**：
  - 用 BCP-47 标签：`zh-CN`、`zh-TW`、`en-US`、`de-DE`，不要用单 `zh` 或 `en`
  - i18n 资源按 lang 分文件懒加载；机器人回复也要按客户 lang 出
  - 服务端 emoji / system message 必须可翻译（结构化 + 翻译键，不要嵌死中文）
- **货币 / 数字**：
  - `Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })` —— 1.234,56 €
  - 同一个数字在 zh-CN 和 de-DE 写法完全不同（分隔符 / 小数点）
- **复数 / 性别**：英语单复数用 `Intl.PluralRules`，德语 / 阿拉伯语更复杂
- **RTL 布局**：阿拉伯语 / 希伯来语全 UI 镜像；用 `dir="rtl"` 而非自己 transform

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的答案必须覆盖空值、重复值、越界输入；漏掉任一边界都会让 多时区 结论失真。
- 失败场景：例如忽略极端输入规模，多时区 的复杂度会在高峰期失控，导致超时或 OOM；修复要改数据结构并做压测。
- 替代方案与取舍：可选更直观但复杂度更高的写法快速交付；当前在「多时区 + 多语言客服会话：时间显示和消息排序怎么做不出错」优先保证规模上限可控。

### 代码示例

```ts
const userLocale = navigator.language;
const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

function formatMessageTime(utcMs: number, locale = userLocale, tz = userTimeZone): string {
  const d = new Date(utcMs);
  const now = Date.now();
  const diff = now - utcMs;

  if (diff < 60_000) return new Intl.RelativeTimeFormat(locale).format(0, 'second');
  if (diff < 3600_000) {
    return new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(
      -Math.round(diff / 60_000),
      'minute',
    );
  }
  return new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

function formatPrice(amount: number, locale = userLocale, currency = 'USD'): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}

console.log(formatMessageTime(Date.now() - 5 * 60_000, 'de-DE', 'Europe/Berlin'));
console.log(formatPrice(1234.56, 'de-DE', 'EUR'));
console.log(formatPrice(1234.56, 'zh-CN', 'CNY'));
```

### 常见误区

- 服务端存 `'2026-05-07 14:00:00'` 这种字符串 —— 没时区信息，跨区直接错位
- 用 `new Date(str).toLocaleString()` 但服务端 / 客户端时区不一致 —— 同一个 UTC 显示不同
- i18n key 直接写中文 —— `t('确定')` 翻译表就乱
- 假设欧洲用户都用 `,` 做小数分隔符 —— 英国还是 `.`
- 把"星期一是一周第一天"假设全球通用 —— 美国把星期日当第一天

### 追问

- 怎么处理"夏令时" —— `Intl.*` 自动处理，自己别算
- 服务端日志时间用什么时区（永远 UTC）
- AI 机器人回复怎么按客户语言生成

### 延伸

- Date 已被弃用倾向，新代码考虑 `Temporal` API（已进入 stage 3）
- ICU MessageFormat 处理复数 / 性别 / 嵌套；FormatJS / vue-i18n 都基于它

## chat-perf-virtual-list

title: 海量消息聊天的虚拟列表怎么做？双向滚动 + 动态高度 + 贴底跟随
followups: [chat-perf-virtual-list-followup-1, chat-perf-virtual-list-followup-2, chat-perf-virtual-list-followup-3]
links: [27-data-platform-cases/big-table-virtualization, 21-interview-special/design-virtual-list]
difficulty: 资深
tags: [虚拟列表, 性能, 高频]

### 一句话

聊天虚拟列表难在**消息高度不固定 + 双向加载（向上拉历史会改变 scrollHeight）+ 新消息自动跟随但用户上滑时不打扰**——核心是用"已测高度缓存 + 锚点元素 + scrollAnchor 修正"。

### 题目

设计一个支持 1 万条历史消息的聊天虚拟列表：消息高度不固定（图片 / 卡片 / 文本）、向上拉历史、新消息自动跟随、用户上滑时不要被打断。

### 答案要点

- **可视区窗口**：只渲染"可视区 + 上下 5 屏 buffer"的消息（约 30-50 个 DOM 节点）
- **动态高度**：
  - 用 ResizeObserver 监听每个渲染节点；首次测量后写入 `heightCache.set(msgId, h)`
  - 没测过的高度用估算值（80px）占位
  - 总高度 = `Σ heightCache`，scroll 到 X 反推渲染哪几条（二分查找）
- **双向加载（关键）**：
  - 向上拉历史时 prepend 内容，浏览器 scrollTop 不会自动调整 → 看起来"页面跳了"
  - 解决：prepend 前记录 `oldScrollHeight`，prepend 后 `scrollTop += newScrollHeight - oldScrollHeight`
  - 现代方案：`overflow-anchor: auto` + 反向 flex（`flex-direction: column-reverse`）天然顶部锚定
- **贴底跟随**：
  - 监听 scroll，距底部 < 50px 视为"在底部"，新消息进来自动 scrollIntoView
  - 用户上滑离开底部时，新消息进来不自动滚，而是显示"3 条新消息 ↓"按钮
- **图片高度**：
  - 服务端下发 `width/height` 占位，立刻按比例渲染容器，避免图片加载完高度跳变
  - 缩略图先到 → 主图加载完替换，但容器尺寸不变
- **性能避雷**：
  - 不要 `key="index"`，要 `key="msg.msg_id"`，不然滑动时复用错乱
  - 不要在每条消息上挂 ResizeObserver 实例（开销大）—— 共享一个 RO，按 entry 区分

#### 标准补充（边界/失败/取舍）

- 界定条件：只有在 海量消息聊天的虚拟列 的瓶颈被数据证实、回归方案准备完成时，答案里的优化建议才可直接执行。
- 失败场景：例如主线程在首屏阶段执行重计算，海量消息聊天的虚拟列 指标会从可接受直接退化到用户可感知卡顿；修复要拆分任务并回归验证。
- 替代方案与取舍：可选一次性大重构追求极致性能，但交付风险高；当前对「海量消息聊天的虚拟列表怎么做？双向滚动 + 动态高度 + 贴底跟随」采用小步优化更稳。

### 代码示例

```ts
const heightCache = new Map<string, number>();
const ESTIMATE = 80;

function getHeight(id: string) {
  return heightCache.get(id) ?? ESTIMATE;
}

const sharedRO = new ResizeObserver((entries) => {
  for (const e of entries) {
    const id = (e.target as HTMLElement).dataset.msgId!;
    const h = e.contentRect.height;
    if (heightCache.get(id) !== h) {
      heightCache.set(id, h);
      requestAnimationFrame(() => recalcLayout());
    }
  }
});

function VirtualList({ items, onLoadMore }: { items: IMMessage[]; onLoadMore: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stickToBottom, setStickToBottom] = useState(true);
  const prevHeightRef = useRef(0);

  const onPrepend = () => {
    const c = containerRef.current!;
    const newH = c.scrollHeight;
    c.scrollTop += newH - prevHeightRef.current;
    prevHeightRef.current = newH;
  };

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const c = e.currentTarget;
    const distFromBottom = c.scrollHeight - c.scrollTop - c.clientHeight;
    setStickToBottom(distFromBottom < 50);
    if (c.scrollTop < 100) onLoadMore();
  };

  useEffect(() => {
    if (stickToBottom) {
      containerRef.current!.scrollTop = containerRef.current!.scrollHeight;
    }
  }, [items.length]);

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      style={{ overflowY: 'auto', height: '100%' }}
    >
      {items.map((m) => (
        <MessageItem key={m.msg_id} msg={m} ro={sharedRO} />
      ))}
    </div>
  );
}
```

### 常见误区

- 用 react-virtualized 的 List —— 它默认假设固定高度，聊天场景图片 / 卡片高度不一致
- 拉历史 prepend 后忘了修正 scrollTop，用户体验"页面 jump"
- 用户已经上滑到 200 条之前看老消息，新消息进来你给他强制滚到底
- 给每条消息 attach React.memo 但 props 是新对象（每次都 re-render）

### 追问

- 表情 hover、@ 提及、未读分割线这些层叠 UI 怎么和虚拟列表配合
- 虚拟列表 + 截图分享（导出长图）怎么做（先全量渲染再截）
- 移动端 iOS 惯性滚动 + virtual list 的卡顿排查

### 延伸

- TanStack Virtual / react-virtuoso / vue-virtual-scroller 都支持动态高度
- IntersectionObserver 也可以做简易"按可见性 lazy 渲染"，比 ResizeObserver 思路更简单

## kefu-monitoring

title: 客服系统的可观测性：消息丢失率 / 响应时延 / SLA 怎么监控？
followups: [kefu-monitoring-followup-1, kefu-monitoring-followup-2, kefu-monitoring-followup-3]
difficulty: 资深
tags: [监控, SLA, 可观测性, 高频]

### 一句话

**业务漏斗**（连接 → 发送 → 服务端 ack → 对端推送 → 对端 ack）每一步埋点 + 计算成功率；坐席侧追 FRT / ART / 解决率；前端 RUM + 后端链路追踪用同一个 trace_id 串起来。

### 题目

作为前端 owner，你要建一套客服系统的监控告警，关键指标有哪些？前端怎么埋点？怎么和后端链路追踪打通？

### 答案要点

- **核心可用性指标**：
  - **消息成功率** = 客户端发出 / 接收端 ack 收到，目标 > 99.95%
  - **消息时延** P50 / P99：发送到对端展示的时间，目标 P99 < 1.5s
  - **WebSocket 连接成功率** + **重连频次**：异常时立刻告警
  - **离线消息丢失率**：通过 sync 时本地最大 seq 和服务端给的 max_seq 对比
- **客服业务指标**（坐席视角）：
  - **FRT**（First Response Time）：坐席首次回复时长，目标 < 30s
  - **ART**（Average Response Time）：坐席平均响应时长
  - **AHT**（Average Handle Time）：会话平均处理时长
  - **CSAT**（Customer Satisfaction）：会话结束后用户评分
  - **解决率** = 一次性解决（不转单 / 不重开） / 总会话
- **前端埋点（RUM）**：
  - 消息发送：`emit({ event: 'msg.send.start', msg_id, conv, ts, trace_id })`
  - 服务端 ack：`emit({ event: 'msg.send.ack', msg_id, latency, trace_id })`
  - 对端展示：`emit({ event: 'msg.recv.shown', msg_id, latency, trace_id })`
  - 用 `sendBeacon` 或 fetch keepalive 发送，断网 / 关页面也不丢
- **链路追踪**：每条消息客户端生成 `trace_id`，HTTP / WS 上下行都带，后端用同一个 ID 写 Jaeger / SkyWalking / OpenTelemetry
- **告警**：
  - 5min 窗口内消息成功率 < 99% → P0 告警
  - 单坐席 FRT > 60s 持续 10 分钟 → 通知主管介入
  - WS 重连频次 > 5 次 / 用户 / 小时 → 排查接入点

#### 补充说明

- 面试中不要只停留在「客服系统的可观测性：消息丢失率 / 响应时延 / SLA 怎么监控？」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。
- 可以围绕 监控、SLA、可观测性、高频 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。
- 工程题要补团队协作、迁移策略、灰度发布、回滚预案和长期治理。
- 落地时建议给出验证路径：单测覆盖边界，集成测试覆盖主链路，线上通过日志、指标或灰度观察真实效果。
- 如果答案涉及兼容性、性能或安全，要主动说明默认方案、例外场景和回滚策略。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 客服系统的可观测性 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 客服系统的可观测性，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「客服系统的可观测性：消息丢失率 / 响应时延 / SLA 怎么监控」按阶段灰度，每阶段可验收可撤回。

### 代码示例

```ts
class IMTelemetry {
  private buffer: TelemetryEvent[] = [];
  private flushTimer?: number;

  emit(event: TelemetryEvent) {
    event.trace_id ??= crypto.randomUUID();
    event.ts ??= Date.now();
    this.buffer.push(event);
    if (this.buffer.length >= 20) this.flush();
    else this.flushTimer ??= window.setTimeout(() => this.flush(), 3000);
  }

  flush() {
    if (!this.buffer.length) return;
    const payload = JSON.stringify(this.buffer);
    this.buffer = [];
    clearTimeout(this.flushTimer);
    this.flushTimer = undefined;
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/rum', payload);
    } else {
      fetch('/rum', { method: 'POST', body: payload, keepalive: true });
    }
  }
}

const tele = new IMTelemetry();

function send(msg: IMMessage) {
  const trace_id = crypto.randomUUID();
  tele.emit({ event: 'msg.send.start', msg_id: msg.msg_id, conv: msg.conv_id, trace_id });
  return api.send({ ...msg, trace_id }).then((resp) => {
    tele.emit({
      event: 'msg.send.ack',
      msg_id: msg.msg_id,
      latency: Date.now() - msg.client_ts!,
      trace_id,
    });
    return resp;
  });
}

window.addEventListener('beforeunload', () => tele.flush());
```

### 常见误区

- 只看后端 QPS / latency，前端是黑盒——用户感知"卡了"但后端指标全正常
- 埋点用单条 fetch 同步发，关页面时全丢 —— 必须 sendBeacon / keepalive
- trace_id 客户端生成但 HTTP header 没透传 —— 后端串不起来
- 监控太多噪声告警，最后没人看；告警必须分级 + 收敛

### 追问

- 怎么定义"会话不健康"（消息丢失 + 长时间没响应 + 客户主动结束）
- 离线消息能否监控丢失率（怎么设计 ground truth）
- 海外坐席的监控数据要不要回传国内（合规）

### 延伸

- OpenTelemetry 已是事实标准，前后端用同一套 SDK 串起来
- Datadog RUM / Sentry Performance / 自研 SDK 各有取舍

## im-protocol-design-followup-1

title: 追问：结合真实业务约束，真要把「IM 消息协议怎么设计？关键字段有哪些」推到线上，你会如何围绕 IM 设计灰度节奏、回滚条件和迁移路径
difficulty: 进阶
tags: [IM, 协议, 高频, 追问]
parent: im-protocol-design

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「IM 消息协议怎么设计？关键字段有哪些」拆成可验证的小步骤，逐步替换高风险部分。

### 题目

如果面试官追问：结合真实业务约束，真要把「IM 消息协议怎么设计？关键字段有哪些」推到线上，你会如何围绕 IM 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：传输层：WebSocket（双向） + JSON 或 Protobuf；移动端弱网选 Protobuf 体积小一半
- 机制：分层：外层是 envelope（type / cmd / req_id / status / data），内层是业务 body；服务端可路由；msg_id：客户端预生成 UUID，用于去重 + 服务端 ack 回执
- 落地动作：回答「结合真实业务约束，真要把「IM 消息协议怎么设计？关键字段有哪些」推到线上，你会如何围绕 IM 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，真要把「IM 消息协议怎么设计？关键字段有哪些」推到线上，你会如何围绕 IM 设计灰度节奏、回滚条件和迁移路径」时要先定义 真要把 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，真要把 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 真要把 关键链路先收敛再替换。

#### 关键细节（可追问）

- 传输层：WebSocket（双向） + JSON 或 Protobuf；移动端弱网选 Protobuf 体积小一半
- 分层：外层是 envelope（type / cmd / req_id / status / data），内层是业务 body；服务端可路由
- msg_id：客户端预生成 UUID，用于去重 + 服务端 ack 回执

## im-protocol-design-followup-2

title: 追问：结合真实业务约束，当团队成熟度不一致时，你会如何围绕 IM 定义「IM 消息协议怎么设计？关键字段有哪些」的先后改造顺序
difficulty: 进阶
tags: [IM, 协议, 高频, 追问]
parent: im-protocol-design

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「IM 消息协议怎么设计？关键字段有哪些」拆成可验证的小步骤，逐步替换高风险部分。

### 题目

如果面试官追问：结合真实业务约束，当团队成熟度不一致时，你会如何围绕 IM 定义「IM 消息协议怎么设计？关键字段有哪些」的先后改造顺序？

### 答案要点

#### 标准回答（直接作答）

- 结论：传输层：WebSocket（双向） + JSON 或 Protobuf；移动端弱网选 Protobuf 体积小一半
- 机制：分层：外层是 envelope（type / cmd / req_id / status / data），内层是业务 body；服务端可路由；msg_id：客户端预生成 UUID，用于去重 + 服务端 ack 回执
- 落地动作：回答「结合真实业务约束，当团队成熟度不一致时，你会如何围绕 IM 定义「IM 消息协议怎么设计？关键字段有哪些」的先后改造顺序」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，当团队成熟度不一致时，你会如何围绕 IM 定义「IM 消息协议怎么设计？关键字段有哪些」的先后改造顺序」时要先定义 当团队成熟度不一致时 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，当团队成熟度不一致时 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 当团队成熟度不一致时 关键链路先收敛再替换。

#### 关键细节（可追问）

- 传输层：WebSocket（双向） + JSON 或 Protobuf；移动端弱网选 Protobuf 体积小一半
- 分层：外层是 envelope（type / cmd / req_id / status / data），内层是业务 body；服务端可路由
- msg_id：客户端预生成 UUID，用于去重 + 服务端 ack 回执

## im-protocol-design-followup-3

title: 追问：当团队评估「IM 消息协议怎么设计？关键字段有哪些」去留时，你会建议用哪些核心指标做决策
difficulty: 进阶
tags: [IM, 协议, 高频, 追问]
parent: im-protocol-design

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「IM 消息协议怎么设计？关键字段有哪些」不是只在理想输入下成立。；再补可观测指标：工程可维护性应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：当团队评估「IM 消息协议怎么设计？关键字段有哪些」去留时，你会建议用哪些核心指标做决策？

### 答案要点

#### 标准回答（直接作答）

- 结论：传输层：WebSocket（双向） + JSON 或 Protobuf；移动端弱网选 Protobuf 体积小一半
- 机制：分层：外层是 envelope（type / cmd / req_id / status / data），内层是业务 body；服务端可路由；msg_id：客户端预生成 UUID，用于去重 + 服务端 ack 回执
- 落地动作：回答「当团队评估「IM 消息协议怎么设计？关键字段有哪些」去留时，你会建议用哪些核心指标做决策」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 当团队评估 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 当团队评估，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「当团队评估「IM 消息协议怎么设计？关键字段有哪些」去留时，你会建议用哪些核心指标做决策」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 传输层：WebSocket（双向） + JSON 或 Protobuf；移动端弱网选 Protobuf 体积小一半
- 分层：外层是 envelope（type / cmd / req_id / status / data），内层是业务 body；服务端可路由
- msg_id：客户端预生成 UUID，用于去重 + 服务端 ack 回执

## websocket-heartbeat-reconnect-followup-1

title: 追问：在「长连接的心跳保活和断线重连怎么做」场景下，在弱网、代理、断连或服务端限流场景下，你会围绕 WebSocket 重点排查「长连接的心跳保活和断线重连怎么做」的哪些边界问题
difficulty: 进阶
tags: [WebSocket, 心跳, 重连, 高频, 追问]
parent: websocket-heartbeat-reconnect

### 一句话

先把链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。；弱网、重试和超时会放大「长连接的心跳保活和断线重连怎么做」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。。

### 题目

如果面试官追问：在「长连接的心跳保活和断线重连怎么做」场景下，在弱网、代理、断连或服务端限流场景下，你会围绕 WebSocket 重点排查「长连接的心跳保活和断线重连怎么做」的哪些边界问题？

### 答案要点

#### 标准回答（直接作答）

- 结论：为什么要心跳：NAT / 代理会在闲置时（一般 4-5 分钟）静默断开 TCP，应用层不感知；心跳让连接保持活跃，并能在第一时间感知断开
- 机制：客户端 setInterval 20-30s 发一个 {cmd: 'ping'}；服务端必须回 {cmd: 'pong'}；客户端记录 lastPongAt
- 落地动作：回答「在「长连接的心跳保活和断线重连怎么做」场景下，在弱网、代理、断连或服务端限流场景下，你会围绕 WebSocket 重点排查「长连接的心跳保活和断线重连怎么做」的哪些边界问题」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「长连接的心跳保活和断线重连怎么做」场景下，在弱网、代理、断连或服务端限流场景下，你会围绕 WebSocket 重点排查「长连接的心跳保活和断线重连怎么做」的哪些边界问题」时必须说明 长连接的心跳保活和断 在弱网、限流、断连三种场景下的处理差异，否则属于不完整答案。
- 失败场景：例如弱网重试未做幂等，长连接的心跳保活和断 请求会重复写入并造成状态错乱；修复需要补幂等键、指数退避和用户可见兜底提示。
- 替代方案与取舍：可选“失败就无限重试”，实现简单但会放大故障；当前在「在「长连接的心跳保活和断线重连怎么做」场景下，在弱网、代理、断连或服务端限流场景下，你会围绕 WebSocket 重点排查「长连接的心跳保活和断线重连怎么做」的哪些边界问题」里采用限次重试 + 降级。

#### 关键细节（可追问）

- 为什么要心跳：NAT / 代理会在闲置时（一般 4-5 分钟）静默断开 TCP，应用层不感知；心跳让连接保持活跃，并能在第一时间感知断开
- 客户端 setInterval 20-30s 发一个 {cmd: 'ping'}
- 服务端必须回 {cmd: 'pong'}；客户端记录 lastPongAt

## websocket-heartbeat-reconnect-followup-2

title: 追问：你会如何设计超时、重试、幂等和降级来保证链路可靠
difficulty: 进阶
tags: [WebSocket, 心跳, 重连, 高频, 追问]
parent: websocket-heartbeat-reconnect

### 一句话

先把链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。；弱网、重试和超时会放大「长连接的心跳保活和断线重连怎么做」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。。

### 题目

如果面试官追问：你会如何设计超时、重试、幂等和降级来保证链路可靠？

### 答案要点

#### 标准回答（直接作答）

- 结论：为什么要心跳：NAT / 代理会在闲置时（一般 4-5 分钟）静默断开 TCP，应用层不感知；心跳让连接保持活跃，并能在第一时间感知断开
- 机制：客户端 setInterval 20-30s 发一个 {cmd: 'ping'}；服务端必须回 {cmd: 'pong'}；客户端记录 lastPongAt
- 落地动作：回答「你会如何设计超时、重试、幂等和降级来保证链路可靠」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题默认 你会如何设计超时 链路已定义超时、重试和幂等规则；若服务端语义不稳定，先补协议契约再谈优化。
- 失败场景：例如网关限流时仍持续重试，你会如何设计超时 会放大故障并拖垮下游；应立即降级并限制重试窗口。
- 替代方案与取舍：也可吞掉错误换表面成功率，但定位成本极高；当前保留错误语义和回滚开关。

#### 关键细节（可追问）

- 为什么要心跳：NAT / 代理会在闲置时（一般 4-5 分钟）静默断开 TCP，应用层不感知；心跳让连接保持活跃，并能在第一时间感知断开
- 客户端 setInterval 20-30s 发一个 {cmd: 'ping'}
- 服务端必须回 {cmd: 'pong'}；客户端记录 lastPongAt

## websocket-heartbeat-reconnect-followup-3

title: 追问：如果要在线上证明这个方案稳定，你会看哪些日志和指标
difficulty: 进阶
tags: [WebSocket, 心跳, 重连, 高频, 追问]
parent: websocket-heartbeat-reconnect

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「长连接的心跳保活和断线重连怎么做」不是只在理想输入下成立。；再补可观测指标：链路可靠性应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：如果要在线上证明这个方案稳定，你会看哪些日志和指标？

### 答案要点

#### 标准回答（直接作答）

- 结论：为什么要心跳：NAT / 代理会在闲置时（一般 4-5 分钟）静默断开 TCP，应用层不感知；心跳让连接保持活跃，并能在第一时间感知断开
- 机制：客户端 setInterval 20-30s 发一个 {cmd: 'ping'}；服务端必须回 {cmd: 'pong'}；客户端记录 lastPongAt
- 落地动作：回答「如果要在线上证明这个方案稳定，你会看哪些日志和指标」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「如果要在线上证明这个方案稳定，你会看哪些日志和指标」时必须说明 方案稳定 在弱网、限流、断连三种场景下的处理差异，否则属于不完整答案。
- 失败场景：例如弱网重试未做幂等，方案稳定 请求会重复写入并造成状态错乱；修复需要补幂等键、指数退避和用户可见兜底提示。
- 替代方案与取舍：可选“失败就无限重试”，实现简单但会放大故障；当前在「如果要在线上证明这个方案稳定，你会看哪些日志和指标」里采用限次重试 + 降级。

#### 关键细节（可追问）

- 为什么要心跳：NAT / 代理会在闲置时（一般 4-5 分钟）静默断开 TCP，应用层不感知；心跳让连接保持活跃，并能在第一时间感知断开
- 客户端 setInterval 20-30s 发一个 {cmd: 'ping'}
- 服务端必须回 {cmd: 'pong'}；客户端记录 lastPongAt

## message-reliability-followup-1

title: 追问：在当前团队与业务约束下，当「消息可靠性（不丢、不重、有序）怎么保证」跨团队落地时，你会先确认哪些 IM 前置假设，避免后续返工
difficulty: 资深
tags: [IM, 可靠性, ack, 高频, 追问]
parent: message-reliability

### 一句话

先把链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。；弱网、重试和超时会放大「消息可靠性（不丢、不重、有序）怎么保证」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。。

### 题目

如果面试官追问：在当前团队与业务约束下，当「消息可靠性（不丢、不重、有序）怎么保证」跨团队落地时，你会先确认哪些 IM 前置假设，避免后续返工？

### 答案要点

#### 标准回答（直接作答）

- 结论：流程（三段 ack）：
- 机制：发送端 → 服务端：send(msg_id, payload)，服务端持久化后回 ack(msg_id, seq, ts)，发送端把"发送中"改为"已送达服务端"；服务端 → 接收端（在线）：直接推送
- 落地动作：回答「在当前团队与业务约束下，当「消息可靠性（不丢、不重、有序）怎么保证」跨团队落地时，你会先确认哪些 IM 前置假设，避免后续返工」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在当前团队与业务约束下，当「消息可靠性（不丢、不重、有序）怎么保证」跨团队落地时，你会先确认哪些 IM 前置假设，避免后续返工」时要把 消息可靠性 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，消息可靠性 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「在当前团队与业务约束下，当「消息可靠性（不丢、不重、有序）怎么保证」跨团队落地时，你会先确认哪些 IM 前置假设，避免后续返工」里当前按阶段替换更稳。

#### 关键细节（可追问）

- 流程（三段 ack）：
- 发送端 → 服务端：send(msg_id, payload)，服务端持久化后回 ack(msg_id, seq, ts)，发送端把"发送中"改为"已送达服务端"
- 服务端 → 接收端（在线）：直接推送

## unread-count-sync-followup-1

title: 追问：以「多端未读计数怎么做才不会"标已读了红点还在"」为例，在真实业务里落地「多端未读计数怎么做才不会"标已读了红点还在"」时，你会先排查哪些与 IM 相关的边界假设
difficulty: 进阶
tags: [IM, 未读, 多端同步, 高频, 追问]
parent: unread-count-sync

### 一句话

先界定「多端未读计数怎么做才不会"标已读了红点还在"」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。；原题中的关键点「核心原则：服务端是唯一真实来源。

### 题目

如果面试官追问：以「多端未读计数怎么做才不会"标已读了红点还在"」为例，在真实业务里落地「多端未读计数怎么做才不会"标已读了红点还在"」时，你会先排查哪些与 IM 相关的边界假设？

### 答案要点

#### 标准回答（直接作答）

- 结论：核心原则：服务端是唯一真实来源，客户端不要自己累加未读数
- 机制：数据模型：服务端为每个 (user, conv) 存一对值：max_seq（最新消息）、read_seq（已读到哪条）；未读数公式：unread = max_seq - read_seq（这条会话内）；总未读 = Σ 各会话未读
- 落地动作：回答「以「多端未读计数怎么做才不会"标已读了红点还在"」为例，在真实业务里落地「多端未读计数怎么做才不会"标已读了红点还在"」时，你会先排查哪些与 IM 相关的边界假设」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「以「多端未读计数怎么做才不会"标已读了红点还在"」为例，在真实业务里落地「多端未读计数怎么做才不会"标已读了红点还在"」时，你会先排查哪些与 IM 相关的边界假设」时要把 多端未读计数怎么做才 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，多端未读计数怎么做才 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「以「多端未读计数怎么做才不会"标已读了红点还在"」为例，在真实业务里落地「多端未读计数怎么做才不会"标已读了红点还在"」时，你会先排查哪些与 IM 相关的边界假设」里当前按阶段替换更稳。

#### 关键细节（可追问）

- 核心原则：服务端是唯一真实来源，客户端不要自己累加未读数
- 数据模型：服务端为每个 (user, conv) 存一对值：max_seq（最新消息）、read_seq（已读到哪条）
- 未读数公式：unread = max_seq - read_seq（这条会话内）；总未读 = Σ 各会话未读

## message-pagination-history-followup-1

title: 追问：在当前团队与业务约束下，你会先看哪些与 IM 相关的指标来判断「历史消息分页和会话首屏加载怎么设计」是不是当前性能瓶颈
difficulty: 进阶
tags: [IM, 分页, 缓存, 高频, 追问]
parent: message-pagination-history

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「历史消息分页和会话首屏加载怎么设计」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：在当前团队与业务约束下，你会先看哪些与 IM 相关的指标来判断「历史消息分页和会话首屏加载怎么设计」是不是当前性能瓶颈？

### 答案要点

#### 标准回答（直接作答）

- 结论：本地 IndexedDB 按 conv_id + seq desc 取最后 30 条 → 立刻渲染（< 50ms 上屏）
- 机制：同时发请求 getMessages(conv, after_seq=本地最大seq) 拉离线期间的新消息；把新消息合并进列表，自动跟随到底部（除非用户已上滑）
- 落地动作：回答「在当前团队与业务约束下，你会先看哪些与 IM 相关的指标来判断「历史消息分页和会话首屏加载怎么设计」是不是当前性能瓶颈」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：只有在 你会先看哪些与 的瓶颈被数据证实、回归方案准备完成时，答案里的优化建议才可直接执行。
- 失败场景：例如主线程在首屏阶段执行重计算，你会先看哪些与 指标会从可接受直接退化到用户可感知卡顿；修复要拆分任务并回归验证。
- 替代方案与取舍：可选一次性大重构追求极致性能，但交付风险高；当前对「在当前团队与业务约束下，你会先看哪些与 IM 相关的指标来判断「历史消息分页和会话首屏加载怎么设计」是不是当前性能瓶颈」采用小步优化更稳。

#### 关键细节（可追问）

- 本地 IndexedDB 按 conv_id + seq desc 取最后 30 条 → 立刻渲染（< 50ms 上屏）
- 同时发请求 getMessages(conv, after_seq=本地最大seq) 拉离线期间的新消息
- 把新消息合并进列表，自动跟随到底部（除非用户已上滑）

## message-pagination-history-followup-2

title: 追问：你会怎样验证「历史消息分页和会话首屏加载怎么设计」的优化收益在真实设备和真实网络下也成立
difficulty: 进阶
tags: [IM, 分页, 缓存, 高频, 追问]
parent: message-pagination-history

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「历史消息分页和会话首屏加载怎么设计」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：你会怎样验证「历史消息分页和会话首屏加载怎么设计」的优化收益在真实设备和真实网络下也成立？

### 答案要点

#### 标准回答（直接作答）

- 结论：本地 IndexedDB 按 conv_id + seq desc 取最后 30 条 → 立刻渲染（< 50ms 上屏）
- 机制：同时发请求 getMessages(conv, after_seq=本地最大seq) 拉离线期间的新消息；把新消息合并进列表，自动跟随到底部（除非用户已上滑）
- 落地动作：回答「你会怎样验证「历史消息分页和会话首屏加载怎么设计」的优化收益在真实设备和真实网络下也成立」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：只有在 你会怎样验证 的瓶颈被数据证实、回归方案准备完成时，答案里的优化建议才可直接执行。
- 失败场景：例如主线程在首屏阶段执行重计算，你会怎样验证 指标会从可接受直接退化到用户可感知卡顿；修复要拆分任务并回归验证。
- 替代方案与取舍：可选一次性大重构追求极致性能，但交付风险高；当前对「你会怎样验证「历史消息分页和会话首屏加载怎么设计」的优化收益在真实设备和真实网络下也成立」采用小步优化更稳。

#### 关键细节（可追问）

- 本地 IndexedDB 按 conv_id + seq desc 取最后 30 条 → 立刻渲染（< 50ms 上屏）
- 同时发请求 getMessages(conv, after_seq=本地最大seq) 拉离线期间的新消息
- 把新消息合并进列表，自动跟随到底部（除非用户已上滑）

## message-pagination-history-followup-3

title: 追问：以「历史消息分页和会话首屏加载怎么设计」为例，你会如何给「历史消息分页和会话首屏加载怎么设计」算一笔账：短期收益能不能覆盖后续在 IM 上的维护成本
difficulty: 进阶
tags: [IM, 分页, 缓存, 高频, 追问]
parent: message-pagination-history

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「历史消息分页和会话首屏加载怎么设计」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。；如果指标没有改善。

### 题目

如果面试官追问：以「历史消息分页和会话首屏加载怎么设计」为例，你会如何给「历史消息分页和会话首屏加载怎么设计」算一笔账：短期收益能不能覆盖后续在 IM 上的维护成本？

### 答案要点

#### 标准回答（直接作答）

- 结论：本地 IndexedDB 按 conv_id + seq desc 取最后 30 条 → 立刻渲染（< 50ms 上屏）
- 机制：同时发请求 getMessages(conv, after_seq=本地最大seq) 拉离线期间的新消息；把新消息合并进列表，自动跟随到底部（除非用户已上滑）
- 落地动作：回答「以「历史消息分页和会话首屏加载怎么设计」为例，你会如何给「历史消息分页和会话首屏加载怎么设计」算一笔账：短期收益能不能覆盖后续在 IM 上的维护成本」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「以「历史消息分页和会话首屏加载怎么设计」为例，你会如何给「历史消息分页和会话首屏加载怎么设计」算一笔账：短期收益能不能覆盖后续在 IM 上的维护成本」必须先给 历史消息分页和会话首 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。
- 失败场景：例如缓存命中假设不成立，历史消息分页和会话首 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。
- 替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 历史消息分页和会话首 的计算与缓存路径。

#### 关键细节（可追问）

- 本地 IndexedDB 按 conv_id + seq desc 取最后 30 条 → 立刻渲染（< 50ms 上屏）
- 同时发请求 getMessages(conv, after_seq=本地最大seq) 拉离线期间的新消息
- 把新消息合并进列表，自动跟随到底部（除非用户已上滑）

## typing-presence-indicator-followup-1

title: 追问：结合真实业务约束，围绕「"对方正在输入" / 在线状态 / 已读回执 高频信令怎么做」做方案评审时，哪些 IM 边界输入最容易导致结论失真
difficulty: 进阶
tags: [IM, presence, 已读, 高频, 追问]
parent: typing-presence-indicator

### 一句话

先界定「"对方正在输入" / 在线状态 / 已读回执 高频信令怎么做」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：结合真实业务约束，围绕「"对方正在输入" / 在线状态 / 已读回执 高频信令怎么做」做方案评审时，哪些 IM 边界输入最容易导致结论失真？

### 答案要点

#### 标准回答（直接作答）

- 结论：分层：核心消息（必达）、业务事件（必达，群操作 / 撤回）、信令（可丢，typing / presence）
- 机制：信令特点：状态而非事件——丢一两次没关系，下次还能补上；不能压垮服务端；输入框触发 oninput 时 throttle(emitTyping, 2000)
- 落地动作：回答「结合真实业务约束，围绕「"对方正在输入" / 在线状态 / 已读回执 高频信令怎么做」做方案评审时，哪些 IM 边界输入最容易导致结论失真」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「分层：核心消息（必达）、业务事件（必达，群操作 / 撤回）、信令（可丢，typing / presence）」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「信令特点：状态而非事件——丢一两次没关系，下次还能补上；不能压垮服务端」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「结合真实业务约束，围绕「"对方正在输入" / 在线状态 / 已读回执 高频信令怎么做」做方案评审时，哪些 IM 边界输入最容易导致结论失真」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- 分层：核心消息（必达）、业务事件（必达，群操作 / 撤回）、信令（可丢，typing / presence）
- 信令特点：状态而非事件——丢一两次没关系，下次还能补上；不能压垮服务端
- 输入框触发 oninput 时 throttle(emitTyping, 2000)

## chat-rich-text-safe-render-followup-1

title: 追问：在当前团队与业务约束下，如果要评审「聊天消息支持富文本（链接 / 表情 / @ / 卡片 / 图片），怎么渲染才安全」在 IM 维度的安全方案，你会如何划分客户端与服务端责任边界
difficulty: 资深
tags: [IM, XSS, 富文本, 安全, 追问]
parent: chat-rich-text-safe-render

### 一句话

先画清信任边界：哪些输入来自用户、第三方或模型，哪些校验必须在服务端完成。；证明没有被绕过要靠攻击样例、审计日志、告警阈值和最小权限，而不是只说前端做了过滤。；一旦发现异常，要能降级到只读、禁用高危能力、刷新凭证或触发人工审核。

### 题目

如果面试官追问：在当前团队与业务约束下，如果要评审「聊天消息支持富文本（链接 / 表情 / @ / 卡片 / 图片），怎么渲染才安全」在 IM 维度的安全方案，你会如何划分客户端与服务端责任边界？

### 答案要点

#### 标准回答（直接作答）

- 结论：首选方案：结构化 payload（不是 HTML）
- 机制：服务端只下发结构化数据：{ text: '你好 @张三', entities: [{ type: 'mention', offset: 3, len: 3, user_id: 'u1' }] }；客户端按 entity 渲染：text -> 纯文本节点，mention -> @用户组件，link -> 可点击链接组件
- 落地动作：回答「在当前团队与业务约束下，如果要评审「聊天消息支持富文本（链接 / 表情 / @ / 卡片 / 图片），怎么渲染才安全」在 IM 维度的安全方案，你会如何划分客户端与服务端责任边界」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在当前团队与业务约束下，如果要评审「聊天消息支持富文本（链接 / 表情 / @ / 卡片 / 图片），怎么渲染才安全」在 IM 维度的安全方案，你会如何划分客户端与服务端责任边界」时要先确认 聊天消息支持富文本 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，聊天消息支持富文本 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 聊天消息支持富文本 链路分层收口再逐步统一。

#### 关键细节（可追问）

- 首选方案：结构化 payload（不是 HTML）
- 服务端只下发结构化数据：{ text: '你好 @张三', entities: [{ type: 'mention', offset: 3, len: 3, user_id: 'u1' }] }
- 客户端按 entity 渲染：text -> 纯文本节点，mention -> @用户组件，link -> 可点击链接组件

## chat-rich-text-safe-render-followup-2

title: 追问：你会如何证明「聊天消息支持富文本（链接 / 表情 / @ / 卡片 / 图片），怎么渲染才安全」的安全方案没有被绕过，并持续监控异常攻击流量
difficulty: 资深
tags: [IM, XSS, 富文本, 安全, 追问]
parent: chat-rich-text-safe-render

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「聊天消息支持富文本（链接 / 表情 / @ / 卡片 / 图片），怎么渲染才安全」不是只在理想输入下成立。。

### 题目

如果面试官追问：你会如何证明「聊天消息支持富文本（链接 / 表情 / @ / 卡片 / 图片），怎么渲染才安全」的安全方案没有被绕过，并持续监控异常攻击流量？

### 答案要点

#### 标准回答（直接作答）

- 结论：首选方案：结构化 payload（不是 HTML）
- 机制：服务端只下发结构化数据：{ text: '你好 @张三', entities: [{ type: 'mention', offset: 3, len: 3, user_id: 'u1' }] }；客户端按 entity 渲染：text -> 纯文本节点，mention -> @用户组件，link -> 可点击链接组件
- 落地动作：回答「你会如何证明「聊天消息支持富文本（链接 / 表情 / @ / 卡片 / 图片），怎么渲染才安全」的安全方案没有被绕过，并持续监控异常攻击流量」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「你会如何证明「聊天消息支持富文本（链接 / 表情 / @ / 卡片 / 图片），怎么渲染才安全」的安全方案没有被绕过，并持续监控异常攻击流量」时要先确认 你会如何证明 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，你会如何证明 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 你会如何证明 链路分层收口再逐步统一。

#### 关键细节（可追问）

- 首选方案：结构化 payload（不是 HTML）
- 服务端只下发结构化数据：{ text: '你好 @张三', entities: [{ type: 'mention', offset: 3, len: 3, user_id: 'u1' }] }
- 客户端按 entity 渲染：text -> 纯文本节点，mention -> @用户组件，link -> 可点击链接组件

## chat-rich-text-safe-render-followup-3

title: 追问：如果「聊天消息支持富文本（链接 / 表情 / @ / 卡片 / 图片），怎么渲染才安全」安全策略影响用户路径，你会如何平衡风险控制与体验损耗
difficulty: 资深
tags: [IM, XSS, 富文本, 安全, 追问]
parent: chat-rich-text-safe-render

### 一句话

规模变大后先重新评估瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果 安全边界 的收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。；答案里要给出取舍边界：小团队/低流量怎么做，复杂业务/多端协作时又需要补哪些治理。

### 题目

如果面试官追问：如果「聊天消息支持富文本（链接 / 表情 / @ / 卡片 / 图片），怎么渲染才安全」安全策略影响用户路径，你会如何平衡风险控制与体验损耗？

### 答案要点

#### 标准回答（直接作答）

- 结论：首选方案：结构化 payload（不是 HTML）
- 机制：服务端只下发结构化数据：{ text: '你好 @张三', entities: [{ type: 'mention', offset: 3, len: 3, user_id: 'u1' }] }；客户端按 entity 渲染：text -> 纯文本节点，mention -> @用户组件，link -> 可点击链接组件
- 落地动作：回答「如果「聊天消息支持富文本（链接 / 表情 / @ / 卡片 / 图片），怎么渲染才安全」安全策略影响用户路径，你会如何平衡风险控制与体验损耗」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 聊天消息支持富文本 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，聊天消息支持富文本 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「如果「聊天消息支持富文本（链接 / 表情 / @ / 卡片 / 图片），怎么渲染才安全」安全策略影响用户路径，你会如何平衡风险控制与体验损耗」风险不足；当前优先服务端强校验，因为可审计、可回滚。

#### 关键细节（可追问）

- 首选方案：结构化 payload（不是 HTML）
- 服务端只下发结构化数据：{ text: '你好 @张三', entities: [{ type: 'mention', offset: 3, len: 3, user_id: 'u1' }] }
- 客户端按 entity 渲染：text -> 纯文本节点，mention -> @用户组件，link -> 可点击链接组件

## chat-attachment-upload-followup-1

title: 追问：在当前团队与业务约束下，真把「客服聊天的文件 / 图片上传：断点续传 + 缩略图 + 安全检查」放到生产环境后，你会如何围绕 上传 划清信任边界并安排服务端兜底
difficulty: 资深
tags: [上传, 文件, 断点续传, 安全, 追问]
parent: chat-attachment-upload

### 一句话

先画清信任边界：哪些输入来自用户、第三方或模型，哪些校验必须在服务端完成。；证明没有被绕过要靠攻击样例、审计日志、告警阈值和最小权限，而不是只说前端做了过滤。；一旦发现异常，要能降级到只读、禁用高危能力、刷新凭证或触发人工审核。

### 题目

如果面试官追问：在当前团队与业务约束下，真把「客服聊天的文件 / 图片上传：断点续传 + 缩略图 + 安全检查」放到生产环境后，你会如何围绕 上传 划清信任边界并安排服务端兜底？

### 答案要点

#### 标准回答（直接作答）

- 结论：前端切片：File.slice(start, end) 切成 5MB 一片，串行 / 并发上传（推荐 3-5 个并发）
- 机制：客户端先发 prepareUpload({ name, size, md5 }) —— 服务端按 md5 查是否已有 → "秒传"；没有就返回 upload_id + 临时 STS（OSS 直传凭证）
- 落地动作：回答「在当前团队与业务约束下，真把「客服聊天的文件 / 图片上传：断点续传 + 缩略图 + 安全检查」放到生产环境后，你会如何围绕 上传 划清信任边界并安排服务端兜底」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题成立前提是 真把 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。
- 失败场景：例如把未授权请求当成可信输入，真把 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。
- 替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「在当前团队与业务约束下，真把「客服聊天的文件 / 图片上传：断点续传 + 缩略图 + 安全检查」放到生产环境后，你会如何围绕 上传 划清信任边界并安排服务端兜底」风险不足；当前优先服务端强校验，因为可审计、可回滚。

#### 关键细节（可追问）

- 前端切片：File.slice(start, end) 切成 5MB 一片，串行 / 并发上传（推荐 3-5 个并发）
- 客户端先发 prepareUpload({ name, size, md5 }) —— 服务端按 md5 查是否已有 → "秒传"
- 没有就返回 upload_id + 临时 STS（OSS 直传凭证）

## chat-attachment-upload-followup-2

title: 追问：你会如何证明「客服聊天的文件 / 图片上传：断点续传 + 缩略图 + 安全检查」的安全方案没有被绕过，并持续监控异常攻击流量
difficulty: 资深
tags: [上传, 文件, 断点续传, 安全, 追问]
parent: chat-attachment-upload

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「客服聊天的文件 / 图片上传：断点续传 + 缩略图 + 安全检查」不是只在理想输入下成立。；再补可观测指标：安全边界应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。。

### 题目

如果面试官追问：你会如何证明「客服聊天的文件 / 图片上传：断点续传 + 缩略图 + 安全检查」的安全方案没有被绕过，并持续监控异常攻击流量？

### 答案要点

#### 标准回答（直接作答）

- 结论：前端切片：File.slice(start, end) 切成 5MB 一片，串行 / 并发上传（推荐 3-5 个并发）
- 机制：客户端先发 prepareUpload({ name, size, md5 }) —— 服务端按 md5 查是否已有 → "秒传"；没有就返回 upload_id + 临时 STS（OSS 直传凭证）
- 落地动作：回答「你会如何证明「客服聊天的文件 / 图片上传：断点续传 + 缩略图 + 安全检查」的安全方案没有被绕过，并持续监控异常攻击流量」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「你会如何证明「客服聊天的文件 / 图片上传：断点续传 + 缩略图 + 安全检查」的安全方案没有被绕过，并持续监控异常攻击流量」时要先确认 你会如何证明 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，你会如何证明 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 你会如何证明 链路分层收口再逐步统一。

#### 关键细节（可追问）

- 前端切片：File.slice(start, end) 切成 5MB 一片，串行 / 并发上传（推荐 3-5 个并发）
- 客户端先发 prepareUpload({ name, size, md5 }) —— 服务端按 md5 查是否已有 → "秒传"
- 没有就返回 upload_id + 临时 STS（OSS 直传凭证）

## chat-attachment-upload-followup-3

title: 追问：从工程落地角度看，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 上传 给「客服聊天的文件 / 图片上传：断点续传 + 缩略图 + 安全检查」排优先级
difficulty: 资深
tags: [上传, 文件, 断点续传, 安全, 追问]
parent: chat-attachment-upload

### 一句话

规模变大后先重新评估瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果 安全边界 的收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。；答案里要给出取舍边界：小团队/低流量怎么做，复杂业务/多端协作时又需要补哪些治理。

### 题目

如果面试官追问：从工程落地角度看，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 上传 给「客服聊天的文件 / 图片上传：断点续传 + 缩略图 + 安全检查」排优先级？

### 答案要点

#### 标准回答（直接作答）

- 结论：前端切片：File.slice(start, end) 切成 5MB 一片，串行 / 并发上传（推荐 3-5 个并发）
- 机制：客户端先发 prepareUpload({ name, size, md5 }) —— 服务端按 md5 查是否已有 → "秒传"；没有就返回 upload_id + 临时 STS（OSS 直传凭证）
- 落地动作：回答「从工程落地角度看，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 上传 给「客服聊天的文件 / 图片上传：断点续传 + 缩略图 + 安全检查」排优先级」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「从工程落地角度看，当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 上传 给「客服聊天的文件 / 图片上传：断点续传 + 缩略图 + 安全检查」排优先级」时要先确认 从工程落地角度看 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。
- 失败场景：例如第三方脚本被篡改后仍执行，从工程落地角度看 链路会出现高危注入；应立刻切回保守策略并补完整性校验。
- 替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 从工程落地角度看 链路分层收口再逐步统一。

#### 关键细节（可追问）

- 前端切片：File.slice(start, end) 切成 5MB 一片，串行 / 并发上传（推荐 3-5 个并发）
- 客户端先发 prepareUpload({ name, size, md5 }) —— 服务端按 md5 查是否已有 → "秒传"
- 没有就返回 upload_id + 临时 STS（OSS 直传凭证）

## customer-service-routing-followup-1

title: 追问：真要把「智能客服路由：机器人优先 / 转人工 / 排队 / 坐席分配 怎么设计」推到线上，你会如何围绕 客服 设计灰度节奏、回滚条件和迁移路径
difficulty: 资深
tags: [客服, 路由, 调度, 高频, 追问]
parent: customer-service-routing

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写。

### 题目

如果面试官追问：真要把「智能客服路由：机器人优先 / 转人工 / 排队 / 坐席分配 怎么设计」推到线上，你会如何围绕 客服 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 标准回答（直接作答）

- 结论：会话状态机：new → bot → queueing → assigned → closed，转换由服务端驱动，前端只看 conv.status 和 conv.assignee
- 机制：进入会话先走"自助分流"卡片（账号问题 / 退款 / 投诉…）；LLM + RAG 命中知识库回答；高置信度直接答，低置信度提示"是否需要人工"
- 落地动作：回答「真要把「智能客服路由：机器人优先 / 转人工 / 排队 / 坐席分配 怎么设计」推到线上，你会如何围绕 客服 设计灰度节奏、回滚条件和迁移路径」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 真要把 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 真要把，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「真要把「智能客服路由：机器人优先 / 转人工 / 排队 / 坐席分配 怎么设计」推到线上，你会如何围绕 客服 设计灰度节奏、回滚条件和迁移路径」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 会话状态机：new → bot → queueing → assigned → closed，转换由服务端驱动，前端只看 conv.status 和 conv.assignee
- 进入会话先走"自助分流"卡片（账号问题 / 退款 / 投诉…）
- LLM + RAG 命中知识库回答；高置信度直接答，低置信度提示"是否需要人工"

## customer-service-routing-followup-2

title: 追问：在「智能客服路由：机器人优先 / 转人工 / 排队 / 坐席分配 怎么设计」场景下，你会怎样围绕 客服 拆分「智能客服路由：机器人优先 / 转人工 / 排队 / 坐席分配 怎么设计」的推进节奏，兼顾短期交付和长期治理
difficulty: 资深
tags: [客服, 路由, 调度, 高频, 追问]
parent: customer-service-routing

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写。

### 题目

如果面试官追问：在「智能客服路由：机器人优先 / 转人工 / 排队 / 坐席分配 怎么设计」场景下，你会怎样围绕 客服 拆分「智能客服路由：机器人优先 / 转人工 / 排队 / 坐席分配 怎么设计」的推进节奏，兼顾短期交付和长期治理？

### 答案要点

#### 标准回答（直接作答）

- 结论：会话状态机：new → bot → queueing → assigned → closed，转换由服务端驱动，前端只看 conv.status 和 conv.assignee
- 机制：进入会话先走"自助分流"卡片（账号问题 / 退款 / 投诉…）；LLM + RAG 命中知识库回答；高置信度直接答，低置信度提示"是否需要人工"
- 落地动作：回答「在「智能客服路由：机器人优先 / 转人工 / 排队 / 坐席分配 怎么设计」场景下，你会怎样围绕 客服 拆分「智能客服路由：机器人优先 / 转人工 / 排队 / 坐席分配 怎么设计」的推进节奏，兼顾短期交付和长期治理」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在「智能客服路由：机器人优先 / 转人工 / 排队 / 坐席分配 怎么设计」场景下，你会怎样围绕 客服 拆分「智能客服路由：机器人优先 / 转人工 / 排队 / 坐席分配 怎么设计」的推进节奏，兼顾短期交付和长期治理」时要先定义 智能客服路由 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，智能客服路由 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 智能客服路由 关键链路先收敛再替换。

#### 关键细节（可追问）

- 会话状态机：new → bot → queueing → assigned → closed，转换由服务端驱动，前端只看 conv.status 和 conv.assignee
- 进入会话先走"自助分流"卡片（账号问题 / 退款 / 投诉…）
- LLM + RAG 命中知识库回答；高置信度直接答，低置信度提示"是否需要人工"

## customer-service-routing-followup-3

title: 追问：在「智能客服路由：机器人优先 / 转人工 / 排队 / 坐席分配 怎么设计」场景下，为了判断「智能客服路由：机器人优先 / 转人工 / 排队 / 坐席分配 怎么设计」是否可持续，你会追踪哪些稳定性和效率指标
difficulty: 资深
tags: [客服, 路由, 调度, 高频, 追问]
parent: customer-service-routing

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「智能客服路由：机器人优先 / 转人工 / 排队 / 坐席分配 怎么设计」不是只在理想输入下成立。；再补可观测指标：工程可维护性应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。。

### 题目

如果面试官追问：在「智能客服路由：机器人优先 / 转人工 / 排队 / 坐席分配 怎么设计」场景下，为了判断「智能客服路由：机器人优先 / 转人工 / 排队 / 坐席分配 怎么设计」是否可持续，你会追踪哪些稳定性和效率指标？

### 答案要点

#### 标准回答（直接作答）

- 结论：会话状态机：new → bot → queueing → assigned → closed，转换由服务端驱动，前端只看 conv.status 和 conv.assignee
- 机制：进入会话先走"自助分流"卡片（账号问题 / 退款 / 投诉…）；LLM + RAG 命中知识库回答；高置信度直接答，低置信度提示"是否需要人工"
- 落地动作：回答「在「智能客服路由：机器人优先 / 转人工 / 排队 / 坐席分配 怎么设计」场景下，为了判断「智能客服路由：机器人优先 / 转人工 / 排队 / 坐席分配 怎么设计」是否可持续，你会追踪哪些稳定性和效率指标」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 智能客服路由 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 智能客服路由，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「在「智能客服路由：机器人优先 / 转人工 / 排队 / 坐席分配 怎么设计」场景下，为了判断「智能客服路由：机器人优先 / 转人工 / 排队 / 坐席分配 怎么设计」是否可持续，你会追踪哪些稳定性和效率指标」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 会话状态机：new → bot → queueing → assigned → closed，转换由服务端驱动，前端只看 conv.status 和 conv.assignee
- 进入会话先走"自助分流"卡片（账号问题 / 退款 / 投诉…）
- LLM + RAG 命中知识库回答；高置信度直接答，低置信度提示"是否需要人工"

## e2ee-web-crypto-followup-1

title: 追问：如果把「端到端加密的客服 IM 怎么实现？Web Crypto API 实战」放到真实业务里，你会如何划分信任边界和服务端兜底
difficulty: 资深
tags: [E2EE, 加密, WebCrypto, 高频, 追问]
parent: e2ee-web-crypto

### 一句话

先画清信任边界：哪些输入来自用户、第三方或模型，哪些校验必须在服务端完成。；证明没有被绕过要靠攻击样例、审计日志、告警阈值和最小权限，而不是只说前端做了过滤。；一旦发现异常，要能降级到只读、禁用高危能力、刷新凭证或触发人工审核。

### 题目

如果面试官追问：如果把「端到端加密的客服 IM 怎么实现？Web Crypto API 实战」放到真实业务里，你会如何划分信任边界和服务端兜底？

### 答案要点

#### 标准回答（直接作答）

- 结论：每个用户启动时本地生成 ECDH P-256 密钥对，私钥存 IndexedDB（不可导出），公钥上传服务端
- 机制：两人会话开始时各自取对方公钥 + 自己私钥 → ECDH → 共享密钥 → HKDF 派生 → AES 密钥；AES-GCM（对称、自带认证）+ 每条消息一个 12 byte 随机 IV
- 落地动作：回答「如果把「端到端加密的客服 IM 怎么实现？Web Crypto API 实战」放到真实业务里，你会如何划分信任边界和服务端兜底」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「如果把「端到端加密的客服 IM 怎么实现？Web Crypto API 实战」放到真实业务里，你会如何划分信任边界和服务端兜底」时先约定 端到端加密的客服 的输入输出契约、异常输入处理和边界行为（如取消、重入、幂等），否则实现不算完整。
- 失败场景：例如 端到端加密的客服 实现忽略 this/参数透传，线上会出现行为与预期不一致；应补调用语义测试并明确默认行为。
- 替代方案与取舍：也可只给伪代码说明思路，但可靠性细节会缺失；当前给可运行实现并补异常路径更符合资深标准。

#### 关键细节（可追问）

- 每个用户启动时本地生成 ECDH P-256 密钥对，私钥存 IndexedDB（不可导出），公钥上传服务端
- 两人会话开始时各自取对方公钥 + 自己私钥 → ECDH → 共享密钥 → HKDF 派生 → AES 密钥
- AES-GCM（对称、自带认证）+ 每条消息一个 12 byte 随机 IV

## e2ee-web-crypto-followup-2

title: 追问：从工程落地角度看，如果要审计「端到端加密的客服 IM 怎么实现？Web Crypto API 实战」安全性，你会用哪些证据证明方案不可轻易绕过
difficulty: 资深
tags: [E2EE, 加密, WebCrypto, 高频, 追问]
parent: e2ee-web-crypto

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「端到端加密的客服 IM 怎么实现？Web Crypto API 实战」不是只在理想输入下成立。；再补可观测指标：安全边界应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。。

### 题目

如果面试官追问：从工程落地角度看，如果要审计「端到端加密的客服 IM 怎么实现？Web Crypto API 实战」安全性，你会用哪些证据证明方案不可轻易绕过？

### 答案要点

#### 标准回答（直接作答）

- 结论：每个用户启动时本地生成 ECDH P-256 密钥对，私钥存 IndexedDB（不可导出），公钥上传服务端
- 机制：两人会话开始时各自取对方公钥 + 自己私钥 → ECDH → 共享密钥 → HKDF 派生 → AES 密钥；AES-GCM（对称、自带认证）+ 每条消息一个 12 byte 随机 IV
- 落地动作：回答「从工程落地角度看，如果要审计「端到端加密的客服 IM 怎么实现？Web Crypto API 实战」安全性，你会用哪些证据证明方案不可轻易绕过」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题要先说清 从工程落地角度看 的函数签名、时序语义和资源释放策略；如果这些口径不统一，代码再长也不是标准答案。
- 失败场景：例如 从工程落地角度看 实现里定时器或订阅未正确释放，连续操作后会出现重复执行或内存泄漏；修复要补清理逻辑和回归用例。
- 替代方案与取舍：可直接引入成熟库快速上线，但在「从工程落地角度看，如果要审计「端到端加密的客服 IM 怎么实现？Web Crypto API 实战」安全性，你会用哪些证据证明方案不可轻易绕过」这题里仍要讲清底层语义；当前保留手写版本便于解释边界与调试。

#### 关键细节（可追问）

- 每个用户启动时本地生成 ECDH P-256 密钥对，私钥存 IndexedDB（不可导出），公钥上传服务端
- 两人会话开始时各自取对方公钥 + 自己私钥 → ECDH → 共享密钥 → HKDF 派生 → AES 密钥
- AES-GCM（对称、自带认证）+ 每条消息一个 12 byte 随机 IV

## e2ee-web-crypto-followup-3

title: 追问：当「端到端加密的客服 IM 怎么实现？Web Crypto API 实战」需要在安全与交付速度之间权衡时，你会优先守住哪些底线
difficulty: 资深
tags: [E2EE, 加密, WebCrypto, 高频, 追问]
parent: e2ee-web-crypto

### 一句话

规模变大后先重新评估瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果 安全边界 的收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。；答案里要给出取舍边界：小团队/低流量怎么做，复杂业务/多端协作时又需要补哪些治理。

### 题目

如果面试官追问：当「端到端加密的客服 IM 怎么实现？Web Crypto API 实战」需要在安全与交付速度之间权衡时，你会优先守住哪些底线？

### 答案要点

#### 标准回答（直接作答）

- 结论：每个用户启动时本地生成 ECDH P-256 密钥对，私钥存 IndexedDB（不可导出），公钥上传服务端
- 机制：两人会话开始时各自取对方公钥 + 自己私钥 → ECDH → 共享密钥 → HKDF 派生 → AES 密钥；AES-GCM（对称、自带认证）+ 每条消息一个 12 byte 随机 IV
- 落地动作：回答「当「端到端加密的客服 IM 怎么实现？Web Crypto API 实战」需要在安全与交付速度之间权衡时，你会优先守住哪些底线」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题要先说清 端到端加密的客服 的函数签名、时序语义和资源释放策略；如果这些口径不统一，代码再长也不是标准答案。
- 失败场景：例如 端到端加密的客服 实现里定时器或订阅未正确释放，连续操作后会出现重复执行或内存泄漏；修复要补清理逻辑和回归用例。
- 替代方案与取舍：可直接引入成熟库快速上线，但在「当「端到端加密的客服 IM 怎么实现？Web Crypto API 实战」需要在安全与交付速度之间权衡时，你会优先守住哪些底线」这题里仍要讲清底层语义；当前保留手写版本便于解释边界与调试。

#### 关键细节（可追问）

- 每个用户启动时本地生成 ECDH P-256 密钥对，私钥存 IndexedDB（不可导出），公钥上传服务端
- 两人会话开始时各自取对方公钥 + 自己私钥 → ECDH → 共享密钥 → HKDF 派生 → AES 密钥
- AES-GCM（对称、自带认证）+ 每条消息一个 12 byte 随机 IV

## intl-deployment-region-followup-1

title: 追问：当「海外客服系统多区域部署：怎么选接入点？怎么过合规」进入复杂场景后，你会先验证哪些 海外 前置条件，避免方案踩坑
difficulty: 资深
tags: [海外, 部署, 合规, GDPR, 追问]
parent: intl-deployment-region

### 一句话

先界定「海外客服系统多区域部署：怎么选接入点？怎么过合规」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕核心机制展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：当「海外客服系统多区域部署：怎么选接入点？怎么过合规」进入复杂场景后，你会先验证哪些 海外 前置条件，避免方案踩坑？

### 答案要点

#### 标准回答（直接作答）

- 结论：接入层（前端 / 网关）：
- 机制：多 region 部署网关：cn-shanghai / sea-singapore / us-east-1 / eu-frankfurt；DNS 智能解析（GeoDNS）/ Anycast IP 把用户路由到最近接入点
- 落地动作：回答「当「海外客服系统多区域部署：怎么选接入点？怎么过合规」进入复杂场景后，你会先验证哪些 海外 前置条件，避免方案踩坑」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「接入层（前端 / 网关）：」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「多 region 部署网关：cn-shanghai / sea-singapore / us-east-1 / eu-frankfurt」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「当「海外客服系统多区域部署：怎么选接入点？怎么过合规」进入复杂场景后，你会先验证哪些 海外 前置条件，避免方案踩坑」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- 接入层（前端 / 网关）：
- 多 region 部署网关：cn-shanghai / sea-singapore / us-east-1 / eu-frankfurt
- DNS 智能解析（GeoDNS）/ Anycast IP 把用户路由到最近接入点

## intl-time-locale-followup-1

title: 追问：结合真实业务约束，你会如何围绕 国际化 提前识别「多时区 + 多语言客服会话：时间显示和消息排序怎么做不出错」中的复杂度陷阱，避免实现后期返工
difficulty: 进阶
tags: [国际化, 时区, locale, 高频, 追问]
parent: intl-time-locale

### 一句话

先界定「多时区 + 多语言客服会话：时间显示和消息排序怎么做不出错」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。；围绕复杂度和正确性展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。。

### 题目

如果面试官追问：结合真实业务约束，你会如何围绕 国际化 提前识别「多时区 + 多语言客服会话：时间显示和消息排序怎么做不出错」中的复杂度陷阱，避免实现后期返工？

### 答案要点

#### 标准回答（直接作答）

- 结论：时间存储：服务端永远存 UTC ms（Date.now() / new Date().toISOString()），不要存任何带时区的字符串
- 机制：客户端用 Intl.DateTimeFormat(locale, { timeZone }) 转用户本地；客服坐席侧默认用坐席本地，提供切换"按客户时区显示"
- 落地动作：回答「结合真实业务约束，你会如何围绕 国际化 提前识别「多时区 + 多语言客服会话：时间显示和消息排序怎么做不出错」中的复杂度陷阱，避免实现后期返工」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，你会如何围绕 国际化 提前识别「多时区 + 多语言客服会话：时间显示和消息排序怎么做不出错」中的复杂度陷阱，避免实现后期返工」时先约定 你会如何围绕 的输入输出契约、异常输入处理和边界行为（如取消、重入、幂等），否则实现不算完整。
- 失败场景：例如 你会如何围绕 实现忽略 this/参数透传，线上会出现行为与预期不一致；应补调用语义测试并明确默认行为。
- 替代方案与取舍：也可只给伪代码说明思路，但可靠性细节会缺失；当前给可运行实现并补异常路径更符合资深标准。

#### 关键细节（可追问）

- 时间存储：服务端永远存 UTC ms（Date.now() / new Date().toISOString()），不要存任何带时区的字符串
- 客户端用 Intl.DateTimeFormat(locale, { timeZone }) 转用户本地
- 客服坐席侧默认用坐席本地，提供切换"按客户时区显示"

## intl-time-locale-followup-2

title: 追问：结合真实业务约束，如果数据规模扩大一个数量级，你会如何围绕 国际化 调整数据结构或算法
difficulty: 进阶
tags: [国际化, 时区, locale, 高频, 追问]
parent: intl-time-locale

### 一句话

规模变大后先重新评估瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。；如果 复杂度和正确性 的收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。；答案里要给出取舍边界：小团队/低流量怎么做。

### 题目

如果面试官追问：结合真实业务约束，如果数据规模扩大一个数量级，你会如何围绕 国际化 调整数据结构或算法？

### 答案要点

#### 标准回答（直接作答）

- 结论：时间存储：服务端永远存 UTC ms（Date.now() / new Date().toISOString()），不要存任何带时区的字符串
- 机制：客户端用 Intl.DateTimeFormat(locale, { timeZone }) 转用户本地；客服坐席侧默认用坐席本地，提供切换"按客户时区显示"
- 落地动作：回答「结合真实业务约束，如果数据规模扩大一个数量级，你会如何围绕 国际化 调整数据结构或算法」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「结合真实业务约束，如果数据规模扩大一个数量级，你会如何围绕 国际化 调整数据结构或算法」时要先说清输入规模、复杂度上限和内存预算，这三项决定 数量级 是否可行。
- 失败场景：例如漏掉重复值/越界输入，数量级 会返回错误结果；需要补不变量断言和反例测试。
- 替代方案与取舍：也可走极致性能实现，但可读性和维护成本高；当前在复杂度与维护性间取平衡。

#### 关键细节（可追问）

- 时间存储：服务端永远存 UTC ms（Date.now() / new Date().toISOString()），不要存任何带时区的字符串
- 客户端用 Intl.DateTimeFormat(locale, { timeZone }) 转用户本地
- 客服坐席侧默认用坐席本地，提供切换"按客户时区显示"

## intl-time-locale-followup-3

title: 追问：如果要让「多时区 + 多语言客服会话：时间显示和消息排序怎么做不出错」的正确性可复核，你会设计哪些验证步骤
difficulty: 进阶
tags: [国际化, 时区, locale, 高频, 追问]
parent: intl-time-locale

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「多时区 + 多语言客服会话：时间显示和消息排序怎么做不出错」不是只在理想输入下成立。；再补可观测指标：复杂度和正确性应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。。

### 题目

如果面试官追问：如果要让「多时区 + 多语言客服会话：时间显示和消息排序怎么做不出错」的正确性可复核，你会设计哪些验证步骤？

### 答案要点

#### 标准回答（直接作答）

- 结论：时间存储：服务端永远存 UTC ms（Date.now() / new Date().toISOString()），不要存任何带时区的字符串
- 机制：客户端用 Intl.DateTimeFormat(locale, { timeZone }) 转用户本地；客服坐席侧默认用坐席本地，提供切换"按客户时区显示"
- 落地动作：回答「如果要让「多时区 + 多语言客服会话：时间显示和消息排序怎么做不出错」的正确性可复核，你会设计哪些验证步骤」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 多时区 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 多时区，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「如果要让「多时区 + 多语言客服会话：时间显示和消息排序怎么做不出错」的正确性可复核，你会设计哪些验证步骤」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 时间存储：服务端永远存 UTC ms（Date.now() / new Date().toISOString()），不要存任何带时区的字符串
- 客户端用 Intl.DateTimeFormat(locale, { timeZone }) 转用户本地
- 客服坐席侧默认用坐席本地，提供切换"按客户时区显示"

## chat-perf-virtual-list-followup-1

title: 追问：从工程落地角度看，你会先看哪些与 虚拟列表 相关的指标来判断「海量消息聊天的虚拟列表怎么做？双向滚动 + 动态高度 + 贴底跟随」是不是当前性能瓶颈
difficulty: 资深
tags: [虚拟列表, 性能, 高频, 追问]
parent: chat-perf-virtual-list

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「海量消息聊天的虚拟列表怎么做？双向滚动 + 动态高度 + 贴底跟随」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。。

### 题目

如果面试官追问：从工程落地角度看，你会先看哪些与 虚拟列表 相关的指标来判断「海量消息聊天的虚拟列表怎么做？双向滚动 + 动态高度 + 贴底跟随」是不是当前性能瓶颈？

### 答案要点

#### 标准回答（直接作答）

- 结论：可视区窗口：只渲染"可视区 + 上下 5 屏 buffer"的消息（约 30-50 个 DOM 节点）
- 机制：用 ResizeObserver 监听每个渲染节点；首次测量后写入 heightCache.set(msgId, h)；没测过的高度用估算值（80px）占位
- 落地动作：回答「从工程落地角度看，你会先看哪些与 虚拟列表 相关的指标来判断「海量消息聊天的虚拟列表怎么做？双向滚动 + 动态高度 + 贴底跟随」是不是当前性能瓶颈」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：只有在 从工程落地角度看 的瓶颈被数据证实、回归方案准备完成时，答案里的优化建议才可直接执行。
- 失败场景：例如主线程在首屏阶段执行重计算，从工程落地角度看 指标会从可接受直接退化到用户可感知卡顿；修复要拆分任务并回归验证。
- 替代方案与取舍：可选一次性大重构追求极致性能，但交付风险高；当前对「从工程落地角度看，你会先看哪些与 虚拟列表 相关的指标来判断「海量消息聊天的虚拟列表怎么做？双向滚动 + 动态高度 + 贴底跟随」是不是当前性能瓶颈」采用小步优化更稳。

#### 关键细节（可追问）

- 可视区窗口：只渲染"可视区 + 上下 5 屏 buffer"的消息（约 30-50 个 DOM 节点）
- 用 ResizeObserver 监听每个渲染节点；首次测量后写入 heightCache.set(msgId, h)
- 没测过的高度用估算值（80px）占位

## chat-perf-virtual-list-followup-2

title: 追问：结合真实业务约束，你会怎样验证「海量消息聊天的虚拟列表怎么做？双向滚动 + 动态高度 + 贴底跟随」的优化收益在真实设备和真实网络下也成立
difficulty: 资深
tags: [虚拟列表, 性能, 高频, 追问]
parent: chat-perf-virtual-list

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「海量消息聊天的虚拟列表怎么做？双向滚动 + 动态高度 + 贴底跟随」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。。

### 题目

如果面试官追问：结合真实业务约束，你会怎样验证「海量消息聊天的虚拟列表怎么做？双向滚动 + 动态高度 + 贴底跟随」的优化收益在真实设备和真实网络下也成立？

### 答案要点

#### 标准回答（直接作答）

- 结论：可视区窗口：只渲染"可视区 + 上下 5 屏 buffer"的消息（约 30-50 个 DOM 节点）
- 机制：用 ResizeObserver 监听每个渲染节点；首次测量后写入 heightCache.set(msgId, h)；没测过的高度用估算值（80px）占位
- 落地动作：回答「结合真实业务约束，你会怎样验证「海量消息聊天的虚拟列表怎么做？双向滚动 + 动态高度 + 贴底跟随」的优化收益在真实设备和真实网络下也成立」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：只有在 你会怎样验证 的瓶颈被数据证实、回归方案准备完成时，答案里的优化建议才可直接执行。
- 失败场景：例如主线程在首屏阶段执行重计算，你会怎样验证 指标会从可接受直接退化到用户可感知卡顿；修复要拆分任务并回归验证。
- 替代方案与取舍：可选一次性大重构追求极致性能，但交付风险高；当前对「结合真实业务约束，你会怎样验证「海量消息聊天的虚拟列表怎么做？双向滚动 + 动态高度 + 贴底跟随」的优化收益在真实设备和真实网络下也成立」采用小步优化更稳。

#### 关键细节（可追问）

- 可视区窗口：只渲染"可视区 + 上下 5 屏 buffer"的消息（约 30-50 个 DOM 节点）
- 用 ResizeObserver 监听每个渲染节点；首次测量后写入 heightCache.set(msgId, h)
- 没测过的高度用估算值（80px）占位

## chat-perf-virtual-list-followup-3

title: 追问：结合真实业务约束，如果「海量消息聊天的虚拟列表怎么做？双向滚动 + 动态高度 + 贴底跟随」在 虚拟列表 相关优化中让代码复杂度上升，你会如何判断继续推进还是止损
difficulty: 资深
tags: [虚拟列表, 性能, 高频, 追问]
parent: chat-perf-virtual-list

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「海量消息聊天的虚拟列表怎么做？双向滚动 + 动态高度 + 贴底跟随」不是只在理想输入下成立。；再补可观测指标：性能收益应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。。

### 题目

如果面试官追问：结合真实业务约束，如果「海量消息聊天的虚拟列表怎么做？双向滚动 + 动态高度 + 贴底跟随」在 虚拟列表 相关优化中让代码复杂度上升，你会如何判断继续推进还是止损？

### 答案要点

#### 标准回答（直接作答）

- 结论：可视区窗口：只渲染"可视区 + 上下 5 屏 buffer"的消息（约 30-50 个 DOM 节点）
- 机制：用 ResizeObserver 监听每个渲染节点；首次测量后写入 heightCache.set(msgId, h)；没测过的高度用估算值（80px）占位
- 落地动作：回答「结合真实业务约束，如果「海量消息聊天的虚拟列表怎么做？双向滚动 + 动态高度 + 贴底跟随」在 虚拟列表 相关优化中让代码复杂度上升，你会如何判断继续推进还是止损」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：只有在 海量消息聊天的虚拟列 的瓶颈被数据证实、回归方案准备完成时，答案里的优化建议才可直接执行。
- 失败场景：例如主线程在首屏阶段执行重计算，海量消息聊天的虚拟列 指标会从可接受直接退化到用户可感知卡顿；修复要拆分任务并回归验证。
- 替代方案与取舍：可选一次性大重构追求极致性能，但交付风险高；当前对「结合真实业务约束，如果「海量消息聊天的虚拟列表怎么做？双向滚动 + 动态高度 + 贴底跟随」在 虚拟列表 相关优化中让代码复杂度上升，你会如何判断继续推进还是止损」采用小步优化更稳。

#### 关键细节（可追问）

- 可视区窗口：只渲染"可视区 + 上下 5 屏 buffer"的消息（约 30-50 个 DOM 节点）
- 用 ResizeObserver 监听每个渲染节点；首次测量后写入 heightCache.set(msgId, h)
- 没测过的高度用估算值（80px）占位

## kefu-monitoring-followup-1

title: 追问：围绕「客服系统的可观测性：消息丢失率 / 响应时延 / SLA 怎么监控」做迁移时，你会怎样拆分批次，降低回滚风险
difficulty: 资深
tags: [监控, SLA, 可观测性, 高频, 追问]
parent: kefu-monitoring

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「客服系统的可观测性：消息丢失率 / 响应时延 / SLA 怎么监控」不是只在理想输入下成立。；再补可观测指标：工程可维护性应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。。

### 题目

如果面试官追问：围绕「客服系统的可观测性：消息丢失率 / 响应时延 / SLA 怎么监控」做迁移时，你会怎样拆分批次，降低回滚风险？

### 答案要点

#### 标准回答（直接作答）

- 结论：消息成功率 = 客户端发出 / 接收端 ack 收到，目标 > 99.95%
- 机制：消息时延 P50 / P99：发送到对端展示的时间，目标 P99 < 1.5s；WebSocket 连接成功率 + 重连频次：异常时立刻告警
- 落地动作：回答「围绕「客服系统的可观测性：消息丢失率 / 响应时延 / SLA 怎么监控」做迁移时，你会怎样拆分批次，降低回滚风险」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 客服系统的可观测性 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 客服系统的可观测性，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「围绕「客服系统的可观测性：消息丢失率 / 响应时延 / SLA 怎么监控」做迁移时，你会怎样拆分批次，降低回滚风险」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 消息成功率 = 客户端发出 / 接收端 ack 收到，目标 > 99.95%
- 消息时延 P50 / P99：发送到对端展示的时间，目标 P99 < 1.5s
- WebSocket 连接成功率 + 重连频次：异常时立刻告警

## kefu-monitoring-followup-2

title: 追问：面对团队能力差异，你会如何把「客服系统的可观测性：消息丢失率 / 响应时延 / SLA 怎么监控」拆成可并行推进的小阶段
difficulty: 资深
tags: [监控, SLA, 可观测性, 高频, 追问]
parent: kefu-monitoring

### 一句话

落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。；迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。；团队推进重点不是一次性重写，而是把「客服系统的可观测性：消息丢失率 / 响应时延 / SLA 怎么监控」拆成可验证的小步骤。

### 题目

如果面试官追问：面对团队能力差异，你会如何把「客服系统的可观测性：消息丢失率 / 响应时延 / SLA 怎么监控」拆成可并行推进的小阶段？

### 答案要点

#### 标准回答（直接作答）

- 结论：消息成功率 = 客户端发出 / 接收端 ack 收到，目标 > 99.95%
- 机制：消息时延 P50 / P99：发送到对端展示的时间，目标 P99 < 1.5s；WebSocket 连接成功率 + 重连频次：异常时立刻告警
- 落地动作：回答「面对团队能力差异，你会如何把「客服系统的可观测性：消息丢失率 / 响应时延 / SLA 怎么监控」拆成可并行推进的小阶段」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 面对团队能力差异 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 面对团队能力差异，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「面对团队能力差异，你会如何把「客服系统的可观测性：消息丢失率 / 响应时延 / SLA 怎么监控」拆成可并行推进的小阶段」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 消息成功率 = 客户端发出 / 接收端 ack 收到，目标 > 99.95%
- 消息时延 P50 / P99：发送到对端展示的时间，目标 P99 < 1.5s
- WebSocket 连接成功率 + 重连频次：异常时立刻告警

## kefu-monitoring-followup-3

title: 追问：你会如何用可观测指标来衡量「客服系统的可观测性：消息丢失率 / 响应时延 / SLA 怎么监控」的维护成本和收益平衡
difficulty: 资深
tags: [监控, SLA, 可观测性, 高频, 追问]
parent: kefu-monitoring

### 一句话

验证要从可复现样例开始：准备正向、边界和失败用例，确认「客服系统的可观测性：消息丢失率 / 响应时延 / SLA 怎么监控」不是只在理想输入下成立。；再补可观测指标：工程可维护性应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。。

### 题目

如果面试官追问：你会如何用可观测指标来衡量「客服系统的可观测性：消息丢失率 / 响应时延 / SLA 怎么监控」的维护成本和收益平衡？

### 答案要点

#### 标准回答（直接作答）

- 结论：消息成功率 = 客户端发出 / 接收端 ack 收到，目标 > 99.95%
- 机制：消息时延 P50 / P99：发送到对端展示的时间，目标 P99 < 1.5s；WebSocket 连接成功率 + 重连频次：异常时立刻告警
- 落地动作：回答「你会如何用可观测指标来衡量「客服系统的可观测性：消息丢失率 / 响应时延 / SLA 怎么监控」的维护成本和收益平衡」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「你会如何用可观测指标来衡量「客服系统的可观测性：消息丢失率 / 响应时延 / SLA 怎么监控」的维护成本和收益平衡」时要先定义 你会如何用可观测指标 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，你会如何用可观测指标 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 你会如何用可观测指标 关键链路先收敛再替换。

#### 关键细节（可追问）

- 消息成功率 = 客户端发出 / 接收端 ack 收到，目标 > 99.95%
- 消息时延 P50 / P99：发送到对端展示的时间，目标 P99 < 1.5s
- WebSocket 连接成功率 + 重连频次：异常时立刻告警

## message-reliability-followup-2

title: 追问：在「消息可靠性怎么保证」场景下，"对方正在输入"信令要不要保证可靠
difficulty: 资深
tags: [IM, 可靠性, ack, 高频, 追问]
parent: message-reliability
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「消息可靠性怎么保证」落到真实交付，而不是停在概念层。；回答顺序可用「现状问题 -> IM 方案动作 -> 验证结果」，并用「消息可靠性怎么保证」举一条主链路说明。。

### 题目

如果面试官追问：在「消息可靠性怎么保证」场景下，"对方正在输入"信令要不要保证可靠（不需要，丢了无所谓）？

### 答案要点

#### 标准回答（直接作答）

- 结论：流程（三段 ack）：
- 机制：发送端 → 服务端：send(msg_id, payload)，服务端持久化后回 ack(msg_id, seq, ts)，发送端把"发送中"改为"已送达服务端"；服务端 → 接收端（在线）：直接推送
- 落地动作：回答「在「消息可靠性怎么保证」场景下，"对方正在输入"信令要不要保证可靠」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「流程（三段 ack）：」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「发送端 → 服务端：send(msg_id, payload)，服务端持久化后回 ack(msg_id, seq, ts)，发送端把"发送中"改为"已送达服务端"」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「在「消息可靠性怎么保证」场景下，"对方正在输入"信令要不要保证可靠」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- 流程（三段 ack）：
- 发送端 → 服务端：send(msg_id, payload)，服务端持久化后回 ack(msg_id, seq, ts)，发送端把"发送中"改为"已送达服务端"
- 服务端 → 接收端（在线）：直接推送

## message-reliability-followup-3

title: 追问：以「消息可靠性怎么保证」为例，seq 用 64 位还是 32 位？哪种会溢出
difficulty: 资深
tags: [IM, 可靠性, ack, 高频, 追问]
parent: message-reliability
generated: followup-script

### 一句话

先把目标和约束说清楚，再展开实现：这能避免把「消息可靠性怎么保证」讲成只在理想输入下可用。；围绕「消息可靠性怎么保证」组织答案时，建议按「约束来源 -> IM 关键决策 -> 验证闭环」展开。；在「消息可靠性怎么保证」回答里。

### 题目

如果面试官追问：以「消息可靠性怎么保证」为例，seq 用 64 位还是 32 位？哪种会溢出？

### 答案要点

#### 标准回答（直接作答）

- 结论：流程（三段 ack）：
- 机制：发送端 → 服务端：send(msg_id, payload)，服务端持久化后回 ack(msg_id, seq, ts)，发送端把"发送中"改为"已送达服务端"；服务端 → 接收端（在线）：直接推送
- 落地动作：回答「以「消息可靠性怎么保证」为例，seq 用 64 位还是 32 位？哪种会溢出」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「流程（三段 ack）：」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「发送端 → 服务端：send(msg_id, payload)，服务端持久化后回 ack(msg_id, seq, ts)，发送端把"发送中"改为"已送达服务端"」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「以「消息可靠性怎么保证」为例，seq 用 64 位还是 32 位？哪种会溢出」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- 流程（三段 ack）：
- 发送端 → 服务端：send(msg_id, payload)，服务端持久化后回 ack(msg_id, seq, ts)，发送端把"发送中"改为"已送达服务端"
- 服务端 → 接收端（在线）：直接推送

## unread-count-sync-followup-2

title: 追问：在当前团队与业务约束下，离线端 7 天后上线，未读上限要不要截断
difficulty: 进阶
tags: [IM, 未读, 多端同步, 高频, 追问]
parent: unread-count-sync
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「多端未读计数怎么做才不会"标已读了红点还在"」在当前约束下为什么成立。；围绕「多端未读计数怎么做才不会"标已读了红点还在"」组织答案时，建议按「约束来源 -> IM 关键决策 -> 验证闭环」展开。。

### 题目

如果面试官追问：在当前团队与业务约束下，离线端 7 天后上线，未读上限要不要截断（如 99+）？

### 答案要点

#### 标准回答（直接作答）

- 结论：核心原则：服务端是唯一真实来源，客户端不要自己累加未读数
- 机制：数据模型：服务端为每个 (user, conv) 存一对值：max_seq（最新消息）、read_seq（已读到哪条）；未读数公式：unread = max_seq - read_seq（这条会话内）；总未读 = Σ 各会话未读
- 落地动作：回答「在当前团队与业务约束下，离线端 7 天后上线，未读上限要不要截断」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「核心原则：服务端是唯一真实来源，客户端不要自己累加未读数」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「数据模型：服务端为每个 (user, conv) 存一对值：max_seq（最新消息）、read_seq（已读到哪条）」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「在当前团队与业务约束下，离线端 7 天后上线，未读上限要不要截断」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- 核心原则：服务端是唯一真实来源，客户端不要自己累加未读数
- 数据模型：服务端为每个 (user, conv) 存一对值：max_seq（最新消息）、read_seq（已读到哪条）
- 未读数公式：unread = max_seq - read_seq（这条会话内）；总未读 = Σ 各会话未读

## unread-count-sync-followup-3

title: 追问：从工程落地角度看，怎么实现"标记会话所有消息已读"和"标记单条未读"
difficulty: 进阶
tags: [IM, 未读, 多端同步, 高频, 追问]
parent: unread-count-sync
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「多端未读计数怎么做才不会"标已读了红点还在"」在当前约束下为什么成立。；回答结构可按「触发条件 -> IM 机制 -> 风险兜底」展开，并以「多端未读计数怎么做才不会"标已读了红点还在"」补一条失败场景。

### 题目

如果面试官追问：从工程落地角度看，怎么实现"标记会话所有消息已读"和"标记单条未读"？

### 答案要点

#### 标准回答（直接作答）

- 结论：核心原则：服务端是唯一真实来源，客户端不要自己累加未读数
- 机制：数据模型：服务端为每个 (user, conv) 存一对值：max_seq（最新消息）、read_seq（已读到哪条）；未读数公式：unread = max_seq - read_seq（这条会话内）；总未读 = Σ 各会话未读
- 落地动作：回答「从工程落地角度看，怎么实现"标记会话所有消息已读"和"标记单条未读"」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题要先说清 从工程落地角度看 的函数签名、时序语义和资源释放策略；如果这些口径不统一，代码再长也不是标准答案。
- 失败场景：例如 从工程落地角度看 实现里定时器或订阅未正确释放，连续操作后会出现重复执行或内存泄漏；修复要补清理逻辑和回归用例。
- 替代方案与取舍：可直接引入成熟库快速上线，但在「从工程落地角度看，怎么实现"标记会话所有消息已读"和"标记单条未读"」这题里仍要讲清底层语义；当前保留手写版本便于解释边界与调试。

#### 关键细节（可追问）

- 核心原则：服务端是唯一真实来源，客户端不要自己累加未读数
- 数据模型：服务端为每个 (user, conv) 存一对值：max_seq（最新消息）、read_seq（已读到哪条）
- 未读数公式：unread = max_seq - read_seq（这条会话内）；总未读 = Σ 各会话未读

## typing-presence-indicator-followup-2

title: 追问：在「"对方正在输入" / 在线状态 / 已读回执 高频信令怎么做」场景下，移动端 App 切到后台时 presence 是否立即变 offline
difficulty: 进阶
tags: [IM, presence, 已读, 高频, 追问]
parent: typing-presence-indicator
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「"对方正在输入" / 在线状态 / 已读回执 高频信令怎么做」落到真实交付，而不是停在概念层。；讲「"对方正在输入" / 在线状态 / 已读回执 高频信令怎么做」时先给 IM 的判断口径。

### 题目

如果面试官追问：在「"对方正在输入" / 在线状态 / 已读回执 高频信令怎么做」场景下，移动端 App 切到后台时 presence 是否立即变 offline？

### 答案要点

#### 标准回答（直接作答）

- 结论：分层：核心消息（必达）、业务事件（必达，群操作 / 撤回）、信令（可丢，typing / presence）
- 机制：信令特点：状态而非事件——丢一两次没关系，下次还能补上；不能压垮服务端；输入框触发 oninput 时 throttle(emitTyping, 2000)
- 落地动作：回答「在「"对方正在输入" / 在线状态 / 已读回执 高频信令怎么做」场景下，移动端 App 切到后台时 presence 是否立即变 offline」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「分层：核心消息（必达）、业务事件（必达，群操作 / 撤回）、信令（可丢，typing / presence）」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「信令特点：状态而非事件——丢一两次没关系，下次还能补上；不能压垮服务端」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「在「"对方正在输入" / 在线状态 / 已读回执 高频信令怎么做」场景下，移动端 App 切到后台时 presence 是否立即变 offline」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- 分层：核心消息（必达）、业务事件（必达，群操作 / 撤回）、信令（可丢，typing / presence）
- 信令特点：状态而非事件——丢一两次没关系，下次还能补上；不能压垮服务端
- 输入框触发 oninput 时 throttle(emitTyping, 2000)

## typing-presence-indicator-followup-3

title: 追问：结合真实业务约束，客服侧坐席"挂起 / 离开 / 在线"状态变更怎么广播给所有客户
difficulty: 进阶
tags: [IM, presence, 已读, 高频, 追问]
parent: typing-presence-indicator
generated: followup-script

### 一句话

先明确这道追问要解决的业务目标，再说明「"对方正在输入" / 在线状态 / 已读回执 高频信令怎么做」在当前约束下为什么成立。；建议按「输入约束 -> IM 执行链路 -> 结果验证」展开。

### 题目

如果面试官追问：结合真实业务约束，客服侧坐席"挂起 / 离开 / 在线"状态变更怎么广播给所有客户？

### 答案要点

#### 标准回答（直接作答）

- 结论：分层：核心消息（必达）、业务事件（必达，群操作 / 撤回）、信令（可丢，typing / presence）
- 机制：信令特点：状态而非事件——丢一两次没关系，下次还能补上；不能压垮服务端；输入框触发 oninput 时 throttle(emitTyping, 2000)
- 落地动作：回答「结合真实业务约束，客服侧坐席"挂起 / 离开 / 在线"状态变更怎么广播给所有客户」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：这题的结论只在「分层：核心消息（必达）、业务事件（必达，群操作 / 撤回）、信令（可丢，typing / presence）」成立时有效；若约束变化，必须同步调整实现与验证方式。
- 失败场景：例如忽略「信令特点：状态而非事件——丢一两次没关系，下次还能补上；不能压垮服务端」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。
- 替代方案与取舍：可选更激进实现追求短期收益，但对「结合真实业务约束，客服侧坐席"挂起 / 离开 / 在线"状态变更怎么广播给所有客户」风险偏高；当前方案可验证、可灰度、可回滚。

#### 关键细节（可追问）

- 分层：核心消息（必达）、业务事件（必达，群操作 / 撤回）、信令（可丢，typing / presence）
- 信令特点：状态而非事件——丢一两次没关系，下次还能补上；不能压垮服务端
- 输入框触发 oninput 时 throttle(emitTyping, 2000)

## intl-deployment-region-followup-2

title: 追问：从工程落地角度看，数据出境的 SCC是什么
difficulty: 资深
tags: [海外, 部署, 合规, GDPR, 追问]
parent: intl-deployment-region
generated: followup-script

### 一句话

先给可验证结论，再补证据链：面试官想确认你是否能把「海外客服系统多区域部署：怎么选接入点？怎么过合规」落到真实交付，而不是停在概念层。；讲「海外客服系统多区域部署：怎么选接入点？怎么过合规」时先给 海外 的判断口径，再补执行动作和回退条件。

### 题目

如果面试官追问：从工程落地角度看，数据出境的 SCC（标准合同条款）是什么？

### 答案要点

#### 标准回答（直接作答）

- 结论：接入层（前端 / 网关）：
- 机制：多 region 部署网关：cn-shanghai / sea-singapore / us-east-1 / eu-frankfurt；DNS 智能解析（GeoDNS）/ Anycast IP 把用户路由到最近接入点
- 落地动作：回答「从工程落地角度看，数据出境的 SCC的定义」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「从工程落地角度看，数据出境的 SCC的定义」时要先定义 从工程落地角度看 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，从工程落地角度看 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 从工程落地角度看 关键链路先收敛再替换。

#### 关键细节（可追问）

- 接入层（前端 / 网关）：
- 多 region 部署网关：cn-shanghai / sea-singapore / us-east-1 / eu-frankfurt
- DNS 智能解析（GeoDNS）/ Anycast IP 把用户路由到最近接入点

## intl-deployment-region-followup-3

title: 追问：在当前团队与业务约束下，移动端怎么在 App 启动时高效完成 region 检测
difficulty: 资深
tags: [海外, 部署, 合规, GDPR, 追问]
parent: intl-deployment-region
generated: followup-script

### 一句话

先说判断标准，再说执行路径：回答「海外客服系统多区域部署：怎么选接入点？怎么过合规」时要能同时解释收益、代价和失败信号。；讲「海外客服系统多区域部署：怎么选接入点？怎么过合规」时先给 海外 的判断口径，再补执行动作和回退条件，会更像真实评审发言。。

### 题目

如果面试官追问：在当前团队与业务约束下，移动端怎么在 App 启动时高效完成 region 检测（避免一开始连错 region）？

### 答案要点

#### 标准回答（直接作答）

- 结论：接入层（前端 / 网关）：
- 机制：多 region 部署网关：cn-shanghai / sea-singapore / us-east-1 / eu-frankfurt；DNS 智能解析（GeoDNS）/ Anycast IP 把用户路由到最近接入点
- 落地动作：回答「在当前团队与业务约束下，移动端怎么在 App 启动时高效完成 region 检测」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「在当前团队与业务约束下，移动端怎么在 App 启动时高效完成 region 检测」时要把 移动端怎么在 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。
- 失败场景：例如把默认路径当成唯一路径，移动端怎么在 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。
- 替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「在当前团队与业务约束下，移动端怎么在 App 启动时高效完成 region 检测」里当前按阶段替换更稳。

#### 关键细节（可追问）

- 接入层（前端 / 网关）：
- 多 region 部署网关：cn-shanghai / sea-singapore / us-east-1 / eu-frankfurt
- DNS 智能解析（GeoDNS）/ Anycast IP 把用户路由到最近接入点

## kefu-incident-command-bridge

title: 客服故障指挥桥：坐席、运营、研发三方升级与止损协同
difficulty: 资深
tags: [客服, 事故指挥, 协同治理]
followups: [kefu-incident-command-bridge-followup-1, kefu-incident-command-bridge-followup-2, kefu-incident-command-bridge-followup-3]

### 一句话

客服系统故障的核心不是“谁先发现”，而是“谁能最快把信息变成统一动作”。

### 题目

晚高峰期间，IM 消息发送成功率下降且排队时长飙升。坐席在催、运营在催、业务在催。你会如何搭建故障指挥桥，保证三方信息一致并快速止损？

### 答案要点

- 先建立统一事件视图：故障等级、影响范围、用户可见症状、当前动作四项必须实时同步。
- 明确指挥链路：谁是 incident commander、谁负责技术修复、谁负责业务沟通不可模糊。
- 把动作拆层：第一层止损（降级能力）、第二层恢复（修复核心链路）、第三层补偿（客服话术与用户安抚）。
- 状态同步固定节奏：每 5-10 分钟更新一次，避免多个群各说各话。
- 业务沟通要可执行：给“预计恢复时间区间 + 临时替代流程 + 下一次更新时间”。
- 事故后复盘不仅看 MTTR，还要看误报率、信息反转次数和跨团队等待时间。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「客服故障指挥桥：坐席、运营、研发三方升级与止损协同」时要先定义 客服故障指挥桥 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，客服故障指挥桥 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 客服故障指挥桥 关键链路先收敛再替换。

### 代码示例

```ts
type KefuIncidentSignal = {
  sendSuccessRate: number;
  queueWaitSecP95: number;
  reconnectFailureRate: number;
};

function shouldOpenBridge(s: KefuIncidentSignal) {
  return s.sendSuccessRate < 0.98 || s.queueWaitSecP95 > 45 || s.reconnectFailureRate > 0.1;
}
```

```yaml
incident_bridge:
  cadence_min: 5
  required_updates:
    - impact_scope
    - current_action
    - next_eta
    - owner
  stoploss_actions:
    - route_to_callback
    - pause_low_priority_features
    - enable_degraded_message_mode
```

### 追问

- 「客服故障指挥桥：坐席、运营、研发三方升级与止损协同」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 技术群和业务群分别同步，最终形成两套真相。
- 汇报只讲“还在修”，没有可执行替代路径。
- 故障恢复后不追踪补偿闭环，用户体验损失被低估。

### 延伸

- 可以沉淀“客服故障口径模板”，覆盖坐席、运营、对外公告三种版本。
- 建议将指挥桥关键字段接入机器人播报，减少人工遗漏。

## im-risk-review-false-positive-governance

title: 内容风控误杀止损：敏感审核策略、人工复核与用户体验平衡
difficulty: 资深
tags: [风控治理, 客服体验, 合规]
followups: [im-risk-review-false-positive-governance-followup-1, im-risk-review-false-positive-governance-followup-2, im-risk-review-false-positive-governance-followup-3]

### 一句话

风控治理最常见的问题不是“拦不住”，而是“拦太多”：误杀成本必须被量化和治理。

### 题目

你们上线了更严格的内容审核策略后，违规拦截率上升，但正常用户图片/文本误杀也明显增加，客服投诉激增。你会怎么做止损和策略重排？

### 答案要点

- 先分流信号：违规命中率、误杀率、人工复核通过率、投诉率四项必须并行看。
- 设定止损阈值：当误杀率或投诉率触发红线时，自动切换到保守策略并放开低风险场景。
- 建立人工复核快车道：高价值会话和支付相关内容优先人工判定，缩短误杀影响时长。
- 策略调优采用灰度：按渠道、语种、场景逐步放量，避免全量一刀切。
- 对外沟通同步客服脚本：解释规则变更、申诉入口、预计处理时间，降低负面体验。
- 复盘时沉淀“误杀样本库”和规则回归集，防止同类误杀反复出现。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「内容风控误杀止损：敏感审核策略、人工复核与用户体验平衡」时要先定义 内容风控误杀止损 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，内容风控误杀止损 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 内容风控误杀止损 关键链路先收敛再替换。

### 代码示例

```ts
type ModerationMetrics = {
  violationHitRate: number;
  falsePositiveRate: number;
  complaintRate: number;
};

function needRollbackModeration(m: ModerationMetrics) {
  return m.falsePositiveRate > 0.04 || m.complaintRate > 0.015;
}
```

```yaml
moderation_stoploss:
  rollback_when:
    false_positive_rate: '>= 4%'
    complaint_rate: '>= 1.5%'
  mitigation:
    - enable_manual_fast_review
    - downgrade_low_risk_rules
    - broadcast_cs_faq_update
```

### 追问

- 「内容风控误杀止损：敏感审核策略、人工复核与用户体验平衡」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只看违规拦截率，不看误杀导致的业务损失。
- 规则切换没有灰度，导致全量波动无法回滚定位。
- 申诉链路不透明，客服和用户都看不到处理进度。

### 延伸

- 可把误杀成本纳入风控模型评估权重，避免单指标驱动。
- 建议定期做“规则回归演练”，验证止损开关是否可靠。

## kefu-incident-command-bridge-followup-1

title: 追问：客服故障指挥桥最容易失灵的前提条件是什么
difficulty: 资深
tags: [客服, 事故指挥, 协同治理, 追问]
parent: kefu-incident-command-bridge
generated: followup-script

### 一句话

我会先检查三件事：指挥权是否唯一、业务口径是否统一、状态更新节奏是否固定。；这三项任一缺失，都会导致“有人在修、但没人敢拍板”的假忙碌。；还要确认替代流程可执行，否则即使技术在修，坐席端也无法止损。

### 题目

如果面试官追问：故障指挥桥看起来流程很全，但实际最容易在哪些前提上失灵？你会怎么提前兜住？

### 答案要点

#### 标准回答（直接作答）

- 结论：先建立统一事件视图：故障等级、影响范围、用户可见症状、当前动作四项必须实时同步
- 机制：明确指挥链路：谁是 incident commander、谁负责技术修复、谁负责业务沟通不可模糊；把动作拆层：第一层止损（降级能力）、第二层恢复（修复核心链路）、第三层补偿（客服话术与用户安抚）
- 落地动作：回答「客服故障指挥桥最容易失灵的前提条件的定义」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 客服故障指挥桥最容易 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 客服故障指挥桥最容易，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「客服故障指挥桥最容易失灵的前提条件的定义」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先建立统一事件视图：故障等级、影响范围、用户可见症状、当前动作四项必须实时同步
- 明确指挥链路：谁是 incident commander、谁负责技术修复、谁负责业务沟通不可模糊
- 把动作拆层：第一层止损（降级能力）、第二层恢复（修复核心链路）、第三层补偿（客服话术与用户安抚）

## kefu-incident-command-bridge-followup-2

title: 追问：你如何量化指挥桥是否真的提升了协同效率
difficulty: 资深
tags: [客服, 事故指挥, 协同治理, 追问]
parent: kefu-incident-command-bridge
generated: followup-script

### 一句话

我会看四组数据：MTTA、MTTR、信息反转次数、跨团队等待时长。；再补用户侧指标：排队时长与投诉量是否在故障窗口内回落。；指标改善才算机制有效，仅“开会更频繁”不等于协同更好。

### 题目

如果面试官追问：你说指挥桥机制有效，会拿哪些数据证明“协同效率变高了”，而不是只是汇报更频繁？

### 答案要点

#### 标准回答（直接作答）

- 结论：先建立统一事件视图：故障等级、影响范围、用户可见症状、当前动作四项必须实时同步
- 机制：明确指挥链路：谁是 incident commander、谁负责技术修复、谁负责业务沟通不可模糊；把动作拆层：第一层止损（降级能力）、第二层恢复（修复核心链路）、第三层补偿（客服话术与用户安抚）
- 落地动作：回答「你如何量化指挥桥是否真的提升了协同效率」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 你如何量化指挥桥是否 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 你如何量化指挥桥是否，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「你如何量化指挥桥是否真的提升了协同效率」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先建立统一事件视图：故障等级、影响范围、用户可见症状、当前动作四项必须实时同步
- 明确指挥链路：谁是 incident commander、谁负责技术修复、谁负责业务沟通不可模糊
- 把动作拆层：第一层止损（降级能力）、第二层恢复（修复核心链路）、第三层补偿（客服话术与用户安抚）

## kefu-incident-command-bridge-followup-3

title: 追问：当恢复变慢时你怎样在止损与体验之间拍板
difficulty: 资深
tags: [客服, 事故指挥, 协同治理, 追问]
parent: kefu-incident-command-bridge
generated: followup-script

### 一句话

我会先看红线指标：消息成功率、排队时长、会话中断率，触线就优先降级止损。；红线未触发时可继续抢修主链路，但必须给明确观察窗口和切换条件。；拍板要写清“当前选择 + 触发反转条件”，让后续动作可追踪。

### 题目

如果面试官追问：故障恢复比预期慢，你会怎么在“继续修主链路”和“先全面降级”之间做拍板？

### 答案要点

#### 标准回答（直接作答）

- 结论：先建立统一事件视图：故障等级、影响范围、用户可见症状、当前动作四项必须实时同步
- 机制：明确指挥链路：谁是 incident commander、谁负责技术修复、谁负责业务沟通不可模糊；把动作拆层：第一层止损（降级能力）、第二层恢复（修复核心链路）、第三层补偿（客服话术与用户安抚）
- 落地动作：回答「当恢复变慢时你怎样在止损与体验之间拍板」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 当恢复变慢时你怎样在 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 当恢复变慢时你怎样在，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「当恢复变慢时你怎样在止损与体验之间拍板」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先建立统一事件视图：故障等级、影响范围、用户可见症状、当前动作四项必须实时同步
- 明确指挥链路：谁是 incident commander、谁负责技术修复、谁负责业务沟通不可模糊
- 把动作拆层：第一层止损（降级能力）、第二层恢复（修复核心链路）、第三层补偿（客服话术与用户安抚）

## im-risk-review-false-positive-governance-followup-1

title: 追问：风控误杀治理最容易被忽略的边界条件是什么
difficulty: 资深
tags: [风控治理, 客服体验, 合规, 追问]
parent: im-risk-review-false-positive-governance
generated: followup-script

### 一句话

最常被忽略的是“语境差异”：同一句话在售后、支付、营销场景风险等级不同。；另一个边界是多语种误判，规则在中文有效不代表在海外语种同样有效。；还要校验申诉链路容量，否则误杀高峰会把客服系统一起拖垮。

### 题目

如果面试官追问：风控误杀治理方案看起来很完整，但最容易忽略的边界条件是什么，你会先补哪几项？

### 答案要点

#### 标准回答（直接作答）

- 结论：先分流信号：违规命中率、误杀率、人工复核通过率、投诉率四项必须并行看
- 机制：设定止损阈值：当误杀率或投诉率触发红线时，自动切换到保守策略并放开低风险场景；建立人工复核快车道：高价值会话和支付相关内容优先人工判定，缩短误杀影响时长
- 落地动作：回答「风控误杀治理最容易被忽略的边界条件的定义」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 风控误杀治理最容易被 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 风控误杀治理最容易被，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「风控误杀治理最容易被忽略的边界条件的定义」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先分流信号：违规命中率、误杀率、人工复核通过率、投诉率四项必须并行看
- 设定止损阈值：当误杀率或投诉率触发红线时，自动切换到保守策略并放开低风险场景
- 建立人工复核快车道：高价值会话和支付相关内容优先人工判定，缩短误杀影响时长

## im-risk-review-false-positive-governance-followup-2

title: 追问：你会展示哪些证据证明误杀治理确实改善
difficulty: 资深
tags: [风控治理, 客服体验, 合规, 追问]
parent: im-risk-review-false-positive-governance
generated: followup-script

### 一句话

我会给三类证据：误杀率下降、申诉处理时长缩短、用户投诉回落。；还会展示“风险未失控”证据：违规漏放率未明显上升，关键场景命中仍稳定。；证据必须有时间窗对比（治理前后），否则无法说明变化来自本次策略。

### 题目

如果面试官追问：你说误杀治理有效，具体会拿哪些证据证明“体验改善且风险可控”？

### 答案要点

#### 标准回答（直接作答）

- 结论：先分流信号：违规命中率、误杀率、人工复核通过率、投诉率四项必须并行看
- 机制：设定止损阈值：当误杀率或投诉率触发红线时，自动切换到保守策略并放开低风险场景；建立人工复核快车道：高价值会话和支付相关内容优先人工判定，缩短误杀影响时长
- 落地动作：回答「你会展示哪些证据证明误杀治理确实改善」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：回答「你会展示哪些证据证明误杀治理确实改善」时要先定义 你会展示哪些证据证明 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。
- 失败场景：例如迁移期新旧数据口径不一致，你会展示哪些证据证明 会出现结果漂移；应先冻结高风险写入并执行兼容校验。
- 替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 你会展示哪些证据证明 关键链路先收敛再替换。

#### 关键细节（可追问）

- 先分流信号：违规命中率、误杀率、人工复核通过率、投诉率四项必须并行看
- 设定止损阈值：当误杀率或投诉率触发红线时，自动切换到保守策略并放开低风险场景
- 建立人工复核快车道：高价值会话和支付相关内容优先人工判定，缩短误杀影响时长

## im-risk-review-false-positive-governance-followup-3

title: 追问：增长与合规并存时你如何重排误杀治理节奏
difficulty: 资深
tags: [风控治理, 客服体验, 合规, 追问]
parent: im-risk-review-false-positive-governance
generated: followup-script

### 一句话

我会采用双轨策略：高风险场景维持严格规则，低风险场景先放宽并加强抽检。；人工复核资源优先给高价值会话与投诉热点语种，先控住体验损失。；节奏上以周为单位评估误杀与漏放平衡，达不到阈值就立即调回保守档。

### 题目

如果面试官追问：当业务增长压力加大、合规要求也更严格时，你会如何重排误杀治理节奏，避免两头都失守？

### 答案要点

#### 标准回答（直接作答）

- 结论：先分流信号：违规命中率、误杀率、人工复核通过率、投诉率四项必须并行看
- 机制：设定止损阈值：当误杀率或投诉率触发红线时，自动切换到保守策略并放开低风险场景；建立人工复核快车道：高价值会话和支付相关内容优先人工判定，缩短误杀影响时长
- 落地动作：回答「增长与合规并存时你如何重排误杀治理节奏」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

#### 标准补充（边界/失败/取舍）

- 界定条件：该题的结论只在 增长与合规并存时你如 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。
- 失败场景：例如一次性全量切换 增长与合规并存时你如，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。
- 替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「增长与合规并存时你如何重排误杀治理节奏」按阶段灰度，每阶段可验收可撤回。

#### 关键细节（可追问）

- 先分流信号：违规命中率、误杀率、人工复核通过率、投诉率四项必须并行看
- 设定止损阈值：当误杀率或投诉率触发红线时，自动切换到保守策略并放开低风险场景
- 建立人工复核快车道：高价值会话和支付相关内容优先人工判定，缩短误杀影响时长
