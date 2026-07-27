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
 * Google Chrome Sync from spawning duplicate folders on mobile/synced devices.
 * Removes any extra duplicate FMHY root folders and clears existing children in-place.
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
    // Empty existing children of the root folder in-place to preserve root ID/GUID
    try {
      const rootChildren = await api.bookmarks.getChildren(primaryRoot.id);
      if (rootChildren && rootChildren.length > 0) {
        for (const child of rootChildren) {
          try {
            await api.bookmarks.removeTree(child.id);
          } catch (err) {
            console.warn(`Failed to remove child ${child.id} from FMHY root:`, err);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to clean FMHY root folder children:', err);
    }

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
 * Recursively creates bookmarks and folders under a parent ID
 */
async function buildBookmarkSubtree(parentId, childrenNodes) {
  let count = 0;
  if (!childrenNodes || childrenNodes.length === 0) return count;

  const folders = [];
  const links = [];

  for (const node of childrenNodes) {
    if (node.isFolder) {
      folders.push(node);
    } else if (node.url) {
      links.push(node);
    }
  }

  // 1. Create sibling link bookmarks in parallel batches for maximum speed
  if (links.length > 0) {
    const BATCH_SIZE = 25;
    for (let i = 0; i < links.length; i += BATCH_SIZE) {
      const batch = links.slice(i, i + BATCH_SIZE);
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
    count += links.length;
  }

  // 2. Create subfolder nodes and recurse for their children
  for (const folderNode of folders) {
    try {
      const createdFolder = await api.bookmarks.create({
        parentId: parentId,
        title: folderNode.title
      });
      if (folderNode.children && folderNode.children.length > 0) {
        count += await buildBookmarkSubtree(createdFolder.id, folderNode.children);
      }
    } catch (err) {
      console.warn(`Failed to create folder: ${folderNode.title}`, err);
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

    // 1. Prepare FMHY Root Folder in-place (reusing existing root ID/GUID if present)
    const fmhyRoot = await prepareFMHYRootFolder(barId, parsedTree.title || 'FMHY');

    // 2. Populate subcategories and bookmark items
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
  self.cleanExistingFMHYFolders = cleanExistingFMHYFolders;
  self.prepareFMHYRootFolder = prepareFMHYRootFolder;
  self.buildBookmarkSubtree = buildBookmarkSubtree;
  self.syncFMHYBookmarks = syncFMHYBookmarks;
}

