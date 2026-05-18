import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

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
const write = process.argv.includes('--write');
const dryRun = !write || process.argv.includes('--dry-run') || process.argv.includes('--dry');
const onlyArg = process.argv.find((arg) => arg.startsWith('--only='));
const onlyFile = onlyArg ? onlyArg.slice('--only='.length) : '';
const files = readdirSync(CONTENT_DIR)
  .filter((file) => /^\d.*\.md$/.test(file))
  .filter((file) => (onlyFile ? file === onlyFile : true))
  .sort();

const stat = {
  pitfallsAdded: 0,
  answersExpanded: 0,
  followupsRewritten: 0,
  parentFollowupSectionsRewritten: 0,
};

function parseInlineList(value: string): string[] {
  const match = value.trim().match(/^\[([^\]]*)\]$/);
  if (!match) return [];
  return match[1]
    .split(',')
    .map((item) => item.trim().replace(/^['"]|['"]$/g, ''))
    .filter(Boolean);
}

function readMeta(metaText: string, key: string): string | undefined {
  const match = metaText.match(new RegExp(`^${key}\\s*:\\s*(.+)$`, 'm'));
  return match?.[1]?.trim();
}

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
  const lines = content.split(/\r?\n/);
  const heads: { slug: string; line: number; offset: number }[] = [];
  let offset = 0;
  let inFence = false;
  let fenceMarker = '';
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const fence = line.match(/^(`{3,})/);
    if (fence) {
      if (!inFence) {
        inFence = true;
        fenceMarker = fence[1];
      } else if (fence[1].length >= fenceMarker.length) {
        inFence = false;
        fenceMarker = '';
      }
    }
    if (!inFence) {
      const head = line.match(/^##\s+([a-z][a-z0-9-]*)\s*$/);
      if (head) heads.push({ slug: head[1], line: i, offset });
    }
    offset += line.length + 1;
  }

  const blocks: Block[] = [];
  for (let i = 0; i < heads.length; i++) {
    const start = heads[i].offset;
    const end = i + 1 < heads.length ? heads[i + 1].offset : content.length;
    const raw = content.slice(start, end).replace(/\s+$/, '\n');
    const firstSection = raw.search(/^###\s+/m);
    const metaText = firstSection >= 0 ? raw.slice(0, firstSection) : raw;
    blocks.push({
      slug: heads[i].slug,
      raw,
      title: readMeta(metaText, 'title') || heads[i].slug,
      difficulty: readMeta(metaText, 'difficulty') || '进阶',
      tags: parseInlineList(readMeta(metaText, 'tags') || '[]'),
      parent: readMeta(metaText, 'parent') || readMeta(metaText, 'parentId'),
      isFollowup: /^parent(Id)?\s*:/m.test(metaText),
      sections: parseSections(raw),
    });
  }

  return { before: heads.length ? content.slice(0, heads[0].offset) : content, blocks };
}

function parseSections(raw: string): Record<string, string> {
  const sections: Record<string, string> = {};
  const re = /^###\s+(一句话|题目|答案要点|代码示例|常见误区|追问|延伸)\s*$/gm;
  const matches = [...raw.matchAll(re)];
  for (let i = 0; i < matches.length; i++) {
    const name = matches[i][1];
    const start = (matches[i].index || 0) + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index || raw.length : raw.length;
    sections[name] = raw.slice(start, end).trim();
  }
  return sections;
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
      '只背 API 名称，不解释响应式依赖收集、组件更新边界和生命周期时序。',
      '把所有状态都塞进同一个 store 或 composable，忽略作用域、释放时机和可测试性。',
    ],
    react: [
      '把 memo/useMemo/useCallback 当成万能优化，反而增加依赖错误和维护成本。',
      '混淆客户端状态、服务端缓存和 URL 状态，导致数据源重复、失效策略不一致。',
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

function pitfallFor(block: Block): string {
  const domain = classify(block);
  const tags = block.tags.length ? `相关标签是 ${block.tags.slice(0, 3).join('、')}，` : '';
  const specific = domainPitfall(domain);
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
- ${specific[0]}
- ${specific[1]}
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
- 面试中不要只回答「${title} 是什么」，还要解释为什么需要它、它解决了哪类问题，以及在哪些约束下会失效。
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
  const title = parent.title.replace(/[？?。]+$/, '');
  const map: Record<string, string[]> = {
    security: [
      `如果把「${title}」放到真实业务里，你会怎么划分信任边界和服务端兜底？`,
      `你会如何证明这个安全方案没有被绕过，并监控异常攻击流量？`,
      `当安全性、用户体验和研发成本冲突时，你会如何取舍？`,
    ],
    performance: [
      `你会先看哪些指标来判断「${title}」是不是当前性能瓶颈？`,
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
      `它和服务端数据缓存、并发渲染或组件拆分之间有什么取舍？`,
    ],
    network: [
      `「${title}」在弱网、代理、断连或服务端限流时会出现哪些边界问题？`,
      `你会如何设计超时、重试、幂等和降级来保证链路可靠？`,
      `如果要在线上证明这个方案稳定，你会看哪些日志和指标？`,
    ],
    ai: [
      `「${title}」上线前你会如何做效果评估、成本预算和安全防护？`,
      `模型输出不稳定或出现幻觉时，产品和工程上分别怎么兜底？`,
      `如果延迟、成本和准确率不能同时满足，你会如何做路由或降级？`,
    ],
    testing: [
      `针对「${title}」，你会优先补哪些边界用例和回归用例？`,
      `如何避免测试过度耦合实现细节，导致重构时大量误报？`,
      `这类测试在 CI 中如何分层运行，兼顾速度和信心？`,
    ],
    engineering: [
      `推动「${title}」落地时，你会如何设计灰度、回滚和迁移路径？`,
      `如果团队成员能力和历史包袱不一致，你会如何拆阶段推进？`,
      `你会用哪些指标判断这个工程方案长期值得维护？`,
    ],
    algorithm: [
      `「${title}」有哪些容易漏掉的边界输入和复杂度陷阱？`,
      `如果数据规模扩大一个数量级，你会如何调整数据结构或算法？`,
      `你会怎么证明实现正确，而不是只靠几个样例跑通？`,
    ],
    general: [
      `「${title}」在真实项目里最容易踩到哪些边界条件？`,
      `你会用哪些测试、日志或指标证明这个方案有效？`,
      `如果需求规模、团队成本或兼容性要求变化，你会如何调整方案？`,
    ],
  };
  return map[domain] || map.general;
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

function intentLines(intent: string, domain: string, parent: Block): string[] {
  const title = parent.title.replace(/[？?。]+$/, '');
  const subject = domainNoun(domain);
  const common = relevantParentLines(parent).slice(0, 2);
  const maps: Record<string, string[]> = {
    boundary: [
      `先界定「${title}」的适用条件，再说明哪些输入、运行环境或团队约束会让默认方案失效。`,
      `围绕${subject}展开：正常路径要能讲清楚，异常路径要说明降级、替代方案和用户可见影响。`,
      ...common.map(
        (line) => `原题中的关键点「${line}」要进一步补到边界条件里，而不是只复述结论。`,
      ),
    ],
    verify: [
      `验证要从可复现样例开始：准备正向、边界和失败用例，确认「${title}」不是只在理想输入下成立。`,
      `再补可观测指标：${subject}应该能通过日志、耗时、错误率、命中率、覆盖率或用户行为指标观察到变化。`,
      `如果指标没有改善，要能回到原题机制定位原因，而不是继续堆配置或换工具。`,
    ],
    reliability: [
      `先把链路拆开：客户端状态、浏览器限制、代理/CDN、服务端和数据源分别可能失败。`,
      `弱网、重试和超时会放大「${title}」里的边界问题，所以请求必须有幂等键、取消逻辑和可恢复提示。`,
      `降级策略要明确用户还能做什么：读缓存、稍后重试、排队同步，或者切到更保守的实现。`,
    ],
    rollout: [
      `落地时先收敛改动面：选低风险页面或模块试点，保留旧路径作为对照。`,
      `迁移计划要说明数据兼容、配置开关、监控指标和失败后的恢复路径。`,
      `团队推进重点不是一次性重写，而是把「${title}」拆成可验证的小步骤，逐步替换高风险部分。`,
    ],
    scale: [
      `规模变大后先重新评估瓶颈：数据量、并发、团队协作、浏览器兼容和维护成本哪个先触顶。`,
      `如果 ${subject} 的收益被复杂度抵消，就要考虑分层、缓存、懒加载、批处理或更简单的替代方案。`,
      `答案里要给出取舍边界：小团队/低流量怎么做，复杂业务/多端协作时又需要补哪些治理。`,
    ],
    security: [
      `先画清信任边界：哪些输入来自用户、第三方或模型，哪些校验必须在服务端完成。`,
      `证明没有被绕过要靠攻击样例、审计日志、告警阈值和最小权限，而不是只说前端做了过滤。`,
      `一旦发现异常，要能降级到只读、禁用高危能力、刷新凭证或触发人工审核。`,
    ],
    'ai-tradeoff': [
      `AI 场景要把效果、延迟、成本和安全分开评估，不能只看单次回答是否看起来正确。`,
      `当指标冲突时，可以做模型路由、缓存、截断上下文、异步生成或人工兜底，而不是盲目换更大的模型。`,
      `上线前需要固定评估集和失败样例，持续观察命中率、拒答率、幻觉率、token 成本和用户采纳率。`,
    ],
  };
  return maps[intent] || maps.boundary;
}

function rewriteTemplateFollowup(raw: string, parent: Block, index: number): string {
  const questions = followupQuestionsFor(parent);
  const question = questions[index] || questions[0];
  const domain = classify(parent);
  const intent = inferFollowupIntent(question, index, domain);
  const answer = `#### 核心回答
${intentLines(intent, domain, parent)
  .slice(0, 3)
  .map((line) => `- ${line}`)
  .join('\n')}

#### 学习抓手
- 复习这道追问时，先用一句话说清「${parent.title}」的核心机制，再补一个会失败的具体场景。
- 至少准备一个可验证动作：写一个边界用例、打开一次调试面板、观察一个指标，或描述一次线上排障路径。
- 最后主动比较替代方案，说明为什么当前约束下选择它，而不是停在工具名或概念定义。`;
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
  ];
  const hits = phrases.filter((phrase) => hay.includes(phrase)).length;
  return (
    hits >= 2 ||
    (/^####\s+回答思路\s*$/m.test(answer) &&
      /^####\s+结合原题展开\s*$/m.test(answer) &&
      /^####\s+验证与取舍\s*$/m.test(answer))
  );
}

function relevantParentLines(parent: Block): string[] {
  const lines = [parent.sections['答案要点'], parent.sections['常见误区'], parent.sections['延伸']]
    .filter(Boolean)
    .join('\n')
    .split(/\r?\n/)
    .map((line) => markdownPlain(line))
    .filter((line) => line.length >= 16)
    .slice(0, 3);
  return lines.length ? lines : [`先说明「${parent.title}」的核心机制，再补充适用条件和失效边界。`];
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
