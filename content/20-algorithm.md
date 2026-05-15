---
id: 20-algorithm
title: 算法与数据结构
order: 20
icon: 🧠
description: 前端高频算法题、数据结构手写实现、复杂度分析与真实工程映射。
---

## complexity

title: 时间复杂度与前端真实意义
followups: [complexity-followup-1]
difficulty: 基础
tags: [复杂度, 方法论]

### 一句话

列表渲染、搜索建议、树遍历、diff、埋点聚合都可能因复杂度失控而卡主线程；O(n²) 在 100 条数据无感，但 1 万条上是 1 亿次操作 → 直接长任务；浏览器主线程一旦阻塞 50ms 即影响 INP，长期阻塞会触发卡顿监控。

### 题目

为什么前端工程师也必须对复杂度敏感？以"渲染 1 万条评论"为例说明。

### 答案要点

- 列表渲染、搜索建议、树遍历、diff、埋点聚合都可能因复杂度失控而卡主线程
- `O(n²)` 在 100 条数据无感，但 1 万条上是 1 亿次操作 → 直接长任务
- 浏览器主线程一旦阻塞 50ms 即影响 INP，长期阻塞会触发卡顿监控
- 空间复杂度同样关键：缓存、闭包、中间数组都可能压垮低端设备

### 代码示例

```ts
// 反例：O(n²) 找重复评论
function dupSlow(arr: string[]) {
  const out: string[] = [];
  for (let i = 0; i < arr.length; i++)
    for (let j = i + 1; j < arr.length; j++) if (arr[i] === arr[j]) out.push(arr[i]);
  return out;
}
// 正解：O(n) 哈希表
function dupFast(arr: string[]) {
  const seen = new Set<string>(),
    dup = new Set<string>();
  for (const s of arr) (seen.has(s) ? dup : seen).add(s);
  return [...dup];
}
```

### 追问

- 如果把「时间复杂度与前端真实意义」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- 估算复杂度的能力 > 背题
- 浏览器 Long Task API（`PerformanceObserver` 监听 `longtask` 类型）可在线发现 > 50ms 的任务

## two-pointer-sliding-window

title: 双指针与滑动窗口模板
followups: [two-pointer-sliding-window-followup-1]
difficulty: 进阶
tags: [双指针, 滑动窗口]

### 一句话

滑动窗口：右指针扩张，遇到重复时左指针收缩，保持窗口内合法；用 Map 记录字符上次出现位置，左指针直接跳过去；每个字符最多被左右指针各访问一次，O(n)。

### 题目

手写"无重复字符的最长子串"（LeetCode 3），并说明为什么是 O(n)。

### 答案要点

- **双指针**：左右两个游标朝同一/相反方向移动，避免暴力 O(n²) 的嵌套循环
- **滑动窗口**模板：右指针扩张，违反约束时左指针收缩，过程中维护窗口内统计量
- 用 **Map 记录字符上次出现位置**，遇到重复直接把左指针跳到 `lastIndex + 1`
- 时间复杂度 **O(n)**：每个字符最多被左右指针各访问一次（amortized 分析）
- 空间复杂度 O(min(n, charset))：窗口最多容纳字符集大小
- 变体题：最小覆盖子串、长度为 k 的子串最多包含 m 个不同字符、和大于 K 的最短子数组
- 模板心法："**右扩 + 左缩，过程中更新答案**"，几乎 90% 滑窗题都套这个

### 代码示例

```ts
function lengthOfLongestSubstring(s: string): number {
  const last = new Map<string, number>();
  let left = 0,
    max = 0;
  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    if (last.has(c) && last.get(c)! >= left) left = last.get(c)! + 1;
    last.set(c, right);
    max = Math.max(max, right - left + 1);
  }
  return max;
}

// 双指针：移除有序数组重复项
function removeDuplicates(nums: number[]): number {
  let slow = 0;
  for (let fast = 1; fast < nums.length; fast++)
    if (nums[fast] !== nums[slow]) nums[++slow] = nums[fast];
  return slow + 1;
}
```

### 追问

- 如果把「双指针与滑动窗口模板」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- 滑动窗口三件套：扩张条件、收缩条件、记录答案位置
- 前端实战：搜索建议节流去重、虚拟列表的可视区间维护

## prefix-sum

title: 前缀和与差分数组
followups: [prefix-sum-followup-1]
difficulty: 进阶
tags: [前缀和]

### 一句话

预处理 prefix[i] = a[0]+...+a[i-1]；查询 [l, r] = prefix[r+1] - prefix[l]；前端场景：埋点聚合、热力图、统计图表的区间求和。

### 题目

设计一个 NumArray，支持频繁查询区间和，要求 query O(1)。

### 答案要点

- 预处理 `prefix[i] = a[0]+...+a[i-1]`
- 查询 `[l, r]` = `prefix[r+1] - prefix[l]`
- 前端场景：埋点聚合、热力图、统计图表的区间求和

### 代码示例

```ts
class NumArray {
  prefix: number[];
  constructor(nums: number[]) {
    this.prefix = [0];
    for (const n of nums) this.prefix.push(this.prefix.at(-1)! + n);
  }
  sumRange(l: number, r: number): number {
    return this.prefix[r + 1] - this.prefix[l];
  }
}

// 差分数组：区间批量加
function rangeAdd(n: number, ops: [number, number, number][]) {
  const diff = new Array(n + 1).fill(0);
  for (const [l, r, v] of ops) {
    diff[l] += v;
    diff[r + 1] -= v;
  }
  const arr: number[] = [];
  let cur = 0;
  for (let i = 0; i < n; i++) {
    cur += diff[i];
    arr.push(cur);
  }
  return arr;
}
```

### 追问

- 如果把「前缀和与差分数组」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- 二维前缀和处理矩阵区间和（图像处理、热力图）
- 树状数组（Fenwick Tree）/ 线段树支持单点修改 + 区间求和

## linked-list-classics

title: 链表经典题：反转、合并、环检测
followups: [linked-list-classics-followup-1]
difficulty: 进阶
tags: [链表, 双指针]

### 一句话

反转：用 prev/cur/next 三指针滚动；递归则借助新头节点；合并：dummy 头节点简化边界；比较小者依次接入；判圈：快慢指针，相遇则有环；找入口需要数学推导（再走 head 同步）。

### 题目

手写：单链表反转（迭代+递归）、合并两个有序链表、Floyd 判圈算法。

### 答案要点

- 反转：用 prev/cur/next 三指针滚动；递归则借助新头节点
- 合并：dummy 头节点简化边界；比较小者依次接入
- 判圈：快慢指针，相遇则有环；找入口需要数学推导（再走 head 同步）

### 代码示例

```ts
class ListNode {
  val: number;
  next: ListNode | null = null;
  constructor(v: number) {
    this.val = v;
  }
}

// 反转（迭代）
function reverse(head: ListNode | null): ListNode | null {
  let prev: ListNode | null = null,
    cur = head;
  while (cur) {
    const next = cur.next;
    cur.next = prev;
    prev = cur;
    cur = next;
  }
  return prev;
}

// 反转（递归）
function reverseR(head: ListNode | null): ListNode | null {
  if (!head || !head.next) return head;
  const newHead = reverseR(head.next);
  head.next.next = head;
  head.next = null;
  return newHead;
}

// 合并两个有序链表
function merge(a: ListNode | null, b: ListNode | null): ListNode | null {
  const dummy = new ListNode(0);
  let tail = dummy;
  while (a && b) {
    if (a.val <= b.val) {
      tail.next = a;
      a = a.next;
    } else {
      tail.next = b;
      b = b.next;
    }
    tail = tail.next!;
  }
  tail.next = a ?? b;
  return dummy.next;
}

// 判圈（Floyd 龟兔赛跑）
function hasCycle(head: ListNode | null): boolean {
  let slow = head,
    fast = head;
  while (fast && fast.next) {
    slow = slow!.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}
```

### 追问

- 如果把「链表经典题：反转、合并、环检测」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- 找环入口：相遇后让一个指针回到 head，同步前进，再次相遇即入口
- 前端场景：撤销重做栈、版本时间线（双向链表）

## tree-traversal

title: 二叉树遍历：递归、迭代、Morris
followups: [tree-traversal-followup-1]
difficulty: 进阶
tags: [树, DFS, BFS]

### 一句话

前/中/后序的递归本质相同，区别只是访问根节点的时机；迭代版需要显式栈模拟递归；层序使用队列 BFS，按层入队记录每层节点。

### 题目

手写二叉树的前/中/后序遍历（递归+迭代）和层序遍历。

### 答案要点

- 前/中/后序的递归本质相同，区别只是访问根节点的时机
- 迭代版需要显式栈模拟递归
- 层序使用队列 BFS，按层入队记录每层节点
- Morris 遍历可达 O(1) 空间，但写法较复杂

### 代码示例

```ts
class TreeNode {
  val: number;
  left: TreeNode | null = null;
  right: TreeNode | null = null;
  constructor(v: number) {
    this.val = v;
  }
}

// 前序递归
function preorder(root: TreeNode | null, out: number[] = []) {
  if (!root) return out;
  out.push(root.val);
  preorder(root.left, out);
  preorder(root.right, out);
  return out;
}

// 中序迭代（栈模拟）
function inorder(root: TreeNode | null): number[] {
  const out: number[] = [],
    stack: TreeNode[] = [];
  let cur = root;
  while (cur || stack.length) {
    while (cur) {
      stack.push(cur);
      cur = cur.left;
    }
    cur = stack.pop()!;
    out.push(cur.val);
    cur = cur.right;
  }
  return out;
}

// 层序（BFS）
function levelOrder(root: TreeNode | null): number[][] {
  if (!root) return [];
  const out: number[][] = [],
    q: TreeNode[] = [root];
  while (q.length) {
    const size = q.length,
      level: number[] = [];
    for (let i = 0; i < size; i++) {
      const n = q.shift()!;
      level.push(n.val);
      if (n.left) q.push(n.left);
      if (n.right) q.push(n.right);
    }
    out.push(level);
  }
  return out;
}
```

