# GEMINI.md - Project Development Guidelines & Instructions

This document outlines the coding standards, workflow conventions, architectural principles, and release procedures for the **FMHY Bookmarks Auto-Sync** extension.

---

## 🌿 1. Branching Strategy & Git Workflow

* **Development Branch**: Always perform code changes, features, and bug fixes on the `dev` branch. Never commit directly to `main`.
* **Release Process**:
  1. Complete feature/bug fix on `dev`.
  2. Update `CHANGELOG.md` with release notes under the active version target.
  3. Rebuild extension ZIP packages using `python tools/build.py`.
  4. Merge `dev` into `main`.
  5. Create an annotated git tag (e.g., `git tag -a v1.4.0 -m "Release v1.4.0"`).
  6. Push tag to GitHub (`git push origin v1.4.0`) to trigger automated release workflows.

---

## 📝 2. Documentation & Changelog Maintenance

* **Strict Changelog Requirement**: Every feature addition, refactor, or bug fix **must** be documented in `CHANGELOG.md`.
* **Format**: Follow [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
* Sections should include: `### Added`, `### Changed`, `### Fixed`, and `### Performance` as applicable.

---

## ⚡ 3. Performance & API Optimization Strategies

### A. Firefox Bookmark Sync Performance (Batching Strategy)
* **Problem**: Firefox stores bookmarks in an underlying SQLite database (`places.sqlite`). Sequential bookmark insertions via `browser.bookmarks.create` can take 45+ seconds for ~3,000 links.
* **Solution**: Use parallel batching (`Promise.all` in chunks of 25 promises) in `src/lib/bookmark_sync.js`. This speeds up Firefox bookmark tree creation by ~20x (reducing sync duration to 1–2 seconds).

### B. GitHub ETag Rate-Limit Protection
* **Problem**: GitHub API limits unauthenticated requests to 60 per hour.
* **Solution**: Store `ETag` headers returned by GitHub API responses in `chrome.storage.local`. On subsequent checks, pass `If-None-Match: <etag>`. When GitHub returns `HTTP 304 Not Modified`, swallow the empty body without updating local storage or hitting rate limits.

---

## 📦 4. Multi-Platform Build Architecture

* **Directory Structure**:
  * `src/`: Shared cross-browser source files (popup, options, background scripts, assets, libs).
  * `platform/chromium/manifest.json`: Chromium Manifest V3 (Chrome, Edge, Brave, Opera).
  * `platform/firefox/manifest.json`: Firefox Manifest V3 (Gecko engine).
  * `tools/build.py`: Automated Python build script that copies `src/` and platform-specific manifests into `dist/build/` and packages `.chromium.zip` and `.firefox.zip`.
* **No Hardcoded Versioning**: CI/CD workflows and build tools must dynamically parse the version string from `manifest.json`.

---

## 🦊 5. Firefox AMO Store Validation & Compliance

* **Data Collection Declaration**: Include `data_collection_permissions` under `browser_specific_settings.gecko` set to `{"required": ["none"]}` in `platform/firefox/manifest.json`.
* **Android Compatibility**: Set `"strict_min_version": "142.0"` in `platform/firefox/manifest.json` to ensure full compatibility with Firefox for Android without triggering validator warnings.

---

## 🖼️ 6. Asset & Resource Locality

* **Bundled Local Assets**: All icons, logos, and UI images must be bundled locally inside `src/assets/`.
* **No Remote Image Fetching**: Do not reference external image URLs (e.g. `raw.githubusercontent.com`) inside extension HTML/CSS/JS files.
