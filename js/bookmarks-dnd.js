/**
 * FavorTab — 书签拖拽排序（SortableJS + 浏览器收藏夹联动）
 */

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
        // 编辑模式下禁止拖拽（文件夹或书签名称编辑中）
        if (container.querySelector('.folder-title.editing') ||
            container.querySelector('.bookmark-card.editing')) return true;
        // 删除按钮/重命名按钮不触发拖拽
        return el.closest('.bookmark-delete-btn') || el.closest('.bookmark-edit-btn');
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
