// ml1.app URL Shortener — background service worker (MV3)
// Registers context menu + keyboard shortcut at top level (required for
// event-driven service worker wake-up — do NOT move inside onInstalled).

const API_BASE = "https://s.ml1.app";

// ── Context menu ───────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    // Right-click on a link anywhere
    chrome.contextMenus.create({
      id: "shorten-link",
      title: "Shorten this link with ml1.app",
      contexts: ["link"],
    });
    // Right-click on the page itself (shorten current tab URL)
    chrome.contextMenus.create({
      id: "shorten-page",
      title: "Shorten this page with ml1.app",
      contexts: ["page"],
    });
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let url = null;
  if (info.menuItemId === "shorten-link" && info.linkUrl) {
    url = info.linkUrl;
  } else if (info.menuItemId === "shorten-page" && tab && tab.url) {
    url = tab.url;
  }
  if (!url) return;
  await shortenAndCopy(url);
});

// ── Keyboard shortcut ──────────────────────────────────────────────────────

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "shorten-current-tab") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return;
  await shortenAndCopy(tab.url);
});

// ── Message from popup ─────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "shorten") {
    shorten(msg.url)
      .then((result) => {
        saveLastResult(result);
        sendResponse({ ok: true, result });
      })
      .catch((err) => sendResponse({ ok: false, error: err }));
    return true; // async sendResponse
  }
  if (msg && msg.type === "getLastResult") {
    chrome.storage.session
      .get("lastResult")
      .then((d) => sendResponse({ ok: true, result: d.lastResult || null }))
      .catch(() => sendResponse({ ok: true, result: null }));
    return true;
  }
});

// ── Core: shorten via API, copy result, badge feedback ─────────────────────

async function shortenAndCopy(url) {
  try {
    const result = await shorten(url);
    await saveLastResult(result);
    const copied = await copyToClipboard(result.short_url);
    badge("OK", "copied: " + result.short_url);
    if (!copied) {
      // Clipboard unavailable from SW — popup shows the result on next click.
      badge("OK", "clipboard blocked — click the toolbar icon to copy");
    }
  } catch (err) {
    if (err && err.authRequired) {
      badge("ERR", "auth required");
      // CF Access session expired — open admin for re-login
      await chrome.tabs.create({ url: `${API_BASE}/` });
    } else {
      badge("ERR", (err && err.message) || "failed");
    }
  }
}

async function shorten(url) {
  // Include the user's namespace prefix when the preference is enabled
  // (options page → chrome.storage.sync.prefixEnabled, issue #1).
  let prefixEnabled = false;
  try {
    const stored = await chrome.storage.sync.get("prefixEnabled");
    prefixEnabled = !!stored.prefixEnabled;
  } catch (_) { /* storage unavailable — default off */ }

  const resp = await fetch(`${API_BASE}/api/shorten`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(prefixEnabled ? { url, prefix: true } : { url }),
  });

  if (resp.status === 401) {
    throw { authRequired: true, message: "Cloudflare Access login required" };
  }
  if (!resp.ok) {
    let msg = `API error ${resp.status}`;
    try {
      const body = await resp.json();
      if (body.error) msg = body.error;
    } catch (_) { /* non-JSON error body */ }
    throw new Error(msg);
  }
  return resp.json();
}

async function saveLastResult(result) {
  try {
    await chrome.storage.session.set({ lastResult: result });
  } catch (_) { /* storage.session unavailable — non-fatal */ }
}

// Clipboard: 3-tier fallback.
//   1. navigator.clipboard — works in Firefox event pages and any window context.
//   2. chrome.offscreen document — the documented Chromium MV3 workaround.
//   3. Give up — result is stored in chrome.storage.session; the popup shows
//      it with a copy button the next time the user clicks the toolbar icon.
async function copyToClipboard(text) {
  // Tier 1
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (_) { /* fall through */ }

  // Tier 2 (Chromium only)
  if (chrome.offscreen && chrome.offscreen.createDocument) {
    try {
      const url = chrome.runtime.getURL("offscreen.html");
      // Reuse existing offscreen document if present
      // (runtime.getContexts is Chromium-only — feature-detect it)
      let existing = [];
      if (chrome.runtime.getContexts) {
        existing = await chrome.runtime.getContexts({
          contextTypes: ["OFFSCREEN_DOCUMENT"],
        }).catch(() => []);
      }
      if (!existing || existing.length === 0) {
        await chrome.offscreen.createDocument({
          url,
          reasons: ["CLIPBOARD"],
          justification: "Copy shortened URL to clipboard",
        });
      }
      await chrome.runtime.sendMessage({
        type: "offscreen-copy",
        target: "offscreen",
        text,
      });
      return true;
    } catch (_) { /* fall through */ }
  }

  // Tier 3
  return false;
}

// ── Badge feedback ──────────────────────────────────────────────────────────

function badge(kind, logMessage) {
  const isOk = kind === "OK";
  try {
    chrome.action.setBadgeText({ text: isOk ? "✓" : "!" });
    chrome.action.setBadgeBackgroundColor({ color: isOk ? "#16a34a" : "#dc2626" });
    setTimeout(() => {
      try {
        chrome.action.setBadgeText({ text: "" });
      } catch (_) { /* SW may be dead by then — badge resets on next event */ }
    }, 5000);
  } catch (_) { /* Safari wrapper may lack setBadgeText */ }
  console.log(`[ml1-shortener] ${kind}: ${logMessage}`);
}