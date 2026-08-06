/**
 * FavorTab — Bing 每日壁纸背景
 */

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
