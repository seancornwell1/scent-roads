# Small cozy props, each its own model: potted-plant, wooden-crate,
# stock-bottle (for the supplies rack) and shop-rug.
import math, random
g = globals()
exec(open(r"C:\Users\seanc\Projects\scent-roads\blender\lib.py").read(), g)
random.seed(3)
out = []

# ---------- potted plant ----------
M = Model("potted-plant")
pot = mat("plant_pot", "terracotta", 0.7)
rim = mat("plant_rim", "#EBA08A", 0.7)
soil = mat("plant_soil", "#8A5A44", 0.9)
leafA = mat("plant_leaf", "leaf", 0.55)
leafB = mat("plant_leaf_dark", "deepleaf", 0.55)
M.lathe(pot, [(0, 0), (0.13, 0), (0.14, 0.01), (0.17, 0.26), (0, 0.26)], verts=20)
M.lathe(rim, [(0.165, 0.24), (0.195, 0.245), (0.2, 0.3), (0.185, 0.31), (0.16, 0.31), (0, 0.31)], verts=20)
M.cyl(soil, 0.17, 0.02, (0, 0, 0.28), verts=20, bevel=0.005)
stem = mat("plant_stem", "sage", 0.6)
for i in range(11):
    a = 2 * math.pi * i / 11 + random.uniform(-0.2, 0.2)
    tier = i % 3
    L = 0.1 + 0.06 * tier                        # stem length
    tilt = math.radians(55 - tier * 15)          # outer leaves lean more
    base = Vector((0, 0, 0.29))
    dirv = Vector((math.cos(a) * math.sin(tilt), math.sin(a) * math.sin(tilt), math.cos(tilt)))
    tip = base + dirv * L
    M.cyl(stem, 0.012, L, (0, 0, 0), verts=6, bevel=0)
    s = M.parts[-1]
    s.rotation_euler = Vector((0, 0, 1)).rotation_difference(dirv).to_euler(); s.location = base
    M._apply(s); bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
    M.sphere(leafA if i % 2 else leafB, 1.0, tip + Vector((math.cos(a), math.sin(a), 0.25)) * 0.12,
             scale=(0.15, 0.1, 0.025), seg=12, rings=8, rot=(0, math.radians(-20 - tier * 10), a))
out.append(M.finish())

# ---------- wooden crate ----------
M = Model("wooden-crate")
slat = mat("crate_slat", "lightwood", 0.65)
post = mat("crate_post", "honey", 0.6)
straw = mat("crate_straw", "straw", 0.85)
S = 0.5
for sx in (-1, 1):
    for sy in (-1, 1):
        M.box(post, (0.06, 0.06, S), (sx * (S / 2 - 0.03), sy * (S / 2 - 0.03), 0), bevel=0.014)
for k in range(3):
    z = 0.03 + k * 0.155
    for (sx, sy, w, d) in ((0, 1, S - 0.08, 0.03), (0, -1, S - 0.08, 0.03), (1, 0, 0.03, S - 0.08), (-1, 0, 0.03, S - 0.08)):
        M.box(slat, (w, d, 0.12), (sx * (S / 2 - 0.02), sy * (S / 2 - 0.02), z), bevel=0.01)
M.box(slat, (S - 0.06, S - 0.06, 0.03), (0, 0, 0.01), bevel=0.008)
for i in range(9):
    M.sphere(straw, 0.09, (random.uniform(-0.14, 0.14), random.uniform(-0.14, 0.14), S - 0.04),
             scale=(1, 0.8, 0.45), seg=10, rings=6, rot=(0, 0, random.uniform(0, 3)))
out.append(M.finish())

# ---------- stock bottle ----------
M = Model("stock-bottle")
glass = mat("glass", "#DDEFF5", 0.1, alpha=0.4)
liquid = mat("liquid", "#F3D9A0", 0.3)      # tinted per material in code
cap = mat("cap", "#C99A6B", 0.8)            # cork
label = mat("label", "cream", 0.7)
M.lathe(glass, [(0, 0), (0.045, 0), (0.05, 0.008), (0.05, 0.11), (0.042, 0.13), (0.02, 0.145), (0.018, 0.16), (0.021, 0.165), (0, 0.165)], verts=16)
M.lathe(liquid, [(0, 0.006), (0.044, 0.006), (0.045, 0.012), (0.045, 0.1), (0, 0.1)], verts=16)
M.cyl(cap, 0.017, 0.035, (0, 0, 0.15), r2=0.02, verts=12, bevel=0.005)
M.lathe(label, [(0.0505, 0.045), (0.0515, 0.046), (0.0515, 0.079), (0.0505, 0.08)], verts=16)
out.append(M.finish(pad=1.8))

# ---------- shop rug ----------
M = Model("shop-rug")
rings = [("rug_edge", "pink", 1.05), ("rug_cream", "cream", 0.95), ("rug_mint", "mint", 0.72), ("rug_inner", "cream", 0.5), ("rug_heart", "butter", 0.25)]
for k, (name, col, r) in enumerate(rings):
    m = mat(name, col, 0.95)
    M.cyl(m, r, 0.012, (0, 0, k * 0.002), verts=40, bevel=0.003, segs=1)
    if k == 0:  # scalloped edge
        for i in range(20):
            a = 2 * math.pi * i / 20
            M.cyl(m, 0.1, 0.012, (math.cos(a) * r, math.sin(a) * r, 0), verts=12, bevel=0)
out.append(M.finish(elev=40, pad=1.3))

result = {"models": out}
