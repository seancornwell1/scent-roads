# Mood shot: lays out the cozy-overhaul models as a corner of the shop and
# renders blender/previews/room-preview.png from the game's isometric angle.
# Uses linked duplicates of the already-built models (run the model scripts first).
import bpy, math, os
from mathutils import Vector

PREV = r"C:\Users\seanc\Projects\scent-roads\blender\previews"
NAME = "room-preview"
c = bpy.data.collections.get(NAME)
if c:
    for o in list(c.objects): bpy.data.objects.remove(o, do_unlink=True)
else:
    c = bpy.data.collections.new(NAME); bpy.context.scene.collection.children.link(c)
for lc in bpy.context.view_layer.layer_collection.children:
    if lc.name == "Collection": continue
    lc.exclude = lc.name != NAME


def put(model, x, y, z=0.0, rz=0.0):
    src = bpy.data.objects[model]
    o = bpy.data.objects.new(f"{NAME}_{model}", src.data)
    o.location = (x, y, z); o.rotation_euler = (0, 0, math.radians(rz))
    c.objects.link(o)
    return o

# floor: 4 x 3 tiles of 2 m, top at z = 0
for i, x in enumerate((-3, -1, 1, 3)):
    for j, y in enumerate((1, 3, 5)):
        put("floor-planks", x, y, -0.1, 90 * ((i + j) % 2))
# back wall along y = 0 (room side +Y)
for x, kind in ((-3, "wall-plain"), (-1, "wall-window"), (1, "wall-plain"), (3, "wall-doorway")):
    put(kind, x, -0.1, -0.1)
# left wall along x = -4 (room side +X)
for y, kind in ((1, "wall-plain"), (3, "wall-window"), (5, "wall-doorway")):
    put(kind, -4.1, y, -0.1, -90)
put("door-arched", -4.15, 5.55, -0.1, -90 + 70)   # standing ajar
# furniture
put("perfume-organ", -2.2, 0.45)
put("potted-plant", -0.2, 0.4)
put("supplies-rack", 1.1, 0.3)
put("wooden-crate", 2.0, 0.9, 0, 12)
put("wooden-crate", 2.1, 0.9, 0.5, -8)
put("shop-rug", 0.4, 4.6, 0.0)
put("shop-counter", 0.4, 2.7)
for part in ("glass", "liquid", "collar", "cap", "label"):   # gumdrop is kept as separate parts
    put(f"perfume-bottle-gumdrop_{part}", 0.75, 2.7, 0.98, 20)
put("display-case", -3.45, 3.4, 0, -90)
put("potted-plant", -3.5, 1.0)
put("desk-chair", 2.6, 3.2, 0, -120)

sc = bpy.context.scene
cam = bpy.data.objects["Camera"]
cam.data.type = 'ORTHO'
d = Vector((1, 1.15, 1.2)).normalized()
target = Vector((-0.6, 2.6, 0.9))
cam.location = target + d * 30
cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
cam.data.clip_end = 100
cam.data.ortho_scale = 9.2
li = bpy.data.objects["Light"]
ld = Vector((0.4, 0.9, 1.3)).normalized()
li.rotation_euler = (-ld).to_track_quat('-Z', 'Y').to_euler()
fl = bpy.data.objects.get("render_floor")
if fl: fl.scale = (8, 8, 1); fl.location.z = -0.11
sc.render.resolution_x, sc.render.resolution_y = 1400, 1400
sc.render.filepath = os.path.join(PREV, NAME + ".png")
bpy.ops.render.render(write_still=True)
result = {"preview": sc.render.filepath}
