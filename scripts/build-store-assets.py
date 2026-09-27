#!/usr/bin/env python3
"""Build Chrome Web Store graphics from raw screenshots.

Produces, in dist-store/:
  screenshot-1.png .. screenshot-N.png   1280x800  (store requirement)
  promo-small.png                         440x280  (store requirement)

Screenshots are scaled to fit and centred on a canvas padded with the
image's own dominant edge colour — never stretched, so nothing looks
distorted, and never upscaled past 1:1, which would only blur them.

An argument may carry an optional crop as "path:x,y,w,h", applied before
fitting. Use it when the subject occupies a small part of a large
full-page capture: a tight crop at 16:10 (w/h = 1.6) fills the canvas
with no padding and keeps text readable.

Usage:
    python3 scripts/build-store-assets.py popup.png options.png
    python3 scripts/build-store-assets.py "menu.png:0,0,2400,1500"

Requires: pip install pillow
"""

import pathlib
import sys
from collections import Counter

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    sys.exit("pip install pillow")

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "dist-store"

SHOT = (1280, 800)
PROMO = (440, 280)
MAX_SHOTS = 5  # store limit


def dominant_edge_colour(im):
    """Most common colour around the border — what the padding should be."""
    im = im.convert("RGB")
    w, h = im.size
    px = []
    for x in range(0, w, max(1, w // 60)):
        px += [im.getpixel((x, 2)), im.getpixel((x, h - 3))]
    for y in range(0, h, max(1, h // 60)):
        px += [im.getpixel((2, y)), im.getpixel((w - 3, y))]
    return Counter(px).most_common(1)[0][0]


def fit_onto(im, size, bg=None):
    """Scale to fit inside `size` and centre on a `bg` canvas. No crop."""
    im = im.convert("RGB")
    if bg is None:
        bg = dominant_edge_colour(im)

    tw, th = size
    scale = min(tw / im.width, th / im.height)
    # Never upscale past 1:1 — enlarging a screenshot only makes it blurry.
    scale = min(scale, 1.0)
    new = (max(1, round(im.width * scale)), max(1, round(im.height * scale)))
    resized = im.resize(new, Image.LANCZOS)

    canvas = Image.new("RGB", size, bg)
    canvas.paste(resized, ((tw - new[0]) // 2, (th - new[1]) // 2))
    return canvas


def load_font(size, bold=False):
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold
        else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for path in candidates:
        if pathlib.Path(path).exists():
            try:
                return ImageFont.truetype(path, size)
            except OSError:
                continue
    return ImageFont.load_default()


def build_promo():
    """440x280 tile: extension icon, name, and a one-line hook."""
    brand = (37, 71, 217)  # the popup's blue
    canvas = Image.new("RGB", PROMO, brand)
    d = ImageDraw.Draw(canvas)

    # The icon is itself blue, so sit it on a white rounded tile — on the
    # brand-blue background it would otherwise read as a faint box.
    icon_path = ROOT / "icons" / "icon128.png"
    if icon_path.exists():
        pad, side = 10, 84
        tile = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        ImageDraw.Draw(tile).rounded_rectangle(
            [0, 0, side - 1, side - 1], radius=18, fill="white")
        icon = Image.open(icon_path).convert("RGBA").resize(
            (side - 2 * pad, side - 2 * pad), Image.LANCZOS)
        tile.paste(icon, (pad, pad), icon)
        canvas.paste(tile, (32, 34), tile)

    d.text((32, 136), "ml1.app", font=load_font(38, bold=True), fill="white")
    d.text((32, 182), "URL Shortener", font=load_font(30), fill=(214, 223, 255))
    d.text((32, 228), "Shorten any link in one click.",
           font=load_font(17), fill=(178, 194, 250))
    return canvas


def main():
    # Each arg is "path" or "path:x,y,w,h" to crop a region first — useful
    # when the subject is a small part of a large full-page capture.
    args = []
    for a in sys.argv[1:]:
        box = None
        if ":" in a and a.rsplit(":", 1)[1].count(",") == 3:
            a, raw = a.rsplit(":", 1)
            box = tuple(int(v) for v in raw.split(","))
        args.append((pathlib.Path(a).expanduser(), box))
    if not args:
        sys.exit(__doc__)

    srcs = [p for p, _ in args]
    missing = [s for s in srcs if not s.exists()]
    if missing:
        sys.exit("not found: " + ", ".join(str(m) for m in missing))

    if len(args) > MAX_SHOTS:
        print(f"note: store allows {MAX_SHOTS} screenshots; using the first {MAX_SHOTS}")
        args = args[:MAX_SHOTS]

    OUT.mkdir(exist_ok=True)

    for i, (src, box) in enumerate(args, 1):
        im = Image.open(src)
        if box:
            x, y, w, h = box
            im = im.crop((x, y, x + w, y + h))
        bg = dominant_edge_colour(im)
        out = OUT / f"screenshot-{i}.png"
        fit_onto(im, SHOT).save(out, "PNG", optimize=True)
        print(f"{src.name:>12}  {im.width}x{im.height}  ->  {out.name}  "
              f"1280x800  (pad #{'%02x%02x%02x' % bg})")

    promo = OUT / "promo-small.png"
    build_promo().save(promo, "PNG", optimize=True)
    print(f"{'(generated)':>12}  {'':>9}  ->  {promo.name}  440x280")


if __name__ == "__main__":
    main()
