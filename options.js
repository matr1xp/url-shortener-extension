// ml1.app URL Shortener — options page: your links, clicks, delete.
// Uses GET /api/stats and DELETE /api/delete/<code> with CF Access cookies.

const API_BASE = "https://s.ml1.app";

const els = {
  authWarning: document.getElementById("auth-warning"),
  btnRelogin: document.getElementById("btn-relogin"),
  error: document.getElementById("error"),
  summary: document.getElementById("summary"),
  table: document.getElementById("links-table"),
  tbody: document.getElementById("links-body"),
  empty: document.getElementById("empty"),
  btnRefresh: document.getElementById("btn-refresh"),
  prefixEnabled: document.getElementById("prefix-enabled"),
  prefixInput: document.getElementById("prefix-input"),
  prefixExample: document.getElementById("prefix-example"),
  prefixStatus: document.getElementById("prefix-status"),
  btnSavePrefix: document.getElementById("btn-save-prefix"),
};

// ── Prefix management (issue #1: multi-user namespaces) ─────────────────────

const PREFIX_RE = /^[a-z0-9][a-z0-9-]{1,15}$/;

function setPrefixExample(prefix) {
  // Build with DOM APIs (not innerHTML) — keeps web-ext lint clean and
  // avoids injecting anything unexpected.
  els.prefixExample.textContent = "https://ml1.app/";
  const b = document.createElement("b");
  b.textContent = prefix || "your-prefix";
  els.prefixExample.appendChild(b);
  els.prefixExample.appendChild(document.createTextNode("/my-link"));
}

async function loadPrefix() {
  // Local preference first (works signed-out), then server prefix
  let stored = {};
  try {
    stored = await chrome.storage.sync.get(["prefixEnabled", "prefix"]);
  } catch (_) { /* Firefox without sync storage */ }
  els.prefixEnabled.checked = !!stored.prefixEnabled;
  if (stored.prefix) {
    els.prefixInput.value = stored.prefix;
    setPrefixExample(stored.prefix);
  }

  // Refresh from server (also lazily creates the prefix on first use)
  try {
    const resp = await fetch(`${API_BASE}/api/prefix`, { credentials: "include" });
    if (resp.status === 401) return; // signed out — local value is enough
    if (!resp.ok) return;
    const data = await resp.json();
    if (data.prefix) {
      els.prefixInput.value = data.prefix;
      setPrefixExample(data.prefix);
      await chrome.storage.sync.set({ prefix: data.prefix }).catch(() => {});
    }
  } catch (_) { /* offline — keep local */ }
}

async function togglePrefix(enabled) {
  await chrome.storage.sync.set({ prefixEnabled: enabled }).catch(() => {});
}

async function savePrefix() {
  const prefix = els.prefixInput.value.trim().toLowerCase();
  hide(els.error);

  if (!PREFIX_RE.test(prefix)) {
    els.prefixStatus.textContent =
      "Prefix must be 2–16 lowercase chars: a-z, 0-9, - (not starting with -).";
    return;
  }

  els.btnSavePrefix.disabled = true;
  try {
    const resp = await fetch(`${API_BASE}/api/prefix`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefix }),
    });
    if (resp.status === 401) {
      show(els.authWarning);
      return;
    }
    const body = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      els.prefixStatus.textContent = body.error || `Save failed (${resp.status})`;
      return;
    }
    els.prefixStatus.textContent = `Prefix saved: ${body.prefix}`;
    els.prefixInput.value = body.prefix;
    setPrefixExample(body.prefix);
    await chrome.storage.sync.set({ prefix: body.prefix }).catch(() => {});
  } catch (_) {
    els.prefixStatus.textContent = "Network error — is s.ml1.app reachable?";
  } finally {
    els.btnSavePrefix.disabled = false;
  }
}

els.prefixEnabled.addEventListener("change", () => togglePrefix(els.prefixEnabled.checked));
els.btnSavePrefix.addEventListener("click", savePrefix);

async function loadStats() {
  hide(els.error);
  hide(els.authWarning);

  let resp;
  try {
    resp = await fetch(`${API_BASE}/api/stats`, {
      credentials: "include",
    });
  } catch (_) {
    showError("Network error — is s.ml1.app reachable?");
    return;
  }

  if (resp.status === 401) {
    show(els.authWarning);
    hideTable();
    return;
  }
  if (!resp.ok) {
    showError(`API error ${resp.status}`);
    return;
  }

  const data = await resp.json();

  if (!data.links || data.links.length === 0) {
    hideTable();
    show(els.empty);
    hide(els.summary);
    return;
  }

  hide(els.empty);
  show(els.summary);
  els.summary.textContent = `${data.total} link${data.total === 1 ? "" : "s"} for ${data.user}`;

  els.tbody.innerHTML = "";
  for (const link of data.links) {
    els.tbody.appendChild(renderRow(link));
  }
  show(els.table);
}

function renderRow(link) {
  const tr = document.createElement("tr");

  const tdShort = document.createElement("td");
  const a = document.createElement("a");
  a.href = link.short_url;
  a.target = "_blank";
  a.rel = "noopener";
  a.textContent = link.short_url;
  tdShort.appendChild(a);
  tr.appendChild(tdShort);

  const tdOrig = document.createElement("td");
  tdOrig.textContent = link.original_url;
  tdOrig.title = link.original_url;
  tr.appendChild(tdOrig);

  const tdClicks = document.createElement("td");
  tdClicks.className = "num";
  tdClicks.textContent = link.clicks;
  tr.appendChild(tdClicks);

  const tdCreated = document.createElement("td");
  tdCreated.className = "num";
  // created_at is UTC "YYYY-MM-DD HH:MM:SS" from SQLite
  tdCreated.textContent = (link.created_at || "").slice(0, 16).replace("T", " ");
  tr.appendChild(tdCreated);

  const tdAction = document.createElement("td");
  const btn = document.createElement("button");
  btn.className = "danger";
  btn.textContent = "Delete";
  btn.addEventListener("click", () => deleteLink(link.short_code, tr));
  tdAction.appendChild(btn);
  tr.appendChild(tdAction);

  return tr;
}

async function deleteLink(shortCode, rowEl) {
  // shortCode may be prefixed ('ms/my-link') — keep the full code; the API
  // route is /api/delete/<path:short_code> and expects prefix+code together.
  const code = shortCode;
  if (!confirm(`Delete ${shortCode}? This cannot be undone.`)) return;

  try {
    const resp = await fetch(`${API_BASE}/api/delete/${code}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (resp.status === 401) {
      show(els.authWarning);
      return;
    }
    if (!resp.ok) {
      const body = await resp.json().catch(() => ({}));
      showError(body.error || `Delete failed (${resp.status})`);
      return;
    }
    rowEl.remove();
    // Refresh summary count
    const rows = els.tbody.querySelectorAll("tr").length;
    if (rows === 0) {
      hideTable();
      show(els.empty);
    } else {
      els.summary.textContent = els.summary.textContent.replace(/^\d+/, String(rows));
    }
  } catch (_) {
    showError("Network error during delete.");
  }
}

function showError(msg) {
  els.error.textContent = msg;
  show(els.error);
}
function show(el) { el.classList.remove("hidden"); }
function hide(el) { el.classList.add("hidden"); }
function hideTable() {
  hide(els.table);
  hide(els.summary);
}

els.btnRefresh.addEventListener("click", loadStats);
els.btnRelogin.addEventListener("click", () =>
  chrome.tabs.create({ url: `${API_BASE}/` })
);

loadPrefix();
loadStats();