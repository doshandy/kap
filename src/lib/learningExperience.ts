import type { Category, Question, QuestionStatus } from '@/types/content';
import type { WrongReason } from '@/stores/marks';

export interface LearningRecordLike {
  status: QuestionStatus;
  viewedAt: number;
  reviewedTimes: number;
}

export interface LearningSignals {
  getStatus: (id: string) => QuestionStatus;
  getRecord: (id: string) => LearningRecordLike;
  isStarred: (id: string) => boolean;
  isSkipped: (id: string) => boolean;
  wrongReasonsOf: (id: string) => WrongReason[];
}

export interface PreInterviewPick {
  question: Question;
  score: number;
  reasons: string[];
}

export const SCENARIO_SEARCHES = [
  { label: '高频必会', keyword: '高频 核心 面试 必会' },
  { label: '项目亮点', keyword: '项目 方案 落地 业务 场景' },
  { label: '性能优化', keyword: '性能 优化 缓存 首屏 指标' },
  { label: '源码原理', keyword: '原理 源码 机制 实现' },
  { label: '安全风险', keyword: '安全 XSS CSRF 权限 风险' },
  { label: '大厂追问', keyword: '追问 面试官 边界 取舍' },
] as const;

export function stripHtml(html = ''): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function questionUrl(q: Question): string {
  return `/q/${q.categoryId}/${q.slug}`;
}

export function pickContinueQuestion(
  categories: Category[],
  questions: Question[],
  signals: LearningSignals,
  dueIds: string[] = [],
): { question?: Question; reason: string } {
  const byId = new Map(questions.map((q) => [q.id, q]));
  const ordered = categories.flatMap((c) => c.questions).filter((q) => !signals.isSkipped(q.id));

  for (const id of dueIds) {
    const dueQuestion = byId.get(id);
    if (!dueQuestion || signals.isSkipped(dueQuestion.id)) continue;
    return { question: dueQuestion, reason: '优先处理今日到期复习题' };
  }

  const latest = ordered
    .filter((q) => signals.getRecord(q.id).viewedAt > 0)
    .sort((a, b) => signals.getRecord(b.id).viewedAt - signals.getRecord(a.id).viewedAt)[0];

  if (latest && signals.getStatus(latest.id) !== 'mastered') {
    return { question: latest, reason: '继续上次未掌握题目' };
  }

  if (latest) {
    const idx = ordered.findIndex((q) => q.id === latest.id);
    const next = ordered
      .slice(Math.max(0, idx + 1))
      .find((q) => signals.getStatus(q.id) !== 'mastered');
    if (next) return { question: next, reason: '从上次进度继续下一道未掌握题' };
  }

  const firstPending = ordered.find((q) => signals.getStatus(q.id) !== 'mastered');
  if (firstPending) return { question: firstPending, reason: '优先从未掌握题开始推进' };

  return { question: ordered[0], reason: '从题库第一道未跳过题开始' };
}

export function weakCategories(categories: Category[], signals: LearningSignals, limit = 5) {
  return categories
    .map((category) => {
      let total = 0;
      let done = 0;
      let mastered = 0;
      let review = 0;
      let wrong = 0;
      let starred = 0;
      for (const q of category.questions) {
        if (signals.isSkipped(q.id)) continue;
        total++;
        const status = signals.getStatus(q.id);
        if (status !== 'todo') done++;
        if (status === 'mastered') mastered++;
        if (status === 'review' || status === 'fuzzy') review++;
        if (signals.wrongReasonsOf(q.id).length) wrong++;
        if (signals.isStarred(q.id)) starred++;
      }
      const masteredRate = total ? mastered / total : 0;
      const reviewRate = total ? review / total : 0;
      const wrongRate = total ? wrong / total : 0;
      const score = masteredRate - reviewRate - wrongRate * 0.4;
      return { category, total, done, mastered, review, wrong, starred, masteredRate, score };
    })
    .filter((item) => item.done >= 3 || item.review > 0 || item.wrong > 0 || item.starred > 0)
    .sort((a, b) => a.score - b.score || b.review - a.review)
    .slice(0, limit);
}

export function weakTrainingQuestions(
  categories: Category[],
  signals: LearningSignals,
  limit = 12,
) {
  const weak = weakCategories(categories, signals, 3);
  const weakIds = new Set(weak.map((item) => item.category.id));
  const pool = categories
    .flatMap((c) => c.questions)
    .filter((q) => weakIds.has(q.categoryId) && !signals.isSkipped(q.id))
    .sort((a, b) => trainingPriority(b, signals) - trainingPriority(a, signals));
  const primary = pool.filter((q) => signals.getStatus(q.id) !== 'mastered').slice(0, limit);
  if (primary.length >= limit) return primary;
  const fallback = pool
    .filter(
      (q) => signals.getStatus(q.id) === 'mastered' && !primary.some((item) => item.id === q.id),
    )
    .slice(0, limit - primary.length);
  return [...primary, ...fallback];
}

