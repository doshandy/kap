import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCommonScriptArgs, resolveOnlyContentFiles } from './shared/args';

const parserModule = (await import(
  new URL('../src/lib/contentBlockParser.ts', import.meta.url).href
)) as {
  parseInlineList(value: string): string[];
  readMeta(metaText: string, key: string): string | undefined;
  splitQuestionBlocks(content: string): {
    before: string;
    blocks: Array<{
      slug: string;
      raw: string;
      metaText: string;
      sections: Record<string, string>;
    }>;
  };
};

const { parseInlineList, readMeta, splitQuestionBlocks } = parserModule;

interface Block {
  slug: string;
  raw: string;
  metaText: string;
  sections: Record<string, string>;
  title: string;
  tags: string[];
  parent?: string;
}

const CONTENT_DIR = join(process.cwd(), 'content');
const { dryRun, onlyFile } = parseCommonScriptArgs(process.argv.slice(2));
const files = resolveOnlyContentFiles(
  readdirSync(CONTENT_DIR)
    .filter((file) => /^\d.*\.md$/.test(file))
    .sort(),
  onlyFile,
);

const stat = {
  filesTouched: 0,
  followupAnswersRewritten: 0,
  supplementalSectionsAdded: 0,
};

const TEMPLATE_PATTERNS: RegExp[] = [
  /^先界定/,
  /^围绕.*核心机制展开/,
  /^回答顺序可用/,
  /^先说判断标准/,
  /^复习这道追问时/,
  /^准备一个/,
  /^最后给出/,
  /^最容易失分的是/,
  /^另一个问题是/,
  /^保持「/,
];

