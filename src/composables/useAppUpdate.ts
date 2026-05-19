/**
 * PWA 更新管理。
 *
 * - vite-plugin-pwa 配置为 autoUpdate + skipWaiting + clientsClaim：
 *   新版本 SW 一旦下载完成就接管页面，旧缓存自动清理。
 * - 我们仍然把 needRefresh / offlineReady 暴露给 UI（UpdateToast 用它来弹"内容已更新，
 *   建议刷新"提示）；用户点 toast 后或点设置页"强制更新"，调用 forceReload。
 * - dev 环境下 vite-plugin-pwa 默认不注册 SW，所有 ref 永远 false，不会打扰。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue';

const needRefresh = ref(false);
const offlineReady = ref(false);
const checking = ref(false);

let updateSWFn: ((reloadPage?: boolean) => Promise<void>) | null = null;
let registered = false;
const APP_BASE = normalizeBase(import.meta.env.BASE_URL);

export function normalizeBase(raw: string | undefined): string {
  const value = (raw || '/').trim() || '/';
  const withLeading = value.startsWith('/') ? value : `/${value}`;
  return withLeading.endsWith('/') ? withLeading : `${withLeading}/`;
}

export function normalizePathname(pathname: string): string {
  const normalized = normalizeBase(pathname);
  return normalized === '//' ? '/' : normalized;
}

export function scopeMatchesAppBase(scope: string, appBase = APP_BASE): boolean {
  const normalizedBase = normalizeBase(appBase);
  try {
    const pathname = normalizePathname(new URL(scope).pathname);
    if (normalizedBase === '/') return pathname === '/';
    return pathname === normalizedBase || pathname.startsWith(normalizedBase);
  } catch {
    return scope.includes(normalizedBase);
  }
}

async function ensureRegistered() {
  if (registered) return;
  registered = true;
  try {
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
        if (!registration) return;
        // 每 30 分钟主动 update 一次，让长期挂着标签页的用户也能及时拿到新版本
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
        await new Promise((r) => setTimeout(r, 800));
      }
    }
    return needRefresh.value;
  } finally {
    checking.value = false;
  }
}

/**
 * 触发新版本接管：autoUpdate 模式下 SW 已自动 skipWaiting，这里只需 reload 即可应用。
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
 * 设置页"强制更新"使用，覆盖任何异常缓存状态。
 */
export async function forceReload(): Promise<void> {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(
        regs.filter((r) => scopeMatchesAppBase(r.scope)).map((r) => r.unregister()),
      );
    }
    if (typeof caches !== 'undefined' && caches?.keys) {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.includes('kap')).map((k) => caches.delete(k)));
    }
    sessionStorage.removeItem('kap-chunk-reload-ts');
  } catch (e) {
    console.warn('[KAP] forceReload cleanup failed:', e);
  } finally {
    const u = new URL(location.href);
    u.searchParams.set('_v', String(Date.now()));
    location.replace(u.toString());
  }
}

export function useAppUpdate() {
  onMounted(() => {
    void ensureRegistered();
  });
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
