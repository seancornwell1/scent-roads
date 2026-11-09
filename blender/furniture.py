# Cozy versions of the buyable furniture still using Grab3D (furniture.json),
# sized to each item's footprint. Fronts face +Y.
import math, random
g = globals()
exec(open(r"C:\Users\seanc\Projects\scent-roads\blender\lib.py").read(), g)
random.seed(9)
out = []
wood = lambda: mat("f_wood", "honey", 0.5)
light = lambda: mat("f_light", "lightwood", 0.55)
brass = lambda: mat("f_brass", "brass", 0.35, metal=1.0)

# ---------- cushioned bench (1.2 x 0.36) ----------
M = Model("cushion-bench")
for sx in (-1, 1):
    for sy in (-1, 1):
        M.cyl(light(), 0.022, 0.36, (sx * 0.52, sy * 0.12, 0), r2=0.028, verts=10, bevel=0.006)
M.box(wood(), (1.2, 0.36, 0.06), (0, 0, 0.36), bevel=0.02)
M.box(mat("bench_cushion", "mint", 0.85), (1.12, 0.32, 0.08), (0, 0, 0.41), bevel=0.035, segs=4)
for x, c in ((-0.42, "pink"), (0.4, "butter")):
    M.sphere(mat(f"bench_pillow_{c}", c, 0.85), 0.12, (x, -0.06, 0.57), scale=(1, 0.45, 0.85), seg=12, rings=8, rot=(math.radians(-15), 0, 0))
out.append(M.finish())

# ---------- bar stool (0.5) ----------
M = Model("bar-stool")
for i in range(4):
    a = math.pi / 4 + i * math.pi / 2
    M.cyl(light(), 0.02, 0.72, (math.cos(a) * 0.17, math.sin(a) * 0.17, 0), r2=0.016, verts=8, bevel=0.005,
          rot=(math.sin(a) * math.radians(7), -math.cos(a) * math.radians(7), 0))
M.torus(light(), 0.15, 0.012, (0, 0, 0.28), maj=20, mn=6)
M.cyl(wood(), 0.2, 0.05, (0, 0, 0.7), verts=24, bevel=0.018)
M.cyl(mat("stool_cushion", "rose", 0.85), 0.18, 0.05, (0, 0, 0.74), verts=24, bevel=0.022)
out.append(M.finish())

# ---------- rocking chair (0.6 x 0.93) ----------
M = Model("rocking-chair")
for sx in (-1, 1):   # rockers: a flattened ring segment under each side
    M.torus(light(), 0.6, 0.02, (sx * 0.24, 0, 0.62), rot=(0, math.radians(90), 0), scale=(1, 1, 1), maj=40, mn=6)
bm_cut = M.parts[-2:]
for o in bm_cut:     # keep only the bottom of each ring
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z + o.location.z > 0.12], context="VERTS"); bm.to_mesh(o.data); bm.free()
for sx in (-1, 1):
    for sy in (-1, 1):
        M.cyl(light(), 0.02, 0.36, (sx * 0.24, sy * 0.2, 0.04), verts=8, bevel=0.005)
M.box(wood(), (0.56, 0.52, 0.05), (0, 0, 0.4), bevel=0.02)
M.box(mat("rocker_cushion", "lilac", 0.85), (0.5, 0.46, 0.07), (0, 0.01, 0.44), bevel=0.03, segs=4)
for x in (-0.16, -0.05, 0.05, 0.16):
    M.cyl(light(), 0.012, 0.48, (x, -0.24, 0.44), verts=8, bevel=0.003)
for sx in (-1, 1):
    M.cyl(light(), 0.02, 0.58, (sx * 0.25, -0.24, 0.4), verts=10, bevel=0.005)
    M.box(light(), (0.05, 0.5, 0.04), (sx * 0.27, -0.01, 0.62), bevel=0.015)       # arm rests
M.box(wood(), (0.6, 0.06, 0.1), (0, -0.24, 0.92), bevel=0.025)
M.box(mat("rocker_blanket", "mint", 0.9), (0.46, 0.04, 0.4), (0.02, -0.2, 0.5), bevel=0.015, rot=(math.radians(-10), 0, math.radians(3)))
out.append(M.finish())

# ---------- sofa (1.6 x 0.9) ----------
M = Model("sofa")
fab = mat("sofa_fabric", "sky", 0.85)
cush = mat("sofa_cushion", "#B9E1F6", 0.85)
for sx in (-1, 1):
    for sy in (-1, 1):
        M.sphere(mat("sofa_feet", "darkwood", 0.5), 0.045, (sx * 0.68, sy * 0.34, 0.045), seg=10, rings=6)
M.box(fab, (1.6, 0.86, 0.3), (0, 0, 0.08), bevel=0.1, segs=4)
for x in (-0.33, 0.33):
    M.box(cush, (0.62, 0.62, 0.14), (x, 0.06, 0.34), bevel=0.06, segs=4)
M.box(fab, (1.6, 0.24, 0.6), (0, -0.31, 0.3), bevel=0.1, segs=4)
for sx in (-1, 1):
    M.box(fab, (0.18, 0.86, 0.32), (sx * 0.71, 0, 0.32), bevel=0.08, segs=4)
