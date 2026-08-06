/**
 * FavorTab — 极简新标签页
 * 背景：Bing 每日壁纸
 * 搜索：多引擎可切换
 * 书签：Chrome 风格大卡片，按文件夹层级展示
 */

// ============================================================
//  搜索引擎配置
// ============================================================
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
const CUSTOM_BG_KEY = 'custom_bg_url';

function getBgLayer() {
  return document.getElementById('bg-layer');
}

function hasCustomBg() {
  return !!localStorage.getItem(CUSTOM_BG_KEY);
}

function updateCopyright(text, link) {
  const el = document.getElementById('bg-copyright');
  if (!el) return;
  if (text && link) {
    el.innerHTML = `<a href="${link}" target="_blank" rel="noopener">${text}</a>`;
    el.style.display = '';
  } else {
    el.style.display = 'none';
  }
}

/** 应用背景图片到 bg-layer，带渐入效果 */
function applyBgImage(url) {
  const bgLayer = getBgLayer();
  if (!url) return;

  // 如果当前已经是同一张背景，跳过
  if (bgLayer.style.backgroundImage === `url("${url}")` || bgLayer.style.backgroundImage === `url(${url})`) return;

  bgLayer.style.backgroundImage = `url(${url})`;
  bgLayer.classList.remove('loaded');
  requestAnimationFrame(() => {
    bgLayer.classList.add('loaded');
  });
}

/** 加载自定义背景（localStorage 中保存的 base64 图片） */
function loadCustomBackground() {
  const customUrl = localStorage.getItem(CUSTOM_BG_KEY);
  if (!customUrl) return false;

  applyBgImage(customUrl);
  updateCopyright('', ''); // 隐藏版权信息
  return true;
}

/** 获取当前背景 URL（用于弹窗预览） */
function getCurrentBgUrl() {
  // 自定义背景优先
  const customUrl = localStorage.getItem(CUSTOM_BG_KEY);
  if (customUrl) return customUrl;
  // Bing 缓存
  return localStorage.getItem('bing_wallpaper_url') || '';
}

async function loadBingWallpaper() {
  const bgLayer = getBgLayer();

  // 如果用户设置了自定义背景，不加载 Bing
  if (hasCustomBg()) return;

  // 1. 立即展示缓存的壁纸（秒开）
  const cachedUrl = localStorage.getItem('bing_wallpaper_url');
  const cachedCopyright = localStorage.getItem('bing_wallpaper_copyright');
  const cachedCopyrightLink = localStorage.getItem('bing_wallpaper_copyrightlink');
  if (cachedUrl) {
    bgLayer.style.backgroundImage = `url(${cachedUrl})`;
    requestAnimationFrame(() => {
      bgLayer.classList.add('loaded');
    });
    updateCopyright(cachedCopyright, cachedCopyrightLink);
  }

  // 2. 后台获取最新壁纸
  try {
    const resp = await fetch(
      'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1'
    );
    const data = await resp.json();
    if (data.images && data.images.length > 0) {
      const img = data.images[0];
      const url = 'https://www.bing.com' + img.url;
      const copyright = img.copyright || '';
      const copyrightlink = img.copyrightlink || '';

      if (url === cachedUrl) return;

      const preloader = new Image();
      preloader.onload = () => {
        bgLayer.style.backgroundImage = `url(${url})`;
        bgLayer.classList.remove('loaded');
        requestAnimationFrame(() => {
          bgLayer.classList.add('loaded');
        });
        updateCopyright(copyright, copyrightlink);
        localStorage.setItem('bing_wallpaper_url', url);
        localStorage.setItem('bing_wallpaper_copyright', copyright);
        localStorage.setItem('bing_wallpaper_copyrightlink', copyrightlink);
      };
      preloader.src = url;
    }
  } catch {
    if (!cachedUrl) {
      document.body.style.backgroundColor = '#101010';
    }
  }
}

// ============================================================
//  设置面板（含背景管理 + UI 调节）
// ============================================================
const SETTINGS_KEY = 'ui_settings';

