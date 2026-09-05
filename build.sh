#!/usr/bin/env bash
# Build ml1.app URL Shortener extension into browser-specific dist folders.
#
#   ./build.sh          → dist/chrome/  and dist/firefox/
#
# One source tree, two manifests:
#   - Chrome/Edge/Brave/Opera: "offscreen" permission (MV3 clipboard proxy)
#   - Firefox:               no "offscreen" permission (not supported);
#                             offscreen files simply stay unused. Firefox
#                             already has browser_specific_settings.gecko.id.
#
# Output: dist/chrome/url-shortener-chrome.zip, dist/firefox/url-shortener-firefox.zip

set -euo pipefail
cd "$(dirname "$0")"

SRC="."
DIST="dist"

rm -rf "$DIST"
mkdir -p "$DIST/chrome" "$DIST/firefox"

copy_common() {
  local dest="$1"
  mkdir -p "$dest/popup" "$dest/icons"
  cp "$SRC/manifest.json" "$SRC/background.js" "$SRC/options.html" \
     "$SRC/options.css" "$SRC/options.js" \
     "$SRC/offscreen.html" "$SRC/offscreen.js" "$dest/"
  cp "$SRC/popup/popup.html" "$SRC/popup/popup.css" "$SRC/popup/popup.js" "$dest/popup/"
  cp icons/icon16.png icons/icon48.png icons/icon128.png "$dest/icons/" 2>/dev/null || {
    echo "⚠️  icons missing — generating placeholder icons"
    python3 - <<'EOF'
import struct, zlib

def png(size, path):
    def chunk(t, d):
        c = t + d
        return struct.pack(">I", len(d)) + c + struct.pack(">I", zlib.crc32(c))
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)
    row = b"\x00" + b"\x1d\x4e\xd8\xff" * size
    idat = zlib.compress(row * size)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b""))

for s in (16, 48, 128):
    png(s, f"icons/icon{s}.png")
EOF
    cp icons/icon16.png icons/icon48.png icons/icon128.png "$dest/icons/"
  }
}

# ── Chrome (with offscreen permission) ──────────────────────────────────────
copy_common "$DIST/chrome"
python3 - "$DIST/chrome/manifest.json" <<'EOF'
import json, sys
p = sys.argv[1]
m = json.load(open(p))
m["permissions"].append("offscreen")
json.dump(m, open(p, "w"), indent=2)
EOF

# ── Firefox (event-page background form; gecko id already in manifest) ─────
copy_common "$DIST/firefox"
python3 - "$DIST/firefox/manifest.json" <<'EOF'
import json, sys
p = sys.argv[1]
m = json.load(open(p))
# Firefox prefers the event-page form over background.service_worker
m["background"] = {"scripts": ["background.js"]}
json.dump(m, open(p, "w"), indent=2)
EOF

# ── Validate JSON manifests ───────────────────────────────────────────────
python3 - "$DIST" <<'EOF'
import json, sys
for browser in ("chrome", "firefox"):
    p = f"{sys.argv[1]}/{browser}/manifest.json"
    m = json.load(open(p))
    assert m["manifest_version"] == 3
    assert "service_worker" in m["background"] or "scripts" in m["background"]
    print(f"✅ {browser} manifest OK (v{m['version']}, {len(m['permissions'])} permissions)")
EOF

# ── Zip bundles ─────────────────────────────────────────────────────────────
if command -v zip >/dev/null; then
  (cd "$DIST/chrome" && zip -qr ../url-shortener-chrome.zip .)
  (cd "$DIST/firefox" && zip -qr ../url-shortener-firefox.zip .)
  echo "✅ Bundles:"
  ls -la "$DIST"/*.zip
else
  echo "⚠️  zip not found — dist folders are ready at $DIST/chrome and $DIST/firefox"
fi