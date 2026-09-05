// Offscreen clipboard proxy — receives copy requests from the service worker.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "offscreen-copy" && msg.target === "offscreen") {
    navigator.clipboard
      .writeText(msg.text)
      .then(() => sendResponse({ ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true; // async
  }
});