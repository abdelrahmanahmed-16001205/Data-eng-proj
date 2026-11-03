"""Generate simplified NYC borough outlines as SVG path data for the dashboard map.

Projection: equirectangular with cos(lat) correction, fitted into a square plot box.
Run from the project root. Writes website/borough-paths.js.
"""
import json
import math
import os
import urllib.request

SRC = os.path.join(os.environ.get("TEMP", "."), "nyc-boroughs.geojson")
URL = "https://raw.githubusercontent.com/dwillis/nyc-maps/master/boroughs.geojson"

# viewBox 0 0 820 820, plot box inset 30
X0, Y0, W, H = 30.0, 30.0, 760.0, 760.0
LON_MIN, LON_MAX = -74.28, -73.68
LAT_MIN, LAT_MAX = 40.48, 40.94
LAT_MID = (LAT_MIN + LAT_MAX) / 2.0

if not os.path.exists(SRC):
    urllib.request.urlretrieve(URL, SRC)
with open(SRC, encoding="utf-8") as f:
    gj = json.load(f)

# Fit the projected extent into the plot box with one scale on both axes.
kx = math.cos(math.radians(LAT_MID))
dx = (LON_MAX - LON_MIN) * kx
dy = LAT_MAX - LAT_MIN
S = min(W / dx, H / dy)
MAP_W, MAP_H = dx * S, dy * S
OX = X0 + (W - MAP_W) / 2.0
OY = Y0 + (H - MAP_H) / 2.0


def project(lon, lat):
    x = OX + (lon - LON_MIN) * kx * S
    y = OY + (LAT_MAX - lat) * S
    return x, y


def dp(points, tol):
    """Douglas-Peucker on a closed ring, iterative to avoid recursion limits."""
    if len(points) < 3:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        a, b = stack.pop()
        if b <= a + 1:
            continue
        ax, ay = points[a]
        bx, by = points[b]
        vx, vy = bx - ax, by - ay
        norm = math.hypot(vx, vy)
        best, best_i = -1.0, -1
        for i in range(a + 1, b):
            px, py = points[i]
            if norm == 0:
                d = math.hypot(px - ax, py - ay)
            else:
                d = abs(vx * (py - ay) - vy * (px - ax)) / norm
            if d > best:
                best, best_i = d, i
        if best > tol:
            keep[best_i] = True
            stack.append((a, best_i))
            stack.append((best_i, b))
    return [p for p, k in zip(points, keep) if k]


def ring_area(points):
    a = 0.0
    for i in range(len(points) - 1):
        x1, y1 = points[i]
        x2, y2 = points[i + 1]
        a += x1 * y2 - x2 * y1
    return abs(a) / 2.0


def rings(geom):
    if geom["type"] == "Polygon":
        return [geom["coordinates"][0]]
    if geom["type"] == "MultiPolygon":
        return [poly[0] for poly in geom["coordinates"]]
    return []


TOL = 0.0026  # degrees; ~280 m
MIN_AREA = 400.0  # square SVG units; keeps Rockaway and Roosevelt Island, drops marsh specks
MAIN_RING_ONLY = False
out = []
total_pts = 0
for feat in gj["features"]:
    name = feat["properties"]["BoroName"].upper()
    # Simplify every ring, then keep the largest first so MAIN_RING_ONLY
    # always selects the borough's mainland rather than a marsh island.
    cand = []
    for r in rings(feat["geometry"]):
        pts = [project(lon, lat) for lon, lat in r]
        simp = dp(pts, TOL * S)
        if len(simp) < 4:
            continue
        a = ring_area(simp)
        if a < MIN_AREA:
            continue
        cand.append((a, simp))
    cand.sort(key=lambda t: -t[0])
    if MAIN_RING_ONLY:
        cand = cand[:1]
    parts = []
    for _, simp in cand:
        total_pts += len(simp)
        parts.append(
            "M" + " ".join(f"{x:.1f},{y:.1f}" for x, y in simp[:-1]) + "Z"
        )
    out.append({"name": name, "d": "".join(parts)})

# Hand-placed label anchors (lon, lat), kept inside each borough's landmass.
LABELS = {
    "BRONX": (-73.865, 40.848),
    "MANHATTAN": (-73.975, 40.775),
    "BROOKLYN": (-73.945, 40.638),
    "QUEENS": (-73.790, 40.700),
    "STATEN ISLAND": (-74.155, 40.583),
}
for item in out:
    lon, lat = LABELS[item["name"]]
    x, y = project(lon, lat)
    item["label"] = [round(x, 1), round(y, 1)]

body = json.dumps(out, indent=0, separators=(",", ":"))
js = (
    "/* Simplified NYC borough outlines, generated for the dashboard map.\n"
    "   Source: dwillis/nyc-maps boroughs.geojson (NYC Open Data borough boundaries).\n"
    f"   Douglas-Peucker tolerance {TOL} deg; {total_pts} points retained.\n"
    "   Projection: equirectangular, cos(lat) corrected, fitted to viewBox 0 0 820 820. */\n"
    "const NYC_BOROUGHS = " + body + ";\n"
)
with open(os.path.join("website", "borough-paths.js"), "w", encoding="utf-8") as f:
    f.write(js)

print(f"boroughs: {len(out)}  points: {total_pts}  bytes: {len(js)}")
print(f"projection: kx={kx:.6f} S={S:.4f} OX={OX:.3f} OY={OY:.3f} MAP={MAP_W:.1f}x{MAP_H:.1f}")
for item in out:
    print(f"  {item['name']:<14} {len(item['d']):>6} chars  label={item['label']}")