for x, c in ((-0.5, "pink"), (0.52, "butter")):
    M.sphere(mat(f"sofa_pillow_{c}", c, 0.85), 0.15, (x, -0.12, 0.62), scale=(1, 0.45, 0.85), seg=12, rings=8, rot=(math.radians(-15), 0, math.radians(8 if x < 0 else -8)))
out.append(M.finish())

# ---------- snake plant (0.3) ----------
M = Model("snake-plant")
M.lathe(mat("snake_pot", "cream", 0.7), [(0, 0), (0.1, 0), (0.13, 0.22), (0.135, 0.24), (0, 0.24)], verts=16)
M.cyl(mat("snake_soil", "#8A5A44", 0.9), 0.12, 0.01, (0, 0, 0.225), verts=16, bevel=0)
for i in range(7):
    a = 2 * math.pi * i / 7 + random.uniform(-0.2, 0.2)
    h = random.uniform(0.38, 0.55)
    M.sphere(mat("snake_leaf", "deepleaf", 0.55) if i % 2 else mat("snake_leaf_b", "leaf", 0.55), 1.0,
             (math.cos(a) * 0.04, math.sin(a) * 0.04, 0.23 + h / 2), scale=(0.045, 0.014, h / 2), seg=10, rings=8,
             rot=(math.radians(random.uniform(-10, 10)), math.radians(random.uniform(-10, 10)), a + math.pi / 2))
out.append(M.finish())

# ---------- fern (1.2) ----------
M = Model("fern")
M.lathe(mat("fern_pot", "terracotta", 0.7), [(0, 0), (0.17, 0), (0.22, 0.32), (0.25, 0.34), (0.25, 0.38), (0, 0.38)], verts=20)
for i in range(14):      # long arching fronds, inner ones more upright
    a = 2 * math.pi * i / 14 + random.uniform(-0.15, 0.15)
    inner = i % 2
    r = 0.12 if inner else 0.2
    M.sphere(mat("fern_leaf", "leaf", 0.6) if inner else mat("fern_leaf_b", "sage", 0.6), 1.0,
             (math.cos(a) * r, math.sin(a) * r, 0.5 if inner else 0.44), scale=(0.24, 0.07, 0.014), seg=12, rings=6,
             rot=(0, math.radians(-40 if inner else -12), a))
out.append(M.finish())

# ---------- table lamp (0.35) ----------
M = Model("table-lamp")
M.lathe(mat("tlamp_base", "mint", 0.4), [(0, 0), (0.09, 0), (0.1, 0.03), (0.07, 0.12), (0.08, 0.2), (0.03, 0.26), (0, 0.26)], verts=16)
M.cyl(brass(), 0.008, 0.08, (0, 0, 0.25), verts=8, bevel=0)
M.lathe(mat("tlamp_shade", "pink", 0.7), [(0.17, 0.3), (0.175, 0.31), (0.1, 0.48), (0.09, 0.48), (0, 0.48)], verts=20)
out.append(M.finish())

# ---------- candle cluster (0.45 x 0.3) ----------
M = Model("candle-cluster")
M.cyl(wood(), 0.2, 0.025, (0, 0, 0), verts=24, bevel=0.01)
wax = mat("candle_wax", "cream", 0.6)
flame = mat("candle_flame", "butter", 0.3)
for x, y, h in ((-0.1, 0.03, 0.22), (0.02, -0.05, 0.16), (0.11, 0.04, 0.1), (0.0, 0.08, 0.12)):
    M.cyl(wax, 0.04, h, (x, y, 0.025), verts=14, bevel=0.01)
    M.sphere(flame, 0.016, (x, y, 0.025 + h + 0.03), scale=(1, 1, 1.6), seg=8, rings=6)
out.append(M.finish())

# ---------- star lantern (0.37 x 0.15) ----------
M = Model("star-lantern")
pts = []
for i in range(10):
    a = math.pi / 2 + i * math.pi / 5
    r = 0.17 if i % 2 == 0 else 0.075
    pts.append((r * math.cos(a), r * math.sin(a)))
vs = [(x, -0.04, z + 0.2) for x, z in pts] + [(x, 0.04, z + 0.2) for x, z in pts] + [(0, -0.06, 0.2), (0, 0.06, 0.2)]
fs = [(i, (i + 1) % 10, 20) for i in range(10)] + [(10 + (i + 1) % 10, 10 + i, 21) for i in range(10)]
fs += [(i, 10 + i, 10 + (i + 1) % 10, (i + 1) % 10) for i in range(10)]
o = M.mesh(mat("lantern_star", "butter", 0.4), vs, fs, bevel=0.01, smooth=False)
M.cyl(wood(), 0.06, 0.03, (0, 0, 0), verts=16, bevel=0.01)
M.cyl(brass(), 0.008, 0.06, (0, 0, 0.02), verts=8, bevel=0)
out.append(M.finish())

