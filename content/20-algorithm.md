---
id: 20-algorithm
title: 算法与数据结构
order: 20
icon: 🧠
description: 前端高频算法题、数据结构手写实现、复杂度分析与真实工程映射。
---

## complexity
title: 时间复杂度与前端真实意义
difficulty: 基础
tags: [复杂度, 方法论]

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
    for (let j = i + 1; j < arr.length; j++)
      if (arr[i] === arr[j]) out.push(arr[i]);
  return out;
}
// 正解：O(n) 哈希表
function dupFast(arr: string[]) {
  const seen = new Set<string>(), dup = new Set<string>();
  for (const s of arr) (seen.has(s) ? dup : seen).add(s);
  return [...dup];
}
```

### 延伸
- 估算复杂度的能力 > 背题
- 浏览器 Long Task API（`PerformanceObserver` 监听 `longtask` 类型）可在线发现 > 50ms 的任务

## two-pointer-sliding-window
title: 双指针与滑动窗口模板
difficulty: 进阶
tags: [双指针, 滑动窗口]

### 题目
手写"无重复字符的最长子串"（LeetCode 3），并说明为什么是 O(n)。

### 答案要点
- 滑动窗口：右指针扩张，遇到重复时左指针收缩，保持窗口内合法
- 用 Map 记录字符上次出现位置，左指针直接跳过去
- 每个字符最多被左右指针各访问一次，O(n)

### 代码示例
```ts
function lengthOfLongestSubstring(s: string): number {
  const last = new Map<string, number>();
  let left = 0, max = 0;
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

### 延伸
- 滑动窗口三件套：扩张条件、收缩条件、记录答案位置
- 前端实战：搜索建议节流去重、虚拟列表的可视区间维护

## prefix-sum
title: 前缀和与差分数组
difficulty: 进阶
tags: [前缀和]

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
  for (const [l, r, v] of ops) { diff[l] += v; diff[r + 1] -= v; }
  const arr: number[] = [];
  let cur = 0;
  for (let i = 0; i < n; i++) { cur += diff[i]; arr.push(cur); }
  return arr;
}
```

### 延伸
- 二维前缀和处理矩阵区间和（图像处理、热力图）
- 树状数组（Fenwick Tree）/ 线段树支持单点修改 + 区间求和

## linked-list-classics
title: 链表经典题：反转、合并、环检测
difficulty: 进阶
tags: [链表, 双指针]

### 题目
手写：单链表反转（迭代+递归）、合并两个有序链表、Floyd 判圈算法。

### 答案要点
- 反转：用 prev/cur/next 三指针滚动；递归则借助新头节点
- 合并：dummy 头节点简化边界；比较小者依次接入
- 判圈：快慢指针，相遇则有环；找入口需要数学推导（再走 head 同步）

### 代码示例
```ts
class ListNode { val: number; next: ListNode | null = null; constructor(v: number) { this.val = v; } }

// 反转（迭代）
function reverse(head: ListNode | null): ListNode | null {
  let prev: ListNode | null = null, cur = head;
  while (cur) { const next = cur.next; cur.next = prev; prev = cur; cur = next; }
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
    if (a.val <= b.val) { tail.next = a; a = a.next; }
    else { tail.next = b; b = b.next; }
    tail = tail.next!;
  }
  tail.next = a ?? b;
  return dummy.next;
}

