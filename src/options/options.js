/**
 * Options & Preferences Controller
 * Handles 2-Strategy Target Selector (Official vs Custom Fork),
 * automatic GitHub commit SHA tracking, theme syncing, and settings persistence.
 */



const presetRadios = document.getElementsByName('preset');
const syncLocationRadios = document.getElementsByName('syncLocation');
const strategyRadios = document.getElementsByName('strategy');

const panelCustomFork = document.getElementById('panel-custom-fork');
const forkRepoInput = document.getElementById('fork-repo');
const customFilePathInput = document.getElementById('custom-file-path');

const previewModeBadge = document.getElementById('preview-mode-badge');
const previewTargetRepo = document.getElementById('preview-target-repo');
const previewCommitSha = document.getElementById('preview-commit-sha');

const notifySyncCheckbox = document.getElementById('notify-sync');
const btnSave = document.getElementById('btn-save');
const btnReset = document.getElementById('btn-reset');
const toast = document.getElementById('toast');

const DEFAULT_SETTINGS = {
  preset: 'full',
  syncLocation: 'toolbar', // 'toolbar' | 'other' | 'menu'
  strategy: 'official', // 'official' | 'custom_fork'
  forkRepo: '',
  customFilePath: '',
  notifyOnSync: false,
  theme: 'dark'
};

/**
 * Format ISO time to relative string
 */
function formatTimeAgo(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const diffHours = Math.floor((new Date() - date) / (1000 * 60 * 60));
  if (diffHours < 1) return 'less than an hour ago';
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

/**
 * Fetch latest commit info from GitHub API
 */
async function fetchLatestCommitInfo(repoPath = 'fmhy/bookmarks') {
  try {
    previewCommitSha.textContent = 'Checking GitHub API...';
    const cleanRepo = repoPath.replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
    const targetRepo = cleanRepo || 'fmhy/bookmarks';

    previewTargetRepo.textContent = targetRepo;

    const apiUrl = `https://api.github.com/repos/${targetRepo}/commits?sha=main&per_page=1`;
    const res = await fetch(apiUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && data[0]) {
        const sha = data[0].sha.substring(0, 7);
        const dateIso = data[0].commit?.committer?.date;
        const timeAgo = formatTimeAgo(dateIso);
        previewCommitSha.textContent = `${sha} (${timeAgo})`;
        return;
      }
    }
    previewCommitSha.textContent = 'Unavailable';
  } catch (e) {
    previewCommitSha.textContent = 'Offline / Rate Limited';
  }
}

/**
 * Update UI panels and live commit status
 */
function updateDynamicPanels() {
  const selectedStrategy = Array.from(strategyRadios).find(r => r.checked)?.value || 'official';

  if (selectedStrategy === 'custom_fork') {
    panelCustomFork.classList.remove('hidden');
    previewModeBadge.textContent = 'Personal Fork';
    const repo = forkRepoInput.value.trim() || 'yourusername/fmhy-bookmarks';
    fetchLatestCommitInfo(repo);
  } else {
    panelCustomFork.classList.add('hidden');
    previewModeBadge.textContent = 'Official FMHY';
    fetchLatestCommitInfo('fmhy/bookmarks');
  }
}

/**
 * Load settings into UI inputs
 */
async function loadSettings() {
  const settings = await api.storage.sync.get(DEFAULT_SETTINGS);

  if (settings.theme) {
    document.documentElement.setAttribute('data-theme', settings.theme);
  }

  for (const radio of presetRadios) {
    radio.checked = (radio.value === settings.preset);
  }

  for (const radio of syncLocationRadios) {
    radio.checked = (radio.value === (settings.syncLocation || 'toolbar'));
  }

  for (const radio of strategyRadios) {
    radio.checked = (radio.value === (settings.strategy || 'official'));
  }

  forkRepoInput.value = settings.forkRepo || '';
  customFilePathInput.value = settings.customFilePath || '';
  notifySyncCheckbox.checked = !!settings.notifyOnSync;

  updateDynamicPanels();
}

/**
 * Show temporary toast message
 */
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove('hidden');
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3500);
}

/**
 * Save settings to chrome.storage.sync
 */
async function saveSettings() {
  const selectedPreset = Array.from(presetRadios).find(r => r.checked)?.value || 'full';
  const selectedSyncLocation = Array.from(syncLocationRadios).find(r => r.checked)?.value || 'toolbar';
  const selectedStrategy = Array.from(strategyRadios).find(r => r.checked)?.value || 'official';

  if (selectedStrategy === 'custom_fork' && !forkRepoInput.value.trim()) {
    showToast('Error: Please enter a valid GitHub repository (owner/repo).');
    return;
  }

  const newSettings = {
    preset: selectedPreset,
    syncLocation: selectedSyncLocation,
    strategy: selectedStrategy,
    forkRepo: forkRepoInput.value.trim(),
    customFilePath: customFilePathInput.value.trim(),
    notifyOnSync: notifySyncCheckbox.checked
  };

  await api.storage.sync.set(newSettings);

  // Reset local cache & trigger immediate sync for target location updates
  await api.runtime.sendMessage({ action: 'CLEAR_CACHE' });
  await api.runtime.sendMessage({ action: 'UPDATE_SCHEDULE' });
  await api.runtime.sendMessage({ action: 'TRIGGER_SYNC' });

  showToast('Preferences saved & FMHY location updated!');
  updateDynamicPanels();
}

/**
 * Reset settings to default values
 */
async function resetSettings() {
  await api.storage.sync.set(DEFAULT_SETTINGS);
  await api.runtime.sendMessage({ action: 'CLEAR_CACHE' });
  await api.runtime.sendMessage({ action: 'UPDATE_SCHEDULE' });
  await api.runtime.sendMessage({ action: 'TRIGGER_SYNC' });
  await loadSettings();
  showToast('Settings reset to defaults.');
}

// Attach Event Listeners
for (const radio of presetRadios) {
  radio.addEventListener('change', updateDynamicPanels);
}
for (const radio of syncLocationRadios) {
  radio.addEventListener('change', updateDynamicPanels);
}
for (const radio of strategyRadios) {
  radio.addEventListener('change', updateDynamicPanels);
}

forkRepoInput.addEventListener('blur', updateDynamicPanels);

btnSave.addEventListener('click', saveSettings);
btnReset.addEventListener('click', resetSettings);

document.addEventListener('DOMContentLoaded', loadSettings);
