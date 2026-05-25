import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCommonScriptArgs, resolveOnlyContentFiles } from './shared/args';
import {
  BANNED_TEMPLATE_PHRASES,
  FOLLOWUP_ACTION_KEYWORDS,
  FOLLOWUP_RISK_KEYWORDS,
  FOLLOWUP_VERIFY_KEYWORDS,
  containsAnyKeyword,
  normalizeQualityText,
} from './shared/answerQuality';

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
  question: string;
  answer: string;
}

type FollowupIntent = 'implementation' | 'reason' | 'verify' | 'tradeoff' | 'rollout' | 'risk';

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
  answersRewritten: 0,
  followupsRewritten: 0,
  baseRewritten: 0,
};

const GENERATED_HEADINGS = new Set([
  '标准补充（边界/失败/取舍）',
  '标准回答（直接作答）',
  '关键细节（可追问）',
  '回答思路',
  '结合原题展开',
  '工程落地',
  '易错点',
  '核心回答',
  '学习抓手',
  '工程化补充',
  '补充说明',
  '直答',
  '术语解释',
  '落地步骤',
  '风险与验收',
  '边界与验收',
]);

const GENERATED_LINE_PREFIXES = [
  '场景前提：',
  '实施步骤：',
  '失败风险：',
  '验收信号：',
  '追问核心：',
  '第一步：',
  '第二步：',
  '第三步：',
];

const WEAK_LINE_PATTERNS = [
  /^面试中不要只停留在/,
  /^回答「/,
  /^这题围绕/,
  /^这里的.+是/,
  /^围绕「.+」直接回答：先/,
  /^先确定指标口径，再补日志与测试证据，最后按阈值做继续\/回退决策/,
  /^围绕 .+先对比短期收益和长期负担，再给明确切换条件/,
  /^先演练 .+的失败场景，再配置降级和兜底动作，最后确认恢复路径/,
  /^验收至少包含回归用例、线上监控和告警阈值，三条证据都达标才收口/,
  /^围绕实施结果要同时看测试通过率、错误率和时延变化，确保改动真实生效/,
  /^验收要同时满足“指标达标 \+ 日志一致 \+ 测试通过”，缺一不可/,
  /^验证闭环包含阈值、证据和回归结果，三者一致才可继续放量/,
  /^验收看收益与成本两条曲线：收益稳定且维护成本可控才保留当前方案/,
  /^验收需同时对比收益提升和维护成本变化，确保取舍结论可持续/,
  /^围绕取舍结果至少给收益趋势、成本趋势和回归稳定性三组数据/,
  /^先排查 .+ 现状，再实施改动并验证结果，异常时立即回滚/,
  /^若 .+ 没有明确回退策略，发布失败后会出现恢复窗口过长的问题/,
  /^围绕 .+ 的实施结果要同时看测试通过率、错误率和时延变化，确保改动真实生效/,
  /^围绕 .+ 至少给一组指标阈值、一条日志证据和一组测试结果/,
  /^.+ 验收要同时满足“指标达标 \+ 日志一致 \+ 测试通过”，缺一不可/,
  /^验收 .+ 时要同时看测试通过率、错误率和时延变化，确保改动真实生效/,
  /^.+ 验证要给“指标阈值 \+ 监控信号 \+ 回归结果”三件套/,
  /^.+ 发布先灰度后放量，每批次都有验收门槛和回滚开关，确保迁移可控/,
  /^.+ 发布路径用“低风险流量试点 -> 分批放量 -> 异常即回退”/,
  /^.+ 一旦异常要明确止损、回退和恢复路径，三者缺一不可/,
  /^围绕 .+ 先做基线采集，再做最小改动验证，最后按门槛决定继续放量或回退/,
  /^先给 .+ 的触发条件，再解释机制和反例，避免只给抽象结论/,
  /^.+ 的关键差别不在表面功能，而在适用边界、维护成本和失败后果；按这三项比较再决策/,
  /^先算 .+ 的收益提升、维护成本、回滚复杂度三本账；收益连续达标再推进，否则保留现方案/,
];

const MAIN_WEAK_LINE_PATTERNS = [
  /^面试中不要只停留在/,
  /^场景前提：.*不要只讲理想链路/,
  /^场景前提：.*不要只给样例路径/,
  /^实施步骤：.*先复现现状.*最后补回归/,
  /^实施步骤：.*先说触发条件.*再解释机制.*再给反例/,
  /^实施步骤：.*前提 -> 机制 -> 失效场景/,
  /^实施步骤：.*先把 .+ 拆成可执行子步骤/,
  /^实施步骤：.*先枚举高风险失败模式.*降级.*兜底/,
  /^实施步骤：.*可复现样例.*指标监控.*告警阈值/,
  /^实施步骤：.*不要只给方向不写执行细节/,
  /^实施步骤：.*避免“只测主路径”/,
];

const ACTION_PICK_KEYWORDS = [
  '排查',
  '实施',
  '落地',
  '推进',
  '灰度',
  '回滚',
  '回退',
  '迁移',
  '演练',
  '监控',
];

const VERIFY_STRONG_KEYWORDS = [
  '指标',
  '日志',
  '监控',
  '告警',
  '成功率',
  '错误率',
  '命中率',
  '耗时',
  '分位',
  '验收',
];

const GENERIC_TERMS = new Set([
  '如何',
  '怎么',
  '什么',
  '为什么',
  '哪些',
  '如果',
  '当',
  '是否',
  '方案',
  '问题',
  '场景',
  '项目',
  '业务',
  '团队',
  '模块',
  '机制',
  '流程',
  '系统',
  '能力',
  '约束',
  '实现',
  '策略',
  '核心',
  '关键',
  '优化',
  '追问',
  '结论',
  '动作',
  '风险',
  '验收',
  '结合真实业务约束',
  '从工程落地角度看',
  '在当前团队与业务约束下',
  '在当前团队约束下',
  '以示例',
  '以项目为例',
  '真实业务约束',
  '工程落地角度',
  '团队与业务约束',
]);

const GENERIC_FOCUS_TERMS = new Set([
  ...GENERIC_TERMS,
  '类型',
  '对象',
  '数组',
  '异步',
  '模块化',
  '设计模式',
  '架构',
  '工程',
  '手写',
  '兼容治理',
  '升级治理',
  '技术债治理',
  '类型治理',
  '异常治理',
  '关键链路',
]);

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

