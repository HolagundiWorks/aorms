"""Extract 15 isometric building tiles from a 3×5 sheet into transparent PNGs."""
from __future__ import annotations

import json
from pathlib import Path

from PIL import Image

SRC = Path(
    r"C:\Users\holag\.cursor\projects\d-Work-Development-Repos-esti\assets"
    r"\c__Users_holag_AppData_Roaming_Cursor_User_workspaceStorage_fb6a9d1a007119185d9ca764bbecc513_images"
    r"_image-9d1ccc01-3c8a-4698-b194-da9648dfdeb4.png"
)
OUT = Path(r"d:\Work Development\Repos\esti\frontend\public\landing\entourage")
OUT.mkdir(parents=True, exist_ok=True)

# Remove old human figures
for old in OUT.glob("figure-*.png"):
    old.unlink()

im = Image.open(SRC).convert("RGBA")
w, h = im.size
cols, rows = 3, 5
cw, ch = w // cols, h // rows
print(f"sheet {w}x{h} -> cell ~{cw}x{ch}")

WHITE = 248


def trim_and_transparent(tile: Image.Image) -> Image.Image:
    px = tile.load()
    tw, th = tile.size
    # make near-white transparent
    for y in range(th):
        for x in range(tw):
            r, g, b, a = px[x, y]
            if r >= WHITE and g >= WHITE and b >= WHITE:
                px[x, y] = (255, 255, 255, 0)
    # bbox of non-transparent
    bbox = tile.getbbox()
    if not bbox:
        return tile
    pad = 6
    x0 = max(0, bbox[0] - pad)
    y0 = max(0, bbox[1] - pad)
    x1 = min(tw, bbox[2] + pad)
    y1 = min(th, bbox[3] + pad)
    return tile.crop((x0, y0, x1, y1))


files: list[str] = []
idx = 0
for row in range(rows):
    for col in range(cols):
        x0 = col * cw
        y0 = row * ch
        # slight inset to avoid grid gutters
        inset = 4
        cell = im.crop((x0 + inset, y0 + inset, x0 + cw - inset, y0 + ch - inset))
        cell = trim_and_transparent(cell)
        name = f"building-{idx:02d}.png"
        cell.save(OUT / name, "PNG")
        files.append(name)
        idx += 1
        print(f"  {name} {cell.size}")

(OUT / "manifest.json").write_text(
    json.dumps({"figures": files, "kind": "buildings"}, indent=2),
    encoding="utf-8",
)
print(f"saved {len(files)} buildings -> {OUT}")
