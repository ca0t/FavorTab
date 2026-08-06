/**
 * FavorTab — 书签渲染与点击数据（卡片 + 文件夹树 + 点击计数）
 */

// 点击计数（localStorage 持久化）
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
        <span class="bookmark-name">
          <span class="bookmark-name-text">${escapeHtml(bm.title || bm.url)}</span>
        </span>
      </a>
      <span class="bookmark-edit-btn" title="重命名" data-id="${bm.id}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
          <path d="m15 5 4 4"/>
        </svg>
      </span>
      <input class="bookmark-name-input" value="${escapeHtml(bm.title || bm.url)}" style="display:none">
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
