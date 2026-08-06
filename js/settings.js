/**
 * FavorTab — 设置面板（模糊度/透明度/背景管理）
 */

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
