/**
 * Cross-Browser Bookmark Sync Manager
 * Manages finding Bookmarks Bar, maintaining the primary FMHY folder,
 * and performing incremental diffing sync to minimize WebExtension mutations
 * and prevent duplicate folders across synced devices.
 */

/**
 * Finds the browser's Bookmarks Bar / Toolbar root node ID
 */
async function findBookmarksBarId() {
  return await resolveTargetParentId('toolbar');
}

/**
 * Resolves the target parent container ID based on user setting ('toolbar' | 'other' | 'menu')
 * @param {string} syncLocation - Target location ('toolbar' | 'other' | 'menu')
 * @returns {Promise<string>} Target parent container bookmark node ID
 */
async function resolveTargetParentId(syncLocation = 'toolbar') {
  const tree = await api.bookmarks.getTree();
  const root = tree[0];

  if (!root || !root.children) {
    throw new Error('Unable to access browser bookmarks tree.');
  }

  const children = root.children;
  const isFirefox = typeof self !== 'undefined' && self.navigator
    ? self.navigator.userAgent.toLowerCase().includes('firefox')
    : false;

  if (syncLocation === 'other') {
    // Chromium: '2' is 'Other bookmarks'
    // Firefox: 'unfiled_____' is 'Other Bookmarks' / 'Unfiled Bookmarks'
    for (const child of children) {
      if (child.id === '2' || child.id === 'unfiled_____') {
        return child.id;
      }
    }
    for (const child of children) {
      const titleLower = (child.title || '').toLowerCase();
      if (titleLower.includes('other') || titleLower.includes('unfiled')) {
        return child.id;
      }
    }
  } else if (syncLocation === 'menu') {
    // Option 3: Bookmarks Menu container is exclusive to Firefox
    if (isFirefox) {
      for (const child of children) {
        if (child.id === 'menu________') {
          return child.id;
        }
      }
      for (const child of children) {
        const titleLower = (child.title || '').toLowerCase();
        if (titleLower.includes('menu')) {
          return child.id;
        }
      }
    } else {
      console.warn('[FMHY] "Bookmarks Menu" container is exclusive to Firefox and not supported on Chrome. Falling back to "Other Bookmarks".');
      // Chrome fallback to 'Other Bookmarks' container ('2')
      for (const child of children) {
        if (child.id === '2' || child.id === 'unfiled_____') {
          return child.id;
        }
      }
    }
  }

  // Default: 'toolbar' (Bookmarks bar / Bookmarks Toolbar)
  for (const child of children) {
    if (child.id === '1' || child.id === 'toolbar_____') {
      return child.id;
    }
  }
  for (const child of children) {
    const titleLower = (child.title || '').toLowerCase();
    if (
      titleLower.includes('bookmark bar') ||
      titleLower.includes('bookmarks bar') ||
      titleLower.includes('toolbar')
    ) {
      return child.id;
    }
  }

  // Fallback to first child of root
  return children[0].id;
}

/**
 * Safely removes any existing "FMHY" root folders from the bookmarks tree
 */
async function cleanExistingFMHYFolders() {
  try {
    const barId = await findBookmarksBarId();
    const children = await api.bookmarks.getChildren(barId);
    if (children && children.length > 0) {
      for (const child of children) {
        if (!child.url && child.title && child.title.trim() === 'FMHY') {
          try {
            await api.bookmarks.removeTree(child.id);
          } catch (err) {
            console.warn(`Failed to remove folder ${child.id}:`, err);
          }
        }
      }
    }
  } catch (err) {
    console.warn('Error checking Bookmarks Bar children:', err);
  }

  // Also perform search fallback for any orphaned FMHY root folders
  const matches = await api.bookmarks.search({ title: 'FMHY' });
  if (matches && matches.length > 0) {
    for (const match of matches) {
      if (!match.url && match.title && match.title.trim() === 'FMHY') {
        try {
          await api.bookmarks.removeTree(match.id);
        } catch (err) {}
      }
    }
  }
}

/**
 * Obtains or creates the primary "FMHY" root folder inside the target container.
 * Reuses the existing root folder ID/GUID across sync runs and seamlessly moves it
 * if the target container setting changes.
 *
 * @param {string} targetParentId - Target container parent ID
 * @param {string} title - Target root folder title (e.g. 'FMHY')
 * @returns {Promise<Object>} The primary FMHY root bookmark node
 */
