---
id: 20-algorithm
title: 算法与数据结构
order: 20
icon: 🧠
description: 前端高频算法题、数据结构手写实现、复杂度分析与真实工程映射。
---

## complexity

title: 时间复杂度与前端真实意义
followups: [complexity-followup-1, complexity-followup-2, complexity-followup-3]
difficulty: 基础
tags: [复杂度, 方法论]

### 一句话

这题的高分关键是把 复杂度 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

为什么前端工程师也必须对复杂度敏感？以"渲染 1 万条评论"为例说明。

### 答案要点

- 列表渲染、搜索建议、树遍历、diff、埋点聚合都可能因复杂度失控而卡主线程
- O(n²) 在 100 条数据无感，但 1 万条上是 1 亿次操作 → 直接长任务
- 浏览器主线程一旦阻塞 50ms 即影响 INP，长期阻塞会触发卡顿监控
- 空间复杂度同样关键：缓存、闭包、中间数组都可能压垮低端设备

#### 工程化补充

- 场景前提：时间复杂度与前端真实意义 只有在瓶颈被数据证实时才值得推进；先确认 复杂度 是否真是主耗时来源。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 时间复杂度与前端真实意义 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

- 「时间复杂度与前端真实意义」有哪些容易漏掉的边界输入和复杂度陷阱？
- 如果数据规模扩大一个数量级，你会如何调整数据结构或算法？
- 你会怎么证明实现正确，而不是只靠几个样例跑通？

### 常见误区

- 回答「时间复杂度与前端真实意义」时如果只写代码，不解释复杂度和边界输入，无法体现工程可靠性。
- 只写出代码，不说明复杂度、边界输入、稳定性和为什么这种数据结构合适。
- 递归/双指针/哈希表等套路没有处理空值、重复元素、越界和极端规模。
- 相关标签是 复杂度、方法论，回答时要补充可验证手段：如何构造边界样例、如何证明复杂度、如何用用例覆盖异常输入。

### 延伸

- 估算复杂度的能力 > 背题
- 浏览器 Long Task API（`PerformanceObserver` 监听 `longtask` 类型）可在线发现 > 50ms 的任务

## two-pointer-sliding-window

title: 双指针与滑动窗口模板
followups: [two-pointer-sliding-window-followup-1, two-pointer-sliding-window-followup-2, two-pointer-sliding-window-followup-3]
difficulty: 进阶
tags: [双指针, 滑动窗口]

### 一句话

讲「双指针与滑动窗口模板」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

手写"无重复字符的最长子串"（LeetCode 3），并说明为什么是 O(n)。

### 答案要点

- 双指针：左右两个游标朝同一/相反方向移动，避免暴力 O(n²) 的嵌套循环
- 滑动窗口模板：右指针扩张，违反约束时左指针收缩，过程中维护窗口内统计量
- 用 Map 记录字符上次出现位置，遇到重复直接把左指针跳到 lastIndex + 1
- 时间复杂度 O(n)：每个字符最多被左右指针各访问一次（amortized 分析）

#### 工程化补充

- 场景前提：回答 双指针与滑动窗口模板 时先锁定 双指针 的边界条件，避免把经验结论当成通用规则。
- 失败风险：常见风险是只给理想路径，忽略 双指针 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 双指针 的可复现用例、线上监控指标和回退演练记录。

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

- 「双指针与滑动窗口模板」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「双指针与滑动窗口模板」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明复杂度、边界输入和反例，答案会缺少可信度。
- 相关标签是 双指针、滑动窗口，回答时要补充可验证手段：如何构造边界样例、如何证明复杂度、如何用用例覆盖异常输入。

### 延伸

- 滑动窗口三件套：扩张条件、收缩条件、记录答案位置
- 前端实战：搜索建议节流去重、虚拟列表的可视区间维护

## prefix-sum

title: 前缀和与差分数组
followups: [prefix-sum-followup-1, prefix-sum-followup-2, prefix-sum-followup-3]
difficulty: 进阶
tags: [前缀和]

### 一句话

讲「前缀和与差分数组」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

设计一个 NumArray，支持频繁查询区间和，要求 query O(1)。

### 答案要点

- 预处理 prefix[i] = a[0]+...+a[i-1]
- 查询 [l, r] = prefix[r+1] - prefix[l]
- 前端场景：埋点聚合、热力图、统计图表的区间求和

#### 工程化补充

- 失败风险：高风险是边界输入遗漏，导致复杂度失控或结果错误。
- 验收信号：验收至少给边界样例、复杂度证明和大规模压测结果。

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

- 「前缀和与差分数组」有哪些容易漏掉的边界输入和复杂度陷阱？
- 如果数据规模扩大一个数量级，你会如何调整数据结构或算法？
- 你会怎么证明实现正确，而不是只靠几个样例跑通？

### 常见误区

- 回答「前缀和与差分数组」时如果只写代码，不解释复杂度和边界输入，无法体现工程可靠性。
- 只写出代码，不说明复杂度、边界输入、稳定性和为什么这种数据结构合适。
- 递归/双指针/哈希表等套路没有处理空值、重复元素、越界和极端规模。
- 相关标签是 前缀和，回答时要补充可验证手段：如何构造边界样例、如何证明复杂度、如何用用例覆盖异常输入。

### 延伸

- 二维前缀和处理矩阵区间和（图像处理、热力图）
- 树状数组（Fenwick Tree）/ 线段树支持单点修改 + 区间求和

## linked-list-classics

title: 链表经典题：反转、合并、环检测
followups: [linked-list-classics-followup-1, linked-list-classics-followup-2, linked-list-classics-followup-3]
difficulty: 进阶
tags: [链表, 双指针]

### 一句话

讲「链表经典题：反转、合并、环检测」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

手写：单链表反转（迭代+递归）、合并两个有序链表、Floyd 判圈算法。

### 答案要点

- 反转：用 prev/cur/next 三指针滚动；递归则借助新头节点
- 合并：dummy 头节点简化边界；比较小者依次接入
- 判圈：快慢指针，相遇则有环；找入口需要数学推导（再走 head 同步）

#### 工程化补充

- 失败风险：高风险是边界输入遗漏，导致复杂度失控或结果错误。
- 验收信号：验收至少给边界样例、复杂度证明和大规模压测结果。

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

- 「链表经典题：反转、合并、环检测」有哪些容易漏掉的边界输入和复杂度陷阱？
- 如果数据规模扩大一个数量级，你会如何调整数据结构或算法？
- 你会怎么证明实现正确，而不是只靠几个样例跑通？

### 常见误区

- 回答「链表经典题：反转、合并、环检测」时如果只写代码，不解释复杂度和边界输入，无法体现工程可靠性。
- 只写出代码，不说明复杂度、边界输入、稳定性和为什么这种数据结构合适。
- 递归/双指针/哈希表等套路没有处理空值、重复元素、越界和极端规模。
- 相关标签是 链表、双指针，回答时要补充可验证手段：如何构造边界样例、如何证明复杂度、如何用用例覆盖异常输入。

### 延伸

- 找环入口：相遇后让一个指针回到 head，同步前进，再次相遇即入口
- 前端场景：撤销重做栈、版本时间线（双向链表）

## tree-traversal

title: 二叉树遍历：递归、迭代、Morris
followups: [tree-traversal-followup-1, tree-traversal-followup-2, tree-traversal-followup-3]
difficulty: 进阶
tags: [树, DFS, BFS]

### 一句话

这题回答要覆盖 DFS 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

手写二叉树的前/中/后序遍历（递归+迭代）和层序遍历。

### 答案要点

- 前/中/后序的递归本质相同，区别只是访问根节点的时机
- 迭代版需要显式栈模拟递归
- 层序使用队列 BFS，按层入队记录每层节点
- Morris 遍历可达 O(1) 空间，但写法较复杂

#### 工程化补充

- 场景前提：先声明输入规模和内存预算，再讨论 二叉树遍历：递归、迭代、Morris；复杂度边界不清会导致方案失真。
- 失败风险：高风险是边界输入遗漏，导致复杂度失控或结果错误。
- 验收信号：验收至少给边界样例、复杂度证明和大规模压测结果。

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

- 「二叉树遍历：递归、迭代、Morris」有哪些容易漏掉的边界输入和复杂度陷阱？
- 如果数据规模扩大一个数量级，你会如何调整数据结构或算法？
- 你会怎么证明实现正确，而不是只靠几个样例跑通？

### 常见误区

- 回答「二叉树遍历：递归、迭代、Morris」时如果只写代码，不解释复杂度和边界输入，无法体现工程可靠性。
- 只写出代码，不说明复杂度、边界输入、稳定性和为什么这种数据结构合适。
- 递归/双指针/哈希表等套路没有处理空值、重复元素、越界和极端规模。
- 相关标签是 树、DFS、BFS，回答时要补充可验证手段：如何构造边界样例、如何证明复杂度、如何用用例覆盖异常输入。

### 延伸

- Morris 遍历用 O(1) 空间，借助叶子节点的 right 指针建立"线索"
- 前端场景：菜单树、组织架构、AST 遍历、Vue 模板编译的 transform

## debounce-throttle-handwritten

title: 手写防抖与节流（含 cancel/leading/trailing）
followups: [debounce-throttle-handwritten-followup-1, debounce-throttle-handwritten-followup-2, debounce-throttle-handwritten-followup-3]
links: [01-javascript/debounce-throttle, 01-javascript/debounce-immediate]
difficulty: 进阶
tags: [手写, 高频]

### 一句话

这题回答要覆盖 手写 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

实现防抖、节流，支持 leading（首次立即）、trailing（结束触发）、cancel。

### 答案要点

- 防抖：每次触发清除上次定时器，到达 wait 后才执行；leading 表示首次立即触发
- 节流：固定时间窗口内最多执行一次；trailing 表示结束补一次
- 都要支持 cancel 释放 timer，避免内存泄漏与组件卸载后还触发
- 通用注意点：保留 this 与参数透传

#### 工程化补充

- 场景前提：先定义 手写防抖与节流（含 cancel/leading/trailing） 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 失败风险：常见风险是只给理想路径，忽略 手写 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 手写 的可复现用例、线上监控指标和回退演练记录。

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

- 「手写防抖与节流（含 cancel/leading/trailing）」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「手写防抖与节流（含 cancel/leading/trailing）」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明复杂度、边界输入和反例，答案会缺少可信度。
- 相关标签是 手写、高频，回答时要补充可验证手段：如何构造边界样例、如何证明复杂度、如何用用例覆盖异常输入。

### 延伸

- VueUse 的 `useDebounceFn`/`useThrottleFn` 已包装好响应式版本
- 防抖适合搜索输入；节流适合 scroll/mousemove；按钮防连点二者皆可

## promise-handwritten

title: 手写 Promise.all / allSettled / race / 限流并发
followups: [promise-handwritten-followup-1, promise-handwritten-followup-2, promise-handwritten-followup-3]
difficulty: 资深
tags: [Promise, 手写, 高频]

### 一句话

讲「手写 Promise.all / allSettled / race / 限流并发」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

实现 `Promise.all`、`allSettled`、`race`，再实现一个限流 N 的并发执行器。

### 答案要点

- all：要保序、任一 reject 立即短路、空数组立即 resolve、用 Promise.resolve 兼容非 thenable
- allSettled：等全部完成，分别记录 fulfilled/rejected
- race：第一个落定（成功或失败）即结果
- 并发限流：维护 worker 队列，循环消费 task 数组，结束后 Promise.all 等所有 worker

#### 工程化补充

- 失败风险：常见故障是重试与幂等策略不一致，最终把瞬时故障放大为数据错乱。
- 验收信号：验收至少看超时率、重试成功率、限流命中和降级触发频次。

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
followups: [lru-cache-followup-1, lru-cache-followup-2, lru-cache-followup-3]
difficulty: 资深
tags: [缓存, 手写, 高频]

### 一句话

这题的高分关键是把 缓存 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

实现 LRU 缓存，要求 get/put 均为 O(1)。

### 答案要点

- 核心数据结构：哈希表 + 双向链表
- 哈希表 O(1) 通过 key 找到链表节点
- 双向链表 O(1) 把节点移到头部 / 删除尾节点
- get(key)：命中 → 把节点移到头部，返回 value；未命中返回 -1

#### 工程化补充

- 场景前提：手写 LRU 缓存（O(1) 读写） 只有在瓶颈被数据证实时才值得推进；先确认 缓存 是否真是主耗时来源。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 手写 LRU 缓存（O(1) 读写） 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

- 你会先看哪些指标来判断「手写 LRU 缓存（O(1) 读写）」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「手写 LRU 缓存（O(1) 读写）」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 缓存、手写、高频，回答时要补充可验证手段：如何构造边界样例、如何证明复杂度、如何用用例覆盖异常输入。

### 延伸

- LFU 还需按"使用频次"维护多条链表
- 浏览器的 HTTP 缓存、图片缓存、Pinia 持久化插件常用 LRU

## flatten-array

title: 手写数组扁平化（多种实现 + 限制深度）
followups: [flatten-array-followup-1, flatten-array-followup-2, flatten-array-followup-3]
difficulty: 进阶
tags: [数组, 手写]

### 一句话

讲「手写数组扁平化（多种实现 + 限制深度）」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

手写数组扁平化（含限制深度），并对比递归、栈迭代、`while+some`、原生 `flat` 各自的优缺点。

### 答案要点

- 递归 + reduce 简洁但深层数组易爆栈
- 栈迭代避免递归调用，适合超大嵌套
- arr.flat(Infinity) 是现代最佳选项
- 注意稀疏数组、非数组元素和深度参数语义

#### 工程化补充

- 失败风险：高风险是边界输入遗漏，导致复杂度失控或结果错误。
- 验收信号：验收至少给边界样例、复杂度证明和大规模压测结果。

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

- 「手写数组扁平化（多种实现 + 限制深度）」有哪些容易漏掉的边界输入和复杂度陷阱？
- 如果数据规模扩大一个数量级，你会如何调整数据结构或算法？
- 你会怎么证明实现正确，而不是只靠几个样例跑通？

### 常见误区

- 回答「手写数组扁平化（多种实现 + 限制深度）」时如果只写代码，不解释复杂度和边界输入，无法体现工程可靠性。
- 只写出代码，不说明复杂度、边界输入、稳定性和为什么这种数据结构合适。
- 递归/双指针/哈希表等套路没有处理空值、重复元素、越界和极端规模。
- 相关标签是 数组、手写，回答时要补充可验证手段：如何构造边界样例、如何证明复杂度、如何用用例覆盖异常输入。

### 延伸

- 对象扁平化：`{ a: { b: 1 } } → { 'a.b': 1 }`，常用于 antd Form 与配置管理
- 注意大数组用方案 1 可能爆栈（V8 默认栈深 ~10k 层）

## binary-search

title: 二分查找的边界陷阱
followups: [binary-search-followup-1, binary-search-followup-2, binary-search-followup-3]
difficulty: 进阶
tags: [二分, 高频]

### 一句话

回答「二分查找的边界陷阱」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

为什么二分查找经常写错？请写出"最左插入位置"和"最右插入位置"。

### 答案要点

- 三个易错点：循环条件 < vs <=、mid 计算溢出、left/right 更新方向
- 推荐统一写法：左闭右开区间 [left, right)，循环条件 left < right，命中条件用 arr[mid] < target
- 可以围绕 二分、高频 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。

#### 工程化补充

- 场景前提：先定义 二分查找的边界陷阱 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 失败风险：常见风险是只给理想路径，忽略 二分 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 二分 的可复现用例、线上监控指标和回退演练记录。

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

- 「二分查找的边界陷阱」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「二分查找的边界陷阱」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明复杂度、边界输入和反例，答案会缺少可信度。
- 相关标签是 二分、高频，回答时要补充可验证手段：如何构造边界样例、如何证明复杂度、如何用用例覆盖异常输入。

### 延伸

- `(l + r) / 2` 在大数组下可能溢出，用 `(l + r) >>> 1` 或 `l + ((r - l) >> 1)`
- 前端场景：虚拟列表定位可视区间起止 index

## dp-classic

title: DP 经典题：爬楼梯、最长上升子序列、编辑距离
followups: [dp-classic-followup-1, dp-classic-followup-2, dp-classic-followup-3]
difficulty: 资深
tags: [DP, 高频]

### 一句话

回答「DP 经典题：爬楼梯、最长上升子序列、编辑距离」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

手写三道经典 DP：爬楼梯（O(1) 空间）、最长上升子序列（O(n log n)）、编辑距离。

### 答案要点

- 爬楼梯：状态转移 f(n) = f(n-1) + f(n-2)，可滚动变量优化
- LIS：贪心 + 二分维护尾部最小值数组，长度即 LIS 长度
- 编辑距离：二维 DP，分别对应增/删/改三种转移

