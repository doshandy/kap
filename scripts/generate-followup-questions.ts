import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCommonScriptArgs, resolveOnlyContentFiles } from './shared/args';
import { canonicalizeFollowupQuestionPattern } from './shared/followupCanonical';
import { replaceOrInsertMetaLine } from './shared/metaLine';

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

function extractFocusCandidates(value: string): string[] {
  const plain = markdownText(value).replace(/「|」/g, ' ');
  return plain.match(/[A-Za-z][A-Za-z0-9_+#./-]{1,}|[\u4e00-\u9fa5]{2,12}/g) || [];
}

function normalizeFocusTerm(value: string): string {
  const normalized = markdownText(value)
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

function pickFocusTerm(block: Block, question: string): string {
  const candidates = [
    ...block.tags,
    ...extractFocusCandidates(normalizeWhatIsTitle(block.title)),
    ...extractFocusCandidates(question),
  ];
  for (const candidate of candidates) {
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

function answerFor(block: Block, question: string): string {
  const normalizedTitle = normalizeWhatIsTitle(block.title);
  const seed = `${block.slug}|${question}|${normalizedTitle}`;
  const focusTerm = pickFocusTerm(block, question);
  const related = relevantLines(block, question);
  const relatedPartLines = related.length
    ? related.map((line) => `- ${line}`)
    : [
        `- 先界定「${normalizedTitle}」在当前业务中的目标，再说明哪些边界条件会让默认方案失效。`,
        `- 把讨论聚焦到 ${focusTerm}：不仅要讲理想链路，还要覆盖失败路径、降级方式和用户可见影响。`,
      ];

  const thinkingLineA = [
    `先给可验证结论，再补证据链：面试官想确认你是否能把「${normalizedTitle}」落到真实交付，而不是停在概念层。`,
    `先明确这道追问要解决的业务目标，再说明「${normalizedTitle}」在当前约束下为什么成立。`,
    `先说判断标准，再说执行路径：回答「${normalizedTitle}」时要能同时解释收益、代价和失败信号。`,
    `先把目标和约束说清楚，再展开实现：这能避免把「${normalizedTitle}」讲成只在理想输入下可用。`,
  ];
  const thinkingLineB = [
    `回答结构可按「触发条件 -> ${focusTerm} 机制 -> 风险兜底」展开，并以「${normalizedTitle}」补一条失败场景，能体现工程拆解能力。`,
    `可以按「问题背景 -> ${focusTerm} 机制 -> 取舍边界」回答，再用「${normalizedTitle}」补一个反例，避免停在口号层。`,
    `建议按「输入约束 -> ${focusTerm} 执行链路 -> 结果验证」展开，并结合「${normalizedTitle}」给出一条可复核结果，能更快体现你对复杂场景的掌控力。`,
    `回答顺序可用「现状问题 -> ${focusTerm} 方案动作 -> 验证结果」，并用「${normalizedTitle}」举一条主链路说明。`,
    `围绕「${normalizedTitle}」组织答案时，建议按「约束来源 -> ${focusTerm} 关键决策 -> 验证闭环」展开。`,
    `讲「${normalizedTitle}」时先给 ${focusTerm} 的判断口径，再补执行动作和回退条件，会更像真实评审发言。`,
  ];
  const thinkingLineC = [
    `如果涉及「${normalizedTitle}」的技术细节，优先讲数据流和状态变化；做方案比较时要说明为何此刻不选替代路径。`,
    `在「${normalizedTitle}」回答里，实现层面要解释 ${focusTerm} 的时序和边界，决策层面要解释成本与风险，二者缺一都会让答案显得单薄。`,
    `讲「${normalizedTitle}」时实现侧重点应放在 ${focusTerm} 与边界输入，决策侧重点应放在收益与维护成本平衡。`,
    `不要只罗列工具名或 API，最好把「${normalizedTitle}」的机制、约束和落地步骤串成完整叙事线。`,
  ];

  const contextBridgeLine = [
    `补一个你真实处理过的「${normalizedTitle}」相似场景：说明 ${focusTerm} 怎么监控、怎么告警、怎么回滚，会比抽象结论更有说服力。`,
    `结合一次「${normalizedTitle}」线上案例说明 ${focusTerm} 的变化轨迹，能让你的答案从“知道原理”升级到“能带队落地”。`,
    `把原题观点放进「${normalizedTitle}」的一个具体版本迭代里，讲清 ${focusTerm} 在发布前后如何验证，会显著提升可信度。`,
    `给出与「${normalizedTitle}」相关的业务上下文，说明 ${focusTerm} 在高峰流量或弱网环境下如何保持稳定，能体现你有实战经验。`,
    `若能补一段「${normalizedTitle}」复盘片段，解释 ${focusTerm} 如何从告警到定位再到修复，可信度会明显上升。`,
  ];

  const landingLineA = [
    `围绕「${normalizedTitle}」设计验证时别停在“写点测试”：至少覆盖正常、边界和失败三类输入，并把 ${focusTerm} 的预期结果写成可复核标准。`,
    `落地「${normalizedTitle}」时先约定验收口径：哪些指标代表成功、哪些异常算失败，再围绕 ${focusTerm} 设计测试与回归流程。`,
    `建议先准备「${normalizedTitle}」的最小可复现样例，再扩展到主链路回归，这样能更快确认 ${focusTerm} 的改动是否真的生效。`,
    `把验证拆成“离线用例 + 集成链路 + 回归检查”，确保「${normalizedTitle}」在 ${focusTerm} 上的优化不是只在 demo 数据下成立。`,
    `针对「${normalizedTitle}」可以先做一次冒烟链路压测，再补边界回归，避免上线后才暴露 ${focusTerm} 的缺口。`,
  ];
  const landingLineB = [
    `围绕「${normalizedTitle}」的观测层要绑定 ${focusTerm} 相关日志与指标：错误率、耗时分位、资源占用和用户可感知延迟，至少选一组长期跟踪。`,
    `在「${normalizedTitle}」落地过程中不要只看单个监控面板，建议把日志、指标和告警串起来，形成 ${focusTerm} 的问题定位闭环。`,
    `围绕「${normalizedTitle}」的线上监控建议同时覆盖成功率、慢请求、异常分布和重试次数，方便判断 ${focusTerm} 的真实收益是否稳定。`,
    `观测口径要前后一致：上线前后使用同一组指标观察「${normalizedTitle}」里的 ${focusTerm}，否则很难证明变化来自这次改动。`,
    `围绕「${normalizedTitle}」建监控时，建议把 ${focusTerm} 指标和业务转化指标并排展示，避免只看技术侧信号。`,
  ];
  const landingLineC = [
    `围绕「${normalizedTitle}」发布时建议保留开关和回滚路径，先灰度到低风险流量，再逐步扩大覆盖范围。`,
    `「${normalizedTitle}」上线节奏建议分批推进：先小流量试运行，再根据告警和反馈决定是否扩容。`,
    `涉及「${normalizedTitle}」的高风险改动时，先准备回滚预案和应急手册，避免问题发生后临时决策。`,
    `如果「${normalizedTitle}」会影响历史数据或兼容性，务必提前说明迁移方案与回退条件。`,
  ];

  const pitfallLineA = [
    `常见误区是把「${normalizedTitle}」讲成通用银弹，忽略输入规模、团队资源和上线窗口这些关键约束。`,
    `最容易失分的是只说「${normalizedTitle}」的推荐做法却不给边界条件，面试官通常会继续追问何时不该这样做。`,
    `很多回答会忽略「${normalizedTitle}」的前置假设，导致方案看起来正确却无法直接执行，这是高频扣分点。`,
    `不要把「${normalizedTitle}」的经验结论当成普适规则，先交代适用范围再给建议，可信度会更高。`,
  ];
  const pitfallLineB = [
    `另一个问题是缺少失败预案：若「${normalizedTitle}」里的 ${focusTerm} 异常时没有降级与回滚说明，答案会显得工程成熟度不足。`,
    `如果没说明「${normalizedTitle}」里 ${focusTerm} 的异常处理和兜底路径，方案一旦遇到突发流量或外部依赖抖动就会站不住脚。`,
    `只关注「${normalizedTitle}」里 ${focusTerm} 的主流程而忽略异常路径，会让答案在“可维护性”和“线上稳定性”两个维度同时失分。`,
    `若没有针对「${normalizedTitle}」里的 ${focusTerm} 明确告警阈值和恢复动作，即便方案思路正确，也难体现生产掌控力。`,
    `若没说明「${normalizedTitle}」在 ${focusTerm} 失效时的回退策略，面试官通常会质疑方案是否可上线。`,
  ];
  const pitfallLineC = [
    `避免把「${normalizedTitle}」说成“总是”“一定”“完全替代”，改成“在这些条件下优先采用”更专业。`,
    `表达「${normalizedTitle}」时尽量少用绝对词，增加可验证条件与例外场景，答案会更稳健。`,
    `不要把「${normalizedTitle}」结论说死，给出条件范围和替代路径，能显著降低回答被反例击穿的概率。`,
    `保持「${normalizedTitle}」结论可检验、可回退，比强调某个方案“最优”更能体现资深判断。`,
  ];

  return `#### 回答思路
- ${pickBySeed(thinkingLineA, seed, 1)}
- ${pickBySeed(thinkingLineB, seed, 2)}
- ${pickBySeed(thinkingLineC, seed, 3)}

#### 结合原题展开
${relatedPartLines.join('\n')}
- ${pickBySeed(contextBridgeLine, seed, 4)}

#### 工程落地
- ${pickBySeed(landingLineA, seed, 5)}
- ${pickBySeed(landingLineB, seed, 6)}
- ${pickBySeed(landingLineC, seed, 7)}

#### 易错点
- ${pickBySeed(pitfallLineA, seed, 8)}
- ${pickBySeed(pitfallLineB, seed, 9)}
- ${pickBySeed(pitfallLineC, seed, 10)}`;
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
