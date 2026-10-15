/**
 * Options & Preferences Controller
 * Handles 2-Strategy Target Selector (Official vs Custom Fork),
 * automatic GitHub commit SHA tracking, theme syncing, and settings persistence.
 */



const presetRadios = document.getElementsByName('preset');
const syncLocationRadios = document.getElementsByName('syncLocation');
const strategyRadios = document.getElementsByName('strategy');
const themeRadios = document.getElementsByName('theme');

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

const categoriesSummaryBadge = document.getElementById('categories-summary-badge');
const toggleAllCategories = document.getElementById('toggle-all-categories');
const btnSelectAllCats = document.getElementById('btn-select-all-cats');
const btnDeselectAllCats = document.getElementById('btn-deselect-all-cats');
const categorySearchInput = document.getElementById('category-search-input');
const categoryGrid = document.getElementById('category-grid');

const FMHY_CATEGORY_META = {
  'video': { label: 'Video', desc: 'Streaming, Movies, TV, Anime, Sports' },
  'ai': { label: 'Artificial Intelligence', desc: 'LLMs, AI Tools, Models, Prompts' },
  'mobile': { label: 'Mobile', desc: 'Android, iOS, Apps, APKs' },
  'audio': { label: 'Audio', desc: 'Music Streaming, Podcasts, Radio, Production' },
  'downloading': { label: 'Downloading', desc: 'Debrid, Direct Download, Web Downloaders' },
  'educational': { label: 'Educational', desc: 'Courses, Textbooks, Science, Tutorials' },
  'gaming': { label: 'Gaming', desc: 'PC, Emulation, ROMs, Repacks' },
  'privacy': { label: 'Privacy & Security', desc: 'Anti-Censorship, VPNs, Adblocking, DNS' },
  'system-tools': { label: 'System Tools', desc: 'Windows, Tweaks, Activators, Optimization' },
  'file-tools': { label: 'File Tools', desc: 'File Sharing, Compression, Converters' },
  'internet-tools': { label: 'Internet Tools', desc: 'Browsers, Extensions, Search Engines' },
  'social-media-tools': { label: 'Social Media Tools', desc: 'Discord, Reddit, YouTube, Automation' },
  'text-tools': { label: 'Text Tools', desc: 'Writers, OCR, Translators, Office Suites' },
  'video-tools': { label: 'Video Tools', desc: 'Video Editors, Transcoders, Screen Recorders' },
  'misc': { label: 'Miscellaneous', desc: 'Useful Web Apps, Fun Sites, Utilities' },
  'reading': { label: 'Reading', desc: 'Books, Manga, Comics, Magazines, News' },
  'torrenting': { label: 'Torrenting', desc: 'Trackers, Clients, Port Forwarding' },
  'image-tools': { label: 'Image Tools', desc: 'Editors, Upscalers, Photo Enhancers' },
  'gaming-tools': { label: 'Gaming Tools', desc: 'Modding, Game Fixes, Trackers' },
  'linux-macos': { label: 'Linux & macOS', desc: 'Distros, FOSS Apps, Mac Software' },
  'developer-tools': { label: 'Developer Tools', desc: 'Hosting, Git, APIs, Code Editors' },
  'non-english': { label: 'Non-English', desc: 'International & Regional Resources' },
  'storage': { label: 'Storage', desc: 'Cloud Storage, Free Web Drives' }
};

const DEFAULT_CATEGORY_KEYS = Object.keys(FMHY_CATEGORY_META);

const DEFAULT_SETTINGS = {
  preset: 'full',
  syncLocation: 'toolbar', // 'toolbar' | 'other' | 'menu'
  strategy: 'official', // 'official' | 'custom_fork'
  forkRepo: '',
  customFilePath: '',
  githubToken: '',
  notifyOnSync: false,
  theme: 'system', // 'system' | 'light' | 'dark'
  selectedCategories: [] // [] = All categories
};

let currentThemeSetting = 'system';

