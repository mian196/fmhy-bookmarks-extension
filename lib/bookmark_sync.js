/**
 * Cross-Browser Bookmark Sync Manager
 * Manages finding Bookmarks Bar, cleaning existing FMHY folders,
 * and creating the updated FMHY bookmark tree at Index 0.
 */

/**
 * Finds the browser's Bookmarks Bar / Toolbar root node ID
 */
async function findBookmarksBarId() {
  const tree = await api.bookmarks.getTree();
  const root = tree[0];

  if (!root || !root.children) {
    throw new Error('Unable to access browser bookmarks tree.');
  }

  // 1. Check known Chromium & Firefox IDs directly
  for (const child of root.children) {
    // Chromium: '1' is 'Bookmarks bar'
    // Firefox: 'toolbar_____' is 'Bookmarks Toolbar'
    if (child.id === '1' || child.id === 'toolbar_____') {
      return child.id;
    }
  }

  // 2. Search by title / type keywords
  for (const child of root.children) {
    const titleLower = (child.title || '').toLowerCase();
    if (
      titleLower.includes('bookmark bar') ||
      titleLower.includes('bookmarks bar') ||
      titleLower.includes('toolbar')
    ) {
      return child.id;
    }
  }

  // 3. Fallback to first child of root
  return root.children[0].id;
}

/**
 * Safely removes any existing "FMHY" root folders from the bookmarks tree
 */
async function cleanExistingFMHYFolders() {
  // Search by title "FMHY"
  const matches = await api.bookmarks.search({ title: 'FMHY' });
  if (!matches || matches.length === 0) return;

  for (const match of matches) {
    // Only remove folder nodes (url is undefined for folders)
    if (!match.url) {
      try {
        await api.bookmarks.removeTree(match.id);
      } catch (err) {
        console.warn(`Failed to remove tree ID ${match.id}:`, err);
      }
    }
  }
}

/**
 * Recursively creates bookmarks and folders under a parent ID
 */
async function buildBookmarkSubtree(parentId, childrenNodes) {
  let count = 0;
  if (!childrenNodes || childrenNodes.length === 0) return count;

  for (const node of childrenNodes) {
    if (node.isFolder) {
      const createdFolder = await api.bookmarks.create({
        parentId: parentId,
        title: node.title
      });
      if (node.children && node.children.length > 0) {
        count += await buildBookmarkSubtree(createdFolder.id, node.children);
      }
    } else if (node.url) {
      await api.bookmarks.create({
        parentId: parentId,
        title: node.title || node.url,
        url: node.url
      });
      count++;
    }
  }
  return count;
}

/**
 * Performs full sync of FMHY bookmark tree to the Bookmarks Bar
 * @param {Object} parsedTree - Parsed FMHY tree root from html_parser
 * @returns {Promise<{ success: boolean, count: number, error?: string }>}
 */
async function syncFMHYBookmarks(parsedTree) {
  try {
    const barId = await findBookmarksBarId();

    // 1. Remove old FMHY folders
    await cleanExistingFMHYFolders();

    // 2. Create new FMHY Root Folder at Index 0 (front of Bookmark Bar)
    const fmhyRoot = await api.bookmarks.create({
      parentId: barId,
      title: parsedTree.title || 'FMHY',
      index: 0
    });

    // 3. Populate subcategories and bookmark items
    const count = await buildBookmarkSubtree(fmhyRoot.id, parsedTree.children);

    return {
      success: true,
      count: count,
      rootId: fmhyRoot.id
    };
  } catch (error) {
    console.error('FMHY Bookmark Sync failed:', error);
    return {
      success: false,
      count: 0,
      error: error.message || 'Unknown error during sync'
    };
  }
}

if (typeof self !== 'undefined') {
  self.findBookmarksBarId = findBookmarksBarId;
  self.removeExistingFMHYFolders = removeExistingFMHYFolders;
  self.buildBookmarkSubtree = buildBookmarkSubtree;
  self.syncFMHYBookmarks = syncFMHYBookmarks;
}
