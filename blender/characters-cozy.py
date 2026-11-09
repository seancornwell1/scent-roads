# Character style test #2 (Nov 9), after Sean's reference image: cozy, rounded, smooth-shaded,
# about three heads tall (1.15 m, so they stand naturally behind the 0.98 m counter), calm faces
# (portraits will carry emotion). Three looks from the reference: the red-haired shopkeeper with a
# bun and glasses, a dark-haired customer with a coat and satchel, and a girl in a plaid skirt.
# Static, unrigged. Characters face -Y in Blender, like the current kit.
import bpy, bmesh, math, os
from mathutils import Vector
g = globals()
exec(open(r"C:\Users\seanc\Projects\scent-roads\blender\lib.py").read(), g)

HZ = 0.86          # head centre
HR = 0.2           # head radius


def cut_face(o, y=-0.06, top=HZ + 0.07, half=0.15):
    """Removes a hair shell's front so the face shows (o.location is not applied: use world z)."""
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y + o.location.y < y and abs(v.co.x + o.location.x) < half and v.co.z + o.location.z < top], context='VERTS')
    bm.to_mesh(o.data); bm.free()


def clump(M, m, loc, size, rot=(0, 0, 0)):
    """A soft hair clump: a stretched sphere."""
    return M.sphere(m, 1.0, loc, scale=size, seg=14, rings=9, rot=rot)


