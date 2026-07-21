/**
 * Apple Design System - Popup Dashboard Controller
 */

import { api } from '../lib/webextension-polyfill.js';

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
const themeIconSun = document.getElementById('theme-icon-sun');
const themeIconMoon = document.getElementById('theme-icon-moon');

const btnOptions = document.getElementById('btn-options');
const btnClearCache = document.getElementById('btn-clear-cache');

let currentTheme = 'light';

/**
 * Apply Theme Mode (Light or Dark)
 */
function applyTheme(theme) {
  currentTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);

  if (theme === 'dark') {
    themeIconSun.classList.remove('hidden');
    themeIconMoon.classList.add('hidden');
  } else {
    themeIconMoon.classList.remove('hidden');
    themeIconSun.classList.add('hidden');
  }
}

/**
 * Initialize Theme from Storage
 */
async function initTheme() {
  const data = await api.storage.sync.get({ theme: 'light' });
  applyTheme(data.theme);
}

/**
 * Toggle Theme Mode
 */
async function toggleTheme() {
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
  await api.storage.sync.set({ theme: newTheme });
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

// Periodic auto-refresh
setInterval(updateUI, 2000);

document.addEventListener('DOMContentLoaded', async () => {
  await initTheme();
  await updateUI();
});