# ---------- vase with tulips (0.25 x 0.22) ----------
M = Model("flower-vase")
M.lathe(mat("vase_glaze", "lilac", 0.3), [(0, 0), (0.06, 0), (0.1, 0.06), (0.09, 0.14), (0.05, 0.2), (0.06, 0.22), (0, 0.22)], verts=16)
for x, y, c in ((-0.04, 0, "pink"), (0.04, 0.02, "rose"), (0, -0.04, "butter"), (0.01, 0.04, "white")):
    M.cyl(mat("vase_stem", "leaf", 0.6), 0.005, 0.18, (x * 0.4, y * 0.4, 0.18), verts=5, bevel=0, rot=(math.atan2(-y, 0.3), math.atan2(x, 0.3), 0))
    M.sphere(mat(f"vase_tulip_{c}", c, 0.6), 0.03, (x * 1.6, y * 1.6, 0.37), scale=(1, 1, 1.3), seg=10, rings=6)
out.append(M.finish())

# ---------- globe (0.3 x 0.27) ----------
M = Model("globe")
M.cyl(wood(), 0.1, 0.03, (0, 0, 0), verts=20, bevel=0.01)
M.cyl(wood(), 0.015, 0.12, (0, 0, 0.03), verts=10, bevel=0.004)
M.sphere(mat("globe_sea", "sky", 0.5), 0.12, (0, 0, 0.27), seg=24, rings=14)
for i in range(6):   # soft blobby continents
    a = random.uniform(0, 2 * math.pi); e = random.uniform(-0.6, 0.8)
    n = Vector((math.cos(a) * math.cos(e), math.sin(a) * math.cos(e), math.sin(e)))
    M.sphere(mat("globe_land", "sage", 0.6), 0.045, Vector((0, 0, 0.27)) + n * 0.112, scale=(1.3, 1, 0.3), seg=10, rings=6,
             rot=n.to_track_quat('Z', 'Y').to_euler())
M.torus(brass(), 0.14, 0.006, (0, 0, 0.27), rot=(0, math.radians(90), math.radians(20)), maj=28, mn=6)
out.append(M.finish())

# ---------- full-length mirror (0.62) ----------
M = Model("standing-mirror")
for sx in (-1, 1):
    M.box(light(), (0.05, 0.4, 0.04), (sx * 0.22, 0, 0), bevel=0.015)     # feet
    M.cyl(light(), 0.022, 1.4, (sx * 0.22, 0, 0.03), verts=10, bevel=0.006)
    M.sphere(light(), 0.035, (sx * 0.22, 0, 1.45), seg=10, rings=8)
M.cyl(wood(), 0.2, 0.03, (0, 0.015, 0.95), verts=28, rot=(math.radians(90), 0, 0), bevel=0.01)
M.box(wood(), (0.4, 0.03, 0.6), (0, 0, 0.35), bevel=0.012)
M.box(mat("mirror_glass", "#DDF0FA", 0.05, metal=0.6), (0.34, 0.02, 0.56), (0, 0.012, 0.37), bevel=0.008)
M.cyl(mat("mirror_glass", "#DDF0FA", 0.05, metal=0.6), 0.17, 0.02, (0, 0.022, 0.95), verts=28, rot=(math.radians(90), 0, 0), bevel=0.006)
M.sphere(mat("mirror_bow", "pink", 0.6), 0.04, (0, 0.03, 1.17), scale=(1.4, 0.5, 0.9), seg=10, rings=6)
out.append(M.finish())

# ---------- vanity table (1 x 0.46) ----------
M = Model("vanity-table")
for sx in (-1, 1):
    for sy in (-1, 1):
        M.cyl(light(), 0.02, 0.7, (sx * 0.44, sy * 0.18, 0), r2=0.03, verts=10, bevel=0.006)
M.box(light(), (0.96, 0.42, 0.1), (0, 0, 0.62), bevel=0.02)
M.box(wood(), (1.0, 0.46, 0.05), (0, 0, 0.72), bevel=0.02)
for x in (-0.25, 0.25):
    M.box(mat("vanity_drawer", "pink", 0.6), (0.36, 0.02, 0.07), (x, 0.21, 0.635), bevel=0.01)
    M.sphere(brass(), 0.012, (x, 0.225, 0.67), seg=8, rings=6)
M.cyl(light(), 0.3, 0.03, (0, -0.19, 1.25), verts=28, rot=(math.radians(90), 0, 0), bevel=0.012)
M.box(light(), (0.04, 0.03, 0.5), (0, -0.19, 0.77), bevel=0.01)
M.cyl(mat("vanity_glass", "#DDF0FA", 0.05, metal=0.6), 0.25, 0.02, (0, -0.17, 1.25), verts=28, rot=(math.radians(90), 0, 0), bevel=0.006)
for x, c in ((-0.32, "sky"), (-0.24, "butter"), (0.3, "lilac")):
    M.lathe(mat(f"vanity_bottle_{c}", c, 0.25), [(0, 0), (0.025, 0), (0.03, 0.04), (0.012, 0.06), (0.012, 0.075), (0, 0.075)], (x, 0.05, 0.77), verts=10)
out.append(M.finish())

result = {"models": out}