const DEFAULT_SETTINGS = {
  btnBlur: 10, btnOpacity: 8,
  searchBlur: 24, searchOpacity: 12,
  bmBlur: 18, bmOpacity: 38,
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function applySettings(s) {
  const root = document.documentElement.style;
  root.setProperty('--btn-blur', s.btnBlur + 'px');
  root.setProperty('--btn-bg-opacity', (s.btnOpacity / 100).toFixed(2));
  root.setProperty('--search-blur', s.searchBlur + 'px');
  root.setProperty('--search-bg-opacity', (s.searchOpacity / 100).toFixed(2));
  root.setProperty('--bm-blur', s.bmBlur + 'px');
  root.setProperty('--bm-bg-opacity', (s.bmOpacity / 100).toFixed(2));
}

const KEY_SUFFIX = {
  btnBlur:'px', btnOpacity:'%',
  searchBlur:'px', searchOpacity:'%',
  bmBlur:'px', bmOpacity:'%',
};

function setupSettings() {
  const settingsBtn = document.getElementById('settings-btn');
  const modal = document.getElementById('settings-modal');
  const resetBtn = document.getElementById('settings-reset-btn');

  // ---- 背景管理 ----
  const preview = document.getElementById('bg-preview');
  const uploadBtn = document.getElementById('bg-upload-btn');
  const fileInput = document.getElementById('bg-file-input');
  const bgResetBtn = document.getElementById('bg-reset-btn');

  function updatePreview() {
    const url = getCurrentBgUrl();
    preview.style.backgroundImage = url ? `url(${url})` : '';
  }

  uploadBtn.addEventListener('click', () => { fileInput.click(); });

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      compressImage(reader.result, (compressedUrl) => {
        localStorage.setItem(CUSTOM_BG_KEY, compressedUrl);
        applyBgImage(compressedUrl);
        updateCopyright('', '');
        updatePreview();
      });
    };
    reader.readAsDataURL(file);
    fileInput.value = '';
  });

  bgResetBtn.addEventListener('click', () => {
    localStorage.removeItem(CUSTOM_BG_KEY);
    loadBingWallpaper();
    setTimeout(updatePreview, 1500);
  });

  // ---- UI 设置 ----
  let settings = loadSettings();

  const sliders = {};
  modal.querySelectorAll('input[type="range"][data-key]').forEach(input => {
    const key = input.dataset.key;
    const row = input.closest('.setting-row');
    const val = row ? row.querySelector('.setting-val') : null;
    sliders[key] = { input, val };
  });

  function syncToUI(s) {
    for (const [key, { input, val }] of Object.entries(sliders)) {
      input.value = s[key];
      if (val) val.textContent = s[key] + (KEY_SUFFIX[key] || '');
    }
  }

  function syncFromUI() {
    for (const [key, { input }] of Object.entries(sliders)) {
      settings[key] = parseInt(input.value, 10);
      const val = sliders[key].val;
      if (val) val.textContent = settings[key] + (KEY_SUFFIX[key] || '');
    }
    saveSettings(settings);
    applySettings(settings);
  }

  syncToUI(settings);
  applySettings(settings);

  for (const { input } of Object.values(sliders)) {
    input.addEventListener('input', syncFromUI);
  }

  function openModal() {
    updatePreview();
    modal.style.display = 'flex';
  }

  function closeModal() {
    modal.style.display = 'none';
  }

  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    modal.style.display === 'flex' ? closeModal() : openModal();
  });

  document.addEventListener('click', (e) => {
    if (modal.style.display === 'flex' && !modal.contains(e.target) && e.target !== settingsBtn) {
      closeModal();
    }
  });

  resetBtn.addEventListener('click', () => {
    Object.assign(settings, DEFAULT_SETTINGS);
    syncToUI(settings);
    saveSettings(settings);
    applySettings(settings);
  });
}

/**
 * 压缩图片到适合壁纸的尺寸，避免 localStorage 超限。
 * 最大宽度 2560px，JPEG 质量 0.85。
 */
