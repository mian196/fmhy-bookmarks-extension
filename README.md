<div align="center">

<img src="./src/assets/logo.svg" width="100" height="100" alt="FMHY Bookmarks Auto-Sync Logo">

# FMHY Bookmarks Auto-Sync

**Automated browser extension (Manifest V3) that keeps 3,000+ FreeMediaHeckYeah (FMHY) curated digital media bookmarks synchronized on your browser's Bookmarks Bar.**

[![Manifest V3](https://img.shields.io/badge/Manifest-V3-6366f1.svg)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![License: MIT](https://img.shields.io/badge/License-MIT-0066cc.svg)](LICENSE)
[![Vanilla JS](https://img.shields.io/badge/Stack-Vanilla%20JS-f59e0b.svg)](#features)

</div>

---

## 🌟 Overview

**FMHY Bookmarks Auto-Sync** is a lightweight, zero-dependency browser extension built for Chrome, Edge, Brave, and Firefox. It monitors the official [`fmhy/bookmarks`](https://github.com/fmhy/bookmarks) repository (or your personal GitHub fork) and automatically updates your browser's Bookmarks Bar whenever a new release commit lands on GitHub.

- **Never miss updated links**: Keeps your local browser bookmarks in lockstep with weekly FMHY releases.
- **Top of the Bookmarks Bar**: Automatically places the `FMHY` bookmarks folder at **Index 0** on your Bookmarks Bar for instant 1-click access.
- **Zero bloat**: 100% Vanilla JavaScript without npm overhead or build steps.

---

## ✨ Features

- ⚡ **Automated GitHub Commit Tracking**: Checks GitHub API on browser startup (`chrome.runtime.onStartup`) and via periodic 6-hour alarms.
- 🎨 **Apple Minimalist UI**: Clean Light & Dark Mode theme switcher, real-time commit telemetry, and custom vector icons.
- ⚙️ **2-Strategy Target Selector**:
  - **Official FMHY Repository** (`fmhy/bookmarks`) — Track official community releases.
  - **Personal Fork Repository** — Track your custom personal GitHub fork and workflow runs.
- 📁 **Preset Selection**: Choose between the **Full Directory** (~3,000+ links) or **Starred-Only Collection** (top-rated community recommendations).
- 🔒 **Privacy-First**: No external tracking, no login requirements, and minimal permissions.

---

## 🛠️ Project Structure

```
fmhy-bookmarks-extension/
├── manifest.json                # Cross-browser Manifest V3 config
├── background/
│   └── service_worker.js        # Background worker (alarms & startup commit tracking)
├── lib/
│   ├── bookmark_sync.js         # Bookmarks Bar sync engine (Index 0 placement)
│   ├── html_parser.js           # Safe DOM-free Netscape HTML bookmark parser
│   └── webextension-polyfill.js # Browser API normalization wrapper
├── popup/
│   ├── popup.html               # Mini popup HUD interface
│   ├── popup.css                # Apple Design System styling & dark/light theme
│   └── popup.js                 # Popup state controller & theme persistence
├── options/
│   ├── options.html             # Extension settings dashboard
│   ├── options.css              # Options page styles
│   └── options.js               # Settings persistence & GitHub commit validation
├── assets/
│   ├── logo.svg                 # Vector SVG app icon
│   └── icons/                   # High-res extension icons (16x16, 48x48, 128x128)
└── LICENSE                      # MIT License
```

---

## 🚀 Installation & Usage

1. **Clone or Download Repository**:
   ```bash
   git clone https://github.com/mian196/fmhy-bookmarks-extension.git
   ```

2. **Load Unpacked in Browser**:
   - **Chrome / Edge / Brave**:
     1. Open `chrome://extensions/` or `edge://extensions/`.
     2. Enable **Developer mode** (top-right toggle).
     3. Click **Load unpacked** and select the `fmhy-bookmarks-extension` directory.
   - **Firefox**:
     1. Open `about:debugging#/runtime/this-firefox`.
     2. Click **Load Temporary Add-on...** and select `manifest.json`.

3. **Sync & Customize**:
   - Click the extension icon in your browser toolbar to open the popup dashboard.
   - Click **Sync Now** to pull the latest bookmarks immediately, or click the settings gear icon to configure custom repositories.

---

## 📄 License

Distributed under the MIT License. See [`LICENSE`](LICENSE) for more information.