#### 工程化补充

- 场景前提：先定义 DP 经典题：爬楼梯、最长上升子序列、编辑距离 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。
- 失败风险：常见风险是只给理想路径，忽略 DP 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 DP 的可复现用例、线上监控指标和回退演练记录。

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

- 「DP 经典题：爬楼梯、最长上升子序列、编辑距离」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「DP 经典题：爬楼梯、最长上升子序列、编辑距离」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明复杂度、边界输入和反例，答案会缺少可信度。
- 相关标签是 DP、高频，回答时要补充可验证手段：如何构造边界样例、如何证明复杂度、如何用用例覆盖异常输入。

### 延伸

- LIS 也是 Vue3 diff 算法的底层（最小化移动）
- 编辑距离用于搜索建议、拼写纠错、diff

## frontend-real-world

title: 前端实战中的算法：虚拟列表 / 路由匹配 / Trie 搜索
followups: [frontend-real-world-followup-1, frontend-real-world-followup-2, frontend-real-world-followup-3]
links: [21-interview-special/design-virtual-list]
difficulty: 资深
tags: [工程实战]

### 一句话

回答「前端实战中的算法：虚拟列表 / 路由匹配 / Trie 搜索」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

列举几个真实业务里"算法不是面试题，而是产品能力基础"的例子，并写出关键代码。

### 答案要点

- 虚拟列表：可视区间 + 二分定位 + 偏移量缓存
- Trie：搜索建议、敏感词、自动补全
- 路由匹配：树或正则配合通配符，按优先级命中
- Vue3 diff 用 LIS、React Fiber 调度用最小堆，都是真实算法落地

#### 工程化补充

- 场景前提：前端实战中的算法：虚拟列表 / 路由匹配 / Trie 搜索 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

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

- 推动「前端实战中的算法：虚拟列表 / 路由匹配 / Trie 搜索」落地时，你会如何设计灰度、回滚和迁移路径？
- 如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？
- 你会用哪些指标判断这个工程方案长期值得维护？

### 常见误区

- 回答「前端实战中的算法：虚拟列表 / 路由匹配 / Trie 搜索」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。
- 只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。
- 忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。
- 相关标签是 工程实战，回答时要补充可验证手段：如何构造边界样例、如何证明复杂度、如何用用例覆盖异常输入。

### 延伸

- Vue3 diff 用 LIS 求最少移动；React Fiber 调度用最小堆
- 复杂搜索还可上 Aho-Corasick（多模式匹配）、倒排索引

## graph-bfs-dfs

title: 图的 BFS / DFS 与前端真实场景
followups: [graph-bfs-dfs-followup-1, graph-bfs-dfs-followup-2, graph-bfs-dfs-followup-3]
difficulty: 进阶
tags: [图, BFS, DFS]

### 一句话

这题的高分关键是把 BFS 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

图遍历在前端有哪些落地场景？BFS / DFS 怎么选？

### 答案要点

- BFS：层次遍历、最短路径、最少跳数；用 queue 实现
- DFS：拓扑排序、检测环、深度优先生成树；递归或显式 stack
- 组件树遍历：找父级 / 找最近 ancestor / 收集所有 prop
- 路由依赖图：动态路由懒加载顺序

#### 工程化补充

- 失败风险：高风险是边界输入遗漏，导致复杂度失控或结果错误。
- 验收信号：验收至少给边界样例、复杂度证明和大规模压测结果。

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

- 「图的 BFS / DFS 与前端真实场景」有哪些容易漏掉的边界输入和复杂度陷阱？
- 如果数据规模扩大一个数量级，你会如何调整数据结构或算法？
- 你会怎么证明实现正确，而不是只靠几个样例跑通？

### 常见误区

- 回答「图的 BFS / DFS 与前端真实场景」时如果只写代码，不解释复杂度和边界输入，无法体现工程可靠性。
- 只写出代码，不说明复杂度、边界输入、稳定性和为什么这种数据结构合适。
- 递归/双指针/哈希表等套路没有处理空值、重复元素、越界和极端规模。
- 相关标签是 图、BFS、DFS，回答时要补充可验证手段：如何构造边界样例、如何证明复杂度、如何用用例覆盖异常输入。

### 延伸

- 大型图常用 Dijkstra / A\*，前端如果做地图 / 路径规划要看 priority queue
- React Fiber 用 DFS 但分片，每个时间片处理一定数量的 fiber，再让步给浏览器

## bit-manipulation

title: 位运算技巧与前端用例
followups: [bit-manipulation-followup-1, bit-manipulation-followup-2, bit-manipulation-followup-3]
difficulty: 进阶
tags: [位运算, 性能]

### 一句话

讲「位运算技巧与前端用例」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

JS 也能位运算，常见技巧有哪些？什么时候真的有用？

### 答案要点

- 状态标志位：把多个 bool 压成一个 number，用 & | ^ 检查 / 设置 / 翻转
- 整数判断：x & 1 判奇偶；(x & (x - 1)) === 0 判是否 2 的幂
- 取反 / 取整：~~x ≈ Math.trunc(x)（仅在 32 位整数范围内安全）
- 取最高位：Math.clz32 / 31 - Math.clz32(x)

#### 工程化补充

- 场景前提：位运算技巧与前端用例 只有在瓶颈被数据证实时才值得推进；先确认 位运算 是否真是主耗时来源。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 位运算技巧与前端用例 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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

- 你会先看哪些指标来判断「位运算技巧与前端用例」是不是当前性能瓶颈？
- 优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？
- 如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？

### 常见误区

- 回答「位运算技巧与前端用例」时如果不先给指标和测量方式，很容易变成凭经验调参。
- 先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。
- 只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。
- 相关标签是 位运算、性能，回答时要补充可验证手段：如何构造边界样例、如何证明复杂度、如何用用例覆盖异常输入。

### 延伸

- ECMAScript 的位运算只能 32 位 + 带符号，做 IPv4 / 网卡掩码够用，更大用 BigInt
- 真正的性能瓶颈基本不是位运算，但在内核 / 编辑器 / 引擎里还是常见

## lru-cache-impl

title: 实现一个 LRU 缓存（用 Map 的简洁实现）
followups: [lru-cache-impl-followup-1, lru-cache-impl-followup-2, lru-cache-impl-followup-3]
difficulty: 进阶
tags: [数据结构, 手写, 高频]

### 一句话

这题回答要覆盖 数据结构 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

请实现一个 `LRUCache` 类，支持 `get(key)` 与 `put(key, value)`，时间复杂度 O(1)。

### 答案要点

- 经典实现 = 双向链表 + 哈希表；JS 中可借助内置 Map（保留插入顺序）省掉链表
- get：命中后 delete + set，让这个 key "刷新"到最近位置
- put：先检查是否存在（存在就先删），插入；超过容量时 Map.keys().next().value 拿到第一个 key 删除
- 复杂度：所有操作 O(1)（Map 内部有 O(1) 的访问与删除）

#### 工程化补充

- 场景前提：回答 实现一个 LRU 缓存（用 Map 的简洁实现） 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 实现一个 LRU 缓存（用 Map 的简洁实现） 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

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
followups: [merge-intervals-followup-1, merge-intervals-followup-2, merge-intervals-followup-3]
difficulty: 基础
tags: [数组, 排序, 高频]

### 一句话

回答「合并区间」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

给定一组区间 `[[1,3],[2,6],[8,10],[15,18]]`，合并所有重叠的区间。

### 答案要点

- 时间 O(n log n)，瓶颈在排序
- 按左端点升序排序后，遍历一次即可
- 合并条件：current[0] <= last[1]
- 合并方式：last[1] = Math.max(last[1], current[1])

#### 工程化补充

- 场景前提：先声明输入规模和内存预算，再讨论 合并区间；复杂度边界不清会导致方案失真。
- 失败风险：高风险是边界输入遗漏，导致复杂度失控或结果错误。
- 验收信号：验收至少给边界样例、复杂度证明和大规模压测结果。

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

- 「合并区间」有哪些容易漏掉的边界输入和复杂度陷阱？
- 如果数据规模扩大一个数量级，你会如何调整数据结构或算法？
- 你会怎么证明实现正确，而不是只靠几个样例跑通？

### 常见误区

- 回答「合并区间」时如果只写代码，不解释复杂度和边界输入，无法体现工程可靠性。
- 只写出代码，不说明复杂度、边界输入、稳定性和为什么这种数据结构合适。
- 递归/双指针/哈希表等套路没有处理空值、重复元素、越界和极端规模。
- 相关标签是 数组、排序、高频，回答时要补充可验证手段：如何构造边界样例、如何证明复杂度、如何用用例覆盖异常输入。

### 延伸

- 类似题：插入区间、会议室安排、电话号码段去重
- 区间问题大多套路：**先排序 + 一次遍历**

## promise-all-impl

title: 手写实现 Promise.all
followups: [promise-all-impl-followup-1, promise-all-impl-followup-2, promise-all-impl-followup-3]
links: [01-javascript/promise-all-allsettled-race-any]
difficulty: 进阶
tags: [Promise, 手写, 高频]

### 一句话

讲「手写实现 Promise.all」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

请实现 `myPromiseAll`，传入 iterable 返回 Promise，行为对齐 `Promise.all`。

### 答案要点

- 兼容数组与可迭代对象（用 for...of）
- 每个元素都用 Promise.resolve(item) 包裹，避免传入普通值时报错
- 维护"完成计数 + 结果数组"，按原始下标存放结果（不能 push，因为顺序不固定）
- 任一 reject 立刻整体 reject

#### 工程化补充

- 场景前提：回答 手写实现 Promise.all 时先锁定 Promise 的边界条件，避免把经验结论当成通用规则。
- 失败风险：常见风险是只给理想路径，忽略 Promise 的失败分支与恢复动作。
- 验收信号：验收至少包含围绕 Promise 的可复现用例、线上监控指标和回退演练记录。

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

- 「手写实现 Promise.all」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 回答「手写实现 Promise.all」时不要停在定义层，要补充适用条件、失效边界和验证方式。
- 如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。
- 如果不说明复杂度、边界输入和反例，答案会缺少可信度。
- 相关标签是 Promise、手写、高频，回答时要补充可验证手段：如何构造边界样例、如何证明复杂度、如何用用例覆盖异常输入。

### 延伸

- `Promise.allSettled` 把 reject 也当作 settle 计数即可
- `Promise.race` 谁先 settle 就谁说了算
- `Promise.any` 第一个 fulfilled 决定结果，全部 reject 抛 AggregateError

## kth-largest

title: 数组中第 K 大的元素（快速选择 / 小顶堆）
followups: [kth-largest-followup-1, kth-largest-followup-2, kth-largest-followup-3]
difficulty: 进阶
tags: [排序, 堆, 高频]

### 一句话

这题的高分关键是把 排序 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

给定数组 nums 和整数 k，请返回数组中第 k 大的元素。

### 答案要点

- 方法 1：排序：nums.sort((a,b)=>b-a)[k-1]，O(n log n)
- 方法 2：小顶堆：维护大小为 k 的小顶堆，遍历 nums，堆 size > k 时 pop。最终堆顶就是第 k 大。时间 O(n log k)
- 方法 3：快速选择 (Quickselect)：基于快排 partition，期望 O(n)，最坏 O(n²)。适合一次性查找
- 工程上经常用堆（库现成 + 流式数据可增量）；面试加分用 Quickselect

#### 工程化补充

- 失败风险：高风险是边界输入遗漏，导致复杂度失控或结果错误。
- 验收信号：验收至少给边界样例、复杂度证明和大规模压测结果。

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

- 「数组中第 K 大的元素（快速选择 / 小顶堆）」有哪些容易漏掉的边界输入和复杂度陷阱？
- 如果数据规模扩大一个数量级，你会如何调整数据结构或算法？
- 你会怎么证明实现正确，而不是只靠几个样例跑通？

### 常见误区

- 回答「数组中第 K 大的元素（快速选择 / 小顶堆）」时如果只写代码，不解释复杂度和边界输入，无法体现工程可靠性。
- 只写出代码，不说明复杂度、边界输入、稳定性和为什么这种数据结构合适。
- 递归/双指针/哈希表等套路没有处理空值、重复元素、越界和极端规模。
- 相关标签是 排序、堆、高频，回答时要补充可验证手段：如何构造边界样例、如何证明复杂度、如何用用例覆盖异常输入。

### 延伸

- LeetCode 215 经典题
- TopK 大数据场景：小顶堆 + 流式处理，外存数据用 MapReduce + 局部 TopK 合并
- Quickselect + 三向切分 + 随机化轴 = Bonus 加分

## bitwise-tricks

title: 位运算高频技巧一题打尽
followups: [bitwise-tricks-followup-1, bitwise-tricks-followup-2, bitwise-tricks-followup-3]
difficulty: 进阶
tags: [算法, 位运算, 高频]

### 一句话

讲「位运算高频技巧一题打尽」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

位运算面试常问哪些？给出可直接背的"题目模板 → 解法"清单。

### 答案要点

- 是否 2 的幂：n > 0 && (n & (n - 1)) === 0
- 二进制 1 的个数（popcount）：while (n) { n &= n - 1; cnt++; } 或 Number.prototype.toString(2).match(/1/g)?.length
- 是否为 4 的幂：n > 0 && (n & (n - 1)) === 0 && (n & 0x55555555)
- 数组中只有一个数出现一次，其余出现两次 → 全部 ^= 起来

#### 工程化补充

- 失败风险：高风险是边界输入遗漏，导致复杂度失控或结果错误。
- 验收信号：验收至少给边界样例、复杂度证明和大规模压测结果。

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

- 「位运算高频技巧一题打尽」有哪些容易漏掉的边界输入和复杂度陷阱？
- 如果数据规模扩大一个数量级，你会如何调整数据结构或算法？
- 你会怎么证明实现正确，而不是只靠几个样例跑通？

### 常见误区

- 回答「位运算高频技巧一题打尽」时如果只写代码，不解释复杂度和边界输入，无法体现工程可靠性。
- 只写出代码，不说明复杂度、边界输入、稳定性和为什么这种数据结构合适。
- 递归/双指针/哈希表等套路没有处理空值、重复元素、越界和极端规模。
- 相关标签是 算法、位运算、高频，回答时要补充可验证手段：如何构造边界样例、如何证明复杂度、如何用用例覆盖异常输入。

### 延伸

- 树状数组（Fenwick Tree）整个建立在 lowbit 上，`update / query` 都是 `i += i & -i`
- 旧浏览器没有 popcount 硬件指令，热点路径用查表法（256 项）

## sliding-window-advanced

title: 滑动窗口进阶：变长窗口 + 不变量维护
followups: [sliding-window-advanced-followup-1, sliding-window-advanced-followup-2, sliding-window-advanced-followup-3]
difficulty: 资深
tags: [算法, 滑动窗口, 高频]

### 一句话

这题的高分关键是把 算法 讲成可执行方案：前提清晰、步骤可落地、验收可验证。

### 题目

比起"长度 K 的最大和"这种入门题，变长窗口怎么形成统一思路？讲讲常见变形。

### 答案要点

- while right < n：扩张（加入 nums[right]）→ while 不满足不变量：收缩（剔除 nums[left]）→ 更新答案 → right++
- 答案在"扩张完且不变量满足"那一刻取
- 维护一个轻量统计（哈希表 / 计数器 / 和），保证 left/right 移动 O(1) 更新
- 引入 valid 计数器统计"满足条件的字符种类数"，避免每次扫整张哈希

#### 工程化补充

- 失败风险：高风险是边界输入遗漏，导致复杂度失控或结果错误。
- 验收信号：验收至少给边界样例、复杂度证明和大规模压测结果。

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

- 「滑动窗口进阶：变长窗口 + 不变量维护」有哪些容易漏掉的边界输入和复杂度陷阱？
- 如果数据规模扩大一个数量级，你会如何调整数据结构或算法？
- 你会怎么证明实现正确，而不是只靠几个样例跑通？

### 常见误区

- 回答「滑动窗口进阶：变长窗口 + 不变量维护」时如果只写代码，不解释复杂度和边界输入，无法体现工程可靠性。
- 只写出代码，不说明复杂度、边界输入、稳定性和为什么这种数据结构合适。
- 递归/双指针/哈希表等套路没有处理空值、重复元素、越界和极端规模。
- 相关标签是 算法、滑动窗口、高频，回答时要补充可验证手段：如何构造边界样例、如何证明复杂度、如何用用例覆盖异常输入。

### 延伸

