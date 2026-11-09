# More parts for the Grab3D Character Mixer "cozy" kit (test set, Nov 9):
#   top_apron         the kit's T-shirt with a perfumer's apron over the front; keeps the
#                     shirt's skin weights and its chubby/slim shape keys, so it fits every body
#   hair_fluffy       a cloud of soft curls (hair colour slot), plus hair_fluffy__short for under hats
#   face_heartglasses heart-shaped glasses (head bone)
#   shoes_clogs       chunky wooden clogs (foot.L / foot.R)
# Kit characters face -Y in Blender; the head spans z 0.63-1.07, feet sit at x = +-0.078.
import bpy, bmesh, math, os
from mathutils import Vector

REPO = r"C:\Users\seanc\Projects\scent-roads"
KIT = os.path.join(REPO, "assets", "grab3d", "characters", "cozy", "parts")
OUT = os.path.join(REPO, "assets", "custom", "characters")
os.makedirs(os.path.join(OUT, "thumbs"), exist_ok=True)
lib = {}
exec(open(os.path.join(REPO, "blender", "lib.py")).read(), lib)
hexcol = lib["hexcol"]

coll = bpy.data.collections.get("character-parts-2") or bpy.data.collections.new("character-parts-2")
if coll.name not in bpy.context.scene.collection.children: bpy.context.scene.collection.children.link(coll)
for o in list(coll.objects): bpy.data.objects.remove(o, do_unlink=True)
lc = bpy.context.view_layer.layer_collection.children[coll.name]; lc.exclude = False
bpy.context.view_layer.active_layer_collection = lc

SLOTS = ("primary", "secondary", "accent", "hair", "metal")
for n in SLOTS:   # free the exact names: exported material names must match the kit's colour slots
    for m in list(bpy.data.materials):
        if m.name == n or m.name.startswith(n + "."): m.name = "old-" + m.name


def import_part(name):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(KIT, name + ".glb"))
    new = [o for o in bpy.data.objects if o not in before]
    for o in new:
        for uc in list(o.users_collection): uc.objects.unlink(o)
        coll.objects.link(o)
    rig = next(o for o in new if o.type == 'ARMATURE')
    mesh = next(o for o in new if o.type == 'MESH' and o.vertex_groups)
    for o in new:
        if o not in (rig, mesh): bpy.data.objects.remove(o, do_unlink=True)
    for m in mesh.data.materials: m.name = m.name.split(".")[0]
    return rig, mesh

# templates: rig + slot materials, hair and metal materials, and the T-shirt to build the apron on
rig, beanie = import_part("hat_beanie")
MAT = {m.name: m for m in beanie.data.materials}
_, hairT = import_part("hair_bob"); MAT["hair"] = hairT.data.materials[0]
_, glassesT = import_part("face_glasses"); MAT["metal"] = glassesT.data.materials[0]
for o in (beanie, hairT, glassesT):
    for r in [p for p in [o.parent] if p and p != rig]: bpy.data.objects.remove(r, do_unlink=True)
    bpy.data.objects.remove(o, do_unlink=True)
tshirt_rig, tshirt = import_part("top_tshirt")
for i, m in enumerate(tshirt.data.materials):   # use the exact-named slot materials, so recolouring works
    base = m.name.split(".")[0]
    if base in MAT: tshirt.data.materials[i] = MAT[base]
    else: MAT[base] = m


def colour(slot, hexc, rough=0.7, alpha=1.0):
    b = MAT[slot].node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = hexcol(hexc); b.inputs["Roughness"].default_value = rough
    b.inputs["Alpha"].default_value = alpha
    MAT[slot].surface_render_method = 'BLENDED' if alpha < 1 else 'DITHERED'


