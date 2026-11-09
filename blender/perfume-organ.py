# Perfumer's organ: a chunky desk with three stepped tiers of little bottles
# and an arched mint backboard. Front (the perfumer's side) faces +Y.
import math, random
g = globals()
exec(open(r"C:\Users\seanc\Projects\scent-roads\blender\lib.py").read(), g)
random.seed(7)

M = Model("perfume-organ")
top = mat("organ_top", "honey", 0.5)
body = mat("organ_body", "darkwood", 0.65)
trim = mat("organ_trim", "lightwood", 0.55)
brass = mat("organ_brass", "brass", 0.35, metal=1.0)
arch = mat("organ_arch", "mint", 0.6)
glass = [mat(f"organ_bottle_{c}", c, 0.2) for c in ("pink", "sky", "butter", "lilac")]

W, D, H = 1.5, 0.66, 0.78
# pedestals with drawers
for sx in (-1, 1):
    x = sx * (W / 2 - 0.22)
    M.box(body, (0.42, D - 0.04, H - 0.06), (x, 0, 0), bevel=0.025)
    for k in range(3):
        z = 0.06 + k * 0.215
        M.box(trim, (0.36, 0.03, 0.18), (x, D / 2 - 0.02, z), bevel=0.012)
        M.sphere(brass, 0.018, (x, D / 2 + 0.004, z + 0.09), seg=10, rings=6)
# modesty panel and top
M.box(body, (W - 0.8, 0.04, 0.42), (0, -D / 2 + 0.06, H - 0.48), bevel=0.012)
M.box(top, (W + 0.06, D + 0.04, 0.07), (0, 0, H - 0.07), bevel=0.03)

# stepped tiers along the back of the desk
tiers = []
z = H
for i, (depth, rise) in enumerate(((0.26, 0.09), (0.18, 0.09), (0.10, 0.09))):
    y = -D / 2 + 0.02 + depth / 2
    w = W - 0.06 - i * 0.12
    M.box(trim if i % 2 else top, (w, depth, rise), (0, y, z), bevel=0.018)
    z += rise
    tiers.append((y + depth / 2 - 0.045, z, w))
# backboard + arch behind the tiers
M.box(body, (W, 0.05, 0.42), (0, -D / 2 - 0.005, H), bevel=0.02)
M.cyl(arch, 0.5, 0.04, (0, -D / 2 - 0.02, H + 0.42), verts=24, rot=(math.radians(90), 0, 0), bevel=0.012)
M.cyl(body, 0.535, 0.03, (0, -D / 2 - 0.045, H + 0.42), verts=24, rot=(math.radians(90), 0, 0), bevel=0.01)
# little brass star at the top of the arch
M.sphere(brass, 0.035, (0, -D / 2 + 0.005, H + 0.42 + 0.5), scale=(1, 0.5, 1), seg=10, rings=6)

# bottles: three shapes, pastel glass, brass caps
def bottle(x, y, z, kind, m, S=1.4):
    if kind == 0:   # round
        prof = [(0, 0), (0.02, 0.002), (0.026, 0.02), (0.022, 0.042), (0.009, 0.05), (0.009, 0.062), (0, 0.062)]
    elif kind == 1: # tall
        prof = [(0, 0), (0.017, 0.002), (0.019, 0.05), (0.014, 0.066), (0.007, 0.07), (0.007, 0.08), (0, 0.08)]
    else:           # squat
        prof = [(0, 0), (0.024, 0.002), (0.027, 0.022), (0.016, 0.034), (0.009, 0.036), (0.009, 0.046), (0, 0.046)]
    prof = [(r * S, h * S) for r, h in prof]
    M.lathe(m, prof, (x, y, z), verts=8)
    ch = prof[-1][1]
    M.cyl(brass, 0.011 * S, 0.012 * S, (x, y, z + ch - 0.002), verts=8, bevel=0)

for (y, z, w) in tiers:
    n = int(w / 0.12)
    for k in range(n):
        x = -w / 2 + 0.06 + k * (w - 0.12) / (n - 1)
        bottle(x, y, z, random.randrange(3), random.choice(glass))
# a few on the desk top, plus a notebook
for x, kind in ((-0.55, 0), (-0.47, 2), (0.5, 1)):
    bottle(x, 0.12, H, kind, random.choice(glass))
M.box(mat("organ_paper", "cream", 0.8), (0.24, 0.17, 0.02), (0.05, 0.12, H), bevel=0.006, rot=(0, 0, math.radians(8)))
M.box(mat("organ_book", "pink", 0.7), (0.25, 0.18, 0.012), (0.05, 0.12, H - 0.004), bevel=0.004, rot=(0, 0, math.radians(8)))

result = M.finish()
