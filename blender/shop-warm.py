# Furniture and dressing for the warm shop look (Nov 10):
#   shelf-tall-a, shelf-tall-b (dark shelf units with cupboards, stocked with bottles and books),
#   sideboard (low cabinet for under a window), display-table (eight-sided, bottles under a glass
#   dome), rug-runner, rug-round, wall-sconce, shop-sign, door-curtain, plant-leafy,
#   chest-armillary, ivy-window (trails round an arched window of wall-window).
# Set ONLY = ["sideboard", ...] before running to rebuild just those.
import math, random
g = globals()
exec(open(r"C:\Users\seanc\Projects\scent-roads\blender\lib.py").read(), g)
out = []
ONLY = g.get("ONLY")


def want(name):
    return not ONLY or name in ONLY


walnut = mat("w_walnut", "walnut", 0.6)
walnut_lt = mat("w_walnut_lt", "walnut_lt", 0.6)
walnut_dk = mat("w_walnut_dk", "walnut_dk", 0.6)
mahog = mat("w_mahogany", "mahogany", 0.55)
gold = mat("w_gold", "gold", 0.3)                       # polished, painted (not a metal material)
brass = mat("w_brass", "brass", 0.35, metal=1.0)
burgundy = mat("w_burgundy", "burgundy", 0.85)
wine = mat("w_wine", "wine", 0.85)
forest = mat("w_forest", "forest", 0.85)
leaf = mat("w_leaf", "leaf", 0.7)
leaf_dk = mat("w_leaf_dk", "deepleaf", 0.7)
china = mat("w_china", "white", 0.3)
paper = mat("w_paper", "paper", 0.8)

GEMS = ["#2FA39A", "#C8473F", "#E6A93A", "#7C5AB8", "#3B7CC2", "#59A856", "#DB6F93", "#EADBB2", "#D9662B"]
BOOKS = ["#8E2B3D", "#3E6B55", "#2F4B7A", "#C9973F", "#6E1F30", "#5A3A6A", "#B5673A"]


def even(o, lo=1.0, span=None):
    o["shade"] = lo
    if span: o["zspan"] = span
    return o


def bottle(M, rnd, x, y, z, s=1.0, kind=None, col=None):
    """A little perfume bottle standing at (x, y, z): four shapes, jewel colours, gold stopper."""
    col = col or rnd.choice(GEMS)
    kind = rnd.randrange(4) if kind is None else kind
    m = mat("gem_" + col[1:], col, 0.22)
    if kind == 0:      # round flask
        even(M.lathe(m, [(0, 0), (0.03 * s, 0), (0.05 * s, 0.03 * s), (0.05 * s, 0.07 * s), (0.02 * s, 0.1 * s), (0.016 * s, 0.125 * s), (0, 0.125 * s)], (x, y, z), verts=10), 0.75)
        M.sphere(gold, 0.02 * s, (x, y, z + 0.14 * s), seg=8, rings=6)
    elif kind == 1:    # tall square
        even(M.box(m, (0.06 * s, 0.06 * s, 0.15 * s), (x, y, z), bevel=0.012 * s, segs=2), 0.75)
        M.cyl(gold, 0.017 * s, 0.035 * s, (x, y, z + 0.15 * s), verts=8, bevel=0.004)
    elif kind == 2:    # squat jar with a ball
        even(M.lathe(m, [(0, 0), (0.045 * s, 0), (0.06 * s, 0.025 * s), (0.055 * s, 0.06 * s), (0.02 * s, 0.075 * s), (0, 0.075 * s)], (x, y, z), verts=10), 0.75)
        M.sphere(gold, 0.026 * s, (x, y, z + 0.095 * s), seg=8, rings=6)
    else:              # slender cone
        even(M.lathe(m, [(0, 0), (0.04 * s, 0), (0.042 * s, 0.02 * s), (0.015 * s, 0.15 * s), (0, 0.15 * s)], (x, y, z), verts=10), 0.75)
        M.cyl(gold, 0.013 * s, 0.03 * s, (x, y, z + 0.15 * s), verts=8, bevel=0.003)


