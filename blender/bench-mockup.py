# Mock-up only, not used by the game: a mixing bench seen from the player's side, to judge
# the look of a hands-on counter round before anything is built (Nov 12, 2026).
# Renders previews/bench-mockup.png (924 x 2000, a phone screen at 2x) and writes
# docs/mockups/bench-points.js: where the bottles, the scale's display and the beaker fall
# on screen, so the mock-up page (docs/mockups/bench.html) can set its labels on them.
# Nothing is exported to assets/. Parts stay separate objects in one collection, "bench-mockup".
import bpy, math, os, json
from mathutils import Vector, Matrix
from bpy_extras.object_utils import world_to_camera_view
g = globals()
exec(open(r"C:\Users\seanc\Projects\scent-roads\blender\lib.py").read(), g)

NAME = "bench-mockup"
OUT_DIR = os.path.join(REPO, "docs", "mockups")
RES = g.get("RES", (924, 2000))
SPOKE = {   # as blender/ui-icons.py, a little deeper so they read on dark glass
    "citrus": "#F2CB52", "fresh": "#86C6EC", "green": "#86CC82", "floral": "#F091B3",
    "woody": "#B67C4E", "amber": "#E8923F", "gourmand": "#D69CCB", "spicy": "#DB6A52",
}
# The shelf in the picture: (id, family). The page's labels are in docs/mockups/bench.html.
FRONT = [("bergamot", "citrus"), ("lemon", "citrus"), ("lavender", "fresh"), ("hedione", "floral")]
BACK = [("cedarwood-virginia", "woody"), ("patchouli", "woody"), ("labdanum", "amber"), ("vanillin", "gourmand")]
IN_HAND = "bergamot"     # this bottle's pipette is out, over the beaker
LIQUID = "#EDBE4A"       # the mix leans citrus

M = Model(NAME)


def M_(name, col, rough=0.6, **kw):
    return mat("bm_" + name, col, rough, **kw)


def clear(name, col, alpha, rough=0.08):
    """See-through glass that needs no sorting (dithered), seen from both sides."""
    m = M_(name, col, rough, alpha=alpha)
    m.surface_render_method = 'DITHERED'
    m.use_backface_culling = False
    return m


def move(parts, pivot=(0, 0, 0), rot=(0, 0, 0), shift=(0, 0, 0), scale=1.0):
    """Scales and turns parts about a pivot (degrees, XYZ), then shifts them."""
    p = Vector(pivot)
    R = Matrix.Rotation(math.radians(rot[2]), 4, 'Z') @ Matrix.Rotation(math.radians(rot[1]), 4, 'Y') @ Matrix.Rotation(math.radians(rot[0]), 4, 'X') @ Matrix.Scale(scale, 4)
    T = Matrix.Translation(Vector(shift) + p) @ R @ Matrix.Translation(-p)
    for o in parts: o.matrix_basis = T @ o.matrix_basis


wood = M_("wood", "walnut", 0.55); wood_lt = M_("wood_lt", "walnut_lt", 0.55); wood_dk = M_("wood_dk", "walnut_dk", 0.5)
mahog = M_("mahog", "mahogany", 0.45)
plaster = M_("plaster", "#E4C9A2", 0.9); paper = M_("paper", "paper", 0.85); white = M_("white", "white", 0.5)
brass = M_("brass", "brass", 0.3, metal=1.0); steel = M_("steel", "#DADCD8", 0.28, metal=1.0)
ink = M_("ink", "#2A2022", 0.4); felt = M_("felt", "forest", 0.95)
amber_glass = M_("amber_glass", "#7E3A0C", 0.1)
glass = clear("glass", "#F2FBF6", 0.3); tube = clear("tube", "#F6FCFA", 0.34)
liquid = M_("liquid", LIQUID, 0.12); cream = M_("cream", "#F3E6D0", 0.25)

# ---------- the bench top and the wall behind it ----------
WALL_Y = -0.43
y = WALL_Y
for i in range(9):
    d = 0.118
    M.box((wood, wood_lt, wood)[i % 3] if i % 2 else wood, (1.4, d - 0.002, 0.04), (0, y + d / 2, -0.04), bevel=0.003)
    y += d
