/**
 * FMHY Bookmarks Auto-Sync - Background Service Worker
 * Implements 2-Strategy Target Management (Official FMHY vs Personal Fork),
 * ETag HTTP caching for rate-limit protection, context menu actions,
 * automatic GitHub Commit SHA validation, HTML parsing, and bookmark replacement.
 */

if (typeof importScripts === 'function') {
  importScripts('../lib/webextension-polyfill.js', '../lib/html_parser.js', '../lib/bookmark_sync.js');
}

const ALARM_NAME = 'fmhy_auto_sync_alarm';
const CHECK_INTERVAL_MINUTES = 360; // 6 Hours periodic fallback check
const CONTEXT_MENU_SYNC_ID = 'fmhy_sync_now';

const DEFAULT_SETTINGS = {
  preset: 'full', // 'full' | 'starred'
  strategy: 'official', // 'official' | 'custom_fork'
  forkRepo: '',
  customFilePath: '',
  notifyOnSync: false
};

const OFFICIAL_REPO = 'fmhy/bookmarks';

/**
 * Resolves repository target paths based on user settings
 */
async function resolveTargetPaths() {
  const settings = await api.storage.sync.get(DEFAULT_SETTINGS);

  let repo = OFFICIAL_REPO;
  let branch = 'main';
  let filename = (settings.preset === 'starred')
    ? 'fmhy_in_bookmarks_starred_only.html'
    : 'fmhy_in_bookmarks.html';

  if (settings.strategy === 'custom_fork' && settings.forkRepo) {
    repo = settings.forkRepo.replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '').trim();
    if (settings.customFilePath && settings.customFilePath.trim()) {
      filename = settings.customFilePath.trim();
    }
  }

  const rawUrl = `https://raw.githubusercontent.com/${repo}/refs/heads/${branch}/${filename}`;
  const commitApiUrl = `https://api.github.com/repos/${repo}/commits?path=${filename}&sha=${branch}&per_page=1`;

  return { repo, branch, filename, rawUrl, commitApiUrl };
}

/**
 * Query GitHub Commit API with ETag support to prevent rate-limit usage
 */
async function fetchLatestCommitSha(commitApiUrl, lastCommitETag = null) {
  try {
    const headers = { 'Cache-Control': 'no-cache' };
    if (lastCommitETag) {
      headers['If-None-Match'] = lastCommitETag;
    }

    const res = await fetch(commitApiUrl, { headers });

    if (res.status === 304) {
      return { unmodified: true, sha: null, etag: lastCommitETag };
    }

    if (res.ok) {
      const etag = res.headers.get('etag');
      const data = await res.json();
      if (data && data[0] && data[0].sha) {
        return { unmodified: false, sha: data[0].sha, etag: etag || null };
      }
    }
  } catch (err) {
    console.warn('Unable to query GitHub Commit API:', err);
  }
  return { unmodified: false, sha: null, etag: null };
}

/**
 * Main Sync Workflow Execution
 * @param {Object} options - { isManual: boolean }
 */