- 滑动窗口能 work 的核心：随 right 增大，"满足条件的最小 left" 也单调不降；这是双指针正确性来源
- 不单调的场景（比如有负数累加和）：滑动窗口失效，改用前缀和 + 单调队列 / 哈希

## monotonic-stack-queue

title: 单调栈 / 单调队列高频题
followups: [monotonic-stack-queue-followup-1, monotonic-stack-queue-followup-2, monotonic-stack-queue-followup-3]
difficulty: 资深
tags: [算法, 单调栈, 单调队列, 高频]

### 一句话

这题回答要覆盖 算法 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

为什么"下一个更大元素"和"滑动窗口最大值"都能 O(n)？它们的共同思想是什么？

### 答案要点

- 共同思想：及时丢弃永远用不到的候选
- 当我们在比较 nums[i] 时，若栈/队尾元素 < nums[i]，则前者永远不可能是后续位置的"最大值候选"，直接弹掉
- 不变量：栈 / 队列从底/头到顶/尾保持单调（递减或递增）
- 下一个更大元素（直接 / 循环数组）

#### 工程化补充

- 场景前提：先声明输入规模和内存预算，再讨论 单调栈 / 单调队列高频题；复杂度边界不清会导致方案失真。
- 失败风险：高风险是边界输入遗漏，导致复杂度失控或结果错误。
- 验收信号：验收至少给边界样例、复杂度证明和大规模压测结果。

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

- 「单调栈 / 单调队列高频题」有哪些容易漏掉的边界输入和复杂度陷阱？
- 如果数据规模扩大一个数量级，你会如何调整数据结构或算法？
- 你会怎么证明实现正确，而不是只靠几个样例跑通？

### 常见误区

- 回答「单调栈 / 单调队列高频题」时如果只写代码，不解释复杂度和边界输入，无法体现工程可靠性。
- 只写出代码，不说明复杂度、边界输入、稳定性和为什么这种数据结构合适。
- 递归/双指针/哈希表等套路没有处理空值、重复元素、越界和极端规模。
- 相关标签是 算法、单调栈、单调队列，回答时要补充可验证手段：如何构造边界样例、如何证明复杂度、如何用用例覆盖异常输入。

### 延伸

- 单调栈的"出栈"瞬间是触发计算的时机，要想清"该位置的左右边界"是什么
- 树状数组 / 线段树能处理范围最值，但常数大；单调队列在窗口移动场景下最优

## prefix-sum-difference-2d

title: 前缀和 / 差分进阶：二维 + 区间更新
followups: [prefix-sum-difference-2d-followup-1, prefix-sum-difference-2d-followup-2, prefix-sum-difference-2d-followup-3]
difficulty: 进阶
tags: [算法, 前缀和, 高频]

### 一句话

这题回答要覆盖 算法 的适用前提、实现路径和异常处理，避免只背定义。

### 题目

"给一个数组做 m 次区间加，最后查询某个位置的值" 怎么 O(n + m)？二维呢？

### 答案要点

- 构造：pre[i + 1] = pre[i] + a[i]
- 区间和：sum(l, r) = pre[r + 1] - pre[l]
- diff[i] = a[i] - a[i - 1]
- 区间 [l, r] 加 v：diff[l] += v; diff[r + 1] -= v

#### 工程化补充

- 场景前提：先声明输入规模和内存预算，再讨论 前缀和 / 差分进阶：二维 + 区间更新；复杂度边界不清会导致方案失真。
- 失败风险：高风险是边界输入遗漏，导致复杂度失控或结果错误。
- 验收信号：验收至少给边界样例、复杂度证明和大规模压测结果。

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

- 「前缀和 / 差分进阶：二维 + 区间更新」有哪些容易漏掉的边界输入和复杂度陷阱？
- 如果数据规模扩大一个数量级，你会如何调整数据结构或算法？
- 你会怎么证明实现正确，而不是只靠几个样例跑通？

### 常见误区

- 回答「前缀和 / 差分进阶：二维 + 区间更新」时如果只写代码，不解释复杂度和边界输入，无法体现工程可靠性。
- 只写出代码，不说明复杂度、边界输入、稳定性和为什么这种数据结构合适。
- 递归/双指针/哈希表等套路没有处理空值、重复元素、越界和极端规模。
- 相关标签是 算法、前缀和、高频，回答时要补充可验证手段：如何构造边界样例、如何证明复杂度、如何用用例覆盖异常输入。

### 延伸

- 三维前缀和 / 高维差分：电商热度图 / 多维 OLAP 离线分析常用
- 树上前缀和（DFS 序）：解决子树查询 / 路径查询
- 动态区间和需要"在线 update + 查询"：换成树状数组 / 线段树

## merge-intervals-deep

title: 合并重叠区间（进阶：复杂度 / 边界 / 变体）
followups: [merge-intervals-deep-followup-1, merge-intervals-deep-followup-2, merge-intervals-deep-followup-3]
difficulty: 进阶
tags: [区间, 排序, 高频, 进阶]

### 一句话

讲「合并重叠区间（进阶：复杂度 / 边界 / 变体）」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

给定一个无序区间数组（如 `[[1,3],[2,6],[8,10],[15,18]]`），合并所有重叠的区间，返回合并后的数组。要求说明思路、写代码、给出复杂度。

### 答案要点

- 思路：先按起点排序，再线性扫描合并
- 关键判定：next.start <= cur.end 视为重叠（注意题意是否包含相邻边界，如 [1,3] 和 [3,5] 是否合并）
- 合并方式：把 cur.end = max(cur.end, next.end)，否则 push(cur) 并把 cur 切到 next
- 时间 O(n log n)：排序占主导；扫描 O(n)

#### 工程化补充

- 失败风险：高风险是边界输入遗漏，导致复杂度失控或结果错误。
- 验收信号：验收至少给边界样例、复杂度证明和大规模压测结果。

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

title: 追问：如果要评估「时间复杂度与前端真实意义」的稳定性，你会优先排查哪些复杂度相关边界
difficulty: 基础
tags: [复杂度, 方法论, 追问]
parent: complexity

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果要评估「时间复杂度与前端真实意义」的稳定性，你会优先排查哪些复杂度相关边界？

### 答案要点

#### 直答

- 结论：优先排查 时间复杂度与前端真实意义 的最坏输入规模、重复访问热点和队列峰值，确认时间与空间复杂度不会击穿预算。
- 关键动作：浏览器主线程一旦阻塞 50ms 即影响 INP，长期阻塞会触发卡顿监控。

#### 术语解释

- 复杂度：列表渲染、搜索建议、树遍历、diff、埋点聚合都可能因复杂度失控而卡主线程。
- 方法论：围绕「时间复杂度与前端真实意义」里的 方法论 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：时间复杂度与前端真实意义 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：验收看 时间复杂度与前端真实意义 相关回归测试通过率、关键日志和线上指标，三者一致才算完成。

## two-pointer-sliding-window-followup-1

title: 追问：如果要让「双指针与滑动窗口模板」稳定上线，你会优先补齐哪些与 双指针 相关的检查项
difficulty: 进阶
tags: [双指针, 滑动窗口, 追问]
parent: two-pointer-sliding-window

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果要让「双指针与滑动窗口模板」稳定上线，你会优先补齐哪些与 双指针 相关的检查项？

### 答案要点

#### 直答

- 结论：先列「双指针与滑动窗口模板」最坏失败模式并补齐降级兜底，关键链路连续稳定后再扩大影响面。
- 关键动作：双指针与滑动窗口模板 发布路径拆成“试点 -> 放量 -> 全量”，每个阶段都绑定验收门槛和回滚动作。

#### 术语解释

- 双指针与滑动窗口模板：围绕「双指针与滑动窗口模板」里的 双指针与滑动窗口模板 作答时，要给可落地动作，并说明异常处理与验收阈值。
- 双指针：左右两个游标朝同一/相反方向移动，避免暴力 O(n²) 的嵌套循环。
- 滑动窗口：右指针扩张，违反约束时左指针收缩，过程中维护窗口内统计量。

#### 风险与验收

- 主要风险：围绕 双指针与滑动窗口模板 的迁移若没有批次边界，故障会跨模块扩散并难以止损。
- 验收信号：围绕 双指针与滑动窗口模板 上线结果持续观察错误率、恢复时长和用户影响面，确认稳定后再全量。

## prefix-sum-followup-1

title: 追问：你会如何围绕 前缀和 提前识别「前缀和与差分数组」中的复杂度陷阱，避免实现后期返工
difficulty: 进阶
tags: [前缀和, 追问]
parent: prefix-sum

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你会如何围绕 前缀和 提前识别「前缀和与差分数组」中的复杂度陷阱，避免实现后期返工？

### 答案要点

#### 直答

- 结论：前缀和与差分数组 的核心风险是异常扩散，必须配置限流与熔断来保护主链路。
- 关键动作：先识别 前缀和与差分数组 高风险触发点，再定义止损动作和恢复阈值，确保故障不扩散。

#### 术语解释

- 前缀和与差分数组：前缀和与差分数组 是「前缀和与差分数组」的关键决策点，回答时要把动作、风险和回退条件讲完整。
- 前缀和：围绕「前缀和与差分数组」里的 前缀和 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。

#### 风险与验收

- 主要风险：若 前缀和与差分数组 告警阈值配置过宽，风险会被延迟发现并放大恢复成本。
- 验收信号：前缀和与差分数组 风险验收至少包含告警触发、降级执行和恢复达标三项信号。

## linked-list-classics-followup-1

title: 追问：复盘「链表经典题：反转、合并、环检测」实现风险时，你会先查哪些边界输入最容易把复杂度拉爆
difficulty: 进阶
tags: [链表, 双指针, 追问]
parent: linked-list-classics

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：复盘「链表经典题：反转、合并、环检测」实现风险时，你会先查哪些边界输入最容易把复杂度拉爆？

### 答案要点

#### 直答

- 结论：先列出 链表经典题 反转 合并 环检测 的高危失败点，再准备降级开关、兜底路径和恢复 SOP。
- 关键动作：先演练 链表经典题 反转 合并 环检测 的失败场景，再配置降级和兜底动作，最后确认恢复路径。

#### 术语解释

- 链表：在「链表经典题：反转、合并、环检测」里，链表 是高风险点，要说明最坏失败模式、降级动作和恢复路径。
- 双指针：围绕「链表经典题：反转、合并、环检测」里的 双指针 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。

#### 风险与验收

- 主要风险：若 链表经典题 反转 合并 环检测 告警阈值配置过宽，风险会被延迟发现并放大恢复成本。
- 验收信号：链表经典题 反转 合并 环检测 风险验收至少包含告警触发、降级执行和恢复达标三项信号。

## tree-traversal-followup-1

title: 追问：在当前团队与业务约束下，在「二叉树遍历：递归、迭代、Morris」这题里，哪些输入规模和边界条件最容易让复杂度失控
difficulty: 进阶
tags: [树, DFS, BFS, 追问]
parent: tree-traversal

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，在「二叉树遍历：递归、迭代、Morris」这题里，哪些输入规模和边界条件最容易让复杂度失控？

### 答案要点

#### 直答

- 结论：先列出 二叉树遍历 递归 迭代 Morris 的高危失败点，再准备降级开关、兜底路径和恢复 SOP。
- 关键动作：先演练 二叉树遍历 递归 迭代 Morris 的失败场景，再配置降级和兜底动作，最后确认恢复路径。

#### 术语解释

- Morris：Morris 遍历可达 O(1) 空间，但写法较复杂。
- DFS：DFS 是「二叉树遍历：递归、迭代、Morris」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- BFS：层序使用队列 BFS，按层入队记录每层节点。

#### 风险与验收

- 主要风险：围绕 二叉树遍历 递归 迭代 Morris 的故障若缺少降级保护，最坏情况会直接影响核心业务链路。
- 验收信号：验收看 二叉树遍历 递归 迭代 Morris 风险告警命中率、降级生效率和恢复耗时，确保异常可控可恢复。

## debounce-throttle-handwritten-followup-1

title: 追问：面对真实流量和复杂依赖时，「手写防抖与节流（含 cancel/leading/trailing）」最可能被哪些 手写 边界条件击穿
difficulty: 进阶
tags: [手写, 高频, 追问]
parent: debounce-throttle-handwritten

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：面对真实流量和复杂依赖时，「手写防抖与节流（含 cancel/leading/trailing）」最可能被哪些 手写 边界条件击穿？

### 答案要点

#### 直答

- 结论：围绕「手写防抖与节流（含 cancel/leading/trailing）」先盘点输入边界、并发峰值和失败回退三类约束，逐项压测与演练，通过后再上线。
- 关键动作：先识别 手写防抖与节流（含 cancel 高风险触发点，再定义止损动作和恢复阈值，确保故障不扩散。

#### 术语解释

- cancel/leading/trailing：围绕「手写防抖与节流（含 cancel/leading/trailing）」里的 cancel/leading/trailing 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。
- 手写：围绕「手写防抖与节流（含 cancel/leading/trailing）」里的 手写 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。
- cancel/leading/trai：围绕「手写防抖与节流（含 cancel/leading/trailing）」里的 cancel/leading/trai 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。

#### 风险与验收

- 主要风险：手写防抖与节流（含 cancel 的高风险点是异常扩散链路未被拦截，导致故障从局部升级为全局。
- 验收信号：验收看 手写防抖与节流（含 cancel 风险告警命中率、降级生效率和恢复耗时，确保异常可控可恢复。

## promise-handwritten-followup-1

title: 追问：在当前团队与业务约束下，如果要让「手写 Promise.all / allSettled / race / 限流并发」稳定上线，你会优先补齐哪些与 Promise 相关的检查项
difficulty: 资深
tags: [Promise, 手写, 高频, 追问]
parent: promise-handwritten

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，如果要让「手写 Promise.all / allSettled / race / 限流并发」稳定上线，你会优先补齐哪些与 Promise 相关的检查项？

### 答案要点

#### 直答

- 结论：先列「手写 Promise.all / allSettled / race / 限流并发」最坏失败模式并补齐降级兜底，关键链路连续稳定后再扩大影响面。
- 关键动作：手写 Promise.all 上线按批次推进：先灰度低风险流量，再逐步放量；任一批次越阈值立刻回滚。

#### 术语解释

- Promise.all：维护 worker 队列，循环消费 task 数组，结束后 Promise.all 等所有 worker。
- allSettled：等全部完成，分别记录 fulfilled/rejected。
- race：第一个落定（成功或失败）即结果。

#### 风险与验收

- 主要风险：race：第一个落定（成功或失败）即结果。
- 验收信号：围绕 手写 Promise.all 上线结果持续观察错误率、恢复时长和用户影响面，确认稳定后再全量。

## lru-cache-followup-1

title: 追问：在「手写 LRU 缓存（O(1) 读写）」场景下，你会先看哪些与 缓存 相关的指标来判断「手写 LRU 缓存（O(1) 读写）」是不是当前性能瓶颈
difficulty: 资深
tags: [缓存, 手写, 高频, 追问]
parent: lru-cache

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「手写 LRU 缓存（O(1) 读写）」场景下，你会先看哪些与 缓存 相关的指标来判断「手写 LRU 缓存（O(1) 读写）」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 结论：先定义 手写 LRU 缓存（O 读写） 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：先把「手写 LRU 缓存（O(1) 读写）」里的 手写 LRU 缓存（O 读写） 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- LRU：LRU 是「手写 LRU 缓存（O(1) 读写）」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 缓存：在「手写 LRU 缓存（O(1) 读写）」里，缓存 是验收对象，必须给可量化指标、日志信号和测试证据。
- 手写：围绕「手写 LRU 缓存（O(1) 读写）」里的 手写 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：在「手写 LRU 缓存（O(1) 读写）」里，手写 LRU 缓存（O 读写） 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「手写 LRU 缓存（O(1) 读写）」里，手写 LRU 缓存（O 读写） 至少要给一组指标阈值、一条日志证据和一组测试结果。

## flatten-array-followup-1

title: 追问：你会如何围绕 数组 提前识别「手写数组扁平化（多种实现 + 限制深度）」中的复杂度陷阱，避免实现后期返工
difficulty: 进阶
tags: [数组, 手写, 追问]
parent: flatten-array

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你会如何围绕 数组 提前识别「手写数组扁平化（多种实现 + 限制深度）」中的复杂度陷阱，避免实现后期返工？

### 答案要点

#### 直答

- 结论：上线 手写数组扁平化 前先做故障演练，确认“能发现、能止损、能恢复”三项都达标。
- 关键动作：先演练 手写数组扁平化 的失败场景，再配置降级和兜底动作，最后确认恢复路径。

#### 术语解释

- 数组：递归 + reduce 简洁但深层数组易爆栈。
- 手写：围绕「手写数组扁平化（多种实现 + 限制深度）」里的 手写 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。