M.box(plaster, (1.4, 0.02, 1.2), (0, WALL_Y - 0.01, 0.0), bevel=0)
M.box(wood_dk, (1.4, 0.03, 0.11), (0, WALL_Y + 0.012, 0.0), bevel=0.004)           # upstand at the back of the bench
M.box(mahog, (1.4, 0.045, 0.014), (0, WALL_Y + 0.018, 0.11), bevel=0.004)          # its capping

# ---------- a felt mat, the scale and the beaker ----------
SC = Vector((0.0, -0.215, 0.0))        # the scale stands here
M.box(felt, (0.5, 0.3, 0.004), (0, -0.215, 0.0), bevel=0.001)
M.box(brass, (0.508, 0.308, 0.002), (0, -0.215, 0.0), bevel=0)
body = [M.box(cream, (0.16, 0.13, 0.03), (0, -0.02, 0.004), bevel=0.008),
        M.prism(cream, [(0.04, 0.004), (0.112, 0.004), (0.112, 0.012), (0.045, 0.034)], -0.08, 0.08, axis='X', bevel=0.004, smooth=True)]
slope = math.degrees(math.atan2(0.022, 0.067))
disp = M.box(ink, (0.1, 0.036, 0.002), (0, 0.079, 0.0235 - 0.001), bevel=0, rot=(-math.radians(slope), 0, 0))
knob = M.cyl(brass, 0.005, 0.004, (0.066, 0.082, 0.021), verts=14, rot=(-math.radians(slope), 0, 0), bevel=0.001)
pan = [M.cyl(steel, 0.022, 0.008, (0, -0.02, 0.034), verts=24, bevel=0.001), M.cyl(steel, 0.064, 0.005, (0, -0.02, 0.042), verts=40, bevel=0.0015)]
PAN_Z = 0.047
bk = [M.lathe(glass, [(0, 0.0), (0.034, 0.0), (0.0365, 0.003), (0.0365, 0.088), (0.0395, 0.094), (0.0375, 0.095), (0.0345, 0.088), (0.0345, 0.006), (0, 0.005)], (0, -0.02, PAN_Z), verts=32),
      M.cyl(liquid, 0.0338, 0.027, (0, -0.02, PAN_Z + 0.0055), verts=32, bevel=0.001)]
move(body + [disp, knob] + pan + bk, shift=SC)
BEAKER = SC + Vector((0, -0.02, PAN_Z))


# ---------- reagent bottles on a stepped rack ----------
def reagent(x, y, z, family, opened=False):
    """An amber dropper bottle with a paper label banded in its family's colour."""
    col = M_("fam_" + family, SPOKE[family], 0.45)
    ps = [M.lathe(amber_glass, [(0, 0), (0.027, 0), (0.0295, 0.004), (0.0295, 0.064), (0.027, 0.075), (0.0135, 0.086), (0.0125, 0.098), (0.0105, 0.098), (0, 0.096)], (x, y, z), verts=28),
          M.cyl(paper, 0.0301, 0.036, (x, y, z + 0.02), verts=28, bevel=0, caps=False),
          M.cyl(col, 0.0304, 0.008, (x, y, z + 0.046), verts=28, bevel=0, caps=False)]
    if not opened:
        ps += dropper(x, y, z + 0.095, family)
    return ps


def dropper(x, y, z, family, full=False):
    """The cap and rubber bulb of a bottle's pipette, with its glass tube below when it is out."""
    col = M_("fam_" + family, SPOKE[family], 0.45)
    ps = [M.cyl(ink, 0.0155, 0.014, (x, y, z), verts=24, bevel=0.003),
          M.lathe(col, [(0.0085, 0.013), (0.0125, 0.02), (0.013, 0.036), (0.0105, 0.046), (0.005, 0.051), (0, 0.052)], (x, y, z), verts=20)]
    if full:
        ps += [M.cyl(tube, 0.0042, 0.07, (x, y, z - 0.07), verts=14, bevel=0, caps=False),
               M.cyl(tube, 0.0016, 0.016, (x, y, z - 0.086), verts=14, r2=0.0042, bevel=0, caps=False),
               M.cyl(M_("fam_liquid_" + family, SPOKE[family], 0.15), 0.003, 0.05, (x, y, z - 0.072), verts=12, bevel=0),
               M.cyl(M_("fam_liquid_" + family, SPOKE[family], 0.15), 0.0011, 0.014, (x, y, z - 0.086), verts=12, r2=0.003, bevel=0)]
    return ps