async function prepareFMHYRootFolder(targetParentId, title = 'FMHY') {
  let primaryRoot = null;

  try {
    const children = await api.bookmarks.getChildren(targetParentId);
    const fmhyFolders = (children || []).filter(
      (child) => !child.url && child.title && child.title.trim() === 'FMHY'
    );

    if (fmhyFolders.length > 0) {
      primaryRoot = fmhyFolders[0];

      // Remove any secondary duplicate FMHY folders in this container if present
      for (let i = 1; i < fmhyFolders.length; i++) {
        try {
          await api.bookmarks.removeTree(fmhyFolders[i].id);
        } catch (err) {
          console.warn(`Failed to remove duplicate folder ${fmhyFolders[i].id}:`, err);
        }
      }
    }
  } catch (err) {
    console.warn('Error checking target container children for FMHY root:', err);
  }

  // Fallback search across all bookmarks if no FMHY folder was in target parent
  if (!primaryRoot) {
    try {
      const matches = await api.bookmarks.search({ title: 'FMHY' });
      const folderMatches = (matches || []).filter(
        (m) => !m.url && m.title && m.title.trim() === 'FMHY'
      );
      if (folderMatches.length > 0) {
        primaryRoot = folderMatches[0];
        try {
          await api.bookmarks.move(primaryRoot.id, { parentId: targetParentId, index: 0 });
        } catch (e) {}

        // Remove any other orphaned folder matches
        for (let i = 1; i < folderMatches.length; i++) {
          try {
            await api.bookmarks.removeTree(folderMatches[i].id);
          } catch (err) {}
        }
      }
    } catch (err) {}
  }

  if (primaryRoot) {
    // Ensure it's positioned at index 0 in the target container and title matches
    try {
      await api.bookmarks.move(primaryRoot.id, { parentId: targetParentId, index: 0 });
    } catch (e) {}

    if (primaryRoot.title !== title) {
      try {
        await api.bookmarks.update(primaryRoot.id, { title: title });
      } catch (e) {}
    }

    primaryRoot._isNew = false;
    return primaryRoot;
  }

  // If no existing FMHY root folder exists, create a new one at Index 0 inside targetParentId
  const createdRoot = await api.bookmarks.create({
    parentId: targetParentId,
    title: title || 'FMHY',
    index: 0
  });
  createdRoot._isNew = true;
  return createdRoot;
}

/**
 * Recursively counts link bookmark nodes in a bookmark tree node
 * @param {Object} node - Bookmark tree node
 * @returns {number} Link count
 */
function countLinksInTree(node) {
  let count = 0;
  if (!node) return 0;
  if (node.url) {
    count++;
  }
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      count += countLinksInTree(child);
    }
  }
  return count;
}

/**
 * Normalizes bookmark URLs for comparison to match browser storage canonicalization
 * (e.g., standardizing origin trailing slashes: https://example.com -> https://example.com/)
 * @param {string} url - Target URL string
 * @returns {string} Normalized URL string
 */
function normalizeBookmarkUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    return parsed.href;
  } catch (e) {
    return trimmed;
  }
}

/**
 * Recursively reconciles (diffs) bookmarks and folders under a parent ID.
 * Reuses existing folder and link nodes matching title/URL to minimize
 * WebExtension bookmark mutations and avoid browser sync conflicts.
 *
 * @param {string} parentId - Parent bookmark folder ID
 * @param {Array} childrenNodes - Parsed incoming node objects
 * @param {Object} [stats] - Diff statistics tracking { total, added, deleted, updated }
 * @returns {Promise<number>} Active link bookmark count
 */
