export type Difficulty = '基础' | '进阶' | '资深';
export type QuestionStatus = 'todo' | 'mastered' | 'fuzzy' | 'review';

export interface Question {
  /** 全局唯一 ID：`${categoryId}/${slug}` */
  id: string;
  categoryId: string;
  slug: string;
  title: string;
  difficulty: Difficulty;
  tags: string[];
  /** HTML 后的一句话理解（可选） */
  summary?: string;
  /** HTML 后的题面 */
  question: string;
  /** HTML 后的答案 */
  answer: string;
  /** HTML 后的代码块（可选） */
  code?: string;
  /** HTML 后的常见误区 / 反例（可选） */
  pitfall?: string;
  /** HTML 后的面试官追问（可选） */
  followup?: string;
  /** 追问题所属的原题 ID：`${categoryId}/${slug}` */
  parentId?: string;
  /** 原题关联的追问题 ID 列表 */
  followupQuestionIds?: string[];
  /** 跨题相关题目 ID 列表，用于补充前置、进阶、对比和案例题 */
  relatedQuestionIds?: string[];
  /** HTML 后的延伸内容（可选） */
  extra?: string;
  /** 原始 markdown 用于导出 */
  raw: string;
}

export interface Category {
  id: string;
  title: string;
  order: number;
  icon: string;
  description?: string;
  questions: Question[];
}

export interface ContentIndex {
  categories: Category[];
  questionMap: Map<string, Question>;
  allQuestions: Question[];
}

export interface FilterState {
  keyword: string;
  difficulties: Difficulty[];
  tags: string[];
  statuses: QuestionStatus[];
}
