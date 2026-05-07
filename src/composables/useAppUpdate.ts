/**
 * PWA 更新管理：
 * - 暴露 needRefresh / offlineReady 响应式状态给 UI 提示
 * - applyUpdate(): 用户点「立即更新」时调用，触发 SW skipWaiting + reload
 * - forceReload(): 设置页 / 异常状态下，无 update 也能调用——卸载所有 SW + 清空 caches + reload
 *
 * 注意：vite-plugin-pwa 的 virtual:pwa-register/vue 入口在 dev 默认禁用 SW，
 * 所以 dev 期间所有提示都不会触发，只在 build/preview/线上才生效。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue';

const needRefresh = ref(false);
const offlineReady = ref(false);
const checking = ref(false);

let updateSWFn: ((reloadPage?: boolean) => Promise<void>) | null = null;
let registered = false;

async function ensureRegistered() {
  if (registered) return;
  registered = true;
  try {
    // 动态 import：dev 环境 vite-plugin-pwa 也提供该 virtual 模块
    const mod = await import('virtual:pwa-register');
    updateSWFn = mod.registerSW({
      immediate: true,
      onNeedRefresh() {
        needRefresh.value = true;
      },
      onOfflineReady() {
        offlineReady.value = true;
      },
      onRegisteredSW(_swUrl, registration) {
        // 每隔 30 分钟主动 update 一次，让长期挂起的页面也能收到新版本
        if (!registration) return;
        setInterval(
          () => {
            void registration.update();
          },
          30 * 60 * 1000,
        );
      },
    });
  } catch (e) {
    console.warn('[KAP] PWA register failed (likely dev mode without SW):', e);
  }
}

export async function checkForUpdates(): Promise<boolean> {
  if (checking.value) return needRefresh.value;
  checking.value = true;
  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.update();
        // 给 onNeedRefresh 一点时间触发
        await new Promise((r) => setTimeout(r, 800));
      }
    }
    return needRefresh.value;
  } finally {
    checking.value = false;
  }
}

/**
 * 应用更新：让等待中的 SW 接管 + 刷新页面。
 */
export async function applyUpdate(): Promise<void> {
  if (updateSWFn) {
    await updateSWFn(true);
  } else {
    location.reload();
  }
}

/**
 * 强制刷新：忽略当前缓存状态，把 SW + Cache Storage 全卸了再 reload。
 * 给设置页"强制更新"用，覆盖"已离线就绪但题目数还停留在旧版"等异常情况。
 */
export async function forceReload(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if (typeof caches !== 'undefined' && caches?.keys) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    sessionStorage.removeItem('kap-chunk-reload-ts');
  } catch (e) {
    console.warn('[KAP] forceReload cleanup failed:', e);
  } finally {
    // 加 querystring 强迫所有中间层缓存（CDN / 浏览器）失效一次
    const u = new URL(location.href);
    u.searchParams.set('_v', String(Date.now()));
    location.replace(u.toString());
  }
}

export function useAppUpdate() {
  onMounted(() => {
    void ensureRegistered();
  });
  // 不卸载注册：SW 是全局的，关闭单一组件不应影响
  onBeforeUnmount(() => {});
  return {
    needRefresh,
    offlineReady,
    checking,
    checkForUpdates,
    applyUpdate,
    forceReload,
  };
}