def books(M, rnd, x, y, z, n, lean=False):
    """A row of n books starting at x, spines to the front. Returns the x where it ends."""
    for k in range(n):
        w = rnd.uniform(0.035, 0.06); h = rnd.uniform(0.2, 0.28); d = rnd.uniform(0.16, 0.2)
        m = mat("book_" + str(rnd.randrange(len(BOOKS))), BOOKS[rnd.randrange(len(BOOKS))], 0.7)
        tilt = math.radians(-12) if lean and k == n - 1 else 0
        even(M.box(m, (w, d, h), (x + w / 2 + (0.02 if tilt else 0), y, z), bevel=0.004, segs=1, rot=(0, tilt, 0)), 0.8)
        x += w + 0.004
    return x


def row(M, rnd, x0, x1, y, z, mix=0.0, big=1.0):
    """Fills a shelf from x0 to x1 with bottles, and now and then a run of books."""
    x = x0
    while x < x1 - 0.08:
        if rnd.random() < mix and x1 - x > 0.4:
            x = books(M, rnd, x, y - 0.03, z, rnd.randint(3, 5), lean=rnd.random() < 0.5) + 0.05
        else:
            s = rnd.uniform(0.95, 1.3) * big
            bottle(M, rnd, x + 0.06 * s, y + rnd.uniform(-0.03, 0.03), z, s)
            x += 0.12 * s + rnd.uniform(0.02, 0.06)


def leaf_at(M, m, base, az, tilt, stem, size, stem_m=None):
    """A stem from base, leaning tilt from upright towards az, with a leaf at its end."""
    d = (math.sin(tilt) * math.sin(az), -math.sin(tilt) * math.cos(az), math.cos(tilt))
    rot = (tilt, 0, az)
    if stem > 0.03:
        even(M.cyl(stem_m or m, 0.012, stem, base, verts=6, rot=rot, bevel=0))
    c = (base[0] + d[0] * (stem + size * 0.8), base[1] + d[1] * (stem + size * 0.8), base[2] + d[2] * (stem + size * 0.8))
    lrot = (tilt + math.radians(25), 0, az)     # the blade droops a little past its stem
    even(M.sphere(m, size, c, scale=(0.62, 0.1, 1.0), seg=8, rings=6, rot=lrot), 0.8)


def trailing(M, rnd, x, y, z, n=9, drop=0.5, side=1):
    """A pot whose plant trails down over the edge (shelf tops)."""
    M.lathe(china, [(0, 0), (0.07, 0), (0.095, 0.11), (0.1, 0.13), (0.08, 0.13), (0, 0.11)], (x, y, z), verts=12)
    for k in range(6):
        leaf_at(M, leaf, (x, y, z + 0.12), rnd.uniform(0, 6.28), rnd.uniform(0.5, 1.2), 0.03, rnd.uniform(0.06, 0.09))
    for k in range(n):       # the trail: small leaves down the front corner
        t = (k + 1) / n
        px = x + side * (0.08 + 0.05 * math.sin(k * 1.7)); py = y + 0.12 + 0.03 * math.cos(k * 2.3)
        m = leaf if k % 2 else leaf_dk
        even(M.sphere(m, 0.05, (px, py, z + 0.1 - drop * t), scale=(0.75, 0.3, 1.0), seg=8, rings=6, rot=(0.3, rnd.uniform(-0.5, 0.5), 0)), 0.8)


def cupboard_doors(M, x0, x1, n, y, z0, z1):
    """n panelled doors across the front, each with a knob."""
    w = (x1 - x0) / n
    for k in range(n):
        cx = x0 + w / 2 + k * w
        M.box(walnut_dk, (w - 0.04, 0.02, z1 - z0), (cx, y, z0), bevel=0.01)
        M.box(walnut_lt, (w - 0.14, 0.02, z1 - z0 - 0.1), (cx, y + 0.012, z0 + 0.05), bevel=0.012)
        kx = cx + (w / 2 - 0.045) * (1 if k % 2 == 0 else -1)
        M.sphere(gold, 0.02, (kx, y + 0.03, (z0 + z1) / 2 + 0.05), seg=8, rings=6)