def rigid(name, objs_slots, bones):
    """Joins primitives into one mesh with slot materials; bones: one name, or a function of the vertex position."""
    for o, slot in objs_slots:
        o.data.materials.clear(); o.data.materials.append(MAT[slot])
        for p in o.data.polygons: p.use_smooth = True
    bpy.ops.object.select_all(action='DESELECT')
    for o, _ in objs_slots: o.select_set(True)
    bpy.context.view_layer.objects.active = objs_slots[0][0]
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.join()
    o = bpy.context.object; o.name = name; o.data.name = name
    pick = bones if callable(bones) else (lambda co: bones)
    groups = {}
    for v in o.data.vertices:
        b = pick(v.co)
        if b not in groups: groups[b] = o.vertex_groups.new(name=b)
        groups[b].add([v.index], 1.0, 'REPLACE')
    o.modifiers.new("Armature", 'ARMATURE').object = rig
    o.parent = rig
    return o


def add(prim, slot, **kw):
    getattr(bpy.ops.mesh, f"primitive_{prim}_add")(**kw)
    o = bpy.context.object
    for uc in list(o.users_collection): uc.objects.unlink(o)
    coll.objects.link(o)
    return (o, slot)


def export(o, name, armature, morph=False):
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); armature.select_set(True)
    bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, name + ".glb"), export_format='GLB', use_selection=True,
                              export_apply=False, export_yup=True, export_skins=True, export_morph=morph,
                              export_animations=False, export_materials='EXPORT', export_cameras=False, export_lights=False)
    o.data.calc_loop_triangles()
    return len(o.data.loop_triangles)


def thumb(o, name):
    sc = bpy.context.scene
    for l in bpy.context.view_layer.layer_collection.children:
        if l.name != "Collection": l.exclude = l.name != coll.name
    for x in coll.objects: x.hide_render = x is not o
    fl = bpy.data.objects.get("render_floor"); fh = fl.hide_render if fl else None
    if fl: fl.hide_render = True
    cam = bpy.data.objects["Camera"]
    vs = [o.matrix_world @ v.co for v in o.data.vertices]
    c = sum(vs, Vector()) / len(vs); r = max((v - c).length for v in vs)
    d = Vector((0.5, -1.0, 0.45)).normalized()
    cam.location = c + d * 10; cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler(); cam.data.ortho_scale = r * 2.4
    sc.render.film_transparent = True; sc.render.resolution_x = sc.render.resolution_y = 256
    sc.render.image_settings.file_format = 'WEBP'
    sc.render.filepath = os.path.join(OUT, "thumbs", name + ".webp")
    bpy.ops.render.render(write_still=True)
    sc.render.image_settings.file_format = 'PNG'; sc.render.film_transparent = False
    if fl: fl.hide_render = fh
    for x in coll.objects: x.hide_render = False

out = {}

# ---------- apron: the T-shirt plus a clean bib-and-skirt panel shaped onto its front ----------
# The panel is a grid projected onto the shirt from the front. Each panel vertex copies the
# skin weights and the chubby/slim offsets of the nearest shirt vertex, so it follows every body.
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree
apron = tshirt; apron.name = apron.data.name = "top_apron"
me = apron.data
keys = me.shape_keys.key_blocks if me.shape_keys else []
basis = [v.co.copy() for v in me.vertices]
bvh = BVHTree.FromPolygons(basis, [tuple(p.vertices) for p in me.polygons])
kd = KDTree(len(basis))
for i, co in enumerate(basis): kd.insert(co, i)
kd.balance()
COLS, ROWS = 10, 14
Z_TOP, Z_WAIST, Z_HEM = 0.555, 0.40, 0.22
grid = []
last_y = {}
for r in range(ROWS + 1):
    z = Z_TOP + (Z_HEM - Z_TOP) * r / ROWS
    half = 0.085 if z > Z_WAIST else 0.085 + (Z_WAIST - z) / (Z_WAIST - Z_HEM) * 0.09   # bib, then a flared skirt
    row = []
    for c in range(COLS + 1):
        x = -half + 2 * half * c / COLS
        hit = bvh.ray_cast(Vector((x, -1.0, z)), Vector((0, 1, 0)))
        if hit[0] is not None and z > 0.30:
            y = hit[0].y - 0.012
            last_y[c] = y
        else:   # below the shirt: hang straight down, flaring a little forward
            y = last_y.get(c, -0.16) - (0.30 - z) * 0.15
        row.append(Vector((x, y, z)))
    grid.append(row)