#### 风险与验收

- 主要风险：围绕 手写数组扁平化 的故障若缺少降级保护，最坏情况会直接影响核心业务链路。
- 验收信号：围绕 手写数组扁平化 高风险场景要验证“能发现、能止损、能恢复”，三项都通过才算合格。

## binary-search-followup-1

title: 追问：如果要评估「二分查找的边界陷阱」的落地风险，你会优先检查哪些 二分 约束是否成立
difficulty: 进阶
tags: [二分, 高频, 追问]
parent: binary-search

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果要评估「二分查找的边界陷阱」的落地风险，你会优先检查哪些 二分 约束是否成立？

### 答案要点

#### 直答

- 结论：先列「二分查找的边界陷阱」最坏失败模式并补齐降级兜底，关键链路连续稳定后再扩大影响面。
- 关键动作：先演练 二分查找的边界陷阱 的失败场景，再配置降级和兜底动作，最后确认恢复路径。

#### 术语解释

- 二分查找的边界陷阱：围绕「二分查找的边界陷阱」里的 二分查找的边界陷阱 作答时，要给可落地动作，并说明异常处理与验收阈值。
- 二分：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。

#### 风险与验收

- 主要风险：二分查找的边界陷阱 的高风险点是异常扩散链路未被拦截，导致故障从局部升级为全局。
- 验收信号：围绕 二分查找的边界陷阱 高风险场景要验证“能发现、能止损、能恢复”，三项都通过才算合格。

## dp-classic-followup-1

title: 追问：结合真实业务约束，在真实业务里落地「DP 经典题：爬楼梯、最长上升子序列、编辑距离」时，你会先排查哪些与 DP 相关的边界假设
difficulty: 资深
tags: [DP, 高频, 追问]
parent: dp-classic

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，在真实业务里落地「DP 经典题：爬楼梯、最长上升子序列、编辑距离」时，你会先排查哪些与 DP 相关的边界假设？

### 答案要点

#### 直答

- 结论：先排查 DP 经典题 爬楼梯 最长上升子序列 编辑距离 在弱网、断连、限流与重试场景下的边界失效点，按影响面排序逐项止损。
- 关键动作：把「DP 经典题：爬楼梯、最长上升子序列、编辑距离」里的 DP 经典题 爬楼梯 最长上升子序列 编辑距离 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- DP：二维 DP，分别对应增/删/改三种转移。

#### 风险与验收

- 主要风险：DP 经典题 爬楼梯 最长上升子序列 编辑距离 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：验收至少包含「DP 经典题：爬楼梯、最长上升子序列、编辑距离」里 DP 经典题 爬楼梯 最长上升子序列 编辑距离 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## frontend-real-world-followup-1

title: 追问：真要把「前端实战中的算法：虚拟列表 / 路由匹配 / Trie 搜索」推到线上，你会如何围绕 工程实战 设计灰度节奏、回滚条件和迁移路径
difficulty: 资深
tags: [工程实战, 追问]
parent: frontend-real-world

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：真要把「前端实战中的算法：虚拟列表 / 路由匹配 / Trie 搜索」推到线上，你会如何围绕 工程实战 设计灰度节奏、回滚条件和迁移路径？

### 答案要点

#### 直答

- 结论：「前端实战中的算法：虚拟列表 / 路由匹配 / Trie 搜索」上线节奏按“低风险流量试点、分阶段放量、稳定后全量”推进，异常批次立即止损。
- 关键动作：Vue3 diff 用 LIS、React Fiber 调度用最小堆，都是真实算法落地。

#### 术语解释

- Trie：搜索建议、敏感词、自动补全。
- 工程实战：围绕「前端实战中的算法：虚拟列表 / 路由匹配 / Trie 搜索」里的 工程实战 推进上线时，要明确每个批次的放量门槛和回退条件。

#### 风险与验收

- 主要风险：若 前端实战中的算法 没有实时观测信号，异常放量后往往来不及回退。
- 验收信号：围绕 前端实战中的算法 上线结果持续观察错误率、恢复时长和用户影响面，确认稳定后再全量。

## graph-bfs-dfs-followup-1

title: 追问：结合真实业务约束，如果要评估「图的 BFS / DFS 与前端真实场景」的稳定性，你会优先排查哪些复杂度相关边界
difficulty: 进阶
tags: [图, BFS, DFS, 追问]
parent: graph-bfs-dfs

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，如果要评估「图的 BFS / DFS 与前端真实场景」的稳定性，你会优先排查哪些复杂度相关边界？

### 答案要点

#### 直答

- 结论：优先排查 图的 BFS / DFS 与前端真实场景 的最坏输入规模、重复访问热点和队列峰值，确认时间与空间复杂度不会击穿预算。
- 关键动作：把「图的 BFS / DFS 与前端真实场景」里的 图的 BFS / DFS 与前端真实场景 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- BFS：层次遍历、最短路径、最少跳数；用 queue 实现。
- DFS：拓扑排序、检测环、深度优先生成树；递归或显式 stack。

#### 风险与验收

- 主要风险：图的 BFS / DFS 与前端真实场景 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：图的 BFS / DFS 与前端真实场景 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## bit-manipulation-followup-1

title: 追问：在「位运算技巧与前端用例」场景下，你会先看哪些与 位运算 相关的指标来判断「位运算技巧与前端用例」是不是当前性能瓶颈
difficulty: 进阶
tags: [位运算, 性能, 追问]
parent: bit-manipulation

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「位运算技巧与前端用例」场景下，你会先看哪些与 位运算 相关的指标来判断「位运算技巧与前端用例」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 结论：把 位运算技巧与前端用例 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：先定义 位运算技巧与前端用例 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- 位运算技巧与前端用例：在「位运算技巧与前端用例」这道追问里，位运算技巧与前端用例 是执行抓手：需要明确触发条件、实施步骤和验收信号。
- 位运算：在「位运算技巧与前端用例」里，位运算 是验收对象，必须给可量化指标、日志信号和测试证据。
- 性能：在「位运算技巧与前端用例」里，性能 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：位运算技巧与前端用例 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「位运算技巧与前端用例」里，位运算技巧与前端用例 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## lru-cache-impl-followup-1

title: 追问：以「实现一个 LRU 缓存（用 Map 的简洁实现）」为例，你会先看哪些与 数据结构 相关的指标来判断「实现一个 LRU 缓存（用 Map 的简洁实现）」是不是当前性能瓶颈
difficulty: 进阶
tags: [数据结构, 手写, 高频, 追问]
parent: lru-cache-impl

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「实现一个 LRU 缓存（用 Map 的简洁实现）」为例，你会先看哪些与 数据结构 相关的指标来判断「实现一个 LRU 缓存（用 Map 的简洁实现）」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 结论：先定义 实现一个 LRU 缓存 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：先把「实现一个 LRU 缓存（用 Map 的简洁实现）」里的 实现一个 LRU 缓存 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- LRU：LRU 是「实现一个 LRU 缓存（用 Map 的简洁实现）」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Map：经典实现 = 双向链表 + 哈希表；JS 中可借助内置 Map（保留插入顺序）省掉链表。
- 数据结构：在「实现一个 LRU 缓存（用 Map 的简洁实现）」里，数据结构 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「实现一个 LRU 缓存（用 Map 的简洁实现）」里，实现一个 LRU 缓存 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「实现一个 LRU 缓存（用 Map 的简洁实现）」里，实现一个 LRU 缓存 至少要给一组指标阈值、一条日志证据和一组测试结果。

## lru-cache-impl-followup-2

title: 追问：以「实现一个 LRU 缓存（用 Map 的简洁实现）」为例，要证明「实现一个 LRU 缓存（用 Map 的简洁实现）」确实改善体验，你会如何围绕 数据结构 设计线上观测与对照验证
difficulty: 进阶
tags: [数据结构, 手写, 高频, 追问]
parent: lru-cache-impl

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「实现一个 LRU 缓存（用 Map 的简洁实现）」为例，要证明「实现一个 LRU 缓存（用 Map 的简洁实现）」确实改善体验，你会如何围绕 数据结构 设计线上观测与对照验证？

### 答案要点

#### 直答

- 结论：在真机与弱网回放下，对比 实现一个 LRU 缓存 的核心指标、错误率和耗时分位，连续达标后再认定收益成立。
- 关键动作：先把「实现一个 LRU 缓存（用 Map 的简洁实现）」里的 实现一个 LRU 缓存 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- LRU：LRU 是「实现一个 LRU 缓存（用 Map 的简洁实现）」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Map：经典实现 = 双向链表 + 哈希表；JS 中可借助内置 Map（保留插入顺序）省掉链表。
- 数据结构：在「实现一个 LRU 缓存（用 Map 的简洁实现）」里，数据结构 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「实现一个 LRU 缓存（用 Map 的简洁实现）」里，实现一个 LRU 缓存 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「实现一个 LRU 缓存（用 Map 的简洁实现）」里，实现一个 LRU 缓存 至少要给一组指标阈值、一条日志证据和一组测试结果。

## lru-cache-impl-followup-3

title: 追问：以「实现一个 LRU 缓存（用 Map 的简洁实现）」为例，如果「实现一个 LRU 缓存（用 Map 的简洁实现）」在 数据结构 上的收益和维护成本打架，你会怎么做取舍判断
difficulty: 进阶
tags: [数据结构, 手写, 高频, 追问]
parent: lru-cache-impl

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「实现一个 LRU 缓存（用 Map 的简洁实现）」为例，如果「实现一个 LRU 缓存（用 Map 的简洁实现）」在 数据结构 上的收益和维护成本打架，你会怎么做取舍判断？

### 答案要点

#### 直答

- 结论：先量化 实现一个 LRU 缓存 的收益上限、维护成本和故障代价，再按阈值决定继续投入还是止损切换。
- 关键动作：先拆分 实现一个 LRU 缓存 的取舍因子，再验证收益/成本比，必要时回退到低风险方案。

#### 术语解释

- LRU：LRU 是「实现一个 LRU 缓存（用 Map 的简洁实现）」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Map：经典实现 = 双向链表 + 哈希表；JS 中可借助内置 Map（保留插入顺序）省掉链表。
- 数据结构：围绕「实现一个 LRU 缓存（用 Map 的简洁实现）」里的 数据结构 评估时，不能只讲优点，还要给切换条件和止损阈值。

#### 风险与验收

- 主要风险：若 实现一个 LRU 缓存 决策只看交付速度，后续维护成本和回归成本会快速上升。
- 验收信号：围绕 实现一个 LRU 缓存 取舍结果至少给收益趋势、成本趋势和回归稳定性三组数据。

## merge-intervals-followup-1

title: 追问：在当前团队与业务约束下，在「合并区间」这题里，哪些输入规模和边界条件最容易让复杂度失控
difficulty: 基础
tags: [数组, 排序, 高频, 追问]
parent: merge-intervals

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，在「合并区间」这题里，哪些输入规模和边界条件最容易让复杂度失控？

### 答案要点

#### 直答

- 结论：合并区间 的核心风险是异常扩散，必须配置限流与熔断来保护主链路。
- 关键动作：先演练 合并区间 的失败场景，再配置降级和兜底动作，最后确认恢复路径。

#### 术语解释

- 合并区间：在「合并区间」这道追问里，合并区间 是执行抓手：需要明确触发条件、实施步骤和验收信号。
- 数组：在「合并区间」里，数组 是高风险点，要说明最坏失败模式、降级动作和恢复路径。
- 排序：时间 O(n log n)，瓶颈在排序。

#### 风险与验收

- 主要风险：合并区间 的高风险点是异常扩散链路未被拦截，导致故障从局部升级为全局。
- 验收信号：合并区间 风险验收至少包含告警触发、降级执行和恢复达标三项信号。

## promise-all-impl-followup-1

title: 追问：当「手写实现 Promise.all」进入复杂场景后，你会先验证哪些 Promise 前置条件，避免方案踩坑
difficulty: 进阶
tags: [Promise, 手写, 高频, 追问]
parent: promise-all-impl

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：当「手写实现 Promise.all」进入复杂场景后，你会先验证哪些 Promise 前置条件，避免方案踩坑？

### 答案要点

#### 直答

- 结论：验证 手写实现 Promise.all 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：先定义 手写实现 Promise.all 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- Promise.all：Promise.all 是「手写实现 Promise.all」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Promise：每个元素都用 Promise.resolve(item) 包裹，避免传入普通值时报错。
- 手写：在「手写实现 Promise.all」里，手写 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：手写实现 Promise.all 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「手写实现 Promise.all」里，手写实现 Promise.all 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## kth-largest-followup-1

title: 追问：结合真实业务约束，你会如何围绕 排序 提前识别「数组中第 K 大的元素（快速选择 / 小顶堆）」中的复杂度陷阱，避免实现后期返工
difficulty: 进阶
tags: [排序, 堆, 高频, 追问]
parent: kth-largest

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，你会如何围绕 排序 提前识别「数组中第 K 大的元素（快速选择 / 小顶堆）」中的复杂度陷阱，避免实现后期返工？

### 答案要点

#### 直答

- 结论：上线 数组中第 K 大的元素 前先做故障演练，确认“能发现、能止损、能恢复”三项都达标。
- 关键动作：围绕 数组中第 K 大的元素 建立“告警 -> 降级 -> 恢复”闭环，再推进上线。

#### 术语解释

- 排序：排序：nums.sort((a,b)=>b-a)[k-1]，O(n log n)。

#### 风险与验收

- 主要风险：围绕 数组中第 K 大的元素 的故障若缺少降级保护，最坏情况会直接影响核心业务链路。
- 验收信号：围绕 数组中第 K 大的元素 高风险场景要验证“能发现、能止损、能恢复”，三项都通过才算合格。

## bitwise-tricks-followup-1

title: 追问：评估「位运算高频技巧一题打尽」稳定性时，你会先排查哪些边界条件最容易触发故障
difficulty: 进阶
tags: [算法, 位运算, 高频, 追问]
parent: bitwise-tricks

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：评估「位运算高频技巧一题打尽」稳定性时，你会先排查哪些边界条件最容易触发故障？

### 答案要点

#### 直答

- 结论：先排查 位运算高频技巧一题打尽 在弱网、断连、限流与重试场景下的边界失效点，按影响面排序逐项止损。
- 关键动作：围绕 位运算高频技巧一题打尽 建立“告警 -> 降级 -> 恢复”闭环，再推进上线。

#### 术语解释

- 算法：围绕「位运算高频技巧一题打尽」里的 算法 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。
- 位运算：围绕「位运算高频技巧一题打尽」里的 位运算 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。

#### 风险与验收

- 主要风险：若 位运算高频技巧一题打尽 告警阈值配置过宽，风险会被延迟发现并放大恢复成本。
- 验收信号：验收看 位运算高频技巧一题打尽 风险告警命中率、降级生效率和恢复耗时，确保异常可控可恢复。

## sliding-window-advanced-followup-1

title: 追问：如果要给「滑动窗口进阶：变长窗口 + 不变量维护」做稳定性复盘，你会先检视哪些高风险边界输入
difficulty: 资深
tags: [算法, 滑动窗口, 高频, 追问]
parent: sliding-window-advanced

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果要给「滑动窗口进阶：变长窗口 + 不变量维护」做稳定性复盘，你会先检视哪些高风险边界输入？

### 答案要点

#### 直答

- 结论：上线 滑动窗口进阶 变长窗口 + 不变量维护 前先做故障演练，确认“能发现、能止损、能恢复”三项都达标。
- 关键动作：先演练 滑动窗口进阶 变长窗口 + 不变量维护 的失败场景，再配置降级和兜底动作，最后确认恢复路径。

#### 术语解释

- 算法：围绕「滑动窗口进阶：变长窗口 + 不变量维护」里的 算法 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。
- 滑动窗口：在「滑动窗口进阶：变长窗口 + 不变量维护」里，滑动窗口 是高风险点，要说明最坏失败模式、降级动作和恢复路径。

#### 风险与验收

- 主要风险：若 滑动窗口进阶 变长窗口 + 不变量维护 告警阈值配置过宽，风险会被延迟发现并放大恢复成本。
- 验收信号：滑动窗口进阶 变长窗口 + 不变量维护 风险验收至少包含告警触发、降级执行和恢复达标三项信号。

## monotonic-stack-queue-followup-1

title: 追问：在「单调栈 / 单调队列高频题」场景下，你会先补哪些边界输入校验来避免复杂度踩坑
difficulty: 资深
tags: [算法, 单调栈, 单调队列, 高频, 追问]
parent: monotonic-stack-queue

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「单调栈 / 单调队列高频题」场景下，你会先补哪些边界输入校验来避免复杂度踩坑？