function compressImage(src, callback) {
  const img = new Image();
  img.onload = () => {
    const MAX_WIDTH = 2560;
    const QUALITY = 0.85;
    let { width, height } = img;

    // 等比缩放
    if (width > MAX_WIDTH) {
      height = Math.round(height * (MAX_WIDTH / width));
      width = MAX_WIDTH;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    callback(canvas.toDataURL('image/jpeg', QUALITY));
  };
  img.onerror = () => {
    // 压缩失败时回退原图
    callback(src);
  };
  img.src = src;
}

// ============================================================
//  搜索引擎选择器（左上角下拉）
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
function getClickCounts() {
  try {
    return JSON.parse(localStorage.getItem('bm_clicks') || '{}');
  } catch {
    return {};
  }
}

function incrementClick(id) {
  const counts = getClickCounts();
  counts[id] = (counts[id] || 0) + 1;
  localStorage.setItem('bm_clicks', JSON.stringify(counts));
}

// -- Favicon 服务 --
const FAVICON_CACHE_KEY = 'bm_favicons';

function getFaviconCache() {
  try {
    return JSON.parse(localStorage.getItem(FAVICON_CACHE_KEY) || '{}');
  } catch {
    return {};
  }
}

function setFaviconCache(cache) {
  const keys = Object.keys(cache);
  if (keys.length > 500) {
    const oldest = keys.slice(0, keys.length - 400);
    for (const k of oldest) delete cache[k];
  }
  localStorage.setItem(FAVICON_CACHE_KEY, JSON.stringify(cache));
}

/**
 * 获取 favicon 图片 URL。
 *
 * 优先级：
 *  1. localStorage base64 缓存（最快速，零网络）
 *  2. 浏览器自身 favicon 缓存（_favicon/ API，与收藏夹栏显示的图标同源，零网络）
 *  3. Cravatar CDN 兜底（浏览器未缓存该站点时）
 *  4. 最终兜底：默认地球仪 SVG（onerror 内逐级回退）
 */
function getFaviconUrl(url) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const cache = getFaviconCache();
    if (cache[domain]) return cache[domain];
    return getBrowserFaviconUrl(url);
  } catch {
    return DEFAULT_ICON;
  }
}

/**
 * 浏览器自身 favicon 缓存 URL（Chrome 88+ / Edge，需 "favicon" 权限）。
 * 直接读取浏览器已缓存的站点图标，与收藏夹栏显示的图标同源，零网络请求。
 */
function getBrowserFaviconUrl(url) {
  try {
    return chrome.runtime.getURL('_favicon/') +
      '?pageUrl=' + encodeURIComponent(url) + '&size=32';
  } catch {
    return getCravatarUrl(url);
  }
}

/** Cravatar 国内 CDN 兜底 URL */
function getCravatarUrl(url) {
  try {
    const domain = new URL(url).hostname;
    return `https://cravatar.com/favicon/api/index.php?url=${domain}`;
  } catch {
    return DEFAULT_ICON;
  }
}

/** 图片加载失败时逐级回退：浏览器缓存 → Cravatar → 默认图标 */
function fallbackFavicon(imgEl) {
  const src = imgEl.src || '';
  if (src.includes('/_favicon/')) {
    // 浏览器未缓存该站点 → 换 Cravatar
    imgEl.src = getCravatarUrl(imgEl.dataset.domain);
    return;
  }
  if (src.includes('cravatar.com')) {
    // Cravatar 也失败 → 默认地球仪
    imgEl.src = DEFAULT_ICON;
    return;
  }
  imgEl.src = DEFAULT_ICON;
}

/** 加载完成后将跨域 favicon 通过 canvas 转为 base64 缓存到 localStorage */
function cacheFavicon(imgEl) {
  // 已经是 base64（缓存命中或兜底）或 data: 协议 → 不处理
  const src = imgEl.src;
  if (!src || src.startsWith('data:')) return;

  try {
    const domain = new URL(imgEl.dataset.domain).hostname;
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgEl, 0, 0, 64, 64);
    const dataUrl = canvas.toDataURL('image/png');
    if (dataUrl && dataUrl.length > 100) {
      const cache = getFaviconCache();
      cache[domain] = dataUrl;
      setFaviconCache(cache);
    }
  } catch {
    // CORS 限制下 toDataURL 会抛 SecurityError，静默忽略
  }
}

