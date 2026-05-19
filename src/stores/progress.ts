import { defineStore } from 'pinia';
import { computed, reactive, watch } from 'vue';
import type { QuestionStatus } from '@/types/content';
import { readState, writeState } from './persist';

export interface ProgressEvent {
  type: 'status' | 'wrong-reason' | 'note' | 'view';
  at: number;
  label: string;
  detail?: string;
}

interface ProgressRecord {
  status: QuestionStatus;
  viewedAt: number;
  reviewedTimes: number;
  /** 历史日期戳 (yyyy-mm-dd) → 完成次数（用于热力图） */
  history: Record<string, number>;
  events?: ProgressEvent[];
}

interface ProgressState {
  records: Record<string, ProgressRecord>;
}

interface CategoryProgressStats {
  total: number;
  learned: number;
  done: number;
  mastered: number;
  review: number;
}

const KEY = 'progress';
const VIEW_TOUCH_INTERVAL_MS = 10_000;
const VIEW_EVENT_INTERVAL_MS = 30 * 60_000;

function defaultRecord(): ProgressRecord {
  return { status: 'todo', viewedAt: 0, reviewedTimes: 0, history: {}, events: [] };
}

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const useProgressStore = defineStore('progress', () => {
  const state = reactive<ProgressState>(readState<ProgressState>(KEY, { records: {} }));

  watch(state, (v) => writeState(KEY, v), { deep: true });

  function ensure(id: string): ProgressRecord {
    if (!state.records[id]) state.records[id] = defaultRecord();
    return state.records[id];
  }

  function get(id: string): ProgressRecord {
    return state.records[id] ?? defaultRecord();
  }

  function setStatus(id: string, status: QuestionStatus): void {
    const r = ensure(id);
    const previous = r.status;
    r.status = status;
    r.viewedAt = Date.now();
    if (status !== 'todo' && previous !== status) {
      r.reviewedTimes += 1;
      const day = todayStr();
      r.history[day] = (r.history[day] || 0) + 1;
      addEvent(id, {
        type: 'status',
        label: `标记为${statusLabel(status)}`,
        detail: previous === 'todo' ? '第一次进入学习记录' : `从${statusLabel(previous)}调整`,
      });
    }
  }

  function markViewed(id: string, source = '浏览题目'): void {
    const r = ensure(id);
    const now = Date.now();
    if (now - r.viewedAt < VIEW_TOUCH_INTERVAL_MS) return;
    const events = r.events || [];
    const latestViewEvent = events.find((event) => event.type === 'view');
    r.viewedAt = now;
    if (latestViewEvent && now - latestViewEvent.at < VIEW_EVENT_INTERVAL_MS) return;
    events.unshift({ type: 'view', at: now, label: '浏览题目', detail: source });
    r.events = events.slice(0, 30);
  }

  function addEvent(id: string, event: Omit<ProgressEvent, 'at'>): void {
    const r = ensure(id);
    r.viewedAt = Date.now();
    const events = r.events || [];
    events.unshift({ ...event, at: Date.now() });
    r.events = events.slice(0, 30);
  }

  function reset(id: string): void {
    delete state.records[id];
  }

  const totalLearned = computed(
    () => Object.values(state.records).filter((r) => r.status !== 'todo').length,
  );
  const totalDone = computed(() => totalLearned.value);

  function totalLearnedFor(ids: Iterable<string>): number {
    let total = 0;
    for (const id of ids) {
      const record = state.records[id];
      if (record && record.status !== 'todo') total++;
    }
    return total;
  }

  function totalDoneFor(ids: Iterable<string>): number {
    return totalLearnedFor(ids);
  }

  const heatmap = computed(() => {
    const map: Record<string, number> = {};
    for (const r of Object.values(state.records)) {
      for (const [d, n] of Object.entries(r.history)) {
        map[d] = (map[d] || 0) + n;
      }
    }
    return map;
  });

  function heatmapFor(ids: Iterable<string>): Record<string, number> {
    const map: Record<string, number> = {};
    for (const id of ids) {
      const record = state.records[id];
      if (!record) continue;
      for (const [d, n] of Object.entries(record.history)) {
        map[d] = (map[d] || 0) + n;
      }
    }
    return map;
  }

  function statsByCategory(
    allByCat: Record<string, string[]>,
  ): Record<string, CategoryProgressStats> {
    const out: Record<string, CategoryProgressStats> = {};
    for (const [cat, ids] of Object.entries(allByCat)) {
      let learned = 0;
      let mastered = 0;
      let review = 0;
      for (const id of ids) {
        const r = state.records[id];
        if (!r) continue;
        if (r.status !== 'todo') learned++;
        if (r.status === 'mastered') mastered++;
        if (r.status === 'review' || r.status === 'fuzzy') review++;
      }
      out[cat] = { total: ids.length, learned, done: learned, mastered, review };
    }
    return out;
  }

  return {
    state,
    get,
    setStatus,
    markViewed,
    addEvent,
    reset,
    totalLearned,
    totalDone,
    totalLearnedFor,
    totalDoneFor,
    heatmap,
    heatmapFor,
    statsByCategory,
  };
});

function statusLabel(status: QuestionStatus): string {
  if (status === 'mastered') return '已掌握';
  if (status === 'review') return '需复习';
  if (status === 'fuzzy') return '模糊';
  return '未做';
}
