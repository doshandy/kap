/**
 * PWA 更新管理（self-destruct 自愈期版本）
 * ----------------------------------------
 * 当前线上 vite-plugin-pwa 已临时禁用，sw.js 是 public/sw.js 里的自杀脚本。
 * 因此本 composable 不再调用 virtual:pwa-register，需求收敛为：
 *   - needRefresh / offlineReady：保留 ref 接口（toast 组件还在用），永远 false
 *   - applyUpdate(): 直接 forceReload
 *   - forceReload(): 卸 SW + 清 caches + 带 cache-buster reload
 *   - checkForUpdates(): 主动注册 /kap/sw.js（如果还没注册），让自杀脚本立即生效
 *   - 监听 sw 发来的 'kap-sw-self-destruct' 消息，收到就 reload
 *
 * 等线上自愈期结束，重新启用 vite-plugin-pwa 时，再把 ensureRegistered 的实现切回 prompt 流程。
 */
import { onBeforeUnmount, onMounted, ref } from 'vue';

const needRefresh = ref(false);
const offlineReady = ref(false);
const checking = ref(false);

async function ensureSelfDestructSW() {
  // 自愈期内：只对已注册的旧 SW 触发 update（让它拉自杀脚本），
  // 不主动 register 新 SW；让 inline cleanup 脚本去 unregister。
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg) await reg.update();
  } catch (e) {
    console.warn('[KAP] SW update failed:', e);
  }
}

let messageBound = false;
function bindMessageOnce() {
  if (messageBound) return;
  if (!('serviceWorker' in navigator)) return;
  messageBound = true;
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event?.data && event.data.type === 'kap-sw-self-destruct') {
      const u = new URL(location.href);
      u.searchParams.set('_v', String(Date.now()));
      location.replace(u.toString());
    }
  });
}

export async function checkForUpdates(): Promise<boolean> {
  if (checking.value) return false;
  checking.value = true;
  try {
    await ensureSelfDestructSW();
    return false;
  } finally {
    checking.value = false;
  }
}

export async function applyUpdate(): Promise<void> {
  await forceReload();
}

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
    const u = new URL(location.href);
    u.searchParams.set('_v', String(Date.now()));
    location.replace(u.toString());
  }
}

export function useAppUpdate() {
  onMounted(() => {
    bindMessageOnce();
    void ensureSelfDestructSW();
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
