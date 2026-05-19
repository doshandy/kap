const l = window.location;
if (l.search.indexOf('?p=/') === 0 || l.search.indexOf('&p=/') !== -1) {
  const u = new URL(l.href);
  const pRaw = u.searchParams.get('p') || '';
  const qRaw = u.searchParams.get('q') || '';
  const decode = (value: string) => {
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  };
  const p = decode(pRaw);
  const q = decode(qRaw);
  u.searchParams.delete('p');
  u.searchParams.delete('q');
  const hash = u.hash || '';
  const normalizedPath = p.startsWith('/') ? p : `/${p}`;
  const newUrl = l.pathname.replace(/\/$/, '') + normalizedPath + (q ? `?${q}` : '') + hash;
  window.history.replaceState(null, '', newUrl);
}
