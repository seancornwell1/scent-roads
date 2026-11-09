# UI icons for the counter, rendered from little Blender models to transparent PNGs
# in assets/custom/ui/ (192 px):
#   bottle-<spoke>.png  one chunky bottle per radar spoke, in that spoke's colour
#   star.png, star-empty.png, coin.png, sparkle.png
# Colours per spoke are listed in src/data/radar.json (each spoke's "icon").
import bpy, math, os
from mathutils import Vector
g = globals()
exec(open(r"C:\Users\seanc\Projects\scent-roads\blender\lib.py").read(), g)

OUT = os.path.join(REPO, "assets", "custom", "ui")
os.makedirs(OUT, exist_ok=True)
SPOKE_COLOURS = {
    "citrus": "#F6D774", "fresh": "#9DD4F2", "green": "#9ED89A", "floral": "#F5A7C2",
    "woody": "#C08A5E", "amber": "#EBA35C", "gourmand": "#E2B4DA", "spicy": "#E0806A",
    "unknown": "#F1E8DC",   # a material whose direction you have not learned yet
}


def render_icon(M, name, d=Vector((0.35, 1.0, 0.45)), pad=1.25, size=192):
    """Renders the joined model M alone, transparent, to OUT/name.png (no export)."""
    M.join()
    sc = bpy.context.scene
    for lc in bpy.context.view_layer.layer_collection.children:
        if lc.name == "Collection": continue
        lc.exclude = lc.name != M.name
    fl = bpy.data.objects.get("render_floor"); fl_hidden = fl.hide_render if fl else None
    if fl: fl.hide_render = True
    cam = bpy.data.objects["Camera"]; cam.data.type = 'ORTHO'
    d = d.normalized()
    vs = [v.co for v in M.obj.data.vertices]
    lo = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs)))
    hi = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
    c = (lo + hi) / 2
    cam.location = c + d * 20
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    cam.data.ortho_scale = max(hi - lo) * pad
    li = bpy.data.objects["Light"]
    li.rotation_euler = (-Vector((-0.4, 0.8, 1.2)).normalized()).to_track_quat('-Z', 'Y').to_euler()
    sc.render.film_transparent = True
    sc.render.resolution_x = sc.render.resolution_y = size
    sc.render.filepath = os.path.join(OUT, name + ".png")
    bpy.ops.render.render(write_still=True)
    sc.render.film_transparent = False
    if fl: fl.hide_render = fl_hidden
    return sc.render.filepath


done = []
# ---------- a chunky bottle per spoke ----------
for spoke, col in SPOKE_COLOURS.items():
    M = Model(f"icon-bottle-{spoke}")
    body = mat(f"icon_{spoke}_body", col, 0.18)
    M.sphere(body, 0.5, (0, 0, 0.45), scale=(1, 1, 0.9), seg=28, rings=16)
    M.cyl(mat("icon_neck", "white", 0.3), 0.2, 0.18, (0, 0, 0.82), verts=20, bevel=0.05)
    M.sphere(mat(f"icon_{spoke}_cap", col, 0.45), 0.26, (0, 0, 1.08), scale=(1, 1, 0.75), seg=20, rings=12)
    M.sphere(mat("icon_shine", "white", 0.1), 0.11, (-0.2, 0.36, 0.62), scale=(0.7, 0.4, 1.3), seg=12, rings=8)
    done.append(render_icon(M, f"bottle-{spoke}"))

# ---------- stars ----------
def star_mesh(M, m, r1=0.5, r2=0.22, depth=0.16):
    pts = []
    for i in range(10):
        a = math.pi / 2 + i * math.pi / 5
        r = r1 if i % 2 == 0 else r2
        pts.append((r * math.cos(a), r * math.sin(a)))
    vs = [(x, -depth / 2, z) for x, z in pts] + [(x, depth / 2, z) for x, z in pts] + [(0, -depth / 2 - 0.08, 0), (0, depth / 2 + 0.08, 0)]
    fs = [((i + 1) % 10, i, 20) for i in range(10)] + [(10 + i, 10 + (i + 1) % 10, 21) for i in range(10)]
    fs += [(i, (i + 1) % 10, 10 + (i + 1) % 10, 10 + i) for i in range(10)]
    o = M.mesh(m, vs, fs, bevel=0.04, smooth=False)
    o.modifiers["Bevel"].segments = 3
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:]); bm.to_mesh(o.data); bm.free()
    return o

for name, col, rough in (("star", "#FFD45C", 0.3), ("star-empty", "#EADFD2", 0.7)):
    M = Model(f"icon-{name}")
    star_mesh(M, mat(f"icon_{name}", col, rough))
    done.append(render_icon(M, name, d=Vector((0.15, 1.0, 0.2))))

# ---------- coin ----------
M = Model("icon-coin")
gold = mat("icon_gold", "#F7C95A", 0.35)
M.cyl(gold, 0.5, 0.12, (0, 0.06, 0), verts=40, rot=(math.radians(90), 0, 0), bevel=0.04)
M.cyl(mat("icon_gold_dark", "#EBAE3E", 0.4), 0.36, 0.13, (0, 0.065, 0), verts=40, rot=(math.radians(90), 0, 0), bevel=0.02)
M.sphere(gold, 0.13, (0, 0.04, 0.0), scale=(1, 0.6, 1), seg=16, rings=10)   # a little raised boss
done.append(render_icon(M, "coin", d=Vector((0.25, 1.0, 0.25))))

# ---------- sparkle ----------
M = Model("icon-sparkle")
sp = mat("icon_sparkle", "#FFF4C2", 0.2)
for rot in (0, 90):
    M.sphere(sp, 0.5, (0, 0, 0), scale=(0.16, 0.08, 1.0), seg=12, rings=10, rot=(0, math.radians(rot), 0))
for rot in (45, 135):
    M.sphere(sp, 0.32, (0, 0, 0), scale=(0.12, 0.06, 1.0), seg=10, rings=8, rot=(0, math.radians(rot), 0))
done.append(render_icon(M, "sparkle", d=Vector((0, 1.0, 0)), pad=1.1))

result = {"icons": [os.path.basename(p) for p in done]}
