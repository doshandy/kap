import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './styles/reset.css';
import './styles/theme.css';
import './styles/prism.css';
import './styles/print.css';

const app = createApp(App);

app.config.errorHandler = (err, _instance, info) => {
  console.error('[KAP] Vue error:', info, err);
};

window.addEventListener('unhandledrejection', (e) => {
  console.error('[KAP] Unhandled rejection:', e.reason);
});

const CHUNK_RELOAD_KEY = 'kap-chunk-reload-ts';

function getLastChunkReload(): number {
  try {
    return Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || '0');
  } catch {
    return 0;
  }
}

function markChunkReload(): void {
  try {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
  } catch {
    // Storage can be blocked in private or embedded contexts. Reload once anyway.
  }
}

router.onError((err) => {
  const msg = String((err as Error)?.message || '');
  if (
    /Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
      msg,
    )
  ) {
    const last = getLastChunkReload();
    if (Date.now() - last > 10_000) {
      markChunkReload();
      location.reload();
    }
  }
});

app.use(createPinia());
app.use(router);

app.mount('#app');
