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
  try {
    const barId = await findBookmarksBarId();
    const children = await api.bookmarks.getChildren(barId);
    if (children && children.length > 0) {
      for (const child of children) {
        if (!child.url && child.title && child.title.toUpperCase().includes('FMHY')) {
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
      if (!match.url) {
        try {
          await api.bookmarks.removeTree(match.id);
        } catch (err) {}
      }
    }
  }
}

/**
 * Obtains or creates the primary "FMHY" root folder on the Bookmarks Bar.
 * Reuses the existing root folder ID/GUID across sync runs to prevent
 * Google Chrome Sync / Firefox Sync from spawning duplicate folders on mobile/synced devices.
 * Removes any extra duplicate FMHY root folders on the Bookmarks Bar if present.
 *
 * @param {string} barId - Bookmarks Bar parent ID
 * @param {string} title - Target root folder title (e.g. 'FMHY')
 * @returns {Promise<Object>} The primary FMHY root bookmark node
 */
async function prepareFMHYRootFolder(barId, title = 'FMHY') {
  let primaryRoot = null;

  try {
    const children = await api.bookmarks.getChildren(barId);
    const fmhyFolders = (children || []).filter(
      (child) => !child.url && child.title && child.title.toUpperCase().includes('FMHY')
    );

    if (fmhyFolders.length > 0) {
      primaryRoot = fmhyFolders[0];

      // Remove any secondary duplicate FMHY folders on the Bookmarks Bar if present
      for (let i = 1; i < fmhyFolders.length; i++) {
        try {
          await api.bookmarks.removeTree(fmhyFolders[i].id);
        } catch (err) {
          console.warn(`Failed to remove duplicate folder ${fmhyFolders[i].id}:`, err);
        }
      }
    }
  } catch (err) {
    console.warn('Error checking Bookmarks Bar children for FMHY root:', err);
  }

  // Fallback search if no FMHY folder was directly under Bookmarks Bar
  if (!primaryRoot) {
    try {
      const matches = await api.bookmarks.search({ title: 'FMHY' });
      const folderMatches = (matches || []).filter((m) => !m.url);
      if (folderMatches.length > 0) {
        primaryRoot = folderMatches[0];
        try {
          await api.bookmarks.move(primaryRoot.id, { parentId: barId, index: 0 });
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
    // Ensure it's positioned at index 0 on the Bookmarks Bar and title matches
    try {
      await api.bookmarks.move(primaryRoot.id, { parentId: barId, index: 0 });
    } catch (e) {}

    if (primaryRoot.title !== title) {
      try {
        await api.bookmarks.update(primaryRoot.id, { title: title });
      } catch (e) {}
    }

    return primaryRoot;
  }

  // If no existing FMHY root folder exists, create a new one at Index 0
  return await api.bookmarks.create({
    parentId: barId,
    title: title || 'FMHY',
    index: 0
  });
}

/**
 * Recursively reconciles (diffs) bookmarks and folders under a parent ID.
 * Reuses existing folder and link nodes matching title/URL to minimize
 * WebExtension bookmark mutations and avoid browser sync conflicts.
 *
 * @param {string} parentId - Parent bookmark folder ID
 * @param {Array} childrenNodes - Parsed incoming node objects
 * @returns {Promise<number>} Active link bookmark count
 */
async function reconcileBookmarkSubtree(parentId, childrenNodes) {
  let activeLinkCount = 0;
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
      const urlKey = child.url.trim();
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
    const urlKey = incomingLink.url.trim();
    const existingList = existingLinksByUrl.get(urlKey);

    if (existingList && existingList.length > 0) {
      // Reuse existing link node
      const matchedNode = existingList.shift();
      const targetTitle = incomingLink.title || incomingLink.url;
      if (matchedNode.title !== targetTitle) {
        linkUpdatePromises.push(
          api.bookmarks.update(matchedNode.id, { title: targetTitle }).catch(() => {})
        );
      }
    } else {
      // Link needs to be created
      linksToCreate.push(incomingLink);
    }
    activeLinkCount++;
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
  }

  // --- 3. Reconcile Folder Structure ---
  const folderTasks = [];

  for (const folderNode of incomingFolders) {
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
        reconcileBookmarkSubtree(folderId, folderNode.children)
      );
    }
  }

  // Recurse subfolders concurrently per tree level
  if (folderTasks.length > 0) {
    const subfolderCounts = await Promise.all(folderTasks);
    for (const count of subfolderCounts) {
      activeLinkCount += count;
    }
  }

  // Delete leftover obsolete subfolders not present in incoming tree
  for (const [, remainingList] of existingFoldersByTitle) {
    for (const obsoleteFolder of remainingList) {
      try {
        await api.bookmarks.removeTree(obsoleteFolder.id);
      } catch (e) {}
    }
  }

  return activeLinkCount;
}

/**
 * Fallback recursive helper for creating fresh subtrees
 */
async function buildBookmarkSubtree(parentId, childrenNodes) {
  return await reconcileBookmarkSubtree(parentId, childrenNodes);
}

/**
 * Performs incremental diffing sync of FMHY bookmark tree to the Bookmarks Bar
 * @param {Object} parsedTree - Parsed FMHY tree root from html_parser
 * @returns {Promise<{ success: boolean, count: number, rootId?: string, error?: string }>}
 */
async function syncFMHYBookmarks(parsedTree) {
  try {
    const barId = await findBookmarksBarId();

    // 1. Prepare FMHY Root Folder in-place (reusing existing root ID/GUID if present)
    const fmhyRoot = await prepareFMHYRootFolder(barId, parsedTree.title || 'FMHY');

    // 2. Perform incremental diffing sync under FMHY root
    const count = await reconcileBookmarkSubtree(fmhyRoot.id, parsedTree.children);

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
  self.cleanExistingFMHYFolders = cleanExistingFMHYFolders;
  self.prepareFMHYRootFolder = prepareFMHYRootFolder;
  self.reconcileBookmarkSubtree = reconcileBookmarkSubtree;
  self.buildBookmarkSubtree = buildBookmarkSubtree;
  self.syncFMHYBookmarks = syncFMHYBookmarks;
}


