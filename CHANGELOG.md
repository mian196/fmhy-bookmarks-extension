# Changelog

All notable changes to the **FMHY Bookmarks Auto-Sync** extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v1.4.0] - 2026-07-22

### Added
- 🚀 **GitHub ETag Rate-Limit Saver**: Sends `If-None-Match` HTTP headers on API checks to handle `304 Not Modified` responses. Saves user bandwidth and prevents hitting GitHub's 60 req/hr rate limit.
- 🕒 **Popup "Last Synced" Relative Timestamp**: Displays a live, formatted relative timestamp (e.g. *"Synced 2 mins ago"*, *"Just now"*) in the extension popup dashboard.
- 🖱️ **Right-Click Action Context Menu**: Added a `"Sync FMHY Bookmarks Now"` option when right-clicking the extension toolbar icon.
- ⚙️ **Automated CI/CD Validation Workflow**: Created `.github/workflows/validate_extension.yml` to lint manifests and verify multi-platform build scripts on pull requests and branch pushes.
- 📄 **Developer Guidelines Documentation**: Created `GEMINI.md` summarizing development guidelines, performance strategies, build architecture, and release procedures.
- 🤖 **AI Code Review & Release Drafter Automation**: Added `.coderabbit.yaml`, `.github/release-drafter.yml`, `.github/pull_request_template.md`, and `.github/workflows/draft_release.yml` for automated AI PR summaries, reviews, and categorized release drafting.
- ♊ **Google Gemini AI Release Notes Generator**: Added `.github/scripts/gemini_release_notes.py` and updated `.github/workflows/release_extension.yml` to automatically generate AI release notes using the free Google Gemini Flash API.

### Changed
- Standardized `contextMenus` permission across Chromium and Firefox builds.
- Refactored `service_worker.js` background listeners to manage context menu interactions and storage timestamp updates.
- Replaced remote GitHub raw icon URL in options page with bundled local `src/assets/icons/fmhy.png` asset.

### Fixed
- Updated Firefox `strict_min_version` to `142.0` in `platform/firefox/manifest.json` to resolve Mozilla AMO validator warning regarding `data_collection_permissions` support on Firefox for Android.
- Fixed Chrome desktop notification image loading error (`Unable to download all specified images`) in `service_worker.js` by correcting `iconUrl` path to `assets/icons/icon-48.png` and wrapping notification calls in Promise rejection handling.
- Fixed notification setting bypass where manual syncs or installation events triggered desktop notifications even when `notifyOnSync` was disabled in extension settings.

---

## [v1.3.0] - 2026-07-21

### Added
- 🦊 **Firefox AMO Compliance**: Added `data_collection_permissions` under `browser_specific_settings.gecko` in `platform/firefox/manifest.json` setting `"required": ["none"]` for Mozilla Add-on store validation.
- 🏗️ **Platform-Split Multi-Build Architecture**: Restructured the codebase into a clean `src/` directory with separate `platform/chromium/manifest.json` and `platform/firefox/manifest.json` configs.
- 🐍 **Cross-Platform Build Tool (`tools/build.py`)**: Automated Python packaging script generating isolated `.chromium.zip` and `.firefox.zip` archives.

### Performance
- ⚡ **20x Faster Firefox Sync**: Refactored `buildBookmarkSubtree` to use parallel batching (`Promise.all` in chunks of 25). Reduced Firefox bookmark sync duration from ~45 seconds down to **1–2 seconds**.

---

## [v1.2.0] - 2026-07-21

### Added
- 🌟 **Initial Open Source Release**: Automated browser extension keeping FreeMediaHeckYeah (FMHY) curated bookmarks synchronized on the browser's Bookmarks Bar.
- ⚡ **Index 0 Placement**: Automatically mounts the FMHY bookmarks directory at Index 0 on the Bookmarks Bar for instant 1-click access.
- ⚙️ **Dual Strategy Selector**: Choose between tracking official community releases (`fmhy/bookmarks`) or personal GitHub repository forks.
- 🎨 **Apple Minimalist UI**: Dark/Light mode popup HUD, real-time status telemetry, and custom vector icons.
- 📁 **Preset Selection**: Support for Full Directory (~3,000+ links) or Starred-Only collection.
- 🤖 **GitHub Release Workflow**: Created `.github/workflows/release_extension.yml` to auto-build and upload release packages on tag push.