Y_F, Y_B, Z_F, Z_B = 0.295, 0.145, 0.04, 0.115
XS = (0.171, 0.057, -0.057, -0.171)      # the camera looks from +Y, so +X is the left of the picture
M.prism(mahog, [(0.385, 0.0), (0.385, 0.004), (0.355, Z_F), (0.215, Z_F), (0.19, Z_B), (0.09, Z_B), (0.085, 0.0)], -0.243, 0.243, axis='X', bevel=0.003, smooth=True)
for z, y0, y1 in ((Z_F, 0.355, 0.215), (Z_B, 0.19, 0.09)):                      # a brass edge to each step
    M.box(brass, (0.486, 0.004, 0.002), (0, y0 - 0.002, z), bevel=0)
spots = {}
# (t: how far up its sloping front a step's name plates sit; the back row's sit high, clear of the front bottles)
for row, (y, z, ya, za, yb, zb, t) in ((FRONT, (Y_F, Z_F, 0.385, 0.004, 0.355, Z_F, 0.5)), (BACK, (Y_B, Z_B, 0.215, Z_F, 0.19, Z_B, 0.69))):
    for x, (mid, fam) in zip(XS, row):
        reagent(x, y, z, fam, opened=mid == IN_HAND)
        tilt = math.atan2(zb - za, ya - yb)                                      # a paper name plate on the step's sloping front
        py, pz = ya + (yb - ya) * t, za + (zb - za) * t
        M.box(paper, (0.1, 0.037, 0.0016), (x, py, pz), bevel=0, rot=(-tilt, 0, 0))
        spots[mid] = {"plate": Vector((x, py, pz)), "top": Vector((x + 0.024, y, z + 0.12)),
                      "left": Vector((x - 0.055, py, pz)), "right": Vector((x + 0.055, py, pz))}

# ---------- the pipette in hand, a drop on its way ----------
TIP = BEAKER + Vector((0.006, 0.0, 0.118))
pip = dropper(TIP.x, TIP.y, TIP.z + 0.086, [f for i, f in FRONT + BACK if i == IN_HAND][0], full=True)
move(pip, pivot=TIP, rot=(8, -36, 0), scale=1.15)
drop = M_("drop", SPOKE["citrus"], 0.1)
M.sphere(drop, 0.0046, TIP + Vector((0.0, 0.0, -0.022)), scale=(0.85, 0.85, 1.35), seg=14, rings=10)
M.sphere(drop, 0.0026, TIP + Vector((0.0, 0.0, -0.003)), scale=(1, 1, 1.2), seg=10, rings=8)

# ---------- smelling strips: a pot of fresh ones, two used ----------
PX, PY = -0.2, -0.305
M.lathe(cream, [(0, 0), (0.024, 0), (0.028, 0.004), (0.031, 0.07), (0.033, 0.074), (0.03, 0.075), (0.028, 0.07), (0.025, 0.008), (0, 0.008)], (PX, PY, 0.004), verts=28)
for i, (dx, dy, rx, ry) in enumerate(((-0.01, 0.0, 4, -9), (0.006, -0.006, -6, 7), (0.0, 0.008, 9, 2), (-0.004, -0.01, -10, -4), (0.012, 0.004, 3, 12), (-0.014, 0.008, 8, -14))):
    M.box(white, (0.008, 0.0012, 0.15), (PX + dx, PY + dy, 0.012), bevel=0, rot=(math.radians(rx), math.radians(ry), math.radians(20 * i)))
for (x, y, rz, tip) in ((-0.16, -0.15, 66, LIQUID), (-0.135, -0.125, 44, SPOKE["fresh"])):
    s = [M.box(white, (0.008, 0.15, 0.0012), (x, y, 0.0045), bevel=0), M.box(M_("tip_" + tip[1:], tip, 0.6), (0.0082, 0.03, 0.0013), (x, y + 0.06, 0.0045), bevel=0)]
    move(s, pivot=(x, y, 0), rot=(0, 0, rz))

