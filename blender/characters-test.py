# Style test for grown-up townspeople (Nov 9): chunky low-poly, faceted, ~5.5 heads tall
# (1.65 m, to scale with the furniture), with expressions and quirks. Static, unrigged: for
# judging the look before building a rig and animations. Renders to blender/previews/.
# Characters face -Y in Blender, like the current kit.
import bpy, math, os
from mathutils import Vector
g = globals()
exec(open(r"C:\Users\seanc\Projects\scent-roads\blender\lib.py").read(), g)

SKIN = {"fair": "#F2C7A5", "warm": "#D9A07A", "deep": "#A86E4E"}


def person(name, x, look):
    M = Model(name)
    skin = mat(f"{name}_skin", SKIN[look["skin"]], 0.75)
    shirt = mat(f"{name}_shirt", look["shirt"], 0.8)
    legs = mat(f"{name}_legs", look["legs"], 0.8)
    shoes = mat(f"{name}_shoes", look["shoes"], 0.6)
    hair = mat(f"{name}_hair", look["hair"], 0.7)
    dark = mat(f"{name}_dark", "#3A2A2E", 0.5)
    white = mat(f"{name}_white", "#FFFFFF", 0.4)
    lip = mat(f"{name}_lip", "#9C4E4E", 0.6)
    s = look.get("scale", 1.0)       # overall height
    w = look.get("width", 1.0)       # build
    P = lambda v: Vector(v) * s

    # ---- legs and feet ----
    skirt = look.get("skirt")
    for sx in (-1, 1):
        lx = sx * 0.09 * w
        M.box(shoes, (0.1 * w, 0.2, 0.08), P((lx, -0.03, 0)), bevel=0.015, segs=1)
        if not skirt:
            M.cyl(legs, 0.055 * w, 0.4, P((lx, 0, 0.07)), r2=0.065 * w, verts=8, bevel=0)
            M.cyl(legs, 0.068 * w, 0.36, P((lx, 0, 0.46)), r2=0.085 * w, verts=8, bevel=0)
        else:
            M.cyl(skin, 0.04, 0.3, P((lx, 0, 0.07)), r2=0.045, verts=7, bevel=0)
        if look.get("boots"):
            M.cyl(shoes, 0.062 * w, 0.2, P((lx, 0, 0.06)), r2=0.066 * w, verts=8, bevel=0)
    if skirt:
        M.cyl(legs, 0.25 * w, 0.62, P((0, 0, 0.3)), r2=0.16 * w, verts=10, bevel=0)
    else:
        M.box(legs, (0.33 * w, 0.2 * w, 0.16), P((0, 0, 0.76)), bevel=0.02, segs=1)
    # ---- torso ----
    belly = look.get("belly", 0)
    M.cyl(shirt, (0.16 + belly) * w, 0.46, P((0, 0, 0.86)), r2=0.2 * w, verts=10, bevel=0)
    M.parts[-1].scale = (1, 0.68 + belly, 1)
    M._apply(M.parts[-1])
    if look.get("vest"):
        v = mat(f"{name}_vest", look["vest"], 0.75)
        M.cyl(v, (0.168 + belly) * w, 0.34, P((0, 0, 0.92)), r2=0.205 * w, verts=10, bevel=0)
        M.parts[-1].scale = (1, 0.72 + belly, 1); M._apply(M.parts[-1])
        for bz in (1.0, 1.08, 1.16):
            M.sphere(mat(f"{name}_button", "#D9A84E", 0.4, metal=0.5), 0.012, P((0, -0.14 - belly * 0.2, bz)), seg=6, rings=4, smooth=False)
    if look.get("cardigan"):
        c = mat(f"{name}_cardigan", look["cardigan"], 0.85)
        for sx in (-1, 1):
            M.box(c, (0.13 * w, 0.27 * w, 0.48), P((sx * 0.11 * w, 0.0, 0.84)), bevel=0.03, segs=1)
    if look.get("belt"):
        M.cyl(mat(f"{name}_belt", "#5B3A2A", 0.6), 0.168 * w, 0.045, P((0, 0, 0.86)), verts=10, bevel=0)
        M.parts[-1].scale = (1, 0.7, 1); M._apply(M.parts[-1])
        M.box(mat(f"{name}_buckle", "#D9A84E", 0.4, metal=0.6), (0.05, 0.02, 0.04), P((0, -0.115 * w, 0.862)), bevel=0.005, segs=1)
    # ---- arms ----
    sleeve = mat(f"{name}_sleeve", look.get("sleeve", look["shirt"]), 0.8)
    for sx in (-1, 1):
        sh = P((sx * 0.2 * w, 0, 1.26))
        M.sphere(sleeve, 0.072 * w, P((sx * 0.185 * w, 0, 1.27)), scale=(1, 0.85, 0.9), seg=8, rings=6, smooth=False)   # shoulder
        out = math.radians(8 * sx)
        up = M.cyl(sleeve, 0.058 * w, 0.27, (0, 0, 0), r2=0.052 * w, verts=8, bevel=0, rot=(0, math.pi + out, 0))
        up.location = sh; M._apply(up); bpy.ops.object.transform_apply(location=True)
        elbow = sh + Vector((math.sin(out) * -0.27, 0, -0.27 * math.cos(out))) * s * -1
        elbow = sh + Vector((sx * 0.04, 0, -0.27)) * s
        if look.get("rolled"):
            M.cyl(sleeve, 0.06 * w, 0.04, elbow + Vector((0, 0, -0.01)), verts=8, bevel=0)
            fore = skin
        else:
            fore = sleeve
        M.cyl(fore, 0.048 * w, 0.25, elbow + Vector((0, 0, -0.25)) * 1, r2=0.05 * w, verts=8, bevel=0)
        M.box(skin, (0.06, 0.09, 0.1), elbow + Vector((sx * 0.01, 0, -0.34)), bevel=0.015, segs=1)
    # ---- neck and head ----
    M.cyl(skin, 0.05, 0.1, P((0, 0, 1.31)), verts=8, bevel=0)
    hz = 1.52 * s
    head = M.sphere(skin, 0.13, (0, 0, hz), scale=(1.0, 1.0, 1.12), seg=10, rings=8, smooth=False)
    if look.get("jaw"):
        M.box(skin, (0.17, 0.17, 0.09), (0, -0.01, hz - 0.13), bevel=0.03, segs=1)
    for sx in (-1, 1):   # ears
        M.sphere(skin, 0.035, (sx * 0.13, 0.0, hz - 0.01), scale=(0.5, 0.9, 1.2), seg=6, rings=5, smooth=False)
    # nose: a little wedge
    M.mesh(skin, [(-0.022, -0.125, hz + 0.0), (0.022, -0.125, hz + 0.0), (0, -0.16, hz - 0.045), (-0.025, -0.12, hz - 0.05), (0.025, -0.12, hz - 0.05)],
           [(0, 2, 1), (0, 3, 2), (1, 2, 4), (3, 4, 2)], smooth=False)
    # ---- expression ----
    ex = look["expr"]
    eye_y = -0.118
    for sx in (-1, 1):
        ex_x = sx * 0.048
        if ex.get("closed"):     # happy closed eyes: little upturned arches
            for side in (-1, 1):
                M.box(dark, (0.022, 0.01, 0.008), (ex_x + side * 0.009, eye_y - 0.004, hz + 0.02), bevel=0, rot=(0, math.radians(30 * side), 0))
        else:
            M.sphere(white, 0.024, (ex_x, eye_y, hz + 0.02), scale=(1, 0.45, 1.1 * ex.get("open", 1)), seg=8, rings=6, smooth=False)
            M.sphere(dark, 0.014, (ex_x + ex.get("look", 0), eye_y - 0.008, hz + 0.018), scale=(1, 0.5, 1.15), seg=8, rings=6, smooth=False)
        # brows: inner end height and tilt make the mood
        tilt = ex["brow"] * sx      # + angry (inner down), - worried (inner up)
        raise_ = ex.get("lift", 0) + (ex.get("one_up", 0) if sx > 0 else 0)
        M.box(hair if look.get("brows_hair", True) else dark, (0.05, 0.016, 0.014), (ex_x, eye_y - 0.004, hz + 0.058 + raise_),
              bevel=0, rot=(0, math.radians(tilt), 0))
    # mouth: a bent strip of three pieces (smile > 0, frown < 0), or an open grin
    curve = ex["mouth"]
    mz = hz - 0.075
    if ex.get("grin"):
        M.sphere(dark, 0.04, (0, -0.115, mz + 0.004), scale=(1.0, 0.35, 0.55), seg=10, rings=6, smooth=False)
        M.box(white, (0.05, 0.01, 0.012), (0, -0.128, mz + 0.016), bevel=0, segs=1)
    else:
        for i, dx in enumerate((-0.03, 0, 0.03)):
            dz = abs(dx) * curve * 1.2 + ex.get("skew", 0) * dx
            M.box(lip, (0.032, 0.012, 0.009), (dx, -0.12, mz + dz), bevel=0, rot=(0, math.radians(-curve * 40 * (dx / 0.03)), 0))
    if look.get("freckles"):
        for sx in (-1, 1):
            for k in range(4):
                M.sphere(mat(f"{name}_freckle", "#B5715A", 0.7), 0.004, (sx * (0.04 + 0.012 * (k % 2)), -0.123, hz - 0.03 + 0.008 * (k // 2)), seg=4, rings=3, smooth=False)
    # ---- hair styles ----
    hs = look["hairstyle"]
    if hs == "balding":
        for sx in (-1, 1):
            M.sphere(hair, 0.07, (sx * 0.11, 0.03, hz + 0.0), scale=(0.6, 1.2, 0.9), seg=7, rings=5, smooth=False)
        M.sphere(hair, 0.06, (0, 0.11, hz - 0.01), scale=(1.6, 0.6, 0.9), seg=7, rings=5, smooth=False)
    elif hs == "ponytail":
        M.sphere(hair, 0.142, (0, 0.012, hz + 0.03), scale=(1.0, 1.02, 0.95), seg=10, rings=7, smooth=False)
        cut = M.parts[-1]
        bm = bmesh.new(); bm.from_mesh(cut.data)          # open the face
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y < -0.04 and abs(v.co.x) < 0.095 and v.co.z + cut.location.z < hz + 0.07], context='VERTS')
        bm.to_mesh(cut.data); bm.free()
        for i, (dx, dz) in enumerate(((-0.075, 0.095), (-0.02, 0.11), (0.035, 0.105), (0.085, 0.085))):   # messy fringe tufts
            M.cyl(hair, 0.034, 0.085, (dx, -0.095, hz + dz), r2=0.0, verts=5, bevel=0, rot=(math.radians(150 + (i % 2) * 15), math.radians(-dx * 150), 0))
        M.cyl(hair, 0.05, 0.24, (0, 0.12, hz + 0.07), r2=0.018, verts=7, bevel=0, rot=(math.radians(-140), 0, 0))   # ponytail, swinging back
        M.sphere(mat(f"{name}_tie", "#7CC27A", 0.6), 0.03, (0, 0.125, hz + 0.075), seg=6, rings=4, smooth=False)
    elif hs == "bun":
        M.sphere(hair, 0.138, (0, 0.015, hz + 0.035), scale=(1.0, 1.0, 0.92), seg=10, rings=7, smooth=False)
        cut = M.parts[-1]
        bm = bmesh.new(); bm.from_mesh(cut.data)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y < -0.035 and abs(v.co.x) < 0.095 and v.co.z + cut.location.z < hz + 0.075], context='VERTS')
        bm.to_mesh(cut.data); bm.free()
        M.sphere(hair, 0.07, (0, 0.06, hz + 0.16), seg=8, rings=6, smooth=False)
    # ---- quirks ----
    if look.get("mustache"):
        for sx in (-1, 1):
            M.sphere(hair, 0.035, (sx * 0.03, -0.128, mz + 0.03), scale=(1.3, 0.6, 0.55), seg=7, rings=5, rot=(0, math.radians(-15 * sx), 0), smooth=False)
    if look.get("glasses"):
        met = mat(f"{name}_metal", "#C9A15A", 0.35, metal=0.7)
        for sx in (-1, 1):
            M.torus(met, 0.03, 0.004, (sx * 0.048, -0.132, hz + 0.02), rot=(math.radians(90), 0, 0), maj=10, mn=4)
        M.box(met, (0.035, 0.006, 0.006), (0, -0.134, hz + 0.025), bevel=0)
    if look.get("satchel"):
        bag = mat(f"{name}_bag", "#8C5A3C", 0.65)
        M.box(bag, (0.04, 0.025, 0.62), (0.0, -0.13 * w, 0.92), bevel=0, rot=(0, math.radians(38), 0))
        M.box(bag, (0.2, 0.08, 0.16), (-0.2 * w, -0.04, 0.72), bevel=0.02, segs=1)
    if look.get("pearls"):
        for k in range(11):
            a = math.radians(-90 + (k - 5) * 16)
            M.sphere(white, 0.011, (math.cos(a) * 0.075, math.sin(a) * 0.06 - 0.01, 1.315 - abs(k - 5) * -0.002), seg=6, rings=4, smooth=False)
    if look.get("cane"):
        M.cyl(mat(f"{name}_cane", "#6B4430", 0.6), 0.012, 0.7, (0.29 * w, -0.08, 0), verts=6, bevel=0)
        M.torus(mat(f"{name}_cane", "#6B4430", 0.6), 0.04, 0.012, (0.26 * w, -0.08, 0.72), rot=(math.radians(90), 0, 0), maj=10, mn=5)
    if look.get("apron"):
        ap = mat(f"{name}_apron", look["apron"], 0.85)
        M.box(ap, (0.24 * w, 0.02, 0.5), (0, -0.14 * w - belly * 0.25, 0.5), bevel=0.01, segs=1)
        M.box(ap, (0.17 * w, 0.02, 0.24), (0, -0.15 * w - belly * 0.3, 0.98), bevel=0.01, segs=1)
    o = M.join()
    for p in o.data.polygons: p.use_smooth = False    # faceted low-poly look
    o.location.x = x
    return o


