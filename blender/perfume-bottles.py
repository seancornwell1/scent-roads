# More house perfume bottles in the gumdrop's family. Each uses the same
# material names (glass, liquid, collar, cap, label) so the game can tint the
# liquid and cap and put label art on the label (its UVs fill 0-1).
#   perfume-bottle-tall, perfume-bottle-moon, perfume-bottle-atomizer, perfume-bottle-bell
import math
g = globals()
exec(open(r"C:\Users\seanc\Projects\scent-roads\blender\lib.py").read(), g)
out = []


def mats(cap_col, collar_col="mint"):
    return (mat("glass", "#DDF5E8", 0.1, alpha=0.38), mat("liquid", "#F3D9A0", 0.3),
            mat("collar", collar_col, 0.5), mat("cap", cap_col, 0.45), mat("label", "cream", 0.6))


def label_patch(M, m, r, z0, z1, verts=24, frac=0.32):
    """Curved label on the front (+Y) of a round body of radius r; UV fills 0-1."""
    n = 8; vs = []; fs = []
    a0 = math.pi / 2 - frac * math.pi; a1 = math.pi / 2 + frac * math.pi
    for j in range(2):
        for i in range(n + 1):
            a = a0 + (a1 - a0) * i / n
            vs.append((r * math.cos(a), r * math.sin(a), z0 if j == 0 else z1))
    for i in range(n):
        fs.append((i, i + n + 1, i + n + 2, i + 1))
    o = M.mesh(m, vs, fs)
    uv = o.data.uv_layers.new(name="UVMap")
    for poly in o.data.polygons:
        for li in poly.loop_indices:
            vi = o.data.loops[li].vertex_index
            uv.data[li].uv = (1 - (vi % (n + 1)) / n, vi // (n + 1))
    s = o.modifiers.new("Thick", 'SOLIDIFY'); s.thickness = 0.0012; s.offset = 1
    return o

# ---------- tall: a slim column with a big faceted gem cap ----------
M = Model("perfume-bottle-tall")
glass, liquid, collar, cap, label = mats("lilac")
M.lathe(glass, [(0, 0), (0.026, 0), (0.03, 0.006), (0.03, 0.1), (0.026, 0.11), (0.012, 0.116), (0.012, 0.126), (0, 0.126)], verts=20)
M.lathe(liquid, [(0, 0.005), (0.026, 0.005), (0.026, 0.085), (0, 0.085)], verts=20)
M.torus(collar, 0.014, 0.005, (0, 0, 0.124), maj=16, mn=6)
M.sphere(cap, 0.026, (0, 0, 0.156), scale=(1, 1, 1.3), seg=8, rings=5, smooth=False)
label_patch(M, label, 0.0305, 0.03, 0.075, frac=0.28)
out.append(M.finish(pad=1.8))

# ---------- moon: a flat round flask on a little foot, with a tassel ----------
M = Model("perfume-bottle-moon")
glass, liquid, collar, cap, label = mats("sky", "butter")
M.cyl(collar, 0.028, 0.012, (0, 0, 0), verts=16, r2=0.022, bevel=0.004)
M.sphere(glass, 0.052, (0, 0, 0.064), scale=(1, 0.5, 1), seg=20, rings=12)
M.sphere(liquid, 0.044, (0, 0, 0.06), scale=(1, 0.44, 0.8), seg=16, rings=10)
M.cyl(glass, 0.011, 0.02, (0, 0, 0.11), verts=12, bevel=0.003)
M.torus(collar, 0.013, 0.0045, (0, 0, 0.122), maj=16, mn=6)
M.sphere(cap, 0.018, (0, 0, 0.14), seg=12, rings=8)
tas = mat("tassel", "pink", 0.8)
M.cyl(tas, 0.002, 0.04, (0.016, 0, 0.088), verts=5, bevel=0, rot=(0, math.radians(-160), 0))
M.cyl(tas, 0.008, 0.022, (0.024, 0, 0.05), verts=8, r2=0.004, bevel=0.002)
M.cyl(mat("label", "cream", 0.6), 0.024, 0.003, (0, 0.025, 0.064), verts=20, rot=(math.radians(-90), 0, 0), bevel=0.001)
out.append(M.finish(pad=1.8))

# ---------- atomizer: round bottle with a puffer bulb and tassel ----------
M = Model("perfume-bottle-atomizer")
glass, liquid, collar, cap, label = mats("pink", "brass")
collar.node_tree.nodes["Principled BSDF"].inputs["Metallic"].default_value = 1.0
M.lathe(glass, [(0, 0), (0.03, 0), (0.044, 0.02), (0.045, 0.05), (0.034, 0.08), (0.012, 0.09), (0.012, 0.096), (0, 0.096)], verts=20)
M.lathe(liquid, [(0, 0.004), (0.03, 0.004), (0.04, 0.02), (0.041, 0.045), (0, 0.045)], verts=20)
M.cyl(collar, 0.014, 0.014, (0, 0, 0.092), verts=16, bevel=0.003)
M.cyl(collar, 0.004, 0.042, (0, 0, 0.104), verts=8, rot=(0, math.radians(-90), 0), bevel=0)  # arm to the bulb
M.sphere(cap, 0.022, (-0.058, 0, 0.104), scale=(1.15, 1, 1), seg=14, rings=10)           # puffer bulb
M.cyl(collar, 0.0015, 0.03, (-0.07, 0, 0.06), verts=5, bevel=0)                          # tassel cord
M.cyl(mat("tassel", "butter", 0.8), 0.006, 0.03, (-0.07, 0, 0.035), verts=8, r2=0.003, bevel=0.002)
label_patch(M, label, 0.0455, 0.026, 0.05, frac=0.25)
out.append(M.finish(pad=1.8))

# ---------- bell: a bell-shaped bottle with a ribbon and a round cap ----------
M = Model("perfume-bottle-bell")
glass, liquid, collar, cap, label = mats("butter", "pink")
M.lathe(glass, [(0, 0), (0.048, 0), (0.05, 0.008), (0.042, 0.03), (0.03, 0.07), (0.016, 0.1), (0.012, 0.11), (0.012, 0.118), (0, 0.118)], verts=20)
M.lathe(liquid, [(0, 0.005), (0.044, 0.005), (0.039, 0.03), (0.03, 0.06), (0, 0.06)], verts=20)
M.torus(collar, 0.02, 0.006, (0, 0, 0.098), maj=16, mn=6)                              # ribbon
for sx in (-1, 1):
    M.sphere(collar, 0.012, (sx * 0.012, 0.02, 0.098), scale=(1, 0.5, 0.7), seg=10, rings=6)  # bow loops
M.sphere(cap, 0.022, (0, 0, 0.13), scale=(1, 1, 0.85), seg=14, rings=10)
M.cyl(collar, 0.0015, 0.03, (0, 0.024, 0.07), verts=5, bevel=0)                           # tag string
M.cyl(label, 0.016, 0.003, (0, 0.03, 0.06), verts=16, rot=(math.radians(-80), 0, 0), bevel=0.001)  # round tag
out.append(M.finish(pad=1.8))

result = {"models": out}
