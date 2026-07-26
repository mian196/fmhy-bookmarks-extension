# Contributing to FMHY Bookmarks Auto-Sync 🤝

Thank you for your interest in contributing to **FMHY Bookmarks Auto-Sync**! We welcome bug fixes, UI improvements, documentation updates, and feature suggestions.

---

## 🌿 Development Workflow

### 1. Prerequisites
- **Git** (for version control)
- **Python 3.x** (for running automated build and packaging scripts)
- A modern Chromium-based browser (Chrome, Edge, Brave) or Firefox.

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

### Firefox
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
