# Contributing to FMHY Bookmarks Auto-Sync 🤝

Thank you for your interest in contributing to **FMHY Bookmarks Auto-Sync**! We welcome bug fixes, UI improvements, documentation updates, and feature suggestions.

---

## 🎯 Scope of Contributions & Policy

Before proposing a feature or opening an issue/PR, please understand the scope and purpose of this extension:

- **Primary Goal**: Automatically fetch and synchronize the latest official Netscape bookmark HTML file from [`fmhy/bookmarks`](https://github.com/fmhy/bookmarks) directly into the browser.
- **Strictly Zero-Modification**: The extension imports bookmarks **exactly as-is**. It does **not** modify, alphabetize, re-sort, filter, or restructure bookmark entries or folders.
- **In-Scope Contributions**: Features, fixes, and improvements strictly tied to the extension's **operational workflow** (e.g. background alarms, sync diffing performance, mount location management, storage/ETag caching, UI/UX dashboard, and browser API compatibility).
- **Out-of-Scope Requests**: Requests to sort (e.g. alphabetical organization), rename categories, delete dead links, or re-structure the bookmark tree. Bookmark content management belongs upstream at [`fmhy/bookmarks`](https://github.com/fmhy/bookmarks). Users who prefer customized structures can maintain a personal fork (public or private with a GitHub token) and track it using the extension's **Personal Fork** strategy.

---

## 🌿 Development Workflow

### 1. Prerequisites
- **Git** (for version control)
- **Python 3.x** (for running automated build and packaging scripts)
- A modern Chromium-based desktop browser (Chrome, Edge, Brave) or Firefox Desktop.
  > **Note**: Mobile browsers are not supported as the WebExtensions `bookmarks` API is exclusive to desktop browsers.

### 2. Local Setup
1. Fork the repository on GitHub.
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/fmhy-bookmarks-extension.git
   cd fmhy-bookmarks-extension
   ```

---

## 🧪 Testing the Extension Locally

### Chromium (Chrome, Edge, Brave, Opera)
1. Open your browser and navigate to `chrome://extensions`.
2. Enable **Developer mode** (toggle in the top-right corner).
3. Click **Load unpacked**.
4. Select the directory: `platform/chromium/` inside your cloned project.
5. Click **Sync Now** in the extension popup dashboard to verify functionality.

### Firefox (Desktop)
1. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on...**.
3. Select the file: `platform/firefox/manifest.json`.
4. Test bookmark creation and background synchronization.

---

## 📦 Building Extension Release Packages

Before submitting a Pull Request, verify that multi-platform build scripts execute cleanly:

```bash
python tools/build.py
```

This will copy shared source files from `src/` and platform-specific manifests from `platform/` into the `dist/` directory, outputting `.chromium.zip` and `.firefox.zip` archives.

---

## 📝 Commit & PR Guidelines

- Write clean, descriptive commit messages following Conventional Commits (e.g. `feat: add ...`, `fix: resolve ...`, `docs: update ...`).
- Ensure code adheres to pure Vanilla JavaScript without external npm build overhead.
- Follow existing code formatting and keep DOM manipulation safe (`textContent` instead of `innerHTML`).
- Create pull requests directly against the `main` branch.

Thank you for making FMHY Bookmarks Auto-Sync even better! 🚀