# ---------- tall shelf units ----------
def shelf_tall(name, seed, mix, plant_side):
    rnd = random.Random(seed)
    M = Model(name)
    Wd, D, CH = 1.6, 0.42, 0.86        # width, depth, cupboard height
    M.box(mahog, (Wd + 0.04, D + 0.02, 0.1), (0, 0, 0), bevel=0.015)                     # plinth
    even(M.box(walnut, (Wd, D, CH - 0.1), (0, 0, 0.1), bevel=0.012), 0.8)
    cupboard_doors(M, -Wd / 2 + 0.03, Wd / 2 - 0.03, 3, D / 2, 0.16, CH - 0.04)
    M.box(mahog, (Wd + 0.06, D + 0.04, 0.05), (0, 0, CH), bevel=0.015)                   # cupboard top
    top = 2.32
    even(M.box(mahog, (Wd - 0.02, 0.04, top - CH), (0, -D / 2 + 0.04, CH + 0.04), bevel=0), 0.7)   # dark back
    for sx in (-1, 1):
        even(M.box(walnut, (0.055, 0.34, top - CH - 0.04), (sx * (Wd / 2 - 0.0275), -0.03, CH + 0.05), bevel=0.01), 0.85)
    levels = [CH + 0.05, 1.37, 1.82]
    for z in levels[1:]:
        M.box(walnut_lt, (Wd - 0.1, 0.32, 0.035), (0, -0.03, z - 0.035), bevel=0.008)
    M.box(mahog, (Wd + 0.08, 0.4, 0.07), (0, -0.01, top), bevel=0.02)                    # top and cornice
    M.box(walnut, (Wd + 0.02, 0.37, 0.05), (0, -0.02, top - 0.05), bevel=0.012)
    for i, z in enumerate(levels):
        row(M, rnd, -Wd / 2 + 0.1, Wd / 2 - 0.1, 0.0, z, mix=mix if i else mix * 0.5, big=1.15 if i == 0 else 1.0)
    trailing(M, rnd, plant_side * (Wd / 2 - 0.2), 0.0, top + 0.07, side=plant_side)
    if mix > 0.3:
        books(M, rnd, -plant_side * 0.5 - 0.1, -0.02, top + 0.07, 4, lean=True)
    else:
        bottle(M, rnd, -plant_side * 0.4, 0, top + 0.07, 1.6, kind=0)
        bottle(M, rnd, -plant_side * 0.15, 0.02, top + 0.07, 1.3, kind=3)
    return M.finish()


if want("shelf-tall-a"): out.append(shelf_tall("shelf-tall-a", 5, 0.15, 1))
if want("shelf-tall-b"): out.append(shelf_tall("shelf-tall-b", 9, 0.45, -1))

# ---------- sideboard ----------
if want("sideboard"):
    rnd = random.Random(3)
    M = Model("sideboard")
    Wd, D, Ht = 1.5, 0.45, 0.8
    for sx in (-1, 1):
        for sy in (-1, 1):
            M.cyl(mahog, 0.035, 0.1, (sx * (Wd / 2 - 0.08), sy * (D / 2 - 0.07), 0), verts=10, r2=0.045, bevel=0.005)
    even(M.box(walnut, (Wd, D, Ht - 0.14), (0, 0, 0.1), bevel=0.012), 0.8)
    cupboard_doors(M, -Wd / 2 + 0.03, Wd / 2 - 0.03, 4, D / 2, 0.14, Ht - 0.07)
    M.box(mahog, (Wd + 0.07, D + 0.05, 0.05), (0, 0, Ht - 0.04), bevel=0.015)
    z = Ht + 0.01
    even(M.box(paper, (0.5, 0.26, 0.006), (0.05, 0.02, z), bevel=0), 1)                   # a linen runner
    # a vase of white flowers
    M.lathe(mat("w_vase", "#3E6B8C", 0.25), [(0, 0), (0.05, 0), (0.08, 0.06), (0.07, 0.15), (0.04, 0.2), (0.05, 0.23), (0, 0.21)], (-0.5, 0, z), verts=12)
    for k in range(7):
        az = k * 2.4; tl = 0.25 + 0.12 * (k % 3)
        d = (math.sin(tl) * math.sin(az), -math.sin(tl) * math.cos(az), math.cos(tl))
        L = 0.2 + 0.03 * (k % 4)
        even(M.cyl(leaf_dk, 0.006, L, (-0.5, 0, z + 0.2), verts=5, rot=(tl, 0, az), bevel=0))
        M.sphere(china, 0.04, (-0.5 + d[0] * L, d[1] * L, z + 0.2 + d[2] * L), scale=(1, 1, 0.8), seg=8, rings=6)
        if k % 2:
            even(M.sphere(leaf, 0.05, (-0.5 + d[0] * L * 0.6, d[1] * L * 0.6, z + 0.2 + d[2] * L * 0.55), scale=(0.6, 0.2, 1), seg=6, rings=4, rot=(tl + 0.6, 0, az + 1)), 0.8)
    for x, s, k in ((-0.12, 1.5, 0), (0.06, 1.25, 3), (0.22, 1.35, 1), (0.52, 1.6, 2), (0.36, 1.1, 0)):
        bottle(M, rnd, x, 0.02 + (0.05 if k == 3 else 0), z + (0.006 if x < 0.3 else 0), s, kind=k)
    out.append(M.finish())

