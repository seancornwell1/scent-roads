# Room shell in the warm shop look (Nov 10), sized like the modules the game lays out
# (2 m floor tiles; 2 m wall panels, 3 m tall, 0.2 m thick):
#   floor-parquet (herringbone, the shop), floor-planks (boards, the back room), floor-kerb and
#   floor-kerb-corner (the dark edge along the open sides), wall-plain, wall-window (arched),
#   wall-doorway, wall-corner (the post where two walls meet) and door-arched.
# Wall panels are centred on y = 0; the room side faces +Y.
# Set ONLY = ["wall-window", ...] before running to rebuild just those.
import math, random
g = globals()
exec(open(r"C:\Users\seanc\Projects\scent-roads\blender\lib.py").read(), g)
random.seed(11)
out = []
ONLY = g.get("ONLY")


def want(name):
    return not ONLY or name in ONLY


# ---------- herringbone parquet ----------
if want("floor-parquet"):
    M = Model("floor-parquet", ground=False)
    U = 0.125                       # plank width; planks are 4 wide, so the pattern repeats every 1 m
    G, B = 0.005, 0.007             # groove depth and the width of its slope
    tones = ["#CC8A4A", "#C07C40", "#D69A5B", "#B97437", "#CF9152"]
    tone_m = [mat("parquet_%d" % i, t, 0.6) for i, t in enumerate(tones)]
    geo = [([], []) for _ in tones]
    area = 0.0
    for i in range(-24, 44):
        for m in range(-8, 9):
            for kind, (x0, y0, x1, y1) in (("h", (i + 4 * m, i - 4 * m, i + 4 * m + 4, i - 4 * m + 1)),
                                           ("v", (i + 4 + 4 * m, i - 3 - 4 * m, i + 5 + 4 * m, i + 1 - 4 * m))):
                cx0, cy0, cx1, cy1 = max(x0, 0), max(y0, 0), min(x1, 16), min(y1, 16)
                if cx1 <= cx0 or cy1 <= cy0: continue
                area += (cx1 - cx0) * (cy1 - cy0)
                # the same plank gets the same tone on both sides of a tile edge
                t = (x0 % 16 * 7 + y0 % 16 * 13 + (5 if kind == "h" else 0) + (x0 % 16) * (y0 % 16)) % len(tones)
                vs, fs = geo[t]
                ox0, oy0, ox1, oy1 = [(c - 8) * U for c in (cx0, cy0, cx1, cy1)]
                # inset only on real plank edges, not where the tile cuts the plank
                ix0 = ox0 + (B if cx0 == x0 else 0); ix1 = ox1 - (B if cx1 == x1 else 0)
                iy0 = oy0 + (B if cy0 == y0 else 0); iy1 = oy1 - (B if cy1 == y1 else 0)
                n = len(vs)
                vs += [(ox0, oy0, -G), (ox1, oy0, -G), (ox1, oy1, -G), (ox0, oy1, -G),
                       (ix0, iy0, 0), (ix1, iy0, 0), (ix1, iy1, 0), (ix0, iy1, 0)]
                fs.append((n + 4, n + 5, n + 6, n + 7))
                for a, real in ((0, cy0 == y0), (1, cx1 == x1), (2, cy1 == y1), (3, cx0 == x0)):
                    if real: fs.append((n + a, n + (a + 1) % 4, n + 4 + (a + 1) % 4, n + 4 + a))
    assert abs(area - 256) < 1e-6, area
    for (vs, fs), m in zip(geo, tone_m):
        M.mesh(m, vs, fs, smooth=False)
    out.append(M.finish(elev=50, pad=1.1))

# ---------- floor boards (the back room) ----------
if want("floor-planks"):
    M = Model("floor-planks")
    shades = [mat("floor_plank_a", "#B98554", 0.7), mat("floor_plank_b", "#AD7847", 0.7), mat("floor_plank_c", "#C4925F", 0.7)]
    N = 8; pw = 2.0 / N
    for i in range(N):
        y = -1 + pw / 2 + i * pw
        cut = random.uniform(-0.6, 0.6)     # each row has a joint at a different place
        for (x0, x1) in ((-1, cut), (cut, 1)):
            o = M.box(random.choice(shades), (x1 - x0 - 0.008, pw - 0.008, 0.1), ((x0 + x1) / 2, y, 0), bevel=0.012, segs=2)
            o["shade"] = 1.0
    out.append(M.finish(elev=45, pad=1.2))

# ---------- the dark edge of the floor ----------
edge = mat("floor_edge", "mahogany", 0.6)
if want("floor-kerb"):
    M = Model("floor-kerb", ground=False, shade=1)
    M.prism(edge, [(0, -0.3), (0.16, -0.3), (0.16, 0.03), (0.13, 0.06), (0.03, 0.06), (0, 0.03)], -1, 1, axis='X')
    out.append(M.finish())
if want("floor-kerb-corner"):
    M = Model("floor-kerb-corner", ground=False, shade=1)
    M.box(edge, (0.2, 0.2, 0.37), (0, 0, -0.3), bevel=0.02)
    out.append(M.finish())

