# ml1.app URL Shortener — Browser Extension

Cross-browser (Chrome, Edge, Brave, Opera, Firefox, Safari) MV3 extension for
the self-hosted ml1.app URL shortener. A thin client over the existing Flask
API — no logic is duplicated; auth rides on the browser's Cloudflare Access
session cookie.

## Features

- **Toolbar popup** — pre-fills the current tab URL; shorten with optional
  custom code; auto-copies the result.
- **Context menu** — right-click any link or the page itself → "Shorten with
  ml1.app".
- **Keyboard shortcut** — Cmd/Ctrl+Shift+L shortens the current tab and copies.
- **Options page** — all your links with click counts, delete with confirm.

## One-time setup

The extension reuses your browser's Cloudflare Access session. If the API
returns 401, the popup shows a "Sign in" button — click it, log in at
s.ml1.app, and you're done (no tokens stored in the extension, ever).

## Install (local / personal use)

1. Run the build script:
   ```sh
   ./build.sh
   ```
2. **Chrome / Edge / Brave / Opera** — go to `chrome://extensions`, enable
   Developer mode, "Load unpacked", pick `dist/chrome/`.
3. **Firefox** — go to `about:debugging#/runtime/this-firefox`, "Load
   Temporary Add-on", pick `dist/firefox/manifest.json`.
4. **Safari (macOS)** — Xcode → File → New → Project → "Safari Web Extension
   → Convert Existing Extension" → select `dist/chrome/`. Run the generated
   app to enable the extension in Safari Settings → Extensions.

## Files

```
manifest.json        MV3 manifest (gecko id included for Firefox)
api.js               Shared API helper: CF Access redirect → auth detection
background.js        Service worker: context menu, shortcut, clipboard proxy
popup/               Toolbar popup: shorten current tab / arbitrary URL
options.html/js/css  My Links: stats table + delete
offscreen.html/js    Hidden clipboard proxy for Chromium service workers
build.sh             Builds dist/chrome + dist/firefox (+ zips)
```

## Notes

- `chrome.storage.session` keeps the last background-shortened URL so the
  popup can display it on next open.
- Clipboard in Chromium MV3 service workers works via an offscreen document
  (`offscreen` permission is Chrome-dist only; Firefox needs neither).
- Permissions are deliberately minimal: `activeTab`, `contextMenus`,
  `clipboardWrite`, `commands`, `storage` (+ `offscreen` on Chrome), and host
  access to `https://s.ml1.app/*` only.