# ---------- eight-sided display table ----------
if want("display-table"):
    rnd = random.Random(4)
    M = Model("display-table")
    turn = (0, 0, math.radians(22.5))
    M.cyl(mahog, 0.42, 0.07, (0, 0, 0), verts=8, bevel=0.015, rot=turn)
    M.lathe(walnut, [(0, 0.06), (0.2, 0.06), (0.12, 0.14), (0.09, 0.4), (0.14, 0.58), (0.3, 0.66), (0, 0.66)], (0, 0, 0), verts=8)
    even(M.cyl(walnut, 0.56, 0.1, (0, 0, 0.66), verts=8, bevel=0.01, rot=turn), 0.85)
    M.cyl(mahog, 0.66, 0.055, (0, 0, 0.76), verts=8, bevel=0.015, rot=turn)
    zt = 0.815
    even(M.cyl(burgundy, 0.45, 0.02, (0, 0, zt), verts=24, bevel=0.006))                 # velvet pad
    M.torus(brass, 0.4, 0.016, (0, 0, zt + 0.025), maj=28, mn=6)
    for k, (r, s, kind) in enumerate(((0, 1.9, 0), (0.22, 1.4, 1), (0.22, 1.3, 2), (0.22, 1.5, 3), (0.22, 1.3, 0), (0.22, 1.35, 2))):
        a = k * 2 * math.pi / 5
        bottle(M, rnd, r * math.cos(a), r * math.sin(a), zt + 0.02, s, kind=kind, col=GEMS[k % len(GEMS)])
    dome = mat("w_dome", "#F4FBFF", 0.05, alpha=0.2)
    prof = [(0.385, 0)] + [(0.385 * math.cos(t), 0.2 + 0.3 * math.sin(t)) for t in [i * math.pi / 2 / 6 for i in range(7)]]
    M.lathe(dome, prof[:-1] + [(0.03, 0.5)], (0, 0, zt + 0.02), verts=20)
    M.sphere(brass, 0.04, (0, 0, zt + 0.55), seg=10, rings=8)
    out.append(M.finish())

# ---------- rugs ----------
if want("rug-runner"):
    M = Model("rug-runner", shade=1)
    L, Wd = 3.6, 1.3
    M.box(wine, (L, Wd, 0.012), (0, 0, 0), bevel=0.004, segs=1)
    M.box(gold, (L - 0.16, Wd - 0.16, 0.003), (0, 0, 0.012), bevel=0)
    M.box(burgundy, (L - 0.26, Wd - 0.26, 0.003), (0, 0, 0.014), bevel=0)
    q = math.radians(45)
    n = 5
    for k in range(n):
        x = (k - (n - 1) / 2) * 0.62
        M.box(gold, (0.36, 0.36, 0.003), (x, 0, 0.016), bevel=0, rot=(0, 0, q))
        M.box(wine, (0.27, 0.27, 0.003), (x, 0, 0.018), bevel=0, rot=(0, 0, q))
        M.box(gold, (0.1, 0.1, 0.003), (x, 0, 0.02), bevel=0, rot=(0, 0, q))
        if k < n - 1:
            for sy in (-1, 1):
                M.box(gold, (0.1, 0.1, 0.003), (x + 0.31, sy * 0.3, 0.016), bevel=0, rot=(0, 0, q))
    for sx in (-1, 1):       # fringe
        for k in range(16):
            M.box(paper, (0.07, 0.05, 0.006), (sx * (L / 2 + 0.03), -Wd / 2 + 0.065 + k * (Wd - 0.13) / 15, 0), bevel=0)
    out.append(M.finish(elev=50))

