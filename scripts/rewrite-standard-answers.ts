import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseCommonScriptArgs, resolveOnlyContentFiles } from './shared/args';
import { BANNED_TEMPLATE_PHRASES } from './shared/answerQuality';

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

type Domain =
  | 'security'
  | 'performance'
  | 'network'
  | 'testing'
  | 'engineering'
  | 'algorithm'
  | 'ai'
  | 'vue'
  | 'react'
  | 'browser'
  | 'node'
  | 'general';

type FollowupIntent = 'implementation' | 'reason' | 'verify' | 'tradeoff' | 'rollout' | 'risk';

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

const GENERATED_HEADING_RE =
  /^####\s+(标准补充（边界\/失败\/取舍）|标准回答（直接作答）|关键细节（可追问）|核心回答|学习抓手|工程化补充|直答|落地步骤|风险与验收)\s*$/;
const GENERATED_LINE_PREFIXES = [
  '场景前提：',
  '实施步骤：',
  '失败风险：',
  '验收信号：',
  '追问核心：',
];
const NOISE_TOKENS = new Set([
  '如何',
  '怎么',
  '什么',
  '为什么',
  '哪些',
  '如果',
  '当',
  '是否',
  '以及',
  '这个',
  '那个',
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
]);

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
  return options[(hashText(seed) + offset) % options.length];
}

function normalizeTitle(value: string): string {
  return value
    .trim()
    .replace(/^追问：\s*/, '')
    .replace(/\s*是\s*什么$/, '')
    .replace(/[？?。!！]+$/g, '')
    .trim();
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
    .replace(/\s+/g, ' ')
    .trim();
}

