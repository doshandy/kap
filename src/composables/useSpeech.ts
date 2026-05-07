import { onBeforeUnmount, ref } from 'vue';

const isSpeaking = ref(false);
let currentUtter: SpeechSynthesisUtterance | null = null;

export function speak(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'zh-CN';
  u.rate = 1;
  u.pitch = 1;
  u.onstart = () => (isSpeaking.value = true);
  u.onend = () => {
    isSpeaking.value = false;
    if (currentUtter === u) currentUtter = null;
  };
  u.onerror = () => {
    isSpeaking.value = false;
    if (currentUtter === u) currentUtter = null;
  };
  currentUtter = u;
  speechSynthesis.speak(u);
}

export function stopSpeak(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  isSpeaking.value = false;
  currentUtter = null;
}

export function useSpeechController(getText: () => string) {
  function toggle() {
    if (isSpeaking.value) {
      stopSpeak();
    } else {
      speak(getText());
    }
  }
  onBeforeUnmount(() => {
    if (isSpeaking.value) stopSpeak();
  });
  return { isSpeaking, toggle };
}

export function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