### 追问

- 如果把「二叉树遍历：递归、迭代、Morris」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- Morris 遍历用 O(1) 空间，借助叶子节点的 right 指针建立"线索"
- 前端场景：菜单树、组织架构、AST 遍历、Vue 模板编译的 transform

## debounce-throttle-handwritten

title: 手写防抖与节流（含 cancel/leading/trailing）
followups: [debounce-throttle-handwritten-followup-1]
difficulty: 进阶
tags: [手写, 高频]

### 一句话

防抖：每次触发清除上次定时器，到达 wait 后才执行；leading 表示首次立即触发；节流：固定时间窗口内最多执行一次；trailing 表示结束补一次；都要支持 cancel 释放 timer，避免内存泄漏与组件卸载后还触发。

### 题目

实现防抖、节流，支持 leading（首次立即）、trailing（结束触发）、cancel。

### 答案要点

- 防抖：每次触发清除上次定时器，到达 wait 后才执行；`leading` 表示首次立即触发
- 节流：固定时间窗口内最多执行一次；`trailing` 表示结束补一次
- 都要支持 `cancel` 释放 timer，避免内存泄漏与组件卸载后还触发
- 通用注意点：保留 this 与参数透传

### 代码示例

```ts
type Fn = (...a: any[]) => any;

function debounce<T extends Fn>(fn: T, wait = 200, opts: { leading?: boolean } = {}) {
  let timer: any = null;
  function debounced(this: any, ...args: Parameters<T>) {
    const callNow = opts.leading && !timer;
    clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      if (!opts.leading) fn.apply(this, args);
    }, wait);
    if (callNow) fn.apply(this, args);
  }
  debounced.cancel = () => {
    clearTimeout(timer);
    timer = null;
  };
  return debounced;
}

function throttle<T extends Fn>(
  fn: T,
  wait = 200,
  opts: { leading?: boolean; trailing?: boolean } = {},
) {
  let lastTime = 0,
    timer: any = null,
    lastArgs: any;
  const { leading = true, trailing = true } = opts;
  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    if (!lastTime && !leading) lastTime = now;
    const remain = wait - (now - lastTime);
    lastArgs = args;
    if (remain <= 0) {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      lastTime = now;
      fn.apply(this, args);
    } else if (!timer && trailing) {
      timer = setTimeout(() => {
        lastTime = leading ? Date.now() : 0;
        timer = null;
        fn.apply(this, lastArgs);
      }, remain);
    }
  };
}
```

### 追问

- 如果把「手写防抖与节流（含 cancel/leading/trailing）」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- VueUse 的 `useDebounceFn`/`useThrottleFn` 已包装好响应式版本
- 防抖适合搜索输入；节流适合 scroll/mousemove；按钮防连点二者皆可

## promise-handwritten

title: 手写 Promise.all / allSettled / race / 限流并发
followups: [promise-handwritten-followup-1, promise-handwritten-followup-2, promise-handwritten-followup-3]
difficulty: 资深
tags: [Promise, 手写, 高频]

### 一句话

all：要保序、任一 reject 立即短路、空数组立即 resolve、用 Promise.resolve 兼容非 thenable；allSettled：等全部完成，分别记录 fulfilled/rejected；race：第一个落定（成功或失败）即结果。

### 题目

实现 `Promise.all`、`allSettled`、`race`，再实现一个限流 N 的并发执行器。

### 答案要点

- `all`：要保序、任一 reject 立即短路、空数组立即 resolve、用 `Promise.resolve` 兼容非 thenable
- `allSettled`：等全部完成，分别记录 fulfilled/rejected
- `race`：第一个落定（成功或失败）即结果
- 并发限流：维护 worker 队列，循环消费 task 数组，结束后 `Promise.all` 等所有 worker

### 代码示例

```ts
function all<T>(ps: Promise<T>[]): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const out: T[] = new Array(ps.length);
    let cnt = 0;
    if (!ps.length) return resolve(out);
    ps.forEach((p, i) =>
      Promise.resolve(p).then((v) => {
        out[i] = v;
        if (++cnt === ps.length) resolve(out);
      }, reject),
    );
  });
}

function allSettled<T>(ps: Promise<T>[]) {
  return Promise.all(
    ps.map((p) =>
      Promise.resolve(p).then(
        (value) => ({ status: 'fulfilled' as const, value }),
        (reason) => ({ status: 'rejected' as const, reason }),
      ),
    ),
  );
}

function race<T>(ps: Promise<T>[]): Promise<T> {
  return new Promise((resolve, reject) =>
    ps.forEach((p) => Promise.resolve(p).then(resolve, reject)),
  );
}

// 并发限流（高频面试 + 真实工程）
async function pLimit<T>(tasks: (() => Promise<T>)[], limit = 3): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let i = 0;
  async function worker() {
    while (i < tasks.length) {
      const idx = i++;
      results[idx] = await tasks[idx]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}
```

### 常见误区

- then 必须返回新 Promise（链式），别在原 Promise 上挂
- resolve 不只接受值，也接受 thenable / Promise，要 unwrap
- 状态只能从 pending 变到 fulfilled/rejected 一次

### 追问

- 实现 Promise.allSettled
- Promise.any 和 race 区别
- async/await 是基于 Promise 实现的吗

### 延伸

- 文件分片上传、批量请求 API 都需要并发限流
- `p-limit` / `p-queue` 是工业实现，支持优先级、超时、重试

## lru-cache

title: 手写 LRU 缓存（O(1) 读写）
followups: [lru-cache-followup-1]
difficulty: 资深
tags: [缓存, 手写, 高频]

### 一句话

哈希表 + 双向链表：哈希表 O(1) 查找节点，链表 O(1) 移动头尾；ES Map 自带"插入顺序"特性，可用一个小技巧把 Map 当 LRU。

### 题目

实现 LRU 缓存，要求 get/put 均为 O(1)。

### 答案要点

- **核心数据结构**：哈希表 + 双向链表
  - 哈希表 O(1) 通过 key 找到链表节点
  - 双向链表 O(1) 把节点移到头部 / 删除尾节点
- **get(key)**：命中 → 把节点移到头部，返回 value；未命中返回 -1
- **put(key, value)**：存在 → 更新并移到头部；不存在 → 新建并插入头部，超容量则删尾
- **JS 简化版**：利用 `Map` 自带"按插入顺序遍历"的特性，命中时 `delete` 再 `set`
- 经典面试陷阱：要明确 get/put 都要算"被使用过"，不能只在 put 时刷新顺序
- 真实工程：浏览器 BFCache / V8 inline cache / DB query cache 都用 LRU 思想

### 代码示例

```ts
class LRU<K, V> {
  private map = new Map<K, V>();
  constructor(private cap: number) {}
  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    const v = this.map.get(key)!;
    this.map.delete(key);
    this.map.set(key, v);
    return v;
  }
  put(key: K, value: V): void {
    if (this.map.has(key)) this.map.delete(key);
    else if (this.map.size >= this.cap) this.map.delete(this.map.keys().next().value as K);
    this.map.set(key, value);
  }
}

// 标准版：双向链表 + 哈希表
class LRUStandard<K, V> {
  private head = { key: null as any, val: null as any, prev: null as any, next: null as any };
  private tail = { key: null as any, val: null as any, prev: null as any, next: null as any };
  private map = new Map<K, any>();
  constructor(private cap: number) {
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }
  private remove(node: any) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }
  private addToHead(node: any) {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next.prev = node;
    this.head.next = node;
  }
  get(key: K): V | undefined {
    const node = this.map.get(key);
    if (!node) return undefined;
    this.remove(node);
    this.addToHead(node);
    return node.val;
  }
  put(key: K, val: V) {
    let node = this.map.get(key);
    if (node) {
      node.val = val;
      this.remove(node);
      this.addToHead(node);
      return;
    }
    node = { key, val };
    this.map.set(key, node);
    this.addToHead(node);
    if (this.map.size > this.cap) {
      const old = this.tail.prev;
      this.remove(old);
      this.map.delete(old.key);
    }
  }
}
```

### 追问

- 如果把「手写 LRU 缓存（O(1) 读写）」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- LFU 还需按"使用频次"维护多条链表
- 浏览器的 HTTP 缓存、图片缓存、Pinia 持久化插件常用 LRU

## flatten-array

title: 手写数组扁平化（多种实现 + 限制深度）
followups: [flatten-array-followup-1]
difficulty: 进阶
tags: [数组, 手写]

### 一句话

递归 + reduce 简洁但深层数组易爆栈；栈迭代避免递归调用，适合超大嵌套；arr.flat(Infinity) 是现代最佳选项。

### 题目

手写数组扁平化（含限制深度），并对比递归、栈迭代、`while+some`、原生 `flat` 各自的优缺点。

### 答案要点

- 递归 + reduce 简洁但深层数组易爆栈
- 栈迭代避免递归调用，适合超大嵌套
- `arr.flat(Infinity)` 是现代最佳选项
- 注意稀疏数组、非数组元素和深度参数语义

### 代码示例

```ts
// 1. 递归
function flat1(arr: any[], depth = 1): any[] {
  return arr.reduce(
    (acc, cur) => acc.concat(Array.isArray(cur) && depth > 0 ? flat1(cur, depth - 1) : cur),
    [] as any[],
  );
}

// 2. 栈迭代（避免递归爆栈）
function flat2(arr: any[]): any[] {
  const stack = [...arr],
    res: any[] = [];
  while (stack.length) {
    const x = stack.pop();
    if (Array.isArray(x)) stack.push(...x);
    else res.push(x);
  }
  return res.reverse();
}

// 3. while + some
function flat3(arr: any[]): any[] {
  while (arr.some(Array.isArray)) arr = ([] as any[]).concat(...arr);
  return arr;
}

// 4. 原生 ES2019：Array.prototype.flat(Infinity)
```

