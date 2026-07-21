/**
 * Pure JavaScript Netscape Bookmark HTML Parser
 * Compatible with Service Workers (no DOM / DOMParser required).
 */

/**
 * Decodes HTML entities in titles
 */
export function decodeHTMLEntities(text) {
  if (!text) return '';
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Parses Netscape Bookmark HTML format into a JS tree structure
 * @param {string} htmlString - Raw HTML string
 * @returns {{ title: string, isFolder: boolean, children: Array }} Root FMHY Bookmark Tree Node
 */
export function parseBookmarkHTML(htmlString) {
  const rootNode = { title: 'FMHY', isFolder: true, children: [] };
  const stack = [rootNode];

  // Regex pattern matching <H3...>, <A...>, <DL>, and </DL>
  const tagRegex = /<h3[^>]*>([\s\S]*?)<\/h3>|<a\s+[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>|<dl>|<\/dl>/gi;

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
  unwrappedRoot.totalBookmarks = bookmarkCount;
  return unwrappedRoot;
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

if (typeof self !== 'undefined') {
  self.decodeHTMLEntities = decodeHTMLEntities;
  self.parseBookmarkHTML = parseBookmarkHTML;
}