# ---------- shared wall pieces ----------
W, H, T = 2.0, 3.0, 0.2
WH = 0.95                   # height of the panelling
plaster = mat("wall_plaster", "plaster", 0.9)
wood = mat("wall_wood", "walnut", 0.6)
wood_lt = mat("wall_wood_lt", "walnut_lt", 0.6)
wood_dk = mat("wall_wood_dk", "mahogany", 0.55)


def even(o, lo=1.0, span=None):
    """Sets how a part is shaded: lo at its foot (1 = even), over its own height or over span."""
    o["shade"] = lo
    if span: o["zspan"] = span
    return o


def plaster_block(M, x0, x1, z0, z1):
    # no bevel: panels butt together. All the plaster of a wall is shaded as one surface.
    return even(M.box(plaster, (x1 - x0, T, z1 - z0), ((x0 + x1) / 2, 0, z0), bevel=0), 0.86, (WH, H))


def wainscot(M, x0, x1):
    # dark panelling to 0.95 m: board, skirting, rail and raised panels
    L = x1 - x0; cx = (x0 + x1) / 2
    even(M.box(wood, (L, T + 0.03, WH), (cx, 0.015, 0), bevel=0), 0.8)
    M.prism(wood_dk, [(0.1, 0), (0.175, 0), (0.175, 0.12), (0.155, 0.15), (0.1, 0.15)], x0, x1, axis='X')
    M.prism(wood_dk, [(0.1, WH - 0.08), (0.16, WH - 0.08), (0.185, WH - 0.05), (0.185, WH), (0.16, WH + 0.025), (0.1, WH + 0.025)], x0, x1, axis='X')
    n = max(1, round(L / 0.66))
    pw = L / n
    for k in range(n):
        px = x0 + pw / 2 + k * pw
        if pw < 0.3: continue
        M.box(wood_dk, (pw - 0.12, 0.02, 0.58), (px, T / 2 + 0.035, 0.22), bevel=0.012)
        M.box(wood_lt, (pw - 0.2, 0.02, 0.5), (px, T / 2 + 0.047, 0.26), bevel=0.014)


CAP = [(-0.13, H - 0.03), (-0.15, H), (-0.15, H + 0.09), (-0.12, H + 0.12), (0.12, H + 0.12), (0.15, H + 0.09), (0.15, H), (0.13, H - 0.03)]


def cap(M, x0, x1):
    # the thick dark cap along the top, flat at its ends so panels join without a notch
    even(M.prism(wood_dk, CAP, x0, x1, axis='X'))
    even(M.box(wood, (x1 - x0, 0.03, 0.06), ((x0 + x1) / 2, T / 2 + 0.015, H - 0.11), bevel=0))