### 答案要点

#### 直答

- 结论：先画出 单调栈 / 单调队列高频题 的主链路时序，再按风险分层改造并逐层验收，未达标立即回退。
- 关键动作：先明确 单调栈 / 单调队列高频题 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- 算法：围绕「单调栈 / 单调队列高频题」里的 算法 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 单调栈：围绕「单调栈 / 单调队列高频题」里的 单调栈 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 单调队列：围绕「单调栈 / 单调队列高频题」里的 单调队列 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：单调栈 / 单调队列高频题 若缺少回退开关与恢复脚本，发布失败后会拉长故障恢复窗口。
- 验收信号：在「单调栈 / 单调队列高频题」里，验收 单调栈 / 单调队列高频题 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## prefix-sum-difference-2d-followup-1

title: 追问：在当前团队与业务约束下，在「前缀和 / 差分进阶：二维 + 区间更新」这题里，哪些输入规模和边界条件最容易让复杂度失控
difficulty: 进阶
tags: [算法, 前缀和, 高频, 追问]
parent: prefix-sum-difference-2d

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，在「前缀和 / 差分进阶：二维 + 区间更新」这题里，哪些输入规模和边界条件最容易让复杂度失控？

### 答案要点

#### 直答

- 结论：前缀和 / 差分进阶 二维 + 区间更新 的核心风险是异常扩散，必须配置限流与熔断来保护主链路。
- 关键动作：先演练 前缀和 / 差分进阶 二维 + 区间更新 的失败场景，再配置降级和兜底动作，最后确认恢复路径。

#### 术语解释

- 算法：在「前缀和 / 差分进阶：二维 + 区间更新」里，算法 是高风险点，要说明最坏失败模式、降级动作和恢复路径。
- 前缀和：围绕「前缀和 / 差分进阶：二维 + 区间更新」里的 前缀和 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。

#### 风险与验收

- 主要风险：若 前缀和 / 差分进阶 二维 + 区间更新 告警阈值配置过宽，风险会被延迟发现并放大恢复成本。
- 验收信号：前缀和 / 差分进阶 二维 + 区间更新 风险验收至少包含告警触发、降级执行和恢复达标三项信号。

## merge-intervals-deep-followup-1

title: 追问：结合真实业务约束，如果要复盘「合并重叠区间（进阶：复杂度 / 边界 / 变体）」的实现风险，你会先检查哪些边界输入和复杂度问题
difficulty: 进阶
tags: [区间, 排序, 高频, 进阶, 追问]
parent: merge-intervals-deep

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，如果要复盘「合并重叠区间（进阶：复杂度 / 边界 / 变体）」的实现风险，你会先检查哪些边界输入和复杂度问题？

### 答案要点

#### 直答

- 结论：上线 合并重叠区间 前先做故障演练，确认“能发现、能止损、能恢复”三项都达标。
- 关键动作：先识别 合并重叠区间 高风险触发点，再定义止损动作和恢复阈值，确保故障不扩散。

#### 术语解释

- 区间：在「合并重叠区间（进阶：复杂度 / 边界 / 变体）」里，区间 是高风险点，要说明最坏失败模式、降级动作和恢复路径。
- 排序：先按起点排序，再线性扫描合并。

#### 风险与验收

- 主要风险：合并重叠区间 的高风险点是异常扩散链路未被拦截，导致故障从局部升级为全局。
- 验收信号：验收看 合并重叠区间 风险告警命中率、降级生效率和恢复耗时，确保异常可控可恢复。

## merge-intervals-deep-followup-2

title: 追问：以「合并重叠区间（进阶：复杂度 / 边界 / 变体）」为例，如果数据规模扩大一个数量级，你会如何围绕 区间 调整数据结构或算法
difficulty: 进阶
tags: [区间, 排序, 高频, 进阶, 追问]
parent: merge-intervals-deep

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「合并重叠区间（进阶：复杂度 / 边界 / 变体）」为例，如果数据规模扩大一个数量级，你会如何围绕 区间 调整数据结构或算法？

### 答案要点

#### 直答

- 结论：数据规模放大时，先把 合并重叠区间 的邻接结构和访问索引换成低开销实现，再加分批处理避免主线程阻塞。
- 关键动作：先明确 合并重叠区间 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- 区间：在「合并重叠区间（进阶：复杂度 / 边界 / 变体）」这题里，区间 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 排序：先按起点排序，再线性扫描合并。

#### 风险与验收

- 主要风险：在「合并重叠区间（进阶：复杂度 / 边界 / 变体）」场景下，合并重叠区间 最大风险是变更影响面估计过小，导致回归缺口被放大。
- 验收信号：在「合并重叠区间（进阶：复杂度 / 边界 / 变体）」里，合并重叠区间 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## merge-intervals-deep-followup-3

title: 追问：如果要让「合并重叠区间（进阶：复杂度 / 边界 / 变体）」的正确性可复核，你会设计哪些验证步骤
difficulty: 进阶
tags: [区间, 排序, 高频, 进阶, 追问]
parent: merge-intervals-deep

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果要让「合并重叠区间（进阶：复杂度 / 边界 / 变体）」的正确性可复核，你会设计哪些验证步骤？

### 答案要点

#### 直答

- 结论：先定「合并重叠区间（进阶：复杂度 / 边界 / 变体）」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：先统一 合并重叠区间 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- 区间：围绕「合并重叠区间（进阶：复杂度 / 边界 / 变体）」里的 区间 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 排序：先按起点排序，再线性扫描合并。

#### 风险与验收

- 主要风险：在「合并重叠区间（进阶：复杂度 / 边界 / 变体）」里，合并重叠区间 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：合并重叠区间 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## complexity-followup-2

title: 追问：在「时间复杂度与前端真实意义」场景下，围绕「时间复杂度与前端真实意义」扩容时，你会如何在正确性不退化的前提下优化 复杂度 开销
difficulty: 基础
tags: [复杂度, 方法论, 追问]
parent: complexity
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「时间复杂度与前端真实意义」场景下，围绕「时间复杂度与前端真实意义」扩容时，你会如何在正确性不退化的前提下优化 复杂度 开销？

### 答案要点

#### 直答

- 结论：先梳理 时间复杂度与前端真实意义 的输入边界与失败路径，再逐段落地改造，确保每段都可独立回滚。
- 关键动作：浏览器主线程一旦阻塞 50ms 即影响 INP，长期阻塞会触发卡顿监控。

#### 术语解释

- 复杂度：列表渲染、搜索建议、树遍历、diff、埋点聚合都可能因复杂度失控而卡主线程。
- 方法论：在「时间复杂度与前端真实意义」这题里，方法论 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：时间复杂度与前端真实意义 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：时间复杂度与前端真实意义 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## complexity-followup-3

title: 追问：结合真实业务约束，如果要在评审里证明「时间复杂度与前端真实意义」可长期维护，你会展示哪些围绕 复杂度 的正确性证据
difficulty: 基础
tags: [复杂度, 方法论, 追问]
parent: complexity
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，如果要在评审里证明「时间复杂度与前端真实意义」可长期维护，你会展示哪些围绕 复杂度 的正确性证据？

### 答案要点

#### 直答

- 结论：验证「时间复杂度与前端真实意义」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：浏览器主线程一旦阻塞 50ms 即影响 INP，长期阻塞会触发卡顿监控。

#### 术语解释

- 复杂度：列表渲染、搜索建议、树遍历、diff、埋点聚合都可能因复杂度失控而卡主线程。
- 方法论：在「时间复杂度与前端真实意义」里，方法论 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：时间复杂度与前端真实意义 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「时间复杂度与前端真实意义」里，时间复杂度与前端真实意义 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## prefix-sum-followup-2

title: 追问：在「前缀和与差分数组」场景下，面对「前缀和与差分数组」的规模放大，你会如何在 前缀和 上重排算法与数据结构优先级
difficulty: 进阶
tags: [前缀和, 追问]
parent: prefix-sum
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「前缀和与差分数组」场景下，面对「前缀和与差分数组」的规模放大，你会如何在 前缀和 上重排算法与数据结构优先级？

### 答案要点

#### 直答

- 结论：先把 前缀和与差分数组 的核心链路拆成小步快跑任务，每步验收后再推进下一步，异常立即止损。
- 关键动作：把「前缀和与差分数组」里的 前缀和与差分数组 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- 前缀和与差分数组：围绕「前缀和与差分数组」里的 前缀和与差分数组 作答时，要给可落地动作，并说明异常处理与验收阈值。
- 前缀和：在「前缀和与差分数组」这题里，前缀和 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：在「前缀和与差分数组」里，前缀和与差分数组 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：前缀和与差分数组 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## prefix-sum-followup-3

title: 追问：结合真实业务约束，如果要在评审里证明「前缀和与差分数组」可长期维护，你会展示哪些围绕 前缀和 的正确性证据
difficulty: 进阶
tags: [前缀和, 追问]
parent: prefix-sum
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，如果要在评审里证明「前缀和与差分数组」可长期维护，你会展示哪些围绕 前缀和 的正确性证据？

### 答案要点

#### 直答

- 结论：验证「前缀和与差分数组」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：先把「前缀和与差分数组」里的 前缀和与差分数组 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- 前缀和与差分数组：围绕「前缀和与差分数组」里的 前缀和与差分数组 作答时，要给可落地动作，并说明异常处理与验收阈值。
- 前缀和：围绕「前缀和与差分数组」里的 前缀和 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：在「前缀和与差分数组」里，前缀和与差分数组 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「前缀和与差分数组」里，前缀和与差分数组 至少要给一组指标阈值、一条日志证据和一组测试结果。

## linked-list-classics-followup-2

title: 追问：在当前团队与业务约束下，面对「链表经典题：反转、合并、环检测」的规模放大，你会如何在 链表 上重排算法与数据结构优先级
difficulty: 进阶
tags: [链表, 双指针, 追问]
parent: linked-list-classics
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，面对「链表经典题：反转、合并、环检测」的规模放大，你会如何在 链表 上重排算法与数据结构优先级？

### 答案要点

#### 直答

- 结论：先梳理 链表经典题 反转 合并 环检测 的输入边界与失败路径，再逐段落地改造，确保每段都可独立回滚。
- 关键动作：先梳理 链表经典题 反转 合并 环检测 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- 链表：在「链表经典题：反转、合并、环检测」这题里，链表 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 双指针：围绕「链表经典题：反转、合并、环检测」里的 双指针 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：围绕 链表经典题 反转 合并 环检测 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：链表经典题 反转 合并 环检测 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## linked-list-classics-followup-3

title: 追问：以「链表经典题：反转、合并、环检测」为例，为了让团队信服「链表经典题：反转、合并、环检测」正确，你会先补哪几类高价值校验与断言
difficulty: 进阶
tags: [链表, 双指针, 追问]
parent: linked-list-classics
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「链表经典题：反转、合并、环检测」为例，为了让团队信服「链表经典题：反转、合并、环检测」正确，你会先补哪几类高价值校验与断言？

### 答案要点

#### 直答

- 结论：先补 链表经典题 反转 合并 环检测 的边界输入断言、随机对拍和回归用例三类证据，确保结论可复核而不是样例跑通。
- 关键动作：把「链表经典题：反转、合并、环检测」里的 链表经典题 反转 合并 环检测 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- 链表：在「链表经典题：反转、合并、环检测」这题里，链表 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 双指针：围绕「链表经典题：反转、合并、环检测」里的 双指针 作答时，要说明由谁实施、怎么落地、失败后如何回退。

#### 风险与验收

- 主要风险：围绕 链表经典题 反转 合并 环检测 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：链表经典题 反转 合并 环检测 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## tree-traversal-followup-2

title: 追问：当规模上来后「二叉树遍历：递归、迭代、Morris」开始抖动，你会如何快速定位并调整最关键的 DFS 瓶颈
difficulty: 进阶
tags: [树, DFS, BFS, 追问]
parent: tree-traversal
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：当规模上来后「二叉树遍历：递归、迭代、Morris」开始抖动，你会如何快速定位并调整最关键的 DFS 瓶颈？

### 答案要点

#### 直答

- 结论：先列出 二叉树遍历 递归 迭代 Morris 的高危失败点，再准备降级开关、兜底路径和恢复 SOP。
- 关键动作：先识别 二叉树遍历 递归 迭代 Morris 高风险触发点，再定义止损动作和恢复阈值，确保故障不扩散。

#### 术语解释

- Morris：Morris 遍历可达 O(1) 空间，但写法较复杂。
- DFS：DFS 是「二叉树遍历：递归、迭代、Morris」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- BFS：层序使用队列 BFS，按层入队记录每层节点。

#### 风险与验收

- 主要风险：若 二叉树遍历 递归 迭代 Morris 告警阈值配置过宽，风险会被延迟发现并放大恢复成本。
- 验收信号：验收看 二叉树遍历 递归 迭代 Morris 风险告警命中率、降级生效率和恢复耗时，确保异常可控可恢复。

## tree-traversal-followup-3

title: 追问：在当前团队与业务约束下，你会怎么证明「二叉树遍历：递归、迭代、Morris」实现正确，而不是只靠几个样例跑通
difficulty: 进阶
tags: [树, DFS, BFS, 追问]
parent: tree-traversal
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，你会怎么证明「二叉树遍历：递归、迭代、Morris」实现正确，而不是只靠几个样例跑通？

### 答案要点

#### 直答

- 结论：把 二叉树遍历 递归 迭代 Morris 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：围绕 二叉树遍历 递归 迭代 Morris 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- Morris：Morris 遍历可达 O(1) 空间，但写法较复杂。
- DFS：DFS 是「二叉树遍历：递归、迭代、Morris」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- BFS：层序使用队列 BFS，按层入队记录每层节点。

#### 风险与验收

- 主要风险：若 二叉树遍历 递归 迭代 Morris 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：二叉树遍历 递归 迭代 Morris 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## promise-handwritten-followup-2

title: 追问：Promise.any 和 race 区别
difficulty: 资深
tags: [Promise, 手写, 高频, 追问]
parent: promise-handwritten
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：Promise.any 和 race 区别？

### 答案要点

#### 直答

- 结论：回答 Promise.any 与 race 的区别时，先讲语义差异，再讲运行时影响，最后给按场景落地的选型结论。
- 关键动作：先复盘 Promise.any 与 race 的触发条件，再定位因果链路，最后用反例验证边界。

#### 术语解释

- Promise：要保序、任一 reject 立即短路、空数组立即 resolve、用 Promise.resolve 兼容非 thenable。
- 手写：手写 决定「手写 Promise.all / allSettled / race / 限流并发」为什么会这样，回答时要把原因和失效前提讲清楚。
- Promise.any：Promise.any 是「手写 Promise.all / allSettled / race / 限流并发」里的关键技术对象，需要说明接入边界、调用方式和失败回退。

#### 风险与验收

- 主要风险：race：第一个落定（成功或失败）即结果。
- 验收信号：验收标准是 Promise.any 与 race 因果链可复现：输入触发、机制命中、修复后指标回稳。

## promise-handwritten-followup-3

title: 追问：在「手写 Promise.all / allSettled / race / 限流并发」场景下，async/await 是基于 Promise 实现的吗
difficulty: 资深
tags: [Promise, 手写, 高频, 追问]
parent: promise-handwritten
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「手写 Promise.all / allSettled / race / 限流并发」场景下，async/await 是基于 Promise 实现的吗？

### 答案要点

#### 直答

- 结论：先拆分 手写 Promise.all 的执行步骤，逐步实施并在每步后验证，异常立即回滚。
- 关键动作：先明确 手写 Promise.all 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- Promise.all：维护 worker 队列，循环消费 task 数组，结束后 Promise.all 等所有 worker。
- allSettled：等全部完成，分别记录 fulfilled/rejected。
- race：第一个落定（成功或失败）即结果。

#### 风险与验收

- 主要风险：race：第一个落定（成功或失败）即结果。
- 验收信号：在「手写 Promise.all / allSettled / race / 限流并发」里，验收 手写 Promise.all 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## lru-cache-followup-2

title: 追问：在当前团队与业务约束下，如果实验室分数变好但线上反馈一般，你会如何围绕 缓存策略 重新评估「手写 LRU 缓存」优化效果
difficulty: 资深
tags: [缓存, 手写, 高频, 追问]
parent: lru-cache
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，如果实验室分数变好但线上反馈一般，你会如何围绕 缓存策略 重新评估「手写 LRU 缓存」优化效果？

### 答案要点

#### 直答

