<div align="center">

<img src="src/assets/logo.svg" width="100" height="100" alt="FMHY Bookmarks Auto-Sync Logo">

# FMHY Bookmarks Auto-Sync

**Automated browser extension (Manifest V3) that keeps 25,000+ FreeMediaHeckYeah (FMHY) curated digital media bookmarks synchronized on your browser's Bookmarks Bar.**

[![GitHub Release](https://img.shields.io/github/v/release/mian196/fmhy-bookmarks-extension?color=10b981&logo=github)](https://github.com/mian196/fmhy-bookmarks-extension/releases)
[![CI Build Validation](https://img.shields.io/github/actions/workflow/status/mian196/fmhy-bookmarks-extension/validate_extension.yml?branch=main&label=CI%20Validation&logo=githubactions&logoColor=white)](https://github.com/mian196/fmhy-bookmarks-extension/actions)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-6366f1.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License: MIT](https://img.shields.io/badge/License-MIT-0066cc.svg)](LICENSE)
[![Vanilla JS](https://img.shields.io/badge/Stack-Vanilla%20JS-f59e0b.svg)](#features)

</div>

---

## 🌟 Overview

**FMHY Bookmarks Auto-Sync** is a lightweight, zero-dependency browser extension built for Chrome, Edge, Brave, and Firefox. It monitors the official [`fmhy/bookmarks`](https://github.com/fmhy/bookmarks) repository (or your personal GitHub fork) and automatically updates your browser's Bookmarks Bar whenever a new release commit lands on GitHub.

- **Never miss updated links**: Keeps your local browser bookmarks in lockstep with weekly FMHY releases.
- **Top of the Bookmarks Bar**: Automatically places the `FMHY` bookmarks folder at **Index 0** on your Bookmarks Bar for instant 1-click access.
- **Zero bloat**: 100% Vanilla JavaScript without npm overhead or heavy dependencies.
- **High Performance**: Optimized with parallel batching for 1-second sync speeds on Firefox and Chromium.

---

## ✨ Features

- ⚡ **Automated GitHub Commit Tracking**: Automatically monitors GitHub for new commits on browser startup and via 6-hour periodic alarms, updating bookmarks when upstream changes occur.
- 🔄 **Manual "Sync Now" Trigger**: Clicking **Sync Now** in the extension dashboard manually triggers an instant download and fresh bookmark tree synchronization on demand.
- 🎨 **Apple Minimalist UI**: Clean Light & Dark Mode theme switcher, real-time commit telemetry, and custom vector icons.
- ⚙️ **2-Strategy Target Selector**:
  - **Official FMHY Repository** (`fmhy/bookmarks`) — Track official community releases.
  - **Personal Fork Repository** — Track your custom personal GitHub fork and workflow runs.
- 📁 **Preset Selection**: Choose between the **Full Directory** (~3,000+ links) or **Starred-Only Collection** (top-rated community recommendations).
- 🔒 **Privacy-First**: No external tracking, no login requirements, and zero data collection.

---

## 🚀 Installation & Usage

<p align="center">
  <a href="https://addons.mozilla.org/en-US/firefox/addon/fmhy-bookmarks-auto-sync/"><img src="https://raw.githubusercontent.com/fmhy/FMHY-SafeGuard/main/assets/firefox_addon_image.png" alt="Get FMHY Bookmarks Auto-Sync for Firefox"></a>
</p>

---

### 🌐 Chromium & Forks (Chrome, Edge, Brave, Opera)

1. Download the latest `fmhy-bookmarks-extension-*.chromium.zip` package from [Releases](https://github.com/mian196/fmhy-bookmarks-extension/releases).
2. Extract the downloaded ZIP folder.
3. Open `chrome://extensions/` (or `edge://extensions/` / `brave://extensions/`).
4. Enable **Developer mode** (top-right toggle).
5. Click **Load unpacked** and select the extracted folder.

---

### 🛠️ Development / Build from Source
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/mian196/fmhy-bookmarks-extension.git
   cd fmhy-bookmarks-extension
   ```

2. **Build Packages**:
   ```bash
   python tools/build.py
   ```
   Built packages will be generated inside the `dist/` directory.

---

## 🤝 Contributing

Contributions are welcome! Please check out our [Contributing Guide](CONTRIBUTING.md) for instructions on local development, browser testing, and submitting pull requests.

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for more information.
