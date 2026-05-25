# 添加题目指南

本项目的题库内容全部放在 [`content/`](../content) 下，每个分类对应一个 Markdown 文件。

## 目录约定

- 一个分类一个文件，例如 `03-vue.md`
- 文件顶部必须有 frontmatter
- frontmatter 的 `id` 必须与文件名一致，例如 `03-vue.md` 对应 `id: 03-vue`
- `order` 必须是正整数，且全局唯一
- 正文中每个 `## <slug>` 表示一题
- `slug` 是稳定 ID，请避免随意修改；它会影响分享链接、本地进度和复习记录

## 分类文件模板

```markdown
---
id: 03-vue
title: Vue 全家桶
order: 3
icon: 🟩
description: 可选描述
---
```

字段说明：

- `id`：分类唯一 ID
- `title`：分类标题
- `order`：排序号
- `icon`：侧边栏和首页使用的图标
- `description`：分类描述，可选

## 单题模板

````markdown
## proxy-vs-defineproperty

title: Vue3 为什么用 Proxy 替代 Object.defineProperty
difficulty: 进阶
tags: [响应式, 原理]
followups: [proxy-vs-defineproperty-followup-1]
links: [03-vue/effect-track-trigger, 01-javascript/proxy-reflect]

### 题目

请说明 Vue3 响应式系统替换为 Proxy 的核心动机与代价。

### 答案要点

- defineProperty 无法监听新增/删除、数组索引、Map/Set
- Proxy 拦截 13 种操作，配合 Reflect 保证 receiver
- 代价：IE 不兼容；嵌套对象按需代理（Lazy）

### 代码示例

```ts
const reactive = <T extends object>(target: T) =>
  new Proxy(target, {
    get(t, k, r) {
      track(t, k);
      return Reflect.get(t, k, r);
    },
    set(t, k, v, r) {
      const ok = Reflect.set(t, k, v, r);
      trigger(t, k);
      return ok;
    },
  });
```

### 延伸

- 与 React `useState` immutable 模型对比
- `ref` 与 `reactive` 的取舍
````

字段说明：

- `title`：题目名称，必填
- `difficulty`：`基础` / `进阶` / `资深`
- `tags`：标签数组，建议控制在 2 到 5 个
- `followups`：原题关联的追问题 slug 或完整题目 ID，可选
- `parent`：追问题所属原题 slug 或完整题目 ID，可选
- `links`：跨题相关题目 slug 或完整题目 ID，可选；不带 `/` 默认指向当前分类，带 `/` 表示跨分类完整 ID
- 题目元数据必须写在第一个 `###` 子段落之前
- `### 题目`：题干，必填
- `### 答案要点`：答案正文，必填
- `### 代码示例`：可选
- `### 追问`：面试官追问清单，可选；建议与 `followups` 中的独立追问题一一对应
- `### 延伸`：可选

## 追问题写法

追问题是普通题目，只是通过 `parent` 指向原题；原题通过 `followups` 指回追问题，页面会渲染为可跳转的关联题。

```markdown
## proxy-vs-defineproperty-followup-1

title: 追问：Proxy 为什么能监听新增属性
difficulty: 进阶
tags: [响应式, 追问]
parent: proxy-vs-defineproperty

### 题目

如果面试官追问：为什么 Proxy 能监听新增属性，而 Object.defineProperty 做不到？你会怎么回答？

### 答案要点

- Proxy 代理的是对象操作入口，`set` / `deleteProperty` 能拦截新增、删除与索引写入。
- Object.defineProperty 只能改写已经定义好的属性描述符，新增属性没有预先 getter/setter 就不会被观察。
- 工程上还要提到 Proxy 对 Map/Set 等集合类型更自然，但也有 IE 不兼容的代价。
```

## 内容建议

- 一题聚焦一个核心知识点或一个强关联问题簇
- 先给结论，再解释原理，再补边界和工程实践
- 代码示例尽量短小但能说明关键点
- 如果代码块里需要展示 Markdown 标题，请放在 fenced code block 内；校验器会跳过代码块内的 `##`
- 延伸部分适合放易错点、对比项、追问方向

## 答案质量标准

- 主问题与追问题都必须满足“场景前提 + 可执行步骤 + 失败风险 + 验证信号”四要素。
- 追问题必须直接回应追问意图，禁止复读父题答案。
- 禁止模板化空话、机械流程口号和截断句。

详细规则见 [`docs/answer-quality-rubric.md`](./answer-quality-rubric.md)。

## 提交前检查

```bash
pnpm validate:content
pnpm lint
pnpm lint:style
pnpm typecheck
pnpm typecheck:node
pnpm generate:sitemap
pnpm build
```

`validate:content` 会校验：

- `content/` 目录是否为空
- 分类 frontmatter 是否包含 `id/title/order`
- 分类 `id` 是否与文件名一致，`order` 是否为唯一正整数
- 每题是否包含 `title`
- 每题是否至少有 `### 题目` 与 `### 答案要点`
- 同分类内 `slug`、全局题目 ID 是否重复
- 题目元数据是否误写到 `###` 段落之后
- `tags` / `followups` 是否使用内联数组格式
- `parent` / `followups` 是否存在、自引用或重复
- `links` 是否存在、自引用或重复
- `###` 段落是否重复或为空
- fenced code block 是否闭合、是否有语言标识
- 是否出现常见生成损坏片段，例如尖括号内容丢失、HTML 标签名缺失、模板变量被错误转义
- 同一文件内是否残留大量模板化追问句式；默认只提示，`STRICT_VALIDATE=1` 下会失败
- 追问题答案是否缺少动作化描述、风险提示与验证信号（严格模式下会失败）

## 维护建议

- 尽量不要修改已发布题目的 `slug`
- 如果需要重构某题，优先保留稳定 ID，只更新标题和内容
- 新增题目时，尽量遵守当前分类下已有的命名和写作风格

## 批量维护脚本

内容批量脚本默认应先预览，不直接落盘：

- `pnpm content:summary`：预览缺失「一句话」的补全文案；确认后用 `pnpm content:summary:write`
- `pnpm content:pitfall`：通过 stdin 预览注入「常见误区 / 追问」段落；确认后用 `pnpm content:pitfall:write`
- `pnpm content:followups`：预览追问题生成和刷新结果；确认后用 `pnpm content:followups:write`
- `pnpm content:links`：预览跨题相关题目的高置信关联；确认后用 `pnpm content:links:write`
- `pnpm content:polish`：预览移除泛化追问、收敛过密 links、清理生成模板句；确认后用 `pnpm content:polish:write`
- `pnpm tsx scripts/enhance-content-quality.ts`：预览补常见误区、扩写短答案和改写模板追问；确认后加 `--write`
- `pnpm tsx scripts/rewrite-standard-answers.ts --only=xx.md`：重写主问题与追问题答案（含一句话与工程化补充）；确认后加 `--write` 批量落盘

全量改写推荐按批次执行，批次清单见 [`docs/answer-rewrite-batches.md`](./answer-rewrite-batches.md)。

推荐流程：先用 `--only=xx.md` 小范围验证，再看 git diff，最后运行 `pnpm validate:content`；大范围改写后再跑 `pnpm build`。