// 默认图标 SVG（简约地球仪）
const DEFAULT_ICON = 'data:image/svg+xml,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
  '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
  '<stop offset="0%" stop-color="#4a6fa5"/>' +
  '<stop offset="100%" stop-color="#6b8cc4"/>' +
  '</linearGradient></defs>' +
  '<circle cx="32" cy="32" r="28" fill="url(#g)" opacity="0.9"/>' +
  '<ellipse cx="32" cy="32" rx="10" ry="26" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="1.2"/>' +
  '<line x1="6" y1="32" x2="58" y2="32" stroke="rgba(255,255,255,0.2)" stroke-width="1.2"/>' +
  '<path d="M10 20 Q32 8 54 20" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>' +
  '<path d="M10 44 Q32 56 54 44" fill="none" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>' +
  '</svg>'
);

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// 构建单个书签卡片
function buildBookmarkCard(bm) {
  const faviconUrl = getFaviconUrl(bm.url);
  return `
    <div class="bookmark-card" data-id="${bm.id}" draggable="true">
      <a
        class="bookmark-link"
        href="${escapeHtml(bm.url)}"
        title="${escapeHtml(bm.title || bm.url)}"
        draggable="false"
      >
        <div class="bookmark-icon-circle">
          <img
            src="${faviconUrl}"
            alt=""
            loading="lazy"
            draggable="false"
            data-domain="${escapeHtml(bm.url)}"
            onerror="fallbackFavicon(this)"
            onload="cacheFavicon(this)"
          >
        </div>
        <span class="bookmark-name">${escapeHtml(bm.title || bm.url)}</span>
      </a>
      <button class="bookmark-delete-btn" title="删除书签" data-id="${bm.id}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    </div>
  `;
}

// 获取文件夹折叠状态
function getCollapsedState() {
  try {
    return JSON.parse(localStorage.getItem('bm_collapsed') || '{}');
  } catch {
    return {};
  }
}

// 构建一个文件夹区块（递归渲染子文件夹）
// 返回 HTML 字符串
function renderFolderTree(tree, counts, depth) {
  const parts = [];

  // 当前层书签（保持原始顺序，不排序）
  if (tree.bookmarks.length > 0) {
    const cards = `<div class="bookmarks-grid">${tree.bookmarks.map(buildBookmarkCard).join('')}</div>`;

    if (depth === 0) {
      // 顶层直属书签 → 包装为"未分类"
      const collapsed = getCollapsedState();
      const key = 'folder_root_uncategorized';
      const isCollapsed = collapsed[key] !== false;

      parts.push(`
        <div class="folder-section${isCollapsed ? ' collapsed' : ''}" data-folder-id="root_uncategorized">
          <h2 class="folder-title" data-folder-id="root_uncategorized">
            <svg class="folder-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="m9 18 6-6-6-6"/>
            </svg>
            <span class="folder-name-text">未分类</span>
          </h2>
          <div class="folder-body">${cards}</div>
        </div>
      `);
    } else {
      parts.push(cards);
    }
  }

  // 子文件夹
  for (const sub of tree.subFolders) {
    const folderId = sub.id;
    const folderName = sub.name || '';
    const collapsed = getCollapsedState();

    // 默认折叠：depth=0（顶层）且未在 localStorage 中标记为展开
    const key = 'folder_' + folderId;
    const isCollapsed = collapsed[key] !== false;

    parts.push(`
      <div class="folder-section${isCollapsed ? ' collapsed' : ''}" data-folder-id="${folderId}">
        <h2 class="folder-title" data-folder-id="${folderId}">
          <svg class="folder-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <path d="m9 18 6-6-6-6"/>
          </svg>
          <span class="folder-name-text">${escapeHtml(folderName)}</span>
          <input class="folder-name-input" value="${escapeHtml(folderName)}" style="display:none">
          <button class="folder-edit-btn" title="重命名">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
              <path d="m15 5 4 4"/>
            </svg>
          </button>
        </h2>
        <div class="folder-body">
          ${renderFolderTree(sub.tree, counts, depth + 1)}
        </div>
      </div>
    `);
  }

  return parts.join('');
}