function markdownPlain(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeTitle(value: string): string {
  return value
    .trim()
    .replace(/^追问：\s*/, '')
    .replace(/\s*是\s*什么$/, '')
    .replace(/[？?。!！]+$/g, '')
    .trim();
}

function normalizeFollowupQuestion(value: string): string {
  return markdownPlain(value)
    .replace(/^如果面试官追问[:：]\s*/, '')
    .replace(/[？?。]+$/g, '')
    .trim();
}

function inferFollowupIntent(question: string): FollowupIntent {
  const text = markdownPlain(question);
  const stripped = text.replace(/「[^」]{2,120}」/g, ' ');
  if (/指标|验证|证明|监控|告警|测试|验收|日志|趋势|观测|信号|估算|计算/.test(stripped))
    return 'verify';
  if (/取舍|成本|收益|权衡|利弊|该不该选|最佳选择|选型|团队阶段/.test(stripped)) return 'tradeoff';
  if (/上线|灰度|回滚|迁移|发布/.test(stripped)) return 'rollout';
  if (
    /风险|异常|故障|安全|失败|兜底|降级|边界问题|边界条件|可靠性开关|开关|熔断|止损|抖动|限流|击穿|陷阱|复杂度坑/.test(
      stripped,
    )
  )
    return 'risk';
  if (/为什么|原因|本质|区别|差别|关系|原理|能替代|替代|适合/.test(stripped)) return 'reason';
  return 'implementation';
}

function repairBrokenFragments(value: string): string {
  return value
    .replace(/（如\s*）/g, '（如 `T extends { id: string }`）')
    .replace(/默认值（\s*）/g, '默认值（如 `T = unknown`）')
    .replace(
      /在 \/ 上加 integrity 属性指定文件的 hash/g,
      '在 script 标签 / link 标签上加 integrity 属性指定文件 hash',
    )
    .replace(
      /text\s*→\s*，mention\s*→\s*，link\s*→/g,
      'text -> 纯文本节点，mention -> @用户组件，link -> 可点击链接组件',
    )
    .replace(/永远不会有\s+跑出来/g, '永远不会有 script 标签跑出来');
}

function cleanLine(value: string): string {
  return repairBrokenFragments(markdownPlain(value))
    .replace(/^[-*]\s+/, '')
    .replace(/^[0-9]+[.)、]\s+/, '')
    .replace(/^####\s+/, '')
    .replace(/^直接结论[:：]\s*/, '')
    .replace(/^直接回答[:：]\s*/, '')
    .replace(/^结论[:：]\s*/, '')
    .replace(/^关键原因[:：]\s*/, '')
    .replace(/^关键动作[:：]\s*/, '')
    .replace(/^主要风险[:：]\s*/, '')
    .replace(/^验收信号[:：]\s*/, '')
    .replace(/^边界条件[:：]\s*/, '')
    .replace(/^验收方式[:：]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isMainWeakLine(value: string): boolean {
  const text = cleanLine(value);
  if (!text) return false;
  return MAIN_WEAK_LINE_PATTERNS.some((pattern) => pattern.test(text));
}

function cleanMainAnswer(answer: string): string {
  const lines = answer.split(/\r?\n/);
  const kept: string[] = [];
  let changed = false;
  for (const line of lines) {
    if (isMainWeakLine(line)) {
      changed = true;
      continue;
    }
    kept.push(line);
  }
  if (!changed) return answer;
  const cleaned = kept
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!cleaned || cleaned.length < 40) return answer;
  return cleaned;
}

function isWeakCandidateLine(value: string): boolean {
  const text = cleanLine(value);
  if (!text) return true;
  return WEAK_LINE_PATTERNS.some((pattern) => pattern.test(text));
}

function stripGeneratedSections(answer: string): string {
  const lines = answer.split(/\r?\n/);
  const out: string[] = [];
  let skipping = false;
  for (const line of lines) {
    const heading = line
      .trim()
      .match(/^####\s+(.+?)\s*$/)?.[1]
      ?.trim();
    if (heading && GENERATED_HEADINGS.has(heading)) {
      skipping = true;
      continue;
    }
    if (heading && skipping) {
      skipping = false;
    }
    if (!skipping) out.push(line);
  }
  return out
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractCandidateLines(answer: string): string[] {
  const cleaned = stripGeneratedSections(answer);
  const lines = cleaned.split(/\r?\n/);
  const out: string[] = [];
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
    if (inFence || /^#{2,}\s+/.test(line.trim())) continue;
    const normalized = cleanLine(line);
    if (!normalized || normalized.length < 8) continue;
    if (GENERATED_LINE_PREFIXES.some((prefix) => normalized.startsWith(prefix))) continue;
    if (BANNED_TEMPLATE_PHRASES.some((phrase) => normalized.includes(phrase))) continue;
    out.push(normalized);
  }

  return [...new Set(out)];
}

function replaceSection(raw: string, name: string, body: string): string {
  const re = new RegExp(`^###\\s+${name}\\s*$`, 'm');
  const match = raw.match(re);
  if (!match?.index && match?.index !== 0) return raw;
  const start = match.index + match[0].length;
  const rest = raw.slice(start);
  const next = rest.search(/^###\s+/m);
  const end = next >= 0 ? start + next : raw.length;
  return `${raw.slice(0, start)}\n\n${body.trim()}\n\n${raw.slice(end).replace(/^\s+/, '')}`;
}

function ensureSentence(value: string): string {
  const text = cleanLine(value);
  if (!text) return '';
  if (/[。！？!?]$/.test(text)) return text;
  return `${text}。`;
}

function tokenize(value: string): string[] {
  return (
    markdownPlain(value).match(/[A-Za-z][A-Za-z0-9_+#./-]{1,}|[\u4e00-\u9fa5]{2,10}/g) || []
  ).map((token) => token.toLowerCase());
}

function hashText(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickBySeed(options: string[], seed: string): string {
  if (!options.length) return '';
  return options[hashText(seed) % options.length];
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

function scoreLine(line: string, context: string): number {
  const lineTokens = tokenize(line);
  if (!lineTokens.length) return 0;
  const contextSet = new Set(tokenize(context));
  let score = 0;
  for (const token of lineTokens) {
    if (contextSet.has(token)) score += 2;
  }
  if (/因为|所以|导致|通过|先|再|最后|如果|否则/.test(line)) score += 1;
  if (line.length >= 24) score += 1;
  if (line.length >= 40) score += 1;
  return score;
}

function pickBestLine(lines: string[], context: string, fallback: string): string {
  if (!lines.length) return fallback;
  let best = lines[0];
  let bestScore = scoreLine(lines[0], context);
  for (let i = 1; i < lines.length; i++) {
    const score = scoreLine(lines[i], context);
    if (score > bestScore) {
      best = lines[i];
      bestScore = score;
    }
  }
  return best || fallback;
}

function pickLineByKeywords(
  lines: string[],
  keywords: string[],
  context: string,
): string | undefined {
  const candidates = lines.filter((line) => {
    if (isWeakCandidateLine(line)) return false;
    return containsAnyKeyword(normalizeQualityText(line), keywords);
  });
  if (!candidates.length) return undefined;
  return pickBestLine(candidates, context, candidates[0]);
}

function pickVerifyLine(lines: string[], context: string): string | undefined {
  const candidates = lines.filter((line) => {
    if (isWeakCandidateLine(line)) return false;
    const normalized = normalizeQualityText(line);
    if (containsAnyKeyword(normalized, VERIFY_STRONG_KEYWORDS) && normalized.length >= 14) {
      return true;
    }
    return (
      normalized.includes('测试') &&
      containsAnyKeyword(normalized, ['回归', '覆盖', '用例', '验收', '监控'])
    );
  });
  if (!candidates.length) return undefined;
  return pickBestLine(candidates, context, candidates[0]);
}

function normalizeFocusCandidate(value: string): string {
  const normalized = markdownPlain(value)
    .replace(/[「」"'`]/g, ' ')
    .replace(/[（(][^()（）]{0,24}[)）]/g, ' ')
    .replace(/[，。！？?：:；;、]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return '';
  if (normalized.length < 2 || normalized.length > 28) return '';
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
    /^(在|从|以|围绕|结合|针对|对于|如果|当|真要|为了|你会|如何|哪些|什么|是否)/.test(normalized)
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
    const normalized = normalizeFocusCandidate(raw);
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

  const plain = markdownPlain(text);
  const pairSource = plain.replace(/<[^>]{0,16}>/g, '');
  for (const pair of pairSource.matchAll(
    /([A-Za-z][A-Za-z0-9_+#./-]{1,24}|[\u4e00-\u9fa5]{2,20})\s*(?:和|与|vs|VS|\/)\s*([A-Za-z][A-Za-z0-9_+#./-]{1,24}|[\u4e00-\u9fa5]{2,20})/g,
  )) {
    push(`${pair[1]} 与 ${pair[2]}`);
    push(pair[1]);
    push(pair[2]);
  }
  if (includeLooseTokens) {
    for (const token of plain.match(/[A-Za-z][A-Za-z0-9_+#./-]{1,}|[\u4e00-\u9fa5]{2,12}/g) || []) {
      push(token);
    }
  }
  return [...new Set(terms)];
}

function pickFocusTerm(...parts: string[]): string {
  if (!parts.length) return '关键链路';
  const [questionPart, topicPart, ...rest] = parts;
  for (const term of extractPriorityFocusTerms(questionPart || '', false)) {
    return term;
  }
  for (const term of extractPriorityFocusTerms(topicPart || '', true)) {
    return term;
  }
  for (const part of rest) {
    for (const term of extractPriorityFocusTerms(part || '', true)) {
      return term;
    }
    const candidates = markdownPlain(part || '').match(
      /[A-Za-z][A-Za-z0-9_+#./-]{1,}|[\u4e00-\u9fa5]{2,12}/g,
    );
    for (const candidate of candidates || []) {
      const normalized = normalizeFocusCandidate(candidate);
      if (normalized) return normalized;
    }
  }
  for (const term of extractPriorityFocusTerms(questionPart || '', true)) {
    return term;
  }
  return '关键链路';
}

function extractTerms(question: string, title: string, tags: string[], fallback: string): string[] {
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
  for (const tag of tags) terms.add(tag.trim());
  for (const token of (question.match(/[A-Za-z][A-Za-z0-9_+#./-]{1,18}/g) || []).slice(0, 8)) {
    terms.add(token.trim());
  }
  const cleaned = [...terms].filter((term) => {
    if (!term) return false;
    if (term.length < 2 || term.length > 32) return false;
    if (/[\u4e00-\u9fa5]/.test(term) && term.length > 10) return false;
    if (GENERIC_TERMS.has(term)) return false;
    if (TERM_STOPWORDS.has(term)) return false;
    if (/^如果面试官追问/.test(term)) return false;
    if (/^\S+\s+\S+\s+\S+\s+\S+/.test(term) && !/[\u4e00-\u9fa5]/.test(term)) return false;
    if (/^(在|从|以|围绕|结合|针对|对于)/.test(term) && term.length >= 4) return false;
    if (/真实业务|工程落地|团队与业务约束|场景下|角度看/.test(term)) return false;
    if (/^[0-9]+$/.test(term)) return false;
    return true;
  });
  if (!cleaned.length) return [fallback];
  return cleaned.slice(0, 3);
}

interface TermExplainContext {
  topic: string;
  questionText: string;
  focus: string;
  intent: FollowupIntent;
}

function buildTermFallback(term: string, context: TermExplainContext): string {
  const map: Record<FollowupIntent, string[]> = {
    implementation: [
      `在「${context.topic}」这题里，${term} 是要落地的核心对象，回答时要给执行步骤、改动边界和完成标准。`,
      `围绕「${context.topic}」里的 ${term} 作答时，要说明由谁实施、怎么落地、失败后如何回退。`,
    ],
    reason: [
      `在「${context.topic}」里，${term} 是因果链关键变量，需要说明触发条件、机制和反例。`,
      `${term} 决定「${context.topic}」为什么会这样，回答时要把原因和失效前提讲清楚。`,
    ],
    verify: [
      `在「${context.topic}」里，${term} 是验收对象，必须给可量化指标、日志信号和测试证据。`,
      `围绕「${context.topic}」里的 ${term} 验证时，要明确“达标阈值”和“不达标时的回退动作”。`,
    ],
    tradeoff: [
      `在「${context.topic}」里，${term} 是取舍变量，要同时比较收益、成本和长期维护复杂度。`,
      `围绕「${context.topic}」里的 ${term} 评估时，不能只讲优点，还要给切换条件和止损阈值。`,
    ],
    rollout: [
      `在「${context.topic}」里，${term} 是发布迁移关键对象，要说明灰度节奏、回滚开关和兼容策略。`,
      `围绕「${context.topic}」里的 ${term} 推进上线时，要明确每个批次的放量门槛和回退条件。`,
    ],
    risk: [
      `在「${context.topic}」里，${term} 是高风险点，要说明最坏失败模式、降级动作和恢复路径。`,
      `围绕「${context.topic}」里的 ${term} 作答时，需要给“风险触发信号 -> 兜底动作 -> 恢复验收”的闭环。`,
    ],
  };
  return pickBySeed(
    map[context.intent],
    `${context.topic}|${context.questionText}|${term}|fallback-term`,
  );
}

function buildTermExplanation(term: string, lines: string[], context: TermExplainContext): string {
  const fixed = FIXED_TERM_EXPLANATIONS[term.toLowerCase()];
  if (fixed?.length) {
    const chosen = pickBySeed(fixed, `${context.topic}|${context.questionText}|${term}|fixed-term`);
    if (/^在「.+」/.test(chosen)) return chosen;
    return `在「${context.topic}」场景里，${chosen}`;
  }
  const hit = lines.find((line) => {
    if (!line.includes(term)) return false;
    if (isWeakCandidateLine(line)) return false;
    if (line.length < 10 || line.length > 92) return false;
    if (/在这题里指影响结论成立的关键约束/.test(line)) return false;
    if (/面试中不要只停留在/.test(line)) return false;
    return true;
  });
  if (hit) {
    const cleaned = ensureSentence(hit).replace(/^[^：:]{1,16}[：:]\s*/, '');
    if (cleaned && cleaned.length >= 10) return cleaned;
  }
  if (/^[A-Z][A-Za-z0-9_+#./-]*$/.test(term)) {
    return `${term} 是「${context.topic}」里的关键技术对象，需要说明接入边界、调用方式和失败回退。`;
  }
  if (term === context.focus) {
    return pickBySeed(
      [
        `在「${context.topic}」这道追问里，${term} 是执行抓手：需要明确触发条件、实施步骤和验收信号。`,
        `${term} 是「${context.topic}」的关键决策点，回答时要把动作、风险和回退条件讲完整。`,
        `围绕「${context.topic}」里的 ${term} 作答时，要给可落地动作，并说明异常处理与验收阈值。`,
      ],
      `${context.topic}|${context.questionText}|${term}|focus-term`,
    );
  }
  return buildTermFallback(term, context);
}

function buildTermLines(
  terms: string[],
  lines: string[],
  fallbackTopic: string,
  context: TermExplainContext,
): string[] {
  const picked = terms.length ? terms : [fallbackTopic];
  return picked
    .slice(0, 3)
    .map((term) => `- ${term}：${buildTermExplanation(term, lines, context)}`);
}

function ensureActionLine(value: string, fallback: string): string {
  const normalized = ensureSentence(value);
  if (containsAnyKeyword(normalizeQualityText(normalized), FOLLOWUP_ACTION_KEYWORDS)) {
    return normalized;
  }
  const fallbackNormalized = ensureSentence(fallback);
  if (containsAnyKeyword(normalizeQualityText(fallbackNormalized), FOLLOWUP_ACTION_KEYWORDS)) {
    return fallbackNormalized;
  }
  return ensureSentence(
    `${fallbackNormalized.replace(/[。！？!?]+$/g, '')}，并推进排查、实施与回退验证`,
  );
}

function ensureRiskLine(value: string, fallback: string): string {
  const normalized = ensureSentence(value);
  if (containsAnyKeyword(normalizeQualityText(normalized), FOLLOWUP_RISK_KEYWORDS)) {
    return normalized;
  }
  return ensureSentence(fallback);
}

function ensureVerifyLine(value: string, fallback: string): string {
  const normalized = ensureSentence(value);
  if (containsAnyKeyword(normalizeQualityText(normalized), FOLLOWUP_VERIFY_KEYWORDS)) {
    return normalized;
  }
  return ensureSentence(fallback);
}

function preferStrongLine(selected: string, fallback: string): string {
  const normalized = ensureSentence(selected);
  if (!normalized || normalized.length < 14 || isWeakCandidateLine(normalized)) {
    return ensureSentence(fallback);
  }
  return normalized;
}

function isActionableDirect(intent: FollowupIntent, value: string): boolean {
  const text = ensureSentence(value);
  const normalized = normalizeQualityText(text);
  if (intent === 'implementation') {
    const strongActionRegex =
      /排查|验证|实施|推进|拆分|拆解|灰度|回滚|回退|恢复|监控|补齐|补充|迁移|收敛|演练|止损|改造|收紧|估算|校准|观察|比较/;
    if (
      /(先|再|最后|按|分批|逐步|优先|建议|需要|必须|应当|可先|先把|先补|先做)/.test(text) &&
      strongActionRegex.test(text)
    ) {
      return true;
    }
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

function buildQuestionSpecificDirect(
  intent: FollowupIntent,
  topic: string,
  questionText: string,
  focus: string,
): string | undefined {
  if (/declare module.*svg|declare module.+原理/.test(questionText)) {
    return `declare module 的作用是给非 TS 资源补类型声明，让编译器知道导入值的形状并通过类型检查。`;
  }
  if (/什么时候用.*什么时候/.test(questionText) && /容器查询|媒体查询/.test(questionText)) {
    return `组件内部随容器尺寸变化用容器查询；全局断点和页面级布局切换仍用媒体查询。`;
  }
  if (
    /Style Queries/.test(questionText) &&
    /CSS Variables/.test(questionText) &&
    /关系/.test(questionText)
  ) {
    return `CSS Variables 负责承载可变设计 token，Style Queries 负责读取样式状态做条件分支，两者组合实现“变量驱动 + 条件选择”。`;
  }
  if (/为什么不直接用\s*esbuild|源码不也用\s*esbuild/.test(questionText)) {
    return `esbuild 适合快编译，但生产构建还需要成熟插件生态、产物优化与兼容控制，所以通常由 Rollup 或 Rolldown 承担。`;
  }
  if (
    /动态 import 失败|旧版本 chunk|动态加载/.test(questionText) &&
    /预算收紧|兼容性要求提升|实施节奏|方案边界/.test(questionText)
  ) {
    return `先补版本探测与自动刷新兜底，再按“关键路由优先预加载、低频模块懒加载”的节奏收敛动态加载成本。`;
  }
  if (/60 秒|60秒|一分钟|压缩一个复杂项目回答/.test(questionText)) {
    return `先讲项目目标与结果，再给你主导的关键动作和量化收益，最后补一个可追问点，控制在 60 秒内。`;
  }
  if (/草稿丢失|本地数据损坏/.test(questionText)) {
    return `先把草稿写入可恢复存储并附版本号校验，提交前做冲突合并，异常时按快照回放恢复。`;
  }
  if (/key 池|负载均衡/.test(questionText)) {
    return `key 池负载要按成功率和时延动态分流，单 key 异常即摘除并走备用池，恢复后再逐步回切。`;
  }
  if (/数据量、并发量或页面复杂度扩大一个数量级/.test(questionText)) {
    return `规模扩大时先做分层缓存和批量计算，把高成本计算移出主线程，并按并发阈值分级降载。`;
  }
  if (
    /判据|验证面板|可复核|证明.*有效|证据|组合验证|共同证明|测试.*日志.*指标|日志.*指标/.test(
      questionText,
    )
  ) {
    return pickBySeed(
      [
        `先约定「${topic}」的功能正确、性能稳定、业务结果三组阈值，再用日志链路和回归结果交叉验证。`,
        `验证「${topic}」时先对齐成功率、错误率、P95 耗时三项，再用关键日志和测试证据做复核。`,
        `先定「${topic}」验收阈值与采样窗口，再把监控曲线、日志证据、回归结果放在同一时间轴核对。`,
      ],
      `${questionText}|verify-proof-direct`,
    );
  }
  if (/灰度节奏|回滚条件|迁移路径|分阶段止损|实施阶段|发布节奏/.test(questionText)) {
    return pickBySeed(
      [
        `把「${topic}」发布拆成“试点灰度 -> 扩量观察 -> 全量收口”三阶段，每阶段绑定门槛和回滚动作。`,
        `先小流量验证「${topic}」主链路，再分批扩量；任一批次越阈值立即回滚并保留旧链路兜底。`,
        `「${topic}」上线节奏按“低风险流量试点、分阶段放量、稳定后全量”推进，异常批次立即止损。`,
      ],
      `${questionText}|rollout-direct`,
    );
  }
  if (/落地风险|约束是否成立|边界条件击穿|最容易失效|稳定上线|上线前.*先验/.test(questionText)) {
    return pickBySeed(
      [
        `围绕「${topic}」先盘点输入边界、并发峰值和失败回退三类约束，逐项压测与演练，通过后再上线。`,
        `「${topic}」落地前先做高风险路径演练，确认异常可发现、可止损、可恢复，再推进发布。`,
        `先列「${topic}」最坏失败模式并补齐降级兜底，关键链路连续稳定后再扩大影响面。`,
      ],
      `${questionText}|risk-direct`,
    );
  }
  if (/重排方案优先级|调整方案边界|调整.*实施节奏|规模.*变化|预算收紧/.test(questionText)) {
    return pickBySeed(
      [
        `「${topic}」约束变化时先保主链路与稳定性，再按收益/成本比重排任务，延后高成本低收益项。`,
        `先冻结「${topic}」高风险改造，优先交付刚需能力，再按风险分层逐步恢复后续优化项。`,
        `「${topic}」在规模或预算变化时按“保可用、控成本、再优化”顺序推进，避免一次性大改引发连锁风险。`,
      ],
      `${questionText}|reprioritize-direct`,
    );
  }
  if (/复杂度相关边界/.test(questionText)) {
    return `优先排查 ${focus} 的最坏输入规模、重复访问热点和队列峰值，确认时间与空间复杂度不会击穿预算。`;
  }
  if (/数据规模扩大/.test(questionText)) {
    return `数据规模放大时，先把 ${focus} 的邻接结构和访问索引换成低开销实现，再加分批处理避免主线程阻塞。`;
  }
  if (/校验与断言|高价值校验/.test(questionText)) {
    return `先补 ${focus} 的边界输入断言、随机对拍和回归用例三类证据，确保结论可复核而不是样例跑通。`;
  }
  if (/Hooks/.test(questionText) && /哪些 state|渲染边界|最容易出问题/.test(questionText)) {
    return `Hooks 场景优先排查条件渲染里的状态漂移、闭包旧值和副作用依赖遗漏，这三类最容易触发错位更新。`;
  }
  if (/状态纠缠|降低调试复杂度/.test(questionText)) {
    return `先按“页面路由状态、服务端数据状态、本地交互状态”三层拆边界，再为每层定义单向数据流，调试复杂度会明显下降。`;
  }
  if (/该不该选|最佳选择|不同团队阶段/.test(questionText)) {
    return `做 ${focus} 选型时，团队经验不足优先低心智负担方案；复杂度上升后再切到扩展性更强的方案。`;
  }
  if (/边界问题|重点排查|排查哪些|排查哪/.test(questionText)) {
    return `先排查 ${focus} 在弱网、断连、限流与重试场景下的边界失效点，按影响面排序逐项止损。`;
  }
  if (/收紧哪几个|可靠性开关|收紧.*开关/.test(questionText)) {
    return `先收紧 ${focus} 的超时阈值、重试上限、熔断开关和降级开关，再观察错误率与恢复时长。`;
  }
  if (/哪些告警|哪些日志|趋势指标|重点关注哪些.*指标|重点关注哪些.*告警/.test(questionText)) {
    return `优先盯 ${focus} 的错误率、超时率、重试成功率和回滚次数，并用关键日志核对异常路径是否收敛。`;
  }
  if (/区别|差别|关系|能替代|适合/.test(questionText)) {
    return `回答 ${focus} 的区别时，先讲语义差异，再讲运行时影响，最后给按场景落地的选型结论。`;
  }
  if (/怎么估算|如何估算|估算|怎么算|怎么计算|如何计算/.test(questionText)) {
    return `先按 ${focus} 的输入长度、输出上限和并发量估算 token 区间，再用真实请求日志校准预算与阈值。`;
  }
  if (/哪些环节|哪些点|哪几段|哪几个/.test(questionText)) {
    return `先处理 ${focus} 的高频链路、错误率高的边界分支和回滚成本最低的改造点，低频优化后置。`;
  }
  if (/取舍|权衡|打架|利弊/.test(questionText)) {
    return `先量化 ${focus} 的收益上限、维护成本和故障代价，再按阈值决定继续投入还是止损切换。`;
  }
  if (/同步规划|效果评估|成本控制|安全策略|组合规则校验|重试|人工审核/.test(questionText)) {
    return `${focus} 方案按效果、成本、安全三线并行：效果看核心指标，成本设预算阈值，安全加规则校验与人工抽检，任一不达标都不放量。`;
  }
  if (/拆成几段|分阶段|几段推进|每段都能独立验收/.test(questionText)) {
    return `把 ${focus} 拆成“基线采集 -> 小流量试点 -> 分批放量”三段推进，每段都绑定独立验收门槛和回滚开关。`;
  }
  if (intent === 'verify' && /真实设备|真实网络|线上|弱网|真机/.test(questionText)) {
    return `在真机与弱网回放下，对比 ${focus} 的核心指标、错误率和耗时分位，连续达标后再认定收益成立。`;
  }
  if (intent === 'risk' && /上线|发布/.test(questionText)) {
    return `上线前先按 ${focus} 风险分级做演练，配置降级与回滚开关，确认故障可止损后再放量。`;
  }
  return undefined;
}

function buildFollowupFallbackDirect(
  intent: FollowupIntent,
  topic: string,
  questionText: string,
  focus: string,
): string {
  const specific = buildQuestionSpecificDirect(intent, topic, questionText, focus);
  if (specific) return specific;
  const variants: Record<FollowupIntent, string[]> = {
    implementation: [
      `先拆分 ${focus} 的执行步骤，逐步实施并在每步后验证，异常立即回滚。`,
      `把 ${focus} 拆成“现状排查 -> 最小改动 -> 验收回归”三段执行，任何一段异常都要可回退。`,
      `先锁定 ${focus} 现状，再按批次实施改动，验收不过立即回滚。`,
      `先把 ${focus} 的核心链路拆成小步快跑任务，每步验收后再推进下一步，异常立即止损。`,
      `先画出 ${focus} 的主链路时序，再按风险分层改造并逐层验收，未达标立即回退。`,
      `先梳理 ${focus} 的输入边界与失败路径，再逐段落地改造，确保每段都可独立回滚。`,
    ],
    reason: [
      `解释 ${focus} 时先给结论，再补触发前提、作用机制和失效边界，避免只背定义。`,
      `${focus} 的原因要落到“为什么会发生、何时会失效、如何规避”三点，缺一都不完整。`,
      `回答 ${focus} 的原理时要同时给成因、影响范围和替代方案，才算可落地。`,
    ],
    verify: [
      `先定义 ${focus} 的目标阈值（正确率、错误率、P95），再用日志链路和回归结果交叉验证。`,
      `验证 ${focus} 时至少同时看功能通过率、线上错误率和耗时分位，三项持续达标才算成立。`,
      `把 ${focus} 的验证拆成离线回归、灰度观测、全量复盘三段，任一不达标都要止损。`,
    ],
    tradeoff: [
      `先量化 ${focus} 的收益上限和维护成本下限，再给继续投入或止损切换的阈值。`,
      `评估 ${focus} 时要把开发成本、运行成本和故障代价放在同一张表里比较。`,
      `${focus} 取舍必须同时给短期交付收益和长期维护负担，并明确触发切换条件。`,
    ],
    rollout: [
      `把 ${focus} 上线拆成试点、扩量、全量三阶段，每阶段都绑定错误率门槛和回滚动作。`,
      `先让 ${focus} 走小流量灰度，观察成功率与告警，再决定是否继续扩量。`,
      `${focus} 迁移阶段必须保留旧链路兜底，直到新链路在目标指标上连续稳定。`,
    ],
    risk: [
      `先列出 ${focus} 的高危失败点，再准备降级开关、兜底路径和恢复 SOP。`,
      `${focus} 的核心风险是异常扩散，必须配置限流与熔断来保护主链路。`,
      `上线 ${focus} 前先做故障演练，确认“能发现、能止损、能恢复”三项都达标。`,
    ],
  };
  return pickBySeed(variants[intent], `${topic}|${questionText}|${focus}|fallback-direct`);
}

function buildFollowupFallbackAction(
  intent: FollowupIntent,
  topic: string,
  questionText: string,
  focus: string,
): string {
  const variants: Record<FollowupIntent, string[]> = {
    implementation: [
      `先梳理 ${focus} 现状链路与失败点，再实施最小改动并验证结果，异常时立即回滚。`,
      `先明确 ${focus} 的输入边界，再按最小改动落地，最后补回归与回退预案。`,
      `把「${topic}」里的 ${focus} 拆成可执行子任务，逐条实施并记录验收结果，异常批次立即终止。`,
      `先定位 ${focus} 的高风险步骤，再分批实施并留观指标，越阈值立刻止损回退。`,
    ],
    reason: [
      `先复盘 ${focus} 的触发条件，再定位因果链路，最后用反例验证边界。`,
      `先列出 ${focus} 的前提假设，再解释机制，最后补失效场景，形成因果闭环。`,
      `围绕 ${focus} 先做归因再做验证，避免把现象当原因。`,
    ],
    verify: [
      `先定义 ${focus} 的验收阈值，再用测试与线上监控双验证，不达标立即回退。`,
      `围绕 ${focus} 建立“离线回归 + 线上观测”双轨验证，任一轨道不达标都不放量。`,
      `先统一 ${focus} 指标口径并补齐日志证据，再按测试结果做继续/回退决策。`,
      `先把「${topic}」里的 ${focus} 监控看板和测试基线对齐，再按阈值执行放量或回滚。`,
    ],
    tradeoff: [
      `先排查 ${focus} 的成本项和收益项，再实施收敛动作，最后按阈值决定推进或回退。`,
      `先量化 ${focus} 的收益和维护成本，再按阈值决定推进或保留现方案，并记录取舍依据。`,
      `先拆分 ${focus} 的取舍因子，再验证收益/成本比，必要时回退到低风险方案。`,
    ],
    rollout: [
      `${focus} 上线按批次推进：先灰度低风险流量，再逐步放量；任一批次越阈值立刻回滚。`,
      `${focus} 发布路径拆成“试点 -> 放量 -> 全量”，每个阶段都绑定验收门槛和回滚动作。`,
      `围绕 ${focus} 设置灰度开关与回滚脚本，确保发布过程可观测、可回退。`,
    ],
    risk: [
      `先演练 ${focus} 的失败场景，再配置降级和兜底动作，最后确认恢复路径。`,
      `先识别 ${focus} 高风险触发点，再定义止损动作和恢复阈值，确保故障不扩散。`,
      `围绕 ${focus} 建立“告警 -> 降级 -> 恢复”闭环，再推进上线。`,
    ],
  };
  return pickBySeed(variants[intent], `${topic}|${questionText}|${focus}|fallback-action`);
}

function buildSupplementaryAction(intent: FollowupIntent, focus: string): string {
  const variants: Record<FollowupIntent, string> = {
    implementation: `把 ${focus} 拆成最小改动任务逐条实施，补回归后按批次推进，异常立即回滚。`,
    reason: `先排查 ${focus} 的触发条件，再验证因果链与反例，确认后再实施修正。`,
    verify: `补齐 ${focus} 的日志埋点、回归用例和告警阈值，按日复盘并保留回退开关。`,
    tradeoff: `把 ${focus} 的收益与成本拆成可观测项，持续验证后按阈值推进或回退。`,
    rollout: `围绕 ${focus} 建立灰度批次、监控看板和回滚脚本，按门槛逐批放量。`,
    risk: `针对 ${focus} 先演练故障，再实施降级与兜底，确认恢复路径后再推进发布。`,
  };
  return variants[intent];
}

function buildFollowupFallbackRisk(
  intent: FollowupIntent,
  topic: string,
  questionText: string,
  focus: string,
): string {
  const variants: Record<FollowupIntent, string[]> = {
    implementation: [
      `${focus} 的风险是改动边界不清会引发连锁回归，需要预设回退。`,
      `围绕 ${focus} 落地时，最大风险是主链路与兜底链路耦合，异常会成倍放大。`,
      `${focus} 若缺少回退开关与恢复脚本，发布失败后会拉长故障恢复窗口。`,
      `在「${topic}」里，${focus} 一旦无降级预案，局部异常可能在放量阶段扩散成全局故障。`,
      `在「${topic}」场景下，${focus} 最大风险是变更影响面估计过小，导致回归缺口被放大。`,
      `${focus} 若没有按批次观察与止损阈值，问题会在放量后快速扩散并增加回滚成本。`,
    ],
    reason: [
      `${focus} 若只讲结论不讲因果，会导致排障方向错误并放大风险。`,
      `围绕 ${focus} 归因不完整时，团队会在错误方向反复优化，风险持续累积。`,
      `若 ${focus} 缺少反例验证，容易把偶发结果误判成稳定规律。`,
    ],
    verify: [
      `若 ${focus} 缺少验收阈值，容易出现“看似有效但线上失效”的风险。`,
      `${focus} 没有统一指标口径时，验证结论会互相冲突并误导决策。`,
      `在「${topic}」里，${focus} 若只看单次测试结果、不看持续监控，风险会在高峰期暴露。`,
      `在「${topic}」里，${focus} 如果缺少日志留痕与告警闭环，线上问题会被延迟发现并放大。`,
    ],
    tradeoff: [
      `围绕 ${focus} 取舍不量化时，常见风险是短期收益被长期维护成本抵消。`,
      `若 ${focus} 决策只看交付速度，后续维护成本和回归成本会快速上升。`,
      `围绕 ${focus} 缺少切换阈值时，团队容易在错误方案上持续投入。`,
    ],
    rollout: [
      `${focus} 发布阶段最大风险是灰度门槛不清，问题会随放量扩散并增加回滚成本。`,
      `围绕 ${focus} 的迁移若没有批次边界，故障会跨模块扩散并难以止损。`,
      `若 ${focus} 没有实时观测信号，异常放量后往往来不及回退。`,
    ],
    risk: [
      `${focus} 的高风险点是异常扩散链路未被拦截，导致故障从局部升级为全局。`,
      `围绕 ${focus} 的故障若缺少降级保护，最坏情况会直接影响核心业务链路。`,
      `若 ${focus} 告警阈值配置过宽，风险会被延迟发现并放大恢复成本。`,
    ],
  };
  return pickBySeed(variants[intent], `${topic}|${questionText}|${focus}|fallback-risk`);
}

function buildFollowupFallbackVerify(
  intent: FollowupIntent,
  topic: string,
  questionText: string,
  focus: string,
): string {
  const variants: Record<FollowupIntent, string[]> = {
    implementation: [
      `验收看 ${focus} 相关回归测试通过率、关键日志和线上指标，三者一致才算完成。`,
      `验收至少包含「${topic}」里 ${focus} 的回归用例、线上监控和告警阈值，三条证据都达标才收口。`,
      `在「${topic}」里，验收 ${focus} 时要同时看测试通过率、错误率和时延变化，确保改动真实生效。`,
      `${focus} 验收必须覆盖离线回归、线上观测和告警演练，三项都通过才可收口。`,
      `在「${topic}」里，${focus} 验收要同时对齐监控趋势、日志采样与回归结果，再做放量决策。`,
      `${focus} 的验收闭环要覆盖“回归通过 -> 指标达标 -> 告警稳定”三个阶段，缺一不可。`,
    ],
    reason: [
      `验收要能复现 ${focus} 问题并证明原因链成立，再观察修复后指标是否回归。`,
      `验收标准是 ${focus} 因果链可复现：输入触发、机制命中、修复后指标回稳。`,
      `围绕 ${focus} 归因结果至少给复现步骤、日志证据和回归指标，防止误判。`,
    ],
    verify: [
      `在「${topic}」里，${focus} 至少要给一组指标阈值、一条日志证据和一组测试结果。`,
      `${focus} 验收要同时满足“指标达标 + 日志一致 + 测试通过”，缺一不可。`,
      `${focus} 验证闭环包含阈值、证据和回归结果，三者一致才可继续放量。`,
      `在「${topic}」里，${focus} 验收要把监控趋势、日志取样和回归结果三份证据对齐后再做放量决策。`,
    ],
    tradeoff: [
      `验收看 ${focus} 收益与成本两条曲线：收益稳定且维护成本可控才保留当前方案。`,
      `验收需同时对比 ${focus} 收益提升和维护成本变化，确保取舍结论可持续。`,
      `围绕 ${focus} 取舍结果至少给收益趋势、成本趋势和回归稳定性三组数据。`,
    ],
    rollout: [
      `验收看 ${focus} 灰度通过率、回滚次数和故障恢复时长，达到门槛再继续放量。`,
      `发布验收至少看 ${focus} 放量成功率、异常告警命中和回滚耗时，满足阈值再推进。`,
      `围绕 ${focus} 上线结果持续观察错误率、恢复时长和用户影响面，确认稳定后再全量。`,
    ],
    risk: [
      `验收看 ${focus} 风险告警命中率、降级生效率和恢复耗时，确保异常可控可恢复。`,
      `${focus} 风险验收至少包含告警触发、降级执行和恢复达标三项信号。`,
      `围绕 ${focus} 高风险场景要验证“能发现、能止损、能恢复”，三项都通过才算合格。`,
    ],
  };
  return pickBySeed(variants[intent], `${topic}|${questionText}|${focus}|fallback-verify`);
}

function buildFollowupAnswer(block: Block, parent: Block): string {
  const questionText = normalizeFollowupQuestion(block.question || block.title);
  const topic = normalizeTitle(parent.title);
  const ownLines = extractCandidateLines(block.answer);
  const parentLines = extractCandidateLines(parent.answer);
  const pool = [...new Set([...ownLines, ...parentLines])];
  const focus = pickFocusTerm(questionText, topic, block.tags.join(' '), parent.tags.join(' '));
  const intent = inferFollowupIntent(questionText);
  const fallbackDirect = buildFollowupFallbackDirect(intent, topic, questionText, focus);
  const fallbackAction = buildFollowupFallbackAction(intent, topic, questionText, focus);
  const fallbackRisk = buildFollowupFallbackRisk(intent, topic, questionText, focus);
  const fallbackVerify = buildFollowupFallbackVerify(intent, topic, questionText, focus);

  const forceIntentDirect =
    intent === 'tradeoff' || intent === 'verify' || intent === 'rollout' || intent === 'risk';
  let direct = fallbackDirect;
  if (!forceIntentDirect) {
    const directCandidates = pool.filter((line) => !isWeakCandidateLine(line));
    const selected = pickBestLine(
      directCandidates,
      `${questionText} ${topic} ${focus}`,
      fallbackDirect,
    );
    let refined = selected;
    if (parentLines.includes(refined)) {
      const alternativePool = pool.filter((line) => line !== refined && !isWeakCandidateLine(line));
      if (alternativePool.length) {
        refined = pickBestLine(alternativePool, `${questionText} ${topic} ${focus} 追问`, refined);
      }
    }
    if (tokenOverlapRatio(refined, questionText) >= 0.12) {
      if (isActionableDirect(intent, refined)) {
        direct = refined;
      }
    }
  }
  direct = preferStrongLine(direct, fallbackDirect);
  const action = ensureActionLine(
    pickLineByKeywords(
      pool.filter((line) => line !== direct),
      ACTION_PICK_KEYWORDS,
      `${questionText} ${focus} 动作`,
    ) || fallbackAction,
    fallbackAction,
  );
  let risk = ensureRiskLine(
    pickLineByKeywords(
      pool.filter((line) => line !== direct),
      FOLLOWUP_RISK_KEYWORDS,
      `${questionText} ${focus} 风险`,
    ) || fallbackRisk,
    fallbackRisk,
  );
  let verify = ensureVerifyLine(
    pickVerifyLine(
      pool.filter((line) => line !== direct),
      `${questionText} ${focus} 验收`,
    ) || fallbackVerify,
    fallbackVerify,
  );
  let safeAction = preferStrongLine(action, fallbackAction);
  if (!containsAnyKeyword(normalizeQualityText(safeAction), FOLLOWUP_ACTION_KEYWORDS)) {
    safeAction = ensureActionLine('', fallbackAction);
  }
  if (tokenOverlapRatio(safeAction, direct) > 0.72) {
    const alternativeAction =
      pickLineByKeywords(
        pool.filter((line) => line !== direct && tokenOverlapRatio(line, direct) < 0.5),
        ACTION_PICK_KEYWORDS,
        `${questionText} ${focus} 备选动作`,
      ) || buildSupplementaryAction(intent, focus);
    safeAction = ensureActionLine(alternativeAction, fallbackAction);
    safeAction = preferStrongLine(safeAction, fallbackAction);
  }
  risk = preferStrongLine(risk, fallbackRisk);
  verify = preferStrongLine(verify, fallbackVerify);
  if (tokenOverlapRatio(risk, questionText) < 0.08 && !risk.includes(focus)) {
    risk = ensureRiskLine('', fallbackRisk);
  }
  if (tokenOverlapRatio(verify, questionText) < 0.1 && !verify.includes(focus)) {
    verify = ensureVerifyLine('', fallbackVerify);
  }
  const terms = extractTerms(questionText, parent.title, [...parent.tags, ...block.tags], focus);
  const termLines = buildTermLines(terms, pool, topic, {
    topic,
    questionText,
    focus,
    intent,
  });

  return [
    '#### 直答',
    `- 结论：${ensureSentence(direct)}`,
    `- 关键动作：${safeAction}`,
    '',
    '#### 术语解释',
    ...termLines,
    '',
    '#### 风险与验收',
    `- 主要风险：${risk}`,
    `- 验收信号：${verify}`,
  ].join('\n');
}

function buildOneLiner(block: Block, parent?: Block): string {
  if (parent) return `先直接回答追问，再解释关键词，最后补风险与验收信号。`;
  const topic = normalizeTitle(block.title);
  return `回答「${topic}」时先给结论，再解释术语，并补边界与验收。`;
}

for (const file of files) {
  const filePath = join(CONTENT_DIR, file);
  const raw = readFileSync(filePath, 'utf8');
  const parsed = splitQuestionBlocks(raw);

  const blocks: Block[] = parsed.blocks.map((item) => ({
    slug: item.slug,
    raw: item.raw,
    metaText: item.metaText,
    sections: item.sections,
    title: readMeta(item.metaText, 'title') || item.slug,
    tags: parseInlineList(readMeta(item.metaText, 'tags') || '[]'),
    parent: readMeta(item.metaText, 'parent') || readMeta(item.metaText, 'parentId'),
    question: item.sections['题目'] || '',
    answer: item.sections['答案要点'] || '',
  }));
  const bySlug = new Map(blocks.map((block) => [block.slug, block]));

  let fileChanged = false;
  const rewritten = blocks.map((block) => {
    if (!block.sections['答案要点']) return block.raw;
    const parentSlug = (block.parent || '').replace(/^.*\//, '');
    const parent = parentSlug ? bySlug.get(parentSlug) : undefined;
    if (!parent) {
      const cleanedBase = cleanMainAnswer(block.answer);
      if (cleanedBase === block.answer) return block.raw;
      const nextRaw = replaceSection(block.raw, '答案要点', cleanedBase);
      if (nextRaw !== block.raw) {
        fileChanged = true;
        stat.answersRewritten += 1;
        stat.baseRewritten += 1;
      }
      return nextRaw;
    }
    const nextAnswer = buildFollowupAnswer(block, parent);
    let nextRaw = replaceSection(block.raw, '答案要点', nextAnswer);
    nextRaw = replaceSection(nextRaw, '一句话', buildOneLiner(block, parent));
    if (nextRaw !== block.raw) {
      fileChanged = true;
      stat.answersRewritten += 1;
      stat.followupsRewritten += 1;
    }
    return nextRaw;
  });

  const output = `${parsed.before}${rewritten.join('\n')}`;
  if (fileChanged) {
    stat.filesTouched += 1;
    if (!dryRun) writeFileSync(filePath, output);
  }
}

console.log(
  `已${dryRun ? '预览' : '写入'}答案重写：影响 ${stat.filesTouched} 个文件，更新答案 ${stat.answersRewritten} 段（主问题 ${stat.baseRewritten}，追问题 ${stat.followupsRewritten}）。`,
);
if (dryRun) console.log('dry-run 模式，未写入文件。传入 --write 才会落盘。');
