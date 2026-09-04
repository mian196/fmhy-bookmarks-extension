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
const githubTokenInput = document.getElementById('github-token');
const btnToggleToken = document.getElementById('btn-toggle-token');
const iconTokenEye = document.getElementById('icon-token-eye');
const iconTokenEyeOff = document.getElementById('icon-token-eye-off');

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
  githubToken: '',
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
async function fetchLatestCommitInfo(repoPath = 'fmhy/bookmarks', token = '') {
  try {
    previewCommitSha.textContent = 'Checking GitHub API...';
    const cleanRepo = repoPath.replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
    const targetRepo = cleanRepo || 'fmhy/bookmarks';

    previewTargetRepo.textContent = targetRepo;

    const apiUrl = `https://api.github.com/repos/${targetRepo}/commits?sha=main&per_page=1`;
    const headers = { 'Cache-Control': 'no-cache' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const res = await fetch(apiUrl, { headers });
    if (res.ok) {
      const data = await res.json();
      if (data && data[0]) {
        const sha = data[0].sha.substring(0, 7);
        const dateIso = data[0].commit?.committer?.date;
        const timeAgo = formatTimeAgo(dateIso);
        previewCommitSha.textContent = `${sha} (${timeAgo})`;
        return;
      }
    } else if (res.status === 404) {
      previewCommitSha.textContent = token ? 'Not Found / Verify Scope' : 'Private Repo / Token Needed';
      return;
    } else if (res.status === 401) {
      previewCommitSha.textContent = 'Invalid / Expired Token';
      return;
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
    const token = githubTokenInput ? githubTokenInput.value.trim() : '';
    fetchLatestCommitInfo(repo, token);
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

  const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
  const cardLocationMenu = document.getElementById('card-location-menu');
  const badgeLocationMenu = document.getElementById('badge-location-menu');
  const descLocationMenu = document.getElementById('desc-location-menu');

  if (!isFirefox) {
    // Disable Option 3 (Bookmarks Menu) on Chrome/Chromium
    const menuRadio = Array.from(syncLocationRadios).find(r => r.value === 'menu');
    if (menuRadio) {
      menuRadio.disabled = true;
    }
    if (cardLocationMenu) {
      cardLocationMenu.classList.add('disabled');
    }
    if (badgeLocationMenu) {
      badgeLocationMenu.className = 'badge badge-warning';
      badgeLocationMenu.textContent = '⚠️ Firefox Only (Not Supported on Chrome)';
    }
    if (descLocationMenu) {
      descLocationMenu.textContent = 'Bookmarks Menu container is exclusive to Firefox. Please select Bookmarks Bar or Other Bookmarks on Chrome.';
    }

    if (settings.syncLocation === 'menu') {
      settings.syncLocation = 'toolbar';
      await api.storage.sync.set({ syncLocation: 'toolbar' });
    }
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
  if (githubTokenInput) {
    githubTokenInput.value = settings.githubToken || '';
  }
  notifySyncCheckbox.checked = !!settings.notifyOnSync;

  updateDynamicPanels();
}

let toastTimeout = null;

/**
 * Show temporary toast message
 */
function showToast(msg, autoHide = true) {
  if (toastTimeout) {
    clearTimeout(toastTimeout);
    toastTimeout = null;
  }
  toast.textContent = msg;
  toast.classList.remove('hidden');
  if (autoHide) {
    toastTimeout = setTimeout(() => {
      toast.classList.add('hidden');
    }, 4000);
  }
}

/**
 * Resolves human-readable label for target destination
 */
function getDestinationLabel(syncLocation) {
  if (syncLocation === 'other') {
    const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
    return isFirefox ? 'Other Bookmarks' : 'Other Bookmarks / All Bookmarks';
  } else if (syncLocation === 'menu') {
    return 'Bookmarks Menu';
  }
  return 'Bookmarks Bar';
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

  const destLabel = getDestinationLabel(selectedSyncLocation);

  // Disable UI buttons and display loading status
  btnSave.disabled = true;
  btnReset.disabled = true;
  const originalSaveText = btnSave.textContent;
  btnSave.textContent = 'Moving folder...';
  showToast(`Moving FMHY folder to ${destLabel}...`, false);

  try {
    const newSettings = {
      preset: selectedPreset,
      syncLocation: selectedSyncLocation,
      strategy: selectedStrategy,
      forkRepo: forkRepoInput.value.trim(),
      customFilePath: customFilePathInput.value.trim(),
      githubToken: githubTokenInput ? githubTokenInput.value.trim() : '',
      notifyOnSync: notifySyncCheckbox.checked
    };

    await api.storage.sync.set(newSettings);

    // Reset local cache & trigger immediate sync for target location updates
    await api.runtime.sendMessage({ action: 'CLEAR_CACHE' });
    await api.runtime.sendMessage({ action: 'UPDATE_SCHEDULE' });

    // Await background sync completion until move finishes
    const syncRes = await api.runtime.sendMessage({ action: 'TRIGGER_SYNC' });

    if (syncRes && syncRes.success) {
      showToast(`Settings saved & FMHY folder moved to ${destLabel}!`);
    } else if (syncRes && syncRes.error) {
      showToast(`Notice: ${syncRes.error}`);
    } else {
      showToast(`Preferences saved & FMHY folder moved to ${destLabel}!`);
    }
  } catch (err) {
    showToast(`Error: ${err.message || 'Failed to update preferences.'}`);
  } finally {
    btnSave.disabled = false;
    btnReset.disabled = false;
    btnSave.textContent = originalSaveText;
    updateDynamicPanels();
  }
}

/**
 * Reset settings to default values
 */
async function resetSettings() {
  btnSave.disabled = true;
  btnReset.disabled = true;
  const originalResetText = btnReset.textContent;
  btnReset.textContent = 'Resetting...';
  showToast('Resetting settings & moving FMHY folder to Bookmarks Bar...', false);

  try {
    await api.storage.sync.set(DEFAULT_SETTINGS);
    await api.runtime.sendMessage({ action: 'CLEAR_CACHE' });
    await api.runtime.sendMessage({ action: 'UPDATE_SCHEDULE' });
    await api.runtime.sendMessage({ action: 'TRIGGER_SYNC' });
    await loadSettings();
    showToast('Settings reset & FMHY folder moved to Bookmarks Bar!');
  } catch (err) {
    showToast(`Error: ${err.message || 'Failed to reset settings.'}`);
  } finally {
    btnSave.disabled = false;
    btnReset.disabled = false;
    btnReset.textContent = originalResetText;
    updateDynamicPanels();
  }
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
if (customFilePathInput) {
  customFilePathInput.addEventListener('blur', updateDynamicPanels);
}
if (githubTokenInput) {
  githubTokenInput.addEventListener('blur', updateDynamicPanels);
}

if (btnToggleToken && githubTokenInput) {
  btnToggleToken.addEventListener('click', () => {
    const isPassword = (githubTokenInput.type === 'password');
    githubTokenInput.type = isPassword ? 'text' : 'password';
    if (iconTokenEye && iconTokenEyeOff) {
      iconTokenEye.classList.toggle('hidden', isPassword);
      iconTokenEyeOff.classList.toggle('hidden', !isPassword);
    }
  });
}

const cardLocationMenu = document.getElementById('card-location-menu');
if (cardLocationMenu) {
  cardLocationMenu.addEventListener('click', (e) => {
    const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
    if (!isFirefox) {
      e.preventDefault();
      showToast('⚠️ Bookmarks Menu is exclusive to Firefox. Please select Bookmarks Bar or Other Bookmarks on Chrome.');
    }
  });
}

btnSave.addEventListener('click', saveSettings);
btnReset.addEventListener('click', resetSettings);

document.addEventListener('DOMContentLoaded', loadSettings);