# ---------- the customer's flacon, waiting ----------
def stand(model, x, y, z, rz=0.0, s=1.0):
    src = bpy.data.objects[model]
    o = bpy.data.objects.new(f"{NAME}_{model}", src.data)
    o.location = (x, y, z); o.rotation_euler = (0, 0, math.radians(rz)); o.scale = (s, s, s)
    M.coll.objects.link(o)
    return o

stand("perfume-bottle-bell", 0.19, -0.3, 0.004, 20, 0.95)

# ---------- camera and light of its own, then the picture ----------
sc = bpy.context.scene
for lc in bpy.context.view_layer.layer_collection.children:
    if lc.name == "Collection": continue
    lc.exclude = lc.name != NAME
cam_d = bpy.data.cameras.get(NAME) or bpy.data.cameras.new(NAME)
cam = bpy.data.objects.new(NAME + "_camera", cam_d); M.coll.objects.link(cam)
cam_d.type = 'PERSP'; cam_d.lens = g.get("LENS", 50); cam_d.clip_start = 0.05; cam_d.clip_end = 20
ELEV, DIST, TARGET = g.get("ELEV", 50), g.get("DIST", 1.8), Vector(g.get("TARGET", (0, -0.137, 0.06)))
e = math.radians(ELEV)
d = Vector((0, math.cos(e), math.sin(e)))
cam.location = TARGET + d * DIST
cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
lamp_d = bpy.data.lights.get(NAME) or bpy.data.lights.new(NAME, 'AREA')
lamp_d.energy = g.get("LAMP", 14); lamp_d.color = (1.0, 0.82, 0.6); lamp_d.shape = 'DISK'; lamp_d.size = 0.5
lamp = bpy.data.objects.new(NAME + "_lamp", lamp_d); M.coll.objects.link(lamp)
lamp.location = (-0.55, 0.1, 0.75)
lamp.rotation_euler = (Vector((0, -0.15, 0.05)) - Vector(lamp.location)).to_track_quat('-Z', 'Y').to_euler()

sun = bpy.data.objects["Light"]; fl = bpy.data.objects.get("render_floor")
keep = (sc.camera, sc.render.resolution_x, sc.render.resolution_y, sc.render.filepath, sun.rotation_euler.copy(), fl.hide_render if fl else None)
try:
    sc.camera = cam
    sc.render.resolution_x, sc.render.resolution_y = RES
    sun.rotation_euler = (-Vector((-0.45, 0.55, 1.0)).normalized()).to_track_quat('-Z', 'Y').to_euler()
    if fl: fl.hide_render = True
    bpy.context.view_layer.update()
    sc.render.filepath = os.path.join(PREVIEWS, NAME + ".png")
    bpy.ops.render.render(write_still=True)

    def at(p):
        v = world_to_camera_view(sc, cam, Vector(p))
        return [round(v.x, 4), round(1 - v.y, 4)]      # share of the picture, from its top left

    points = {"bottles": {k: {n: at(p) for n, p in v.items()} for k, v in spots.items()},
              "display": at(disp.matrix_world @ Vector(disp.bound_box[0]).lerp(Vector(disp.bound_box[6]), 0.5)),
              "beaker": at(BEAKER + Vector((0, 0, 0.05))), "pipette": at(TIP + Vector((-0.085, 0, 0.1))),
              "flacon": at((0.19, -0.3, 0.08)), "strips": at((PX, PY, 0.12)), "benchTop": at((0, WALL_Y, 0.125))}
    os.makedirs(OUT_DIR, exist_ok=True)
    with open(os.path.join(OUT_DIR, "bench-points.js"), "w", newline="\n") as f:
        f.write("// Written by blender/bench-mockup.py: where things fall in bench-mockup.png (share of width, height).\n")
        f.write("window.BENCH = " + json.dumps(points, indent=1) + ";\n")
finally:
    sc.camera, sc.render.resolution_x, sc.render.resolution_y, _, sun.rotation_euler, hide = keep
    sc.render.filepath = keep[3]
    if fl: fl.hide_render = hide

result = {"render": os.path.join(PREVIEWS, NAME + ".png"), "points": points, "parts": len(M.parts)}