if want("rug-round"):
    M = Model("rug-round", shade=1)
    M.cyl(mat("w_forest_dk", "#2F5443", 0.85), 1.3, 0.012, (0, 0, 0), verts=48, bevel=0.004, segs=1)
    M.cyl(gold, 1.2, 0.003, (0, 0, 0.012), verts=48, bevel=0)
    M.cyl(forest, 1.14, 0.003, (0, 0, 0.014), verts=48, bevel=0)
    M.cyl(gold, 0.52, 0.003, (0, 0, 0.016), verts=32, bevel=0)
    M.cyl(mat("w_forest_dk", "#2F5443", 0.85), 0.47, 0.003, (0, 0, 0.018), verts=32, bevel=0)
    for k in range(8):       # a ring of roses, and a bigger one in the middle
        a = k * math.pi / 4
        cx, cy = 0.83 * math.cos(a), 0.83 * math.sin(a)
        M.cyl(gold, 0.15, 0.003, (cx, cy, 0.016), verts=10, bevel=0)
        M.cyl(burgundy, 0.1, 0.003, (cx, cy, 0.018), verts=8, bevel=0)
        M.cyl(gold, 0.04, 0.003, (cx, cy, 0.02), verts=6, bevel=0)
        b = a + math.pi / 8
        M.box(gold, (0.2, 0.05, 0.003), (0.83 * math.cos(b), 0.83 * math.sin(b), 0.016), bevel=0, rot=(0, 0, b + math.pi / 2))
    for k in range(6):
        a = k * math.pi / 3
        M.cyl(gold, 0.11, 0.003, (0.2 * math.cos(a), 0.2 * math.sin(a), 0.02), verts=10, bevel=0)
    M.cyl(burgundy, 0.16, 0.003, (0, 0, 0.022), verts=12, bevel=0)
    M.cyl(gold, 0.06, 0.003, (0, 0, 0.024), verts=8, bevel=0)
    out.append(M.finish(elev=50))

# ---------- wall sconce (hangs at the height it is placed; its back is at y = 0) ----------
if want("wall-sconce"):
    M = Model("wall-sconce", ground=False)
    M.cyl(brass, 0.065, 0.02, (0, 0, 0), verts=14, rot=(math.radians(-90), 0, 0), bevel=0.005)      # wall plate
    M.cyl(brass, 0.013, 0.14, (0, 0.01, -0.01), verts=8, rot=(math.radians(-90), 0, 0), bevel=0)    # arm
    M.cyl(brass, 0.05, 0.02, (0, 0.15, -0.02), verts=12, r2=0.06, bevel=0.004)                      # cup
    shade = mat("w_lamp_glow", "glow", 0.5, emit=2.2)
    M.lathe(shade, [(0, 0), (0.06, 0), (0.095, 0.03), (0.075, 0.17), (0.05, 0.2), (0, 0.2)], (0, 0.15, 0), verts=12)
    M.sphere(brass, 0.018, (0, 0.15, 0.21), seg=8, rings=6)
    out.append(M.finish(pad=2.0))