function markdownPlain(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function repairBrokenFragments(value: string): string {
  return value
    .replace(/（如\s*）/g, '（如 `T extends { id: string }`）')
    .replace(/默认值（\s*）/g, '默认值（如 `T = unknown`）')
    .replace(/Omit\s*=\s*Pick>/g, 'Omit = `Pick<T, Exclude<keyof T, K>>`')
    .replace(
      /在 \/ 上加 integrity 属性指定文件的 hash/g,
      '在 script 标签 / link 标签上加 integrity 属性指定文件 hash',
    )
    .replace(
      /text\s*→\s*，mention\s*→\s*，link\s*→/g,
      'text -> 纯文本节点，mention -> @用户组件，link -> 可点击链接组件',
    );
}

function cleanLine(value: string): string {
  return repairBrokenFragments(markdownPlain(value))
    .replace(/^[-*]\s+/, '')
    .replace(/^[0-9]+[.)、]\s+/, '')
    .replace(/^####\s+/, '')
    .replace(/^(结论|界定条件|关键机制|失败场景|替代方案与取舍)：\s*/, '')
    .replace(/[。；;]+$/, '')
    .trim();
}

function normalizeTitle(value: string): string {
  return value
    .trim()
    .replace(/^追问：\s*/, '')
    .replace(/[？?。!！]+$/g, '')
    .trim();
}

function hashText(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickBySeed(options: string[], seed: string, offset = 0): string {
  if (!options.length) return '';
  const index = (hashText(seed) + offset) % options.length;
  return options[index];
}

function classify(block: Block): string {
  const hay = `${block.title} ${block.tags.join(' ')}`.toLowerCase();
  if (/手写|实现|怎么实现|请实现|封装|polyfill|源码/.test(hay)) return 'implementation';
  if (/安全|xss|csrf|cors|oauth|jwt|crypto|auth|权限|sri|csp|ssrf/.test(hay)) return 'security';
  if (/vue|响应式|pinia|nuxt|composition/.test(hay)) return 'vue';
  if (/react|hook|redux|zustand|rsc|fiber/.test(hay)) return 'react';
  if (/性能|缓存|lcp|首屏|bundle|perf|渲染|内存/.test(hay)) return 'performance';
  if (/网络|http|tcp|tls|websocket|sse|grpc|cdn/.test(hay)) return 'network';
  if (/测试|test|vitest|e2e|mock/.test(hay)) return 'testing';
  if (/架构|设计|治理|规范|工程|发布|构建|ci|监控|可观测/.test(hay)) return 'engineering';
  if (/算法|数组|链表|树|图|复杂度|排序|搜索/.test(hay)) return 'algorithm';
  if (/\b(ai|llm|rag|prompt|embedding|agent)\b|模型|大模型|检索增强|幻觉/.test(hay)) return 'ai';
  return 'general';
}

function pickFocusTerm(block: Block): string {
  const title = normalizeTitle(block.title);
  const tokens = title.match(/[A-Za-z][A-Za-z0-9_+#./-]{1,}|[\u4e00-\u9fa5]{2,10}/g) || [];
  const noisyToken = (token: string): boolean =>
    /^(如果|怎么|如何|哪些|什么|为什么|以及|场景|核心|规则|原理|项目|真实|业务|约束|稳定上线|检查项|重点巡检|最容易|优先补齐)$/.test(
      token,
    ) ||
    /^(如果|结合|围绕|在|把|推动|对于|针对|关于)/.test(token) ||
    /(真实业务|项目里|约束|场景下)$/.test(token);
  const picked = tokens.find((token) => !noisyToken(token));
  if (picked) return picked;

  const noisyTag = new Set([
    '追问',
    '高频',
    '手写',
    '原理',
    '方案',
    '工程',
    '实战',
    '基础',
    '进阶',
  ]);
  const usefulTag = block.tags.find(
    (item) => item.length >= 2 && item.length <= 12 && !noisyTag.has(item),
  );
  if (usefulTag) return usefulTag;
  return '关键链路';
}

function extractCandidateLines(answer: string): string[] {
  const out: string[] = [];
  const lines = answer.split(/\r?\n/);
  let inFence = false;
  let fenceMarker = '';
  for (const line of lines) {
    const fence = line.match(/^(`{3,}|~{3,})/);
    if (fence) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fence[1];
      } else if (fence[1].length >= fenceMarker.length) {
        inFence = false;
        fenceMarker = '';
      }
      continue;
    }
    if (inFence) continue;
    const cleaned = cleanLine(line);
    if (!cleaned || cleaned.length < 10) continue;
    if (TEMPLATE_PATTERNS.some((pattern) => pattern.test(cleaned))) continue;
    if (/标准回答（直接作答）|标准补充（边界\/失败\/取舍）|关键细节（可追问）/.test(cleaned))
      continue;
    out.push(cleaned);
  }
  return [...new Set(out)];
}

function replaceSection(raw: string, name: string, body: string): string {
  const re = new RegExp(`^###\\s+${name}\\s*$`, 'm');
  const match = raw.match(re);
  if (match?.index == null) return raw;
  const start = match.index + match[0].length;
  const rest = raw.slice(start);
  const next = rest.search(/^###\s+/m);
  const end = next >= 0 ? start + next : raw.length;
  return `${raw.slice(0, start)}\n\n${body.trim()}\n\n${raw.slice(end).replace(/^\s+/, '')}`;
}

function stripGeneratedSections(answer: string): string {
  const lines = answer.split('\n');
  const out: string[] = [];
  let skipping = false;
  for (const line of lines) {
    if (
      /^####\s+标准补充（边界\/失败\/取舍）\s*$/.test(line.trim()) ||
      /^####\s+标准回答（直接作答）\s*$/.test(line.trim()) ||
      /^####\s+关键细节（可追问）\s*$/.test(line.trim())
    ) {
      skipping = true;
      continue;
    }
    if (skipping && /^####\s+/.test(line)) {
      skipping = false;
    }
    if (!skipping) out.push(line);
  }
  return out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function buildSupplement(
  title: string,
  focus: string,
  domain: string,
  anchorA: string,
  anchorB: string,
  seed: string,
): string {
  const safeTitle = title.replace(/\s*是什么/g, '的定义');
  const conditionsMap: Record<string, string[]> = {
    implementation: [
      `界定条件：回答「${title}」时先约定 ${focus} 的输入输出契约、异常输入处理和边界行为（如取消、重入、幂等），否则实现不算完整。`,
      `界定条件：这题要先说清 ${focus} 的函数签名、时序语义和资源释放策略；如果这些口径不统一，代码再长也不是标准答案。`,
    ],
    security: [
      `界定条件：回答「${title}」时要先确认 ${focus} 的信任边界、服务端强校验和审计日志都可用；缺任一项都不能宣称方案可靠。`,
      `界定条件：这题成立前提是 ${focus} 链路的鉴权、输入校验、异常告警已经闭环；否则只能先做风险收敛，不要直接上线。`,
    ],
    performance: [
      `界定条件：回答「${title}」必须先给 ${focus} 的基线指标（耗时分位、错误率、用户体感），再给优化动作，否则结论不可信。`,
      `界定条件：只有在 ${focus} 的瓶颈被数据证实、回归方案准备完成时，答案里的优化建议才可直接执行。`,
    ],
    network: [
      `界定条件：这题默认 ${focus} 链路已定义超时、重试和幂等规则；若服务端语义不稳定，先补协议契约再谈优化。`,
      `界定条件：回答「${title}」时必须说明 ${focus} 在弱网、限流、断连三种场景下的处理差异，否则属于不完整答案。`,
    ],
    testing: [
      `界定条件：回答「${title}」要明确 ${focus} 的边界用例、回归用例和验收指标；只给 happy path 不算标准答案。`,
      `界定条件：这题成立前提是 ${focus} 对应的测试数据可复现、环境稳定、失败信号可观测。`,
    ],
    engineering: [
      `界定条件：回答「${title}」时要先定义 ${focus} 的迁移批次、灰度阈值和回滚门槛，缺任一项都不能称为可上线方案。`,
      `界定条件：该题的结论只在 ${focus} 的协作链路清晰、验收口径统一时成立；否则先做试点而非全量推进。`,
    ],
    algorithm: [
      `界定条件：回答「${title}」时要先说清输入规模、复杂度上限和内存预算，这三项决定 ${focus} 是否可行。`,
      `界定条件：该题的答案必须覆盖空值、重复值、越界输入；漏掉任一边界都会让 ${focus} 结论失真。`,
    ],
    ai: [
      `界定条件：回答「${title}」时要先定义 ${focus} 的效果阈值、延迟预算、成本上限和安全红线，四项缺一不可。`,
      `界定条件：该题结论成立前提是 ${focus} 的评估集稳定、失败样例可追踪，并且有可降级兜底。`,
    ],
    vue: [
      `界定条件：回答「${title}」时必须明确 ${focus} 的状态边界、更新时机和副作用释放点，否则答案不可落地。`,
      `界定条件：这题只有在 ${focus} 的响应式依赖可追踪、组件边界清晰时才成立。`,
    ],
    react: [
      `界定条件：回答「${title}」时要先区分 ${focus} 的本地状态、缓存状态和路由状态；混在一起会导致错误结论。`,
      `界定条件：该题成立前提是 ${focus} 的渲染热点可观测、失效策略可验证，并且能做回归。`,
    ],
    general: [
      `界定条件：回答「${title}」时要把 ${focus} 的输入边界、运行环境和验收口径一次讲全，缺任何一项都不算标准答案。`,
      `界定条件：这题的结论只在「${anchorA}」成立时有效；若约束变化，必须同步调整实现与验证方式。`,
    ],
  };

  const failureMap: Record<string, string[]> = {
    implementation: [
      `失败场景：例如 ${focus} 实现里定时器或订阅未正确释放，连续操作后会出现重复执行或内存泄漏；修复要补清理逻辑和回归用例。`,
      `失败场景：例如 ${focus} 实现忽略 this/参数透传，线上会出现行为与预期不一致；应补调用语义测试并明确默认行为。`,
    ],
    security: [
      `失败场景：例如把未授权请求当成可信输入，${focus} 接口会被绕过并触发越权操作；排查看审计日志与异常来源，修复是立即收口服务端校验。`,
      `失败场景：例如第三方脚本被篡改后仍执行，${focus} 链路会出现高危注入；应立刻切回保守策略并补完整性校验。`,
    ],
    performance: [
      `失败场景：例如主线程在首屏阶段执行重计算，${focus} 指标会从可接受直接退化到用户可感知卡顿；修复要拆分任务并回归验证。`,
      `失败场景：例如缓存命中假设不成立，${focus} 在真实流量下会抖动，线上耗时明显恶化；应先回滚再重做归因。`,
    ],
    network: [
      `失败场景：例如弱网重试未做幂等，${focus} 请求会重复写入并造成状态错乱；修复需要补幂等键、指数退避和用户可见兜底提示。`,
      `失败场景：例如网关限流时仍持续重试，${focus} 会放大故障并拖垮下游；应立即降级并限制重试窗口。`,
    ],
    testing: [
      `失败场景：例如只测主路径，${focus} 的空值或异常输入上线后直接触发崩溃；修复要补边界回归并把失败信号接入 CI。`,
      `失败场景：例如测试强绑实现细节，重构后误报激增，团队忽略告警；要改为行为断言并分层执行测试。`,
    ],
    engineering: [
      `失败场景：例如一次性全量切换 ${focus}，线上告警会在几分钟内扩散；正确做法是分批灰度、保留旧链路并设置回滚阈值。`,
      `失败场景：例如迁移期新旧数据口径不一致，${focus} 会出现结果漂移；应先冻结高风险写入并执行兼容校验。`,
    ],
    algorithm: [
      `失败场景：例如忽略极端输入规模，${focus} 的复杂度会在高峰期失控，导致超时或 OOM；修复要改数据结构并做压测。`,
      `失败场景：例如漏掉重复值/越界输入，${focus} 会返回错误结果；需要补不变量断言和反例测试。`,
    ],
    ai: [
      `失败场景：例如模型在 ${focus} 场景出现幻觉但无兜底，错误结果会直接影响业务决策；应启用规则校验与人工复核降级。`,
      `失败场景：例如成本阈值被击穿，${focus} 请求被限流导致体验抖动；应切轻量模型并启用缓存回退。`,
    ],
    vue: [
      `失败场景：例如跨组件共享状态无边界，${focus} 会触发级联重渲染和状态抖动；修复是拆分作用域并收敛副作用。`,
      `失败场景：例如 watch 链路过深，${focus} 更新顺序错位导致页面异常；应减少隐式依赖并补时序回归。`,
    ],
    react: [
      `失败场景：例如把缓存状态和本地状态混用，${focus} 会出现重复请求与 UI 闪烁；应拆分数据源并统一失效策略。`,
      `失败场景：例如并发渲染下闭包拿到旧值，${focus} 交互出现脏读；要使用稳定引用并补并发场景测试。`,
    ],
    general: [
      `失败场景：例如忽略「${anchorB || anchorA}」这条机制，在边界输入、调用顺序变化或运行环境差异下会直接失效；修复顺序是复现 -> 观测 -> 回滚 -> 修正。`,
      `失败场景：例如把默认路径当成唯一路径，${focus} 在边界条件下会出现明显偏差；要提前定义异常分支和降级动作。`,
    ],
  };

  const alternativeMap: Record<string, string[]> = {
    implementation: [
      `替代方案与取舍：可直接引入成熟库快速上线，但在「${title}」这题里仍要讲清底层语义；当前保留手写版本便于解释边界与调试。`,
      `替代方案与取舍：也可只给伪代码说明思路，但可靠性细节会缺失；当前给可运行实现并补异常路径更符合资深标准。`,
    ],
    security: [
      `替代方案与取舍：可用“全前端限制 + 人工巡检”快速落地，但对「${title}」风险不足；当前优先服务端强校验，因为可审计、可回滚。`,
      `替代方案与取舍：也可一次性上统一网关策略，但改造窗口过大；当前先在 ${focus} 链路分层收口再逐步统一。`,
    ],
    performance: [
      `替代方案与取舍：可选一次性大重构追求极致性能，但交付风险高；当前对「${title}」采用小步优化更稳。`,
      `替代方案与取舍：也可临时加机器兜底，但长期成本高；当前优先优化 ${focus} 的计算与缓存路径。`,
    ],
    network: [
      `替代方案与取舍：可选“失败就无限重试”，实现简单但会放大故障；当前在「${title}」里采用限次重试 + 降级。`,
      `替代方案与取舍：也可吞掉错误换表面成功率，但定位成本极高；当前保留错误语义和回滚开关。`,
    ],
    testing: [
      `替代方案与取舍：可把资源都投在 e2e，但反馈慢；当前在「${title}」采用单测+集成+少量 e2e 的分层组合。`,
      `替代方案与取舍：也可只保留冒烟测试提速，但回归信心不足；当前优先覆盖 ${focus} 的高风险边界。`,
    ],
    engineering: [
      `替代方案与取舍：可全量切换求速度，但回滚风险高；当前对「${title}」按阶段灰度，每阶段可验收可撤回。`,
      `替代方案与取舍：也可长期双轨运行降风险，但维护成本翻倍；当前在 ${focus} 关键链路先收敛再替换。`,
    ],
    algorithm: [
      `替代方案与取舍：可选更直观但复杂度更高的写法快速交付；当前在「${title}」优先保证规模上限可控。`,
      `替代方案与取舍：也可走极致性能实现，但可读性和维护成本高；当前在复杂度与维护性间取平衡。`,
    ],
    ai: [
      `替代方案与取舍：可直接换更大模型提升效果，但时延和成本不可控；当前对「${title}」采用模型路由与降级。`,
      `替代方案与取舍：也可全规则化避免幻觉，但覆盖有限；当前采用“模型 + 规则校验 + 人工兜底”。`,
    ],
    vue: [
      `替代方案与取舍：可把状态全塞进一个 store 降低入口数量，但 ${focus} 会快速耦合；当前按作用域分层更稳。`,
      `替代方案与取舍：也可大量 watch 提速开发，但时序风险高；当前优先显式数据流和可观测边界。`,
    ],
    react: [
      `替代方案与取舍：可把状态都上提到全局仓库，但 ${focus} 易失控；当前按本地/缓存/路由分层可维护性更好。`,
      `替代方案与取舍：也可过度 memo 追求性能，但调试复杂；当前只优化热点路径并保留清晰数据流。`,
    ],
    general: [
      `替代方案与取舍：可选更激进实现追求短期收益，但对「${title}」风险偏高；当前方案可验证、可灰度、可回滚。`,
      `替代方案与取舍：也可维持旧实现减少改动，但长期维护成本更高；在「${title}」里当前按阶段替换更稳。`,
    ],
  };

  const cond = pickBySeed(conditionsMap[domain] || conditionsMap.general, `${seed}|cond`, 1);
  const fail = pickBySeed(failureMap[domain] || failureMap.general, `${seed}|fail`, 2);
  const alt = pickBySeed(alternativeMap[domain] || alternativeMap.general, `${seed}|alt`, 3);
  const normalizeLine = (line: string) =>
    line
      .replaceAll(title, safeTitle)
      .replace(/「([^」]{4,80}) 是什么」/g, '「$1 的定义」')
      .replace(/\s+/g, ' ')
      .trim();

  return `#### 标准补充（边界/失败/取舍）
- ${normalizeLine(cond)}
- ${normalizeLine(fail)}
- ${normalizeLine(alt)}`;
}

function buildFollowupAnswer(block: Block, parent: Block): string {
  const title = normalizeTitle(block.title);
  const safeTitle = title.replace(/\s*是什么/g, '的定义');
  const focus = pickFocusTerm(block);
  const domain = classify(block);
  const seed = `${block.slug}|${title}|${focus}|${domain}`;
  const parentLines = extractCandidateLines(parent.sections['答案要点'] || '');
  const ownLines = extractCandidateLines(block.sections['答案要点'] || '');
  const detailPool = [...new Set([...parentLines, ...ownLines])];

  const conclusion =
    detailPool[0] ||
    `先给结论：围绕「${title}」，要把 ${focus} 的定义、边界和终止条件一次讲清，避免停在口号层。`;
  const mechanismA =
    detailPool[1] || `先讲主链路：输入如何进入 ${focus}，中间如何处理，最终如何得到结果。`;
  const mechanismB =
    detailPool[2] || `再讲异常链路：当约束不成立时如何降级、如何提示用户、如何快速回滚。`;

  const supplement = buildSupplement(
    title,
    focus,
    domain,
    cleanLine(conclusion),
    cleanLine(mechanismA),
    seed,
  );

  const detailLines = detailPool.slice(0, 3).map((line) => `- ${line}`);
  const detailSection = detailLines.length
    ? `\n\n#### 关键细节（可追问）\n${detailLines.join('\n')}`
    : '';

  return `#### 标准回答（直接作答）
- 结论：${cleanLine(conclusion)}
- 机制：${cleanLine(mechanismA)}；${cleanLine(mechanismB)}
- 落地动作：回答「${safeTitle}」时，按“前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认”的顺序给出可执行步骤。

${supplement}${detailSection}`.trim();
}

function buildBaseAnswer(block: Block): string {
  const title = normalizeTitle(block.title);
  const focus = pickFocusTerm(block);
  const domain = classify(block);
  const seed = `${block.slug}|${title}|${focus}|${domain}`;
  const rawAnswer = stripGeneratedSections(block.sections['答案要点'] || '');
  const anchorLines = extractCandidateLines(rawAnswer);
  const anchorA = anchorLines[0] || `${focus} 主链路`;
  const anchorB = anchorLines[1] || `${focus} 异常链路`;
  const supplement = buildSupplement(title, focus, domain, anchorA, anchorB, seed);
  return `${rawAnswer.trim()}\n\n${supplement}`.trim();
}

for (const file of files) {
  const filePath = join(CONTENT_DIR, file);
  const raw = readFileSync(filePath, 'utf8');
  const parsed = splitQuestionBlocks(raw);
  const bySlug = new Map<string, Block>();
  const blocks: Block[] = parsed.blocks.map((item) => {
    const block: Block = {
      slug: item.slug,
      raw: item.raw,
      metaText: item.metaText,
      sections: item.sections,
      title: readMeta(item.metaText, 'title') || item.slug,
      tags: parseInlineList(readMeta(item.metaText, 'tags') || '[]'),
      parent: readMeta(item.metaText, 'parent') || readMeta(item.metaText, 'parentId'),
    };
    bySlug.set(block.slug, block);
    return block;
  });

  let fileChanged = false;
  const rewritten = blocks.map((block) => {
    const parentSlug = (block.parent || '').replace(/^.*\//, '');
    const parent = parentSlug ? bySlug.get(parentSlug) : undefined;
    const answer = parent ? buildFollowupAnswer(block, parent) : buildBaseAnswer(block);
    if (parent) stat.followupAnswersRewritten++;
    const next = replaceSection(block.raw, '答案要点', answer);
    if (next !== block.raw) {
      fileChanged = true;
      stat.supplementalSectionsAdded++;
    }
    return next;
  });

  const output = `${parsed.before}${rewritten.join('\n')}`;
  if (fileChanged) {
    stat.filesTouched++;
    if (!dryRun) writeFileSync(filePath, output);
  }
}

console.log(
  `已${dryRun ? '预览' : '写入'}标准答案增强：影响 ${stat.filesTouched} 个文件，重写追问答案 ${stat.followupAnswersRewritten} 道，更新答案段 ${stat.supplementalSectionsAdded} 处。`,
);
if (dryRun) console.log('dry-run 模式，未写入文件。传入 --write 才会落盘。');
