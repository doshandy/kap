import { stripHtml } from '@/composables/useSpeech';
import type { Question } from '@/types/content';

export interface AnswerScoreItem {
  key: string;
  label: string;
  score: number;
  max: number;
  hint: string;
}

export interface AnswerScoreResult {
  total: number;
  level: string;
  items: AnswerScoreItem[];
  suggestions: string[];
}

const dimensionConfig = [
  {
    key: 'conclusion',
    label: '结论先行',
    max: 15,
    words: ['本质', '核心', '结论', '首先', '关键', '一句话'],
    hint: '开头先给判断或定义，避免直接散讲细节。',
  },
  {
    key: 'principle',
    label: '原理机制',
    max: 25,
    words: ['原理', '机制', '流程', '生命周期', '数据流', '调度', '缓存', '渲染', '协议'],
    hint: '说明为什么成立，最好能拆到流程、数据流或浏览器/框架机制。',
  },
  {
    key: 'scenario',
    label: '工程场景',
    max: 15,
    words: ['项目', '业务', '线上', '场景', '落地', '监控', '灰度', '回滚'],
    hint: '补一个真实项目语境，说明怎么落地和观测。',
  },
  {
    key: 'pitfall',
    label: '误区边界',
    max: 20,
    words: ['误区', '边界', '异常', '兼容', '失败', '风险', '安全', '性能', '降级'],
    hint: '主动讲例外、失败路径、性能或安全风险。',
  },
  {
    key: 'followup',
    label: '追问准备',
    max: 10,
    words: ['对比', '取舍', '替代', '为什么不用', '权衡', '追问'],
    hint: '补充替代方案和取舍，方便承接面试官追问。',
  },
  {
    key: 'structure',
    label: '表达结构',
    max: 15,
    words: ['第一', '第二', '第三', '最后', '因此', '总结'],
    hint: '用分层结构组织答案，减少口头表达时跑偏。',
  },
] as const;

function normalize(text: string): string {
  return text.replace(/\s+/g, '').toLowerCase();
}

function keywordScore(text: string, words: readonly string[], max: number): number {
  const hit = words.filter((word) => text.includes(word.toLowerCase())).length;
  return Math.min(max, Math.round((hit / Math.min(words.length, 4)) * max));
}

export function scoreAnswer(answer: string, question?: Question): AnswerScoreResult {
  const plain = normalize(answer);
  const reference = normalize(
    question
      ? `${question.title}${stripHtml(question.summary || '')}${stripHtml(question.answer)}${stripHtml(question.pitfall || '')}`
      : '',
  );

  const items = dimensionConfig.map((item) => {
    const keywordPart = keywordScore(plain, item.words, item.max);
    const referencePart =
      reference && plain.length > 30
        ? Math.min(
            6,
            [...new Set(plain.match(/[\u4e00-\u9fa5]{2,}|[a-z][a-z0-9-]{2,}/gi) || [])].filter(
              (word) => reference.includes(word.toLowerCase()),
            ).length,
          )
        : 0;
    const lengthPenalty = plain.length < 40 ? Math.max(0, Math.round(item.max * 0.35)) : item.max;
    return {
      ...item,
      score: Math.min(
        lengthPenalty,
        Math.max(keywordPart, Math.min(item.max, keywordPart + referencePart)),
      ),
    };
  });

  const total = items.reduce((sum, item) => sum + item.score, 0);
  const level =
    total >= 85
      ? '面试可用'
      : total >= 70
        ? '结构较完整'
        : total >= 50
          ? '需要补边界'
          : '还需重构答案';
  const suggestions = items
    .filter((item) => item.score < item.max * 0.65)
    .slice(0, 3)
    .map((item) => item.hint);

  return { total, level, items, suggestions };
}