// 判圈（Floyd 龟兔赛跑）
function hasCycle(head: ListNode | null): boolean {
  let slow = head, fast = head;
  while (fast && fast.next) {
    slow = slow!.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}
```

### 延伸
- 找环入口：相遇后让一个指针回到 head，同步前进，再次相遇即入口
- 前端场景：撤销重做栈、版本时间线（双向链表）

## tree-traversal
title: 二叉树遍历：递归、迭代、Morris
difficulty: 进阶
tags: [树, DFS, BFS]

### 题目
手写二叉树的前/中/后序遍历（递归+迭代）和层序遍历。

### 答案要点
- 前/中/后序的递归本质相同，区别只是访问根节点的时机
- 迭代版需要显式栈模拟递归
- 层序使用队列 BFS，按层入队记录每层节点
- Morris 遍历可达 O(1) 空间，但写法较复杂

### 代码示例
```ts
class TreeNode { val: number; left: TreeNode | null = null; right: TreeNode | null = null; constructor(v: number) { this.val = v; } }

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
  const out: number[] = [], stack: TreeNode[] = [];
  let cur = root;
  while (cur || stack.length) {
    while (cur) { stack.push(cur); cur = cur.left; }
    cur = stack.pop()!;
    out.push(cur.val);
    cur = cur.right;
  }
  return out;
}

// 层序（BFS）
function levelOrder(root: TreeNode | null): number[][] {
  if (!root) return [];
  const out: number[][] = [], q: TreeNode[] = [root];
  while (q.length) {
    const size = q.length, level: number[] = [];
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

### 延伸
- Morris 遍历用 O(1) 空间，借助叶子节点的 right 指针建立"线索"
- 前端场景：菜单树、组织架构、AST 遍历、Vue 模板编译的 transform

## debounce-throttle-handwritten
title: 手写防抖与节流（含 cancel/leading/trailing）
difficulty: 进阶
tags: [手写, 高频]

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
  debounced.cancel = () => { clearTimeout(timer); timer = null; };
  return debounced;
}

function throttle<T extends Fn>(fn: T, wait = 200, opts: { leading?: boolean; trailing?: boolean } = {}) {
  let lastTime = 0, timer: any = null, lastArgs: any;
  const { leading = true, trailing = true } = opts;
  return function (this: any, ...args: Parameters<T>) {
    const now = Date.now();
    if (!lastTime && !leading) lastTime = now;
    const remain = wait - (now - lastTime);
    lastArgs = args;
    if (remain <= 0) {
      if (timer) { clearTimeout(timer); timer = null; }
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

### 延伸
- VueUse 的 `useDebounceFn`/`useThrottleFn` 已包装好响应式版本
- 防抖适合搜索输入；节流适合 scroll/mousemove；按钮防连点二者皆可

## promise-handwritten
title: 手写 Promise.all / allSettled / race / 限流并发
difficulty: 资深
tags: [Promise, 手写, 高频]

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
      Promise.resolve(p).then(
        v => { out[i] = v; if (++cnt === ps.length) resolve(out); },
        reject,
      ),
    );
  });
}

function allSettled<T>(ps: Promise<T>[]) {
  return Promise.all(ps.map(p =>
    Promise.resolve(p).then(
      value => ({ status: 'fulfilled' as const, value }),
      reason => ({ status: 'rejected' as const, reason }),
    ),
  ));
}

