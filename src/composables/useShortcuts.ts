import { onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSettingsStore } from '@/stores/settings';
import { useContent } from './useContent';

type Handler = () => void;

const isEditable = (el: EventTarget | null): boolean => {
  if (!el) return false;
  const e = el as HTMLElement;
  if (!e.tagName) return false;
  const t = e.tagName.toLowerCase();
  return t === 'input' || t === 'textarea' || e.isContentEditable;
};

export function useShortcuts(handlers: Record<string, Handler> = {}) {
  const settings = useSettingsStore();
  const router = useRouter();
  const route = useRoute();
  const { categories, allQuestions } = useContent();

  function jumpRelative(delta: 1 | -1) {
    if (route.name !== 'question') return;
    const id = `${route.params.categoryId}/${route.params.slug}`;
    const idx = allQuestions.value.findIndex((q) => q.id === id);
    if (idx < 0) return;
    const next = allQuestions.value[(idx + delta + allQuestions.value.length) % allQuestions.value.length];
    router.push({ name: 'question', params: { categoryId: next.categoryId, slug: next.slug } });
  }

  function jumpCategoryRelative(delta: 1 | -1) {
    const cats = categories.value;
    if (!cats.length) return;
    let idx = cats.findIndex((c) => c.id === route.params.categoryId);
    if (idx < 0) idx = 0;
    const next = cats[(idx + delta + cats.length) % cats.length];
    router.push({ name: 'category', params: { categoryId: next.id } });
  }

  function onKey(e: KeyboardEvent) {
    if (!settings.state.shortcutsEnabled) return;
    if (isEditable(e.target)) return;
    if (e.metaKey || e.ctrlKey || e.altKey) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handlers['cmdk']?.();
      }
      return;
    }
    const key = e.key;
    if (key === 'j') {
      e.preventDefault();
      jumpRelative(1);
    } else if (key === 'k') {
      e.preventDefault();
      jumpRelative(-1);
    } else if (key === 'h') {
      e.preventDefault();
      jumpCategoryRelative(-1);
    } else if (key === 'l') {
      e.preventDefault();
      jumpCategoryRelative(1);
    } else if (key === '/') {
      e.preventDefault();
      handlers['search']?.();
    } else if (key === '?') {
      e.preventDefault();
      handlers['help']?.();
    } else if (key === ' ') {
      if (handlers['toggleAnswer']) {
        e.preventDefault();
        handlers['toggleAnswer']?.();
      }
    } else if (key === 'm') {
      handlers['mark']?.();
    } else if (key === 'r') {
      handlers['review']?.();
    } else if (key === 'n') {
      handlers['note']?.();
    }
  }

  onMounted(() => window.addEventListener('keydown', onKey));
  onUnmounted(() => window.removeEventListener('keydown', onKey));
}