### 追问

- 如果把「手写数组扁平化（多种实现 + 限制深度）」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- 对象扁平化：`{ a: { b: 1 } } → { 'a.b': 1 }`，常用于 antd Form 与配置管理
- 注意大数组用方案 1 可能爆栈（V8 默认栈深 ~10k 层）

## binary-search

title: 二分查找的边界陷阱
followups: [binary-search-followup-1]
difficulty: 进阶
tags: [二分, 高频]

### 一句话

三个易错点：循环条件 < vs <=、mid 计算溢出、left/right 更新方向；推荐统一写法：左闭右开区间 [left, right)，循环条件 left < right，命中条件用 arr[mid] < target。

### 题目

为什么二分查找经常写错？请写出"最左插入位置"和"最右插入位置"。

### 答案要点

- 三个易错点：循环条件 `<` vs `<=`、`mid` 计算溢出、`left/right` 更新方向
- 推荐统一写法：左闭右开区间 `[left, right)`，循环条件 `left < right`，命中条件用 `arr[mid] < target`

### 代码示例

```ts
// 最左插入位置（lower_bound）
function leftBound(arr: number[], t: number): number {
  let l = 0,
    r = arr.length;
  while (l < r) {
    const m = (l + r) >>> 1;
    if (arr[m] < t) l = m + 1;
    else r = m;
  }
  return l;
}

// 最右插入位置（upper_bound）
function rightBound(arr: number[], t: number): number {
  let l = 0,
    r = arr.length;
  while (l < r) {
    const m = (l + r) >>> 1;
    if (arr[m] <= t) l = m + 1;
    else r = m;
  }
  return l;
}
```

### 追问

- 如果把「二分查找的边界陷阱」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- `(l + r) / 2` 在大数组下可能溢出，用 `(l + r) >>> 1` 或 `l + ((r - l) >> 1)`
- 前端场景：虚拟列表定位可视区间起止 index

## dp-classic

title: DP 经典题：爬楼梯、最长上升子序列、编辑距离
followups: [dp-classic-followup-1]
difficulty: 资深
tags: [DP, 高频]

### 一句话

爬楼梯：状态转移 f(n) = f(n-1) + f(n-2)，可滚动变量优化；LIS：贪心 + 二分维护尾部最小值数组，长度即 LIS 长度；编辑距离：二维 DP，分别对应增/删/改三种转移。

### 题目

手写三道经典 DP：爬楼梯（O(1) 空间）、最长上升子序列（O(n log n)）、编辑距离。

### 答案要点

- 爬楼梯：状态转移 `f(n) = f(n-1) + f(n-2)`，可滚动变量优化
- LIS：贪心 + 二分维护尾部最小值数组，长度即 LIS 长度
- 编辑距离：二维 DP，分别对应增/删/改三种转移

### 代码示例

```ts
// 爬楼梯：滚动数组优化
function climbStairs(n: number): number {
  let a = 1,
    b = 1;
  for (let i = 2; i <= n; i++) [a, b] = [b, a + b];
  return b;
}

// 最长上升子序列 O(n log n)（贪心+二分）
function lis(nums: number[]): number {
  const tails: number[] = [];
  for (const n of nums) {
    let l = 0,
      r = tails.length;
    while (l < r) {
      const m = (l + r) >>> 1;
      if (tails[m] < n) l = m + 1;
      else r = m;
    }
    tails[l] = n;
  }
  return tails.length;
}

// 编辑距离（Levenshtein）
function minDistance(a: string, b: string): number {
  const m = a.length,
    n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
  return dp[m][n];
}
```

### 追问

- 如果把「DP 经典题：爬楼梯、最长上升子序列、编辑距离」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- LIS 也是 Vue3 diff 算法的底层（最小化移动）
- 编辑距离用于搜索建议、拼写纠错、diff

## frontend-real-world

title: 前端实战中的算法：虚拟列表 / 路由匹配 / Trie 搜索
followups: [frontend-real-world-followup-1]
difficulty: 资深
tags: [工程实战]

### 一句话

虚拟列表：可视区间 + 二分定位 + 偏移量缓存；Trie：搜索建议、敏感词、自动补全；路由匹配：树或正则配合通配符，按优先级命中。

### 题目

列举几个真实业务里"算法不是面试题，而是产品能力基础"的例子，并写出关键代码。

### 答案要点

- 虚拟列表：可视区间 + 二分定位 + 偏移量缓存
- Trie：搜索建议、敏感词、自动补全
- 路由匹配：树或正则配合通配符，按优先级命中
- Vue3 diff 用 LIS、React Fiber 调度用最小堆，都是真实算法落地

### 代码示例

```ts
// 1. 虚拟列表的可视区间计算（二分定位起始 index）
function findStart(offsets: number[], scrollTop: number): number {
  let l = 0,
    r = offsets.length;
  while (l < r) {
    const m = (l + r) >>> 1;
    if (offsets[m] < scrollTop) l = m + 1;
    else r = m;
  }
  return Math.max(0, l - 1);
}

// 2. Trie 用于搜索建议
class Trie {
  root: any = {};
  insert(word: string) {
    let node = this.root;
    for (const c of word) node = node[c] ??= {};
    node.$ = true;
  }
  startsWith(prefix: string): boolean {
    let node = this.root;
    for (const c of prefix) {
      if (!node[c]) return false;
      node = node[c];
    }
    return true;
  }
}

// 3. 路由 path 匹配（树结构 + 通配）
function matchRoute(routes: Array<{ path: string }>, url: string) {
  return routes.find((r) => {
    const re = new RegExp('^' + r.path.replace(/:\w+/g, '([^/]+)').replace(/\*/g, '.*') + '$');
    return re.test(url);
  });
}
```

### 追问

- 如果把「前端实战中的算法：虚拟列表 / 路由匹配 / Trie 搜索」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- Vue3 diff 用 LIS 求最少移动；React Fiber 调度用最小堆
- 复杂搜索还可上 Aho-Corasick（多模式匹配）、倒排索引

## graph-bfs-dfs

title: 图的 BFS / DFS 与前端真实场景
followups: [graph-bfs-dfs-followup-1]
difficulty: 进阶
tags: [图, BFS, DFS]

### 一句话

BFS：层次遍历、最短路径、最少跳数；用 queue 实现；DFS：拓扑排序、检测环、深度优先生成树；递归或显式 stack；前端场景：。

### 题目

图遍历在前端有哪些落地场景？BFS / DFS 怎么选？

### 答案要点

- BFS：层次遍历、最短路径、最少跳数；用 queue 实现
- DFS：拓扑排序、检测环、深度优先生成树；递归或显式 stack
- 前端场景：
  - 组件树遍历：找父级 / 找最近 ancestor / 收集所有 prop
  - 路由依赖图：动态路由懒加载顺序
  - 模块依赖图：构建器分析、循环依赖检测
  - 设计稿图层：Figma / Sketch 文件的元素树
  - 可视化：Sankey、Tree、Org chart
- 注意：用 `visited` Set 防止环；递归注意栈深度，超 10k 改迭代

### 代码示例

```ts
interface Node {
  id: string;
  neighbors: Node[];
}

export function bfsShortestPath(start: Node, target: string): string[] | null {
  const visited = new Set<string>([start.id]);
  const queue: { node: Node; path: string[] }[] = [{ node: start, path: [start.id] }];
  while (queue.length) {
    const { node, path } = queue.shift()!;
    if (node.id === target) return path;
    for (const n of node.neighbors) {
      if (!visited.has(n.id)) {
        visited.add(n.id);
        queue.push({ node: n, path: [...path, n.id] });
      }
    }
  }
  return null;
}

export function topologicalSort(nodes: Node[]): string[] | null {
  const visited = new Set<string>();
  const stack = new Set<string>();
  const order: string[] = [];

  function dfs(node: Node): boolean {
    if (stack.has(node.id)) return false;
    if (visited.has(node.id)) return true;
    stack.add(node.id);
    for (const n of node.neighbors) if (!dfs(n)) return false;
    stack.delete(node.id);
    visited.add(node.id);
    order.unshift(node.id);
    return true;
  }
  for (const n of nodes) if (!dfs(n)) return null;
  return order;
}
```

### 追问

- 如果把「图的 BFS / DFS 与前端真实场景」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- 大型图常用 Dijkstra / A\*，前端如果做地图 / 路径规划要看 priority queue
- React Fiber 用 DFS 但分片，每个时间片处理一定数量的 fiber，再让步给浏览器

## bit-manipulation

title: 位运算技巧与前端用例
followups: [bit-manipulation-followup-1]
difficulty: 进阶
tags: [位运算, 性能]

### 一句话

状态标志位：把多个 bool 压成一个 number，用 & | ^ 检查 / 设置 / 翻转；整数判断：x & 1 判奇偶；(x & (x - 1)) === 0 判是否 2 的幂…。

### 题目

JS 也能位运算，常见技巧有哪些？什么时候真的有用？

### 答案要点

- 状态标志位：把多个 bool 压成一个 number，用 `&` `|` `^` 检查 / 设置 / 翻转
- 整数判断：`x & 1` 判奇偶；`(x & (x - 1)) === 0` 判是否 2 的幂
- 取反 / 取整：`~~x` ≈ `Math.trunc(x)`（仅在 32 位整数范围内安全）
- 取最高位：`Math.clz32` / `31 - Math.clz32(x)`
- 颜色处理：rgb 编码到一个 number 里，比拼字符串快
- 注意：JS 位运算把数字转 32 位带符号整数，超过 2^31-1 就会溢出，BigInt 才支持任意位

### 代码示例