/**
 * Format category label with human-friendly title
 */
function formatCategoryLabel(rawKey) {
  const meta = FMHY_CATEGORY_META[String(rawKey).toLowerCase()];
  if (meta && meta.label) {
    return meta.label;
  }
  return String(rawKey)
    .replace(/^►\s*|\s*◄$/g, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Format category description
 */
function formatCategoryDesc(rawKey) {
  const meta = FMHY_CATEGORY_META[String(rawKey).toLowerCase()];
  if (meta && meta.desc) {
    return meta.desc;
  }
  return 'Curated links and bookmark resources';
}

/**
 * Compares two category title arrays for set equality
 */
function areCategoryListsEqual(a, b) {
  const arrA = Array.isArray(a) ? a : [];
  const arrB = Array.isArray(b) ? b : [];
  if (arrA.length !== arrB.length) return false;
  const setA = new Set(arrA.map((x) => String(x).toLowerCase().trim()));
  for (const item of arrB) {
    if (!setA.has(String(item).toLowerCase().trim())) return false;
  }
  return true;
}

/**
 * Renders category checkboxes dynamically into the grid
 */
function renderCategoryGrid(availableCategories, selectedCategories) {
  if (!categoryGrid) return;
  categoryGrid.innerHTML = '';

  let items = [];
  if (Array.isArray(availableCategories) && availableCategories.length > 0) {
    items = availableCategories;
  } else {
    items = DEFAULT_CATEGORY_KEYS.map((key) => ({
      title: key,
      count: 0
    }));
  }

  const isAllSelected = !Array.isArray(selectedCategories) || selectedCategories.length === 0;
  const selectedSet = new Set(
    (selectedCategories || []).map((c) => String(c).toLowerCase().trim())
  );

  items.forEach((cat) => {
    const rawTitle = typeof cat === 'string' ? cat : cat.title;
    const count = typeof cat === 'object' && cat.count ? cat.count : 0;
    const titleKey = String(rawTitle).toLowerCase().trim();
    const isChecked = isAllSelected || selectedSet.has(titleKey);

    const labelEl = document.createElement('label');
    labelEl.className = `category-item${isChecked ? ' selected' : ''}`;
    labelEl.dataset.title = titleKey;

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'category-checkbox';
    checkbox.value = rawTitle;
    checkbox.checked = isChecked;

    checkbox.addEventListener('change', () => {
      labelEl.classList.toggle('selected', checkbox.checked);
      updateCategorySelectionState();
    });

    const infoEl = document.createElement('div');
    infoEl.className = 'category-info';

    const titleRow = document.createElement('div');
    titleRow.className = 'category-title-row';

    const titleSpan = document.createElement('span');
    titleSpan.className = 'category-title';
    titleSpan.textContent = formatCategoryLabel(rawTitle);

    titleRow.appendChild(titleSpan);

    if (count > 0) {
      const countSpan = document.createElement('span');
      countSpan.className = 'category-count';
      countSpan.textContent = `~${count.toLocaleString()}`;
      titleRow.appendChild(countSpan);
    }

    const descSpan = document.createElement('span');
    descSpan.className = 'category-desc';
    descSpan.textContent = formatCategoryDesc(rawTitle);

    infoEl.appendChild(titleRow);
    infoEl.appendChild(descSpan);

    labelEl.appendChild(checkbox);
    labelEl.appendChild(infoEl);

    categoryGrid.appendChild(labelEl);
  });

  updateCategorySelectionState();
}

/**
 * Updates selection summary badge and master checkbox state
 */
function updateCategorySelectionState() {
  if (!categoryGrid || !toggleAllCategories || !categoriesSummaryBadge) return;
  const checkboxes = Array.from(categoryGrid.querySelectorAll('.category-checkbox'));
  const total = checkboxes.length;
  const checked = checkboxes.filter((cb) => cb.checked).length;

  toggleAllCategories.checked = (total > 0 && checked === total);
  toggleAllCategories.indeterminate = (checked > 0 && checked < total);

  if (checked === total) {
    categoriesSummaryBadge.className = 'badge badge-cyan';
    categoriesSummaryBadge.textContent = `All ${total} Categories`;
  } else if (checked === 0) {
    categoriesSummaryBadge.className = 'badge badge-warning';
    categoriesSummaryBadge.textContent = 'None Selected (Required)';
  } else {
    categoriesSummaryBadge.className = 'badge badge-purple';
    categoriesSummaryBadge.textContent = `${checked} / ${total} Selected`;
  }
}

/**
 * Check or uncheck all category checkboxes in the grid
 */
function setAllCategoryCheckboxes(checked) {
  if (!categoryGrid) return;
  const checkboxes = categoryGrid.querySelectorAll('.category-checkbox');
  checkboxes.forEach((cb) => {
    cb.checked = checked;
    const parentLabel = cb.closest('.category-item');
    if (parentLabel) {
      parentLabel.classList.toggle('selected', checked);
    }
  });
  updateCategorySelectionState();
}

/**
 * Filter visible categories based on search input
 */
function filterCategoriesInGrid(query) {
  if (!categoryGrid) return;
  const cleanQuery = (query || '').toLowerCase().trim();
  const items = categoryGrid.querySelectorAll('.category-item');
  items.forEach((item) => {
    const titleKey = item.dataset.title || '';
    const labelText = item.querySelector('.category-title')?.textContent?.toLowerCase() || '';
    const descText = item.querySelector('.category-desc')?.textContent?.toLowerCase() || '';

    const matches = !cleanQuery ||
      titleKey.includes(cleanQuery) ||
      labelText.includes(cleanQuery) ||
      descText.includes(cleanQuery);

    item.classList.toggle('hidden', !matches);
  });
}

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
}

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
    const cleanRepo = repoPath
      .replace(/^https?:\/\/github\.com\//, '')
      .replace(/\.git$/, '')
      .replace(/\/$/, '')
      .trim();
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

  const selectedTheme = settings.theme || 'system';
  applyTheme(selectedTheme);

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

  for (const radio of themeRadios) {
    radio.checked = (radio.value === selectedTheme);
  }

  forkRepoInput.value = settings.forkRepo || '';
  customFilePathInput.value = settings.customFilePath || '';
  if (githubTokenInput) {
    githubTokenInput.value = settings.githubToken || '';
  }
  notifySyncCheckbox.checked = !!settings.notifyOnSync;

  const localData = await api.storage.local.get(['availableCategories', 'lastBookmarkCount']);
  renderCategoryGrid(localData.availableCategories, settings.selectedCategories);

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
  const selectedTheme = Array.from(themeRadios).find(r => r.checked)?.value || 'system';

  const cleanForkRepo = forkRepoInput.value
    .replace(/^https?:\/\/github\.com\//, '')
    .replace(/\.git$/, '')
    .replace(/\/$/, '')
    .trim();
  const cleanCustomFilePath = customFilePathInput.value.trim().replace(/^\/+/, '');
  const cleanGithubToken = githubTokenInput ? githubTokenInput.value.trim() : '';

  if (selectedStrategy === 'custom_fork' && !cleanForkRepo) {
    showToast('Error: Please enter a valid GitHub repository (owner/repo).');
    return;
  }

  const destLabel = getDestinationLabel(selectedSyncLocation);

  // Disable UI buttons and display loading status
  btnSave.disabled = true;
  btnReset.disabled = true;
  const originalSaveText = btnSave.textContent;

  // Gather checked categories from the grid
  const checkedBoxes = Array.from(categoryGrid ? categoryGrid.querySelectorAll('.category-checkbox:checked') : []);
  const totalBoxes = categoryGrid ? categoryGrid.querySelectorAll('.category-checkbox').length : 0;

  if (totalBoxes > 0 && checkedBoxes.length === 0) {
    showToast('⚠️ Please select at least one category to sync.');
    btnSave.disabled = false;
    btnReset.disabled = false;
    btnSave.textContent = originalSaveText;
    return;
  }

  // If all are checked, save empty array [] to denote 'All'
  const selectedCategoriesToSave = (totalBoxes === 0 || checkedBoxes.length === totalBoxes)
    ? []
    : checkedBoxes.map((cb) => cb.value);

  try {
    const currentSettings = await api.storage.sync.get(DEFAULT_SETTINGS);

    const categoriesChanged = !areCategoryListsEqual(currentSettings.selectedCategories, selectedCategoriesToSave);

    const sourceOrPresetChanged =
      currentSettings.preset !== selectedPreset ||
      currentSettings.strategy !== selectedStrategy ||
      currentSettings.forkRepo !== cleanForkRepo ||
      currentSettings.customFilePath !== cleanCustomFilePath ||
      currentSettings.githubToken !== cleanGithubToken ||
      categoriesChanged;
    const locationChanged = currentSettings.syncLocation !== selectedSyncLocation;

    const newSettings = {
      preset: selectedPreset,
      syncLocation: selectedSyncLocation,
      strategy: selectedStrategy,
      forkRepo: cleanForkRepo,
      customFilePath: cleanCustomFilePath,
      githubToken: cleanGithubToken,
      notifyOnSync: notifySyncCheckbox.checked,
      theme: selectedTheme,
      selectedCategories: selectedCategoriesToSave
    };

    await api.storage.sync.set(newSettings);
    await api.runtime.sendMessage({ action: 'UPDATE_SCHEDULE' });

    if (sourceOrPresetChanged) {
      btnSave.textContent = 'Syncing...';
      showToast('Preferences saved. Fetching updated bookmarks...', false);
      await api.runtime.sendMessage({ action: 'CLEAR_CACHE' });
      const syncRes = await api.runtime.sendMessage({ action: 'TRIGGER_SYNC' });

      if (syncRes && syncRes.success) {
        showToast('Settings saved & bookmarks synchronized!');
      } else if (syncRes && syncRes.error) {
        showToast(`Notice: ${syncRes.error}`);
      } else {
        showToast('Preferences saved successfully!');
      }
    } else if (locationChanged) {
      btnSave.textContent = 'Moving folder...';
      showToast(`Moving FMHY folder to ${destLabel}...`, false);
      const syncRes = await api.runtime.sendMessage({ action: 'TRIGGER_SYNC' });

      if (syncRes && syncRes.success) {
        showToast(`Settings saved & FMHY folder moved to ${destLabel}!`);
      } else if (syncRes && syncRes.error) {
        showToast(`Notice: ${syncRes.error}`);
      } else {
        showToast(`Preferences saved & FMHY folder moved to ${destLabel}!`);
      }
    } else {
      showToast('Settings saved successfully!');
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
for (const radio of themeRadios) {
  radio.addEventListener('change', (e) => {
    if (e.target.checked) {
      applyTheme(e.target.value);
    }
  });
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
      const newTheme = changes.theme.newValue || 'system';
      applyTheme(newTheme);
      for (const radio of themeRadios) {
        radio.checked = (radio.value === newTheme);
      }
    }
  });
}

if (toggleAllCategories) {
  toggleAllCategories.addEventListener('change', (e) => {
    setAllCategoryCheckboxes(e.target.checked);
  });
}

if (btnSelectAllCats) {
  btnSelectAllCats.addEventListener('click', () => {
    setAllCategoryCheckboxes(true);
  });
}

if (btnDeselectAllCats) {
  btnDeselectAllCats.addEventListener('click', () => {
    setAllCategoryCheckboxes(false);
  });
}

if (categorySearchInput) {
  categorySearchInput.addEventListener('input', (e) => {
    filterCategoriesInGrid(e.target.value);
  });
}

btnSave.addEventListener('click', saveSettings);
btnReset.addEventListener('click', resetSettings);

document.addEventListener('DOMContentLoaded', loadSettings);
