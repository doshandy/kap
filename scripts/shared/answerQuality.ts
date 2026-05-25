export const BANNED_TEMPLATE_PHRASES = [
  '前置条件检查 -> 主链路验证 -> 异常链路兜底 -> 指标回归确认',
  '如果指标没有改善。',
  '把默认路径当成唯一路径',
  '按阶段替换更稳',
  '可验证、可灰度、可回滚',
  '输入边界、运行环境和验收口径一次讲全',
  '长期维护成本更高',
  '先把追问落回原题',
  '至少准备一个可验证动作',
  '最后主动比较替代方案',
];

export const FOLLOWUP_ACTION_KEYWORDS = [
  '排查',
  '验证',
  '设计',
  '实施',
  '落地',
  '推进',
  '发布',
  '拆分',
  '拆解',
  '拆成',
  '拆',
  '灰度',
  '回滚',
  '回退',
  '恢复',
  '监控',
  '补充',
  '定位',
  '确认',
  '迁移',
  '收敛',
  '演练',
];

export const FOLLOWUP_RISK_KEYWORDS = [
  '风险',
  '失败',
  '异常',
  '故障',
  '抖动',
  '越权',
  '泄漏',
  '误报',
  '回退',
  '兜底',
  '降级',
  '失效',
];

export const FOLLOWUP_VERIFY_KEYWORDS = [
  '指标',
  '日志',
  '监控',
  '测试',
  '验收',
  '告警',
  '覆盖率',
  '成功率',
  '错误率',
  '命中率',
  '耗时',
  '分位',
];

export function normalizeQualityText(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[「」"'`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizeQualityText(value: string): string[] {
  const normalized = normalizeQualityText(value);
  return (normalized.match(/[A-Za-z][A-Za-z0-9_+#./-]{1,}|[\u4e00-\u9fa5]{2,10}/g) || []).map(
    (token) => token.toLowerCase(),
  );
}

export function containsAnyKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword));
}

export function jaccardSimilarity(a: string, b: string): number {
  const tokensA = new Set(tokenizeQualityText(a));
  const tokensB = new Set(tokenizeQualityText(b));
  if (!tokensA.size || !tokensB.size) return 0;
  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection += 1;
  }
  const union = tokensA.size + tokensB.size - intersection;
  return union > 0 ? intersection / union : 0;
}
