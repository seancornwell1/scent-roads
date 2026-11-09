# Contact sheet: renders the named models side by side to blender/previews/<sheet>.png.
# Set NAMES and SHEET before exec'ing this file.
import bpy, math, os
from mathutils import Vector
c = bpy.data.collections.get("lineup") or bpy.data.collections.new("lineup")
if c.name not in bpy.context.scene.collection.children: bpy.context.scene.collection.children.link(c)
for o in list(c.objects): bpy.data.objects.remove(o, do_unlink=True)
for lc in bpy.context.view_layer.layer_collection.children:
    if lc.name != "Collection": lc.exclude = lc.name != "lineup"
x = 0.0; gap = 0.25
for n in NAMES:
    src = bpy.data.objects[n]
    xs = [v.co.x for v in src.data.vertices]
    w = max(xs) - min(xs)
    o = bpy.data.objects.new("lineup_" + n, src.data); c.objects.link(o)
    o.location = (x - min(xs), 0, 0); x += w + gap
total = x - gap
cam = bpy.data.objects["Camera"]
d = Vector((0.45, 1.0, 0.6)).normalized()
H = max(max(v.co.z for v in bpy.data.objects[n].data.vertices) for n in NAMES)
target = Vector((total / 2, 0, H / 2))
cam.location = target + d * 30
cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
cam.data.ortho_scale = max(total * 1.08, H * 2.0)
sc = bpy.context.scene
sc.render.resolution_x, sc.render.resolution_y = 1600, int(1600 * min(1.0, max(0.45, H * 2.0 / cam.data.ortho_scale * 0.75)))
sc.render.filepath = os.path.join(r"C:\Users\seanc\Projects\scent-roads\blender\previews", SHEET + ".png")
bpy.ops.render.render(write_still=True)
result = {"sheet": sc.render.filepath}