// 需要从路径中过滤掉的无意义文件夹名
const SKIP_FOLDER_NAMES = new Set([
  '书签栏', '收藏夹栏', '未命名文件夹',
  'Bookmarks bar', 'Bookmarks Bar',
  'Other bookmarks', '其他书签',
  'Mobile bookmarks', '移动设备书签',
]);

// 递归遍历书签树，按文件夹组织
// 返回结构：{ bookmarks: [...], subFolders: [{id, name, tree}, ...] }
function buildFolderTree(nodes) {
  const result = {
    bookmarks: [],
    subFolders: [],
  };

  for (const node of nodes) {
    if (node.url) {
      result.bookmarks.push(node);
    }
    if (node.children && node.children.length > 0) {
      result.subFolders.push({
        id: node.id,
        name: node.title || '',
        tree: buildFolderTree(node.children),
      });
    }
  }

  return result;
}

// 过滤掉系统文件夹，提取顶层有效内容
// Chrome/Edge 书签树第一层固定是系统文件夹，直接合并其内容
function extractTopLevel(tree) {
  const filtered = { bookmarks: [], subFolders: [] };

  for (const sub of tree.subFolders) {
    // 系统文件夹的内容直接提升到顶层
    filtered.bookmarks.push(...sub.tree.bookmarks);
    // 子文件夹保留原始名称，但如果名称在跳过列表中则置空
    for (const child of sub.tree.subFolders) {
      if (SKIP_FOLDER_NAMES.has(child.name)) {
        // 递归再提升一层
        filtered.bookmarks.push(...child.tree.bookmarks);
        filtered.subFolders.push(...child.tree.subFolders);
      } else {
        filtered.subFolders.push(child);
      }
    }
  }

  // 根层直接书签（极少见但处理一下）
  filtered.bookmarks.push(...tree.bookmarks);

  return filtered;
}

// 书签元数据：id -> { parentId, index }（chrome.bookmarks children 中的真实位置）
let bookmarkMeta = new Map();
// 每个文件夹的 children 顺序：folderId -> [{ id, url }]（真实顺序，含子文件夹）
let folderChildren = new Map();
// 书签栏（系统根）id，"未分类"区块的拖放目标
let barRootId = null;
// 当前拖拽中的书签 id（Sortable onStart 设置，标题/空白区域 drop 使用）
let dragBookmarkId = null;
// 标题/空白区域 drop 已处理（阻止 Sortable onEnd 重复移动）
let titleDropHandled = false;

// 从书签树构建元数据映射（bookmarkMeta + folderChildren + barRootId）
function buildBookmarkMeta(tree) {
  const root = tree[0];
  bookmarkMeta = new Map();
  folderChildren = new Map();
  if (root && root.children && root.children.length > 0) {
    barRootId = root.children[0].id;
    // 遍历整棵树，记录每个节点的真实父 id 和 children 中的位置
    (function walk(nodes, parentId) {
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (parentId) {
          bookmarkMeta.set(n.id, { parentId, index: i });
          if (!folderChildren.has(parentId)) folderChildren.set(parentId, []);
          folderChildren.get(parentId).push({ id: n.id, url: n.url || null });
        }
        if (n.children) walk(n.children, n.id);
      }
    })(root.children, root.id);
  }
}

async function loadBookmarks() {
  const container = document.getElementById('bookmarks-container');
  // 清理 Sortable 可能残留在 body/其他位置的幽灵元素（拖放后重渲染前）
  cleanupSortableResidue();
  const tree = await chrome.bookmarks.getTree();
  buildBookmarkMeta(tree);
  const rootTree = buildFolderTree(tree);
  const topTree = extractTopLevel(rootTree);

  const counts = getClickCounts();
  const html = renderFolderTree(topTree, counts, 0);

  if (!html.trim()) {
    container.innerHTML = '<div class="empty-state">暂无书签，去收藏一些网站吧</div>';
    return;
  }

  container.innerHTML = html;

  // 每次渲染后重新初始化 Sortable（DOM 已重建）
  initSortables();

  // 事件只绑定一次（container 元素本身不变，innerHTML 更新不影响委托监听）
  if (!container.dataset.eventsBound) {
    container.dataset.eventsBound = '1';
    setupBookmarkEvents();
  }
}

