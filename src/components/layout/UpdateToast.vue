<script setup lang="ts">
import { ref, watch } from 'vue';
import { useAppUpdate } from '@/composables/useAppUpdate';
import AppIcon from '@/components/icon/AppIcon.vue';

const { needRefresh, offlineReady, applyUpdate } = useAppUpdate();

const dismissedNeedRefresh = ref(false);
const dismissedOfflineReady = ref(false);
const applying = ref(false);

watch(needRefresh, (v) => {
  if (v) dismissedNeedRefresh.value = false;
});
watch(offlineReady, (v) => {
  if (v) {
    dismissedOfflineReady.value = false;
    // 离线就绪是一次性轻提示，5s 后自动收起
    setTimeout(() => {
      dismissedOfflineReady.value = true;
    }, 5000);
  }
});

async function onApply() {
  applying.value = true;
  await applyUpdate();
}

function onDismissUpdate() {
  dismissedNeedRefresh.value = true;
}

function onDismissOffline() {
  dismissedOfflineReady.value = true;
}
</script>

<template>
  <Teleport to="body">
    <Transition name="toast">
      <div
        v-if="needRefresh && !dismissedNeedRefresh"
        class="toast toast-update"
        role="status"
        aria-live="polite"
      >
        <div class="toast-icon"><AppIcon name="reload" /></div>
        <div class="toast-body">
          <div class="toast-title">检测到新版本</div>
          <div class="toast-desc">题库内容、组件或样式已更新，立即应用以加载最新内容。</div>
        </div>
        <div class="toast-actions">
          <button
            class="btn btn-primary"
            :disabled="applying"
            :aria-busy="applying"
            @click="onApply"
          >
            {{ applying ? '更新中…' : '立即更新' }}
          </button>
          <button class="btn btn-ghost" :disabled="applying" @click="onDismissUpdate">稍后</button>
        </div>
      </div>
    </Transition>

    <Transition name="toast">
      <div
        v-if="offlineReady && !dismissedOfflineReady"
        class="toast toast-offline"
        role="status"
        aria-live="polite"
      >
        <div class="toast-icon"><AppIcon name="checkCircle" /></div>
        <div class="toast-body">
          <div class="toast-title">离线就绪</div>
          <div class="toast-desc">资源已缓存，断网也能继续刷题。</div>
        </div>
        <button class="btn btn-ghost" aria-label="关闭" @click="onDismissOffline">
          <AppIcon name="close" />
        </button>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.toast {
  position: fixed;
  right: 20px;
  bottom: 20px;
  max-width: 380px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--c-shadow-lg);
  z-index: 200;
}
.toast + .toast {
  /* 同时存在两个时让 offline 上移一点 */
  bottom: 130px;
}

.toast-icon {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--c-primary-soft);
  color: var(--c-primary);
  font-size: 16px;
}
.toast-offline .toast-icon {
  background: rgba(16, 185, 129, 0.15);
  color: var(--c-success);
}

.toast-body {
  flex: 1;
  min-width: 0;
}
.toast-title {
  font-weight: 600;
  font-size: 14px;
  color: var(--c-text);
  margin-bottom: 2px;
}
.toast-desc {
  font-size: 12.5px;
  color: var(--c-text-soft);
  line-height: 1.5;
}

.toast-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}
.toast-actions .btn {
  font-size: 12.5px;
  padding: 5px 12px;
  white-space: nowrap;
}

@media (max-width: 540px) {
  .toast {
    left: 12px;
    right: 12px;
    max-width: none;
    bottom: 12px;
  }
  .toast + .toast {
    bottom: 110px;
  }
  .toast-actions {
    flex-direction: row;
  }
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