LOOKS = [
    ("test-chemist", -0.75, dict(skin="fair", shirt="#F3EEE4", sleeve="#F3EEE4", legs="#4E4A57", shoes="#3D2C25", hair="#C9C4BC",
                                vest="#7A5232", belly=0.05, width=1.08, jaw=True, hairstyle="balding", mustache=True, glasses=True, apron="#DCD3C2",
                                expr=dict(brow=12, one_up=0.018, mouth=-0.3, skew=0.35, look=-0.004))),
    ("test-courier", 0.0, dict(skin="warm", shirt="#6E9E5E", sleeve="#6E9E5E", rolled=True, legs="#C9A27A", shoes="#5B3A2A", boots=True, hair="#D7743A",
                               width=0.92, scale=0.97, hairstyle="ponytail", freckles=True, satchel=True, belt=True,
                               expr=dict(brow=-8, lift=0.01, mouth=1.0, grin=True, open=1.15))),
    ("test-agathe", 0.75, dict(skin="deep", shirt="#F1E5D8", legs="#6D6A8F", shoes="#4A3540", hair="#EDEAE6", skirt=True, cardigan="#B7A2EA",
                               sleeve="#B7A2EA", scale=0.93, hairstyle="bun", pearls=True, cane=True,
                               expr=dict(brow=-6, mouth=0.9, closed=True))),
]
objs = [person(n, x, l) for n, x, l in LOOKS]