// ============================================================
//  Sortable 拖拽排序（丝滑动画，联动浏览器收藏夹）
// ============================================================
// 所有 Sortable 实例（重渲染前 destroy，避免幽灵残留/监听泄漏）
let sortableInstances = [];
// 拖拽结束后恢复 hover 的兜底定时器
let finishDragTimer = null;

// 拖拽结束收尾：重渲染稳定后，等用户移动鼠标才恢复 hover。
// 避免松手瞬间鼠标停留的卡片立即"发白"。
function finishDrag() {
  const resume = () => {
    document.body.classList.remove('sorting');
    document.removeEventListener('mousemove', resume);
    clearTimeout(finishDragTimer);
    finishDragTimer = null;
  };
  clearTimeout(finishDragTimer);
  finishDragTimer = setTimeout(resume, 1500); // 兜底：1.5s 后强制恢复
  document.addEventListener('mousemove', resume, { once: true });
}

function initSortables() {
  const container = document.getElementById('bookmarks-container');

  // 销毁上一轮实例（DOM 已重建，旧实例持有失效引用）
  sortableInstances.forEach((s) => { try { s.destroy(); } catch {} });
  sortableInstances = [];

  container.querySelectorAll('.bookmarks-grid').forEach((grid) => {
    const instance = Sortable.create(grid, {
      group: 'bookmarks',            // 所有 grid 同组，跨文件夹可拖
      animation: 150,                // 丝滑补位/挤开动画
      ghostClass: 'drag-ghost',      // 拖拽中幽灵卡片样式
      chosenClass: 'drag-chosen',    // 被选中卡片样式
      filter: (evt, el) => {
        // 编辑模式下禁止拖拽
        if (container.querySelector('.folder-title.editing')) return true;
        // 删除按钮不触发拖拽
        return el.closest('.bookmark-delete-btn');
      },
      preventOnFilter: true,
      onStart: (evt) => {
        dragBookmarkId = evt.item.dataset.id;
        // 拖拽期间禁用 hover 效果（否则鼠标悬停卡片会"发白"）
        document.body.classList.add('sorting');
      },
      onEnd: (evt) => {
        const id = dragBookmarkId;
        dragBookmarkId = null;
        if (!id) {
          // 异常路径兜底：恢复 hover
          document.body.classList.remove('sorting');
          return;
        }
        // 立即清理 Sortable 幽灵/占位残留，避免原位置白框
        cleanupSortableResidue();
        // 标题/空白区域 drop 已处理 → 跳过，避免重复移动
        if (titleDropHandled) {
          titleDropHandled = false;
          return;
        }
        // Sortable 已将 DOM 移动到目标 grid，根据 DOM 换算真实 index
        const targetGrid = evt.to;
        const section = targetGrid.closest('.folder-section');
        if (!section) return;
        const folderId = section.dataset.folderId;
        const parentId = folderId === 'root_uncategorized' ? barRootId : folderId;

        const cards = [...targetGrid.querySelectorAll('.bookmark-card')];
        const newIndex = cards.findIndex((c) => c.dataset.id === id);
        const prevCard = newIndex > 0 ? cards[newIndex - 1] : null;

        // 目标 children 真实顺序（移动前快照，含子文件夹）
        const children = folderChildren.get(parentId) || [];

        let targetIndex;
        if (prevCard) {
          // 插到前一个卡片后面：其在目标 children 中的位置 + 1
          const prevPos = children.findIndex((c) => c.id === prevCard.dataset.id);
          targetIndex = prevPos === -1 ? 0 : prevPos + 1;
        } else {
          // 放最前：children 中第一个书签的位置（前面可能有子文件夹）
          const firstBm = children.findIndex((c) => c.url);
          targetIndex = firstBm === -1 ? children.length : firstBm;
        }

        moveBookmark(id, { parentId, index: targetIndex }, false);
      },
    });
    sortableInstances.push(instance);
  });
}

