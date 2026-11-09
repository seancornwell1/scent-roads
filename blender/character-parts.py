# New parts for the Grab3D Character Mixer "cozy" kit, rigidly skinned to its
# skeleton so they ride along with every animation:
#   hat_beret (head), hat_flowercrown (head), handL_perfume (hand.L).
# Each part is exported with a copy of the kit rig, like the kit's own parts, and
# uses the kit's colour slot material names (primary / secondary / accent).
# Exports to assets/custom/characters/ with a 256 px thumbnail each.
import bpy, bmesh, math, os
from mathutils import Vector, Matrix

REPO = r"C:\Users\seanc\Projects\scent-roads"
KIT = os.path.join(REPO, "assets", "grab3d", "characters", "cozy")
OUT = os.path.join(REPO, "assets", "custom", "characters")
os.makedirs(os.path.join(OUT, "thumbs"), exist_ok=True)

lib = {}
exec(open(os.path.join(REPO, "blender", "lib.py")).read(), lib)
hexcol = lib["hexcol"]

coll = bpy.data.collections.get("character-parts") or bpy.data.collections.new("character-parts")
if coll.name not in bpy.context.scene.collection.children: bpy.context.scene.collection.children.link(coll)
for o in list(coll.objects): bpy.data.objects.remove(o, do_unlink=True)
lc = bpy.context.view_layer.layer_collection.children["character-parts"]; lc.exclude = False
bpy.context.view_layer.active_layer_collection = lc

# template: the kit's beanie gives us the rig and exactly-named slot materials
for n in ("primary", "secondary", "accent"):   # free the exact names (exported names must match the kit's)
    for m in list(bpy.data.materials):
        if m.name == n or m.name.startswith(n + "."): m.name = "old-" + m.name
for o in [o for o in bpy.data.objects if o.name == "kit-rig"]: bpy.data.objects.remove(o, do_unlink=True)
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=os.path.join(KIT, "parts", "hat_beanie.glb"))
imported = [o for o in bpy.data.objects if o not in before]
rig = next(o for o in imported if o.type == 'ARMATURE')
template = next(o for o in imported if o.type == 'MESH' and o.vertex_groups)
SLOT = {}
for m in template.data.materials:
    m.name = m.name.split(".")[0]          # make sure they are exactly primary / secondary / accent
    SLOT[m.name] = m
for o in imported:
    if o not in (rig,): bpy.data.objects.remove(o, do_unlink=True)
rig.name = "kit-rig"


def set_color(slot, hexc, rough=0.6):
    b = SLOT[slot].node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = hexcol(hexc); b.inputs["Roughness"].default_value = rough


class Part:
    def __init__(self, name):
        self.name = name; self.objs = []

    def add(self, slot, prim, **kw):
        getattr(bpy.ops.mesh, f"primitive_{prim}_add")(**kw)
        o = bpy.context.object
        self.objs.append((o, slot)); return o

    def build(self, bone, mats):
        # join everything into one mesh with the slot materials, weighted 100 % to one bone
        for o, slot in self.objs:
            o.data.materials.clear(); o.data.materials.append(SLOT[slot])
            for p in o.data.polygons: p.use_smooth = True
        bpy.ops.object.select_all(action='DESELECT')
        for o, _ in self.objs: o.select_set(True)
        bpy.context.view_layer.objects.active = self.objs[0][0]
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        bpy.ops.object.join()
        o = bpy.context.object; o.name = self.name; o.data.name = self.name
        for uc in list(o.users_collection): uc.objects.unlink(o)
        coll.objects.link(o)
        g = o.vertex_groups.new(name=bone); g.add(range(len(o.data.vertices)), 1.0, 'REPLACE')
        mod = o.modifiers.new("Armature", 'ARMATURE'); mod.object = rig
        o.parent = rig
        for slot, (hexc, rough) in mats.items(): set_color(slot, hexc, rough)
        self.obj = o
        return o

    def export(self):
        bpy.ops.object.select_all(action='DESELECT')
        self.obj.select_set(True); rig.select_set(True)
        bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, self.name + ".glb"), export_format='GLB', use_selection=True,
                                  export_apply=False, export_yup=True, export_skins=True, export_animations=False,
                                  export_materials='EXPORT', export_cameras=False, export_lights=False, export_morph=False)
        me = self.obj.data; me.calc_loop_triangles()
        return len(me.loop_triangles)

    def thumb(self):
        sc = bpy.context.scene
        for l in bpy.context.view_layer.layer_collection.children:
            if l.name != "Collection": l.exclude = l.name != "character-parts"
        for o in coll.objects: o.hide_render = o not in (self.obj,)
        fl = bpy.data.objects.get("render_floor"); fl_h = fl.hide_render if fl else None
        if fl: fl.hide_render = True
        cam = bpy.data.objects["Camera"]
        vs = [self.obj.matrix_world @ v.co for v in self.obj.data.vertices]
        c = sum(vs, Vector()) / len(vs); r = max((v - c).length for v in vs)
        d = Vector((0.5, -1.0, 0.45)).normalized()          # kit characters face -Y in Blender
        cam.location = c + d * 10; cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
        cam.data.ortho_scale = r * 2.4
        sc.render.film_transparent = True
        sc.render.resolution_x = sc.render.resolution_y = 256
        sc.render.image_settings.file_format = 'WEBP'
        sc.render.filepath = os.path.join(OUT, "thumbs", self.name + ".webp")
        bpy.ops.render.render(write_still=True)
        sc.render.image_settings.file_format = 'PNG'; sc.render.film_transparent = False
        if fl: fl.hide_render = fl_h
        for o in coll.objects: o.hide_render = False