# ---- render: a lineup from the game's angle, and faces up close ----
sc = bpy.context.scene
for lc in bpy.context.view_layer.layer_collection.children:
    if lc.name == "Collection": continue
    lc.exclude = not lc.name.startswith("test-")
fl = bpy.data.objects.get("render_floor"); fl.hide_render = False; fl.location.z = 0; fl.scale = (8, 8, 1)
cam = bpy.data.objects["Camera"]; cam.data.type = 'ORTHO'
li = bpy.data.objects["Light"]; li.rotation_euler = (-Vector((0.35, -0.8, 1.2)).normalized()).to_track_quat('-Z', 'Y').to_euler()
outdir = os.path.join(REPO, "blender", "previews")


def shoot(path, d, target, scale, res):
    d = Vector(d).normalized()
    cam.location = Vector(target) + d * 20; cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler(); cam.data.ortho_scale = scale
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.filepath = os.path.join(outdir, path); bpy.ops.render.render(write_still=True)

shoot("characters-test.png", (0.25, -1.0, 0.3), (0, 0, 0.82), 2.35, (1400, 1100))
shoot("characters-test-iso.png", (0.7, -1.0, 0.85), (0, 0, 0.8), 2.6, (1200, 1000))
shoot("characters-test-faces.png", (0.15, -1.0, 0.08), (0, 0, 1.47), 1.75, (1400, 420))
result = {"ok": [o.name for o in objs]}