// 联动修改浏览器收藏夹
// needRender: 标题/空白区域 drop 时 Sortable 未移动 DOM，成功后必须重渲染；
// grid 内 drop 时 Sortable 已排好 DOM，仅刷新元数据即可（避免闪烁）。
function moveBookmark(id, target, needRender) {
  const source = bookmarkMeta.get(id);
  // 无变化：同文件夹且目标位置就是当前位置（拖到前一个卡片后面 = 原位）
  if (source && target.parentId === source.parentId &&
      (target.index === source.index || target.index === source.index + 1)) {
    finishDrag();
    return;
  }
  chrome.bookmarks.move(id, { parentId: target.parentId, index: target.index }, async () => {
    if (chrome.runtime.lastError) {
      alert('移动失败：' + chrome.runtime.lastError.message);
      // 失败：Sortable 已移动 DOM，需重渲染恢复原状
      await loadBookmarks();
      document.body.classList.remove('sorting');
      return;
    }
    if (needRender) {
      // 标题/空白 drop：重渲染让卡片出现在目标文件夹第一个位置
      await loadBookmarks();
    } else {
      // grid 内 drop：DOM 已被 Sortable 排好序，只静默刷新元数据映射
      try {
        const tree = await chrome.bookmarks.getTree();
        buildBookmarkMeta(tree);
      } catch {}
    }
    finishDrag();
  });
}

// 清理 Sortable 拖拽残留：删除 body 下/文档中残留的幽灵元素和占位符，
// 防止拖放后原位置出现白框。
function cleanupSortableResidue() {
  const container = document.getElementById('bookmarks-container');

  // 1) 删除所有 Sortable 临时元素（幽灵/占位/克隆，含我们自己命名的类）
  document.querySelectorAll('.sortable-ghost, .sortable-drag, .sortable-chosen, .sortable-placeholder, .sortable-fallback, .drag-ghost, .drag-chosen')
    .forEach((el) => el.remove());

  // 2) 删除 container 外部的所有 bookmark-card —— 正常卡片都渲染在
  //    #bookmarks-container 内，body 下出现的卡片必然是 Sortable 残留的克隆
  document.querySelectorAll('.bookmark-card').forEach((el) => {
    if (container && !container.contains(el)) el.remove();
  });

  // 3) 清除文件夹高亮
  document.querySelectorAll('.folder-section.drop-target')
    .forEach((el) => el.classList.remove('drop-target'));
}

