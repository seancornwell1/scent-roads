# Glass display case for house perfumes: a little wooden cabinet on bun feet,
# a glass box with wooden corner posts, a lilac velvet riser inside, and a
# domed wooden lid with a brass knob. Display surface inside at 0.84 m.
import math
g = globals()
exec(open(r"C:\Users\seanc\Projects\scent-roads\blender\lib.py").read(), g)

M = Model("display-case")
wood = mat("case_wood", "lightwood", 0.55)
dark = mat("case_dark", "honey", 0.5)
glass = mat("case_glass", "#E8F6FF", 0.08, alpha=0.28)
velvet = mat("case_velvet", "lilac", 0.85)
brass = mat("case_brass", "brass", 0.35, metal=1.0)

W, D = 0.8, 0.5
for sx in (-1, 1):
    for sy in (-1, 1):
        M.sphere(dark, 0.045, (sx * (W / 2 - 0.07), sy * (D / 2 - 0.07), 0.04), scale=(1, 1, 0.8), seg=12, rings=8)
M.box(wood, (W, D, 0.7), (0, 0, 0.06), bevel=0.03)                          # cabinet
M.box(dark, (W + 0.04, D + 0.04, 0.06), (0, 0, 0.76), bevel=0.025)         # top rim
# door panel with a heart-ish round window on the front
M.box(dark, (W - 0.16, 0.02, 0.5), (0, D / 2 - 0.005, 0.16), bevel=0.015)
M.cyl(mat("case_inset", "pink", 0.6), 0.12, 0.02, (0, D / 2 + 0.002, 0.41), verts=20, rot=(math.radians(-90), 0, 0), bevel=0.008)
M.sphere(brass, 0.018, (0.26, D / 2 + 0.02, 0.41), seg=10, rings=6)
# glass box
GH = 0.42; z0 = 0.82
M.box(velvet, (W - 0.12, D - 0.12, 0.02), (0, 0, z0), bevel=0.008)
M.box(velvet, (0.3, 0.22, 0.08), (0, -0.02, z0), bevel=0.03)               # riser
for sx in (-1, 1):
    for sy in (-1, 1):
        M.box(wood, (0.04, 0.04, GH), (sx * (W / 2 - 0.02), sy * (D / 2 - 0.02), z0), bevel=0.012)
M.box(glass, (W - 0.03, D - 0.03, GH - 0.01), (0, 0, z0), bevel=0.006, segs=1)
# domed lid
M.box(dark, (W + 0.04, D + 0.04, 0.05), (0, 0, z0 + GH), bevel=0.022)
M.sphere(wood, 0.3, (0, 0, z0 + GH + 0.04), scale=(1.25, 0.78, 0.25), seg=20, rings=10)
M.sphere(brass, 0.03, (0, 0, z0 + GH + 0.12), seg=12, rings=8)

result = M.finish()
