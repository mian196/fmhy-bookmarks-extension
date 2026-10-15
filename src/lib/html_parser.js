/**
 * Pure JavaScript Netscape Bookmark HTML Parser
 * Compatible with Service Workers (no DOM / DOMParser required).
 */

/**
 * Decodes HTML entities in titles
 */
function decodeHTMLEntities(text) {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, code) => {
      try {
        return String.fromCodePoint(Number(code));
      } catch {
        return '';
      }
    })
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => {
      try {
        return String.fromCodePoint(parseInt(hex, 16));
      } catch {
        return '';
      }
    });
}

/**
 * Parses Netscape Bookmark HTML format into a JS tree structure
 * @param {string} htmlString - Raw HTML string
 * @returns {{ title: string, isFolder: boolean, children: Array }} Root FMHY Bookmark Tree Node
 */
function parseBookmarkHTML(htmlString) {
  const rootNode = { title: 'FMHY', isFolder: true, children: [] };
  const stack = [rootNode];

  // Regex pattern matching <H3...>, <A...>, <DL...>, and </DL>
  const tagRegex = /<h3[^>]*>([\s\S]*?)<\/h3>|<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>|<dl\b[^>]*>|<\/dl>/gi;

  let match;
  let currentPendingFolderTitle = null;
  let bookmarkCount = 0;

  while ((match = tagRegex.exec(htmlString)) !== null) {
    const fullMatch = match[0];
    const lowerMatch = fullMatch.toLowerCase();

    if (lowerMatch.startsWith('<h3')) {
      currentPendingFolderTitle = decodeHTMLEntities(match[1]).trim();
    } else if (lowerMatch.startsWith('<dl')) {
      const folderTitle = currentPendingFolderTitle || 'FMHY Subfolder';
      currentPendingFolderTitle = null;

      const newFolderNode = {
        title: folderTitle,
        isFolder: true,
        children: []
      };

      const parentNode = stack[stack.length - 1];
      parentNode.children.push(newFolderNode);
      stack.push(newFolderNode);
    } else if (lowerMatch.startsWith('</dl')) {
      if (stack.length > 1) {
        stack.pop();
      }
    } else if (lowerMatch.startsWith('<a')) {
      const url = match[2].trim();
      const rawTitle = match[3].trim();
      const title = decodeHTMLEntities(rawTitle);

      if (url) {
        const parentNode = stack[stack.length - 1];
        parentNode.children.push({
          title: title || url,
          url: url,
          isFolder: false
        });
        bookmarkCount++;
      }
    }
  }

  const unwrappedRoot = unwrapRoot(rootNode);
  const prunedRoot = pruneEmptyFolders(unwrappedRoot);
  prunedRoot.totalBookmarks = bookmarkCount;
  return prunedRoot;
}

/**
 * Prevents double-nesting like FMHY > FMHY > [Categories]
 */
function unwrapRoot(rootNode) {
  let current = rootNode;

  while (
    current.children &&
    current.children.length === 1 &&
    current.children[0].isFolder &&
    current.children[0].title.toUpperCase().includes('FMHY')
  ) {
    current = current.children[0];
  }

  return {
    title: 'FMHY',
    isFolder: true,
    children: current.children || []
  };
}

/**
 * Recursively removes empty folders from a bookmark tree node.
 * A folder node is considered empty if it contains 0 link bookmarks in its entire subtree.
 * Non-folder nodes (links) are preserved.
 *
 * @param {Object} node - Bookmark tree node
 * @returns {Object|null} Pruned bookmark node, or null if empty folder
 */
function pruneEmptyFolderNode(node) {
  if (!node) return null;
  if (!node.isFolder) return node;

  const prunedChildren = [];
  if (Array.isArray(node.children)) {
    for (const child of node.children) {
      const prunedChild = pruneEmptyFolderNode(child);
      if (prunedChild !== null) {
        prunedChildren.push(prunedChild);
      }
    }
  }

  // Folder with 0 links or subfolders after pruning
  if (prunedChildren.length === 0) {
    return null;
  }

  return {
    ...node,
    children: prunedChildren
  };
}

/**
 * Prunes empty folders from a root bookmark tree.
 * Preserves the root node itself while removing all empty descendant folders.
 *
 * @param {Object} rootNode - Root bookmark tree node
 * @returns {Object} Pruned tree with empty folders removed
 */
function pruneEmptyFolders(rootNode) {
  if (!rootNode) return rootNode;

  const prunedChildren = [];
  if (Array.isArray(rootNode.children)) {
    for (const child of rootNode.children) {
      const prunedChild = pruneEmptyFolderNode(child);
      if (prunedChild !== null) {
        prunedChildren.push(prunedChild);
      }
    }
  }

  return {
    ...rootNode,
    children: prunedChildren
  };
}

if (typeof self !== 'undefined') {
  self.decodeHTMLEntities = decodeHTMLEntities;
  self.parseBookmarkHTML = parseBookmarkHTML;
  self.pruneEmptyFolders = pruneEmptyFolders;
  self.pruneEmptyFolderNode = pruneEmptyFolderNode;
}
