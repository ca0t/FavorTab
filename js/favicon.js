/**
 * FavorTab — favicon 获取与缓存（浏览器 _favicon/ + Cravatar）
 */

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