def arc(r, a0, a1, n, zc):
    return [(r * math.cos(a0 + (a1 - a0) * i / n), zc + r * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]


def spandrels(M, r, zc, n=8):
    # the plaster between a round-topped opening and the square above it
    for side in (1, -1):
        pts = [(side * x, z) for x, z in arc(r, 0, math.pi / 2, n, zc)] + [(side * r, zc + r)]
        even(M.prism(plaster, pts, -T / 2, T / 2, axis='Y'), 0.86, (WH, H))


# ---------- plain wall ----------
if want("wall-plain"):
    M = Model("wall-plain")
    plaster_block(M, -W / 2, W / 2, WH, H)
    wainscot(M, -W / 2, W / 2)
    cap(M, -W / 2, W / 2)
    out.append(M.finish())

# ---------- arched window wall ----------
if want("wall-window"):
    M = Model("wall-window")
    R, Z0, ZS = 0.55, 1.12, 2.0     # opening: half width, sill height, where the arch starts
    plaster_block(M, -W / 2, -R, WH, H); plaster_block(M, R, W / 2, WH, H)
    plaster_block(M, -R, R, ZS + R, H); plaster_block(M, -R, R, WH, Z0)
    spandrels(M, R, ZS)
    wainscot(M, -W / 2, W / 2)
    cap(M, -W / 2, W / 2)
    FI, FO = R - 0.08, R + 0.07     # the frame laps over the edge of the plaster
    for side in (1, -1):
        M.box(wood_dk, (FO - FI, T + 0.08, ZS - Z0 + 0.01), (side * (FI + FO) / 2, 0, Z0), bevel=0.02)
    ring = arc(FO, 0, math.pi, 16, ZS) + list(reversed(arc(FI, 0, math.pi, 16, ZS)))
    even(M.prism(wood_dk, ring, -T / 2 - 0.04, T / 2 + 0.04, axis='Y'))
    M.box(wood_dk, (2 * FO + 0.16, T + 0.22, 0.07), (0, 0.05, Z0 - 0.07), bevel=0.02)          # deep sill
    M.box(wood, (2 * FO + 0.04, 0.04, 0.1), (0, T / 2 + 0.035, Z0 - 0.17), bevel=0.015)         # apron under it
    glass = mat("wall_glass", "#FFF2CF", 0.1, alpha=0.55, emit=1.3)
    pane = [(-FI, Z0), (FI, Z0)] + arc(FI, 0, math.pi, 16, ZS)
    M.prism(glass, pane, -0.01, 0.01, axis='Y')
    for x in (-FI / 3, FI / 3):                                                                  # glazing bars
        top = ZS + math.sqrt(FI * FI - x * x)
        M.box(wood_dk, (0.045, 0.07, top - Z0), (x, 0, Z0), bevel=0.01)
    for z in (Z0 + (ZS - Z0) / 3, Z0 + 2 * (ZS - Z0) / 3, ZS):
        M.box(wood_dk, (2 * FI, 0.07, 0.045), (0, 0, z - 0.0225), bevel=0.01)
    hw = math.sqrt(FI * FI - 0.27 * 0.27)
    M.box(wood_dk, (2 * hw, 0.07, 0.045), (0, 0, ZS + 0.27), bevel=0.01)
    out.append(M.finish())

# ---------- doorway wall ----------
DR, DS = 0.55, 1.6          # arch radius, height where the arch starts
if want("wall-doorway"):
    M = Model("wall-doorway")
    # arched opening that matches door-arched: 1.1 m wide, straight sides to 1.6 m, round top to 2.15 m
    plaster_block(M, -W / 2, -DR, WH, H); plaster_block(M, DR, W / 2, WH, H)
    plaster_block(M, -DR, DR, DS + DR, H)
    spandrels(M, DR, DS)
    wainscot(M, -W / 2, -DR - 0.06); wainscot(M, DR + 0.06, W / 2)
    cap(M, -W / 2, W / 2)
    for x in (-DR - 0.05, DR + 0.05):                       # straight sides of the frame
        M.box(wood_dk, (0.1, T + 0.08, DS + 0.01), (x, 0, 0), bevel=0.025)
    ring = arc(DR + 0.1, 0, math.pi, 16, DS) + list(reversed(arc(DR, 0, math.pi, 16, DS)))
    even(M.prism(wood_dk, ring, -T / 2 - 0.04, T / 2 + 0.04, axis='Y'))   # arched top of the frame
    M.box(wood_lt, (0.14, 0.05, 0.16), (0, T / 2 + 0.03, DS + DR), bevel=0.02)                # keystone
    out.append(M.finish())

# ---------- the post where two walls meet ----------
if want("wall-corner"):
    M = Model("wall-corner")
    even(M.box(plaster, (T, T, H), (0, 0, 0), bevel=0), 0.86, (WH, H))
    even(M.box(wood_dk, (0.32, 0.32, 0.165), (0, 0, H - 0.03), bevel=0.03))
    out.append(M.finish())

# ---------- arched door leaf ----------
if want("door-arched"):
    M = Model("door-arched")
    door = mat("door_wood", "walnut_lt", 0.6)
    groove = mat("door_groove", "walnut_dk", 0.6)
    iron = mat("door_iron", "#3A302C", 0.5)
    br = mat("door_brass", "brass", 0.35, metal=1.0)
    R = 0.54; rect = 1.6; th = 0.06   # fills the arched opening of wall-doorway (1.1 m wide, 2.15 m tall)
    even(M.box(door, (2 * R, th, rect), (0, 0, 0), bevel=0.015), 0.82, (0, rect + R))
    even(M.cyl(door, R, th, (0, -th / 2, rect), verts=24, rot=(math.radians(-90), 0, 0), bevel=0.012), 0.82, (0, rect + R))
    for k in (-1.5, -0.5, 0.5, 1.5):              # the joints between its boards
        x = k * 2 * R / 5
        top = rect + math.sqrt(R * R - x * x) - 0.03
        even(M.box(groove, (0.014, th + 0.006, top - 0.03), (x, 0, 0.03), bevel=0))
    for side in (1, -1):                          # both faces: strap hinges, a ring round the window, a knob
        face = side * th / 2
        for z in (0.32, 1.38):
            M.box(iron, (0.62, 0.014, 0.07), (-R + 0.31, face + side * 0.004, z), bevel=0.006)
        M.torus(groove, 0.2, 0.035, (0, face, rect + 0.05), rot=(math.radians(90), 0, 0), maj=24, mn=8)
        M.sphere(br, 0.04, (0.38, face + side * 0.04, 1.0), seg=12, rings=8)
        M.cyl(br, 0.015, 0.04, (0.38, face, 1.0), verts=8, rot=(math.radians(-90 * side), 0, 0), bevel=0)
    M.cyl(mat("door_glass", "#FFE7AE", 0.1, emit=0.9), 0.19, th + 0.02, (0, -th / 2 - 0.01, rect + 0.05), verts=20, rot=(math.radians(-90), 0, 0), bevel=0.006)
    for z in (0.3, 1.45):                         # hinge pins on the left edge (x = -R)
        M.cyl(iron, 0.018, 0.14, (-R - 0.005, 0, z), verts=10, bevel=0.004)
    out.append(M.finish())

result = {"models": out}