# ---------- the shop sign (hangs with its bottom edge at the height it is placed; its back is at y = 0) ----------
if want("shop-sign"):
    M = Model("shop-sign", ground=False, shade=1)

    def oval(rx, rz, n=28, cx=0.0, cz=0.0):
        return [(cx + rx * math.cos(2 * math.pi * i / n), cz + rz * math.sin(2 * math.pi * i / n)) for i in range(n)]

    M.prism(mahog, oval(0.72, 0.46), 0, 0.05, axis='Y')
    M.prism(gold, oval(0.66, 0.4), 0.05, 0.058, axis='Y')
    M.prism(walnut, oval(0.63, 0.37), 0.05, 0.066, axis='Y')
    y0, y1 = 0.066, 0.085
    M.prism(gold, oval(0.17, 0.15, 20, 0, -0.07), y0, y1, axis='Y')                       # the bottle
    M.prism(gold, [(-0.035, 0.05), (0.035, 0.05), (0.035, 0.135), (-0.035, 0.135)], y0, y1, axis='Y')
    M.prism(gold, [(-0.06, 0.135), (0.06, 0.135), (0.06, 0.165), (-0.06, 0.165)], y0, y1, axis='Y')
    M.prism(gold, [(0, 0.165), (0.055, 0.225), (0, 0.3), (-0.055, 0.225)], y0, y1, axis='Y')
    M.prism(paper, oval(0.04, 0.055, 12, -0.05, -0.05), y1, y1 + 0.004, axis='Y')         # a gleam
    for sx in (-1, 1):                                                                    # sprigs either side
        for k in range(5):
            a = math.radians(150 + k * 25) if sx < 0 else math.radians(30 - k * 25)
            cx, cz = 0.4 * math.cos(a), 0.24 * math.sin(a) - 0.02
            pts = oval(0.075, 0.03, 10)
            t = a + math.pi / 2 + (0.5 if k % 2 else -0.5); ca, sa = math.cos(t), math.sin(t)
            M.prism(gold, [(cx + x * ca - z * sa, cz + x * sa + z * ca) for x, z in pts], y0, y0 + 0.012, axis='Y')
    for sx in (-1, 1):                                                                    # brackets it hangs from
        M.box(mahog, (0.05, 0.07, 0.12), (sx * 0.4, 0.035, 0.4), bevel=0.01)
    for o in M.parts: o.location.z += 0.46                                               # its bottom edge at the origin
    out.append(M.finish())

# ---------- curtained doorway (stands in a wall-doorway; the room side is +Y) ----------
if want("door-curtain"):
    M = Model("door-curtain")
    yc, top = 0.12, 2.26

    def drape(x0, x1, phase):
        n = 14; t = 0.035
        front = []; back = []
        for i in range(n + 1):
            x = x0 + (x1 - x0) * i / n
            w = 0.035 * math.sin(phase + i * 1.9)
            front.append((x, yc + w + t / 2)); back.append((x, yc + w - t / 2))
        return front + list(reversed(back))

    for (x0, x1, ph) in ((-0.68, 0.01, 0.0), (-0.01, 0.68, 1.1)):
        even(M.prism(burgundy, drape(x0, x1, ph), 0.09, top, axis='Z'), 0.62)
        even(M.prism(gold, drape(x0, x1, ph), 0.02, 0.09, axis='Z'))                      # gold hem
    M.cyl(brass, 0.022, 1.56, (-0.78, yc, top + 0.01), verts=10, rot=(0, math.radians(90), 0), bevel=0)   # rod
    for sx in (-1, 1):
        M.sphere(brass, 0.045, (sx * 0.8, yc, top + 0.01), seg=10, rings=8)
        M.box(mahog, (0.05, yc, 0.05), (sx * 0.72, yc / 2, top - 0.015), bevel=0.01)      # brackets to the wall
    for k in range(9):
        M.torus(brass, 0.03, 0.008, (-0.62 + k * 0.155, yc, top + 0.01), rot=(0, math.radians(90), 0), maj=10, mn=5)
    out.append(M.finish())

# ---------- big leafy plant ----------
if want("plant-leafy"):
    rnd = random.Random(8)
    M = Model("plant-leafy")
    M.lathe(china, [(0, 0), (0.15, 0), (0.17, 0.02), (0.22, 0.34), (0.235, 0.37), (0.2, 0.37), (0, 0.33)], (0, 0, 0), verts=14)
    M.cyl(mat("w_soil", "#4A3226", 0.9), 0.2, 0.02, (0, 0, 0.33), verts=14, bevel=0)
    for k in range(13):
        az = k * 2.39996 + rnd.uniform(-0.2, 0.2)
        tilt = 0.25 + 0.7 * (k / 12) + rnd.uniform(-0.08, 0.08)
        stem = 0.75 - 0.42 * (k / 12) + rnd.uniform(-0.05, 0.05)
        leaf_at(M, leaf if k % 3 else leaf_dk, (0.03 * math.sin(az), -0.03 * math.cos(az), 0.34), az, tilt, stem, 0.2 + 0.04 * rnd.random(), stem_m=leaf_dk)
    out.append(M.finish())

