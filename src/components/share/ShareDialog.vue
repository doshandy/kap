<script setup lang="ts">
import { ref, watch } from 'vue';
import QRCode from 'qrcode';
import type { Question } from '@/types/content';
import AppIcon from '@/components/icon/AppIcon.vue';

const props = defineProps<{ open: boolean; question: Question }>();
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>();

const qrUrl = ref('');
const link = ref('');
const copied = ref(false);

watch(
  () => props.open,
  async (v) => {
    if (!v) return;
    const base = window.location.origin + import.meta.env.BASE_URL.replace(/\/$/, '');
    link.value = `${base}/q/${props.question.categoryId}/${props.question.slug}`;
    qrUrl.value = await QRCode.toDataURL(link.value, { margin: 1, width: 220 });
    copied.value = false;
  },
);

function copy() {
  navigator.clipboard?.writeText(link.value);
  copied.value = true;
  setTimeout(() => (copied.value = false), 1500);
}

function close() {
  emit('update:open', false);
}
</script>

<template>
  <Teleport to="body">
    <div v-if="props.open" class="overlay" @click.self="close">
      <div class="card panel">
        <header>
          <h3><AppIcon name="share" /> 分享题目</h3>
          <button class="btn btn-ghost btn-icon close" aria-label="关闭" @click="close">
            <AppIcon name="close" />
          </button>
        </header>
        <div class="content">
          <img v-if="qrUrl" :src="qrUrl" alt="QR" class="qr" />
          <div class="link-row">
            <input :value="link" readonly />
            <button class="btn btn-primary" title="复制分享链接到剪贴板" @click="copy">
              {{ copied ? '已复制' : '复制链接' }}
            </button>
          </div>
          <p class="hint">扫码或复制链接即可分享给朋友。链接为 history 路由深链接。</p>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}
.panel {
  width: min(92vw, 420px);
  padding: 18px 22px;
}
header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}
.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}
.qr {
  width: 220px;
  height: 220px;
  border-radius: var(--radius);
}
.link-row {
  display: flex;
  width: 100%;
  gap: 6px;
}
.link-row input {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid var(--c-border);
  border-radius: var(--radius);
  background: var(--c-bg-soft);
}
.hint {
  font-size: 12px;
  color: var(--c-text-mute);
  text-align: center;
}
</style>