# round the bib's top corners a little
for c in (0, COLS):
    grid[0][c].z -= 0.02
n0 = len(me.vertices)
bm = bmesh.new(); bm.from_mesh(me)
layers = {k.name: bm.verts.layers.shape.get(k.name) for k in keys}
deform = bm.verts.layers.deform.verify()
accent_index = list(me.materials).index(MAT["accent"])
vgrid = []
for row in grid:
    vrow = []
    for co in row:
        v = bm.verts.new(co)
        _, near, _ = kd.find(co)
        src = me.vertices[near]
        for g in src.groups: v[deform][g.group] = g.weight
        for name, layer in layers.items():
            if layer is None: continue
            delta = keys[name].data[near].co - basis[near]
            v[layer] = co + delta
        vrow.append(v)
    vgrid.append(vrow)
for r in range(ROWS):
    for c in range(COLS):
        f = bm.faces.new((vgrid[r][c], vgrid[r][c + 1], vgrid[r + 1][c + 1], vgrid[r + 1][c]))
        f.material_index = accent_index; f.smooth = True
new_faces = [f for f in bm.faces if f.index < 0 or f.verts[0].index >= n0] if False else bm.faces[-(ROWS * COLS):]
bmesh.ops.recalc_face_normals(bm, faces=list(new_faces))
for f in new_faces:   # make sure the panel faces forward (-Y)
    if f.normal.y > 0: f.normal_flip()
bm.to_mesh(me); bm.free()
me.update()
colour("primary", "#F5A7C2"); colour("secondary", "#FBF8F3"); colour("accent", "#FBEBD3", 0.8)
for m in apron.data.materials: m.use_backface_culling = False   # the panel is a single sheet
out["top_apron"] = export(apron, "top_apron", tshirt_rig, morph=True); thumb(apron, "top_apron")

# ---------- fluffy hair ----------
HEAD = Vector((0, 0.01, 0.86))


def curls(short):
    parts = []
    for ring, (elev, n, r) in enumerate(((90, 1, 0.14), (62, 6, 0.13), (36, 9, 0.12), (10, 11, 0.11), (-16, 9, 0.1))):
        if short and ring <= 1: continue
        for i in range(n):
            a = math.radians(90 + i * 360 / n + ring * 17) if n > 1 else 0
            e = math.radians(elev)
            p = HEAD + Vector((math.cos(a) * math.cos(e), math.sin(a) * math.cos(e), math.sin(e))) * 0.205
            if n > 1 and p.y < -0.08 and p.z < 0.98: continue        # keep the face clear
            if short and p.z > 1.0: continue                          # under a hat: no crown
            parts.append(add("uv_sphere", "hair", segments=12, ring_count=8, radius=r, location=p))
    for x in (-0.12, -0.04, 0.04, 0.12):                              # fringe of little curls
        parts.append(add("uv_sphere", "hair", segments=10, ring_count=6, radius=0.055, location=HEAD + Vector((x, -0.19, 0.13 - abs(x) * 0.4))))
    return parts

colour("hair", "#8C5A3C", 0.75)
o = rigid("hair_fluffy", curls(False), "head"); out["hair_fluffy"] = export(o, "hair_fluffy", rig); thumb(o, "hair_fluffy")
o2 = rigid("hair_fluffy__short", curls(True), "head"); out["hair_fluffy__short"] = export(o2, "hair_fluffy__short", rig)
o2.hide_render = True

