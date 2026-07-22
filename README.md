<div align="center">

<img src="src/assets/logo.svg" width="100" height="100" alt="FMHY Bookmarks Auto-Sync Logo">

# FMHY Bookmarks Auto-Sync

**Automated browser extension (Manifest V3) that keeps 25,000+ FreeMediaHeckYeah (FMHY) curated digital media bookmarks synchronized on your browser's Bookmarks Bar.**

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

- ⚡ **Automated GitHub Commit Tracking**: Checks GitHub API on browser startup (`chrome.runtime.onStartup`) and via periodic 6-hour alarms.
- 🎨 **Apple Minimalist UI**: Clean Light & Dark Mode theme switcher, real-time commit telemetry, and custom vector icons.
- ⚙️ **2-Strategy Target Selector**:
  - **Official FMHY Repository** (`fmhy/bookmarks`) — Track official community releases.
  - **Personal Fork Repository** — Track your custom personal GitHub fork and workflow runs.
- 📁 **Preset Selection**: Choose between the **Full Directory** (~3,000+ links) or **Starred-Only Collection** (top-rated community recommendations).
- 🔒 **Privacy-First**: No external tracking, no login requirements, and zero data collection.

---

## 🚀 Installation & Usage

### Method 1: Install Pre-Built Packages (Recommended)
1. Download the latest release package for your browser from [Releases](https://github.com/mian196/fmhy-bookmarks-extension/releases):
   - **Chrome / Edge / Brave / Opera**: Download `fmhy-bookmarks-extension-v1.3.0.chromium.zip`
   - **Firefox**: Download `fmhy-bookmarks-extension-v1.3.0.firefox.zip`
2. Extract the downloaded ZIP folder.
3. Load in your browser:
   - **Chrome / Edge / Brave**:
     1. Open `chrome://extensions/` or `edge://extensions/`.
     2. Enable **Developer mode** (top-right toggle).
     3. Click **Load unpacked** and select the extracted folder.
   - **Firefox**:
     1. Open `about:debugging#/runtime/this-firefox`.
     2. Click **Load Temporary Add-on...** and select `manifest.json` from the extracted folder.

---

### Method 2: Development / Build from Source
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

## 📄 License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for more information.