- 结论：先拆分 手写 LRU 缓存 的执行步骤，逐步实施并在每步后验证，异常立即回滚。
- 关键动作：先明确 手写 LRU 缓存 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- 手写 LRU 缓存：围绕「手写 LRU 缓存（O(1) 读写）」里的 手写 LRU 缓存 作答时，要给可落地动作，并说明异常处理与验收阈值。
- LRU：LRU 是「手写 LRU 缓存（O(1) 读写）」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 缓存：在「手写 LRU 缓存（O(1) 读写）」这题里，缓存 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：手写 LRU 缓存 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：在「手写 LRU 缓存（O(1) 读写）」里，验收 手写 LRU 缓存 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## lru-cache-followup-3

title: 追问：在「手写 LRU 缓存」场景下，如果优化带来复杂度或兼容性成本，你会怎么评估「手写 LRU 缓存」是否值得做
difficulty: 资深
tags: [缓存, 手写, 高频, 追问]
parent: lru-cache
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「手写 LRU 缓存」场景下，如果优化带来复杂度或兼容性成本，你会怎么评估「手写 LRU 缓存」是否值得做？

### 答案要点

#### 直答

- 结论：手写 LRU 缓存 取舍必须同时给短期交付收益和长期维护负担，并明确触发切换条件。
- 关键动作：先拆分 手写 LRU 缓存 的取舍因子，再验证收益/成本比，必要时回退到低风险方案。

#### 术语解释

- 手写 LRU 缓存：在「手写 LRU 缓存（O(1) 读写）」这道追问里，手写 LRU 缓存 是执行抓手：需要明确触发条件、实施步骤和验收信号。
- LRU：LRU 是「手写 LRU 缓存（O(1) 读写）」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- 缓存：围绕「手写 LRU 缓存（O(1) 读写）」里的 缓存 评估时，不能只讲优点，还要给切换条件和止损阈值。

#### 风险与验收

- 主要风险：若 手写 LRU 缓存 决策只看交付速度，后续维护成本和回归成本会快速上升。
- 验收信号：围绕 手写 LRU 缓存 取舍结果至少给收益趋势、成本趋势和回归稳定性三组数据。

## flatten-array-followup-2

title: 追问：在当前团队与业务约束下，面对「手写数组扁平化」的规模放大，你会如何在 数组 上重排算法与数据结构优先级
difficulty: 进阶
tags: [数组, 手写, 追问]
parent: flatten-array
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，面对「手写数组扁平化」的规模放大，你会如何在 数组 上重排算法与数据结构优先级？

### 答案要点

#### 直答

- 结论：把 手写数组扁平化 拆成“现状排查 -> 最小改动 -> 验收回归”三段执行，任何一段异常都要可回退。
- 关键动作：把「手写数组扁平化（多种实现 + 限制深度）」里的 手写数组扁平化 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- 手写数组扁平化：围绕「手写数组扁平化（多种实现 + 限制深度）」里的 手写数组扁平化 作答时，要给可落地动作，并说明异常处理与验收阈值。
- 数组：递归 + reduce 简洁但深层数组易爆栈。
- 手写：在「手写数组扁平化（多种实现 + 限制深度）」这题里，手写 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：手写数组扁平化 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：手写数组扁平化 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## flatten-array-followup-3

title: 追问：如果要让「手写数组扁平化（多种实现 + 限制深度）」的正确性可复核，你会围绕 数组 设计哪些验证步骤
difficulty: 进阶
tags: [数组, 手写, 追问]
parent: flatten-array
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果要让「手写数组扁平化（多种实现 + 限制深度）」的正确性可复核，你会围绕 数组 设计哪些验证步骤？

### 答案要点

#### 直答

- 结论：先定「手写数组扁平化（多种实现 + 限制深度）」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：先统一 手写数组扁平化 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- 数组：递归 + reduce 简洁但深层数组易爆栈。
- 手写：在「手写数组扁平化（多种实现 + 限制深度）」里，手写 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「手写数组扁平化（多种实现 + 限制深度）」里，手写数组扁平化 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：手写数组扁平化 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## frontend-real-world-followup-2

title: 追问：以「前端实战中的算法：虚拟列表 / 路由匹配 / Trie 搜索」为例，如果部分模块技术债很重，你会如何围绕 工程实战 调整「前端实战中的算法：虚拟列表 / 路由匹配 / Trie 搜索」的分阶段策略
difficulty: 资深
tags: [工程实战, 追问]
parent: frontend-real-world
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「前端实战中的算法：虚拟列表 / 路由匹配 / Trie 搜索」为例，如果部分模块技术债很重，你会如何围绕 工程实战 调整「前端实战中的算法：虚拟列表 / 路由匹配 / Trie 搜索」的分阶段策略？

### 答案要点

#### 直答

- 结论：把 前端实战中的算法 拆成“基线采集 -> 小流量试点 -> 分批放量”三段推进，每段都绑定独立验收门槛和回滚开关。
- 关键动作：Vue3 diff 用 LIS、React Fiber 调度用最小堆，都是真实算法落地。

#### 术语解释

- Trie：搜索建议、敏感词、自动补全。
- 工程实战：在「前端实战中的算法：虚拟列表 / 路由匹配 / Trie 搜索」这题里，工程实战 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：在「前端实战中的算法：虚拟列表 / 路由匹配 / Trie 搜索」场景下，前端实战中的算法 最大风险是变更影响面估计过小，导致回归缺口被放大。
- 验收信号：在「前端实战中的算法：虚拟列表 / 路由匹配 / Trie 搜索」里，前端实战中的算法 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。

## frontend-real-world-followup-3

title: 追问：结合真实业务约束，你会如何用可观测数据衡量「前端实战中的算法：虚拟列表 / 路由匹配 / Trie 搜索」在 工程实战 上的维护成本和收益平衡
difficulty: 资深
tags: [工程实战, 追问]
parent: frontend-real-world
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，你会如何用可观测数据衡量「前端实战中的算法：虚拟列表 / 路由匹配 / Trie 搜索」在 工程实战 上的维护成本和收益平衡？

### 答案要点

#### 直答

- 结论：先定义 前端实战中的算法 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：Vue3 diff 用 LIS、React Fiber 调度用最小堆，都是真实算法落地。

#### 术语解释

- Trie：搜索建议、敏感词、自动补全。
- 工程实战：在「前端实战中的算法：虚拟列表 / 路由匹配 / Trie 搜索」里，工程实战 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：若 前端实战中的算法 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：前端实战中的算法 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## graph-bfs-dfs-followup-2

title: 追问：从工程落地角度看，如果数据规模扩大一个数量级，你会如何围绕 BFS 调整「图的 BFS / DFS 与前端真实场景」的数据结构或算法
difficulty: 进阶
tags: [图, BFS, DFS, 追问]
parent: graph-bfs-dfs
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，如果数据规模扩大一个数量级，你会如何围绕 BFS 调整「图的 BFS / DFS 与前端真实场景」的数据结构或算法？

### 答案要点

#### 直答

- 结论：数据规模放大时，先把 图的 BFS / DFS 与前端真实场景 的邻接结构和访问索引换成低开销实现，再加分批处理避免主线程阻塞。
- 关键动作：把「图的 BFS / DFS 与前端真实场景」里的 图的 BFS / DFS 与前端真实场景 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- BFS：层次遍历、最短路径、最少跳数；用 queue 实现。
- DFS：拓扑排序、检测环、深度优先生成树；递归或显式 stack。

#### 风险与验收

- 主要风险：在「图的 BFS / DFS 与前端真实场景」里，图的 BFS / DFS 与前端真实场景 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：验收至少包含「图的 BFS / DFS 与前端真实场景」里 图的 BFS / DFS 与前端真实场景 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## graph-bfs-dfs-followup-3

title: 追问：为了让团队信服「图的 BFS / DFS 与前端真实场景」正确，你会先补哪几类高价值校验与断言
difficulty: 进阶
tags: [图, BFS, DFS, 追问]
parent: graph-bfs-dfs
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：为了让团队信服「图的 BFS / DFS 与前端真实场景」正确，你会先补哪几类高价值校验与断言？

### 答案要点

#### 直答

- 结论：先补 图的 BFS / DFS 与前端真实场景 的边界输入断言、随机对拍和回归用例三类证据，确保结论可复核而不是样例跑通。
- 关键动作：先梳理 图的 BFS / DFS 与前端真实场景 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- BFS：层次遍历、最短路径、最少跳数；用 queue 实现。
- DFS：拓扑排序、检测环、深度优先生成树；递归或显式 stack。

#### 风险与验收

- 主要风险：围绕 图的 BFS / DFS 与前端真实场景 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。
- 验收信号：验收至少包含「图的 BFS / DFS 与前端真实场景」里 图的 BFS / DFS 与前端真实场景 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## bit-manipulation-followup-2

title: 追问：结合真实业务约束，围绕「位运算技巧与前端用例」上线效果，你会优先看哪些和 位运算 相关的真实用户指标来佐证体验提升
difficulty: 进阶
tags: [位运算, 性能, 追问]
parent: bit-manipulation
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，围绕「位运算技巧与前端用例」上线效果，你会优先看哪些和 位运算 相关的真实用户指标来佐证体验提升？

### 答案要点

#### 直答

- 结论：验证 位运算技巧与前端用例 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。
- 关键动作：先统一 位运算技巧与前端用例 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- 位运算技巧与前端用例：围绕「位运算技巧与前端用例」里的 位运算技巧与前端用例 作答时，要给可落地动作，并说明异常处理与验收阈值。
- 位运算：在「位运算技巧与前端用例」里，位运算 是验收对象，必须给可量化指标、日志信号和测试证据。
- 性能：在「位运算技巧与前端用例」里，性能 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「位运算技巧与前端用例」里，位运算技巧与前端用例 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：位运算技巧与前端用例 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## bit-manipulation-followup-3

title: 追问：如果「位运算技巧与前端用例」在 位运算 上的收益和维护成本打架，你会怎么做取舍判断
difficulty: 进阶
tags: [位运算, 性能, 追问]
parent: bit-manipulation
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果「位运算技巧与前端用例」在 位运算 上的收益和维护成本打架，你会怎么做取舍判断？

### 答案要点

#### 直答

- 结论：先量化 位运算技巧与前端用例 的收益上限、维护成本和故障代价，再按阈值决定继续投入还是止损切换。
- 关键动作：先量化 位运算技巧与前端用例 的收益和维护成本，再按阈值决定推进或保留现方案，并记录取舍依据。

#### 术语解释

- 位运算技巧与前端用例：围绕「位运算技巧与前端用例」里的 位运算技巧与前端用例 作答时，要给可落地动作，并说明异常处理与验收阈值。
- 位运算：在「位运算技巧与前端用例」里，位运算 是取舍变量，要同时比较收益、成本和长期维护复杂度。
- 性能：在「位运算技巧与前端用例」里，性能 是取舍变量，要同时比较收益、成本和长期维护复杂度。

#### 风险与验收

- 主要风险：若 位运算技巧与前端用例 决策只看交付速度，后续维护成本和回归成本会快速上升。
- 验收信号：围绕 位运算技巧与前端用例 取舍结果至少给收益趋势、成本趋势和回归稳定性三组数据。

## merge-intervals-followup-2

title: 追问：以「合并区间」为例，如果「合并区间」从万级变到百万级，你会先用哪些策略稳住 数组 指标
difficulty: 基础
tags: [数组, 排序, 高频, 追问]
parent: merge-intervals
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「合并区间」为例，如果「合并区间」从万级变到百万级，你会先用哪些策略稳住 数组 指标？

### 答案要点

#### 直答

- 结论：先定义 合并区间 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。
- 关键动作：先定义 合并区间 的验收阈值，再用测试与线上监控双验证，不达标立即回退。

#### 术语解释

- 合并区间：在「合并区间」这道追问里，合并区间 是执行抓手：需要明确触发条件、实施步骤和验收信号。
- 数组：在「合并区间」里，数组 是验收对象，必须给可量化指标、日志信号和测试证据。
- 排序：时间 O(n log n)，瓶颈在排序。

#### 风险与验收

- 主要风险：合并区间 没有统一指标口径时，验证结论会互相冲突并误导决策。
- 验收信号：在「合并区间」里，合并区间 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。

## merge-intervals-followup-3

title: 追问：在当前团队与业务约束下，围绕「合并区间」你会如何组织反例、边界用例和不变量检查，避免“样例通过即正确”
difficulty: 基础
tags: [数组, 排序, 高频, 追问]
parent: merge-intervals
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，围绕「合并区间」你会如何组织反例、边界用例和不变量检查，避免“样例通过即正确”？

### 答案要点

#### 直答

- 结论：把 合并区间 拆成“现状排查 -> 最小改动 -> 验收回归”三段执行，任何一段异常都要可回退。
- 关键动作：先梳理 合并区间 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- 合并区间：围绕「合并区间」里的 合并区间 作答时，要给可落地动作，并说明异常处理与验收阈值。
- 数组：在「合并区间」这题里，数组 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 排序：时间 O(n log n)，瓶颈在排序。

#### 风险与验收

- 主要风险：在「合并区间」里，合并区间 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：合并区间 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。

## kth-largest-followup-2

title: 追问：在「数组中第 K 大的元素」场景下，如果数据规模扩大一个数量级，你会如何围绕 排序 调整「数组中第 K 大的元素」的数据结构或算法
difficulty: 进阶
tags: [排序, 堆, 高频, 追问]
parent: kth-largest
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「数组中第 K 大的元素」场景下，如果数据规模扩大一个数量级，你会如何围绕 排序 调整「数组中第 K 大的元素」的数据结构或算法？

### 答案要点

#### 直答

- 结论：数据规模放大时，先把 数组中第 K 大的元素 的邻接结构和访问索引换成低开销实现，再加分批处理避免主线程阻塞。
- 关键动作：先定位 数组中第 K 大的元素 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- 排序：排序：nums.sort((a,b)=>b-a)[k-1]，O(n log n)。

#### 风险与验收

- 主要风险：在「数组中第 K 大的元素（快速选择 / 小顶堆）」场景下，数组中第 K 大的元素 最大风险是变更影响面估计过小，导致回归缺口被放大。
- 验收信号：验收看 数组中第 K 大的元素 相关回归测试通过率、关键日志和线上指标，三者一致才算完成。

## kth-largest-followup-3

title: 追问：以「数组中第 K 大的元素（快速选择 / 小顶堆）」为例，如果要让「数组中第 K 大的元素（快速选择 / 小顶堆）」的正确性可复核，你会围绕 排序 设计哪些验证步骤
difficulty: 进阶
tags: [排序, 堆, 高频, 追问]
parent: kth-largest
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「数组中第 K 大的元素（快速选择 / 小顶堆）」为例，如果要让「数组中第 K 大的元素（快速选择 / 小顶堆）」的正确性可复核，你会围绕 排序 设计哪些验证步骤？

### 答案要点

#### 直答

- 结论：验证「数组中第 K 大的元素（快速选择 / 小顶堆）」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：先把「数组中第 K 大的元素（快速选择 / 小顶堆）」里的 数组中第 K 大的元素 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- 排序：排序：nums.sort((a,b)=>b-a)[k-1]，O(n log n)。

#### 风险与验收

- 主要风险：在「数组中第 K 大的元素（快速选择 / 小顶堆）」里，数组中第 K 大的元素 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「数组中第 K 大的元素（快速选择 / 小顶堆）」里，数组中第 K 大的元素 至少要给一组指标阈值、一条日志证据和一组测试结果。

## bitwise-tricks-followup-2

title: 追问：在当前团队与业务约束下，围绕「位运算高频技巧一题打尽」扩容时，你会如何在正确性不退化的前提下优化 算法 开销
difficulty: 进阶
tags: [算法, 位运算, 高频, 追问]
parent: bitwise-tricks
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，围绕「位运算高频技巧一题打尽」扩容时，你会如何在正确性不退化的前提下优化 算法 开销？

### 答案要点

#### 直答

- 结论：把 位运算高频技巧一题打尽 拆成“现状排查 -> 最小改动 -> 验收回归”三段执行，任何一段异常都要可回退。
- 关键动作：先梳理 位运算高频技巧一题打尽 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- 算法：在「位运算高频技巧一题打尽」这题里，算法 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 位运算：在「位运算高频技巧一题打尽」这题里，位运算 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：在「位运算高频技巧一题打尽」里，位运算高频技巧一题打尽 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：验收至少包含「位运算高频技巧一题打尽」里 位运算高频技巧一题打尽 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## bitwise-tricks-followup-3

title: 追问：以「位运算高频技巧一题打尽」为例，如果要让「位运算高频技巧一题打尽」的正确性可复核，你会围绕 算法 设计哪些验证步骤
difficulty: 进阶
tags: [算法, 位运算, 高频, 追问]
parent: bitwise-tricks
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「位运算高频技巧一题打尽」为例，如果要让「位运算高频技巧一题打尽」的正确性可复核，你会围绕 算法 设计哪些验证步骤？