function race<T>(ps: Promise<T>[]): Promise<T> {
  return new Promise((resolve, reject) => ps.forEach(p => Promise.resolve(p).then(resolve, reject)));
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

### 延伸
- 文件分片上传、批量请求 API 都需要并发限流
- `p-limit` / `p-queue` 是工业实现，支持优先级、超时、重试

## lru-cache
title: 手写 LRU 缓存（O(1) 读写）
difficulty: 资深
tags: [缓存, 手写, 高频]

### 题目
实现 LRU 缓存，要求 get/put 均为 O(1)。

### 答案要点
- 哈希表 + 双向链表：哈希表 O(1) 查找节点，链表 O(1) 移动头尾
- ES Map 自带"插入顺序"特性，可用一个小技巧把 Map 当 LRU

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
  private remove(node: any) { node.prev.next = node.next; node.next.prev = node.prev; }
  private addToHead(node: any) {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next.prev = node;
    this.head.next = node;
  }
  get(key: K): V | undefined {
    const node = this.map.get(key);
    if (!node) return undefined;
    this.remove(node); this.addToHead(node);
    return node.val;
  }
  put(key: K, val: V) {
    let node = this.map.get(key);
    if (node) { node.val = val; this.remove(node); this.addToHead(node); return; }
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

### 延伸
- LFU 还需按"使用频次"维护多条链表
- 浏览器的 HTTP 缓存、图片缓存、Pinia 持久化插件常用 LRU

## flatten-array
title: 手写数组扁平化（多种实现 + 限制深度）
difficulty: 进阶
tags: [数组, 手写]

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
  return arr.reduce((acc, cur) =>
    acc.concat(Array.isArray(cur) && depth > 0 ? flat1(cur, depth - 1) : cur),
    [] as any[]);
}

// 2. 栈迭代（避免递归爆栈）
function flat2(arr: any[]): any[] {
  const stack = [...arr], res: any[] = [];
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

### 延伸
- 对象扁平化：`{ a: { b: 1 } } → { 'a.b': 1 }`，常用于 antd Form 与配置管理
- 注意大数组用方案 1 可能爆栈（V8 默认栈深 ~10k 层）

## binary-search
title: 二分查找的边界陷阱
difficulty: 进阶
tags: [二分, 高频]

### 题目
为什么二分查找经常写错？请写出"最左插入位置"和"最右插入位置"。

### 答案要点
- 三个易错点：循环条件 `<` vs `<=`、`mid` 计算溢出、`left/right` 更新方向
- 推荐统一写法：左闭右开区间 `[left, right)`，循环条件 `left < right`，命中条件用 `arr[mid] < target`

### 代码示例
```ts
// 最左插入位置（lower_bound）
function leftBound(arr: number[], t: number): number {
  let l = 0, r = arr.length;
  while (l < r) {
    const m = (l + r) >>> 1;
    if (arr[m] < t) l = m + 1;
    else r = m;
  }
  return l;
}

// 最右插入位置（upper_bound）
function rightBound(arr: number[], t: number): number {
  let l = 0, r = arr.length;
  while (l < r) {
    const m = (l + r) >>> 1;
    if (arr[m] <= t) l = m + 1;
    else r = m;
  }
  return l;
}
```

### 延伸
- `(l + r) / 2` 在大数组下可能溢出，用 `(l + r) >>> 1` 或 `l + ((r - l) >> 1)`
- 前端场景：虚拟列表定位可视区间起止 index

## dp-classic
title: DP 经典题：爬楼梯、最长上升子序列、编辑距离
difficulty: 资深
tags: [DP, 高频]

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
  let a = 1, b = 1;
  for (let i = 2; i <= n; i++) [a, b] = [b, a + b];
  return b;
}

// 最长上升子序列 O(n log n)（贪心+二分）
function lis(nums: number[]): number {
  const tails: number[] = [];
  for (const n of nums) {
    let l = 0, r = tails.length;
    while (l < r) {
      const m = (l + r) >>> 1;
      if (tails[m] < n) l = m + 1; else r = m;
    }
    tails[l] = n;
  }
  return tails.length;
}

// 编辑距离（Levenshtein）
function minDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
  return dp[m][n];
}
```

### 延伸
- LIS 也是 Vue3 diff 算法的底层（最小化移动）
- 编辑距离用于搜索建议、拼写纠错、diff

## frontend-real-world
title: 前端实战中的算法：虚拟列表 / 路由匹配 / Trie 搜索
difficulty: 资深
tags: [工程实战]

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
  let l = 0, r = offsets.length;
  while (l < r) {
    const m = (l + r) >>> 1;
    if (offsets[m] < scrollTop) l = m + 1; else r = m;
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
  return routes.find(r => {
    const re = new RegExp('^' + r.path.replace(/:\w+/g, '([^/]+)').replace(/\*/g, '.*') + '$');
    return re.test(url);
  });
}
```

### 延伸
- Vue3 diff 用 LIS 求最少移动；React Fiber 调度用最小堆
- 复杂搜索还可上 Aho-Corasick（多模式匹配）、倒排索引