async function reconcileBookmarkSubtree(parentId, childrenNodes, stats = null) {
  if (!stats) {
    stats = {
      total: 0,
      added: 0,
      deleted: 0,
      updated: 0
    };
  }

  if (!childrenNodes) childrenNodes = [];

  // 1. Fetch current browser children under this parent
  let existingChildren = [];
  try {
    existingChildren = await api.bookmarks.getChildren(parentId);
  } catch (err) {
    console.warn(`Failed to fetch children for folder ${parentId}:`, err);
  }

  // Index existing folder and link nodes
  const existingFoldersByTitle = new Map();
  const existingLinksByUrl = new Map();

  for (const child of existingChildren) {
    if (!child.url) {
      // Folder
      const titleKey = (child.title || '').trim();
      if (!existingFoldersByTitle.has(titleKey)) {
        existingFoldersByTitle.set(titleKey, []);
      }
      existingFoldersByTitle.get(titleKey).push(child);
    } else {
      // Link
      const urlKey = normalizeBookmarkUrl(child.url);
      if (!existingLinksByUrl.has(urlKey)) {
        existingLinksByUrl.set(urlKey, []);
      }
      existingLinksByUrl.get(urlKey).push(child);
    }
  }

  // Categorize incoming nodes
  const incomingFolders = [];
  const incomingLinks = [];

  for (const node of childrenNodes) {
    if (node.isFolder) {
      incomingFolders.push(node);
    } else if (node.url) {
      incomingLinks.push(node);
    }
  }

  // --- 2. Reconcile Link Bookmarks ---
  const linksToCreate = [];
  const linkUpdatePromises = [];

  for (const incomingLink of incomingLinks) {
    const urlKey = normalizeBookmarkUrl(incomingLink.url);
    const existingList = existingLinksByUrl.get(urlKey);

    if (existingList && existingList.length > 0) {
      // Reuse existing link node
      const matchedNode = existingList.shift();
      const targetTitle = incomingLink.title || incomingLink.url;
      if (matchedNode.title !== targetTitle) {
        linkUpdatePromises.push(
          api.bookmarks.update(matchedNode.id, { title: targetTitle })
            .then(() => { stats.updated++; })
            .catch(() => {})
        );
      }
    } else {
      // Link needs to be created
      linksToCreate.push(incomingLink);
    }
    stats.total++;
  }

  // Execute link title updates concurrently
  if (linkUpdatePromises.length > 0) {
    await Promise.all(linkUpdatePromises);
  }

  // Identify obsolete existing links no longer in incoming feed
  const obsoleteLinkIds = [];
  for (const [, remainingList] of existingLinksByUrl) {
    for (const node of remainingList) {
      obsoleteLinkIds.push(node.id);
    }
  }

  const BATCH_SIZE = 100;

  // Batch delete obsolete links
  if (obsoleteLinkIds.length > 0) {
    for (let i = 0; i < obsoleteLinkIds.length; i += BATCH_SIZE) {
      const batch = obsoleteLinkIds.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map((id) => api.bookmarks.remove(id).catch(() => {}))
      );
    }
    stats.deleted += obsoleteLinkIds.length;
  }

  // Batch create missing links
  if (linksToCreate.length > 0) {
    for (let i = 0; i < linksToCreate.length; i += BATCH_SIZE) {
      const batch = linksToCreate.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map((node) =>
          api.bookmarks.create({
            parentId: parentId,
            title: node.title || node.url,
            url: node.url
          }).catch((err) => {
            console.warn(`Failed to create bookmark: ${node.title}`, err);
          })
        )
      );
    }
    stats.added += linksToCreate.length;
  }

  // --- 3. Reconcile Folder Structure ---
  const folderTasks = [];

  for (const folderNode of incomingFolders) {
    // Skip empty folders (0 bookmark links in subtree)
    if (countLinksInTree(folderNode) === 0) {
      continue;
    }

    const titleKey = (folderNode.title || '').trim();
    const existingList = existingFoldersByTitle.get(titleKey);

    let folderId = null;
    if (existingList && existingList.length > 0) {
      const matchedFolder = existingList.shift();
      folderId = matchedFolder.id;
    } else {
      try {
        const createdFolder = await api.bookmarks.create({
          parentId: parentId,
          title: folderNode.title
        });
        folderId = createdFolder.id;
      } catch (err) {
        console.warn(`Failed to create folder: ${folderNode.title}`, err);
      }
    }

    if (folderId) {
      folderTasks.push(
        reconcileBookmarkSubtree(folderId, folderNode.children, stats)
      );
    }
  }

  // Recurse subfolders concurrently per tree level
  if (folderTasks.length > 0) {
    await Promise.all(folderTasks);
  }

  // Delete leftover obsolete subfolders not present in incoming tree
  for (const [, remainingList] of existingFoldersByTitle) {
    for (const obsoleteFolder of remainingList) {
      try {
        if (api.bookmarks && api.bookmarks.getSubTree) {
          const subTree = await api.bookmarks.getSubTree(obsoleteFolder.id);
          if (subTree && subTree.length > 0) {
            stats.deleted += countLinksInTree(subTree[0]);
          }
        }
        await api.bookmarks.removeTree(obsoleteFolder.id);
      } catch (e) {
        console.warn(`Failed to remove obsolete folder ${obsoleteFolder.id}:`, e);
      }
    }
  }

  return stats.total;
}

/**
 * Fallback recursive helper for creating fresh subtrees
 */
async function buildBookmarkSubtree(parentId, childrenNodes) {
  return await reconcileBookmarkSubtree(parentId, childrenNodes);
}

/**
 * Prunes empty folders from a bookmark tree (fallback if html_parser.js is not loaded).
 * @param {Object} node - Root bookmark tree node
 * @returns {Object} Pruned tree node
 */