async function executeSync(options = { isManual: false }) {
  const settings = await api.storage.sync.get(DEFAULT_SETTINGS);
  const targets = await resolveTargetPaths();

  await api.storage.local.set({
    lastSyncStatus: 'syncing',
    lastSyncMessage: `Checking ${targets.repo} for commit updates...`
  });

  try {
    const localState = await api.storage.local.get([
      'lastETag',
      'lastCommitSha',
      'lastCommitETag',
      'lastBookmarkCount'
    ]);

    // 1. Automatic ETag & Commit SHA Verification
    const commitCheck = await fetchLatestCommitSha(targets.commitApiUrl, localState.lastCommitETag);

    if (!options.isManual && commitCheck.unmodified) {
      const nowIso = new Date().toISOString();
      await api.storage.local.set({
        lastSyncStatus: 'success',
        lastSyncTime: nowIso,
        lastSyncMessage: `Up to date (304 Not Modified - 0 API credits used)`
      });
      return { success: true, count: localState.lastBookmarkCount || 0, modified: false };
    }

    const latestSha = commitCheck.sha;

    if (!options.isManual && latestSha && localState.lastCommitSha && latestSha === localState.lastCommitSha) {
      const nowIso = new Date().toISOString();
      await api.storage.local.set({
        lastSyncStatus: 'success',
        lastSyncTime: nowIso,
        lastCommitETag: commitCheck.etag || localState.lastCommitETag,
        lastSyncMessage: `Up to date with GitHub commit ${latestSha.substring(0, 7)}`
      });
      return { success: true, count: localState.lastBookmarkCount || 0, modified: false };
    }

    // 2. Download raw HTML bookmark content
    const headers = {};
    if (!options.isManual && localState.lastETag) {
      headers['If-None-Match'] = localState.lastETag;
    }

    const response = await fetch(targets.rawUrl, { headers, cache: 'no-cache' });

    if (response.status === 304) {
      const nowIso = new Date().toISOString();
      await api.storage.local.set({
        lastSyncStatus: 'success',
        lastSyncTime: nowIso,
        lastSyncMessage: 'Upstream bookmarks unchanged (304 Not Modified)'
      });
      return { success: true, count: localState.lastBookmarkCount || 0, modified: false };
    }

    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText} (${targets.rawUrl})`);
    }

    const newETag = response.headers.get('etag') || response.headers.get('last-modified');
    const htmlText = await response.text();

    await api.storage.local.set({
      lastSyncMessage: 'Parsing Netscape bookmark structure...'
    });

    const parsedTree = parseBookmarkHTML(htmlText);

    await api.storage.local.set({
      lastSyncMessage: 'Updating browser Bookmarks Bar...'
    });

    const syncResult = await syncFMHYBookmarks(parsedTree);

    if (!syncResult.success) {
      throw new Error(syncResult.error || 'Failed to update browser bookmarks.');
    }

    const nowIso = new Date().toISOString();
    await api.storage.local.set({
      lastSyncStatus: 'success',
      lastSyncTime: nowIso,
      lastSyncMessage: `Synced ${syncResult.count} bookmarks (Commit ${latestSha ? latestSha.substring(0, 7) : 'latest'})`,
      lastBookmarkCount: syncResult.count,
      lastETag: newETag || null,
      lastCommitETag: commitCheck.etag || localState.lastCommitETag || null,
      lastCommitSha: latestSha || null,
      lastSourceUrl: targets.rawUrl
    });

    showNotification(
      'FMHY Bookmarks Synced',
      `Updated ${syncResult.count} bookmarks on your Bookmarks Bar.`
    );

    return { success: true, count: syncResult.count, modified: true };
  } catch (error) {
    console.error('Background Sync Error:', error);
    const nowIso = new Date().toISOString();
    await api.storage.local.set({
      lastSyncStatus: 'error',
      lastSyncTime: nowIso,
      lastSyncMessage: error.message || 'Failed to sync FMHY bookmarks.'
    });

    showNotification(
      'FMHY Sync Failed',
      error.message || 'An error occurred while syncing FMHY bookmarks.',
      true
    );

    return { success: false, error: error.message };
  }
}

/**
 * Show system desktop notification (strictly honors notifyOnSync user setting)
 */
async function showNotification(title, message, isError = false) {
  const settings = await api.storage.sync.get(DEFAULT_SETTINGS);
  if (!settings.notifyOnSync) {
    return; // User disabled notifications in options
  }

  if (api.notifications && api.notifications.create) {
    try {
      const res = api.notifications.create({
        type: 'basic',
        iconUrl: api.runtime.getURL('assets/icons/icon-48.png'),
        title: title,
        message: message,
        priority: isError ? 2 : 1
      });
      if (res && typeof res.catch === 'function') {
        res.catch((err) => console.warn('Failed to display desktop notification:', err));
      }
    } catch (err) {
      console.warn('Notification execution error:', err);
    }
  }
}

/**
 * Configure periodic background alarm
 */
async function updateAlarmSchedule() {
  await api.alarms.clear(ALARM_NAME);
  api.alarms.create(ALARM_NAME, {
    periodInMinutes: CHECK_INTERVAL_MINUTES
  });
  console.log(`Configured background commit check every ${CHECK_INTERVAL_MINUTES} minutes.`);
}

/**
 * Setup Right-Click Extension Context Menu
 */
function setupContextMenu() {
  if (api.contextMenus && api.contextMenus.create) {
    api.contextMenus.removeAll(() => {
      api.contextMenus.create({
        id: CONTEXT_MENU_SYNC_ID,
        title: 'Sync FMHY Bookmarks Now',
        contexts: ['action']
      });
    });
  }
}

// Event Listeners

if (api.contextMenus && api.contextMenus.onClicked) {
  api.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId === CONTEXT_MENU_SYNC_ID) {
      executeSync({ isManual: true });
    }
  });
}

// 1. Browser Startup: Automatically check for GitHub commits on browser open!
if (api.runtime.onStartup) {
  api.runtime.onStartup.addListener(() => {
    console.log('Browser opened: Triggering automated GitHub commit check...');
    setupContextMenu();
    executeSync({ isManual: false });
  });
}

// 2. Periodic Alarm: Periodic background commit check
api.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    console.log('Periodic alarm triggered: Checking for GitHub commits...');
    executeSync({ isManual: false });
  }
});

// 3. Installation & Updates
api.runtime.onInstalled.addListener(async (details) => {
  setupContextMenu();
  if (details.reason === 'install') {
    await api.storage.sync.set(DEFAULT_SETTINGS);
    await updateAlarmSchedule();
    executeSync({ isManual: true });
  } else if (details.reason === 'update') {
    await updateAlarmSchedule();
  }
});

// 4. Popup & Options Messaging
api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'TRIGGER_SYNC') {
    executeSync({ isManual: true }).then(sendResponse);
    return true;
  } else if (message.action === 'UPDATE_SCHEDULE') {
    updateAlarmSchedule().then(() => sendResponse({ success: true }));
    return true;
  } else if (message.action === 'CLEAR_CACHE') {
    api.storage.local.set({ lastETag: null, lastCommitSha: null, lastCommitETag: null }).then(() => sendResponse({ success: true }));
    return true;
  }
});