out = {}
HEAD = Vector((0, 0, 0.95))   # centre of the chibi head (beanie spans z 0.82 to 1.22)

# ---------- beret ----------
P = Part("hat_beret")
P.add("primary", "uv_sphere", segments=24, ring_count=12, radius=0.26, location=HEAD + Vector((0.02, 0.0, 0.21)),
      rotation=(math.radians(-6), math.radians(14), 0), scale=(1.05, 1.0, 0.33))
P.add("secondary", "torus", major_radius=0.205, minor_radius=0.025, major_segments=24, minor_segments=8,
      location=HEAD + Vector((0.0, 0.0, 0.17)), rotation=(math.radians(-6), math.radians(10), 0))
P.add("accent", "cylinder", vertices=8, radius=0.012, depth=0.05, location=HEAD + Vector((0.04, 0.0, 0.31)),
      rotation=(0, math.radians(14), 0))
P.build("head", {"primary": ("#B7A2EA", 0.85), "secondary": ("#8F7BCB", 0.85), "accent": ("#8F7BCB", 0.8)})
out["hat_beret"] = P.export(); P.thumb()

# ---------- flower crown ----------
P = Part("hat_flowercrown")
P.add("primary", "torus", major_radius=0.235, minor_radius=0.018, major_segments=28, minor_segments=6,
      location=HEAD + Vector((0, 0.01, 0.13)), rotation=(math.radians(-14), 0, 0))
tilt = Matrix.Rotation(math.radians(-14), 3, 'X')
for i in range(9):
    a = -math.pi / 2 + (i - 4) * math.radians(26)        # flowers across the front (-Y) and sides
    p = HEAD + Vector((0, 0.01, 0.13)) + tilt @ Vector((math.cos(a) * 0.235, math.sin(a) * 0.235, 0.02))
    for k in range(5):
        b = 2 * math.pi * k / 5
        P.add("secondary", "uv_sphere", segments=8, ring_count=5, radius=0.024,
              location=p + tilt @ Vector((math.cos(b) * 0.024, math.sin(b) * 0.024, 0.0)), scale=(1, 1, 0.6))
    P.add("accent", "uv_sphere", segments=8, ring_count=5, radius=0.014, location=p + Vector((0, 0, 0.012)))
P.build("head", {"primary": ("#8FC9A0", 0.7), "secondary": ("#F5A7C2", 0.7), "accent": ("#F6D774", 0.6)})
out["hat_flowercrown"] = P.export(); P.thumb()

# ---------- perfume bottle held in the left hand ----------
P = Part("handL_perfume")
HAND = Vector((0.305, -0.015, 0.25))
P.add("secondary", "uv_sphere", segments=16, ring_count=10, radius=0.062, location=HAND + Vector((0, 0, -0.02)), scale=(1, 1, 0.82))
P.add("accent", "cylinder", vertices=12, radius=0.02, depth=0.03, location=HAND + Vector((0, 0, 0.04)))
P.add("primary", "uv_sphere", segments=12, ring_count=8, radius=0.036, location=HAND + Vector((0, 0, 0.075)), scale=(1, 1, 0.72))
P.build("hand.L", {"primary": ("#F5A7C2", 0.45), "secondary": ("#F6D774", 0.25), "accent": ("#A6E8C6", 0.5)})
out["handL_perfume"] = P.export(); P.thumb()

result = out