### 答案要点

#### 直答

- 结论：先约定「位运算高频技巧一题打尽」的功能正确、性能稳定、业务结果三组阈值，再用日志链路和回归结果交叉验证。
- 关键动作：先把「位运算高频技巧一题打尽」里的 位运算高频技巧一题打尽 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- 算法：围绕「位运算高频技巧一题打尽」里的 算法 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 位运算：围绕「位运算高频技巧一题打尽」里的 位运算 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：在「位运算高频技巧一题打尽」里，位运算高频技巧一题打尽 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「位运算高频技巧一题打尽」里，位运算高频技巧一题打尽 至少要给一组指标阈值、一条日志证据和一组测试结果。

## sliding-window-advanced-followup-2

title: 追问：在「滑动窗口进阶：变长窗口 + 不变量维护」场景下，围绕「滑动窗口进阶：变长窗口 + 不变量维护」扩容时，你会如何在正确性不退化的前提下优化 算法 开销
difficulty: 资深
tags: [算法, 滑动窗口, 高频, 追问]
parent: sliding-window-advanced
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「滑动窗口进阶：变长窗口 + 不变量维护」场景下，围绕「滑动窗口进阶：变长窗口 + 不变量维护」扩容时，你会如何在正确性不退化的前提下优化 算法 开销？

### 答案要点

#### 直答

- 结论：先拆分 滑动窗口进阶 变长窗口 + 不变量维护 的执行步骤，逐步实施并在每步后验证，异常立即回滚。
- 关键动作：先定位 滑动窗口进阶 变长窗口 + 不变量维护 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- 算法：围绕「滑动窗口进阶：变长窗口 + 不变量维护」里的 算法 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 滑动窗口：在「滑动窗口进阶：变长窗口 + 不变量维护」这题里，滑动窗口 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：滑动窗口进阶 变长窗口 + 不变量维护 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：验收看 滑动窗口进阶 变长窗口 + 不变量维护 相关回归测试通过率、关键日志和线上指标，三者一致才算完成。

## sliding-window-advanced-followup-3

title: 追问：如果要在评审里证明「滑动窗口进阶：变长窗口 + 不变量维护」可长期维护，你会展示哪些围绕 算法 的正确性证据
difficulty: 资深
tags: [算法, 滑动窗口, 高频, 追问]
parent: sliding-window-advanced
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：如果要在评审里证明「滑动窗口进阶：变长窗口 + 不变量维护」可长期维护，你会展示哪些围绕 算法 的正确性证据？

### 答案要点

#### 直答

- 结论：先定「滑动窗口进阶：变长窗口 + 不变量维护」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：先把「滑动窗口进阶：变长窗口 + 不变量维护」里的 滑动窗口进阶 变长窗口 + 不变量维护 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- 算法：围绕「滑动窗口进阶：变长窗口 + 不变量维护」里的 算法 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 滑动窗口：在「滑动窗口进阶：变长窗口 + 不变量维护」里，滑动窗口 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「滑动窗口进阶：变长窗口 + 不变量维护」里，滑动窗口进阶 变长窗口 + 不变量维护 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「滑动窗口进阶：变长窗口 + 不变量维护」里，滑动窗口进阶 变长窗口 + 不变量维护 至少要给一组指标阈值、一条日志证据和一组测试结果。

## monotonic-stack-queue-followup-2

title: 追问：以「单调栈 / 单调队列高频题」为例，当「单调栈 / 单调队列高频题」输入规模猛增时，你会先改哪一层结构，避免 算法 成本失控
difficulty: 资深
tags: [算法, 单调栈, 单调队列, 高频, 追问]
parent: monotonic-stack-queue
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「单调栈 / 单调队列高频题」为例，当「单调栈 / 单调队列高频题」输入规模猛增时，你会先改哪一层结构，避免 算法 成本失控？

### 答案要点

#### 直答

- 结论：评估 单调栈 / 单调队列高频题 时要把开发成本、运行成本和故障代价放在同一张表里比较。
- 关键动作：先排查 单调栈 / 单调队列高频题 的成本项和收益项，再实施收敛动作，最后按阈值决定推进或回退。

#### 术语解释

- 算法：围绕「单调栈 / 单调队列高频题」里的 算法 评估时，不能只讲优点，还要给切换条件和止损阈值。
- 单调栈：围绕「单调栈 / 单调队列高频题」里的 单调栈 评估时，不能只讲优点，还要给切换条件和止损阈值。
- 单调队列：围绕「单调栈 / 单调队列高频题」里的 单调队列 评估时，不能只讲优点，还要给切换条件和止损阈值。

#### 风险与验收

- 主要风险：若 单调栈 / 单调队列高频题 决策只看交付速度，后续维护成本和回归成本会快速上升。
- 验收信号：围绕 单调栈 / 单调队列高频题 取舍结果至少给收益趋势、成本趋势和回归稳定性三组数据。

## monotonic-stack-queue-followup-3

title: 追问：从工程落地角度看，当「单调栈 / 单调队列高频题」逻辑变复杂时，你会如何分层验证正确性，避免遗漏隐蔽路径
difficulty: 资深
tags: [算法, 单调栈, 单调队列, 高频, 追问]
parent: monotonic-stack-queue
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，当「单调栈 / 单调队列高频题」逻辑变复杂时，你会如何分层验证正确性，避免遗漏隐蔽路径？

### 答案要点

#### 直答

- 结论：把 单调栈 / 单调队列高频题 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。
- 关键动作：围绕 单调栈 / 单调队列高频题 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- 算法：围绕「单调栈 / 单调队列高频题」里的 算法 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 单调栈：围绕「单调栈 / 单调队列高频题」里的 单调栈 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 单调队列：围绕「单调栈 / 单调队列高频题」里的 单调队列 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：若 单调栈 / 单调队列高频题 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：单调栈 / 单调队列高频题 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## prefix-sum-difference-2d-followup-2

title: 追问：以「前缀和 / 差分进阶：二维 + 区间更新」为例，当规模上来后「前缀和 / 差分进阶：二维 + 区间更新」开始抖动，你会如何快速定位并调整最关键的 算法 瓶颈
difficulty: 进阶
tags: [算法, 前缀和, 高频, 追问]
parent: prefix-sum-difference-2d
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「前缀和 / 差分进阶：二维 + 区间更新」为例，当规模上来后「前缀和 / 差分进阶：二维 + 区间更新」开始抖动，你会如何快速定位并调整最关键的 算法 瓶颈？

### 答案要点

#### 直答

- 结论：上线 前缀和 / 差分进阶 二维 + 区间更新 前先做故障演练，确认“能发现、能止损、能恢复”三项都达标。
- 关键动作：围绕 前缀和 / 差分进阶 二维 + 区间更新 建立“告警 -> 降级 -> 恢复”闭环，再推进上线。

#### 术语解释

- 算法：在「前缀和 / 差分进阶：二维 + 区间更新」里，算法 是高风险点，要说明最坏失败模式、降级动作和恢复路径。
- 前缀和：围绕「前缀和 / 差分进阶：二维 + 区间更新」里的 前缀和 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。

#### 风险与验收

- 主要风险：若 前缀和 / 差分进阶 二维 + 区间更新 告警阈值配置过宽，风险会被延迟发现并放大恢复成本。
- 验收信号：验收看 前缀和 / 差分进阶 二维 + 区间更新 风险告警命中率、降级生效率和恢复耗时，确保异常可控可恢复。

## prefix-sum-difference-2d-followup-3

title: 追问：在「前缀和 / 差分进阶：二维 + 区间更新」场景下，围绕「前缀和 / 差分进阶：二维 + 区间更新」你会如何组织反例、边界用例和不变量检查，避免“样例通过即正确”
difficulty: 进阶
tags: [算法, 前缀和, 高频, 追问]
parent: prefix-sum-difference-2d
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「前缀和 / 差分进阶：二维 + 区间更新」场景下，围绕「前缀和 / 差分进阶：二维 + 区间更新」你会如何组织反例、边界用例和不变量检查，避免“样例通过即正确”？

### 答案要点

#### 直答

- 结论：先画出 前缀和 / 差分进阶 二维 + 区间更新 的主链路时序，再按风险分层改造并逐层验收，未达标立即回退。
- 关键动作：先明确 前缀和 / 差分进阶 二维 + 区间更新 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- 算法：围绕「前缀和 / 差分进阶：二维 + 区间更新」里的 算法 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 前缀和：在「前缀和 / 差分进阶：二维 + 区间更新」这题里，前缀和 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：前缀和 / 差分进阶 二维 + 区间更新 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：验收看 前缀和 / 差分进阶 二维 + 区间更新 相关回归测试通过率、关键日志和线上指标，三者一致才算完成。

## two-pointer-sliding-window-followup-2

title: 追问：在「双指针与滑动窗口模板」场景下，上线后你会盯哪些与 双指针 相关的日志与指标，来确认这套方案确实带来改进
difficulty: 进阶
tags: [双指针, 滑动窗口, 追问]
parent: two-pointer-sliding-window
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「双指针与滑动窗口模板」场景下，上线后你会盯哪些与 双指针 相关的日志与指标，来确认这套方案确实带来改进？

### 答案要点

#### 直答

- 结论：验证「双指针与滑动窗口模板」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：先把「双指针与滑动窗口模板」里的 双指针与滑动窗口模板 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- 双指针与滑动窗口模板：围绕「双指针与滑动窗口模板」里的 双指针与滑动窗口模板 作答时，要给可落地动作，并说明异常处理与验收阈值。
- 双指针：左右两个游标朝同一/相反方向移动，避免暴力 O(n²) 的嵌套循环。
- 滑动窗口：右指针扩张，违反约束时左指针收缩，过程中维护窗口内统计量。

#### 风险与验收

- 主要风险：在「双指针与滑动窗口模板」里，双指针与滑动窗口模板 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「双指针与滑动窗口模板」里，双指针与滑动窗口模板 至少要给一组指标阈值、一条日志证据和一组测试结果。

## two-pointer-sliding-window-followup-3

title: 追问：当兼容性要求提升或预算收紧时，你会如何围绕 双指针 调整方案边界与实施节奏
difficulty: 进阶
tags: [双指针, 滑动窗口, 追问]
parent: two-pointer-sliding-window
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：当兼容性要求提升或预算收紧时，你会如何围绕 双指针 调整方案边界与实施节奏？

### 答案要点

#### 直答

- 结论：「双指针与滑动窗口模板」在规模或预算变化时按“保可用、控成本、再优化”顺序推进，避免一次性大改引发连锁风险。
- 关键动作：先梳理 调整方案边界 与 实施节奏 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- 双指针：左右两个游标朝同一/相反方向移动，避免暴力 O(n²) 的嵌套循环。
- 滑动窗口：右指针扩张，违反约束时左指针收缩，过程中维护窗口内统计量。

#### 风险与验收

- 主要风险：调整方案边界 与 实施节奏 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：验收至少包含「双指针与滑动窗口模板」里 调整方案边界 与 实施节奏 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## debounce-throttle-handwritten-followup-2

title: 追问：你会如何围绕 手写实现 定义“方案生效”的判据，并通过测试与观测数据持续验证
difficulty: 进阶
tags: [手写, 高频, 追问]
parent: debounce-throttle-handwritten
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你会如何围绕 手写实现 定义“方案生效”的判据，并通过测试与观测数据持续验证？

### 答案要点

#### 直答

- 结论：先约定「手写防抖与节流（含 cancel/leading/trailing）」的功能正确、性能稳定、业务结果三组阈值，再用日志链路和回归结果交叉验证。
- 关键动作：围绕 手写防抖 与 节流 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- 手写：在「手写防抖与节流（含 cancel/leading/trailing）」里，手写 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：若 手写防抖 与 节流 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：手写防抖 与 节流 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## debounce-throttle-handwritten-followup-3

title: 追问：从工程落地角度看，如果兼容性压力突然升高，你会如何围绕 手写 重新划分「手写防抖与节流（含 cancel/leading/trailing）」的实施阶段
difficulty: 进阶
tags: [手写, 高频, 追问]
parent: debounce-throttle-handwritten
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：从工程落地角度看，如果兼容性压力突然升高，你会如何围绕 手写 重新划分「手写防抖与节流（含 cancel/leading/trailing）」的实施阶段？

### 答案要点

#### 直答

- 结论：「手写防抖与节流（含 cancel/leading/trailing）」上线节奏按“低风险流量试点、分阶段放量、稳定后全量”推进，异常批次立即止损。
- 关键动作：把「手写防抖与节流（含 cancel/leading/trailing）」里的 手写防抖与节流（含 cancel 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。

#### 术语解释

- cancel/leading/trailing：在「手写防抖与节流（含 cancel/leading/trailing）」这题里，cancel/leading/trailing 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 手写：在「手写防抖与节流（含 cancel/leading/trailing）」这题里，手写 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- cancel/leading/trai：在「手写防抖与节流（含 cancel/leading/trailing）」这题里，cancel/leading/trai 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：手写防抖与节流（含 cancel 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。
- 验收信号：手写防抖与节流（含 cancel 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## binary-search-followup-2

title: 追问：在当前团队与业务约束下，你会如何围绕 二分 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖
difficulty: 进阶
tags: [二分, 高频, 追问]
parent: binary-search
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，你会如何围绕 二分 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖？

### 答案要点

#### 直答

- 结论：先定「二分查找的边界陷阱」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：围绕 二分查找的边界陷阱 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- 二分：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。

#### 风险与验收

- 主要风险：若 二分查找的边界陷阱 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：二分查找的边界陷阱 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## binary-search-followup-3

title: 追问：以「二分查找的边界陷阱」为例，如果目标不变但约束更严，你会如何围绕 二分 调整「二分查找的边界陷阱」方案的边界和节奏
difficulty: 进阶
tags: [二分, 高频, 追问]
parent: binary-search
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：以「二分查找的边界陷阱」为例，如果目标不变但约束更严，你会如何围绕 二分 调整「二分查找的边界陷阱」方案的边界和节奏？

### 答案要点

#### 直答

- 结论：先把 二分查找的边界陷阱 的核心链路拆成小步快跑任务，每步验收后再推进下一步，异常立即止损。
- 关键动作：先梳理 二分查找的边界陷阱 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- 二分查找的边界陷阱：在「二分查找的边界陷阱」这道追问里，二分查找的边界陷阱 是执行抓手：需要明确触发条件、实施步骤和验收信号。
- 二分：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。

#### 风险与验收

- 主要风险：在「二分查找的边界陷阱」里，二分查找的边界陷阱 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：二分查找的边界陷阱 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。

## dp-classic-followup-2

title: 追问：你会如何围绕 DP 定义“方案生效”的判据，并通过测试与观测数据持续验证
difficulty: 资深
tags: [DP, 高频, 追问]
parent: dp-classic
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：你会如何围绕 DP 定义“方案生效”的判据，并通过测试与观测数据持续验证？

### 答案要点

#### 直答

- 结论：验证「DP 经典题：爬楼梯、最长上升子序列、编辑距离」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：先统一 DP 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- DP：二维 DP，分别对应增/删/改三种转移。

#### 风险与验收

- 主要风险：在「DP 经典题：爬楼梯、最长上升子序列、编辑距离」里，DP 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：DP 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## dp-classic-followup-3

title: 追问：在「DP 经典题：爬楼梯、最长上升子序列、编辑距离」场景下，如果兼容性压力突然升高，你会如何围绕 DP 重新划分「DP 经典题：爬楼梯、最长上升子序列、编辑距离」的实施阶段
difficulty: 资深
tags: [DP, 高频, 追问]
parent: dp-classic
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「DP 经典题：爬楼梯、最长上升子序列、编辑距离」场景下，如果兼容性压力突然升高，你会如何围绕 DP 重新划分「DP 经典题：爬楼梯、最长上升子序列、编辑距离」的实施阶段？

### 答案要点

#### 直答

- 结论：先小流量验证「DP 经典题：爬楼梯、最长上升子序列、编辑距离」主链路，再分批扩量；任一批次越阈值立即回滚并保留旧链路兜底。
- 关键动作：先定位 DP 经典题 爬楼梯 最长上升子序列 编辑距离 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- DP：二维 DP，分别对应增/删/改三种转移。

#### 风险与验收

- 主要风险：DP 经典题 爬楼梯 最长上升子序列 编辑距离 若缺少回退开关与恢复脚本，发布失败后会拉长故障恢复窗口。
- 验收信号：在「DP 经典题：爬楼梯、最长上升子序列、编辑距离」里，验收 DP 经典题 爬楼梯 最长上升子序列 编辑距离 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。

