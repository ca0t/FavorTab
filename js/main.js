/**
 * FavorTab — 初始化入口
 */

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
