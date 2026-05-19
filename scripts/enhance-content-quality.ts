import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCommonScriptArgs, resolveOnlyContentFiles } from './shared/args';
import { canonicalizeFollowupQuestionPattern } from './shared/followupCanonical';

const parserModule = (await import(
  new URL('../src/lib/contentBlockParser.ts', import.meta.url).href
)) as {
  parseInlineList(value: string): string[];
  parseSections(raw: string): Record<string, string>;
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
const { parseInlineList, parseSections, readMeta, splitQuestionBlocks } = parserModule;

interface Block {
  slug: string;
  raw: string;
  title: string;
  difficulty: string;
  tags: string[];
  parent?: string;
  isFollowup: boolean;
  sections: Record<string, string>;
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
  pitfallsAdded: 0,
  answersExpanded: 0,
  followupsRewritten: 0,
  parentFollowupSectionsRewritten: 0,
};

function markdownPlain(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function splitBlocks(content: string): { before: string; blocks: Block[] } {
  const parsed = splitQuestionBlocks(content);
  return {
    before: parsed.before,
    blocks: parsed.blocks.map((block) => ({
      slug: block.slug,
      raw: block.raw,
      title: readMeta(block.metaText, 'title') || block.slug,
      difficulty: readMeta(block.metaText, 'difficulty') || '进阶',
      tags: parseInlineList(readMeta(block.metaText, 'tags') || '[]'),
      parent: readMeta(block.metaText, 'parent') || readMeta(block.metaText, 'parentId'),
      isFollowup: /^parent(Id)?\s*:/m.test(block.metaText),
      sections: block.sections,
    })),
  };
}

function classify(block: Block): string {
  const hay = `${block.title} ${block.tags.join(' ')}`.toLowerCase();
  const tagSet = new Set(block.tags.map((tag) => tag.toLowerCase()));
  const aiTags = [
    'ai',
    'llm',
    'rag',
    'prompt',
    'embedding',
    'agent',
    'tooluse',
    'tool-call',
    'copilot',
  ];
  if (
    aiTags.some((tag) => tagSet.has(tag)) ||
    /\b(llm|rag|prompt|embedding|agent|copilot)\b/i.test(
      `${block.title} ${block.tags.join(' ')}`,
    ) ||
    /大模型|模型输出|提示词|向量检索|检索增强|幻觉|函数调用/.test(
      `${block.title} ${block.tags.join(' ')}`,
    )
  ) {
    return 'ai';
  }
  if (/安全|xss|csrf|cors|oauth|jwt|crypto|auth|权限/.test(hay)) return 'security';
  if (/性能|缓存|lcp|首屏|bundle|perf|渲染|内存/.test(hay)) return 'performance';
  if (/vue|响应式|pinia|nuxt|composition/.test(hay)) return 'vue';
  if (/react|hook|redux|zustand|rsc|fiber/.test(hay)) return 'react';
  if (/网络|http|tcp|tls|websocket|sse|grpc|cdn/.test(hay)) return 'network';
  if (/测试|test|vitest|e2e|mock/.test(hay)) return 'testing';
  if (/架构|设计|治理|规范|工程|发布|构建|ci|监控|可观测/.test(hay)) return 'engineering';
  if (/算法|数组|链表|树|图|复杂度|排序|搜索/.test(hay)) return 'algorithm';
  return 'general';
}

function domainExpansionLine(domain: string): string {
  const domainLine: Record<string, string> = {
    security: '安全题要补威胁模型、信任边界、攻击路径和服务端兜底，不能只停留在前端 API。',
    performance: '性能题要先度量再优化，区分实验室指标和真实用户指标，并说明收益与副作用。',
    vue: 'Vue 题要把响应式、组件更新、生命周期和工程组织串起来，不要只罗列 API。',
    react: 'React 题要区分渲染、状态、数据获取和并发特性，说明优化前后的约束变化。',
    network: '网络题要覆盖客户端、代理、服务端和缓存链路，说明超时、重试和降级策略。',
    ai: 'AI 题要同时回答效果、成本、延迟、安全、评估和可观测性，避免只讲模型能力。',
    testing: '测试题要说明测试金字塔、边界用例、稳定性和维护成本，避免只写工具名。',
    engineering: '工程题要补团队协作、迁移策略、灰度发布、回滚预案和长期治理。',
    algorithm: '算法题要说明复杂度、边界输入、反例构造、数据结构选择和可读性权衡。',
    general: '回答时要从定义、机制、边界、落地和验证五个层面展开。',
  };
  return domainLine[domain] || domainLine.general;
}

function domainPitfall(domain: string): string[] {
  const map: Record<string, string[]> = {
    security: [
      '只做前端校验而忽略服务端鉴权、审计和最小权限，容易把安全边界放错位置。',
      '把“能跑通”当成“安全”，没有考虑重放、绕过、降级、错误提示泄露和第三方依赖风险。',
    ],
    performance: [
      '先凭感觉优化而不先量化瓶颈，容易把时间花在用户无感的指标上。',
      '只看实验室分数，不看真实设备、弱网、缓存命中率和长任务分布，结论会偏乐观。',
    ],
    vue: [
      '只会背 API 名字，却讲不清响应式依赖怎么收集、组件边界怎么更新、生命周期怎么配合。',
      'API 会背但讲不出依赖追踪、更新边界和生命周期怎么配合，回答容易停在文档层。',
      '只报 API 名字，不说明依赖如何收集、更新何时触发，面试官通常会继续追问。',
      '只讲“用哪个 API”却不讲“为什么这样更新”，会暴露对响应式机制掌握不扎实。',
      '把所有状态都塞进同一个 store 或 composable，忽略作用域、释放时机和可测试性。',
    ],
    react: [
      '把 memo/useMemo/useCallback 当成万能优化，反而增加依赖错误和维护成本。',
      '把客户端状态、服务端缓存和 URL 状态揉在一起，最后数据源打架、失效策略也对不上。',
      '客户端状态、服务端缓存和 URL 状态边界不清，常见结果是数据互相覆盖、失效时机错乱。',
      '把本地状态、接口缓存和路由状态混成一锅，往往会带来重复请求和数据不一致。',
      '三类状态没分层：组件内状态、缓存状态、URL 参数互相牵扯，排障会非常痛苦。',
    ],
    network: [
      '只比较协议名，不说明连接复用、队头阻塞、重试、超时、缓存和代理链路。',
      '忽略失败场景：弱网、半开连接、证书过期、跨域、限流和服务端降级。',
    ],
    ai: [
      '只调 prompt，不建立评估集、成本预算、超时重试、内容安全和人工兜底。',
      '把模型输出当确定结果使用，忽略幻觉、上下文污染、隐私泄露和可观测性。',
    ],
    testing: [
      '只覆盖 happy path，不覆盖边界输入、异常路径、异步时序和回归用例。',
      '只测 happy path，不测边界输入和失败分支，线上一出问题就会暴露盲区。',
      '测试里缺少异常时序与回归链路覆盖，重构后很难判断是功能回退还是用例失真。',
      '测试过度依赖实现细节，重构后大量误报，反而降低团队维护意愿。',
    ],
    engineering: [
      '只给方案图，不说明约束、迁移路径、灰度策略、回滚和长期维护成本。',
      '忽略团队协作和历史包袱，导致设计在文档里成立，在真实项目里落不下去。',
    ],
    algorithm: [
      '只写出代码，不说明复杂度、边界输入、稳定性和为什么这种数据结构合适。',
      '递归/双指针/哈希表等套路没有处理空值、重复元素、越界和极端规模。',
    ],
    general: [
      '如果没有补充输入边界、失败路径和替代方案，答案会停留在“知道概念”的层面。',
      '如果不说明监控指标、发布策略和回滚方式，工程可信度会明显不足。',
    ],
  };
  return map[domain] || map.general;
}

function pickPitfallPair(lines: string[], seed: string): [string, string] {
  if (!lines.length)
    return ['避免空泛结论，先给约束再给方案。', '补上可验证标准，确保结论可复核。'];
  if (lines.length === 1) return [lines[0], lines[0]];
  const first = pickBySeed(lines, `${seed}|pitfall-a`, 1);
  const rest = lines.filter((line) => line !== first);
  const second = rest.length ? pickBySeed(rest, `${seed}|pitfall-b`, 2) : first;
  return [first, second];
}

function pitfallFor(block: Block): string {
  const domain = classify(block);
  const tags = block.tags.length ? `相关标签是 ${block.tags.slice(0, 3).join('、')}，` : '';
  const specific = domainPitfall(domain);
  const [specificA, specificB] = pickPitfallPair(specific, block.slug);
  const opener: Record<string, string> = {
    security: `- 回答「${block.title}」时如果只列防护点，不先说明资产、攻击面和信任边界，方案会显得不可信。`,
    performance: `- 回答「${block.title}」时如果不先给指标和测量方式，很容易变成凭经验调参。`,
    vue: `- 回答「${block.title}」时如果只罗列 API，不解释响应式或组件更新链路，深挖时会露出断层。`,
    react: `- 回答「${block.title}」时如果只说工具名，不区分渲染、状态和数据来源，容易把问题混在一起。`,
    network: `- 回答「${block.title}」时如果只比较协议名，不补失败场景和链路约束，落地价值会不足。`,
    ai: `- 回答「${block.title}」时如果只谈模型能力，不覆盖评估、成本、隐私和兜底，会缺少产品化视角。`,
    testing: `- 回答「${block.title}」时如果只写 happy path，不说明边界和稳定性，测试价值会被高估。`,
    engineering: `- 回答「${block.title}」时如果只给目标架构，不讲迁移、灰度和回滚，方案很难真正落地。`,
    algorithm: `- 回答「${block.title}」时如果只写代码，不解释复杂度和边界输入，无法体现工程可靠性。`,
    general: `- 回答「${block.title}」时不要停在定义层，要补充适用条件、失效边界和验证方式。`,
  };
  const verifyLine =
    domain === 'algorithm'
      ? '回答时要补充可验证手段：如何构造边界样例、如何证明复杂度、如何用用例覆盖异常输入。'
      : '回答时要补充可验证手段：如何复现问题、用什么指标判断有效、出现异常时如何降级或回滚。';
  return `${opener[domain] || opener.general}
- ${specificA}
- ${specificB}
- ${tags}${verifyLine}`;
}

function sectionLength(section: string | undefined): number {
  return markdownPlain(section || '').replace(/\s+/g, '').length;
}

function expansionFor(block: Block): string {
  const domain = classify(block);
  const title = block.title;
  const terms = block.tags.slice(0, 4).join('、') || '核心概念';
  return `#### 补充说明
- 面试中不要只停留在「${title}」的定义，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。
- 可以围绕 ${terms} 展开：先给核心机制，再补工程场景，最后说明替代方案和取舍理由。
- ${domainExpansionLine(domain)}
- ${
    domain === 'algorithm'
      ? '验证时建议给出路径：单测覆盖边界，样例覆盖极端输入，必要时用基准测试观察耗时和内存。'
      : '落地时建议给出验证路径：单测覆盖边界，集成测试覆盖主链路，线上通过日志、指标或灰度观察真实效果。'
  }
- ${
    domain === 'algorithm'
      ? '如果答案涉及性能或可读性，要主动说明默认方案、例外输入和替代实现。'
      : '如果答案涉及兼容性、性能或安全，要主动说明默认方案、例外场景和回滚策略。'
  }`;
}

function refreshGeneratedAnswer(raw: string, block: Block): string {
  if (!/^####\s+补充说明\s*$/m.test(block.sections['答案要点'] || '')) return raw;
  const domain = classify(block);
  return raw.replace(
    /^- (安全题|性能题|Vue 题|React 题|网络题|AI 题|测试题|工程题|算法题|回答时要).+$/m,
    `- ${domainExpansionLine(domain)}`,
  );
}

function followupQuestionsFor(parent: Block): string[] {
  const domain = classify(parent);
  const title = normalizeWhatIsTitle(parent.title).replace(/[？?。]+$/, '');
  const focusTerm = pickFollowupFocusTerm(parent, title);
  const map: Record<string, string[]> = {
    security: [
      `如果把「${title}」放到真实业务里，你会怎么划分信任边界和服务端兜底？`,
      `你会如何证明这个安全方案没有被绕过，并监控异常攻击流量？`,
      `当安全性、用户体验和研发成本冲突时，你会如何取舍？`,
    ],
    performance: [
      `你会先看哪些与 ${focusTerm} 相关的指标来判断「${title}」是不是当前性能瓶颈？`,
      `优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数？`,
      `如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做？`,
    ],
    vue: [
      `在 Vue 项目里落地「${title}」时，响应式边界和组件更新时机要注意什么？`,
      `如果这个方案导致状态耦合或调试困难，你会怎么拆分和验证？`,
      `它和常见替代方案相比，适合什么团队规模和业务复杂度？`,
    ],
    react: [
      `在 React 项目里应用「${title}」时，哪些 state 或渲染边界最容易出问题？`,
      `你会用 Profiler、测试或线上指标如何验证这个优化有效？`,
      `它和服务端数据缓存、并发渲染或 ${focusTerm} 拆分之间有什么取舍？`,
    ],
    network: [
      `在弱网、代理、断连或服务端限流场景下，你会围绕 ${focusTerm} 重点排查「${title}」的哪些边界问题？`,
      `你会如何设计超时、重试、幂等和降级来保证链路可靠？`,
      `如果要在线上证明「${title}」稳定，你会优先看哪些和 ${focusTerm} 相关的日志与指标？`,
    ],
    ai: [
      `「${title}」上线前你会如何做效果评估、成本预算和安全防护？`,
      `模型输出不稳定或出现幻觉时，产品和工程上分别怎么兜底？`,
      `如果延迟、成本和准确率不能同时满足，你会如何做路由或降级？`,
    ],
    testing: [
      `针对「${title}」，你会优先补哪些边界用例和回归用例？`,
      `测试怎么写才能不绑死实现细节，避免重构时误报一片？`,
      `围绕 ${focusTerm} 的这类测试在 CI 中如何分层运行，兼顾速度和信心？`,
    ],
    engineering: [
      `真要把「${title}」推到线上，你会如何围绕 ${focusTerm} 设计灰度节奏、回滚条件和迁移路径？`,
      `如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？`,
      `你会用哪些指标判断这个工程方案长期值得维护？`,
    ],
    algorithm: [
      `「${title}」有哪些容易漏掉的边界输入和复杂度陷阱？`,
      `如果数据规模扩大一个数量级，你会如何围绕 ${focusTerm} 调整数据结构或算法？`,
      `你会怎么证明实现正确，而不是只靠几个样例跑通？`,
    ],
    general: [
      `把「${title}」放到真实项目时，最容易忽略的边界条件和前置约束是什么？`,
      `如果要证明「${title}」真的有效，你会设计哪些验证路径和观察指标？`,
      `当需求规模、团队资源或兼容性要求变化时，你会如何重排方案优先级？`,
    ],
  };
  const base = map[domain] || map.general;
  return base.map((question, index) => diversifyFollowupQuestion(question, parent, index));
}

function replaceSection(raw: string, name: string, body: string): string {
  const re = new RegExp(`^###\\s+${name}\\s*$`, 'm');
  const match = raw.match(re);
  if (!match?.index && match?.index !== 0) {
    const extra = raw.search(/^###\s+延伸\s*$/m);
    const section = `### ${name}\n${body.trim()}\n\n`;
    if (extra >= 0) return `${raw.slice(0, extra)}${section}${raw.slice(extra)}`;
    return `${raw.replace(/\s+$/, '\n\n')}${section}`;
  }
  const start = match.index + match[0].length;
  const rest = raw.slice(start);
  const next = rest.search(/^###\s+/m);
  const end = next >= 0 ? start + next : raw.length;
  return `${raw.slice(0, start)}\n${body.trim()}\n\n${raw.slice(end).replace(/^\s+/, '')}`;
}

function appendToAnswer(raw: string, body: string): string {
  const answer = raw.match(/^###\s+答案要点\s*$/m);
  if (!answer?.index && answer?.index !== 0) return raw;
  const start = answer.index + answer[0].length;
  const rest = raw.slice(start);
  const next = rest.search(/^###\s+/m);
  const end = next >= 0 ? start + next : raw.length;
  const current = raw.slice(start, end).trim();
  if (/^####\s+补充说明\s*$/m.test(current)) return raw;
  return `${raw.slice(0, end).replace(/\s+$/, '')}\n\n${body.trim()}\n\n${raw.slice(end).replace(/^\s+/, '')}`;
}

function inferFollowupIntent(question: string, index: number, domain: string): string {
  if (/指标|证明|验证|监控|评估|Profiler|CI|测试/.test(question)) return 'verify';
  if (/弱网|代理|断连|限流|超时|重试|幂等|可靠/.test(question)) return 'reliability';
  if (/规模|成本|兼容|扩大|数量级|调整/.test(question)) return 'scale';
  if (/灰度|回滚|迁移|落地|推进|团队|历史包袱/.test(question)) return 'rollout';
  if (/安全|绕过|攻击|信任边界|兜底|隐私/.test(question)) return 'security';
  if (domain === 'ai' && /延迟|成本|准确率|幻觉|模型/.test(question)) return 'ai-tradeoff';
  if (/边界|踩到|陷阱|失效/.test(question)) return 'boundary';
  return ['boundary', 'verify', 'scale'][index % 3];
}

function domainNoun(domain: string): string {
  const map: Record<string, string> = {
    security: '安全边界',
    performance: '性能收益',
    vue: '响应式与组件边界',
    react: '渲染与状态边界',
    network: '链路可靠性',
    ai: '效果与风险',
    testing: '回归信心',
    engineering: '工程可维护性',
    algorithm: '复杂度和正确性',
    general: '核心机制',
  };
  return map[domain] || map.general;
}

const GENERIC_FOCUS_TERMS = new Set([
  '类型',
  '方案',
  '问题',
  '能力',
  '场景',
  '系统',
  '流程',
  '机制',
  '模块',
  '功能',
  '项目',
  '团队',
  '业务',
  '工程',
  '实现',
  '方法',
  '策略',
  '结论',
  '目标',
  '约束',
  '输入',
  '输出',
]);

function extractFocusCandidates(value: string): string[] {
  const plain = markdownPlain(value).replace(/「|」/g, ' ');
  return plain.match(/[A-Za-z][A-Za-z0-9_+#./-]{1,}|[\u4e00-\u9fa5]{2,12}/g) || [];
}

function normalizeFocusTerm(value: string): string {
  const normalized = markdownPlain(value)
    .replace(/[「」"'`]/g, '')
    .replace(/[（(][^()（）]*[)）]/g, '')
    .replace(/[，。！？?：:；;、]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized || normalized.length < 2 || normalized.length > 14) return '';
  if (GENERIC_FOCUS_TERMS.has(normalized)) return '';
  if (/^(如何|怎么|哪些|什么|是否|如果|当|在|围绕|结合|从|以)$/.test(normalized)) return '';
  return normalized;
}

function pickFollowupFocusTerm(parent: Block, question: string): string {
  const candidates = [
    ...parent.tags,
    ...extractFocusCandidates(normalizeWhatIsTitle(parent.title)),
    ...extractFocusCandidates(question),
  ];
  for (const candidate of candidates) {
    const focus = normalizeFocusTerm(candidate);
    if (focus) return focus;
  }
  return domainNoun(classify(parent));
}

function normalizeWhatIsTitle(value: string): string {
  return value
    .trim()
    .replace(/[？?。!！]+$/g, '')
    .replace(/\s*是什么$/, '')
    .trim();
}

function normalizeQuestionPattern(value: string): string {
  return value
    .replace(/^如果面试官追问：\s*/, '')
    .trim()
    .replace(/[？?。]+$/, '')
    .replace(/「[^」]+」/g, '「X」');
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

function decorateFollowupQuestion(
  question: string,
  title: string,
  seed: string,
  slot: number,
): string {
  const base = question.replace(/[？?。]+$/, '').trim();
  const wrappers = [
    base,
    `在「${title}」场景下，${base}`,
    `结合真实业务约束，${base}`,
    `从工程落地角度看，${base}`,
    `以「${title}」为例，${base}`,
    `在当前团队与业务约束下，${base}`,
  ];
  const styled = pickBySeed(wrappers, `${seed}|style`, slot + 37)
    .replace(/[？?。]+$/, '')
    .trim();
  return `${styled}？`;
}

function diversifyFollowupQuestion(question: string, parent: Block, slot: number): string {
  const pattern = canonicalizeFollowupQuestionPattern(normalizeQuestionPattern(question));
  const title = normalizeWhatIsTitle(parent.title);
  const focusTerm = pickFollowupFocusTerm(parent, question);
  const seed = `${parent.slug}|${slot}|${pattern}`;
  const map: Record<string, string[]> = {
    '把「X」放到真实项目时，最容易忽略的边界条件和前置约束是什么': [
      `把「${title}」放到真实业务里，围绕 ${focusTerm} 最容易被低估的边界条件和前置约束是什么？`,
      `在真实业务里落地「${title}」时，你会先排查哪些与 ${focusTerm} 相关的边界假设？`,
      `如果要评估「${title}」的落地风险，你会优先检查哪些 ${focusTerm} 约束是否成立？`,
      `围绕「${title}」做方案评审时，哪些 ${focusTerm} 边界输入最容易导致结论失真？`,
      `当「${title}」进入复杂场景后，你会先验证哪些 ${focusTerm} 前置条件，避免方案踩坑？`,
      `你会如何识别「${title}」在生产环境中最容易失效的 ${focusTerm} 边界因素？`,
      `如果要让「${title}」稳定上线，你会优先补齐哪些与 ${focusTerm} 相关的检查项？`,
      `面对真实流量和复杂依赖时，「${title}」最可能被哪些 ${focusTerm} 边界条件击穿？`,
      `当「${title}」跨团队落地时，你会先确认哪些 ${focusTerm} 前置假设，避免后续返工？`,
      `在「${title}」进入长周期维护后，你会重点巡检哪些与 ${focusTerm} 相关的高风险边界点？`,
    ],
    '如果要证明「X」真的有效，你会设计哪些验证路径和观察指标': [
      `如果要证明「${title}」真的有效，你会怎么设计验证路径和观察指标？`,
      `为了确认「${title}」不是“看起来有效”，你会如何安排测试证据和观测指标？`,
      `你会怎样搭建「${title}」的验证闭环，让结论可复现、可量化、可复核？`,
      `上线后你会盯哪些和 ${focusTerm} 相关的指标，来判断「${title}」的收益是否持续成立？`,
      `如果要向团队证明「${title}」的价值，你会展示哪些日志和指标证据？`,
      `你会如何围绕 ${focusTerm} 定义「${title}」生效的判据，并用测试与监控长期验证？`,
    ],
    '你会用哪些测试、日志或指标证明这个方案有效': [
      `为了证明这个方案在 ${focusTerm} 维度有效，你会怎么设计测试闭环和线上观测指标？`,
      `你会用什么验证路径来证明方案收益，而不只是“看起来可行”？`,
      `上线后你会盯哪些与 ${focusTerm} 相关的日志与指标，来确认这套方案确实带来改进？`,
      `如果要让结论在 ${focusTerm} 上可复核，你会怎样安排测试、日志和指标的组合验证？`,
      `你会如何围绕 ${focusTerm} 搭建验证面板，持续确认这个方案的收益没有被噪声掩盖？`,
      `为了避免主观判断，你会怎样用测试证据和线上指标共同证明 ${focusTerm} 方案有效？`,
      `如果要向团队复盘 ${focusTerm} 相关优化，你会展示哪些关键日志和指标来支撑结论？`,
      `你会如何围绕 ${focusTerm} 定义“方案生效”的判据，并通过测试与观测数据持续验证？`,
    ],
    '如果需求规模、团队成本或兼容性要求变化，你会如何调整方案': [
      `当规模、成本或兼容性约束变化时，你会如何重排当前方案的优先级？`,
      `如果业务规模和团队资源发生变化，你会先改哪些环节来控制风险？`,
      `如果上线窗口突然提前到下个月，你会怎么收敛「${title}」范围，并把 ${focusTerm} 相关技术债回补计划讲清楚？`,
      `遇到约束变化时，你会如何围绕 ${focusTerm} 拆分方案演进路径，而不是一次性推翻重来？`,
      `当兼容性要求提升或预算收紧时，你会如何围绕 ${focusTerm} 调整方案边界与实施节奏？`,
      `当团队产能和业务复杂度发生变化时，你会如何围绕 ${focusTerm} 调整方案的推进节奏与范围？`,
      `如果外部约束变化导致当前方案成本上升，你会围绕 ${focusTerm} 优先保留或替换哪些部分？`,
      `面对规模扩张与预算收紧并存的情况，你会如何重新定义方案的目标边界？`,
      `当兼容性压力提升时，你会如何围绕 ${focusTerm} 拆阶段演进方案，兼顾稳定性与交付效率？`,
    ],
    '当需求规模、团队资源或兼容性要求变化时，你会如何重排方案优先级': [
      `当需求规模、团队资源或兼容性要求变化时，你会如何围绕 ${focusTerm} 重排「${title}」方案优先级？`,
      `面对规模与资源变化并存时，你会如何围绕 ${focusTerm} 调整「${title}」的推进顺序？`,
      `如果兼容性压力突然升高，你会如何围绕 ${focusTerm} 重新划分「${title}」的实施阶段？`,
      `当约束变化导致成本上升时，你会先优化「${title}」里和 ${focusTerm} 相关的哪些环节？`,
      `当需求复杂度增长但团队产能有限时，你会如何围绕 ${focusTerm} 拆分「${title}」的落地路径？`,
      `如果目标不变但约束更严，你会如何围绕 ${focusTerm} 调整「${title}」方案的边界和节奏？`,
    ],
    '推动「X」落地时，你会如何设计灰度、回滚和迁移路径': [
      `真要把「${title}」推到线上，你会如何围绕 ${focusTerm} 设计灰度节奏、回滚条件和迁移路径？`,
      `如果要分阶段上线「${title}」，你会如何围绕 ${focusTerm} 安排灰度节奏和回滚触发条件？`,
      `围绕「${title}」做迁移时，你会怎样按 ${focusTerm} 拆分批次，降低回滚风险？`,
      `在「${title}」落地过程中，你会如何围绕 ${focusTerm} 设计发布开关和故障回退策略？`,
      `面对高风险改动，你会怎样围绕 ${focusTerm} 规划「${title}」的灰度验证与迁移窗口？`,
      `如果「${title}」涉及历史数据兼容，你会如何围绕 ${focusTerm} 安排迁移与回退链路？`,
    ],
    '如果团队成员能力和历史包袱不一致，你会如何拆阶段推进': [
      `团队里有人熟有人新时，你会怎么围绕 ${focusTerm} 把「${title}」拆成几段推进，确保每段都能独立验收？`,
      `面对团队能力差异，你会如何围绕 ${focusTerm} 把「${title}」拆成可并行推进的小阶段？`,
      `老系统包袱重、牵一发而动全身时，你会怎么围绕 ${focusTerm} 安排「${title}」的渐进改造路线？`,
      `当团队成熟度不一致时，你会如何围绕 ${focusTerm} 定义「${title}」的先后改造顺序？`,
      `你会怎样围绕 ${focusTerm} 拆分「${title}」的推进节奏，兼顾短期交付和长期治理？`,
      `如果部分模块技术债很重，你会如何围绕 ${focusTerm} 调整「${title}」的分阶段策略？`,
    ],
    你会用哪些指标判断这个工程方案长期值得维护: [
      `要判断「${title}」值不值得长期维护，你会先盯哪些和 ${focusTerm} 相关的核心指标？`,
      `这套「${title}」要不要继续投人投钱，你会盯哪几组和 ${focusTerm} 相关的数据先说话？`,
      `如果团队要评估「${title}」的长期维护价值，你会优先看哪些指标再下结论？`,
      `半年后要做去留决策时，你会拿哪些数据判断「${title}」还值不值得继续维护？`,
      `复盘「${title}」时，你会拿哪些数据判断这套方案该继续投入还是该止损？`,
      `你会如何用可观测数据衡量「${title}」在 ${focusTerm} 上的维护成本和收益平衡？`,
      `为了确认「${title}」在 ${focusTerm} 上能持续跑稳，你会长期追哪些稳定性和效率信号？`,
      `当团队讨论「${title}」去留时，你会给出哪几组关键指标作为决策依据？`,
    ],
    '你会先看哪些指标来判断「X」是不是当前性能瓶颈': [
      `你会先看哪些指标来判断「${title}」是不是当前性能瓶颈？`,
      `如果要确认「${title}」在 ${focusTerm} 上是主要瓶颈，你会优先检查哪几类性能指标？`,
      `你会如何用数据判断「${title}」在 ${focusTerm} 维度上值得先优化，而不是先改别的模块？`,
      `围绕「${title}」做性能排查时，你会优先看哪些与 ${focusTerm} 相关的核心指标与分位数据？`,
      `为了定位「${title}」在 ${focusTerm} 上的瓶颈优先级，你会先拉哪些观测指标作为依据？`,
      `你会怎样区分「${title}」在 ${focusTerm} 上是局部抖动还是系统级性能瓶颈？`,
      `当你怀疑「${title}」拖慢主链路时，你会先用哪组指标完成“定位 -> 归因 -> 验证”？`,
      `在定位「${title}」性能责任时，你会先看吞吐、时延分位和错误率中的哪些信号？`,
      `如果多处模块都可疑，你会怎样用指标隔离「${title}」对性能问题的真实贡献？`,
      `你会如何把用户侧体验指标和系统侧资源指标结合，判断「${title}」是否该优先优化？`,
    ],
    '优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数': [
      `优化上线后，你会怎么用 ${focusTerm} 相关的真实用户信号，证明「${title}」确实让体验变好了，而不只是实验室分数提升？`,
      `你会怎样验证「${title}」在 ${focusTerm} 维度上的优化收益在真实设备和真实网络下也成立？`,
      `如果实验室分数变好但线上反馈一般，你会如何围绕 ${focusTerm} 重新评估「${title}」优化效果？`,
      `围绕「${title}」上线效果，你会优先看哪些和 ${focusTerm} 相关的真实用户指标来佐证体验提升？`,
      `你会如何结合 ${focusTerm} 指标，避免把「${title}」的实验室提升误判为真实用户体验改善？`,
      `要证明「${title}」确实改善体验，你会如何围绕 ${focusTerm} 设计线上观测与对照验证？`,
    ],
    '「X」在弱网、代理、断连或服务端限流时会出现哪些边界问题': [
      `在弱网、代理、断连或服务端限流场景下，你会围绕 ${focusTerm} 重点排查「${title}」的哪些边界问题？`,
      `当「${title}」遇到弱网或限流时，你会先从 ${focusTerm} 的哪几个环节判断风险级别？`,
      `针对「${title}」，如果出现断连、代理抖动或服务端限流，你会如何按 ${focusTerm} 设计排障顺序？`,
      `你会如何在「${title}」场景里按 ${focusTerm} 拆分弱网与限流问题，避免一次性扩大影响面？`,
      `如果「${title}」在复杂网络环境下波动明显，你会怎样围绕 ${focusTerm} 设计降级与恢复路径？`,
    ],
    '如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做': [
      `如果优化带来复杂度或兼容性成本，你会怎么评估「${title}」是否值得做？`,
      `如果「${title}」在 ${focusTerm} 上的收益和维护成本打架，你会怎么做取舍判断？`,
      `你会如何给「${title}」算一笔账：短期收益能不能覆盖后续在 ${focusTerm} 上的维护成本？`,
      `你会怎样评估「${title}」在性能收益与兼容性风险之间的平衡点？`,
      `如果「${title}」在 ${focusTerm} 相关优化中让代码复杂度上升，你会如何判断继续推进还是止损？`,
      `围绕「${title}」在 ${focusTerm} 上的优化决策，你会如何量化收益、风险和长期维护成本？`,
      `当「${title}」在 ${focusTerm} 优化上可能影响兼容性时，你会如何设定推进与回退门槛？`,
    ],
    '如果要在线上证明这个方案稳定，你会看哪些日志和指标': [
      `如果要在线上证明「${title}」稳定，你会优先看哪些和 ${focusTerm} 相关的日志与指标？`,
      `围绕「${title}」上线后的稳定性，你会先盯哪几组信号判断风险在收敛还是在扩散？`,
      `当你要验证「${title}」没有把问题带到线上时，会重点关注哪些告警、日志和趋势指标？`,
      `你会如何把「${title}」的技术指标和业务侧异常信号串起来，快速判断方案是否稳定？`,
      `如果线上反馈和监控信号冲突，你会先用哪些指标复核「${title}」的稳定性结论？`,
      `为了复盘「${title}」上线质量，你会如何组织日志、指标和告警证据链？`,
    ],
    '「X」有哪些容易漏掉的边界输入和复杂度陷阱': [
      `围绕「${title}」，你认为最容易漏掉的边界输入和复杂度陷阱有哪些？`,
      `如果要复盘「${title}」的实现风险，你会先检查哪些边界输入和复杂度问题？`,
      `在「${title}」这题里，哪些输入规模和边界条件最容易让复杂度失控？`,
      `你会如何围绕 ${focusTerm} 提前识别「${title}」中的复杂度陷阱，避免实现后期返工？`,
      `当「${title}」进入大规模数据场景，哪些边界输入最可能触发复杂度问题？`,
      `如果要评估「${title}」的稳定性，你会优先排查哪些复杂度相关边界？`,
    ],
    '你会怎么证明实现正确，而不是只靠几个样例跑通': [
      `你会如何证明「${title}」实现正确，而不是只靠几个样例跑通？`,
      `如果要让「${title}」的正确性可复核，你会围绕 ${focusTerm} 设计哪些验证步骤？`,
      `围绕「${title}」你会怎样构建证明路径，避免“样例通过即正确”的误判？`,
      `要证明「${title}」实现可靠，你会如何组织边界用例与反例验证？`,
      `你会如何把「${title}」的正确性验证从样例测试提升到系统化证明？`,
      `如果要向团队说明「${title}」实现可信，你会展示哪些围绕 ${focusTerm} 的正确性证据？`,
    ],
    '如果把「X」放到真实业务里，你会怎么划分信任边界和服务端兜底': [
      `如果把「${title}」放到真实业务里，你会如何划分信任边界和服务端兜底？`,
      `围绕「${title}」落地时，你会怎样定义前端可信范围与服务端强校验边界？`,
      `真把「${title}」放到生产环境后，你会如何围绕 ${focusTerm} 划清信任边界并安排服务端兜底？`,
      `你会怎样把「${title}」的前端防护与服务端兜底串成完整安全闭环？`,
      `如果要评审「${title}」在 ${focusTerm} 维度的安全方案，你会如何划分客户端与服务端责任边界？`,
      `在「${title}」场景里，哪些能力必须由服务端兜底，哪些可交给前端处理？`,
    ],
    '你会如何证明这个安全方案没有被绕过，并监控异常攻击流量': [
      `你会如何证明「${title}」的安全方案没有被绕过，并持续监控异常攻击流量？`,
      `围绕「${title}」你会怎样设计绕过验证与异常流量监控，确认防护真正生效？`,
      `如果要审计「${title}」在 ${focusTerm} 维度的安全性，你会用哪些证据证明方案不可轻易绕过？`,
      `你会如何搭建「${title}」的攻击监控面板，及时识别绕过尝试与异常行为？`,
      `要证明「${title}」防护可信，你会如何结合攻击样例、审计日志和告警阈值？`,
      `你会怎样验证「${title}」在真实攻击流量下仍能维持防护效果与可观测性？`,
    ],
    '当安全性、用户体验和研发成本冲突时，你会如何取舍': [
      `当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 ${focusTerm} 给「${title}」排优先级？`,
      `面对安全与体验拉扯时，你会怎样为「${title}」设定可接受的成本边界？`,
      `如果「${title}」安全策略影响用户路径，你会如何平衡风险控制与体验损耗？`,
      `围绕「${title}」决策时，你会如何量化安全收益、体验代价与研发投入？`,
      `当「${title}」需要在安全与交付速度之间权衡时，你会优先守住哪些底线？`,
      `你会怎样给「${title}」定义分层策略，让高风险场景更严格、低风险场景更顺滑？`,
    ],
    '如果这个方案导致状态耦合或调试困难，你会怎么拆分和验证': [
      `如果「${title}」逐渐出现状态耦合或排障困难，你会怎么拆分并验证改造效果？`,
      `当「${title}」出现状态纠缠时，你会如何拆解边界并降低调试复杂度？`,
      `围绕「${title}」你会怎样重构状态分层，避免调试路径持续膨胀？`,
      `如果「${title}」让调试成本升高，你会如何拆分模块并验证可维护性提升？`,
      `你会怎样给「${title}」建立状态隔离策略，减少跨模块耦合导致的连锁问题？`,
      `当「${title}」难以定位问题时，你会如何设计验证步骤来确认拆分是否有效？`,
    ],
    '它和常见替代方案相比，适合什么团队规模和业务复杂度': [
      `和常见替代方案相比，「${title}」在 ${focusTerm} 这个维度更适合什么团队规模与业务复杂度？`,
      `别只看 benchmark，你会怎么比较「${title}」和替代方案在 ${focusTerm} 上的学习成本、交付速度与维护负担？`,
      `如果比较「${title}」与替代方案，你会如何基于 ${focusTerm} 判断不同团队阶段的最佳选择？`,
      `如果老板追问“现在到底选哪个”，你会怎样用团队现状和业务复杂度解释「${title}」与替代方案的取舍？`,
      `围绕「${title}」选型时，你会怎样按 ${focusTerm} 与业务复杂度给出分层推荐？`,
      `你会如何说明「${title}」在不同团队规模下，${focusTerm} 相关收益与维护差异？`,
      `当业务复杂度上升时，你会如何判断「${title}」在 ${focusTerm} 上是否仍优于替代方案？`,
      `如果团队能力结构变化，你会怎样围绕 ${focusTerm} 调整「${title}」与替代方案的选型结论？`,
    ],
    '「X」上线前你会如何做效果评估、成本预算和安全防护': [
      `「${title}」上线前你会如何做效果评估、成本预算和安全防护？`,
      `如果要上线「${title}」，你会怎样同步规划效果评估、成本控制与安全策略？`,
      `围绕「${title}」发布前准备，你会如何安排评估集、预算上限和风险防护？`,
      `你会如何建立「${title}」上线前的三重检查：效果、成本、安全？`,
      `在「${title}」投产前，你会如何围绕 ${focusTerm} 验证收益预期并防止成本与安全失控？`,
      `要让「${title}」上线更稳，你会如何设计效果验证、预算预警和安全兜底机制？`,
    ],
    '在 Vue 项目里落地「X」时，响应式边界和组件更新时机要注意什么': [
      `在 Vue 项目里落地「${title}」时，响应式边界和组件更新时机要注意什么？`,
      `真在项目里落地「${title}」时，你会如何划分 ${focusTerm} 并控制更新时机？`,
      `如果「${title}」引入复杂状态联动，你会如何避免响应式边界混乱和多余重渲染？`,
      `你会怎样在「${title}」里围绕 ${focusTerm} 处理组件更新顺序，避免出现时序错位和状态抖动？`,
      `当「${title}」牵涉跨组件状态时，你会如何围绕 ${focusTerm} 设计响应式边界，保证后续好维护？`,
      `在「${title}」场景下，你会如何验证 Vue 组件更新时机与预期一致？`,
    ],
    '模型输出不稳定或出现幻觉时，产品和工程上分别怎么兜底': [
      `模型输出不稳定或出现幻觉时，产品和工程上你会如何为「${title}」分别兜底？`,
      `围绕「${title}」上线后幻觉风险，你会怎样设计产品侧与工程侧双重兜底？`,
      `如果「${title}」遇到模型不稳定，你会如何拆分交互兜底和技术兜底路径？`,
      `你会怎样给「${title}」建立“输出异常 -> 降级策略 -> 人工介入”闭环？`,
      `当「${title}」出现高幻觉率时，你会如何同步调整产品策略和工程防护措施？`,
      `如果要降低「${title}」的错误输出风险，你会怎样组合规则校验、重试与人工审核？`,
    ],
    '如果延迟、成本和准确率不能同时满足，你会如何做路由或降级': [
      `如果延迟、成本和准确率不能同时满足，你会如何为「${title}」设计路由或降级？`,
      `围绕「${title}」权衡延迟、成本、准确率时，你会怎样定义模型路由策略？`,
      `当「${title}」三项指标冲突时，你会如何分层降级，保证核心体验可用？`,
      `你会怎样给「${title}」设置路由规则，让不同请求走不同模型与兜底路径？`,
      `如果「${title}」预算受限但准确率要求较高，你会如何安排动态路由与降级阈值？`,
      `在「${title}」场景里，你会如何围绕 ${focusTerm} 定义“优先保准确”与“优先保时延”的切换条件？`,
    ],
    '针对「X」，你会优先补哪些边界用例和回归用例': [
      `针对「${title}」，你会优先补哪些边界用例和回归用例？`,
      `如果要提升「${title}」在 ${focusTerm} 方面的回归信心，你会先补哪几类边界与回归用例？`,
      `围绕「${title}」测试策略，你会如何排序边界用例与回归用例优先级？`,
      `当「${title}」需求频繁变更时，你会优先完善哪些回归和边界测试？`,
      `你会怎样为「${title}」建立高价值用例集，覆盖关键边界和高风险回归场景？`,
      `如果测试资源有限，你会如何选择「${title}」最值得先补的边界与回归用例？`,
      `结合「${title}」线上故障画像，你会先补哪些定向回归与边界验证，避免同类问题反复出现？`,
      `想让「${title}」这组测试真有价值，你会如何平衡新边界用例和历史回归用例投入？`,
    ],
    '如果数据规模扩大一个数量级，你会如何调整数据结构或算法': [
      `如果数据规模扩大一个数量级，你会如何围绕 ${focusTerm} 调整「${title}」的数据结构或算法？`,
      `当「${title}」输入规模猛增时，你会先改哪一层结构，避免 ${focusTerm} 成本失控？`,
      `面对「${title}」的规模放大，你会如何在 ${focusTerm} 上重排算法与数据结构优先级？`,
      `如果「${title}」从万级变到百万级，你会先用哪些策略稳住 ${focusTerm} 指标？`,
      `围绕「${title}」扩容时，你会如何在正确性不退化的前提下优化 ${focusTerm} 开销？`,
      `当规模上来后「${title}」开始抖动，你会如何快速定位并调整最关键的 ${focusTerm} 瓶颈？`,
    ],
    '如何避免测试过度耦合实现细节，导致重构时大量误报': [
      `测试怎么写才能不绑死实现细节，避免「${title}」一重构就误报一片？`,
      `当你准备重构「${title}」时，怎么判断现有测试是在保护行为还是绑死实现？`,
      `围绕「${title}」补测试时，你会怎么让用例盯用户可见行为，而不是盯内部调用细节？`,
      `如果 CI 在「${title}」改造期频繁误报，你会怎么拆测试层次来降噪？`,
      `你会用什么约束避免「${title}」测试和实现代码一起“共振”，导致后续维护脆弱？`,
      `为了让回归更稳，你会如何重写「${title}」里依赖实现细节的测试？`,
    ],
  };
  const options = map[pattern];
  const chosen = options?.length ? pickBySeed(options, seed, slot + 17) : question;
  return decorateFollowupQuestion(chosen, title, seed, slot);
}

function intentLines(intent: string, domain: string, parent: Block): string[] {
  const title = normalizeWhatIsTitle(parent.title).replace(/[？?。]+$/, '');
  const subject = domainNoun(domain);
  const subjectBenefit = subject.endsWith('收益') ? subject : `${subject}收益`;
  const common = relevantParentLines(parent).slice(0, 2);
  const maps: Record<string, string[]> = {
    boundary: [
      `先界定「${title}」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。`,
      `围绕「${title}」的${subject}展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。`,
      ...common.map(
        (line) => `原题中的关键点「${line}」要进一步补到边界条件里，而不是只复述结论。`,
      ),
    ],
    verify: [
      `验证要从可复现样例开始：准备正向、边界和失败用例，确认「${title}」不是只在理想输入下成立。`,
      `再补可观测指标：围绕「${title}」的${subject}应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。`,
      `如果「${title}」相关指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。`,
    ],
    reliability: [
      `先把「${title}」链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。`,
      `弱网、重试和超时会放大「${title}」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。`,
      `「${title}」的降级策略要明确用户还能做什么：读缓存、稍后重试、排队同步，或者切到更保守的实现。`,
    ],
    rollout: [
      `推动「${title}」落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。`,
      `「${title}」迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。`,
      `团队推进重点不是一次性重写，而是把「${title}」拆成可验证的小步骤，逐步替换高风险部分。`,
    ],
    scale: [
      `规模变大后先重新评估「${title}」瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。`,
      `如果「${title}」对应的${subjectBenefit}被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。`,
      `「${title}」答案里要给出取舍边界：小团队/低流量怎么做，复杂业务/多端协作时又需要补哪些治理。`,
    ],
    security: [
      `先画清「${title}」信任边界：哪些输入来自用户、第三方或模型，哪些校验必须在服务端完成。`,
      `证明「${title}」没有被绕过要靠攻击样例、审计日志、告警阈值和最小权限，而不是只说前端做了过滤。`,
      `一旦发现「${title}」相关异常，要能降级到只读、禁用高危能力、刷新凭证或触发人工审核。`,
    ],
    'ai-tradeoff': [
      `在「${title}」这类 AI 场景里，要把效果、延迟、成本和安全分开评估，不能只看单次回答是否看起来正确。`,
      `当「${title}」指标冲突时，可以做模型路由、缓存、截断上下文、异步生成或人工兜底，而不是盲目换更大的模型。`,
      `「${title}」上线前需要固定评估集和失败样例，持续观察命中率、拒答率、幻觉率、token 成本和用户采纳率。`,
    ],
  };
  return maps[intent] || maps.boundary;
}

function rewriteTemplateFollowup(raw: string, parent: Block, index: number): string {
  const questions = followupQuestionsFor(parent);
  const question = questions[index] || questions[0];
  const domain = classify(parent);
  const intent = inferFollowupIntent(question, index, domain);
  const parentTitle = normalizeWhatIsTitle(parent.title);
  const seed = `${parent.slug}|${index}|${question}`;
  const graspLine1 = [
    `复习这道追问时，先用一句话讲清「${parentTitle}」的核心机制，再补一个会失败的具体场景。`,
    `先把「${parentTitle}」压缩成 30 秒可讲清的结论，再补一个最容易被忽略的边界输入。`,
    `复盘时先确认「${parentTitle}」的关键假设，再举一个违背假设后的失败案例。`,
    `回答前先列出「${parentTitle}」的主链路与兜底链路，确保追问时能快速切换视角。`,
    `先用一句话给出「${parentTitle}」的判断标准，再补一个会导致方案失效的真实约束。`,
    `准备这道追问时，先画出「${parentTitle}」从输入到输出的关键路径，再补异常路径。`,
    `先解释「${parentTitle}」在你项目里的目标，再说明最容易踩坑的边界条件。`,
    `开口先讲「${parentTitle}」的核心取舍，再补一个反例说明为什么不能照搬默认做法。`,
  ];
  const graspLine2 = [
    `围绕「${parentTitle}」挑一个可执行验证动作：补边界用例、走一次调试链路、盯一组指标，或复盘线上排障流程。`,
    `准备一个与「${parentTitle}」直接相关的验证动作，例如补回归用例、观察关键告警、或演示一次问题复现与定位。`,
    `回答「${parentTitle}」时至少带一个可执行验证动作：能复现、能观测、能回滚，避免停在口头结论。`,
    `建议准备「${parentTitle}」的“验证动作清单”：用例、日志、指标、回滚步骤各选一项。`,
    `验证「${parentTitle}」时动作尽量具体：选一条链路做复现、选一组指标做对比、再给一条回滚路径。`,
    `回答时最好给出你在「${parentTitle}」里做过的验证动作，证明结论不是“理论上可行”。`,
    `准备一个「${parentTitle}」的“可复核动作”：别人照着你的步骤也能复现、观测并验证结果。`,
    `把「${parentTitle}」验证拆成“离线检查 + 线上观测”两段，面试时更容易体现工程成熟度。`,
  ];
  const graspLine3 = [
    `收尾时对比「${parentTitle}」的候选方案，说明当前约束下为什么选这个路径，以及何时应切换方案。`,
    `结束前补一句「${parentTitle}」取舍结论：这个方案适合哪些约束，不适合哪些场景。`,
    `最后给出「${parentTitle}」替代方案比较，解释为什么这次不选它们，体现工程判断而不是工具偏好。`,
    `回答「${parentTitle}」结尾建议补“切换条件”：当规模、成本或风险变化到什么阈值时应换方案。`,
    `结尾把「${parentTitle}」的“继续沿用”与“触发切换”条件说清楚，比只报结论更有说服力。`,
    `最后补一个「${parentTitle}」反向判断：在什么情况下你会放弃当前路径，改走替代方案。`,
    `收尾时把「${parentTitle}」的短期收益和长期维护成本并列说明，体现方案选择的完整视角。`,
    `把「${parentTitle}」方案切换门槛讲明白：达到哪些阈值就要调整策略，避免答案过于绝对。`,
  ];
  const answer = `#### 核心回答
${intentLines(intent, domain, parent)
  .slice(0, 3)
  .map((line) => `- ${line}`)
  .join('\n')}

#### 学习抓手
- ${pickBySeed(graspLine1, seed, 1)}
- ${pickBySeed(graspLine2, seed, 2)}
- ${pickBySeed(graspLine3, seed, 3)}`;
  let next = raw;
  next = next.replace(/^title\s*:.*$/m, `title: 追问：${question.replace(/[？?]$/, '')}`);
  next = replaceSection(next, '题目', `如果面试官追问：${question}`);
  next = replaceSection(next, '答案要点', answer);
  return next;
}

function isTemplateFollowup(block: Block): boolean {
  const answer = block.sections['答案要点'] || '';
  const question = block.sections['题目'] || '';
  const hay = `${block.title}\n${question}\n${answer}`;
  const hasBrokenWhatIsPattern = /「[^」]{4,80} 是什么」/.test(hay);
  const questionPattern = canonicalizeFollowupQuestionPattern(normalizeQuestionPattern(question));
  const genericTitles = new Set([
    '追问：你会用哪些测试、日志或指标证明这个方案有效',
    '追问：如果需求规模、团队成本或兼容性要求变化，你会如何调整方案',
  ]);
  const genericQuestionPatterns = new Set([
    '「X」在真实项目里最容易踩到哪些边界条件',
    '把「X」放到真实项目时，最容易忽略的边界条件和前置约束是什么',
    '如果要证明「X」真的有效，你会设计哪些验证路径和观察指标',
    '当需求规模、团队资源或兼容性要求变化时，你会如何重排方案优先级',
    '你会用哪些测试、日志或指标证明这个方案有效',
    '如果需求规模、团队成本或兼容性要求变化，你会如何调整方案',
    '把「X」放到真实业务里，哪些前置约束和边界输入最容易被忽略',
    '在生产环境落地「X」时，最常见的边界坑会出现在哪些环节',
    '如果要把「X」真正上线，你会优先排查哪些高风险边界条件',
    '围绕「X」做方案评审时，你会先检查哪些边界假设是否成立',
    '为了证明这个方案有效，你会怎么设计测试闭环和线上观测指标',
    '你会用什么验证路径来证明方案收益，而不只是“看起来可行”',
    '上线后你会盯哪些日志与指标，来确认这套方案确实带来改进',
    '如果要让结论可复核，你会怎样安排测试、日志和指标的组合验证',
    '当规模、成本或兼容性约束变化时，你会如何重排当前方案的优先级',
    '如果业务规模和团队资源发生变化，你会先改哪些环节来控制风险',
    '遇到约束变化时，你会如何拆分方案演进路径，而不是一次性推翻重来',
    '当兼容性要求提升或预算收紧时，你会如何调整方案边界与实施节奏',
    '你会先看哪些指标来判断「X」是不是当前性能瓶颈',
    '优化上线后如何证明用户真实体验变好了，而不是只提升了实验室分数',
    '如果优化带来复杂度或兼容性成本，你会怎么评估是否值得做',
    '推动「X」落地时，你会如何设计灰度、回滚和迁移路径',
    '如果团队成员能力和历史包袱不一致，你会如何拆阶段推进',
    '你会用哪些指标判断这个工程方案长期值得维护',
    '「X」有哪些容易漏掉的边界输入和复杂度陷阱',
    '你会怎么证明实现正确，而不是只靠几个样例跑通',
    '如果把「X」放到真实业务里，你会怎么划分信任边界和服务端兜底',
    '你会如何证明这个安全方案没有被绕过，并监控异常攻击流量',
    '当安全性、用户体验和研发成本冲突时，你会如何取舍',
    '如果这个方案导致状态耦合或调试困难，你会怎么拆分和验证',
    '它和常见替代方案相比，适合什么团队规模和业务复杂度',
    '「X」上线前你会如何做效果评估、成本预算和安全防护',
    '在 Vue 项目里落地「X」时，响应式边界和组件更新时机要注意什么',
    '模型输出不稳定或出现幻觉时，产品和工程上分别怎么兜底',
    '如果延迟、成本和准确率不能同时满足，你会如何做路由或降级',
    '针对「X」，你会优先补哪些边界用例和回归用例',
  ]);
  const phrases = [
    '先把追问落回原题',
    '结合原题答案中的关键点',
    '回答时最好给一个真实项目语境',
    '如果这些条件不满足，应说明替代方案',
    '验证上至少包含边界输入',
    '发布上建议用灰度',
    '取舍上不要说“最佳实践”',
    '这个问题要从「为什么需要它」',
    'AI 场景要把效果、延迟、成本和安全分开评估',
    '模型路由、缓存、截断上下文',
    '递归/双指针/哈希表等套路',
    '如果指标没有改善，要能回到原题机制定位原因',
    '落地时先收敛改动面：选低风险页面或模块试点',
    '迁移计划要说明数据兼容、配置开关、监控指标',
    '先画清信任边界：哪些输入来自用户、第三方或模型',
    '证明没有被绕过要靠攻击样例、审计日志、告警阈值和最小权限',
    '一旦发现异常，要能降级到只读、禁用高危能力、刷新凭证或触发人工审核',
  ];
  const criticalTemplatePhrases = [
    '如果指标没有改善，要能回到原题机制定位原因',
    '如果没有补充输入边界、失败路径和替代方案',
    '如果不说明监控指标、发布策略和回滚方式',
    '挑一个可执行验证动作：补边界用例、走一次调试链路、盯一组指标，或复盘线上排障流程',
    '准备一个可落地验证动作，例如补回归用例、观察关键告警、或演示一次问题复现与定位',
    '至少带一个可执行验证动作进入面试：能复现、能观测、能回滚',
    '建议准备“验证动作清单”：用例、日志、指标、回滚步骤各选一项',
    '验证动作尽量具体：选一条链路做复现、选一组指标做对比、再给一条回滚路径',
    '回答时最好给出一个你做过的验证动作，证明结论不是“理论上可行”',
    '准备一个“可复核动作”：别人照着你的步骤也能复现、观测并验证结果',
    '把验证拆成“离线检查 + 线上观测”两段，面试时会更容易体现工程成熟度',
    '结束前补一句取舍结论：这个方案适合哪些约束，不适合哪些场景',
    '最后给出替代方案比较，解释为什么这次不选它们，体现工程判断而不是工具偏好',
    '结尾把“继续沿用”和“触发切换”的条件说清楚，比只报结论更有说服力',
    '最后补一个反向判断：在什么情况下你会放弃当前路径，改走替代方案',
    '收尾时把短期收益和长期维护成本并列说明，体现方案选择的完整视角',
    '把方案切换门槛讲明白：达到哪些阈值就要调整策略，避免答案过于绝对',
    '规模变大后先重新评估瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶',
    '答案里要给出取舍边界：小团队/低流量怎么做，复杂业务/多端协作时又需要补哪些治理',
    '先把链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败',
    '降级策略要明确用户还能做什么：读缓存、稍后重试、排队同步，或者切到更保守的实现',
    '围绕渲染与状态边界展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响',
    '围绕复杂度和正确性展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响',
    '如果答案涉及兼容性、性能或安全，要主动说明默认方案、例外场景和回滚策略',
    '只讲实现步骤，不说明边界输入、稳定性、性能成本和替代方案',
    '如果答案涉及性能或可读性，要主动说明默认方案、例外输入和替代实现',
    '回答时要从定义、机制、边界、落地和验证五个层面展开',
    '把所有状态都塞进同一个 store 或 composable，忽略作用域、释放时机和可测试性',
    '测试过度依赖实现细节，重构后大量误报，反而降低团队维护意愿',
  ];
  const hasCriticalTemplatePhrase = criticalTemplatePhrases.some((phrase) => hay.includes(phrase));
  const hits = phrases.filter((phrase) => hay.includes(phrase)).length;
  return (
    hasBrokenWhatIsPattern ||
    hasCriticalTemplatePhrase ||
    genericTitles.has(block.title.trim()) ||
    genericQuestionPatterns.has(questionPattern) ||
    hits >= 2 ||
    (/^####\s+回答思路\s*$/m.test(answer) &&
      /^####\s+结合原题展开\s*$/m.test(answer) &&
      /^####\s+验证与取舍\s*$/m.test(answer))
  );
}

const BROKEN_PARENT_LINE_PATTERNS = [
  /如\s*）/,
  /默认值（）/,
  /Pick>/,
  /在 \/ 上加 integrity/,
  /→\s*，/,
  /落地时建议给出验证路径/,
  /只给方案图，不说明约束/,
  /忽略团队协作和历史包袱/,
  /回答时要从定义、机制、边界、落地和验证五个层面展开/,
  /把所有状态都塞进同一个 store 或 composable/,
  /测试过度依赖实现细节，重构后大量误报/,
  /只会背 API 名字/,
  /只背 API 名称/,
  /把客户端状态、服务端缓存和 URL 状态揉在一起/,
  /混淆客户端状态、服务端缓存和 URL 状态/,
  /只覆盖 happy path/,
  /围绕.+展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响/,
  /如果答案涉及兼容性、性能或安全，要主动说明默认方案/,
  /如果答案涉及性能或可读性，要主动说明默认方案/,
];

function relevantParentLines(parent: Block): string[] {
  const parentTitle = normalizeWhatIsTitle(parent.title);
  const lines = [parent.sections['答案要点'], parent.sections['常见误区'], parent.sections['延伸']]
    .filter(Boolean)
    .join('\n')
    .split(/\r?\n/)
    .map((line) => markdownPlain(line))
    .filter((line) => line.length >= 16)
    .filter((line) => !BROKEN_PARENT_LINE_PATTERNS.some((pattern) => pattern.test(line)))
    .slice(0, 3);
  return lines.length ? lines : [`先说明「${parentTitle}」的核心机制，再补充适用条件和失效边界。`];
}

for (const file of files) {
  const filePath = join(CONTENT_DIR, file);
  const raw = readFileSync(filePath, 'utf8');
  const { before, blocks } = splitBlocks(raw);
  const bySlug = new Map(blocks.map((block) => [block.slug, block]));
  const parentFollowupIndex = new Map<string, number>();

  const rewritten = blocks.map((block) => {
    let next = block.raw;
    if (!block.isFollowup) {
      if (
        !block.sections['常见误区']?.trim() ||
        block.sections['常见误区']?.includes('容易把「') ||
        block.sections['常见误区']?.includes('只给定义不讲边界') ||
        block.sections['常见误区']?.includes('模型输出') ||
        (block.sections['常见误区']?.includes('递归/双指针/哈希表等套路') &&
          classify(block) !== 'algorithm')
      ) {
        next = replaceSection(next, '常见误区', pitfallFor(block));
        stat.pitfallsAdded++;
      }
      next = refreshGeneratedAnswer(next, { ...block, raw: next, sections: parseSections(next) });
      if (sectionLength(block.sections['答案要点']) < 120) {
        next = appendToAnswer(next, expansionFor(block));
        stat.answersExpanded++;
      }
      if (
        block.sections['追问']?.includes('边界、验证手段和取舍') ||
        block.sections['追问']?.includes('用到真实项目里') ||
        block.sections['追问']?.includes('模型输出') ||
        block.sections['追问']?.includes('延迟、成本和准确率')
      ) {
        next = replaceSection(
          next,
          '追问',
          followupQuestionsFor(block)
            .map((question) => `- ${question}`)
            .join('\n'),
        );
        stat.parentFollowupSectionsRewritten++;
      }
      return next;
    }

    const parentSlug = (block.parent || '').replace(/^.*\//, '');
    const parent = bySlug.get(parentSlug);
    if (!parent) return next;
    const idx = parentFollowupIndex.get(parentSlug) || 0;
    parentFollowupIndex.set(parentSlug, idx + 1);
    if (isTemplateFollowup(block)) {
      stat.followupsRewritten++;
      return rewriteTemplateFollowup(next, parent, idx);
    }
    return next;
  });

  const output = `${before}${rewritten.join('\n')}`;
  if (output !== raw && !dryRun) writeFileSync(filePath, output);
}

console.log(
  `已补常见误区 ${stat.pitfallsAdded} 处，扩写短答案 ${stat.answersExpanded} 处，重写父题追问段 ${stat.parentFollowupSectionsRewritten} 处，重写模板追问题 ${stat.followupsRewritten} 道。`,
);
if (dryRun) console.log('dry-run 模式，未写入文件。传入 --write 才会落盘。');