function stripGeneratedSections(answer: string): string {
  const lines = answer.split(/\r?\n/);
  const out: string[] = [];
  let skipping = false;
  for (const line of lines) {
    if (GENERATED_HEADING_RE.test(line.trim())) {
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
    if (!normalized || normalized.length < 10) continue;
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

function inferDomain(block: Block, parent?: Block): Domain {
  const hay = markdownPlain(
    `${block.title} ${block.tags.join(' ')} ${block.question} ${parent?.title || ''}`,
  ).toLowerCase();
  if (
    /安全|xss|csrf|sri|csp|jwt|oauth|auth|权限|加密|注入|越权|cookie|samesite|token|隐私|登录|会话|fedcm|chips/.test(
      hay,
    )
  )
    return 'security';
  if (/性能|lcp|cls|long task|首屏|渲染|缓存|卡顿|fps|frame|优化/.test(hay)) return 'performance';
  if (/http|tcp|tls|cdn|dns|网络|跨域|重试|超时|弱网|限流|websocket/.test(hay)) return 'network';
  if (/测试|test|vitest|e2e|mock|覆盖率|回归/.test(hay)) return 'testing';
  if (/架构|工程|发布|灰度|回滚|迁移|治理|ci|可观测|监控/.test(hay)) return 'engineering';
  if (/算法|复杂度|链表|数组|树|图|排序|搜索|动态规划/.test(hay)) return 'algorithm';
  if (/\b(ai|llm|rag|prompt|embedding|agent)\b|大模型|幻觉|评估集|向量检索/.test(hay)) return 'ai';
  if (/vue|pinia|nuxt|组合式|响应式/.test(hay)) return 'vue';
  if (/react|hook|redux|rsc|fiber|zustand/.test(hay)) return 'react';
  if (/浏览器|event loop|渲染流水线|worker|dom|bom/.test(hay)) return 'browser';
  if (/node|npm|pnpm|event loop|stream|进程|线程/.test(hay)) return 'node';
  return 'general';
}

function inferIntent(question: string): FollowupIntent {
  const text = markdownPlain(question);
  if (/为什么|原因|本质/.test(text)) return 'reason';
  if (/指标|验证|证明|监控|告警|测试|验收/.test(text)) return 'verify';
  if (/取舍|成本|收益|权衡|利弊/.test(text)) return 'tradeoff';
  if (/上线|灰度|回滚|迁移|发布/.test(text)) return 'rollout';
  if (/风险|异常|故障|安全|失败|兜底|降级/.test(text)) return 'risk';
  return 'implementation';
}

function normalizeFollowupQuestion(value: string): string {
  return markdownPlain(value)
    .replace(/^如果面试官追问[:：]\s*/, '')
    .replace(/[？?。]+$/g, '')
    .trim();
}

function extractFocusTerm(block: Block, parent?: Block): string {
  const candidates = [
    ...block.tags,
    ...(normalizeTitle(block.title).match(/[A-Za-z][A-Za-z0-9_+#./-]{1,}|[\u4e00-\u9fa5]{2,10}/g) ||
      []),
    ...(markdownPlain(block.question).match(
      /[A-Za-z][A-Za-z0-9_+#./-]{1,}|[\u4e00-\u9fa5]{2,10}/g,
    ) || []),
    ...(parent
      ? normalizeTitle(parent.title).match(
          /[A-Za-z][A-Za-z0-9_+#./-]{1,}|[\u4e00-\u9fa5]{2,10}/g,
        ) || []
      : []),
  ];
  const picked = candidates.find((item) => {
    const term = item.trim();
    if (!term || term.length < 2 || term.length > 12) return false;
    return !NOISE_TOKENS.has(term);
  });
  if (picked) return picked;
  const fallback: Record<Domain, string> = {
    security: '信任边界',
    performance: '性能瓶颈',
    network: '链路可靠性',
    testing: '回归信心',
    engineering: '工程治理',
    algorithm: '复杂度上限',
    ai: '效果与成本',
    vue: '响应式边界',
    react: '渲染边界',
    browser: '渲染链路',
    node: '运行时行为',
    general: '关键链路',
  };
  return fallback[inferDomain(block, parent)];
}

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] || '');
}

function buildScenarioLine(domain: Domain, vars: Record<string, string>, seed: string): string {
  const map: Record<Domain, string[]> = {
    security: [
      '先限定 {focus} 的信任边界：哪些输入可信、哪些必须服务端二次校验，否则 {topic} 的结论不成立。',
      '{topic} 的回答前提是权限模型、审计日志和异常告警都已接入；缺任一项都不能直接上线。',
    ],
    performance: [
      '回答 {topic} 前先给基线：至少明确耗时分位、错误率和用户体感，不然优化动作没有参照。',
      '{topic} 只有在瓶颈被数据证实时才值得推进；先确认 {focus} 是否真是主耗时来源。',
    ],
    network: [
      '先约定 {focus} 的超时、重试和幂等语义，再谈 {topic} 的实现细节。',
      '讨论 {topic} 时要把弱网、限流和断连场景并列考虑，不要只讲理想链路。',
    ],
    testing: [
      '回答 {topic} 时先定义验收口径：主路径、边界输入和失败分支都要有可复现用例。',
      '{topic} 的测试价值来自“可复核”；先约定如何在 CI 与线上同时验证 {focus}。',
    ],
    engineering: [
      '{topic} 的前置条件是迁移批次、灰度门槛和回滚策略明确，不然执行风险不可控。',
      '落地 {topic} 前要先确认团队协作链路：谁发布、谁观测、谁回退，避免责任空窗。',
    ],
    algorithm: [
      '先声明输入规模和内存预算，再讨论 {topic}；复杂度边界不清会导致方案失真。',
      '回答 {topic} 时要说明 {focus} 在极端输入下的行为，不要只给样例路径。',
    ],
    ai: [
      '先定义 {focus} 的效果阈值、时延预算和成本上限，再回答 {topic} 的落地方案。',
      '{topic} 的回答必须包含失败兜底：当模型不稳定时如何降级、如何保护业务正确性。',
    ],
    vue: [
      '先划清 {focus} 的作用域和更新时机，再展开 {topic}，避免状态边界混乱。',
      '讨论 {topic} 时要交代响应式依赖怎么收集、何时触发更新、如何清理副作用。',
    ],
    react: [
      '{topic} 要先拆分状态来源：本地状态、缓存状态、路由状态边界不能混用。',
      '回答 {topic} 时要说明 {focus} 在并发渲染下的行为差异和回归策略。',
    ],
    browser: [
      '先说明浏览器调度与渲染阶段，再讲 {topic}，否则容易把现象当结论。',
      '讨论 {topic} 时必须覆盖可见/不可见标签页、主线程阻塞和降级路径。',
    ],
    node: [
      '先约定 Node 运行时版本和事件循环语义，再回答 {topic} 的差异点。',
      '回答 {topic} 时要明确 {focus} 在高并发和错误恢复下的表现。',
    ],
    general: [
      '先定义 {topic} 的输入约束和成功标准，再展开实现细节，避免答案停在概念层。',
      '回答 {topic} 时先锁定 {focus} 的边界条件，避免把经验结论当成通用规则。',
    ],
  };
  return fill(pickBySeed(map[domain], `${seed}|scenario`, 1), vars);
}

function buildActionLine(
  domain: Domain,
  intent: FollowupIntent,
  vars: Record<string, string>,
  seed: string,
): string {
  const intentMap: Record<FollowupIntent, string[]> = {
    implementation: [
      '按“先复现现状 -> 再最小改动实现 -> 最后补回归”推进，确保每一步都可回退。',
      '先把 {focus} 拆成可执行子步骤，再逐步落地并记录每一步的输入输出。',
    ],
    reason: [
      '先说触发条件，再解释机制，再给反例，避免把“结果”当成“原因”。',
      '围绕 {topic} 用“前提 -> 机制 -> 失效场景”三段式解释，保证因果闭环。',
    ],
    verify: [
      '先定义验收指标，再安排离线用例和线上观测，最后给失败阈值与回滚条件。',
      '把验证拆成“可复现样例 + 指标监控 + 告警阈值”，确保结论可复核。',
    ],
    tradeoff: [
      '先量化收益，再量化维护成本，最后给切换门槛，避免只谈偏好不谈代价。',
      '对比候选方案时同时给短期交付风险和长期治理成本，再做最终取舍。',
    ],
    rollout: [
      '先选低风险流量灰度，再按指标放量，异常时按预案快速回滚。',
      '发布按批次推进：每批次都有观测窗口、验收条件和回退动作。',
    ],
    risk: [
      '先枚举高风险失败模式，再给降级和兜底动作，最后补恢复路径。',
      '围绕 {focus} 的故障点做演练，明确“发现问题 -> 降级 -> 恢复”链路。',
    ],
  };
  const domainHint: Record<Domain, string[]> = {
    security: ['动作必须落到权限校验、输入清洗、审计留痕三个层面，缺一不可。'],
    performance: ['动作执行后要验证主线程时长、慢请求比例和核心体验指标是否同步改善。'],
    network: ['动作里要写清超时、重试、幂等和降级顺序，防止故障放大。'],
    testing: ['动作要覆盖边界输入、时序异常和回归用例，避免“只测主路径”。'],
    engineering: ['动作要同时交代迁移批次、灰度策略和回滚门槛。'],
    algorithm: ['动作要附上复杂度分析与边界样例，证明在规模变化时仍可用。'],
    ai: ['动作需包含评估集复核、成本预警和安全兜底，防止只看单次效果。'],
    vue: ['动作要交代响应式依赖和组件更新时机，避免副作用漂移。'],
    react: ['动作要交代渲染边界、状态分层和失效策略。'],
    browser: ['动作要考虑主线程占用与渲染帧预算，避免优化反噬体验。'],
    node: ['动作要交代事件循环影响、资源释放和错误恢复策略。'],
    general: [
      '动作必须对应明确输入、执行人和结果判定，避免停在口头建议。',
      '动作要能被他人复现：步骤清晰、信号可观测、异常可回退。',
      '动作需要包含完成标准和失败处理，不要只给方向不写执行细节。',
      '动作安排要覆盖主路径和异常路径，确保上线后可追踪可纠偏。',
    ],
  };
  const trimTail = (value: string) => value.replace(/[。；;，、\s]+$/g, '').trim();
  const intentPart = trimTail(fill(pickBySeed(intentMap[intent], `${seed}|intent`, 2), vars));
  const domainPart = trimTail(fill(pickBySeed(domainHint[domain], `${seed}|domain`, 3), vars));
  return `${intentPart}，并且${domainPart}。`;
}

function buildRiskLine(domain: Domain, vars: Record<string, string>, seed: string): string {
  const map: Record<Domain, string[]> = {
    security: ['高风险是边界错配：前端放行但服务端未拦截，会导致越权或注入。'],
    performance: ['常见失败是只优化实验室分数，真实设备或弱网下 {topic} 体验反而抖动。'],
    network: ['常见故障是重试与幂等策略不一致，最终把瞬时故障放大为数据错乱。'],
    testing: ['常见风险是测试绑死实现细节，重构后误报激增，团队逐渐忽略告警。'],
    engineering: ['最大风险是迁移无观测无回滚，一旦异常会在多模块连锁扩散。'],
    algorithm: ['高风险是边界输入遗漏，导致复杂度失控或结果错误。'],
    ai: ['主要风险是幻觉或成本击穿却无降级，最终影响业务稳定性。'],
    vue: ['常见风险是响应式边界不清导致连锁重渲染和状态抖动。'],
    react: ['常见风险是状态源混用，出现重复请求、脏读或 UI 闪烁。'],
    browser: ['高风险是主线程被微任务或重计算长期占用，引发掉帧与交互延迟。'],
    node: ['常见风险是事件循环阻塞与资源未释放，导致吞吐退化。'],
    general: ['常见风险是只给理想路径，忽略 {focus} 的失败分支与恢复动作。'],
  };
  return fill(pickBySeed(map[domain], `${seed}|risk`, 4), vars);
}

function buildVerifyLine(domain: Domain, vars: Record<string, string>, seed: string): string {
  const map: Record<Domain, string[]> = {
    security: ['验收至少包含攻击样例回放、审计日志核对和异常告警命中。'],
    performance: ['验收至少包含真实用户指标、分位耗时和错误率对照，而非单一跑分。'],
    network: ['验收至少看超时率、重试成功率、限流命中和降级触发频次。'],
    testing: ['验收至少看关键用例覆盖率、缺陷回归率和 CI 稳定性。'],
    engineering: ['验收至少看灰度通过率、回滚次数和故障恢复时长。'],
    algorithm: ['验收至少给边界样例、复杂度证明和大规模压测结果。'],
    ai: ['验收至少给效果命中率、幻觉率、平均时延与 token 成本趋势。'],
    vue: ['验收至少看组件重渲染次数、关键交互耗时和状态一致性。'],
    react: ['验收至少看渲染次数、请求重复率和状态一致性告警。'],
    browser: ['验收至少看主线程长任务、帧率和关键交互延迟。'],
    node: ['验收至少看事件循环延迟、吞吐和资源占用趋势。'],
    general: ['验收至少包含围绕 {focus} 的可复现用例、线上监控指标和回退演练记录。'],
  };
  return fill(pickBySeed(map[domain], `${seed}|verify`, 5), vars);
}

function buildMainAnswer(block: Block): string {
  const topic = normalizeTitle(block.title);
  const domain = inferDomain(block);
  const focus = extractFocusTerm(block);
  const seed = `${block.slug}|${topic}|${focus}|${domain}`;
  const existingLines = extractCandidateLines(block.answer);
  const keptLines = (
    existingLines.length
      ? existingLines.slice(0, 4)
      : [`核心结论：${topic} 的关键在于先界定约束，再说明机制，最后给验证闭环。`]
  ).map((line) => `- ${line}`);

  const vars = { topic, focus };
  const intent = inferIntent(block.question || topic);
  const supplement = [
    '#### 工程化补充',
    `- 场景前提：${buildScenarioLine(domain, vars, seed)}`,
    `- 实施步骤：${buildActionLine(domain, intent, vars, seed)}`,
    `- 失败风险：${buildRiskLine(domain, vars, seed)}`,
    `- 验收信号：${buildVerifyLine(domain, vars, seed)}`,
  ];

  return `${keptLines.join('\n')}\n\n${supplement.join('\n')}`.trim();
}

function buildOneLiner(block: Block, parent?: Block): string {
  const topic = normalizeTitle(parent?.title || block.title);
  const focus = extractFocusTerm(block, parent);
  const domain = inferDomain(block, parent);
  const seed = `${block.slug}|${topic}|${focus}|${domain}|one-line`;
  if (parent) {
    return pickBySeed(
      [
        `这道追问要直接回应「${topic}」在 ${focus} 上的执行动作、风险边界和验收信号。`,
        `回答这题时，先给 ${focus} 的结论，再给落地步骤，最后给可验证的验收标准。`,
        `围绕「${topic}」回答追问时，重点说清 ${focus} 的前提、动作和回退条件。`,
        `这道追问的关键是把 ${focus} 讲成可执行方案，并补风险与验收闭环。`,
      ],
      seed,
      1,
    );
  }
  return pickBySeed(
    [
      `回答「${topic}」时，先讲核心机制，再讲失败边界，最后给可复核的验证路径。`,
      `这题的高分关键是把 ${focus} 讲成可执行方案：前提清晰、步骤可落地、验收可验证。`,
      `这题回答要覆盖 ${focus} 的适用前提、实现路径和异常处理，避免只背定义。`,
      `讲「${topic}」时要把结论、动作、风险、验收四段说全，才算可落地答案。`,
    ],
    seed,
    2,
  );
}

function summarizeFollowupGoal(
  intent: FollowupIntent,
  topic: string,
  focus: string,
  question: string,
): string {
  const plainQuestion = normalizeFollowupQuestion(question);
  const map: Record<FollowupIntent, string> = {
    implementation: `围绕「${topic}」给出可执行的落地方案，重点说明 ${focus} 怎么做`,
    reason: `解释「${topic}」背后的因果关系，并指出 ${focus} 的触发条件`,
    verify: `说明如何验证「${topic}」结论成立，给出 ${focus} 的验收路径`,
    tradeoff: `比较「${topic}」在收益、成本和维护复杂度上的取舍边界`,
    rollout: `说明「${topic}」上线时如何灰度、观测、回滚`,
    risk: `识别「${topic}」的高风险失败场景并给出兜底措施`,
  };
  return `${map[intent]}（对应追问：${plainQuestion}）`;
}

function buildFollowupAnswer(block: Block, parent: Block): string {
  const topic = normalizeTitle(parent.title);
  const domain = inferDomain(block, parent);
  const focus = extractFocusTerm(block, parent);
  const seed = `${block.slug}|${topic}|${focus}|${domain}`;
  const intent = inferIntent(block.question || block.title);

  const parentLines = extractCandidateLines(parent.answer);
  const ownLines = extractCandidateLines(block.answer);
  const detail = ownLines[0] || parentLines[0] || `${focus} 需要同时覆盖前提、执行与回退。`;
  const questionText = normalizeFollowupQuestion(block.question || block.title);

  const vars = { topic, focus };
  const direct = [
    '#### 直答',
    `- 追问核心：${summarizeFollowupGoal(intent, topic, focus, questionText)}。`,
    `- 直接围绕「${questionText}」作答：${detail}`,
  ];
  const steps = [
    '#### 落地步骤',
    `- 第一步：${buildScenarioLine(domain, vars, `${seed}|step1`)}`,
    `- 第二步：${buildActionLine(domain, intent, vars, `${seed}|step2`)}`,
    `- 第三步：如果 ${focus} 链路出现异常，先降级保护核心功能，再按预案回退并记录复盘结论。`,
  ];
  const verify = [
    '#### 风险与验收',
    `- 失败风险：${buildRiskLine(domain, vars, `${seed}|step3`)}`,
    `- 验收信号：${buildVerifyLine(domain, vars, `${seed}|step4`)}`,
  ];

  return `${direct.join('\n')}\n\n${steps.join('\n')}\n\n${verify.join('\n')}`.trim();
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
    const nextAnswer = parent ? buildFollowupAnswer(block, parent) : buildMainAnswer(block);
    let nextRaw = replaceSection(block.raw, '答案要点', nextAnswer);
    nextRaw = replaceSection(nextRaw, '一句话', buildOneLiner(block, parent));
    if (nextRaw !== block.raw) {
      fileChanged = true;
      stat.answersRewritten += 1;
      if (parent) stat.followupsRewritten += 1;
      else stat.baseRewritten += 1;
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
