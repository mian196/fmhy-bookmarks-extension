/**
 * Lightweight Cross-Browser WebExtension API Polyfill & Helpers
 * Normalizes chrome.* and browser.* APIs across Chromium & Firefox.
 */

export const api = (typeof globalThis.browser !== 'undefined' && globalThis.browser.runtime)
  ? globalThis.browser
  : globalThis.chrome;

/**
 * Promise wrapper for callback-based chrome.* APIs if needed
 */
export function promisify(fn, ...args) {
  return new Promise((resolve, reject) => {
    try {
      fn(...args, (result) => {
        const err = api.runtime.lastError;
        if (err) {
          reject(new Error(err.message));
        } else {
          resolve(result);
        }
      });
    } catch (e) {
      reject(e);
    }
  });
}

if (typeof self !== 'undefined') {
  self.api = api;
  self.promisify = promisify;
}