# ---------- chest with bottles and an armillary sphere ----------
if want("chest-armillary"):
    rnd = random.Random(12)
    M = Model("chest-armillary")
    Wd, D, Ht = 0.9, 0.44, 0.74
    M.box(mahog, (Wd + 0.03, D + 0.02, 0.08), (0, 0, 0), bevel=0.012)
    even(M.box(walnut, (Wd, D, Ht - 0.12), (0, 0, 0.08), bevel=0.012), 0.8)
    for k in range(3):
        z = 0.12 + k * 0.19
        M.box(walnut_lt, (Wd - 0.08, 0.02, 0.16), (0, D / 2, z), bevel=0.01)
        for sx in (-1, 1):
            M.sphere(gold, 0.018, (sx * 0.2, D / 2 + 0.025, z + 0.08), seg=8, rings=6)
    M.box(mahog, (Wd + 0.06, D + 0.05, 0.045), (0, 0, Ht - 0.04), bevel=0.014)
    z = Ht + 0.005
    for x, s, k in ((-0.33, 1.5, 1), (-0.2, 1.2, 2), (-0.08, 1.35, 3)):
        bottle(M, rnd, x, 0.03, z, s, kind=k)
    ax = 0.22                                    # the armillary: rings of brass round a little globe
    M.lathe(brass, [(0, 0), (0.07, 0), (0.075, 0.015), (0.02, 0.03), (0.012, 0.1), (0, 0.1)], (ax, 0, z), verts=10)
    c = (ax, 0, z + 0.22)
    M.torus(brass, 0.13, 0.008, c, rot=(math.radians(90), 0, 0), maj=20, mn=5)
    M.torus(brass, 0.125, 0.007, c, rot=(math.radians(90), 0, math.radians(90)), maj=20, mn=5)
    M.torus(brass, 0.12, 0.007, c, rot=(math.radians(23), 0, 0), maj=20, mn=5)
    M.torus(brass, 0.115, 0.006, c, rot=(math.radians(66), math.radians(30), 0), maj=20, mn=5)
    M.sphere(mat("w_orb", "#3B7CC2", 0.25), 0.035, c, seg=10, rings=8)
    out.append(M.finish())

# ---------- ivy round an arched window (same spot and turn as its wall-window panel) ----------
if want("ivy-window"):
    rnd = random.Random(21)
    M = Model("ivy-window", ground=False)
    R, ZS, Z0 = 0.7, 2.0, 1.12
    path = []
    for i in range(22):                              # over the arch from the right shoulder to the left
        a = math.radians(35 + i * 6.2)
        path.append((R * math.cos(a), ZS + R * math.sin(a)))
    for i in range(1, 12):                           # then down the left side
        path.append((-R - 0.01 + 0.03 * math.sin(i * 1.3), ZS + R * math.sin(math.radians(171)) - i * 0.085))
    for i, (x, z) in enumerate(path):
        for j in range(2):
            m = leaf_dk if (i + j) % 3 == 0 else leaf
            s = rnd.uniform(0.05, 0.075)
            even(M.sphere(m, s, (x + rnd.uniform(-0.05, 0.05), 0.17 + rnd.uniform(0, 0.05), z + rnd.uniform(-0.05, 0.05)),
                          scale=(0.8, 0.3, 1.0), seg=6, rings=4, rot=(rnd.uniform(-0.4, 0.4), rnd.uniform(0, 6.28), 0)), 0.75)
    for i in range(6):                               # a loose strand hanging in front of the glass
        even(M.sphere(leaf, 0.05, (0.42 + 0.03 * math.sin(i * 2.0), 0.16, ZS + 0.5 - i * 0.09), scale=(0.8, 0.3, 1.0), seg=6, rings=4,
                      rot=(0.2, rnd.uniform(0, 6.28), 0)), 0.75)
    out.append(M.finish())

result = {"models": out}
