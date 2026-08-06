/**
 * FavorTab — 书签交互事件（点击/删除/重命名/折叠）
 */

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

    // 重命名编辑按钮（书签卡片）→ 进入编辑模式
    const bookmarkEditBtn = e.target.closest('.bookmark-edit-btn');
    if (bookmarkEditBtn) {
      e.stopPropagation();
      e.preventDefault();
      // 先保存当前正在编辑的文件夹或书签（如果有）
      saveAnyEditing();

      const card = bookmarkEditBtn.closest('.bookmark-card');
      const inputEl = card.querySelector('.bookmark-name-input');
      const textEl = card.querySelector('.bookmark-name-text');
      inputEl.value = textEl.textContent;
      card.classList.add('editing');
      inputEl.focus();
      inputEl.select();
      return;
    }

    // 编辑模式下的输入框点击 → 不触发跳转/计数/折叠
    if (e.target.closest('.bookmark-name-input')) return;

    // 重命名编辑按钮 → 进入编辑模式
    const editBtn = e.target.closest('.folder-edit-btn');
    if (editBtn) {
      e.stopPropagation();
      // 先保存当前正在编辑的文件夹或书签（如果有）
      saveAnyEditing();

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
    const editingCard = container.querySelector('.bookmark-card.editing');
    if (editingCard) {
      // 点击在编辑区域内 → 不处理
      if (editingCard.contains(e.target)) return;
      saveBookmarkRename(editingCard);
    }
    const editingTitle = container.querySelector('.folder-title.editing');
    if (editingTitle) {
      // 点击在编辑区域内 → 不处理
      if (editingTitle.contains(e.target)) return;
      saveFolderRename(editingTitle);
    }
  });

  // 重命名输入框：Enter 保存，Escape 取消
  container.addEventListener('keydown', (e) => {
    // 书签名称输入框
    const bmInput = e.target.closest('.bookmark-name-input');
    if (bmInput) {
      const card = bmInput.closest('.bookmark-card');
      if (e.key === 'Enter') {
        e.preventDefault();
        saveBookmarkRename(card);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        card.classList.remove('editing');
      }
      return;
    }
    // 文件夹名称输入框
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

  // 保存当前正在编辑的文件夹或书签（点击另一个编辑按钮时先落盘）
  function saveAnyEditing() {
    const editingCard = container.querySelector('.bookmark-card.editing');
    if (editingCard) saveBookmarkRename(editingCard);
    const editingTitle = container.querySelector('.folder-title.editing');
    if (editingTitle) saveFolderRename(editingTitle);
  }

  // 保存书签卡片重命名（不 trim：用户输入什么就保存什么，包括空格）
  function saveBookmarkRename(card) {
    const bookmarkId = card.dataset.id;
    const textEl = card.querySelector('.bookmark-name-text');
    const inputEl = card.querySelector('.bookmark-name-input');
    const newName = inputEl.value;

    if (newName !== '' && newName !== textEl.textContent) {
      chrome.bookmarks.update(bookmarkId, { title: newName }, () => {
        if (chrome.runtime.lastError) {
          alert('重命名失败：' + chrome.runtime.lastError.message);
          return;
        }
        textEl.textContent = newName;
      });
    }
    card.classList.remove('editing');
  }

  // 保存文件夹重命名（不 trim：用户输入什么就保存什么，包括空格）
  function saveFolderRename(title) {
    const folderId = title.dataset.folderId;
    const textEl = title.querySelector('.folder-name-text');
    const inputEl = title.querySelector('.folder-name-input');
    const newName = inputEl.value;

    if (newName !== '' && newName !== textEl.textContent && folderId !== 'root_uncategorized') {
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
