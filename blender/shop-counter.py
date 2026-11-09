# Shop counter: chunky wood with arched sage panels on the customer side (+Y),
# an overhanging honey top, a brass bell, a little till and a jar of flowers.
import math
g = globals()
exec(open(r"C:\Users\seanc\Projects\scent-roads\blender\lib.py").read(), g)

M = Model("shop-counter")
top = mat("counter_top", "honey", 0.5)
body = mat("counter_body", "darkwood", 0.65)
trim = mat("counter_trim", "lightwood", 0.55)
panel = mat("counter_panel", "sage", 0.6)
brass = mat("counter_brass", "brass", 0.35, metal=1.0)
cream = mat("counter_cream", "cream", 0.7)
pink = mat("counter_pink", "pink", 0.55)

W, D, H = 1.8, 0.62, 0.98
M.box(body, (W - 0.04, D - 0.06, 0.08), (0, 0, 0), bevel=0.02)            # plinth
M.box(body, (W - 0.1, D - 0.12, H - 0.13), (0, 0, 0.06), bevel=0.03)        # carcass
M.box(trim, (W - 0.02, D - 0.02, 0.05), (0, 0, H - 0.12), bevel=0.02)       # trim band under top
M.box(top, (W + 0.06, D + 0.06, 0.08), (0, 0, H - 0.08), bevel=0.035)       # top
# three arched panels on the front
y = (D - 0.12) / 2
for x in (-0.55, 0, 0.55):
    M.box(trim, (0.46, 0.03, 0.56), (x, y, 0.16), bevel=0.012)
    M.cyl(trim, 0.23, 0.03, (x, y + 0.015, 0.72), verts=20, rot=(math.radians(90), 0, 0), bevel=0.01)
    M.box(panel, (0.38, 0.03, 0.5), (x, y + 0.012, 0.19), bevel=0.01)
    M.cyl(panel, 0.19, 0.03, (x, y + 0.027, 0.69), verts=20, rot=(math.radians(90), 0, 0), bevel=0.01)
    M.sphere(brass, 0.022, (x, y + 0.035, 0.84), seg=10, rings=6)          # little stud

# bell
bx, by = 0.55, 0.1
M.cyl(body, 0.06, 0.02, (bx, by, H), verts=16, bevel=0.006)
M.lathe(brass, [(0.05, 0), (0.048, 0.012), (0.04, 0.035), (0.022, 0.055), (0, 0.06)], (bx, by, H + 0.02), verts=16)
M.sphere(brass, 0.01, (bx, by, H + 0.084), seg=8, rings=6)
# till: little wooden box with a cream paper roll and pink keys
tx = -0.5
M.box(trim, (0.3, 0.24, 0.12), (tx, -0.05, H), bevel=0.025)
M.box(body, (0.26, 0.12, 0.1), (tx, -0.1, H + 0.11), bevel=0.02, rot=(math.radians(-12), 0, 0))
M.cyl(cream, 0.035, 0.12, (tx - 0.06, -0.14, H + 0.24), verts=12, rot=(0, math.radians(90), 0), bevel=0.006)
for i in range(3):
    for j in range(2):
        M.box(pink, (0.05, 0.04, 0.02), (tx - 0.07 + i * 0.07, 0.01 + j * 0.05, H + 0.115), bevel=0.008)
# jar of flowers
fx, fy = 0.12, -0.12
M.lathe(mat("counter_jar", "sky", 0.25), [(0, 0), (0.045, 0.002), (0.05, 0.05), (0.04, 0.1), (0.03, 0.11), (0.034, 0.12), (0, 0.12)], (fx, fy, H), verts=12)
leaf = mat("counter_leaf", "leaf", 0.6)
for k, (dx, dy, c) in enumerate(((-0.03, 0, "pink"), (0.03, 0.01, "butter"), (0, -0.03, "lilac"), (0.01, 0.03, "white"))):
    M.cyl(leaf, 0.004, 0.12, (fx + dx * 0.5, fy + dy * 0.5, H + 0.1), verts=5, bevel=0)
    fm = mat(f"counter_flower_{c}", c, 0.6)
    for p in range(5):
        a = 2 * math.pi * p / 5
        M.sphere(fm, 0.016, (fx + dx + math.cos(a) * 0.016, fy + dy + math.sin(a) * 0.016, H + 0.225), scale=(1, 1, 0.6), seg=8, rings=5)
    M.sphere(mat("counter_flower_mid", "butter" if c != "butter" else "terracotta", 0.6), 0.01, (fx + dx, fy + dy, H + 0.232), seg=8, rings=5)

result = M.finish()
