/**
 * FavorTab — 搜索引擎配置与搜索
 */

const ENGINES = [
  {
    id: 'google',
    name: 'Google',
    url: 'https://www.google.com/search?q=',
    placeholder: '在 Google 上搜索',
  },
  {
    id: 'baidu',
    name: '百度',
    url: 'https://www.baidu.com/s?wd=',
    placeholder: '在百度上搜索',
  },
  {
    id: 'bing',
    name: 'Bing',
    url: 'https://www.bing.com/search?q=',
    placeholder: '在 Bing 上搜索',
  },
  {
    id: 'sogou',
    name: '搜狗',
    url: 'https://www.sogou.com/web?query=',
    placeholder: '在搜狗上搜索',
  },
  {
    id: '360',
    name: '360搜索',
    url: 'https://www.so.com/s?q=',
    placeholder: '在 360 搜索',
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    url: 'https://duckduckgo.com/?q=',
    placeholder: '在 DuckDuckGo 上搜索',
  },
];

function getActiveEngine() {
  return localStorage.getItem('search_engine') || 'google';
}

function setActiveEngine(id) {
  localStorage.setItem('search_engine', id);
}

function getEngineById(id) {
  return ENGINES.find((e) => e.id === id) || ENGINES[0];
}

// ============================================================
//  背景：Bing 每日壁纸 + 自定义背景
// ============================================================

function renderEnginePicker() {
  const select = document.getElementById('engine-select');
  const active = getActiveEngine();
  const engine = getEngineById(active);

  select.innerHTML = ENGINES.map(
    (e) =>
      `<option value="${e.id}"${e.id === active ? ' selected' : ''}>${e.name}</option>`
  ).join('');

  document.getElementById('search-input').placeholder = engine.placeholder;

  select.addEventListener('change', () => {
    const id = select.value;
    if (id === getActiveEngine()) return;

    setActiveEngine(id);
    const newEngine = getEngineById(id);
    document.getElementById('search-input').placeholder = newEngine.placeholder;
    document.getElementById('search-input').focus();
  });
}

// ============================================================
//  搜索
// ============================================================

function doSearch() {
  const input = document.getElementById('search-input');
  const query = input.value.trim();
  if (query) {
    const engine = getEngineById(getActiveEngine());
    window.location.href = engine.url + encodeURIComponent(query);
  }
}

function setupSearch() {
  const input = document.getElementById('search-input');
  const btn = document.getElementById('search-btn');

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
  });

  btn.addEventListener('click', doSearch);
}

// ============================================================
//  书签
// ============================================================

// -- 点击计数 --
