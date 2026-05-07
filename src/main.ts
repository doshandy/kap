import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { initContent } from './lib/loadContent';
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
router.onError((err) => {
  const msg = String((err as Error)?.message || '');
  if (
    /Loading chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
      msg,
    )
  ) {
    const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || '0');
    if (Date.now() - last > 10_000) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
      location.reload();
    }
  }
});

app.use(createPinia());
app.use(router);

// 启动期把 28 个分类 markdown 并行加载完毕，再挂载根组件。
// 之后 useContent() 等同步 API 即可正常使用，无需改造业务代码。
initContent()
  .catch((e) => {
    console.error('[KAP] initContent failed:', e);
  })
  .finally(() => {
    app.mount('#app');
  });