```ts
const PERMS = {
  read: 1 << 0,
  write: 1 << 1,
  exec: 1 << 2,
  admin: 1 << 3,
} as const;
type Perm = (typeof PERMS)[keyof typeof PERMS];

function has(mask: number, perm: Perm) {
  return (mask & perm) === perm;
}
function add(mask: number, perm: Perm) {
  return mask | perm;
}
function remove(mask: number, perm: Perm) {
  return mask & ~perm;
}

function rgb(r: number, g: number, b: number) {
  return (r << 16) | (g << 8) | b;
}
function unpack(c: number) {
  return [(c >> 16) & 0xff, (c >> 8) & 0xff, c & 0xff];
}

function isPow2(x: number) {
  return x > 0 && (x & (x - 1)) === 0;
}

function toInt(x: number) {
  return x | 0;
}
```

### 追问

- 如果把「位运算技巧与前端用例」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- ECMAScript 的位运算只能 32 位 + 带符号，做 IPv4 / 网卡掩码够用，更大用 BigInt
- 真正的性能瓶颈基本不是位运算，但在内核 / 编辑器 / 引擎里还是常见

## lru-cache-impl

title: 实现一个 LRU 缓存（用 Map 的简洁实现）
followups: [lru-cache-impl-followup-1, lru-cache-impl-followup-2, lru-cache-impl-followup-3]
difficulty: 进阶
tags: [数据结构, 手写, 高频]

### 一句话

LRU = 最近最少使用先淘汰。**用 Map**：JS 的 Map 内部按插入顺序保存键，每次访问命中就把键 delete 再 set，让它"挪到最后"；超容量删第一个键即可。

### 题目

请实现一个 `LRUCache` 类，支持 `get(key)` 与 `put(key, value)`，时间复杂度 O(1)。

### 答案要点

- 经典实现 = 双向链表 + 哈希表；JS 中可借助内置 `Map`（保留插入顺序）省掉链表
- get：命中后 delete + set，让这个 key "刷新"到最近位置
- put：先检查是否存在（存在就先删），插入；超过容量时 `Map.keys().next().value` 拿到第一个 key 删除
- 复杂度：所有操作 O(1)（Map 内部有 O(1) 的访问与删除）

### 代码示例

```js
class LRUCache {
  constructor(capacity) {
    this.cap = capacity;
    this.map = new Map();
  }
  get(key) {
    if (!this.map.has(key)) return -1;
    const v = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, v);
    return v;
  }
  put(key, value) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    if (this.map.size > this.cap) {
      const oldest = this.map.keys().next().value;
      this.map.delete(oldest);
    }
  }
}

const c = new LRUCache(2);
c.put('a', 1);
c.put('b', 2);
c.get('a'); // 1，"a" 变最新
c.put('c', 3); // 容量超了，淘汰 "b"
console.log(c.get('b')); // -1
```

### 常见误区

- 用 Object 当 hash 表 + 数组保顺序：每次 get 要 O(n) 找位置；用 Map 利用其插入顺序
- 忘记 update 时删掉旧位置再插入：相当于没更新顺序
- 容量为 1 / 0 的边界条件

### 追问

- LRU 的数据结构经典实现（双向链表 + 哈希表）
- LFU 和 LRU 区别
- Map 的迭代顺序为什么是插入序

### 延伸

- 改造支持 TTL 过期：put 时记录 `expireAt`，get 时检查
- 浏览器请求缓存、React Query 的 cache、SWR 的 cache 都是 LRU 思想
- LFU（最不经常使用）按访问次数淘汰，需要双堆或额外数据结构

## merge-intervals

title: 合并区间
followups: [merge-intervals-followup-1]
difficulty: 基础
tags: [数组, 排序, 高频]

### 一句话

先按左端点排序，再依次合并：如果当前区间的左端点 ≤ 上一个的右端点就合并，否则就开一个新区间。

### 题目

给定一组区间 `[[1,3],[2,6],[8,10],[15,18]]`，合并所有重叠的区间。

### 答案要点

- 时间 O(n log n)，瓶颈在排序
- 按左端点升序排序后，遍历一次即可
- 合并条件：`current[0] <= last[1]`
- 合并方式：`last[1] = Math.max(last[1], current[1])`

### 代码示例

```js
function merge(intervals) {
  if (!intervals.length) return [];
  intervals.sort((a, b) => a[0] - b[0]);
  const out = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    const cur = intervals[i];
    const last = out[out.length - 1];
    if (cur[0] <= last[1]) {
      last[1] = Math.max(last[1], cur[1]);
    } else {
      out.push(cur);
    }
  }
  return out;
}

console.log(
  merge([
    [1, 3],
    [2, 6],
    [8, 10],
    [15, 18],
  ]),
);
console.log(
  merge([
    [1, 4],
    [4, 5],
  ]),
);
```

### 追问

- 如果把「合并区间」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- 类似题：插入区间、会议室安排、电话号码段去重
- 区间问题大多套路：**先排序 + 一次遍历**

## promise-all-impl

title: 手写实现 Promise.all
followups: [promise-all-impl-followup-1]
difficulty: 进阶
tags: [Promise, 手写, 高频]

### 一句话

新建一个 Promise，对入参每一项调 `Promise.resolve(item).then`：成功计数到等于长度就 resolve(结果数组)，任一失败就立即 reject。

### 题目

请实现 `myPromiseAll`，传入 iterable 返回 Promise，行为对齐 `Promise.all`。

### 答案要点

- 兼容数组与可迭代对象（用 for...of）
- 每个元素都用 `Promise.resolve(item)` 包裹，避免传入普通值时报错
- 维护"完成计数 + 结果数组"，**按原始下标存放结果**（不能 push，因为顺序不固定）
- 任一 reject 立刻整体 reject
- 空数组立即 resolve `[]`

### 代码示例

```js
function myPromiseAll(iterable) {
  return new Promise((resolve, reject) => {
    const list = Array.from(iterable);
    if (list.length === 0) return resolve([]);
    const out = new Array(list.length);
    let done = 0;
    list.forEach((p, i) => {
      Promise.resolve(p).then((v) => {
        out[i] = v;
        if (++done === list.length) resolve(out);
      }, reject);
    });
  });
}

myPromiseAll([1, Promise.resolve(2), Promise.resolve(3)]).then(console.log);
myPromiseAll([Promise.resolve(1), Promise.reject('err')]).catch(console.log);
```

### 追问

- 如果把「手写实现 Promise.all」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- `Promise.allSettled` 把 reject 也当作 settle 计数即可
- `Promise.race` 谁先 settle 就谁说了算
- `Promise.any` 第一个 fulfilled 决定结果，全部 reject 抛 AggregateError

## kth-largest

title: 数组中第 K 大的元素（快速选择 / 小顶堆）
followups: [kth-largest-followup-1]
difficulty: 进阶
tags: [排序, 堆, 高频]

### 一句话

排序 O(n log n) 是基线；要 O(n) 用快速选择（partition 一次只递归一边）；要稳定且支持流式数据用大小为 k 的小顶堆。

### 题目

给定数组 nums 和整数 k，请返回数组中第 k 大的元素。

### 答案要点

- **方法 1：排序**：`nums.sort((a,b)=>b-a)[k-1]`，O(n log n)
- **方法 2：小顶堆**：维护大小为 k 的小顶堆，遍历 nums，堆 size > k 时 pop。最终堆顶就是第 k 大。时间 O(n log k)
- **方法 3：快速选择 (Quickselect)**：基于快排 partition，期望 O(n)，最坏 O(n²)。适合一次性查找
- 工程上经常用堆（库现成 + 流式数据可增量）；面试加分用 Quickselect

### 代码示例

```js
function findKthLargest(nums, k) {
  nums.sort((a, b) => b - a);
  return nums[k - 1];
}

function findKthLargestHeap(nums, k) {
  const heap = [];
  const less = (a, b) => a < b;
  const up = (i) => {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (less(heap[i], heap[p])) {
        [heap[i], heap[p]] = [heap[p], heap[i]];
        i = p;
      } else break;
    }
  };
  const down = (i) => {
    const n = heap.length;
    while (true) {
      const l = i * 2 + 1,
        r = l + 1;
      let s = i;
      if (l < n && less(heap[l], heap[s])) s = l;
      if (r < n && less(heap[r], heap[s])) s = r;
      if (s !== i) {
        [heap[i], heap[s]] = [heap[s], heap[i]];
        i = s;
      } else break;
    }
  };
  for (const x of nums) {
    if (heap.length < k) {
      heap.push(x);
      up(heap.length - 1);
    } else if (x > heap[0]) {
      heap[0] = x;
      down(0);
    }
  }
  return heap[0];
}
```

### 追问

- 如果把「数组中第 K 大的元素（快速选择 / 小顶堆）」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- LeetCode 215 经典题
- TopK 大数据场景：小顶堆 + 流式处理，外存数据用 MapReduce + 局部 TopK 合并
- Quickselect + 三向切分 + 随机化轴 = Bonus 加分

## bitwise-tricks

title: 位运算高频技巧一题打尽
followups: [bitwise-tricks-followup-1]
difficulty: 进阶
tags: [算法, 位运算, 高频]

### 一句话

七招够用：① `n & 1` 判奇偶 ② `n & (n - 1)` 抹掉最低位 1 ③ `a ^ a = 0` 找单数 ④ `a ^ b ^ b = a` 不借第三变量交换 ⑤ `1 << k` / `n & (1 << k)` 状态压缩 ⑥ `n & -n` 取最低位 1（lowbit） ⑦ `n | (1 << k)` / `n & ~(1 << k)` 设/清某位。

### 题目

位运算面试常问哪些？给出可直接背的"题目模板 → 解法"清单。

### 答案要点

- **判断 / 计数**
  - 是否 2 的幂：`n > 0 && (n & (n - 1)) === 0`
  - 二进制 1 的个数（popcount）：`while (n) { n &= n - 1; cnt++; }` 或 `Number.prototype.toString(2).match(/1/g)?.length`
  - 是否为 4 的幂：`n > 0 && (n & (n - 1)) === 0 && (n & 0x55555555)`
