// Single Page App fallback redirect.
// 把当前 path/search/hash 编码成 ?p=... 跳到应用入口，让 index.html 还原真实路由。
(function () {
  var l = window.location;
  var basePath = '/';
  var script = document.currentScript;
  if (script && script.src) {
    try {
      var scriptUrl = new URL(script.src, l.href);
      basePath = scriptUrl.pathname.replace(/\/spa-redirect\.js$/, '/');
    } catch {
      basePath = '/';
    }
  } else if (l.pathname.indexOf('/kap/') === 0) {
    // 无法读 currentScript 时兼容 GitHub Pages 默认仓库基座。
    basePath = '/kap/';
  }

  if (!basePath.startsWith('/')) basePath = '/' + basePath;
  if (!basePath.endsWith('/')) basePath += '/';

  var path = l.pathname;
  if (basePath !== '/' && l.pathname.indexOf(basePath) === 0) {
    path = l.pathname.slice(basePath.length - 1) || '/';
  }
  if (!path.startsWith('/')) path = '/' + path;

  var target = new URL(l.protocol + '//' + l.host + basePath);
  target.searchParams.set('p', encodeURIComponent(path));
  if (l.search) target.searchParams.set('q', encodeURIComponent(l.search.slice(1)));
  target.hash = l.hash || '';
  l.replace(target.toString());
})();
