# Cozy decor, each its own model: floor-lamp, wall-clock, round-table,
# armchair, bookshelf. Fronts face +Y.
import math, random
g = globals()
exec(open(r"C:\Users\seanc\Projects\scent-roads\blender\lib.py").read(), g)
random.seed(5)
out = []

# ---------- floor lamp ----------
M = Model("floor-lamp")
wood = mat("lamp_wood", "honey", 0.5)
shade = mat("lamp_shade", "butter", 0.7)
fringe = mat("lamp_fringe", "pink", 0.7)
M.cyl(wood, 0.17, 0.04, (0, 0, 0), verts=20, r2=0.15, bevel=0.015)
M.cyl(wood, 0.022, 1.25, (0, 0, 0.04), verts=10, bevel=0)
for z in (0.35, 0.8):
    M.sphere(wood, 0.04, (0, 0, z), seg=12, rings=8)                         # turned knobs
M.lathe(shade, [(0.24, 1.18), (0.25, 1.19), (0.15, 1.5), (0.13, 1.5), (0, 1.5)], verts=20)
for i in range(16):
    a = 2 * math.pi * i / 16
    M.sphere(fringe, 0.03, (math.cos(a) * 0.245, math.sin(a) * 0.245, 1.17), seg=8, rings=6)
M.sphere(fringe, 0.035, (0, 0, 1.53), seg=10, rings=6)
out.append(M.finish())

# ---------- wall clock (back at y = 0, hangs on a wall) ----------
M = Model("wall-clock")
rim = mat("clock_rim", "honey", 0.5)
face = mat("clock_face", "cream", 0.7)
ink = mat("clock_ink", "ink", 0.6)
accent = mat("clock_accent", "mint", 0.6)
R = 0.22
M.cyl(rim, R, 0.06, (0, 0, R + 0.02), verts=32, rot=(math.radians(-90), 0, 0), bevel=0.02)
M.cyl(face, R - 0.035, 0.02, (0, 0.05, R + 0.02), verts=32, rot=(math.radians(-90), 0, 0), bevel=0.006)
for k in range(12):
    a = 2 * math.pi * k / 12
    r = 0.012 if k % 3 else 0.02
    M.sphere(accent if k % 3 == 0 else ink, r, (math.cos(a) * 0.15, 0.072, R + 0.02 + math.sin(a) * 0.15), scale=(1, 0.4, 1), seg=8, rings=6)
M.box(ink, (0.018, 0.01, 0.1), (0, 0.075, R + 0.02), bevel=0.004, rot=(0, math.radians(-50), 0))   # hour hand
M.box(ink, (0.012, 0.01, 0.14), (0, 0.082, R + 0.02), bevel=0.003, rot=(0, math.radians(20), 0))   # minute hand
M.sphere(rim, 0.018, (0, 0.088, R + 0.02), seg=10, rings=6)
M.sphere(accent, 0.035, (0, 0.03, 2 * R + 0.035), seg=12, rings=8)            # bobble on top
out.append(M.finish())

# ---------- round table with a lace cloth ----------
M = Model("round-table")
wood = mat("table_wood", "honey", 0.5)
cloth = mat("table_cloth", "white", 0.85)
M.cyl(wood, 0.26, 0.05, (0, 0, 0), verts=20, r2=0.22, bevel=0.018)
M.lathe(wood, [(0.05, 0.05), (0.07, 0.12), (0.045, 0.3), (0.06, 0.5), (0.05, 0.66), (0.09, 0.68), (0, 0.68)], verts=12)
M.cyl(wood, 0.42, 0.05, (0, 0, 0.67), verts=28, bevel=0.018)
M.cyl(cloth, 0.36, 0.012, (0, 0, 0.72), verts=28, bevel=0.004, segs=1)
for i in range(14):
    a = 2 * math.pi * i / 14
    M.cyl(cloth, 0.07, 0.012, (math.cos(a) * 0.35, math.sin(a) * 0.35, 0.72), verts=10, bevel=0)
out.append(M.finish())

# ---------- armchair ----------
M = Model("armchair")
fab = mat("armchair_fabric", "rose", 0.85)
cush = mat("armchair_cushion", "pink", 0.85)
feet = mat("armchair_feet", "darkwood", 0.5)
for sx in (-1, 1):
    for sy in (-1, 1):
        M.sphere(feet, 0.045, (sx * 0.3, sy * 0.27, 0.045), scale=(1, 1, 0.9), seg=10, rings=6)
M.box(fab, (0.8, 0.72, 0.3), (0, 0, 0.08), bevel=0.1, segs=4)                 # base
M.box(cush, (0.52, 0.58, 0.14), (0, 0.05, 0.34), bevel=0.06, segs=4)          # seat cushion
M.box(fab, (0.8, 0.22, 0.62), (0, -0.25, 0.3), bevel=0.1, segs=4)            # back
for sx in (-1, 1):
    M.box(fab, (0.16, 0.7, 0.3), (sx * 0.32, 0.0, 0.32), bevel=0.075, segs=4)  # arms
M.sphere(mat("armchair_pillow", "butter", 0.85), 0.14, (0.08, -0.08, 0.6), scale=(1, 0.45, 0.85), seg=12, rings=8, rot=(math.radians(-15), 0, math.radians(10)))
out.append(M.finish())

# ---------- bookshelf ----------
M = Model("bookshelf")
wood = mat("books_wood", "lightwood", 0.55)
dark = mat("books_back", "darkwood", 0.65)
cols = [mat(f"books_{c}", c, 0.65) for c in ("pink", "sky", "butter", "sage", "lilac", "rose")]
W, D, Hh = 0.9, 0.32, 1.8
M.box(dark, (W - 0.06, 0.02, Hh - 0.08), (0, -D / 2 + 0.02, 0.04), bevel=0.006)
for sx in (-1, 1):
    M.box(wood, (0.05, D, Hh), (sx * (W / 2 - 0.025), 0, 0), bevel=0.018)
shelves = [0.04, 0.46, 0.88, 1.3, 1.72]
for z in shelves:
    M.box(wood, (W, D, 0.04), (0, 0, z), bevel=0.014)
M.box(wood, (W + 0.06, D + 0.04, 0.06), (0, 0, Hh - 0.02), bevel=0.025)       # crown
for z in shelves[:-1]:
    x = -W / 2 + 0.07
    while x < W / 2 - 0.12:
        w = random.uniform(0.035, 0.06); h = random.uniform(0.24, 0.34)
        if random.random() < 0.12:   # a little gap with a leaning book
            M.box(random.choice(cols), (w, 0.2, h), (x + 0.06, 0.0, z + 0.04), bevel=0.008, segs=1, rot=(0, math.radians(-18), 0))
            x += 0.13; continue
        M.box(random.choice(cols), (w, random.uniform(0.18, 0.24), h), (x + w / 2, 0.0, z + 0.04), bevel=0.008, segs=1)
        x += w + 0.004
# a plant and a jar on top
M.lathe(mat("books_pot", "terracotta", 0.7), [(0, 0), (0.06, 0), (0.075, 0.12), (0, 0.12)], (0.22, 0, Hh + 0.04), verts=12)
for i in range(5):
    a = 2 * math.pi * i / 5
    M.sphere(mat("books_leaf", "leaf", 0.6), 1.0, (0.22 + math.cos(a) * 0.08, math.sin(a) * 0.08, Hh + 0.2),
             scale=(0.09, 0.05, 0.018), seg=10, rings=6, rot=(0, math.radians(-30), a))
out.append(M.finish())

result = {"models": out}
