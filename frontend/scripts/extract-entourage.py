"""Extract individual entourage silhouettes from a sheet PNG."""
from __future__ import annotations

import json
from collections import deque
from pathlib import Path

from PIL import Image

SRC = Path(
    r"C:\Users\holag\.cursor\projects\d-Work-Development-Repos-esti\assets"
    r"\c__Users_holag_AppData_Roaming_Cursor_User_workspaceStorage_fb6a9d1a007119185d9ca764bbecc513_images"
    r"_image-d09a6f6d-909b-4a5e-a97e-e42f82397bbb.png"
)
OUT = Path(r"d:\Work Development\Repos\esti\frontend\public\landing\entourage")
OUT.mkdir(parents=True, exist_ok=True)

im = Image.open(SRC).convert("RGBA")
w, h = im.size
px = im.load()

MASK_THRESH = 245
mask = [[False] * w for _ in range(h)]
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if a > 20 and (r < MASK_THRESH or g < MASK_THRESH or b < MASK_THRESH):
            if (r + g + b) / 3 < 250:
                mask[y][x] = True

visited = [[False] * w for _ in range(h)]
components: list[tuple] = []


def neighbors(x: int, y: int):
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dx == 0 and dy == 0:
                continue
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h:
                yield nx, ny


for y in range(h):
    for x in range(w):
        if not mask[y][x] or visited[y][x]:
            continue
        q = deque([(x, y)])
        visited[y][x] = True
        cells: list[tuple[int, int]] = []
        minx = maxx = x
        miny = maxy = y
        while q:
            cx, cy = q.popleft()
            cells.append((cx, cy))
            minx = min(minx, cx)
            maxx = max(maxx, cx)
            miny = min(miny, cy)
            maxy = max(maxy, cy)
            for nx, ny in neighbors(cx, cy):
                if mask[ny][nx] and not visited[ny][nx]:
                    visited[ny][nx] = True
                    q.append((nx, ny))
        area = len(cells)
        bw = maxx - minx + 1
        bh = maxy - miny + 1
        if area < 180 or area > w * h * 0.25:
            continue
        if bh < 28 or bw < 8:
            continue
        if bh < bw * 0.9 and area < 800:
            continue
        components.append((area, minx, miny, maxx, maxy, cells))

components.sort(key=lambda t: t[0], reverse=True)
kept: list[tuple] = []
for comp in components:
    _, minx, miny, maxx, maxy, cells = comp
    overlap = False
    for k in kept:
        _, kx0, ky0, kx1, ky1, _ = k
        ix0, iy0 = max(minx, kx0), max(miny, ky0)
        ix1, iy1 = min(maxx, kx1), min(maxy, ky1)
        if ix0 <= ix1 and iy0 <= iy1:
            inter = (ix1 - ix0 + 1) * (iy1 - iy0 + 1)
            a1 = (maxx - minx + 1) * (maxy - miny + 1)
            a2 = (kx1 - kx0 + 1) * (ky1 - ky0 + 1)
            if inter / min(a1, a2) > 0.35:
                overlap = True
                break
    if not overlap:
        kept.append(comp)

print(f"found {len(components)} candidates, kept {len(kept)}")

pad = 4
saved = 0
for area, minx, miny, maxx, maxy, cells in kept[:48]:
    x0 = max(0, minx - pad)
    y0 = max(0, miny - pad)
    x1 = min(w - 1, maxx + pad)
    y1 = min(h - 1, maxy + pad)
    cw, ch = x1 - x0 + 1, y1 - y0 + 1
    crop = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    cp = crop.load()
    cell_set = set(cells)
    for cx, cy in cells:
        r, g, b, a = px[cx, cy]
        cp[cx - x0, cy - y0] = (r, g, b, a if a > 0 else 255)
    for yy in range(y0, y1 + 1):
        for xx in range(x0, x1 + 1):
            if (xx, yy) in cell_set:
                continue
            r, g, b, a = px[xx, yy]
            if a > 20 and (r + g + b) / 3 < 248:
                adj = any(
                    (xx + dx, yy + dy) in cell_set
                    for dx in (-1, 0, 1)
                    for dy in (-1, 0, 1)
                )
                if adj:
                    cp[xx - x0, yy - y0] = (
                        r,
                        g,
                        b,
                        min(220, 255 - int((r + g + b) / 3) + 40),
                    )
    crop.save(OUT / f"figure-{saved:02d}.png", "PNG")
    saved += 1

files = [f"figure-{i:02d}.png" for i in range(saved)]
(OUT / "manifest.json").write_text(json.dumps({"figures": files}, indent=2), encoding="utf-8")
print(f"saved {saved} to {OUT}")