- **找异常元素**
  - 数组中只有一个数出现一次，其余出现两次 → 全部 `^=` 起来
  - 出现一次 + 一个出现三次：用三进制状态 `ones / twos`
  - 出现一次的两个数：先全异或得 `xor = a ^ b`；用 `xor & -xor` 拿任意一位 1，按这位分组各自异或
- **位掩码状态压缩**
  - 子集枚举：`for (let s = 0; s < (1 << n); s++)`
  - 子集的子集：`for (let sub = mask; sub; sub = (sub - 1) & mask)` 经典 DP 用法
  - 检查第 k 位：`(n >> k) & 1`；置位：`n |= (1 << k)`；清位：`n &= ~(1 << k)`；翻转：`n ^= (1 << k)`
- **lowbit（树状数组核心）**
  - `n & -n` 得最低位 1 对应的值，循环 `n -= n & -n` 可以从低到高遍历每一位的 1
- **小心 JS 32 位**
  - JS 位运算把数字转 **32 位有符号**整数，超过会溢出
  - `1 << 31 === -2147483648`；要无符号用 `>>> 0`
  - 大数（> 2^32）只能 BigInt：`1n << 33n`
- **不借变量交换**：`a ^= b; b ^= a; a ^= b;`（同地址变量会清零，注意）

### 代码示例

```ts
function popcount(n: number): number {
  let c = 0;
  let x = n >>> 0;
  while (x) {
    x &= x - 1;
    c++;
  }
  return c;
}

function isPowerOfTwo(n: number) {
  return n > 0 && (n & (n - 1)) === 0;
}

function singleNumber(nums: number[]): number {
  return nums.reduce((a, b) => a ^ b, 0);
}

function twoSingleNumbers(nums: number[]): [number, number] {
  const xor = nums.reduce((a, b) => a ^ b, 0);
  const diff = xor & -xor;
  let a = 0,
    b = 0;
  for (const n of nums) n & diff ? (a ^= n) : (b ^= n);
  return [a, b];
}

function subsets(arr: number[]): number[][] {
  const n = arr.length,
    out: number[][] = [];
  for (let mask = 0; mask < 1 << n; mask++) {
    const cur: number[] = [];
    for (let i = 0; i < n; i++) if (mask & (1 << i)) cur.push(arr[i]);
    out.push(cur);
  }
  return out;
}

function* iterateOnes(n: number) {
  while (n) {
    const low = n & -n;
    yield Math.log2(low);
    n -= low;
  }
}
```

### 追问

- 如果把「位运算高频技巧一题打尽」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- 树状数组（Fenwick Tree）整个建立在 lowbit 上，`update / query` 都是 `i += i & -i`
- 旧浏览器没有 popcount 硬件指令，热点路径用查表法（256 项）

## sliding-window-advanced

title: 滑动窗口进阶：变长窗口 + 不变量维护
followups: [sliding-window-advanced-followup-1]
difficulty: 资深
tags: [算法, 滑动窗口, 高频]

### 一句话

固定窗口好写，**变长窗口**关键是抓住"窗口内的不变量"——比如"每个字符出现次数 ≤ k"、"窗口和 ≤ target"。当不变量被破坏时 right 不动 left 收缩，恢复后再扩张；用一个 `valid` 计数避免重复扫整段。

### 题目

比起"长度 K 的最大和"这种入门题，变长窗口怎么形成统一思路？讲讲常见变形。

### 答案要点

- **统一框架**
  - while right < n：扩张（加入 nums[right]）→ while 不满足不变量：收缩（剔除 nums[left]）→ 更新答案 → right++
  - 答案在"扩张完且不变量满足"那一刻取
- **关键设计**
  - 维护一个轻量统计（哈希表 / 计数器 / 和），保证 left/right 移动 O(1) 更新
  - 引入 `valid` 计数器统计"满足条件的字符种类数"，避免每次扫整张哈希
- **常见变形**
  - **最长不重复子串**：哈希记最近位置，重复时 left 跳到 last+1
  - **至多 k 个不同字符的最长子串**：哈希字符 → 计数；不同字符种类数 > k 时收缩
  - **恰好 k 个不同字符**：拆成"至多 k - 至多 k-1"两个变长窗口的差
  - **覆盖子串（Minimum Window Substring）**：双哈希 + valid 计数；先满足再收缩取最小
  - **乘积小于 K 的子数组数**：right 每移一步累加 right - left + 1
- **二维 / 多维窗口**
  - 矩阵中的最大子矩阵：固定上下边界 → 列前缀和 → 一维变成滑动窗口
- **避坑**
  - 不变量不能"在收缩时还在判扩张条件"——容易死循环
  - 注意答案是"长度"还是"区间个数"，前者每次取 max，后者累加 right - left + 1
  - 字符集大用 Map / 对象，定长 26 / 128 用数组更快

### 代码示例

```ts
function lengthOfLongestSubstring(s: string): number {
  const last = new Map<string, number>();
  let left = 0,
    ans = 0;
  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    if (last.has(c) && last.get(c)! >= left) left = last.get(c)! + 1;
    last.set(c, right);
    ans = Math.max(ans, right - left + 1);
  }
  return ans;
}

function lengthOfLongestSubstringKDistinct(s: string, k: number): number {
  const cnt = new Map<string, number>();
  let left = 0,
    ans = 0;
  for (let right = 0; right < s.length; right++) {
    cnt.set(s[right], (cnt.get(s[right]) || 0) + 1);
    while (cnt.size > k) {
      const c = s[left++];
      cnt.set(c, cnt.get(c)! - 1);
      if (cnt.get(c) === 0) cnt.delete(c);
    }
    ans = Math.max(ans, right - left + 1);
  }
  return ans;
}

function minWindow(s: string, t: string): string {
  const need = new Map<string, number>();
  for (const c of t) need.set(c, (need.get(c) || 0) + 1);
  let left = 0,
    valid = 0,
    start = 0,
    len = Infinity;
  const have = new Map<string, number>();
  for (let right = 0; right < s.length; right++) {
    const c = s[right];
    if (need.has(c)) {
      have.set(c, (have.get(c) || 0) + 1);
      if (have.get(c) === need.get(c)) valid++;
    }
    while (valid === need.size) {
      if (right - left + 1 < len) {
        start = left;
        len = right - left + 1;
      }
      const d = s[left++];
      if (need.has(d)) {
        if (have.get(d)! === need.get(d)) valid--;
        have.set(d, have.get(d)! - 1);
      }
    }
  }
  return len === Infinity ? '' : s.slice(start, start + len);
}

function numSubarrayProductLessThanK(nums: number[], k: number): number {
  if (k <= 1) return 0;
  let prod = 1,
    left = 0,
    ans = 0;
  for (let right = 0; right < nums.length; right++) {
    prod *= nums[right];
    while (prod >= k) prod /= nums[left++];
    ans += right - left + 1;
  }
  return ans;
}
```

### 追问

- 如果把「滑动窗口进阶：变长窗口 + 不变量维护」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- 滑动窗口能 work 的核心：随 right 增大，"满足条件的最小 left" 也单调不降；这是双指针正确性来源
- 不单调的场景（比如有负数累加和）：滑动窗口失效，改用前缀和 + 单调队列 / 哈希

## monotonic-stack-queue

title: 单调栈 / 单调队列高频题
followups: [monotonic-stack-queue-followup-1]
difficulty: 资深
tags: [算法, 单调栈, 单调队列, 高频]

### 一句话

**下一个更大元素 / 柱状图最大矩形**用单调栈（栈内保持单调）；**滑动窗口最大值**用单调双端队列（队头总是当前窗口的最大值）。复杂度 O(n)，每个元素至多入队/入栈出队/出栈各一次。

### 题目

为什么"下一个更大元素"和"滑动窗口最大值"都能 O(n)？它们的共同思想是什么？

### 答案要点

- **共同思想：及时丢弃永远用不到的候选**
  - 当我们在比较 nums[i] 时，若栈/队尾元素 < nums[i]，则前者永远不可能是后续位置的"最大值候选"，直接弹掉
  - 不变量：栈 / 队列从底/头到顶/尾保持单调（递减或递增）
- **单调栈典型题**
  - 下一个更大元素（直接 / 循环数组）
  - 每日温度（Daily Temperatures）：求等几天会更高
  - 柱状图中最大矩形：栈里存"递增高度对应的下标"，pop 时计算以该高度为顶的矩形
  - 接雨水（Trapping Rain Water）：栈维护"递减高度"，每次 pop 计算凹陷
- **单调队列典型题**
  - 滑动窗口最大值：维护递减队列，队头超出窗口就弹
  - 长度限制的最大子数组和（前缀和 + 单调队列）
  - 跳跃游戏 VI（DP + 单调队列优化）
- **如何选用**
  - 静态数组求"两侧最近的更大/更小"：单调栈
  - 动态窗口内求最大/最小（窗口长度变化）：单调队列
- **实现细节**
  - 栈/队列存"下标"还是"值"：存下标更通用（能算距离）
  - 比较条件：等号要不要弹？影响是否处理"严格更大"还是"≥"
  - JS 用普通数组当栈足够（push/pop O(1)）；双端队列用 array shift/unshift 是 O(n)，必要时用环形数组或 deque 实现

### 代码示例

