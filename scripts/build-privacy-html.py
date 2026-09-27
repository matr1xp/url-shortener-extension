#!/usr/bin/env python3
"""Render PRIVACY.md to a standalone privacy.html for hosting on ml1.app.

The HTML is generated, never hand-edited — PRIVACY.md is the single source
of truth. Re-run this after changing the policy, then redeploy:

    python3 scripts/build-privacy-html.py
    cp dist-privacy/privacy.html ../load-balancer/caddy/static/

Requires: pip install markdown
"""

import pathlib
import re
import sys

try:
    import markdown
except ImportError:
    sys.exit("pip install markdown")

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "PRIVACY.md"
OUT_DIR = ROOT / "dist-privacy"
OUT = OUT_DIR / "privacy.html"

# Self-contained: no CDN, no webfonts, no trackers — it would be a poor look
# for a privacy policy to phone home. Readable on light and dark.
CSS = """
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
body {
  margin: 0 auto;
  padding: 2.5rem 1.25rem 5rem;
  max-width: 46rem;
  font: 16px/1.65 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
        Helvetica, Arial, sans-serif;
  color: #1a1a1a;
  background: #fff;
}
h1 { font-size: 1.9rem; line-height: 1.2; margin: 0 0 .4rem; }
h2 { font-size: 1.2rem; margin: 2.4rem 0 .6rem; padding-top: 1.2rem;
     border-top: 1px solid #e6e6e6; }
h1 + p { color: #666; margin-top: 0; }
a { color: #1a4fd6; }
code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
       font-size: .88em; background: #f3f3f3; padding: .12em .35em;
       border-radius: 3px; }
table { border-collapse: collapse; width: 100%; margin: 1.2rem 0;
        display: block; overflow-x: auto; }
th, td { text-align: left; padding: .55rem .7rem; border: 1px solid #e0e0e0;
         vertical-align: top; }
th { background: #f7f7f7; font-weight: 600; }
ul { padding-left: 1.3rem; }
li { margin: .3rem 0; }
strong { font-weight: 600; }
hr { border: 0; border-top: 1px solid #e6e6e6; margin: 2.5rem 0; }
@media (prefers-color-scheme: dark) {
  body { color: #e4e4e4; background: #16181c; }
  h1 + p { color: #9aa0a6; }
  h2 { border-top-color: #2c2f36; }
  a { color: #7aa2f7; }
  code { background: #23262d; }
  th, td { border-color: #2c2f36; }
  th { background: #1d2026; }
  hr { border-top-color: #2c2f36; }
}
"""

TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="Privacy policy for the ml1.app URL Shortener browser extension.">
<meta name="robots" content="index, follow">
<style>{css}</style>
</head>
<body>
{body}
</body>
</html>
"""


def main():
    if not SRC.exists():
        sys.exit(f"missing {SRC}")

    text = SRC.read_text(encoding="utf-8")

    body = markdown.markdown(
        text,
        extensions=["tables", "sane_lists"],
        output_format="html5",
    )

    # Pull the <h1> for the page title; fall back to a sensible default.
    m = re.search(r"<h1>(.*?)</h1>", body, re.S)
    title = re.sub(r"<[^>]+>", "", m.group(1)).strip() if m else "Privacy Policy"

    OUT_DIR.mkdir(exist_ok=True)
    OUT.write_text(
        TEMPLATE.format(title=title, css=CSS.strip(), body=body),
        encoding="utf-8",
    )
    print(f"wrote {OUT.relative_to(ROOT)}  ({OUT.stat().st_size:,} bytes)")
    print(f"title: {title}")


if __name__ == "__main__":
    main()