export function wrongReviewQuestions(
  questions: Question[],
  signals: LearningSignals,
  reason?: string,
  options: { includeSkipped?: boolean } = {},
) {
  return questions
    .filter((q) => {
      if (!options.includeSkipped && signals.isSkipped(q.id)) return false;
      const reasons = signals.wrongReasonsOf(q.id);
      return reasons.length > 0 && (!reason || reasons.includes(reason as WrongReason));
    })
    .sort((a, b) => signals.getRecord(b.id).viewedAt - signals.getRecord(a.id).viewedAt);
}

export function preInterviewQuestions(questions: Question[], signals: LearningSignals, limit = 30) {
  return preInterviewPicks(questions, signals, limit).map((item) => item.question);
}

export function preInterviewPicks(
  questions: Question[],
  signals: LearningSignals,
  limit = 30,
): PreInterviewPick[] {
  const pool = questions.filter((q) => !signals.isSkipped(q.id));
  const weakSet = new Set(weakCategoryIdsFromQuestions(pool, signals));
  const ranked = pool
    .map((question) => {
      const status = signals.getStatus(question.id);
      const wrongReasons = signals.wrongReasonsOf(question.id);
      const reasons = new Set<string>();
      let score = trainingPriority(question, signals);
      if (status === 'review' || status === 'fuzzy') {
        reasons.add('需复习/模糊');
        score += 35;
      }
      if (wrongReasons.length) {
        reasons.add('最近错因题');
        score += 30;
      }
      if (signals.isStarred(question.id) && status !== 'mastered') {
        reasons.add('收藏未掌握');
        score += 25;
      }
      if (question.tags.some((tag) => /高频|核心|面试/.test(tag)) && status !== 'mastered') {
        reasons.add('高频未掌握');
        score += 25;
      }
      if (weakSet.has(question.categoryId) && status !== 'mastered') {
        reasons.add('薄弱分类题');
        score += 18;
      }
      if (!reasons.size) reasons.add(status === 'mastered' ? '稳态复盘题' : '综合优先级高');
      return { question, score, reasons: [...reasons] };
    })
    .sort((a, b) => b.score - a.score || b.question.title.localeCompare(a.question.title));

  const primary = ranked
    .filter((item) => signals.getStatus(item.question.id) !== 'mastered')
    .slice(0, limit);
  if (primary.length >= limit) return primary;
  const fallback = ranked
    .filter(
      (item) =>
        signals.getStatus(item.question.id) === 'mastered' &&
        !primary.some((picked) => picked.question.id === item.question.id),
    )
    .slice(0, limit - primary.length);
  return [...primary, ...fallback];
}

function weakCategoryIdsFromQuestions(questions: Question[], signals: LearningSignals): string[] {
  const map = new Map<string, { total: number; mastered: number; review: number; wrong: number }>();
  for (const q of questions) {
    const current = map.get(q.categoryId) || { total: 0, mastered: 0, review: 0, wrong: 0 };
    current.total++;
    const status = signals.getStatus(q.id);
    if (status === 'mastered') current.mastered++;
    if (status === 'review' || status === 'fuzzy') current.review++;
    if (signals.wrongReasonsOf(q.id).length) current.wrong++;
    map.set(q.categoryId, current);
  }
  return [...map.entries()]
    .map(([id, stat]) => {
      const total = Math.max(1, stat.total);
      const score = stat.mastered / total - stat.review / total - stat.wrong / total;
      return { id, score, review: stat.review };
    })
    .sort((a, b) => a.score - b.score || b.review - a.review)
    .slice(0, 3)
    .map((item) => item.id);
}

export function buildReciteCards(q: Question) {
  return [
    { title: '结论卡', body: stripHtml(q.summary || q.answer).slice(0, 220) },
    { title: '原理卡', body: stripHtml(q.answer).slice(0, 420) },
    { title: '示例卡', body: stripHtml(q.code || q.extra || q.question).slice(0, 360) },
    {
      title: '误区卡',
      body: stripHtml(q.pitfall || '暂无单独误区，建议对照完整答案补充边界、性能和安全取舍。'),
    },
    {
      title: '追问卡',
      body: stripHtml(q.followup || '暂无单独追问，可以围绕场景、边界、取舍继续自问。'),
    },
  ].filter((card) => card.body);
}

function trainingPriority(q: Question, signals: LearningSignals): number {
  const status = signals.getStatus(q.id);
  let score = 0;
  if (status === 'review') score += 80;
  if (status === 'fuzzy') score += 70;
  if (status === 'todo') score += 40;
  if (signals.isStarred(q.id)) score += 30;
  score += signals.wrongReasonsOf(q.id).length * 20;
  if (q.difficulty === '资深') score += 14;
  if (q.difficulty === '进阶') score += 8;
  if (q.tags.some((tag) => /高频|核心|面试/.test(tag))) score += 18;
  return score;
}