function pruneTreeFolders(node) {
  if (typeof pruneEmptyFolders === 'function') {
    return pruneEmptyFolders(node);
  }
  if (!node) return node;
  if (!node.isFolder) return node;

  function pruneNode(n) {
    if (!n || !n.isFolder) return n;
    const children = [];
    if (Array.isArray(n.children)) {
      for (const child of n.children) {
        const pruned = pruneNode(child);
        if (pruned !== null) {
          children.push(pruned);
        }
      }
    }
    if (children.length === 0) return null;
    return { ...n, children };
  }

  const prunedChildren = [];
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      const p = pruneNode(child);
      if (p !== null) prunedChildren.push(p);
    }
  }
  return { ...node, children: prunedChildren };
}

/**
 * Performs incremental diffing sync of FMHY bookmark tree to the selected target container
 * @param {Object} parsedTree - Parsed FMHY tree root from html_parser
 * @param {string} [syncLocation='toolbar'] - Target location ('toolbar' | 'other' | 'menu')
 * @returns {Promise<{ success: boolean, count: number, added: number, deleted: number, updated: number, isNew?: boolean, rootId?: string, error?: string }>}
 */
async function syncFMHYBookmarks(parsedTree, syncLocation = 'toolbar') {
  try {
    const targetParentId = await resolveTargetParentId(syncLocation);

    // Prune any empty folders from the tree before syncing
    const cleanTree = pruneTreeFolders(parsedTree);

    // 1. Prepare FMHY Root Folder in-place at target container
    const fmhyRoot = await prepareFMHYRootFolder(targetParentId, cleanTree.title || 'FMHY');

    const stats = {
      total: 0,
      added: 0,
      deleted: 0,
      updated: 0
    };

    // 2. Perform incremental diffing sync under FMHY root
    await reconcileBookmarkSubtree(fmhyRoot.id, cleanTree.children, stats);

    return {
      success: true,
      count: stats.total,
      added: stats.added,
      deleted: stats.deleted,
      updated: stats.updated,
      isNew: Boolean(fmhyRoot._isNew),
      rootId: fmhyRoot.id
    };
  } catch (error) {
    console.error('FMHY Bookmark Sync failed:', error);
    return {
      success: false,
      count: 0,
      added: 0,
      deleted: 0,
      updated: 0,
      error: error.message || 'Unknown error during sync'
    };
  }
}

/**
 * Filters parsed bookmark tree to only include selected top-level categories.
 * If selectedCategories is empty or null, returns the original parsedTree untouched.
 *
 * @param {Object} parsedTree - Parsed bookmark root tree
 * @param {Array<string>} selectedCategories - Array of category folder titles to include
 * @returns {Object} Filtered bookmark tree
 */
function filterBookmarkTreeByCategories(parsedTree, selectedCategories) {
  if (!parsedTree || !Array.isArray(parsedTree.children)) {
    return parsedTree;
  }

  if (!selectedCategories || !Array.isArray(selectedCategories) || selectedCategories.length === 0) {
    const cleanTree = pruneTreeFolders(parsedTree);
    cleanTree.totalBookmarks = countLinksInTree(cleanTree);
    return cleanTree;
  }

  const selectedSet = new Set(selectedCategories.map((c) => String(c).toLowerCase().trim()));

  const filteredChildren = parsedTree.children.filter((child) => {
    // Preserve non-folder nodes if any exist at the root
    if (!child.isFolder) {
      return true;
    }
    const titleKey = String(child.title || '').toLowerCase().trim();
    return selectedSet.has(titleKey);
  });

  const filteredTree = {
    ...parsedTree,
    children: filteredChildren
  };

  const cleanTree = pruneTreeFolders(filteredTree);
  cleanTree.totalBookmarks = countLinksInTree(cleanTree);
  return cleanTree;
}

if (typeof self !== 'undefined') {
  self.findBookmarksBarId = findBookmarksBarId;
  self.resolveTargetParentId = resolveTargetParentId;
  self.cleanExistingFMHYFolders = cleanExistingFMHYFolders;
  self.prepareFMHYRootFolder = prepareFMHYRootFolder;
  self.reconcileBookmarkSubtree = reconcileBookmarkSubtree;
  self.buildBookmarkSubtree = buildBookmarkSubtree;
  self.syncFMHYBookmarks = syncFMHYBookmarks;
  self.countLinksInTree = countLinksInTree;
  self.normalizeBookmarkUrl = normalizeBookmarkUrl;
  self.filterBookmarkTreeByCategories = filterBookmarkTreeByCategories;
  self.pruneTreeFolders = pruneTreeFolders;
}