```ts
function nextGreaterElements(nums: number[]): number[] {
  const n = nums.length,
    ans = new Array(n).fill(-1);
  const stack: number[] = [];
  for (let i = 0; i < 2 * n; i++) {
    const v = nums[i % n];
    while (stack.length && nums[stack[stack.length - 1]] < v) {
      ans[stack.pop()!] = v;
    }
    if (i < n) stack.push(i);
  }
  return ans;
}

function largestRectangleArea(heights: number[]): number {
  const stack: number[] = [];
  let max = 0;
  const h = [...heights, 0];
  for (let i = 0; i < h.length; i++) {
    while (stack.length && h[stack[stack.length - 1]] > h[i]) {
      const top = stack.pop()!;
      const left = stack.length ? stack[stack.length - 1] : -1;
      max = Math.max(max, h[top] * (i - left - 1));
    }
    stack.push(i);
  }
  return max;
}

function trap(h: number[]): number {
  const stack: number[] = [];
  let water = 0;
  for (let i = 0; i < h.length; i++) {
    while (stack.length && h[stack[stack.length - 1]] < h[i]) {
      const bottom = stack.pop()!;
      if (!stack.length) break;
      const left = stack[stack.length - 1];
      const w = i - left - 1;
      const minH = Math.min(h[left], h[i]) - h[bottom];
      water += w * minH;
    }
    stack.push(i);
  }
  return water;
}

function maxSlidingWindow(nums: number[], k: number): number[] {
  const dq: number[] = [];
  const out: number[] = [];
  for (let i = 0; i < nums.length; i++) {
    while (dq.length && nums[dq[dq.length - 1]] <= nums[i]) dq.pop();
    dq.push(i);
    if (dq[0] <= i - k) dq.shift();
    if (i >= k - 1) out.push(nums[dq[0]]);
  }
  return out;
}
```

### 追问

- 如果把「单调栈 / 单调队列高频题」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- 单调栈的"出栈"瞬间是触发计算的时机，要想清"该位置的左右边界"是什么
- 树状数组 / 线段树能处理范围最值，但常数大；单调队列在窗口移动场景下最优

## prefix-sum-difference-2d

title: 前缀和 / 差分进阶：二维 + 区间更新
followups: [prefix-sum-difference-2d-followup-1]
difficulty: 进阶
tags: [算法, 前缀和, 高频]

### 一句话

**一维前缀和** O(1) 查询区间和；**一维差分**反过来：O(1) 区间更新 + 最后一次性还原。**二维前缀和**用容斥（左 + 上 - 左上）；**二维差分**对四个角加减。组合使用解"多次区间加 + 最后查询"。

### 题目

"给一个数组做 m 次区间加，最后查询某个位置的值" 怎么 O(n + m)？二维呢？

### 答案要点

- **一维前缀和**
  - 构造：`pre[i + 1] = pre[i] + a[i]`
  - 区间和：`sum(l, r) = pre[r + 1] - pre[l]`
- **一维差分**
  - `diff[i] = a[i] - a[i - 1]`
  - 区间 `[l, r]` 加 `v`：`diff[l] += v; diff[r + 1] -= v`
  - 复原：累计 prefix sum 一遍
  - 多次 update + 最后查所有值：O(n + m)
- **二维前缀和**
  - `S[i][j] = S[i-1][j] + S[i][j-1] - S[i-1][j-1] + a[i][j]`
  - 子矩阵和（容斥）：`sum(r1,c1,r2,c2) = S[r2][c2] - S[r1-1][c2] - S[r2][c1-1] + S[r1-1][c1-1]`
- **二维差分**
  - 矩形加 v：四个角分别 `+v / -v / -v / +v`
  - 复原：先按行做前缀和，再按列做前缀和（或反过来）
- **典型应用**
  - 区间和检索（leetcode 303、304）
  - 航班预订统计（差分）
  - 地图航拍：多次矩形加颜色后查询某点
  - 模拟二维卷积 / 模糊：积分图加速
- **取模 / 大数**
  - 大区间累加可能溢出 32 位，JS 用 BigInt 或确保不超 2^53

### 代码示例

```ts
class NumArray {
  pre: number[];
  constructor(nums: number[]) {
    this.pre = new Array(nums.length + 1).fill(0);
    for (let i = 0; i < nums.length; i++) this.pre[i + 1] = this.pre[i] + nums[i];
  }
  sumRange(l: number, r: number): number {
    return this.pre[r + 1] - this.pre[l];
  }
}

function applyRangeAdds(n: number, ops: [number, number, number][]): number[] {
  const diff = new Array(n + 1).fill(0);
  for (const [l, r, v] of ops) {
    diff[l] += v;
    diff[r + 1] -= v;
  }
  const a = new Array(n);
  let cur = 0;
  for (let i = 0; i < n; i++) {
    cur += diff[i];
    a[i] = cur;
  }
  return a;
}

class NumMatrix {
  S: number[][];
  constructor(m: number[][]) {
    const R = m.length,
      C = m[0].length;
    this.S = Array.from({ length: R + 1 }, () => new Array(C + 1).fill(0));
    for (let i = 1; i <= R; i++)
      for (let j = 1; j <= C; j++)
        this.S[i][j] = this.S[i - 1][j] + this.S[i][j - 1] - this.S[i - 1][j - 1] + m[i - 1][j - 1];
  }
  sumRegion(r1: number, c1: number, r2: number, c2: number): number {
    return this.S[r2 + 1][c2 + 1] - this.S[r1][c2 + 1] - this.S[r2 + 1][c1] + this.S[r1][c1];
  }
}

function applyMatrixAdds(
  R: number,
  C: number,
  ops: [number, number, number, number, number][],
): number[][] {
  const d = Array.from({ length: R + 1 }, () => new Array(C + 1).fill(0));
  for (const [r1, c1, r2, c2, v] of ops) {
    d[r1][c1] += v;
    d[r1][c2 + 1] -= v;
    d[r2 + 1][c1] -= v;
    d[r2 + 1][c2 + 1] += v;
  }
  for (let i = 0; i < R; i++)
    for (let j = 0; j < C; j++) {
      if (i) d[i][j] += d[i - 1][j];
      if (j) d[i][j] += d[i][j - 1];
      if (i && j) d[i][j] -= d[i - 1][j - 1];
    }
  return d.slice(0, R).map((row) => row.slice(0, C));
}
```

### 追问

- 如果把「前缀和 / 差分进阶：二维 + 区间更新」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 延伸

- 三维前缀和 / 高维差分：电商热度图 / 多维 OLAP 离线分析常用
- 树上前缀和（DFS 序）：解决子树查询 / 路径查询
- 动态区间和需要"在线 update + 查询"：换成树状数组 / 线段树

## merge-intervals-deep

title: 合并重叠区间（进阶：复杂度 / 边界 / 变体）
followups: [merge-intervals-deep-followup-1, merge-intervals-deep-followup-2, merge-intervals-deep-followup-3, merge-intervals-deep-followup-4, merge-intervals-deep-followup-5, merge-intervals-deep-followup-6, merge-intervals-deep-followup-7, merge-intervals-deep-followup-8]
difficulty: 进阶
tags: [区间, 排序, 高频, 进阶]

### 一句话

按起点排序后线性扫描；遍历过程中维护"当前合并段"，新区间起点 ≤ 当前末尾就合并末尾，否则推入结果；时间 O(n log n) 取决于排序，空间 O(1)（不计返回数组）。

### 题目

给定一个无序区间数组（如 `[[1,3],[2,6],[8,10],[15,18]]`），合并所有重叠的区间，返回合并后的数组。要求说明思路、写代码、给出复杂度。

### 答案要点

- 思路：**先按起点排序**，再线性扫描合并
- 关键判定：`next.start <= cur.end` 视为重叠（注意题意是否包含相邻边界，如 [1,3] 和 [3,5] 是否合并）
- 合并方式：把 `cur.end = max(cur.end, next.end)`，否则 push(cur) 并把 cur 切到 next
- 时间 **O(n log n)**：排序占主导；扫描 O(n)
- 空间 **O(1)**（in-place 排序时；返回数组不计）或 O(log n)（排序栈）
- 边界：空数组、单元素、所有完全重叠、全部不相交
- 变体：插入新区间（LC 57，可不排序，二分定位 + 局部合并 → O(n)）；区间求和；会议室 II（最小会议室数量，扫描线 / 优先队列）

### 代码示例

```ts
function merge(intervals: number[][]): number[][] {
  if (intervals.length <= 1) return intervals;
  intervals.sort((a, b) => a[0] - b[0]);
  const out: number[][] = [intervals[0].slice()];
  for (let i = 1; i < intervals.length; i++) {
    const cur = out[out.length - 1];
    const [s, e] = intervals[i];
    if (s <= cur[1]) {
      cur[1] = Math.max(cur[1], e);
    } else {
      out.push([s, e]);
    }
  }
  return out;
}

// merge([[1,3],[2,6],[8,10],[15,18]]) → [[1,6],[8,10],[15,18]]
```

### 常见误区

- 没排序就合并：必败，错误用例如 `[[1,4],[0,2],[3,5]]`
- 用 `<` 而非 `<=`：`[1,4] [4,5]` 这种连接型不会合并（要先和面试官确认题意）
- 合并 end 时直接覆盖而不是取 max：会丢失更大的右边界，例 `[1,5] [2,3] → [1,5]` 不应变成 `[1,3]`
- 排序不稳定时左右等长区间顺序乱：JS 现代引擎已经是稳定排序，这点不大；但题面要求 stable 时要写明

### 追问

- 给一个**已排序**且**只插入一个新区间** [l,r]，怎么 O(n)？
  - 二分定位插入位置 → 向左找最早重叠 → 向右合并到第一个不重叠
- 时间复杂度为什么是 O(n log n)？能不能更快？
  - 排序下界 Ω(n log n)；如区间端点取值范围有限（如全是整数 ≤ 1e6），可桶排序 O(n + V)
- 区间总数百万级、每秒新插数万，怎么做？
  - 用 **interval tree** 或 **segment tree**；写时分摊 O(log n)，查 O(log n + k)
- 如果要返回"区间总覆盖长度"而不是合并后区间？
  - 同一遍扫描时 acc += cur[1] - cur[0]，遇到合并取 max(end, e)，最后再加最后一段

### 延伸

- 进阶：**扫描线（sweep line）** 思想可解会议室 II / 天际线问题 / 区间染色
- 工程：日志聚合（合并相邻时间窗内事件）、网络协议中已收到的 byte range（HTTP Range / TCP SACK）、Git LFS / IndexedDB 范围查询都是这类问题

## complexity-followup-1

