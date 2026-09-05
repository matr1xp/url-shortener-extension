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
};

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
  const code = shortCode.split("/").pop();
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

loadStats();