## promise-all-impl-followup-2

title: 追问：在当前团队与业务约束下，如果要向团队复盘 Promise 相关优化，你会展示哪些关键日志和指标来支撑结论
difficulty: 进阶
tags: [Promise, 手写, 高频, 追问]
parent: promise-all-impl
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，如果要向团队复盘 Promise 相关优化，你会展示哪些关键日志和指标来支撑结论？

### 答案要点

#### 直答

- 结论：先定「手写实现 Promise.all」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：围绕 指标来支撑结论 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。

#### 术语解释

- Promise：每个元素都用 Promise.resolve(item) 包裹，避免传入普通值时报错。
- 手写：围绕「手写实现 Promise.all」里的 手写 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：若 指标来支撑结论 缺少验收阈值，容易出现“看似有效但线上失效”的风险。
- 验收信号：指标来支撑结论 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。

## promise-all-impl-followup-3

title: 追问：结合真实业务约束，如果目标不变但约束更严，你会如何围绕 Promise 调整「手写实现 Promise.all」方案的边界和节奏
difficulty: 进阶
tags: [Promise, 手写, 高频, 追问]
parent: promise-all-impl
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，如果目标不变但约束更严，你会如何围绕 Promise 调整「手写实现 Promise.all」方案的边界和节奏？

### 答案要点

#### 直答

- 结论：先把 手写实现 Promise.all 的核心链路拆成小步快跑任务，每步验收后再推进下一步，异常立即止损。
- 关键动作：先梳理 手写实现 Promise.all 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。

#### 术语解释

- Promise.all：Promise.all 是「手写实现 Promise.all」里的关键技术对象，需要说明接入边界、调用方式和失败回退。
- Promise：每个元素都用 Promise.resolve(item) 包裹，避免传入普通值时报错。
- 手写：在「手写实现 Promise.all」这题里，手写 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：在「手写实现 Promise.all」里，手写实现 Promise.all 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。
- 验收信号：验收至少包含「手写实现 Promise.all」里 手写实现 Promise.all 的回归用例、线上监控和告警阈值，三条证据都达标才收口。

## algorithm-production-proof-playbook

title: 算法优化上线怎么证明“真的有效”：基线、压测与回归闭环
difficulty: 资深
tags: [算法工程化, 性能验证, 上线治理]
followups: [algorithm-production-proof-playbook-followup-1, algorithm-production-proof-playbook-followup-2, algorithm-production-proof-playbook-followup-3]

### 一句话

讲「算法优化上线怎么证明“真的有效”：基线、压测与回归闭环」时要把结论、动作、风险、验收四段说全，才算可落地答案。

### 题目

你把一个热点路径从 O(n²) 优化到 O(n log n)，如何向团队证明这次优化在真实业务上确实值得上线？

### 答案要点

- 先定义基线：输入规模分布、设备分层、关键指标（耗时分位/长任务率/内存峰值）要先量化。
- 离线验证要可复现：固定数据集 + 边界样例 + 随机扰动样例，避免只挑“对自己有利”的 case。
- 性能评估看分位而非均值：P95/P99 更能暴露尾部退化，适合评估用户真实体感。
- 做正确性与性能双回归：优化后不仅要快，还要保证结果一致性与异常路径可控。

#### 工程化补充

- 场景前提：算法优化上线怎么证明“真的有效”：基线、压测与回归闭环 只有在瓶颈被数据证实时才值得推进；先确认 算法工程化 是否真是主耗时来源。
- 实施步骤：先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件，并且动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。
- 失败风险：常见失败是只优化实验室分数，真实设备或弱网下 算法优化上线怎么证明“真的有效”：基线、压测与回归闭环 体验反而抖动。
- 验收信号：验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。

### 代码示例

```ts
type PerfSample = { ms: number; ok: boolean; inputSize: number };

function p95(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.95)];
}

function evaluate(samples: PerfSample[]) {
  const success = samples.every((s) => s.ok);
  const p95Ms = p95(samples.map((s) => s.ms));
  return { success, p95Ms };
}
```

```yaml
algorithm_gate:
  correctness: must_pass
  perf_threshold:
    p95_ms_improvement: '>= 20%'
  rollout:
    - 5_percent
    - 30_percent
    - 100_percent
  rollback_when:
    - p95_ms_regression_over_10_percent
    - error_rate_increase_over_0_5_percent
```

### 追问

- 「算法优化上线怎么证明“真的有效”：基线、压测与回归闭环」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只测小样本或理想样本，忽略真实输入分布导致上线后退化。
- 只看运行耗时，不看内存峰值与 GC 抖动，低端机体验仍可能变差。
- 优化上线没有回滚阈值，问题出现后只能人工临时止损。

### 延伸

- 建议为高频算法链路维护长期基准集，减少“每次都从零评估”。
- 关键链路可引入性能预算看板，持续观察趋势而非一次性结论。

## time-space-tradeoff-budget

title: 时间换空间 vs 空间换时间：前端算法的内存预算与降级策略
difficulty: 资深
tags: [复杂度, 内存治理, 算法取舍]
followups: [time-space-tradeoff-budget-followup-1, time-space-tradeoff-budget-followup-2, time-space-tradeoff-budget-followup-3]

### 一句话

回答「时间换空间 vs 空间换时间：前端算法的内存预算与降级策略」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。

### 题目

面对同一问题，你有“高内存快算法”和“低内存慢算法”两个方案，如何在前端场景下做工程取舍？

### 答案要点

- 先分设备与场景：高端机、低端机、后台页、首屏关键路径允许的内存预算不同。
- 用预算驱动选择：先设单次计算内存上限和主线程时长上限，再评估算法是否满足。
- 支持动态策略切换：输入规模或设备能力触发阈值后自动切换到更稳的降级算法。
- 避免一次性大对象分配：用分块处理、流式处理和对象复用降低峰值内存。

#### 工程化补充

- 场景前提：时间换空间 vs 空间换时间：前端算法的内存预算与降级策略 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。
- 实施步骤：对比候选方案时同时给短期交付风险和长期治理成本，再做最终取舍，并且动作要同时交代迁移批次、灰度策略和回滚门槛。
- 失败风险：最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。
- 验收信号：验收至少看灰度通过率、回滚次数和故障恢复时长。

### 代码示例

```ts
type AlgoMode = 'fast_high_mem' | 'stable_low_mem';

function pickMode(inputSize: number, deviceMemoryGb = 4): AlgoMode {
  if (deviceMemoryGb <= 2) return 'stable_low_mem';
  if (inputSize > 200_000) return 'stable_low_mem';
  return 'fast_high_mem';
}
```

```ts
function processWithBudget<T>(items: T[], budgetPerChunk = 2000) {
  const out: T[] = [];
  for (let i = 0; i < items.length; i += budgetPerChunk) {
    const chunk = items.slice(i, i + budgetPerChunk);
    out.push(...computeChunk(chunk));
  }
  return out;
}
```

### 追问

- 「时间换空间 vs 空间换时间：前端算法的内存预算与降级策略」在真实项目里最容易踩到哪些边界条件？
- 你会用哪些测试、日志或指标证明这个方案有效？
- 如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？

### 常见误区

- 只追求理论最优时间复杂度，忽略内存峰值和 GC 真实开销。
- 所有设备统一算法策略，导致低端机性能与稳定性恶化。
- 无降级路径，输入规模突增时系统只能硬撑直到崩溃。

### 延伸

- 可按业务关键路径设置独立预算，避免“统一阈值”误伤。
- 将设备能力采样接入策略系统，可持续优化算法切换门槛。

## algorithm-production-proof-playbook-followup-1

title: 追问：结合真实业务约束，你会先看哪些与 算法工程化 相关的指标来判断「算法优化上线怎么证明“真的有效”：基线、压测与回归闭环」是不是当前性能瓶颈
difficulty: 资深
tags: [算法工程化, 性能验证, 上线治理, 追问]
parent: algorithm-production-proof-playbook
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：结合真实业务约束，你会先看哪些与 算法工程化 相关的指标来判断「算法优化上线怎么证明“真的有效”：基线、压测与回归闭环」是不是当前性能瓶颈？

### 答案要点

#### 直答

- 结论：验证「算法优化上线怎么证明“真的有效”：基线、压测与回归闭环」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：先统一 基线 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- 算法工程化：围绕「算法优化上线怎么证明“真的有效”：基线、压测与回归闭环」里的 算法工程化 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 性能验证：在「算法优化上线怎么证明“真的有效”：基线、压测与回归闭环」里，性能验证 是验收对象，必须给可量化指标、日志信号和测试证据。
- 上线治理：围绕「算法优化上线怎么证明“真的有效”：基线、压测与回归闭环」里的 上线治理 验证时，要明确“达标阈值”和“不达标时的回退动作”。

#### 风险与验收

- 主要风险：在「算法优化上线怎么证明“真的有效”：基线、压测与回归闭环」里，基线 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：先定义基线：输入规模分布、设备分层、关键指标（耗时分位/长任务率/内存峰值）要先量化。

## algorithm-production-proof-playbook-followup-2

title: 追问：在当前团队与业务约束下，你会如何围绕 算法工程化 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖
difficulty: 资深
tags: [算法工程化, 性能验证, 上线治理, 追问]
parent: algorithm-production-proof-playbook
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，你会如何围绕 算法工程化 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖？

### 答案要点

#### 直答

- 结论：先定「算法优化上线怎么证明“真的有效”：基线、压测与回归闭环」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：先统一 压测 与 回归闭环 指标口径并补齐日志证据，再按测试结果做继续/回退决策。

#### 术语解释

- 算法工程化：在「算法优化上线怎么证明“真的有效”：基线、压测与回归闭环」里，算法工程化 是验收对象，必须给可量化指标、日志信号和测试证据。
- 性能验证：围绕「算法优化上线怎么证明“真的有效”：基线、压测与回归闭环」里的 性能验证 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 上线治理：在「算法优化上线怎么证明“真的有效”：基线、压测与回归闭环」里，上线治理 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「算法优化上线怎么证明“真的有效”：基线、压测与回归闭环」里，压测 与 回归闭环 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。
- 验收信号：压测 与 回归闭环 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。

## algorithm-production-proof-playbook-followup-3

title: 追问：在「算法优化上线怎么证明“真的有效”：基线、压测与回归闭环」场景下，你会如何给「算法优化上线怎么证明“真的有效”：基线、压测与回归闭环」算一笔账：短期收益能不能覆盖后续在 算法工程化 上的维护成本
difficulty: 资深
tags: [算法工程化, 性能验证, 上线治理, 追问]
parent: algorithm-production-proof-playbook
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在「算法优化上线怎么证明“真的有效”：基线、压测与回归闭环」场景下，你会如何给「算法优化上线怎么证明“真的有效”：基线、压测与回归闭环」算一笔账：短期收益能不能覆盖后续在 算法工程化 上的维护成本？

### 答案要点

#### 直答

- 结论：先定「算法优化上线怎么证明“真的有效”：基线、压测与回归闭环」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。
- 关键动作：先排查 基线 的成本项和收益项，再实施收敛动作，最后按阈值决定推进或回退。

#### 术语解释

- 算法工程化：在「算法优化上线怎么证明“真的有效”：基线、压测与回归闭环」里，算法工程化 是取舍变量，要同时比较收益、成本和长期维护复杂度。
- 性能验证：围绕「算法优化上线怎么证明“真的有效”：基线、压测与回归闭环」里的 性能验证 评估时，不能只讲优点，还要给切换条件和止损阈值。
- 上线治理：在「算法优化上线怎么证明“真的有效”：基线、压测与回归闭环」里，上线治理 是取舍变量，要同时比较收益、成本和长期维护复杂度。

#### 风险与验收

- 主要风险：围绕 基线 缺少切换阈值时，团队容易在错误方案上持续投入。
- 验收信号：先定义基线：输入规模分布、设备分层、关键指标（耗时分位/长任务率/内存峰值）要先量化。

## time-space-tradeoff-budget-followup-1

title: 追问：围绕「时间换空间 vs 空间换时间：前端算法的内存预算与降级策略」做方案评审时，你会先检查哪些与 复杂度 相关的边界假设是否成立
difficulty: 资深
tags: [复杂度, 内存治理, 算法取舍, 追问]
parent: time-space-tradeoff-budget
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：围绕「时间换空间 vs 空间换时间：前端算法的内存预算与降级策略」做方案评审时，你会先检查哪些与 复杂度 相关的边界假设是否成立？

### 答案要点

#### 直答

- 结论：先锁定 时间换空间 vs 空间换时间 现状，再按批次实施改动，验收不过立即回滚。
- 关键动作：先定位 时间换空间 vs 空间换时间 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。

#### 术语解释

- vs：围绕「时间换空间 vs 空间换时间：前端算法的内存预算与降级策略」里的 vs 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 复杂度：围绕「时间换空间 vs 空间换时间：前端算法的内存预算与降级策略」里的 复杂度 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 内存治理：在「时间换空间 vs 空间换时间：前端算法的内存预算与降级策略」这题里，内存治理 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：时间换空间 vs 空间换时间 的风险是改动边界不清会引发连锁回归，需要预设回退。
- 验收信号：验收看 时间换空间 vs 空间换时间 相关回归测试通过率、关键日志和线上指标，三者一致才算完成。

## time-space-tradeoff-budget-followup-2

title: 追问：在当前团队与业务约束下，如果要向团队复盘 复杂度 相关优化，你会展示哪些关键日志和指标来支撑结论
difficulty: 资深
tags: [复杂度, 内存治理, 算法取舍, 追问]
parent: time-space-tradeoff-budget
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：在当前团队与业务约束下，如果要向团队复盘 复杂度 相关优化，你会展示哪些关键日志和指标来支撑结论？

### 答案要点

#### 直答

- 结论：验证「时间换空间 vs 空间换时间：前端算法的内存预算与降级策略」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。
- 关键动作：先把「时间换空间 vs 空间换时间：前端算法的内存预算与降级策略」里的 指标来支撑结论 监控看板和测试基线对齐，再按阈值执行放量或回滚。

#### 术语解释

- 复杂度：在「时间换空间 vs 空间换时间：前端算法的内存预算与降级策略」里，复杂度 是验收对象，必须给可量化指标、日志信号和测试证据。
- 内存治理：围绕「时间换空间 vs 空间换时间：前端算法的内存预算与降级策略」里的 内存治理 验证时，要明确“达标阈值”和“不达标时的回退动作”。
- 算法取舍：在「时间换空间 vs 空间换时间：前端算法的内存预算与降级策略」里，算法取舍 是验收对象，必须给可量化指标、日志信号和测试证据。

#### 风险与验收

- 主要风险：在「时间换空间 vs 空间换时间：前端算法的内存预算与降级策略」里，指标来支撑结论 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。
- 验收信号：在「时间换空间 vs 空间换时间：前端算法的内存预算与降级策略」里，指标来支撑结论 至少要给一组指标阈值、一条日志证据和一组测试结果。

## time-space-tradeoff-budget-followup-3

title: 追问：遇到约束变化时，你会如何围绕 复杂度 拆分方案演进路径，而不是一次性推翻重来
difficulty: 资深
tags: [复杂度, 内存治理, 算法取舍, 追问]
parent: time-space-tradeoff-budget
generated: followup-script

### 一句话

先直接回答追问，再解释关键词，最后补风险与验收信号。

### 题目

如果面试官追问：遇到约束变化时，你会如何围绕 复杂度 拆分方案演进路径，而不是一次性推翻重来？

### 答案要点

#### 直答

- 结论：先拆分 时间换空间 与 空间换时间 的执行步骤，逐步实施并在每步后验证，异常立即回滚。
- 关键动作：先明确 时间换空间 与 空间换时间 的输入边界，再按最小改动落地，最后补回归与回退预案。

#### 术语解释

- 复杂度：在「时间换空间 vs 空间换时间：前端算法的内存预算与降级策略」这题里，复杂度 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。
- 内存治理：围绕「时间换空间 vs 空间换时间：前端算法的内存预算与降级策略」里的 内存治理 作答时，要说明由谁实施、怎么落地、失败后如何回退。
- 算法取舍：在「时间换空间 vs 空间换时间：前端算法的内存预算与降级策略」这题里，算法取舍 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。

#### 风险与验收

- 主要风险：在「时间换空间 vs 空间换时间：前端算法的内存预算与降级策略」场景下，时间换空间 与 空间换时间 最大风险是变更影响面估计过小，导致回归缺口被放大。
- 验收信号：在「时间换空间 vs 空间换时间：前端算法的内存预算与降级策略」里，时间换空间 与 空间换时间 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。
