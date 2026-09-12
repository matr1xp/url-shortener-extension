// ml1.app URL Shortener — popup logic.
// Fetches go through apiFetch() (api.js) with credentials — the browser's
// Cloudflare Access session cookie (CF_Authorization) rides along
// automatically, and the Access login redirect is detected there (issue #5).

const els = {
  authWarning: document.getElementById("auth-warning"),
  btnLogin: document.getElementById("btn-login"),
  inputUrl: document.getElementById("input-url"),
  inputCustom: document.getElementById("input-custom"),
  btnShorten: document.getElementById("btn-shorten"),
  result: document.getElementById("result"),
  resultNote: document.getElementById("result-note"),
  resultLink: document.getElementById("result-link"),
  resultOriginal: document.getElementById("result-original"),
  btnCopy: document.getElementById("btn-copy"),
  error: document.getElementById("error"),
  btnOptions: document.getElementById("btn-options"),
};

let currentResult = null;

async function init() {
  // Pre-fill with the active tab's URL
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url && /^https?:/i.test(tab.url)) {
    els.inputUrl.value = tab.url;
  }

  // Restore last background result (context-menu / shortcut shortenings)
  chrome.runtime.sendMessage({ type: "getLastResult" }, (resp) => {
    if (chrome.runtime.lastError) return;
    if (resp && resp.ok && resp.result) {
      showResult(resp.result);
    }
  });
}

async function shorten() {
  hide(els.error);
  hide(els.authWarning);
  const url = els.inputUrl.value.trim();
  const customCode = els.inputCustom.value.trim();

  if (!/^https?:\/\//i.test(url)) {
    showError("Enter a valid http(s) URL.");
    return;
  }

  els.btnShorten.disabled = true;
  els.btnShorten.textContent = "Shortening…";

  // Honor the "Prefix my links" preference from the options page (issue #1).
  let prefixEnabled = false;
  try {
    const stored = await chrome.storage.sync.get("prefixEnabled");
    prefixEnabled = !!stored.prefixEnabled;
  } catch (_) { /* storage unavailable — default off */ }

  try {
    const { authRequired, resp } = await apiFetch("/api/shorten", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefixEnabled
        ? { url, custom_code: customCode, prefix: true }
        : { url, custom_code: customCode }),
    });

    if (authRequired) {
      show(els.authWarning);
      return;
    }
    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      showError(body.error || `API error ${resp.status}`);
      return;
    }

    const data = await resp.json();
    showResult(data);
    autoCopy(data.short_url);
  } catch (err) {
    showError("Network error — is s.ml1.app reachable?");
  } finally {
    els.btnShorten.disabled = false;
    els.btnShorten.textContent = "Shorten";
  }
}

function showResult(data) {
  currentResult = data;
  els.resultNote.textContent = data.already_existed
    ? "You already had a link for this URL — reusing it."
    : "Short link created.";
  els.resultLink.textContent = data.short_url;
  els.resultLink.href = data.short_url;
  els.resultOriginal.textContent = data.original_url || "";
  els.btnCopy.textContent = "Copy";
  show(els.result);
}

async function autoCopy(text) {
  try {
    await navigator.clipboard.writeText(text);
    els.btnCopy.textContent = "Copied!";
    setTimeout(() => (els.btnCopy.textContent = "Copy"), 1500);
  } catch (_) {
    // Auto-copy from popup can fail without focus; the Copy button remains.
  }
}

async function copyButton() {
  if (!currentResult) return;
  try {
    await navigator.clipboard.writeText(currentResult.short_url);
    els.btnCopy.textContent = "Copied!";
  } catch (_) {
    // execCommand fallback for Safari's wrapper
    const ta = document.createElement("textarea");
    ta.value = currentResult.short_url;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    els.btnCopy.textContent = "Copied!";
  }
  setTimeout(() => (els.btnCopy.textContent = "Copy"), 1500);
}

function showError(msg) {
  hide(els.result);
  els.error.textContent = msg;
  show(els.error);
}

function show(el) { el.classList.remove("hidden"); }
function hide(el) { el.classList.add("hidden"); }

els.btnShorten.addEventListener("click", shorten);
els.inputUrl.addEventListener("keydown", (e) => e.key === "Enter" && shorten());
els.inputCustom.addEventListener("keydown", (e) => e.key === "Enter" && shorten());
els.btnCopy.addEventListener("click", copyButton);
els.btnLogin.addEventListener("click", () => chrome.tabs.create({ url: `${API_BASE}/` }));
els.btnOptions.addEventListener("click", (e) => {
  e.preventDefault();
  chrome.runtime.openOptionsPage();
});

init();