// ============================================================
//  书签交互：点击（删除/重命名/折叠/计数）+ Sortable 拖拽
// ============================================================
// 事件委托绑定在 container 上，只绑定一次
function setupBookmarkEvents() {
  const container = document.getElementById('bookmarks-container');

  // 拖拽到文件夹标题/空白区域 → 放第一个位置（Sortable 只管 grid 内部）
  container.addEventListener('dragover', (e) => {
    if (!dragBookmarkId) return;
    if (e.target.closest('.bookmarks-grid')) return; // grid 内交给 Sortable
    const section = e.target.closest('.folder-section');
    if (!section) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    container.querySelectorAll('.drop-target').forEach((el) => el.classList.remove('drop-target'));
    section.classList.add('drop-target');
  });

  container.addEventListener('drop', (e) => {
    if (!dragBookmarkId) return;
    if (e.target.closest('.bookmarks-grid')) return; // grid 内交给 Sortable
    const section = e.target.closest('.folder-section');
    if (!section) return;
    e.preventDefault();
    container.querySelectorAll('.drop-target').forEach((el) => el.classList.remove('drop-target'));

    const source = bookmarkMeta.get(dragBookmarkId);
    if (!source) return;
    const folderId = section.dataset.folderId;
    const parentId = folderId === 'root_uncategorized' ? barRootId : folderId;
    // 没选位置 → 该文件夹第一个位置（children 中第一个书签前，前面如有子文件夹则保持在更前）
    const children = folderChildren.get(parentId) || [];
    const firstBm = children.findIndex((c) => c.url);
    const targetIndex = firstBm === -1 ? children.length : firstBm;
    // 标记已处理，阻止 Sortable onEnd 的重复移动
    titleDropHandled = true;
    moveBookmark(dragBookmarkId, { parentId, index: targetIndex }, true);
  });

  // ---------- 点击：删除 / 重命名 / 折叠 / 计数 ----------
  container.addEventListener('click', (e) => {
    // 删除按钮
    const deleteBtn = e.target.closest('.bookmark-delete-btn');
    if (deleteBtn) {
      e.stopPropagation();
      e.preventDefault();
      const bookmarkId = deleteBtn.dataset.id;
      const card = deleteBtn.closest('.bookmark-card');
      const nameEl = card.querySelector('.bookmark-name');
      const name = nameEl ? nameEl.textContent : '此书签';
      if (confirm(`确定要删除「${name}」吗？`)) {
        chrome.bookmarks.remove(bookmarkId, () => {
          if (chrome.runtime.lastError) {
            alert('删除失败：' + chrome.runtime.lastError.message);
            return;
          }
          // 删除成功后从 DOM 中移除卡片（带动画），也刷新 favicon 缓存
          card.style.opacity = '0';
          card.style.transform = 'scale(0.8)';
          card.style.transition = 'all 0.2s ease';
          setTimeout(async () => {
            await loadBookmarks();
          }, 250);
        });
      }
      return;
    }

    // 重命名编辑按钮 → 进入编辑模式
    const editBtn = e.target.closest('.folder-edit-btn');
    if (editBtn) {
      e.stopPropagation();
      // 先保存当前正在编辑的文件夹（如果有）
      const currentEditing = container.querySelector('.folder-title.editing');
      if (currentEditing && currentEditing !== editBtn.closest('.folder-title')) {
        saveFolderRename(currentEditing);
      }

      const title = editBtn.closest('.folder-title');
      const folderId = title.dataset.folderId;
      if (folderId === 'root_uncategorized') return;

      const textEl = title.querySelector('.folder-name-text');
      const inputEl = title.querySelector('.folder-name-input');
      inputEl.value = textEl.textContent;
      title.classList.add('editing');
      inputEl.focus();
      inputEl.select();
      return;
    }

    // 编辑模式下的输入框点击 → 不触发折叠
    if (e.target.closest('.folder-name-input')) return;

    // 文件夹标题 → 折叠/展开
    const title = e.target.closest('.folder-title');
    if (title) {
      const section = title.closest('.folder-section');
      const folderId = section.dataset.folderId;
      section.classList.toggle('collapsed');

      const collapsed = getCollapsedState();
      const key = 'folder_' + folderId;
      if (section.classList.contains('collapsed')) {
        collapsed[key] = true;
      } else {
        collapsed[key] = false;
      }
      localStorage.setItem('bm_collapsed', JSON.stringify(collapsed));
      return;
    }

    // 书签卡片 → 计数
    const card = e.target.closest('.bookmark-card');
    if (card && card.dataset.id) {
      incrementClick(card.dataset.id);
    }
  });

  // 点击页面空白区域 → 保存并退出编辑
  document.addEventListener('mousedown', (e) => {
    const editingTitle = container.querySelector('.folder-title.editing');
    if (!editingTitle) return;
    // 点击在编辑区域内 → 不处理
    if (editingTitle.contains(e.target)) return;
    saveFolderRename(editingTitle);
  });

  // 重命名输入框：Enter 保存，Escape 取消
  container.addEventListener('keydown', (e) => {
    const input = e.target.closest('.folder-name-input');
    if (!input) return;
    const title = input.closest('.folder-title');

    if (e.key === 'Enter') {
      e.preventDefault();
      saveFolderRename(title);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      title.classList.remove('editing');
    }
  });

  // 保存文件夹重命名
  function saveFolderRename(title) {
    const folderId = title.dataset.folderId;
    const textEl = title.querySelector('.folder-name-text');
    const inputEl = title.querySelector('.folder-name-input');
    const newName = inputEl.value.trim();

    if (newName && newName !== textEl.textContent && folderId !== 'root_uncategorized') {
      chrome.bookmarks.update(folderId, { title: newName }, () => {
        textEl.textContent = newName;
      });
    }
    title.classList.remove('editing');
  }
}

// ============================================================
//  初始化
// ============================================================
async function init() {
  const isCustom = loadCustomBackground();
  if (!isCustom) {
    loadBingWallpaper();
  }
  renderEnginePicker();
  setupSearch();
  setupSettings();
  await loadBookmarks();
}

init();