title: 追问：如果把「时间复杂度与前端真实意义」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 基础
tags: [复杂度, 方法论, 追问]
parent: complexity

### 题目

如果面试官追问：如果把「时间复杂度与前端真实意义」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 列表渲染、搜索建议、树遍历、diff、埋点聚合都可能因复杂度失控而卡主线程
- 空间复杂度同样关键：缓存、闭包、中间数组都可能压垮低端设备
- 估算复杂度的能力 > 背题
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## two-pointer-sliding-window-followup-1

title: 追问：如果把「双指针与滑动窗口模板」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 进阶
tags: [双指针, 滑动窗口, 追问]
parent: two-pointer-sliding-window

### 题目

如果面试官追问：如果把「双指针与滑动窗口模板」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 双指针：左右两个游标朝同一/相反方向移动，避免暴力 O(n²) 的嵌套循环
- 滑动窗口模板：右指针扩张，违反约束时左指针收缩，过程中维护窗口内统计量
- 空间复杂度 O(min(n, charset))：窗口最多容纳字符集大小
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## prefix-sum-followup-1

title: 追问：如果把「前缀和与差分数组」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 进阶
tags: [前缀和, 追问]
parent: prefix-sum

### 题目

如果面试官追问：如果把「前缀和与差分数组」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 二维前缀和处理矩阵区间和（图像处理、热力图）
- 树状数组（Fenwick Tree）/ 线段树支持单点修改 + 区间求和
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## linked-list-classics-followup-1

title: 追问：如果把「链表经典题：反转、合并、环检测」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 进阶
tags: [链表, 双指针, 追问]
parent: linked-list-classics

### 题目

如果面试官追问：如果把「链表经典题：反转、合并、环检测」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 反转：用 prev/cur/next 三指针滚动；递归则借助新头节点
- 合并：dummy 头节点简化边界；比较小者依次接入
- 前端场景：撤销重做栈、版本时间线（双向链表）
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## tree-traversal-followup-1

title: 追问：如果把「二叉树遍历：递归、迭代、Morris」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 进阶
tags: [树, DFS, BFS, 追问]
parent: tree-traversal

### 题目

如果面试官追问：如果把「二叉树遍历：递归、迭代、Morris」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 前/中/后序的递归本质相同，区别只是访问根节点的时机
- 迭代版需要显式栈模拟递归
- Morris 遍历可达 O(1) 空间，但写法较复杂
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## debounce-throttle-handwritten-followup-1

title: 追问：如果把「手写防抖与节流」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 进阶
tags: [手写, 高频, 追问]
parent: debounce-throttle-handwritten

### 题目

如果面试官追问：如果把「手写防抖与节流（含 cancel/leading/trailing）」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 防抖：每次触发清除上次定时器，到达 wait 后才执行；leading 表示首次立即触发
- 防抖适合搜索输入；节流适合 scroll/mousemove；按钮防连点二者皆可
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## promise-handwritten-followup-1

title: 追问：实现 Promise.allSettled
difficulty: 资深
tags: [Promise, 手写, 高频, 追问]
parent: promise-handwritten

### 题目

如果面试官追问：实现 Promise.allSettled

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- p-limit / p-queue 是工业实现，支持优先级、超时、重试
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## promise-handwritten-followup-2

title: 追问：Promise.any 和 race 区别
difficulty: 资深
tags: [Promise, 手写, 高频, 追问]
parent: promise-handwritten

### 题目

如果面试官追问：Promise.any 和 race 区别

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- race：第一个落定（成功或失败）即结果
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## promise-handwritten-followup-3

title: 追问：async/await 是基于 Promise 实现的吗
difficulty: 资深
tags: [Promise, 手写, 高频, 追问]
parent: promise-handwritten

### 题目

如果面试官追问：async/await 是基于 Promise 实现的吗

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- all：要保序、任一 reject 立即短路、空数组立即 resolve、用 Promise.resolve 兼容非 thenable
- 并发限流：维护 worker 队列，循环消费 task 数组，结束后 Promise.all 等所有 worker
- then 必须返回新 Promise（链式），别在原 Promise 上挂
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## lru-cache-followup-1

title: 追问：如果把「手写 LRU 缓存」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 资深
tags: [缓存, 手写, 高频, 追问]
parent: lru-cache

### 题目

如果面试官追问：如果把「手写 LRU 缓存（O(1) 读写）」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 真实工程：浏览器 BFCache / V8 inline cache / DB query cache 都用 LRU 思想
- 浏览器的 HTTP 缓存、图片缓存、Pinia 持久化插件常用 LRU
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## flatten-array-followup-1

title: 追问：如果把「手写数组扁平化」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 进阶
tags: [数组, 手写, 追问]
parent: flatten-array

### 题目

如果面试官追问：如果把「手写数组扁平化（多种实现 + 限制深度）」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 递归 + reduce 简洁但深层数组易爆栈
- 注意稀疏数组、非数组元素和深度参数语义
- 对象扁平化：{ a: { b: 1 } } → { 'a.b': 1 }，常用于 antd Form 与配置管理
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## binary-search-followup-1

title: 追问：如果把「二分查找的边界陷阱」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 进阶
tags: [二分, 高频, 追问]
parent: binary-search

### 题目

如果面试官追问：如果把「二分查找的边界陷阱」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 先把问题拉回「二分查找的边界陷阱」的核心机制，说明这个追问考察的是落地边界、失败条件和方案取舍，而不是单点定义。
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## dp-classic-followup-1

title: 追问：如果把「DP 经典题：爬楼梯、最长上升子序列、编辑距离」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 资深
tags: [DP, 高频, 追问]
parent: dp-classic

### 题目

如果面试官追问：如果把「DP 经典题：爬楼梯、最长上升子序列、编辑距离」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 爬楼梯：状态转移 f(n) = f(n-1) + f(n-2)，可滚动变量优化
- 编辑距离：二维 DP，分别对应增/删/改三种转移
- 编辑距离用于搜索建议、拼写纠错、diff
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## frontend-real-world-followup-1

title: 追问：如果把「前端实战中的算法：虚拟列表 / 路由匹配 / Trie 搜索」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 资深
tags: [工程实战, 追问]
parent: frontend-real-world

### 题目

如果面试官追问：如果把「前端实战中的算法：虚拟列表 / 路由匹配 / Trie 搜索」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 虚拟列表：可视区间 + 二分定位 + 偏移量缓存
- Trie：搜索建议、敏感词、自动补全
- 路由匹配：树或正则配合通配符，按优先级命中
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## graph-bfs-dfs-followup-1

title: 追问：如果把「图的 BFS / DFS 与前端真实场景」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 进阶
tags: [图, BFS, DFS, 追问]
parent: graph-bfs-dfs

### 题目

如果面试官追问：如果把「图的 BFS / DFS 与前端真实场景」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- BFS：层次遍历、最短路径、最少跳数；用 queue 实现
- DFS：拓扑排序、检测环、深度优先生成树；递归或显式 stack
- 大型图常用 Dijkstra / A\*，前端如果做地图 / 路径规划要看 priority queue
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## bit-manipulation-followup-1

title: 追问：如果把「位运算技巧与前端用例」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 进阶
tags: [位运算, 性能, 追问]
parent: bit-manipulation

### 题目

如果面试官追问：如果把「位运算技巧与前端用例」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 注意：JS 位运算把数字转 32 位带符号整数，超过 2^31-1 就会溢出，BigInt 才支持任意位
- ECMAScript 的位运算只能 32 位 + 带符号，做 IPv4 / 网卡掩码够用，更大用 BigInt
- 真正的性能瓶颈基本不是位运算，但在内核 / 编辑器 / 引擎里还是常见
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## lru-cache-impl-followup-1

title: 追问：LRU 的数据结构经典实现
difficulty: 进阶
tags: [数据结构, 手写, 高频, 追问]
parent: lru-cache-impl

### 题目

如果面试官追问：LRU 的数据结构经典实现（双向链表 + 哈希表）

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 经典实现 = 双向链表 + 哈希表；JS 中可借助内置 Map（保留插入顺序）省掉链表
- 浏览器请求缓存、React Query 的 cache、SWR 的 cache 都是 LRU 思想
- LFU（最不经常使用）按访问次数淘汰，需要双堆或额外数据结构
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## lru-cache-impl-followup-2

title: 追问：LFU 和 LRU 区别
difficulty: 进阶
tags: [数据结构, 手写, 高频, 追问]
parent: lru-cache-impl

### 题目

如果面试官追问：LFU 和 LRU 区别

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 浏览器请求缓存、React Query 的 cache、SWR 的 cache 都是 LRU 思想
- LFU（最不经常使用）按访问次数淘汰，需要双堆或额外数据结构
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## lru-cache-impl-followup-3

title: 追问：Map 的迭代顺序为什么是插入序
difficulty: 进阶
tags: [数据结构, 手写, 高频, 追问]
parent: lru-cache-impl

### 题目

如果面试官追问：Map 的迭代顺序为什么是插入序

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 经典实现 = 双向链表 + 哈希表；JS 中可借助内置 Map（保留插入顺序）省掉链表
- put：先检查是否存在（存在就先删），插入；超过容量时 Map.keys().next().value 拿到第一个 key 删除
- 复杂度：所有操作 O(1)（Map 内部有 O(1) 的访问与删除）
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## merge-intervals-followup-1

title: 追问：如果把「合并区间」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 基础
tags: [数组, 排序, 高频, 追问]
parent: merge-intervals

### 题目

如果面试官追问：如果把「合并区间」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 合并条件：current[0] <= last[1]
- 合并方式：last[1] = Math.max(last[1], current[1])
- 类似题：插入区间、会议室安排、电话号码段去重
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## promise-all-impl-followup-1

title: 追问：如果把「手写实现 Promise.all」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 进阶
tags: [Promise, 手写, 高频, 追问]
parent: promise-all-impl

### 题目

