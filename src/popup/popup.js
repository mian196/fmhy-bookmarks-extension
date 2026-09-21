/**
 * Apple Design System - Popup Dashboard Controller
 */



const statusBadge = document.getElementById('status-badge');
const statusText = document.getElementById('status-text');
const presetPill = document.getElementById('preset-pill');
const countValue = document.getElementById('count-value');
const timeValue = document.getElementById('time-value');
const messageBanner = document.getElementById('message-banner');
const btnSync = document.getElementById('btn-sync');
const btnSyncText = document.getElementById('btn-sync-text');
const syncIcon = document.getElementById('sync-icon');

const btnThemeToggle = document.getElementById('btn-theme-toggle');
const themeIconSystem = document.getElementById('theme-icon-system');
const themeIconSun = document.getElementById('theme-icon-sun');
const themeIconMoon = document.getElementById('theme-icon-moon');

const btnOptions = document.getElementById('btn-options');
const btnClearCache = document.getElementById('btn-clear-cache');

let currentThemeSetting = 'system';

/**
 * Resolve effective theme (light or dark) based on setting
 */
function resolveTheme(setting) {
  if (setting === 'system') {
    return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }
  return setting === 'dark' ? 'dark' : 'light';
}

/**
 * Apply Theme Mode (System, Light, or Dark)
 */
function applyTheme(themeSetting) {
  currentThemeSetting = themeSetting || 'system';
  const effectiveTheme = resolveTheme(currentThemeSetting);
  document.documentElement.setAttribute('data-theme', effectiveTheme);

  if (themeIconSystem) themeIconSystem.classList.toggle('hidden', currentThemeSetting !== 'system');
  if (themeIconSun) themeIconSun.classList.toggle('hidden', currentThemeSetting !== 'light');
  if (themeIconMoon) themeIconMoon.classList.toggle('hidden', currentThemeSetting !== 'dark');

  if (btnThemeToggle) {
    let label = 'Theme: System Default';
    if (currentThemeSetting === 'light') label = 'Theme: Light Mode';
    if (currentThemeSetting === 'dark') label = 'Theme: Dark Mode';
    btnThemeToggle.title = label;
    btnThemeToggle.setAttribute('aria-label', label);
  }
}

/**
 * Initialize Theme from Storage and setup listeners
 */
async function initTheme() {
  const data = await api.storage.sync.get({ theme: 'system' });
  applyTheme(data.theme);

  // Listen to OS theme changes if set to system
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', () => {
      if (currentThemeSetting === 'system') {
        applyTheme('system');
      }
    });
  }

  // Listen to storage changes across pages
  if (api.storage && api.storage.onChanged) {
    api.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && changes.theme) {
        applyTheme(changes.theme.newValue || 'system');
      }
    });
  }
}

/**
 * Toggle Theme Mode: system -> light -> dark -> system
 */
async function toggleTheme() {
  let nextTheme = 'system';
  if (currentThemeSetting === 'system') {
    nextTheme = 'light';
  } else if (currentThemeSetting === 'light') {
    nextTheme = 'dark';
  } else {
    nextTheme = 'system';
  }
  applyTheme(nextTheme);
  await api.storage.sync.set({ theme: nextTheme });
}

/**
 * Format ISO Date into human-friendly relative time
 */
function formatTime(isoString) {
  if (!isoString) return 'Never';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);

  if (diffSec < 45) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Update UI state from extension storage
 */
async function updateUI() {
  const syncSettings = await api.storage.sync.get({
    preset: 'full'
  });

  const localData = await api.storage.local.get([
    'lastSyncStatus',
    'lastSyncTime',
    'lastSyncMessage',
    'lastBookmarkCount'
  ]);

  // Update Preset Badge
  if (syncSettings.preset === 'starred') {
    presetPill.textContent = 'Starred Only';
  } else {
    presetPill.textContent = 'Full Directory';
  }

  const status = localData.lastSyncStatus || 'idle';
  statusBadge.className = 'status-chip ' + status;

  if (status === 'syncing') {
    statusText.textContent = 'Syncing...';
    btnSync.disabled = true;
    syncIcon.classList.add('spin');
    btnSyncText.textContent = 'Syncing...';
  } else if (status === 'success') {
    statusText.textContent = 'Synced';
    btnSync.disabled = false;
    syncIcon.classList.remove('spin');
    btnSyncText.textContent = 'Sync Now';
  } else if (status === 'error') {
    statusText.textContent = 'Sync Failed';
    btnSync.disabled = false;
    syncIcon.classList.remove('spin');
    btnSyncText.textContent = 'Retry Sync';
  } else {
    statusText.textContent = 'Ready';
    btnSync.disabled = false;
    syncIcon.classList.remove('spin');
    btnSyncText.textContent = 'Sync Now';
  }

  countValue.textContent = localData.lastBookmarkCount ? localData.lastBookmarkCount.toLocaleString() : '--';
  timeValue.textContent = formatTime(localData.lastSyncTime);
  messageBanner.textContent = localData.lastSyncMessage || 'Ready to sync with GitHub repository.';
}

/**
 * Handle Sync CTA click
 */
async function handleSyncClick() {
  btnSync.disabled = true;
  syncIcon.classList.add('spin');
  btnSyncText.textContent = 'Syncing...';
  statusBadge.className = 'status-chip syncing';
  statusText.textContent = 'Syncing...';
  messageBanner.textContent = 'Querying GitHub API and downloading tree...';

  try {
    const response = await api.runtime.sendMessage({ action: 'TRIGGER_SYNC' });
    if (response && response.success) {
      messageBanner.textContent = response.modified === false
        ? 'Bookmarks are already up to date with GitHub!'
        : `Successfully synced ${response.count} bookmarks!`;
    }
  } catch (err) {
    messageBanner.textContent = err.message || 'Error communicating with background worker.';
  } finally {
    await updateUI();
  }
}

// Attach Event Listeners
btnSync.addEventListener('click', handleSyncClick);
btnThemeToggle.addEventListener('click', toggleTheme);

btnOptions.addEventListener('click', () => {
  if (api.runtime.openOptionsPage) {
    api.runtime.openOptionsPage();
  } else {
    window.open(api.runtime.getURL('options/options.html'));
  }
});

btnClearCache.addEventListener('click', async (e) => {
  e.preventDefault();
  messageBanner.textContent = 'Clearing cache & forcing fresh fetch...';
  await api.runtime.sendMessage({ action: 'CLEAR_CACHE' });
  await handleSyncClick();
});

const versionTag = document.getElementById('version-tag');

/**
 * Dynamically populate version tag from manifest.json
 */
function initVersion() {
  if (versionTag && typeof api !== 'undefined' && api.runtime && api.runtime.getManifest) {
    const manifest = api.runtime.getManifest();
    if (manifest && manifest.version) {
      versionTag.textContent = `v${manifest.version}`;
    }
  }
}

// Periodic auto-refresh
setInterval(updateUI, 2000);

document.addEventListener('DOMContentLoaded', async () => {
  initVersion();
  await initTheme();
  await updateUI();
});