# ---------- heart glasses ----------
def heart_outline(cx, scale, n=28):
    pts = []
    for i in range(n):
        t = 2 * math.pi * i / n
        x = 16 * math.sin(t) ** 3; z = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((cx + x * scale, 0.80 + z * scale))
    return pts


def frame(pts, y, slot, thick=0.012, depth=0.012, lens=None):
    bm = bmesh.new()
    n = len(pts)
    c = Vector((sum(p[0] for p in pts) / n, 0, sum(p[1] for p in pts) / n))
    rings = []
    for k, grow in enumerate((0.0, thick)):
        for d in (0.0, depth):
            ring = []
            for x, z in pts:
                v = Vector((x, 0, z)); out_dir = (v - c).normalized()
                ring.append(bm.verts.new((x + out_dir.x * grow, y - d, z + out_dir.z * grow)))
            rings.append(ring)
    inner_f, inner_b, outer_f, outer_b = rings
    for a, b in ((inner_f, outer_f), (outer_f, outer_b), (outer_b, inner_b), (inner_b, inner_f)):
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new((a[i], a[j], b[j], b[i]))
    me = bpy.data.meshes.new("frame"); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new("frame", me); coll.objects.link(ob)
    res = [(ob, slot)]
    if lens:
        bm = bmesh.new()
        vs = [bm.verts.new((x, y - depth / 2, z)) for x, z in pts]
        bm.faces.new(vs)
        me = bpy.data.meshes.new("lens"); bm.to_mesh(me); bm.free()
        lo = bpy.data.objects.new("lens", me); coll.objects.link(lo); res.append((lo, lens))
    return res

colour("metal", "#E07A9A", 0.4); colour("accent", "#F7C6D6", 0.2, alpha=0.55)
parts = []
for cx in (-0.095, 0.095):
    parts += frame(heart_outline(cx, 0.0036), -0.225, "metal", lens="accent")
parts.append(add("cylinder", "metal", vertices=8, radius=0.006, depth=0.05, location=(0, -0.227, 0.815), rotation=(0, math.radians(90), 0)))
for sx in (-1, 1):   # arms back to the ears
    parts.append(add("cylinder", "metal", vertices=6, radius=0.005, depth=0.2, location=(sx * 0.165, -0.13, 0.815), rotation=(math.radians(90), 0, 0)))
o = rigid("face_heartglasses", parts, "head")
for p in o.data.polygons: p.use_smooth = False
out["face_heartglasses"] = export(o, "face_heartglasses", rig); thumb(o, "face_heartglasses")

# ---------- clogs ----------
colour("primary", "#E8A25C", 0.55); colour("secondary", "#9A5636", 0.6); colour("accent", "#F5A7C2", 0.6)
parts = []
for sx in (-1, 1):
    x = sx * 0.078
    parts.append(add("uv_sphere", "primary", segments=16, ring_count=10, radius=1, location=(x, -0.035, 0.06), scale=(0.068, 0.105, 0.058)))
    parts.append(add("cube", "secondary", size=1, location=(x, -0.035, 0.012), scale=(0.12, 0.19, 0.024)))
    parts.append(add("uv_sphere", "accent", segments=10, ring_count=6, radius=0.022, location=(x, -0.115, 0.085), scale=(1, 0.6, 0.8)))   # a little pompom
bev = parts[1][0].modifiers.new("b", 'BEVEL'); bev.width = 0.01; bev.segments = 2
bev = parts[4][0].modifiers.new("b", 'BEVEL'); bev.width = 0.01; bev.segments = 2
for o_, _ in parts:
    for m in o_.modifiers:
        bpy.context.view_layer.objects.active = o_; bpy.ops.object.modifier_apply(modifier=m.name)
o = rigid("shoes_clogs", parts, lambda co: "foot.L" if co.x > 0 else "foot.R")
out["shoes_clogs"] = export(o, "shoes_clogs", rig); thumb(o, "shoes_clogs")

result = out