def person(name, x, look):
    M = Model(name)
    skin = mat(f"{name}_skin", look.get("skin", "#F6D3BC"), 0.8)
    hair = mat(f"{name}_hair", look["hair"], 0.65)
    top = mat(f"{name}_top", look["top"], 0.8)
    legs = mat(f"{name}_legs", look["legs"], 0.8)
    shoes = mat(f"{name}_shoes", look["shoes"], 0.5)
    eye = mat(f"{name}_eye", look.get("eye", "#4A3030"), 0.3)
    shine = mat(f"{name}_shine", "#FFFFFF", 0.2)
    blush = mat(f"{name}_blush", "#F2A0A0", 0.9)
    mouth = mat(f"{name}_mouth", "#A85A5A", 0.6)

    # ---- legs, socks, shoes ----
    for sx in (-1, 1):
        lx = sx * 0.06
        M.sphere(shoes, 0.05, (lx, -0.02, 0.035), scale=(0.95, 1.4, 0.75), seg=14, rings=8)
        leg_m = mat(f"{name}_socks", look["socks"], 0.8) if look.get("socks") else legs
        M.cyl(leg_m, 0.04, 0.3, (lx, 0, 0.05), r2=0.045, verts=14, bevel=0.01)
        if look.get("boots"):
            M.cyl(shoes, 0.048, 0.14, (lx, 0, 0.03), r2=0.05, verts=14, bevel=0.012)
    # ---- skirt or trousers ----
    if look.get("skirt"):
        sk = mat(f"{name}_skirt", look["skirt"], 0.85)
        M.cyl(sk, 0.2, 0.17, (0, 0, 0.26), r2=0.125, verts=20, bevel=0.015)
        if look.get("plaid"):   # plaid: thin crossing bands in a lighter green and a dark line
            pl = mat(f"{name}_plaid", look["plaid"], 0.85)
            for z in (0.29, 0.355):
                M.cyl(pl, 0.2 - (z - 0.26) * 0.44, 0.012, (0, 0, z), r2=0.2 - (z + 0.012 - 0.26) * 0.44, verts=20, bevel=0)
                M.parts[-1].scale = (1.01, 1.01, 1); M._apply(M.parts[-1])
    else:
        M.cyl(legs, 0.118, 0.1, (0, 0, 0.3), r2=0.114, verts=18, bevel=0.02)
        M.parts[-1].scale = (1, 0.76, 1); M._apply(M.parts[-1])   # stays inside the body's outline
    # ---- body ----
    M.cyl(top, 0.12, 0.27, (0, 0, 0.36), r2=0.125, verts=18, bevel=0.04)
    M.parts[-1].scale = (1, 0.78, 1); M._apply(M.parts[-1])
    if look.get("coat"):     # a coat or blazer over the shirt, open at the front
        c = mat(f"{name}_coat", look["coat"], 0.8)
        for sx in (-1, 1):
            M.box(c, (0.12, 0.21, 0.3 + look.get("coat_long", 0)), (sx * 0.068, 0.006, 0.34 - look.get("coat_long", 0)), bevel=0.05, segs=4)
        M.cyl(c, 0.128, 0.06, (0, 0.0, 0.59), r2=0.1, verts=18, bevel=0.02)   # shoulders and collar
        M.parts[-1].scale = (1, 0.8, 1); M._apply(M.parts[-1])
    if look.get("collar"):
        col = mat(f"{name}_collar", look["collar"], 0.7)
        for sx in (-1, 1):
            M.box(col, (0.06, 0.02, 0.04), (sx * 0.03, -0.088, 0.61), bevel=0.012, segs=3, rot=(0, math.radians(30 * sx), 0))
        if look.get("ribbon"):
            M.sphere(mat(f"{name}_ribbon", look["ribbon"], 0.6), 0.02, (0, -0.1, 0.6), scale=(1.4, 0.6, 0.9), seg=10, rings=6)
    # ---- arms ----
    sleeve = mat(f"{name}_sleeve", look.get("sleeve", look.get("coat", look["top"])), 0.8)
    for sx in (-1, 1):
        sh = Vector((sx * 0.135, 0, 0.6))
        M.sphere(sleeve, 0.048, sh, seg=14, rings=8)
        arm = M.cyl(sleeve, 0.043, 0.24, (0, 0, 0), r2=0.036, verts=14, bevel=0.01, rot=(0, math.radians(180 - 10 * sx), 0))
        arm.location = sh; M._apply(arm); bpy.ops.object.transform_apply(location=True)
        hand = sh + Vector((sx * 0.042, 0, -0.255))
        M.sphere(skin, 0.036, hand, scale=(0.9, 1, 1.1), seg=12, rings=8)
    # ---- head ----
    M.cyl(skin, 0.04, 0.08, (0, 0, 0.6), verts=12, bevel=0)
    M.sphere(skin, HR, (0, 0, HZ), scale=(1.06, 1.0, 0.98), seg=28, rings=18)
    for sx in (-1, 1):
        M.sphere(skin, 0.03, (sx * 0.205, 0.0, HZ - 0.02), scale=(0.55, 0.9, 1.2), seg=10, rings=6)
        # eyes: tall soft ovals with a highlight
        ex = sx * 0.068
        M.sphere(eye, 0.03, (ex, -0.186, HZ - 0.03), scale=(0.85, 0.4, 1.2), seg=14, rings=10)
        M.sphere(shine, 0.009, (ex - 0.008, -0.197, HZ - 0.012), scale=(1, 0.5, 1), seg=8, rings=6)
        M.box(hair if look.get("dark_brows", True) else eye, (0.04, 0.012, 0.01), (ex, -0.19, HZ + 0.035), bevel=0.004, segs=2, rot=(0, math.radians(-6 * sx), 0))
        M.sphere(blush, 0.026, (sx * 0.105, -0.17, HZ - 0.075), scale=(1.2, 0.35, 0.65), seg=10, rings=6)
    M.box(mouth, (0.028, 0.01, 0.007), (0, -0.196, HZ - 0.105), bevel=0.003, segs=2)
    M.sphere(skin, 0.014, (0, -0.2, HZ - 0.06), scale=(1, 0.7, 0.8), seg=8, rings=6)   # a tiny nose
    if look.get("glasses"):
        fr = mat(f"{name}_frames", "#3A2A2E", 0.4)
        for sx in (-1, 1):
            M.torus(fr, 0.042, 0.005, (sx * 0.068, -0.2, HZ - 0.025), rot=(math.radians(90), 0, 0), maj=20, mn=6)
        M.box(fr, (0.04, 0.008, 0.008), (0, -0.205, HZ - 0.018), bevel=0)
    # ---- hair ----
    hs = look["hairstyle"]
    shell = M.sphere(hair, HR + 0.022, (0, 0.012, HZ + 0.02), scale=(1.06, 1.02, 1.0), seg=24, rings=14)
    cut_face(shell, top=HZ + 0.08)
    if hs == "bun":
        clump(M, hair, (0, 0.045, HZ + 0.225), (0.068, 0.068, 0.058))                        # the bun
        for i, (dx, dz, r) in enumerate(((-0.115, 0.075, 28), (-0.045, 0.105, 12), (0.035, 0.11, -10), (0.11, 0.08, -26))):
            clump(M, hair, (dx, -0.172, HZ + dz), (0.055, 0.022, 0.068), rot=(math.radians(18), math.radians(r), 0))
        for sx in (-1, 1):   # loose strands by the cheeks
            clump(M, hair, (sx * 0.185, -0.1, HZ - 0.06), (0.03, 0.03, 0.1), rot=(0, math.radians(8 * sx), 0))
    elif hs == "messy":
        for i in range(24):          # finer, pointier tufts all over
            a = math.radians(i * 360 / 12 + (i // 12) * 15 + 90); e = math.radians(38 if i < 12 else 62)
            p = Vector((math.cos(a) * math.cos(e), math.sin(a) * math.cos(e), math.sin(e))) * (HR + 0.018) + Vector((0, 0.01, HZ + 0.02))
            if p.y < -0.12 and p.z < HZ + 0.1: continue
            n = (p - Vector((0, 0.01, HZ))).normalized()
            t = clump(M, hair, p, (0.04, 0.04, 0.075))
            t.rotation_euler = n.to_track_quat('Z', 'Y').to_euler(); M._apply(t)
        for dx, r in ((-0.1, 32), (-0.035, 10), (0.04, -14), (0.11, -30)):
            clump(M, hair, (dx, -0.175, HZ + 0.085), (0.04, 0.022, 0.08), rot=(math.radians(28), math.radians(r), 0))
        clump(M, hair, (0, 0.13, HZ - 0.09), (0.15, 0.06, 0.1))                                # nape
    elif hs == "long":
        for dx, r in ((-0.11, 20), (-0.04, 6), (0.04, -6), (0.11, -20)):                         # fringe
            clump(M, hair, (dx, -0.168, HZ + 0.09), (0.055, 0.03, 0.07), rot=(math.radians(18), math.radians(r), 0))
        for sx in (-1, 1):                                                                      # side locks to the shoulders
            clump(M, hair, (sx * 0.19, -0.02, HZ - 0.12), (0.06, 0.08, 0.2), rot=(0, math.radians(6 * sx), 0))
        clump(M, hair, (0, 0.11, HZ - 0.12), (0.2, 0.09, 0.26))                                # back, down past the shoulders
        M.box(mat(f"{name}_clip", look.get("clip", "#F5D774"), 0.4), (0.045, 0.015, 0.016), (0.11, -0.175, HZ + 0.13), bevel=0.005, segs=2, rot=(0, math.radians(-25), 0))
    # ---- props ----
    if look.get("satchel"):
        bag = mat(f"{name}_bag", "#7A4A2E", 0.65)
        M.box(bag, (0.025, 0.012, 0.42), (0, -0.108, 0.45), bevel=0.004, segs=2, rot=(0, math.radians(-40), 0))
        M.box(bag, (0.13, 0.05, 0.1), (0.15, -0.03, 0.3), bevel=0.02, segs=3)
    o = M.join()
    o.location.x = x
    return o


LOOKS = [
    ("cozy-shopkeeper", -0.42, dict(hair="#8E2A34", hairstyle="bun", glasses=True, top="#F4EEE6", coat="#2F5640", collar="#F4EEE6", ribbon="#2E2A2E",
                                   legs="#2B2A33", shoes="#3A2A25", eye="#5A3A30")),
    ("cozy-customer", 0.0, dict(hair="#24222A", hairstyle="messy", top="#E8E0D2", coat="#4E6B45", coat_long=0.08, legs="#2C2C34", shoes="#2A211E", boots=True,
                                satchel=True, skin="#F0C8AE")),
    ("cozy-girl", 0.42, dict(hair="#9C6B45", hairstyle="long", top="#F7F3EC", collar="#FFFFFF", ribbon="#8E2A34", skirt="#3E5A3E", plaid="#6E8E5E",
                             legs="#F7F3EC", socks="#F3EEE6", shoes="#2E2524", clip="#F2C9A0")),
]
objs = [person(n, x, l) for n, x, l in LOOKS]

sc = bpy.context.scene
for lc in bpy.context.view_layer.layer_collection.children:
    if lc.name == "Collection": continue
    lc.exclude = not lc.name.startswith("cozy-")
fl = bpy.data.objects.get("render_floor"); fl.hide_render = False; fl.location.z = 0; fl.scale = (8, 8, 1)
cam = bpy.data.objects["Camera"]; cam.data.type = 'ORTHO'
li = bpy.data.objects["Light"]; li.data.energy = 3.2
li.rotation_euler = (-Vector((0.4, -0.7, 1.1)).normalized()).to_track_quat('-Z', 'Y').to_euler()
out = os.path.join(REPO, "blender", "previews")


def shoot(path, d, target, scale, res):
    d = Vector(d).normalized()
    cam.location = Vector(target) + d * 20; cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler(); cam.data.ortho_scale = scale
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.filepath = os.path.join(out, path); bpy.ops.render.render(write_still=True)

shoot("characters-cozy.png", (0.3, -1.0, 0.35), (0, 0, 0.56), 1.45, (1400, 1150))
shoot("characters-cozy-iso.png", (0.75, -1.0, 0.85), (0, 0, 0.55), 1.6, (1200, 1000))
result = {"ok": [o.name for o in objs]}