如果面试官追问：如果把「手写实现 Promise.all」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- Promise.allSettled 把 reject 也当作 settle 计数即可
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## kth-largest-followup-1

title: 追问：如果把「数组中第 K 大的元素」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 进阶
tags: [排序, 堆, 高频, 追问]
parent: kth-largest

### 题目

如果面试官追问：如果把「数组中第 K 大的元素（快速选择 / 小顶堆）」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 方法 2：小顶堆：维护大小为 k 的小顶堆，遍历 nums，堆 size > k 时 pop。最终堆顶就是第 k 大。时间 O(n log k)
- 方法 3：快速选择 (Quickselect)：基于快排 partition，期望 O(n)，最坏 O(n²)。适合一次性查找
- TopK 大数据场景：小顶堆 + 流式处理，外存数据用 MapReduce + 局部 TopK 合并
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## bitwise-tricks-followup-1

title: 追问：如果把「位运算高频技巧一题打尽」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 进阶
tags: [算法, 位运算, 高频, 追问]
parent: bitwise-tricks

### 题目

如果面试官追问：如果把「位运算高频技巧一题打尽」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- JS 位运算把数字转 32 位有符号整数，超过会溢出
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## sliding-window-advanced-followup-1

title: 追问：如果把「滑动窗口进阶：变长窗口 + 不变量维护」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 资深
tags: [算法, 滑动窗口, 高频, 追问]
parent: sliding-window-advanced

### 题目

如果面试官追问：如果把「滑动窗口进阶：变长窗口 + 不变量维护」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- while right < n：扩张（加入 nums[right]）→ while 不满足不变量：收缩（剔除 nums[left]）→ 更新答案 → right++
- 答案在"扩张完且不变量满足"那一刻取
- 恰好 k 个不同字符：拆成"至多 k - 至多 k-1"两个变长窗口的差
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## monotonic-stack-queue-followup-1

title: 追问：如果把「单调栈 / 单调队列高频题」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 资深
tags: [算法, 单调栈, 单调队列, 高频, 追问]
parent: monotonic-stack-queue

### 题目

如果面试官追问：如果把「单调栈 / 单调队列高频题」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 不变量：栈 / 队列从底/头到顶/尾保持单调（递减或递增）
- 滑动窗口最大值：维护递减队列，队头超出窗口就弹
- 长度限制的最大子数组和（前缀和 + 单调队列）
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## prefix-sum-difference-2d-followup-1

title: 追问：如果把「前缀和 / 差分进阶：二维 + 区间更新」用到真实项目里，你会重点关注哪些边界、验证手段和取舍
difficulty: 进阶
tags: [算法, 前缀和, 高频, 追问]
parent: prefix-sum-difference-2d

### 题目

如果面试官追问：如果把「前缀和 / 差分进阶：二维 + 区间更新」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 区间和：sum(l, r) = pre[r + 1] - pre[l]
- 区间 [l, r] 加 v：diff[l] += v; diff[r + 1] -= v
- 复原：先按行做前缀和，再按列做前缀和（或反过来）
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## merge-intervals-deep-followup-1

title: 追问：给一个已排序且只插入一个新区间 l,r，怎么 O
difficulty: 进阶
tags: [区间, 排序, 高频, 进阶, 追问]
parent: merge-intervals-deep

### 题目

如果面试官追问：给一个**已排序**且**只插入一个新区间** [l,r]，怎么 O(n)？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 变体：插入新区间（LC 57，可不排序，二分定位 + 局部合并 → O(n)）；区间求和；会议室 II（最小会议室数量，扫描线 / 优先队列）
- 排序不稳定时左右等长区间顺序乱：JS 现代引擎已经是稳定排序，这点不大；但题面要求 stable 时要写明
- 进阶：扫描线（sweep line） 思想可解会议室 II / 天际线问题 / 区间染色
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## merge-intervals-deep-followup-2

title: 追问：二分定位插入位置 → 向左找最早重叠 → 向右合并到第一个不重叠
difficulty: 进阶
tags: [区间, 排序, 高频, 进阶, 追问]
parent: merge-intervals-deep

### 题目

如果面试官追问：二分定位插入位置 → 向左找最早重叠 → 向右合并到第一个不重叠

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 思路：先按起点排序，再线性扫描合并
- 关键判定：next.start <= cur.end 视为重叠（注意题意是否包含相邻边界，如 [1,3] 和 [3,5] 是否合并）
- 合并方式：把 cur.end = max(cur.end, next.end)，否则 push(cur) 并把 cur 切到 next
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## merge-intervals-deep-followup-3

title: 追问：时间复杂度为什么是 O？能不能更快
difficulty: 进阶
tags: [区间, 排序, 高频, 进阶, 追问]
parent: merge-intervals-deep

### 题目

如果面试官追问：时间复杂度为什么是 O(n log n)？能不能更快？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 时间 O(n log n)：排序占主导；扫描 O(n)
- 空间 O(1)（in-place 排序时；返回数组不计）或 O(log n)（排序栈）
- 工程：日志聚合（合并相邻时间窗内事件）、网络协议中已收到的 byte range（HTTP Range / TCP SACK）、Git LFS / IndexedDB 范围查询都是这类问题
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## merge-intervals-deep-followup-4

title: 追问：排序下界 Ω；如区间端点取值范围有限，可桶排序 O
difficulty: 进阶
tags: [区间, 排序, 高频, 进阶, 追问]
parent: merge-intervals-deep

### 题目

如果面试官追问：排序下界 Ω(n log n)；如区间端点取值范围有限（如全是整数 ≤ 1e6），可桶排序 O(n + V)

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 思路：先按起点排序，再线性扫描合并
- 时间 O(n log n)：排序占主导；扫描 O(n)
- 空间 O(1)（in-place 排序时；返回数组不计）或 O(log n)（排序栈）
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## merge-intervals-deep-followup-5

title: 追问：区间总数百万级、每秒新插数万，怎么做
difficulty: 进阶
tags: [区间, 排序, 高频, 进阶, 追问]
parent: merge-intervals-deep

### 题目

如果面试官追问：区间总数百万级、每秒新插数万，怎么做？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 变体：插入新区间（LC 57，可不排序，二分定位 + 局部合并 → O(n)）；区间求和；会议室 II（最小会议室数量，扫描线 / 优先队列）
- 排序不稳定时左右等长区间顺序乱：JS 现代引擎已经是稳定排序，这点不大；但题面要求 stable 时要写明
- 进阶：扫描线（sweep line） 思想可解会议室 II / 天际线问题 / 区间染色
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## merge-intervals-deep-followup-6

title: 追问：用 interval tree 或 segment tree；写时分摊 O，查 O
difficulty: 进阶
tags: [区间, 排序, 高频, 进阶, 追问]
parent: merge-intervals-deep

### 题目

如果面试官追问：用 **interval tree** 或 **segment tree**；写时分摊 O(log n)，查 O(log n + k)

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 时间 O(n log n)：排序占主导；扫描 O(n)
- 空间 O(1)（in-place 排序时；返回数组不计）或 O(log n)（排序栈）
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## merge-intervals-deep-followup-7

title: 追问：如果要返回"区间总覆盖长度"而不是合并后区间
difficulty: 进阶
tags: [区间, 排序, 高频, 进阶, 追问]
parent: merge-intervals-deep

### 题目

如果面试官追问：如果要返回"区间总覆盖长度"而不是合并后区间？

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 变体：插入新区间（LC 57，可不排序，二分定位 + 局部合并 → O(n)）；区间求和；会议室 II（最小会议室数量，扫描线 / 优先队列）
- 合并 end 时直接覆盖而不是取 max：会丢失更大的右边界，例 [1,5] [2,3] → [1,5] 不应变成 [1,3]
- 排序不稳定时左右等长区间顺序乱：JS 现代引擎已经是稳定排序，这点不大；但题面要求 stable 时要写明
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。

## merge-intervals-deep-followup-8

title: 追问：同一遍扫描时 acc += cur1 - cur0，遇到合并取 max，最后再加最后一段
difficulty: 进阶
tags: [区间, 排序, 高频, 进阶, 追问]
parent: merge-intervals-deep

### 题目

如果面试官追问：同一遍扫描时 acc += cur[1] - cur[0]，遇到合并取 max(end, e)，最后再加最后一段

### 答案要点

#### 回答思路

- 先给一句结论：这个问题要从「为什么需要它」「它解决了什么问题」「代价是什么」三个角度回答。
- 再把结论落回原题，不要脱离上下文泛泛而谈；面试官通常会顺着边界、异常和工程成本继续追问。
- 如果涉及实现细节，按数据流、状态变化、调用顺序或生命周期拆开讲；如果涉及方案选择，必须说明为什么不用另一个方案。

#### 结合原题展开

- 思路：先按起点排序，再线性扫描合并
- 关键判定：next.start <= cur.end 视为重叠（注意题意是否包含相邻边界，如 [1,3] 和 [3,5] 是否合并）
- 合并方式：把 cur.end = max(cur.end, next.end)，否则 push(cur) 并把 cur 切到 next
- 可以补充一个真实项目语境：上线前先约定输入输出、失败兜底和观测指标，避免只在 demo 场景下成立。

#### 工程落地

- 验证手段要具体：单元测试覆盖边界条件，集成测试覆盖主流程，必要时用 e2e 或回放数据验证真实链路。
- 运行时要可观测：关键路径打日志或埋点，关注错误率、耗时、资源占用、用户可感知延迟和降级次数。
- 发布策略要稳：高风险变更建议灰度、开关或回滚预案；如果会影响数据一致性，还要说明迁移和兼容策略。

#### 易错点

- 不要只背 API 或概念名，要说清楚适用条件；很多方案在小流量、单端、无异常时看起来都成立。
- 不要忽略默认值、兼容性、异常回滚、性能退化和团队维护成本，这些往往是资深面试继续深挖的重点。
- 如果答案里出现“总是”“一定”“完全替代”这类绝对表述，要主动补充例外场景。
