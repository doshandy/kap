import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCommonScriptArgs, resolveOnlyContentFiles } from './shared/args';
import { canonicalizeFollowupQuestionPattern } from './shared/followupCanonical';
import { replaceOrInsertMetaLine } from './shared/metaLine';
import {
  FOLLOWUP_ACTION_KEYWORDS,
  FOLLOWUP_RISK_KEYWORDS,
  FOLLOWUP_VERIFY_KEYWORDS,
  containsAnyKeyword,
} from './shared/answerQuality';

const parserModule = (await import(
  new URL('../src/lib/contentBlockParser.ts', import.meta.url).href
)) as {
  formatInlineList(values: string[]): string;
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
const { formatInlineList, parseInlineList, readMeta, splitQuestionBlocks } = parserModule;

const args = process.argv.slice(2);
const { dryRun, onlyFile } = parseCommonScriptArgs(args);
const refreshGenerated = args.includes('--refresh-generated');
const MAX_FOLLOWUPS_PER_PARENT = 3;

interface Block {
  slug: string;
  raw: string;
  metaText: string;
  title: string;
  difficulty: string;
  tags: string[];
  isFollowup: boolean;
  parent?: string;
  followups: string[];
  sections: Record<string, string>;
}

type FollowupIntent = 'implementation' | 'reason' | 'verify' | 'tradeoff' | 'rollout' | 'risk';

const CONTENT_DIR = join(process.cwd(), 'content');
const files = resolveOnlyContentFiles(
  readdirSync(CONTENT_DIR)
    .filter((file) => /^\d.*\.md$/.test(file))
    .sort(),
  onlyFile,
);

const stat = {
  parentsTouched: 0,
  followupSectionsAdded: 0,
  childQuestionsAdded: 0,
  childQuestionsSkipped: 0,
  childQuestionsRefreshed: 0,
  childQuestionsPreserved: 0,
};

function splitBlocks(content: string): { before: string; blocks: Block[] } {
  const parsed = splitQuestionBlocks(content);
  return {
    before: parsed.before,
    blocks: parsed.blocks.map((block) => ({
      slug: block.slug,
      raw: block.raw,
      metaText: block.metaText,
      title: readMeta(block.metaText, 'title') || block.slug,
      difficulty: readMeta(block.metaText, 'difficulty') || '进阶',
      tags: parseInlineList(readMeta(block.metaText, 'tags') || '[]'),
      isFollowup: /^parent\s*:/m.test(block.metaText) || /^parentId\s*:/m.test(block.metaText),
      parent: readMeta(block.metaText, 'parent') || readMeta(block.metaText, 'parentId'),
      followups: parseInlineList(
        readMeta(block.metaText, 'followups') ||
          readMeta(block.metaText, 'followupQuestionIds') ||
          '[]',
      ),
      sections: block.sections,
    })),
  };
}

function extractFollowupQuestions(section: string | undefined, parentTitle: string): string[] {
  if (!section?.trim()) {
    return [
      `如果把「${normalizeWhatIsTitle(parentTitle)}」用到真实项目里，你会重点关注哪些边界、验证手段和取舍？`,
    ];
  }
  const bullets = section
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*[-*]\s+(.+?)\s*$/)?.[1])
    .filter((line): line is string => Boolean(line))
    .map((line) => line.replace(/\s+/g, ' ').trim());
  if (bullets.length) return bullets;
  return section
    .split(/[？?。]\s*/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => (/[？?]$/.test(line) ? line : `${line}？`));
}

