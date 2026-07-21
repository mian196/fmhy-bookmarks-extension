/**
 * FMHY Bookmarks Auto-Sync - Background Service Worker
 * Implements 2-Strategy Target Management (Official FMHY vs Personal Fork),
 * automatic GitHub Commit SHA validation on browser startup & periodic alarms,
 * HTML parsing, bookmark replacement, storage state, and notifications.
 */

importScripts('../lib/webextension-polyfill.js', '../lib/html_parser.js', '../lib/bookmark_sync.js');

const ALARM_NAME = 'fmhy_auto_sync_alarm';
const CHECK_INTERVAL_MINUTES = 360; // 6 Hours periodic fallback check

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
 * Query GitHub Commit API for the latest commit SHA
 */
async function fetchLatestCommitSha(commitApiUrl) {
  try {
    const res = await fetch(commitApiUrl, { cache: 'no-cache' });
    if (res.ok) {
      const data = await res.json();
      if (data && data[0] && data[0].sha) {
        return data[0].sha;
      }
    }
  } catch (err) {
    console.warn('Unable to query GitHub Commit API:', err);
  }
  return null;
}

/**
 * Main Sync Workflow Execution
 * @param {Object} options - { isManual: boolean }
 */
export async function executeSync(options = { isManual: false }) {
  const settings = await api.storage.sync.get(DEFAULT_SETTINGS);
  const targets = await resolveTargetPaths();

  await api.storage.local.set({
    lastSyncStatus: 'syncing',
    lastSyncMessage: `Checking ${targets.repo} for commit updates...`
  });

  try {
    const localState = await api.storage.local.get(['lastETag', 'lastCommitSha', 'lastBookmarkCount']);

    // 1. Automatic Commit SHA Verification
    const latestSha = await fetchLatestCommitSha(targets.commitApiUrl);

    if (!options.isManual && latestSha && localState.lastCommitSha && latestSha === localState.lastCommitSha) {
      const nowIso = new Date().toISOString();
      await api.storage.local.set({
        lastSyncStatus: 'success',
        lastSyncTime: nowIso,
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
      lastCommitSha: latestSha || null,
      lastSourceUrl: targets.rawUrl
    });

    if (settings.notifyOnSync || options.isManual) {
      showNotification(
        'FMHY Bookmarks Synced',
        `Updated ${syncResult.count} bookmarks on your Bookmarks Bar.`
      );
    }

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
 * Show system desktop notification
 */
function showNotification(title, message, isError = false) {
  if (api.notifications) {
    api.notifications.create({
      type: 'basic',
      iconUrl: api.runtime.getURL('assets/icons/icon-48.png'),
      title: title,
      message: message,
      priority: isError ? 2 : 1
    });
  }
}

/**
 * Configure periodic background alarm
 */
export async function updateAlarmSchedule() {
  await api.alarms.clear(ALARM_NAME);
  api.alarms.create(ALARM_NAME, {
    periodInMinutes: CHECK_INTERVAL_MINUTES
  });
  console.log(`Configured background commit check every ${CHECK_INTERVAL_MINUTES} minutes.`);
}

// Event Listeners

// 1. Browser Startup: Automatically check for GitHub commits on browser open!
if (api.runtime.onStartup) {
  api.runtime.onStartup.addListener(() => {
    console.log('Browser opened: Triggering automated GitHub commit check...');
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
    api.storage.local.set({ lastETag: null, lastCommitSha: null }).then(() => sendResponse({ success: true }));
    return true;
  }
});