function cleanTitle(value: string): string {
  return value
    .replace(/[\]`*_#>[]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/（[^）]*）/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[？?。；;，,：:]$/, '');
}

function normalizeWhatIsTitle(value: string): string {
  return cleanTitle(value)
    .replace(/\s*是什么$/, '')
    .trim();
}

function markdownText(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTerms(question: string): string[] {
  const terms = new Set<string>();
  for (const match of question.matchAll(/`([^`]+)`/g)) terms.add(match[1]);
  for (const match of question.matchAll(/[A-Za-z][A-Za-z0-9_+#./-]{1,}/g)) terms.add(match[0]);
  for (const match of question.matchAll(/[\u4e00-\u9fa5]{2,}/g)) {
    const text = match[0];
    for (let i = 0; i < text.length - 1; i += 2) terms.add(text.slice(i, i + 2));
  }
  return [...terms].filter((term) => term.length > 1);
}

const GENERIC_CONTEXT_LINE_PATTERNS = [
  /如果没有补充输入边界、失败路径和替代方案/,
  /如果不说明监控指标、发布策略和回滚方式/,
  /先凭感觉优化而不先量化瓶颈/,
  /只看实验室分数，不看真实设备/,
  /安全题要补威胁模型、信任边界、攻击路径和服务端兜底/,
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

const BROKEN_CONTEXT_LINE_PATTERNS = [
  /如\s*）/,
  /默认值（）/,
  /Pick>/,
  /在 \/ 上加 integrity/,
  /→\s*，/,
];

function relevantLines(block: Block, question: string): string[] {
  const source = [
    block.sections['答案要点'] || '',
    block.sections['常见误区'] || '',
    block.sections['延伸'] || '',
  ].join('\n');
  const terms = extractTerms(question);
  return source
    .split(/\r?\n/)
    .map((line) => markdownText(line.replace(/^\s*[-*]\s*/, '')))
    .filter((line) => line.length >= 12)
    .filter((line) => !GENERIC_CONTEXT_LINE_PATTERNS.some((pattern) => pattern.test(line)))
    .filter((line) => !BROKEN_CONTEXT_LINE_PATTERNS.some((pattern) => pattern.test(line)))
    .filter((line) => terms.some((term) => line.toLowerCase().includes(term.toLowerCase())))
    .slice(0, 3);
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

function tokenize(value: string): string[] {
  return (
    markdownText(value).match(/[A-Za-z][A-Za-z0-9_+#./-]{1,}|[\u4e00-\u9fa5]{2,10}/g) || []
  ).map((token) => token.toLowerCase());
}

function tokenOverlapRatio(a: string, b: string): number {
  const left = new Set(tokenize(a));
  const right = new Set(tokenize(b));
  if (!left.size || !right.size) return 0;
  let overlap = 0;
  for (const token of left) {
    if (right.has(token)) overlap += 1;
  }
  return overlap / Math.min(left.size, right.size);
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

const FOCUS_TERM_ALIASES: Record<string, string> = {
  发布: '发布链路',
  测试: '测试链路',
  性能: '性能瓶颈',
  安全: '安全边界',
  状态: '状态管理',
  渲染: '渲染路径',
  监控: '观测指标',
  指标: '关键指标',
  数据: '数据链路',
  缓存: '缓存策略',
  AI: 'AI 应用链路',
  架构: '架构方案',
  手写: '手写实现',
};

const TERM_STOPWORDS = new Set([
  '实战',
  '高频',
  '面试',
  '题目',
  '题库',
  '概念',
  '原理',
  '机制',
  'Engineering',
  '基础',
  '进阶',
  '资深',
  '示例',
  '案例',
]);

const FIXED_TERM_EXPLANATIONS: Record<string, string[]> = {
  ai: [
    '在本题里指接入的大模型能力，需要限定输入边界、输出校验和回退策略。',
    '这里的 AI 是可运营能力，不是黑盒接口：要有预算上限、失败兜底和可观测信号。',
    'AI 在这题里不是“调用一次接口”这么简单，必须同时定义质量门槛、成本上限和安全兜底。',
    '这道题的 AI 指业务可上线能力，需要把模型调用、结果校验和故障回退串成闭环。',
    'AI 在本题代表一条可治理链路，需要回答“何时放量、何时回退、谁来兜底”。',
    '这里的 AI 是要负责结果质量的系统能力，必须配套监控、审计和故障降级。',
    '本题里的 AI 不只看效果，还要满足成本预算与安全约束，三者缺一不可。',
    'AI 在该场景里指可持续交付能力，需要把模型输出变成可验证、可回滚的工程流程。',
    'AI 在这道题里属于高风险能力，必须先定义禁答边界，再定义失败兜底与人工接管。',
    '本题中的 AI 不是单点功能，而是完整链路：输入治理、输出校验、异常回退都要可执行。',
    'AI 在这里的含义是“可上线且可治理”的生成能力，不能只看模型效果分数。',
    '这题里的 AI 要求结果可追溯：每次生成都应关联日志证据、评测结果与回退开关。',
    'AI 在本题里必须满足三条线：质量可验收、成本可控、安全可审计，缺一都不能放量。',
    '这里说的 AI 指前端可集成的模型能力，上线前要明确调用边界和故障处置责任。',
    'AI 在该问题里是持续迭代对象，需要版本化评测、灰度发布和异常止损策略。',
    '本题把 AI 视为工程能力而非黑盒服务，必须配套监控指标和人工复核流程。',
  ],
  llm: [
    '大语言模型，基于上下文预测下一个 token；工程上要配合约束与验证，避免幻觉。',
    'LLM 是概率生成器，不是确定性规则引擎；上线必须补充校验、重试与人工兜底。',
  ],
  prompt: [
    '给模型的指令模板，决定任务边界、输出格式和约束条件。',
    'Prompt 相当于任务合同：范围、格式、禁止项写得越清楚，输出越稳定可复核。',
    'Prompt 是模型执行说明书，核心是把目标、输入约束和输出格式讲清楚。',
    '本题里的 Prompt 不是一句话提问，而是可复用模板：角色、任务、上下文、格式要完整。',
  ],
  'prompt engineering': [
    '系统化设计和迭代提示词，用结构化约束提升输出稳定性和可验收性。',
    'Prompt Engineering 是把提示词做成可版本化资产，通过评测集迭代而不是凭感觉调参。',
  ],
  token: [
    '模型处理与计费的最小单位，输入和输出 token 都会占用成本预算。',
    'Token 直接决定成本和上下文容量；超量会增加费用并挤占有效信息窗口。',
    'Token 是模型的计算颗粒度，输入输出都计费，超预算会直接影响上线可持续性。',
    '这里的 Token 既是容量指标也是成本指标，回答时要同时说明窗口占用与费用影响。',
  ],
  'context window': [
    '模型单次请求可处理的上下文总量，超出会截断并丢失关键信息。',
    'Context Window 是单轮可用内存上限，超过后需要摘要、裁剪或 RAG 才能保证正确性。',
  ],
  context: [
    '当前请求携带的上下文信息，会直接影响模型推理结果和可解释性。',
    'Context 决定模型“看到什么”，上下文污染会直接引发答非所问或错误结论。',
  ],
  temperature: [
    '控制输出随机性；值越低越稳定，值越高越发散。',
    'Temperature 是稳定性旋钮：低值适合结构化任务，高值适合创意探索。',
  ],
  rag: [
    '检索增强生成，先检索外部知识再生成回答，用于降低幻觉并补齐时效信息。',
    'RAG 把“检索”和“生成”解耦，先拿到可追溯证据，再让模型组织输出。',
    'RAG 是“先找证据再回答”的流程，用检索命中率与证据覆盖率约束生成质量。',
    '本题中的 RAG 重点是可追溯：回答必须能回链到检索片段，而不是仅凭模型记忆。',
  ],
};

function extractFocusCandidates(value: string): string[] {
  const plain = markdownText(value).replace(/「|」/g, ' ');
  return plain.match(/[A-Za-z][A-Za-z0-9_+#./-]{1,}|[\u4e00-\u9fa5]{2,12}/g) || [];
}

function normalizeFocusTerm(value: string): string {
  const normalized = markdownText(value)
    .replace(/[「」"'`]/g, ' ')
    .replace(/[（(][^()（）]{0,24}[)）]/g, ' ')
    .replace(/[，。！？?：:；;、]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized || normalized.length < 2 || normalized.length > 28) return '';
  if (GENERIC_FOCUS_TERMS.has(normalized)) return '';
  if (TERM_STOPWORDS.has(normalized)) return '';
  if (
    /^(日志|指标|线上指标|线上观测指标|回滚条件|迁移路径|方案边界|实施节奏|组合验证|共同证明|支撑结论|持续验证|复杂依赖|真实流量|业务约束下)$/.test(
      normalized,
    )
  ) {
    return '';
  }
  if (/^(并|以及)/.test(normalized)) return '';
  if (
    /(日志|指标|观测|测试|验证)/.test(normalized) &&
    normalized.length >= 8 &&
    !/[A-Za-z]/.test(normalized)
  ) {
    return '';
  }
  if (/^如果面试官追问/.test(normalized)) return '';
  if (/如何|怎么|哪些|什么|为什么|是否/.test(normalized)) return '';
  if (
    /^(如何|怎么|哪些|什么|是否|如果|当|在|围绕|结合|从|以|针对|对于|真要|为了|你会)/.test(
      normalized,
    )
  ) {
    return '';
  }
  if (
    /业务约束|团队约束|当前团队|工程落地|角度看|场景下|约束下|情况下|评审时|落地时|上线后/.test(
      normalized,
    )
  ) {
    return '';
  }
  if (/真实业务|工程落地|团队与业务约束|场景下|角度看/.test(normalized)) return '';
  return normalized;
}

function extractPriorityFocusTerms(text: string, includeLooseTokens = true): string[] {
  const terms: string[] = [];
  const push = (raw: string) => {
    const normalized = normalizeFocusTerm(raw);
    if (normalized) terms.push(normalized);
  };

  for (const match of text.matchAll(/`([^`]{2,64})`/g)) {
    const raw = match[1].trim();
    push(raw);
    for (const englishPhrase of raw.match(
      /[A-Za-z][A-Za-z0-9_+#./-]*(?:\s+[A-Za-z][A-Za-z0-9_+#./-]*){0,2}/g,
    ) || []) {
      push(englishPhrase.trim());
    }
  }
  for (const match of text.matchAll(/「([^」]{2,80})」/g)) {
    const raw = match[1].trim();
    push(raw);
    for (const segment of raw.split(/[：:，,、/|]/).map((item) => item.trim())) {
      push(segment);
    }
    const lead = raw.split(/[的]/)[0]?.trim();
    if (lead) push(lead);
  }

  const plain = markdownText(text);
  const pairSource = plain.replace(/<[^>]{0,16}>/g, '');
  for (const pair of pairSource.matchAll(
    /([A-Za-z][A-Za-z0-9_+#./-]{1,24}|[\u4e00-\u9fa5]{2,20})\s*(?:和|与|vs|VS|\/)\s*([A-Za-z][A-Za-z0-9_+#./-]{1,24}|[\u4e00-\u9fa5]{2,20})/g,
  )) {
    push(`${pair[1]} 与 ${pair[2]}`);
    push(pair[1]);
    push(pair[2]);
  }
  if (includeLooseTokens) {
    for (const token of extractFocusCandidates(plain)) push(token);
  }
  return [...new Set(terms)];
}

function pickFocusTerm(block: Block, question: string): string {
  for (const candidate of extractPriorityFocusTerms(question, false)) {
    const focus = normalizeFocusTerm(candidate);
    if (focus) return FOCUS_TERM_ALIASES[focus] || focus;
  }
  const candidates = [
    ...extractPriorityFocusTerms(normalizeWhatIsTitle(block.title)),
    ...extractFocusCandidates(normalizeWhatIsTitle(block.title)),
    ...extractFocusCandidates(question),
    ...block.tags,
  ];
  for (const candidate of candidates) {
    const focus = normalizeFocusTerm(candidate);
    if (focus) return FOCUS_TERM_ALIASES[focus] || focus;
  }
  for (const candidate of extractPriorityFocusTerms(question, true)) {
    const focus = normalizeFocusTerm(candidate);
    if (focus) return FOCUS_TERM_ALIASES[focus] || focus;
  }
  return '关键链路';
}

function normalizeQuestionPattern(question: string): string {
  return question
    .trim()
    .replace(/[？?。]+$/, '')
    .replace(/「[^」]+」/g, '「X」');
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
  const styled = pickBySeed(wrappers, `${seed}|style`, slot + 31)
    .replace(/[？?。]+$/, '')
    .trim();
  return `${styled}？`;
}

function refineFollowupQuestion(question: string, parent: Block, slot: number): string {
  const pattern = canonicalizeFollowupQuestionPattern(normalizeQuestionPattern(question));
  const title = normalizeWhatIsTitle(parent.title);
  const focusTerm = pickFocusTerm(parent, question);
  const seed = `${parent.slug}|${slot}|${pattern}`;
  const map: Record<string, string[]> = {
    '「X」在真实项目里最容易踩到哪些边界条件': [
      `把「${title}」放到真实业务里，哪些前置约束和边界输入最容易被忽略？`,
      `在生产环境落地「${title}」时，最常见的边界坑会出现在哪些环节？`,
      `如果要把「${title}」真正上线，你会优先排查哪些高风险边界条件？`,
      `围绕「${title}」做方案评审时，你会先检查哪些与 ${focusTerm} 相关的边界假设是否成立？`,
      `当「${title}」进入复杂业务场景时，你会先确认哪些边界条件是否可控？`,
      `你会如何识别「${title}」在真实流量下最容易失效的输入与环境约束？`,
      `上线「${title}」前，你会优先验证哪些边界假设，避免方案在生产环境失真？`,
      `如果要做「${title}」的稳定性评审，你会先盘点哪些容易被忽视的边界因素？`,
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
    '把「X」放到真实项目时，最容易忽略的边界条件和前置约束是什么': [
      `把「${title}」放到真实项目里，哪些边界条件和前置约束最容易被低估？`,
      `在真实业务里落地「${title}」时，你会先排查哪些容易遗漏的边界假设？`,
      `如果要评估「${title}」的落地风险，你会优先检查哪些约束条件是否成立？`,
      `围绕「${title}」做方案评审时，哪些与 ${focusTerm} 相关的边界输入最容易导致结论失真？`,
      `当「${title}」进入复杂场景后，你会先验证哪些前置条件，避免方案踩坑？`,
      `你会如何识别「${title}」在生产环境中最容易失效的边界因素？`,
      `要让「${title}」稳定上线，你会先补齐哪些边界与约束检查项？`,
      `面对真实流量时，「${title}」最可能被哪些边界条件击穿，你会如何提前防范？`,
    ],
    '如果要证明「X」真的有效，你会设计哪些验证路径和观察指标': [
      `如果要证明「${title}」真的有效，你会怎么设计验证路径和观察指标？`,
      `为了确认「${title}」不是“看起来有效”，你会如何安排测试证据和观测指标？`,
      `你会怎样搭建「${title}」的验证闭环，让结论可复现、可量化、可复核？`,
      `上线后你会盯哪些和 ${focusTerm} 相关的指标，来判断「${title}」的收益是否持续成立？`,
      `如果要向团队证明「${title}」的价值，你会展示哪些日志和指标证据？`,
      `你会如何围绕 ${focusTerm} 定义「${title}」生效的判据，并用测试与监控长期验证？`,
      `围绕「${title}」做效果复盘时，你会优先展示哪几类验证结果？`,
      `要避免主观判断「${title}」是否有效，你会如何组合测试、日志和指标？`,
    ],
    '当需求规模、团队资源或兼容性要求变化时，你会如何重排方案优先级': [
      `当需求规模、团队资源或兼容性要求变化时，你会如何围绕 ${focusTerm} 重排「${title}」方案优先级？`,
      `面对规模与资源变化并存时，你会如何围绕 ${focusTerm} 调整「${title}」的推进顺序？`,
      `如果兼容性压力突然升高，你会如何围绕 ${focusTerm} 重新划分「${title}」的实施阶段？`,
      `当约束变化导致成本上升时，你会先优化「${title}」里和 ${focusTerm} 相关的哪些环节？`,
      `当需求复杂度增长但团队产能有限时，你会如何围绕 ${focusTerm} 拆分「${title}」的落地路径？`,
      `如果目标不变但约束更严，你会如何围绕 ${focusTerm} 调整「${title}」方案的边界和节奏？`,
      `当规模扩张与预算收紧同时发生，你会如何重排「${title}」的优先级？`,
      `如果外部环境变化导致原计划不再稳妥，你会如何改造「${title}」的推进策略？`,
    ],
    '推动「X」落地时，你会如何设计灰度、回滚和迁移路径': [
      `真要把「${title}」推到线上，你会如何围绕 ${focusTerm} 设计灰度节奏、回滚条件和迁移路径？`,
      `如果要分阶段上线「${title}」，你会如何围绕 ${focusTerm} 安排灰度节奏和回滚触发条件？`,
      `围绕「${title}」做迁移时，你会怎样按 ${focusTerm} 拆分批次，降低回滚风险？`,
      `在「${title}」落地过程中，你会如何围绕 ${focusTerm} 设计发布开关和故障回退策略？`,
      `面对高风险改动，你会怎样围绕 ${focusTerm} 规划「${title}」的灰度验证与迁移窗口？`,
      `如果「${title}」涉及历史数据兼容，你会如何围绕 ${focusTerm} 安排迁移与回退链路？`,
      `当「${title}」需要跨团队推进时，你会如何制定灰度与回滚协作机制？`,
      `为了让「${title}」上线更稳，你会如何定义每阶段的迁移门槛和退出条件？`,
    ],
    '如果团队成员能力和历史包袱不一致，你会如何拆阶段推进': [
      `团队里有人熟有人新时，你会怎么围绕 ${focusTerm} 把「${title}」拆成几段推进，确保每段都能独立验收？`,
      `面对团队能力差异，你会如何围绕 ${focusTerm} 把「${title}」拆成可并行推进的小阶段？`,
      `老系统包袱重、牵一发而动全身时，你会怎么围绕 ${focusTerm} 安排「${title}」的渐进改造路线？`,
      `当团队成熟度不一致时，你会如何围绕 ${focusTerm} 定义「${title}」的先后改造顺序？`,
      `你会怎样围绕 ${focusTerm} 拆分「${title}」的推进节奏，兼顾短期交付和长期治理？`,
      `如果部分模块技术债很重，你会如何围绕 ${focusTerm} 调整「${title}」的分阶段策略？`,
      `面对跨团队协作成本，你会如何围绕 ${focusTerm} 规划「${title}」的阶段目标与交付边界？`,
      `当资源有限且历史包袱明显时，你会如何围绕 ${focusTerm} 让「${title}」推进路径可持续？`,
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
      `你会怎样定义「${title}」的长期健康度，并通过指标持续校准？`,
      `如果「${title}」进入维护期，你会优先围绕 ${focusTerm} 监控哪些指标来预警风险？`,
    ],
    '你会先看哪些指标来判断「X」是不是当前性能瓶颈': [
      `你会先看哪些与 ${focusTerm} 相关的指标来判断「${title}」是不是当前性能瓶颈？`,
      `如果要确认「${title}」在 ${focusTerm} 上是主要瓶颈，你会优先检查哪几类性能指标？`,
      `你会如何用数据判断「${title}」在 ${focusTerm} 维度上值得先优化，而不是先改别的模块？`,
      `围绕「${title}」做性能排查时，你会优先看哪些与 ${focusTerm} 相关的核心指标与分位数据？`,
      `为了定位「${title}」在 ${focusTerm} 上的瓶颈优先级，你会先拉哪些观测指标作为依据？`,
      `你会怎样区分「${title}」在 ${focusTerm} 上是局部抖动还是系统级性能瓶颈？`,
      `当性能问题复杂交织时，你会用哪些指标先判断「${title}」的贡献度？`,
      `如果资源有限，你会如何根据指标判断是否先优化「${title}」？`,
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
      `当「${title}」优化后，你会优先看哪些真实用户信号来确认收益？`,
      `你会怎么把「${title}」的离线指标和线上用户行为串起来，验证这次优化确实有效？`,
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
      `你会怎样比较「${title}」在 ${focusTerm} 优化上的短期收益和长期负担，决定是否落地？`,
      `如果「${title}」优化需要额外工程投入，你会如何证明这笔成本值得支付？`,
    ],
    '如果要在线上证明这个方案稳定，你会看哪些日志和指标': [
      `如果要在线上证明「${title}」稳定，你会优先看哪些和 ${focusTerm} 相关的日志与指标？`,
      `围绕「${title}」上线后的稳定性，你会先盯哪几组信号判断风险在收敛还是在扩散？`,
      `当你要验证「${title}」没有把问题带到线上时，会重点关注哪些告警、日志和趋势指标？`,
      `你会如何把「${title}」的技术指标和业务侧异常信号串起来，快速判断方案是否稳定？`,
      `如果线上反馈和监控信号冲突，你会先用哪些指标复核「${title}」的稳定性结论？`,
      `为了复盘「${title}」上线质量，你会如何组织日志、指标和告警证据链？`,
    ],
    '你会怎么证明实现正确，而不是只靠几个样例跑通': [
      `你会怎么证明「${title}」实现正确，而不是只靠几个样例跑通？`,
      `如果要让「${title}」的正确性可复核，你会围绕 ${focusTerm} 设计哪些验证步骤？`,
      `围绕「${title}」你会如何组织反例、边界用例和不变量检查，避免“样例通过即正确”？`,
      `为了让团队信服「${title}」正确，你会先补哪几类高价值校验与断言？`,
      `当「${title}」逻辑变复杂时，你会如何分层验证正确性，避免遗漏隐蔽路径？`,
      `如果要在评审里证明「${title}」可长期维护，你会展示哪些围绕 ${focusTerm} 的正确性证据？`,
    ],
    '如果这个方案导致状态耦合或调试困难，你会怎么拆分和验证': [
      `如果「${title}」逐渐出现状态耦合或排障困难，你会怎么拆分 ${focusTerm} 并验证拆分效果？`,
      `当「${title}」的链路越来越难调试时，你会先改哪一层，再怎么验证风险可控？`,
      `你会如何把「${title}」拆成可观测、可回滚的小单元，避免一次性大改？`,
      `面对「${title}」里的耦合问题，你会怎样划分边界、补回归并逐步替换旧实现？`,
      `如果团队反馈「${title}」不好维护，你会如何围绕 ${focusTerm} 做分层重构和验证？`,
      `当「${title}」让联调成本持续升高时，你会先拆哪条关键链路来止损？`,
    ],
    '它和常见替代方案相比，适合什么团队规模和业务复杂度': [
      `和常见替代方案相比，「${title}」在 ${focusTerm} 这个维度更适合什么团队规模与业务复杂度？`,
      `别只看 benchmark，你会怎么比较「${title}」和替代方案在 ${focusTerm} 上的学习成本、交付速度与维护负担？`,
      `如果团队人数、交付节奏和业务复杂度不同，你会怎么基于 ${focusTerm} 判断该不该选「${title}」？`,
      `如果老板追问“现在到底选哪个”，你会怎样用团队现状和业务复杂度解释「${title}」与替代方案的取舍？`,
      `你会用哪些现实约束来说明「${title}」在 ${focusTerm} 上相对替代方案的适用边界？`,
      `在评审「${title}」时，你会如何围绕 ${focusTerm} 向团队解释“什么时候值得用，什么时候别硬上”？`,
      `如果要对比「${title}」和替代方案，你会先看学习成本、维护成本还是 ${focusTerm} 相关收益速度？`,
      `当业务复杂度升级时，你会如何判断「${title}」在 ${focusTerm} 上还能不能继续扛住？`,
    ],
    '当安全性、用户体验和研发成本冲突时，你会如何取舍': [
      `当安全性、用户体验和研发成本互相拉扯时，你会怎么围绕 ${focusTerm} 给「${title}」排优先级？`,
      `如果「${title}」必须在安全和体验之间做权衡，你会先守住哪些底线？`,
      `面对「${title}」的多目标冲突，你会如何给团队讲清取舍依据和回退预案？`,
      `当预算和人力有限时，你会怎样推进「${title}」以兼顾上线速度和安全下限？`,
      `若「${title}」需要阶段性妥协，你会先放哪一项、补哪一项，确保后续可追回？`,
      `你会如何把「${title}」的取舍逻辑转成可执行的发布策略和监控标准？`,
    ],
    '你会如何设计超时、重试、幂等和降级来保证链路可靠': [
      `围绕「${title}」这条链路，你会怎么定超时、重试、幂等和降级策略？`,
      `如果「${title}」遇到外部依赖抖动，你会先收紧哪几个可靠性开关？`,
      `你会如何给「${title}」设计“失败可恢复、重复不出错、超时可止损”的机制？`,
      `当「${title}」进入高峰流量时，你会如何调整重试和降级，避免雪崩放大？`,
      `在「${title}」里你会怎样划分可重试与不可重试场景，防止误重试放大故障？`,
      `若「${title}」跨服务调用较多，你会如何约定幂等键、重试退避和兜底返回？`,
    ],
    '如果把「X」放到真实业务里，你会怎么划分信任边界和服务端兜底': [
      `真把「${title}」放到生产环境里，你会怎么划清客户端与服务端的信任边界？`,
      `围绕「${title}」上线，你会优先把哪些校验放到服务端，避免前端单点失守？`,
      `如果「${title}」面对高风险输入，你会如何设计服务端兜底，保证最坏情况可控？`,
      `你会怎样在「${title}」里区分“前端可优化”与“服务端必须兜底”的责任边界？`,
      `当「${title}」遇到越权或篡改风险时，你会怎么设计鉴权、审计和降级路径？`,
      `如果要评审「${title}」在 ${focusTerm} 维度的安全方案，你会先检查哪些边界必须由服务端兜底？`,
    ],
    '在 Vue 项目里落地「X」时，响应式边界和组件更新时机要注意什么': [
      `真在 Vue 项目里落地「${title}」时，你会先怎么划分响应式边界？`,
      `当「${title}」涉及跨组件状态同步时，你会如何控制更新时机，避免联动抖动？`,
      `围绕「${title}」实现，你会把哪些状态留在组件内，哪些上提到共享层？`,
      `如果「${title}」页面开始卡顿，你会先从响应式依赖和渲染时机的哪一步排查？`,
      `你会怎样给「${title}」设计状态分层，避免 watch 链路越长越难维护？`,
      `在推进「${title}」时，你会如何用 effect 粒度和更新边界控制渲染成本？`,
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
  const chosen = options?.length ? pickBySeed(options, seed, slot + 11) : question;
  return decorateFollowupQuestion(chosen, title, seed, slot);
}

function ensureSentence(value: string): string {
  const text = markdownText(value).replace(/\s+/g, ' ').trim();
  if (!text) return '';
  if (/[。！？!?]$/.test(text)) return text;
  return `${text}。`;
}

function isWeakCandidateLine(value: string): boolean {
  const text = markdownText(value).replace(/\s+/g, ' ').trim();
  if (!text) return true;
  return (
    /^面试中不要只停留在/.test(text) ||
    /^回答「/.test(text) ||
    /^这题围绕/.test(text) ||
    /^这里的.+是/.test(text) ||
    /^围绕「.+」直接回答：先/.test(text) ||
    /^先确定指标口径，再补日志与测试证据，最后按阈值做继续\/回退决策/.test(text) ||
    /^围绕 .+先对比短期收益和长期负担，再给明确切换条件/.test(text) ||
    /^先演练 .+的失败场景，再配置降级和兜底动作，最后确认恢复路径/.test(text) ||
    /^验收至少包含回归用例、线上监控和告警阈值，三条证据都达标才收口/.test(text) ||
    /^围绕实施结果要同时看测试通过率、错误率和时延变化，确保改动真实生效/.test(text) ||
    /^验收要同时满足“指标达标 \+ 日志一致 \+ 测试通过”，缺一不可/.test(text) ||
    /^验证闭环包含阈值、证据和回归结果，三者一致才可继续放量/.test(text) ||
    /^验收看收益与成本两条曲线：收益稳定且维护成本可控才保留当前方案/.test(text) ||
    /^验收需同时对比收益提升和维护成本变化，确保取舍结论可持续/.test(text) ||
    /^围绕取舍结果至少给收益趋势、成本趋势和回归稳定性三组数据/.test(text) ||
    /^先排查 .+ 现状，再实施改动并验证结果，异常时立即回滚/.test(text) ||
    /^若 .+ 没有明确回退策略，发布失败后会出现恢复窗口过长的问题/.test(text) ||
    /^围绕 .+ 的实施结果要同时看测试通过率、错误率和时延变化，确保改动真实生效/.test(text) ||
    /^围绕 .+ 至少给一组指标阈值、一条日志证据和一组测试结果/.test(text) ||
    /^.+ 验收要同时满足“指标达标 \+ 日志一致 \+ 测试通过”，缺一不可/.test(text) ||
    /^验收 .+ 时要同时看测试通过率、错误率和时延变化，确保改动真实生效/.test(text) ||
    /^.+ 验证要给“指标阈值 \+ 监控信号 \+ 回归结果”三件套/.test(text) ||
    /^.+ 发布先灰度后放量，每批次都有验收门槛和回滚开关，确保迁移可控/.test(text) ||
    /^.+ 发布路径用“低风险流量试点 -> 分批放量 -> 异常即回退”/.test(text) ||
    /^.+ 一旦异常要明确止损、回退和恢复路径，三者缺一不可/.test(text) ||
    /^围绕 .+ 先做基线采集，再做最小改动验证，最后按门槛决定继续放量或回退/.test(text) ||
    /^先给 .+ 的触发条件，再解释机制和反例，避免只给抽象结论/.test(text) ||
    /^.+ 的关键差别不在表面功能，而在适用边界、维护成本和失败后果；按这三项比较再决策/.test(text) ||
    /^先算 .+ 的收益提升、维护成本、回滚复杂度三本账；收益连续达标再推进，否则保留现方案/.test(text)
  );
}

function preferStrongLine(selected: string, fallback: string): string {
  const normalized = ensureSentence(selected);
  if (!normalized || isWeakCandidateLine(normalized)) return ensureSentence(fallback);
  return normalized;
}

function isActionableDirect(intent: FollowupIntent, value: string): boolean {
  const text = ensureSentence(value);
  if (intent === 'implementation') {
    const strongActionRegex =
      /排查|验证|实施|推进|拆分|拆解|灰度|回滚|回退|恢复|监控|补齐|补充|迁移|收敛|演练|止损|改造|收紧|估算|校准|观察|比较/;
    if (
      /(先|再|最后|按|分批|逐步|优先|建议|需要|必须|应当|可先|先把|先补|先做)/.test(text) &&
      strongActionRegex.test(text)
    ) {
      return true;
    }
    const normalized = markdownText(text);
    const strongHitCount = [
      '排查',
      '验证',
      '实施',
      '推进',
      '拆分',
      '拆解',
      '灰度',
      '回滚',
      '回退',
      '恢复',
      '监控',
      '补齐',
      '补充',
      '迁移',
      '收敛',
      '演练',
      '止损',
      '改造',
      '收紧',
      '估算',
      '校准',
      '观察',
      '比较',
    ].filter((keyword) => normalized.includes(keyword)).length;
    return strongHitCount >= 2;
  }
  if (intent === 'reason') {
    return /因为|原因|本质|前提|导致|触发|失效|因果|为什么|区别|差别|关系|替代|原理/.test(text);
  }
  return true;
}

function ensureActionLine(value: string, fallback: string): string {
  const normalized = ensureSentence(value);
  if (containsAnyKeyword(markdownText(normalized), FOLLOWUP_ACTION_KEYWORDS)) return normalized;
  const fallbackNormalized = ensureSentence(fallback);
  if (containsAnyKeyword(markdownText(fallbackNormalized), FOLLOWUP_ACTION_KEYWORDS)) {
    return fallbackNormalized;
  }
  return ensureSentence(
    `${fallbackNormalized.replace(/[。！？!?]+$/g, '')}，并推进排查、实施与回退验证`,
  );
}

function inferFollowupIntent(question: string): FollowupIntent {
  const plain = markdownText(question);
  const stripped = plain.replace(/「[^」]{2,120}」/g, ' ');
  if (/指标|验证|证明|监控|告警|测试|验收|日志|趋势|观测|信号|估算|计算/.test(stripped))
    return 'verify';
  if (/取舍|成本|收益|权衡|利弊|该不该选|最佳选择|选型|团队阶段/.test(stripped)) return 'tradeoff';
  if (/上线|灰度|回滚|迁移|发布/.test(stripped)) return 'rollout';
  if (
    /风险|异常|故障|失败|兜底|降级|边界问题|边界条件|可靠性开关|开关|熔断|止损|抖动|限流|击穿|陷阱|复杂度坑/.test(
      stripped,
    )
  )
    return 'risk';
  if (/为什么|原因|本质|区别|差别|关系|原理|能替代|替代|适合/.test(stripped)) return 'reason';
  return 'implementation';
}

function pickKeywordLine(lines: string[], keywords: string[]): string | undefined {
  for (const line of lines) {
    if (isWeakCandidateLine(line)) continue;
    if (containsAnyKeyword(markdownText(line), keywords)) return line;
  }
  return undefined;
}

function buildFallbackDirect(
  intent: FollowupIntent,
  title: string,
  question: string,
  focusTerm: string,
): string {
  if (/declare module.*svg|declare module.+原理/.test(question)) {
    return `declare module 的作用是给非 TS 资源补类型声明，让编译器知道导入值的形状并通过类型检查。`;
  }
  if (/什么时候用.*什么时候/.test(question) && /容器查询|媒体查询/.test(question)) {
    return `组件内部随容器尺寸变化用容器查询；全局断点和页面级布局切换仍用媒体查询。`;
  }
  if (/Style Queries/.test(question) && /CSS Variables/.test(question) && /关系/.test(question)) {
    return `CSS Variables 负责承载可变设计 token，Style Queries 负责读取样式状态做条件分支，两者组合实现“变量驱动 + 条件选择”。`;
  }
  if (/为什么不直接用\s*esbuild|源码不也用\s*esbuild/.test(question)) {
    return `esbuild 适合快编译，但生产构建还需要成熟插件生态、产物优化与兼容控制，所以通常由 Rollup 或 Rolldown 承担。`;
  }
  if (
    /动态 import 失败|旧版本 chunk|动态加载/.test(question) &&
    /预算收紧|兼容性要求提升|实施节奏|方案边界/.test(question)
  ) {
    return `先补版本探测与自动刷新兜底，再按“关键路由优先预加载、低频模块懒加载”的节奏收敛动态加载成本。`;
  }
  if (/60 秒|60秒|一分钟|压缩一个复杂项目回答/.test(question)) {
    return `先讲项目目标与结果，再给你主导的关键动作和量化收益，最后补一个可追问点，控制在 60 秒内。`;
  }
  if (/草稿丢失|本地数据损坏/.test(question)) {
    return `先把草稿写入可恢复存储并附版本号校验，提交前做冲突合并，异常时按快照回放恢复。`;
  }
  if (/key 池|负载均衡/.test(question)) {
    return `key 池负载要按成功率和时延动态分流，单 key 异常即摘除并走备用池，恢复后再逐步回切。`;
  }
  if (/数据量、并发量或页面复杂度扩大一个数量级/.test(question)) {
    return `规模扩大时先做分层缓存和批量计算，把高成本计算移出主线程，并按并发阈值分级降载。`;
  }
  if (
    /判据|验证面板|可复核|证明.*有效|证据|组合验证|共同证明|测试.*日志.*指标|日志.*指标/.test(
      question,
    )
  ) {
    return pickBySeed(
      [
        `先约定「${title}」的功能正确、性能稳定、业务结果三组阈值，再用日志链路和回归结果交叉验证。`,
        `验证「${title}」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。`,
        `先定「${title}」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。`,
      ],
      `${title}|${question}|${focusTerm}|verify-proof-direct`,
    );
  }
  if (/灰度节奏|回滚条件|迁移路径|分阶段止损|实施阶段|发布节奏/.test(question)) {
    return pickBySeed(
      [
        `把「${title}」发布拆成“试点灰度 -> 扩量观察 -> 全量收口”三阶段，每阶段绑定门槛和回滚动作。`,
        `先小流量验证「${title}」主链路，再分批扩量；任一批次越阈值立即回滚并保留旧链路兜底。`,
        `「${title}」上线节奏按“低风险流量试点、分阶段放量、稳定后全量”推进，异常批次立即止损。`,
      ],
      `${title}|${question}|${focusTerm}|rollout-direct`,
    );
  }
  if (/落地风险|约束是否成立|边界条件击穿|最容易失效|稳定上线|上线前.*先验/.test(question)) {
    return pickBySeed(
      [
        `围绕「${title}」先盘点输入边界、并发峰值和失败回退三类约束，逐项压测与演练，通过后再上线。`,
        `「${title}」落地前先做高风险路径演练，确认异常可发现、可止损、可恢复，再推进发布。`,
        `先列「${title}」最坏失败模式并补齐降级兜底，关键链路连续稳定后再扩大影响面。`,
      ],
      `${title}|${question}|${focusTerm}|risk-direct`,
    );
  }
  if (/重排方案优先级|调整方案边界|调整.*实施节奏|规模.*变化|预算收紧/.test(question)) {
    return pickBySeed(
      [
        `「${title}」约束变化时先保主链路与稳定性，再按收益/成本比重排任务，延后高成本低收益项。`,
        `先冻结「${title}」高风险改造，优先交付刚需能力，再按风险分层逐步恢复后续优化项。`,
        `「${title}」在规模或预算变化时按“保可用、控成本、再优化”顺序推进，避免一次性大改引发连锁风险。`,
      ],
      `${title}|${question}|${focusTerm}|reprioritize-direct`,
    );
  }
  if (/复杂度相关边界/.test(question)) {
    return `优先排查 ${focusTerm} 的最坏输入规模、重复访问热点和队列峰值，确认时间与空间复杂度不会击穿预算。`;
  }
  if (/数据规模扩大/.test(question)) {
    return `数据规模放大时，先把 ${focusTerm} 的邻接结构和访问索引换成低开销实现，再加分批处理避免主线程阻塞。`;
  }
  if (/校验与断言|高价值校验/.test(question)) {
    return `先补 ${focusTerm} 的边界输入断言、随机对拍和回归用例三类证据，确保结论可复核而不是样例跑通。`;
  }
  if (/Hooks/.test(question) && /哪些 state|渲染边界|最容易出问题/.test(question)) {
    return `Hooks 场景优先排查条件渲染里的状态漂移、闭包旧值和副作用依赖遗漏，这三类最容易触发错位更新。`;
  }
  if (/状态纠缠|降低调试复杂度/.test(question)) {
    return `先按“页面路由状态、服务端数据状态、本地交互状态”三层拆边界，再为每层定义单向数据流，调试复杂度会明显下降。`;
  }
  if (/该不该选|最佳选择|不同团队阶段/.test(question)) {
    return `做 ${focusTerm} 选型时，团队经验不足优先低心智负担方案；复杂度上升后再切到扩展性更强的方案。`;
  }
  if (/边界问题|重点排查|排查哪些|排查哪/.test(question)) {
    return `先排查 ${focusTerm} 在弱网、断连、限流与重试场景下的边界失效点，按影响面排序逐项止损。`;
  }
  if (/收紧哪几个|可靠性开关|收紧.*开关/.test(question)) {
    return `先收紧 ${focusTerm} 的超时阈值、重试上限、熔断开关和降级开关，再观察错误率与恢复时长。`;
  }
  if (/哪些告警|哪些日志|趋势指标|重点关注哪些.*指标|重点关注哪些.*告警/.test(question)) {
    return `优先盯 ${focusTerm} 的错误率、超时率、重试成功率和回滚次数，并用关键日志核对异常路径是否收敛。`;
  }
  if (/区别|差别|关系|能替代|适合/.test(question)) {
    return `回答 ${focusTerm} 的区别时，先讲语义差异，再讲运行时影响，最后给按场景落地的选型结论。`;
  }
  if (/怎么估算|如何估算|估算|怎么算|怎么计算|如何计算/.test(question)) {
    return `先按 ${focusTerm} 的输入长度、输出上限和并发量估算 token 区间，再用真实请求日志校准预算与阈值。`;
  }
  if (/哪些环节|哪些点|哪几段|哪几个/.test(question)) {
    return `先处理 ${focusTerm} 的高频链路、错误率高的边界分支和回滚成本最低的改造点，低频优化后置。`;
  }
  if (/取舍|权衡|打架|利弊/.test(question)) {
    return `先量化 ${focusTerm} 的收益上限、维护成本和故障代价，再按阈值决定继续投入还是止损切换。`;
  }
  if (/同步规划|效果评估|成本控制|安全策略|组合规则校验|重试|人工审核/.test(question)) {
    return `${focusTerm} 方案按效果、成本、安全三线并行：效果看核心指标，成本设预算阈值，安全加规则校验与人工抽检，任一不达标都不放量。`;
  }
  if (/拆成几段|分阶段|几段推进|每段都能独立验收/.test(question)) {
    return `把 ${focusTerm} 拆成“基线采集 -> 小流量试点 -> 分批放量”三段推进，每段都绑定独立验收门槛和回滚开关。`;
  }
  if (intent === 'verify' && /真实设备|真实网络|线上|弱网|真机/.test(question)) {
    return `在真机与弱网回放下，对比 ${focusTerm} 的核心指标、错误率和耗时分位，连续达标后再认定收益成立。`;
  }
  if (intent === 'risk' && /上线|发布/.test(question)) {
    return `上线前先按 ${focusTerm} 风险分级做演练，配置降级与回滚开关，确认故障可止损后再放量。`;
  }
  const variants: Record<FollowupIntent, string[]> = {
    implementation: [
      `先拆分 ${focusTerm} 的执行步骤，逐步实施并在每步后验证，异常立即回滚。`,
      `把 ${focusTerm} 拆成“现状排查 -> 最小改动 -> 验收回归”三段执行，任何一段异常都要可回退。`,
      `先锁定 ${focusTerm} 现状，再按批次实施改动，验收不过立即回滚。`,
      `先把 ${focusTerm} 的核心链路拆成小步快跑任务，每步验收后再推进下一步，异常立即止损。`,
      `先画出 ${focusTerm} 的主链路时序，再按风险分层改造并逐层验收，未达标立即回退。`,
      `先梳理 ${focusTerm} 的输入边界与失败路径，再逐段落地改造，确保每段都可独立回滚。`,
    ],
    reason: [
      `解释 ${focusTerm} 时先给结论，再补触发前提、作用机制和失效边界，避免只背定义。`,
      `${focusTerm} 的原因要落到“为什么会发生、何时会失效、如何规避”三点，缺一都不完整。`,
      `回答 ${focusTerm} 的原理时要同时给成因、影响范围和替代方案，才算可落地。`,
    ],
    verify: [
      `先定义 ${focusTerm} 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。`,
      `验证 ${focusTerm} 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。`,
      `把 ${focusTerm} 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。`,
    ],
    tradeoff: [
      `先量化 ${focusTerm} 的收益上限和维护成本下限，再给继续投入或止损切换的阈值。`,
      `评估 ${focusTerm} 时要把开发成本、运行成本和故障代价放在同一张表里比较。`,
      `${focusTerm} 取舍必须同时给短期交付收益和长期维护负担，并明确触发切换条件。`,
    ],
    rollout: [
      `把 ${focusTerm} 上线拆成试点、扩量、全量三阶段，每阶段都绑定错误率门槛和回滚动作。`,
      `先让 ${focusTerm} 走小流量灰度，观察成功率与告警，再决定是否继续扩量。`,
      `${focusTerm} 迁移阶段必须保留旧链路兜底，直到新链路在目标指标上连续稳定。`,
    ],
    risk: [
      `先列出 ${focusTerm} 的高危失败点，再准备降级开关、兜底路径和恢复 SOP。`,
      `${focusTerm} 的核心风险是异常扩散，必须配置限流与熔断来保护主链路。`,
      `上线 ${focusTerm} 前先做故障演练，确认“能发现、能止损、能恢复”三项都达标。`,
    ],
  };
  return pickBySeed(variants[intent], `${title}|${question}|${focusTerm}|fallback-direct`);
}

function buildFallbackAction(
  intent: FollowupIntent,
  title: string,
  question: string,
  focusTerm: string,
): string {
  const variants: Record<FollowupIntent, string[]> = {
    implementation: [
      `先梳理 ${focusTerm} 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。`,
      `先明确 ${focusTerm} 的输入边界，再按最小改动落地，最后补回归与回退预案。`,
      `把「${title}」里的 ${focusTerm} 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。`,
      `先定位 ${focusTerm} 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。`,
    ],
    reason: [
      `先复盘 ${focusTerm} 的触发条件，再定位因果链路，最后用反例验证边界。`,
      `先列出 ${focusTerm} 的前提假设，再解释机制，最后补失效场景，形成因果闭环。`,
      `围绕 ${focusTerm} 先做归因再做验证，避免把现象当原因。`,
    ],
    verify: [
      `先定义 ${focusTerm} 的验收阈值，再用测试与线上监控双验证，不达标立即回退。`,
      `围绕 ${focusTerm} 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。`,
      `先统一 ${focusTerm} 指标口径并补齐日志证据，再按测试结果做继续/回退决策。`,
      `先把「${title}」里的 ${focusTerm} 监控看板和测试基线对齐，再按阈值执行放量或回滚。`,
    ],
    tradeoff: [
      `先排查 ${focusTerm} 的成本项和收益项，再实施收敛动作，最后按阈值决定推进或回退。`,
      `先量化 ${focusTerm} 的收益和维护成本，再按阈值决定推进或保留现方案，并记录取舍依据。`,
      `先拆分 ${focusTerm} 的取舍因子，再验证收益/成本比，必要时回退到低风险方案。`,
    ],
    rollout: [
      `${focusTerm} 上线按批次推进：先灰度低风险流量，再逐步放量；任一批次越阈值立刻回滚。`,
      `${focusTerm} 发布路径拆成“试点 -> 放量 -> 全量”，每个阶段都绑定验收门槛和回滚动作。`,
      `围绕 ${focusTerm} 设置灰度开关与回滚脚本，确保发布过程可观测、可回退。`,
    ],
    risk: [
      `先演练 ${focusTerm} 的失败场景，再配置降级和兜底动作，最后确认恢复路径。`,
      `先识别 ${focusTerm} 高风险触发点，再定义止损动作和恢复阈值，确保故障不扩散。`,
      `围绕 ${focusTerm} 建立“告警 -> 降级 -> 恢复”闭环，再推进上线。`,
    ],
  };
  return pickBySeed(variants[intent], `${title}|${question}|${focusTerm}|fallback-action`);
}

function buildFallbackRisk(
  intent: FollowupIntent,
  title: string,
  question: string,
  focusTerm: string,
): string {
  const variants: Record<FollowupIntent, string[]> = {
    implementation: [
      `${focusTerm} 的风险是改动边界不清会引发连锁回归，需要预设回退。`,
      `围绕 ${focusTerm} 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。`,
      `${focusTerm} 若缺少回退开关与恢复脚本，发布失败后会拉长故障恢复窗口。`,
      `在「${title}」里，${focusTerm} 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。`,
      `在「${title}」场景下，${focusTerm} 最大风险是变更影响面估计过小，导致回归缺口被放大。`,
      `${focusTerm} 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。`,
    ],
    reason: [
      `${focusTerm} 若只讲结论不讲因果，会导致排障方向错误并放大风险。`,
      `围绕 ${focusTerm} 归因不完整时，团队会在错误方向反复优化，风险持续累积。`,
      `若 ${focusTerm} 缺少反例验证，容易把偶发结果误判成稳定规律。`,
    ],
    verify: [
      `若 ${focusTerm} 缺少验收阈值，容易出现“看似有效但线上失效”的风险。`,
      `${focusTerm} 没有统一指标口径时，验证结论会互相冲突并误导决策。`,
      `在「${title}」里，${focusTerm} 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。`,
      `在「${title}」里，${focusTerm} 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。`,
    ],
    tradeoff: [
      `围绕 ${focusTerm} 取舍不量化时，常见风险是短期收益被长期维护成本抵消。`,
      `若 ${focusTerm} 决策只看交付速度，后续维护成本和回归成本会快速上升。`,
      `围绕 ${focusTerm} 缺少切换阈值时，团队容易在错误方案上持续投入。`,
    ],
    rollout: [
      `${focusTerm} 发布阶段最大风险是灰度门槛不清，问题会随放量扩散并增加回滚成本。`,
      `围绕 ${focusTerm} 的迁移若没有批次边界，故障会跨模块扩散并难以止损。`,
      `若 ${focusTerm} 没有实时观测信号，异常放量后往往来不及回退。`,
    ],
    risk: [
      `${focusTerm} 的高风险点是异常扩散链路未被拦截，导致故障从局部升级为全局。`,
      `围绕 ${focusTerm} 的故障若缺少降级保护，最坏情况会直接影响核心业务链路。`,
      `若 ${focusTerm} 告警阈值配置过宽，风险会被延迟发现并放大恢复成本。`,
    ],
  };
  return pickBySeed(variants[intent], `${title}|${question}|${focusTerm}|fallback-risk`);
}

function buildFallbackVerify(
  intent: FollowupIntent,
  title: string,
  question: string,
  focusTerm: string,
): string {
  const variants: Record<FollowupIntent, string[]> = {
    implementation: [
      `验收看 ${focusTerm} 相关回归测试通过率、关键日志和线上指标，三者一致才算完成。`,
      `验收至少包含「${title}」里 ${focusTerm} 的回归用例、线上监控和告警阈值，三条证据都达标才收口。`,
      `在「${title}」里，验收 ${focusTerm} 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。`,
      `${focusTerm} 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。`,
      `在「${title}」里，${focusTerm} 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。`,
      `${focusTerm} 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。`,
    ],
    reason: [
      `验收要能复现 ${focusTerm} 问题并证明原因链成立，再观察修复后指标是否回归。`,
      `验收标准是 ${focusTerm} 因果链可复现：输入触发、机制命中、修复后指标回稳。`,
      `围绕 ${focusTerm} 归因结果至少给复现步骤、日志证据和回归指标，防止误判。`,
    ],
    verify: [
      `在「${title}」里，${focusTerm} 至少要给一组指标阈值、一条日志证据和一组测试结果。`,
      `${focusTerm} 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。`,
      `${focusTerm} 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。`,
      `在「${title}」里，${focusTerm} 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。`,
    ],
    tradeoff: [
      `验收看 ${focusTerm} 收益与成本两条曲线：收益稳定且维护成本可控才保留当前方案。`,
      `验收需同时对比 ${focusTerm} 收益提升和维护成本变化，确保取舍结论可持续。`,
      `围绕 ${focusTerm} 取舍结果至少给收益趋势、成本趋势和回归稳定性三组数据。`,
    ],
    rollout: [
      `验收看 ${focusTerm} 灰度通过率、回滚次数和故障恢复时长，达到门槛再继续放量。`,
      `发布验收至少看 ${focusTerm} 放量成功率、异常告警命中和回滚耗时，满足阈值再推进。`,
      `围绕 ${focusTerm} 上线结果持续观察错误率、恢复时长和用户影响面，确认稳定后再全量。`,
    ],
    risk: [
      `验收看 ${focusTerm} 风险告警命中率、降级生效率和恢复耗时，确保异常可控可恢复。`,
      `${focusTerm} 风险验收至少包含告警触发、降级执行和恢复达标三项信号。`,
      `围绕 ${focusTerm} 高风险场景要验证“能发现、能止损、能恢复”，三项都通过才算合格。`,
    ],
  };
  return pickBySeed(variants[intent], `${title}|${question}|${focusTerm}|fallback-verify`);
}

function buildSupplementaryAction(intent: FollowupIntent, focusTerm: string): string {
  const variants: Record<FollowupIntent, string> = {
    implementation: `把 ${focusTerm} 拆成最小改动任务逐条实施，补回归后按批次推进，异常立即回滚。`,
    reason: `先排查 ${focusTerm} 的触发条件，再验证因果链与反例，确认后再实施修正。`,
    verify: `补齐 ${focusTerm} 的日志埋点、回归用例和告警阈值，按日复盘并保留回退开关。`,
    tradeoff: `把 ${focusTerm} 的收益与成本拆成可观测项，持续验证后按阈值推进或回退。`,
    rollout: `围绕 ${focusTerm} 建立灰度批次、监控看板和回滚脚本，按门槛逐批放量。`,
    risk: `针对 ${focusTerm} 先演练故障，再实施降级与兜底，确认恢复路径后再推进发布。`,
  };
  return variants[intent];
}

function extractTermCandidates(question: string, title: string, focusTerm: string): string[] {
  const terms = new Set<string>();
  for (const match of `${question} ${title}`.matchAll(/`([^`]{2,64})`/g)) {
    const raw = match[1].trim();
    terms.add(raw);
    for (const englishPhrase of raw.match(
      /[A-Za-z][A-Za-z0-9_+#./-]*(?:\s+[A-Za-z][A-Za-z0-9_+#./-]*){0,2}/g,
    ) || []) {
      terms.add(englishPhrase.trim());
    }
  }
  for (const match of `${question} ${title}`.matchAll(/「([^」]{2,64})」/g)) {
    const raw = match[1].trim();
    terms.add(raw);
    for (const englishPhrase of raw.match(
      /[A-Za-z][A-Za-z0-9_+#./-]*(?:\s+[A-Za-z][A-Za-z0-9_+#./-]*){0,2}/g,
    ) || []) {
      terms.add(englishPhrase.trim());
    }
  }
  for (const token of question.match(/[A-Za-z][A-Za-z0-9_+#./-]{1,18}/g) || []) terms.add(token);
  if (!terms.size) terms.add(focusTerm);
  const cleaned = [...terms]
    .filter((term) => {
      if (!term) return false;
      if (term.length < 2 || term.length > 32) return false;
      if (/[\u4e00-\u9fa5]/.test(term) && term.length > 10) return false;
      if (/^如果面试官追问/.test(term)) return false;
      if (/^\S+\s+\S+\s+\S+\s+\S+/.test(term) && !/[\u4e00-\u9fa5]/.test(term)) return false;
      if (/^(在|从|以|围绕|结合|针对|对于)/.test(term) && term.length >= 4) return false;
      if (/真实业务|工程落地|团队与业务约束|场景下|角度看/.test(term)) return false;
      if (/^[0-9]+$/.test(term)) return false;
      if (TERM_STOPWORDS.has(term)) return false;
      return true;
    })
    .slice(0, 3);
  return cleaned.length ? cleaned : [focusTerm];
}

function buildTermFallback(
  term: string,
  title: string,
  intent: FollowupIntent,
  question: string,
): string {
  const map: Record<FollowupIntent, string[]> = {
    implementation: [
      `在「${title}」这题里，${term} 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。`,
      `围绕「${title}」里的 ${term} 作答时，要说明由谁实施、怎么落地、失败后如何回退。`,
    ],
    reason: [
      `在「${title}」里，${term} 是因果链关键变量，需要说明触发条件、机制和反例。`,
      `${term} 决定「${title}」为什么会这样，回答时要把原因和失效前提讲清楚。`,
    ],
    verify: [
      `在「${title}」里，${term} 是验收对象，必须给可量化指标、日志信号和测试证据。`,
      `围绕「${title}」里的 ${term} 验证时，要明确“达标阈值”和“不达标时的回退动作”。`,
    ],
    tradeoff: [
      `在「${title}」里，${term} 是取舍变量，要同时比较收益、成本和长期维护复杂度。`,
      `围绕「${title}」里的 ${term} 评估时，不能只讲优点，还要给切换条件和止损阈值。`,
    ],
    rollout: [
      `在「${title}」里，${term} 是发布迁移关键对象，要说明灰度节奏、回滚开关和兼容策略。`,
      `围绕「${title}」里的 ${term} 推进上线时，要明确每个批次的放量门槛和回退条件。`,
    ],
    risk: [
      `在「${title}」里，${term} 是高风险点，要说明最坏失败模式、降级动作和恢复路径。`,
      `围绕「${title}」里的 ${term} 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。`,
    ],
  };
  return pickBySeed(map[intent], `${title}|${question}|${term}|term-fallback`);
}

function buildTermLines(
  terms: string[],
  related: string[],
  title: string,
  intent: FollowupIntent,
  question: string,
): string[] {
  return terms.map((term) => {
    const fixed = FIXED_TERM_EXPLANATIONS[term.toLowerCase()];
    if (fixed?.length) {
      const chosen = pickBySeed(fixed, `${title}|${question}|${term}|fixed-term`);
      const withTopic = /^在「.+」/.test(chosen) ? chosen : `在「${title}」场景里，${chosen}`;
      return `- ${term}：${withTopic}`;
    }
    const hit = related.find(
      (line) =>
        line.includes(term) &&
        line.length <= 88 &&
        !isWeakCandidateLine(line) &&
        !/在这题里指影响结论成立的关键约束/.test(line) &&
        !/面试中不要只停留在/.test(line),
    );
    const explanation = hit
      ? ensureSentence(hit).replace(/^[^：:]{1,16}[：:]\s*/, '')
      : buildTermFallback(term, title, intent, question);
    return `- ${term}：${explanation}`;
  });
}

function answerFor(block: Block, question: string): string {
  const normalizedTitle = normalizeWhatIsTitle(block.title);
  const focusTerm = pickFocusTerm(block, question);
  const intent = inferFollowupIntent(question);
  const related = relevantLines(block, question);
  const directFallback = buildFallbackDirect(intent, normalizedTitle, question, focusTerm);
  const actionFallback = buildFallbackAction(intent, normalizedTitle, question, focusTerm);
  const riskFallback = buildFallbackRisk(intent, normalizedTitle, question, focusTerm);
  const verifyFallback = buildFallbackVerify(intent, normalizedTitle, question, focusTerm);
  const forceIntentDirect =
    intent === 'tradeoff' || intent === 'verify' || intent === 'rollout' || intent === 'risk';
  let direct = directFallback;
  if (!forceIntentDirect) {
    const candidate = related.find(
      (line) =>
        !isWeakCandidateLine(line) &&
        tokenOverlapRatio(line, question) >= 0.12 &&
        isActionableDirect(intent, line),
    );
    if (candidate) direct = candidate;
  }
  let action = ensureActionLine(
    pickKeywordLine(related, FOLLOWUP_ACTION_KEYWORDS) || actionFallback,
    actionFallback,
  );
  if (tokenOverlapRatio(action, direct) > 0.72) {
    action = ensureActionLine(buildSupplementaryAction(intent, focusTerm), actionFallback);
  }
  let risk = preferStrongLine(
    ensureSentence(pickKeywordLine(related, FOLLOWUP_RISK_KEYWORDS) || riskFallback),
    riskFallback,
  );
  let verify = preferStrongLine(
    ensureSentence(pickKeywordLine(related, FOLLOWUP_VERIFY_KEYWORDS) || verifyFallback),
    verifyFallback,
  );
  if (tokenOverlapRatio(risk, question) < 0.08 && !risk.includes(focusTerm)) {
    risk = ensureSentence(riskFallback);
  }
  if (tokenOverlapRatio(verify, question) < 0.1 && !verify.includes(focusTerm)) {
    verify = ensureSentence(verifyFallback);
  }
  const terms = extractTermCandidates(question, block.title, focusTerm);
  const termLines = buildTermLines(terms, related, normalizedTitle, intent, question);

  return `#### 直答
- 结论：${preferStrongLine(direct, directFallback)}
- 关键动作：${preferStrongLine(action, actionFallback)}

#### 术语解释
${termLines.join('\n')}

#### 风险与验收
- 主要风险：${risk}
- 验收信号：${verify}`;
}

function childBlock(parent: Block, slug: string, question: string): string {
  const tags = [...new Set([...parent.tags.slice(0, 4), '追问'])];
  return `## ${slug}
title: 追问：${cleanTitle(question)}
difficulty: ${parent.difficulty}
tags: ${formatInlineList(tags)}
parent: ${parent.slug}
generated: followup-script

### 题目
如果面试官追问：${question}

### 答案要点
${answerFor(parent, question)}
`;
}

function replaceSection(raw: string, name: string, body: string): string {
  const re = new RegExp(`^###\\s+${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'm');
  const match = raw.match(re);
  if (!match?.index && match?.index !== 0)
    return `${raw.replace(/\s+$/, '')}\n\n### ${name}\n${body.trim()}\n`;
  const start = match.index + match[0].length;
  const rest = raw.slice(start);
  const next = rest.search(/^###\s+/m);
  const end = next >= 0 ? start + next : raw.length;
  return `${raw.slice(0, start)}\n${body.trim()}\n\n${raw.slice(end).replace(/^\s+/, '')}`;
}

function rewriteFollowupBlock(block: Block, parent: Block, question: string): string {
  let next = block.raw;
  next = replaceOrInsertMetaLine(next, 'title', `追问：${cleanTitle(question)}`);
  next = replaceOrInsertMetaLine(next, 'difficulty', parent.difficulty);
  next = replaceOrInsertMetaLine(
    next,
    'tags',
    formatInlineList([...new Set([...parent.tags.slice(0, 4), '追问'])]),
  );
  next = replaceOrInsertMetaLine(next, 'parent', parent.slug, ['parentId']);
  next = replaceSection(next, '题目', `如果面试官追问：${question}`);
  next = replaceSection(next, '答案要点', answerFor(parent, question));
  return next;
}

function withFollowupsMeta(block: Block, followups: string[]): string {
  if (!followups.length) return block.raw;
  return replaceOrInsertMetaLine(block.raw, 'followups', formatInlineList(followups), [
    'followupQuestionIds',
  ]);
}

function withFollowupSection(block: Block, questions: string[]): string {
  if (block.sections['追问']?.trim()) return block.raw;
  const section = `### 追问\n${questions.map((question) => `- ${question}`).join('\n')}\n\n`;
  const extraMatch = block.raw.match(/^###\s+延伸\s*$/m);
  if (extraMatch?.index != null) {
    return `${block.raw.slice(0, extraMatch.index)}${section}${block.raw.slice(extraMatch.index)}`;
  }
  return `${block.raw.replace(/\s+$/, '\n\n')}${section}`;
}

function buildUniqueRefinedQuestions(parent: Block, rawQuestions: string[]): string[] {
  const seen = new Set<string>();
  const refined: string[] = [];
  for (let i = 0; i < rawQuestions.length; i++) {
    const rawQuestion = rawQuestions[i];
    let question = refineFollowupQuestion(rawQuestion, parent, i);
    if (seen.has(question)) {
      for (let retry = 1; retry <= 12; retry++) {
        const retryQuestion = refineFollowupQuestion(rawQuestion, parent, i + retry * 17);
        if (!seen.has(retryQuestion)) {
          question = retryQuestion;
          break;
        }
      }
    }
    if (seen.has(question)) {
      question = `${question}（补充场景 ${i + 1}）`;
    }
    seen.add(question);
    refined.push(question);
  }
  return refined;
}

for (const file of files) {
  const filePath = join(CONTENT_DIR, file);
  const raw = readFileSync(filePath, 'utf8');
  const { before, blocks } = splitBlocks(raw);
  const knownSlugs = new Set(blocks.map((block) => block.slug));
  const blockBySlug = new Map(blocks.map((block) => [block.slug, block]));
  const refinedQuestionsByParent = new Map<string, string[]>();
  const generated: string[] = [];
  const rewritten = blocks.map((block) => {
    if (block.isFollowup) {
      const canRefresh = readMeta(block.metaText, 'generated') === 'followup-script';
      if (!refreshGenerated || !canRefresh) {
        stat.childQuestionsPreserved++;
        return block.raw;
      }
      const parentSlug = (block.parent || '').replace(/^.*\//, '');
      const parent = blockBySlug.get(parentSlug);
      if (!parent) return block.raw;
      const questions =
        refinedQuestionsByParent.get(parent.slug) ||
        buildUniqueRefinedQuestions(
          parent,
          extractFollowupQuestions(parent.sections['追问'], parent.title).slice(
            0,
            MAX_FOLLOWUPS_PER_PARENT,
          ),
        );
      refinedQuestionsByParent.set(parent.slug, questions);
      const index = parent.followups.indexOf(block.slug);
      const suffixMatch = block.slug.match(/-followup-(\d+)$/);
      const fallbackIndex = suffixMatch ? Number(suffixMatch[1]) - 1 : -1;
      const childIndex = index >= 0 ? index : Math.max(fallbackIndex, 0);
      const fallbackQuestion = block.sections['题目']?.replace(/^如果面试官追问：?/, '').trim();
      const rawQuestion = fallbackQuestion || cleanTitle(block.title.replace(/^追问：/, ''));
      const question =
        questions[childIndex] || refineFollowupQuestion(rawQuestion, parent, childIndex);
      stat.childQuestionsRefreshed++;
      return rewriteFollowupBlock(block, parent, question);
    }
    const rawQuestions = extractFollowupQuestions(block.sections['追问'], block.title).slice(
      0,
      MAX_FOLLOWUPS_PER_PARENT,
    );
    const questions = buildUniqueRefinedQuestions(block, rawQuestions);
    const childSlugs = rawQuestions.map((_, index) => `${block.slug}-followup-${index + 1}`);
    let next = block.raw;
    if (!block.sections['追问']?.trim()) {
      next = withFollowupSection({ ...block, raw: next }, rawQuestions);
      stat.followupSectionsAdded++;
    }
    next = withFollowupsMeta({ ...block, raw: next }, childSlugs);
    stat.parentsTouched++;

    for (let i = 0; i < questions.length; i++) {
      const slug = childSlugs[i];
      if (knownSlugs.has(slug)) {
        stat.childQuestionsSkipped++;
        continue;
      }
      knownSlugs.add(slug);
      generated.push(childBlock(block, slug, questions[i]));
      stat.childQuestionsAdded++;
    }
    return next;
  });

  const output = `${before}${rewritten.join('\n')}${generated.length ? `\n${generated.join('\n')}` : ''}`;
  if (output !== raw && !dryRun) writeFileSync(filePath, output);
}

console.log(
  `已处理父题 ${stat.parentsTouched} 道，新增追问段 ${stat.followupSectionsAdded} 个，新增追问题 ${stat.childQuestionsAdded} 道，刷新追问题 ${stat.childQuestionsRefreshed} 道，保留已有追问题 ${stat.childQuestionsPreserved} 道，跳过已有追问题 ${stat.childQuestionsSkipped} 道。`,
);
if (!refreshGenerated)
  console.log(
    '默认不刷新已有追问题；传入 --refresh-generated 只刷新带 generated: followup-script 的题块。',
  );
if (refreshGenerated)
  console.log('已启用 --refresh-generated：仅刷新带 generated: followup-script 的追问题。');
if (dryRun) console.log('dry-run 模式，未写入文件。传入 --write 才会落盘。');
