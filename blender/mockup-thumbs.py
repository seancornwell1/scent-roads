# Mock-up only, not used by the game: a small picture of each piece of buyable furniture on a
# clear background, for the restyled Shop panel mock-up (docs/mockups/shop.html, Nov 12, 2026).
# Renders docs/mockups/thumbs/<model>.png (320 px) from the models already built in the scene
# (run furniture.py, decor.py, props.py and display-case.py first). Nothing goes to assets/.
import bpy, math, os
from mathutils import Vector
g = globals()
exec(open(r"C:\Users\seanc\Projects\scent-roads\blender\lib.py").read(), g)

OUT = os.path.join(REPO, "docs", "mockups", "thumbs")
MODELS_SHOWN = g.get("ONLY") or [
    "cushion-bench", "bar-stool", "armchair", "rocking-chair", "sofa", "snake-plant", "fern", "potted-plant",
    "floor-lamp", "table-lamp", "candle-cluster", "star-lantern", "flower-vase", "globe", "standing-mirror",
    "vanity-table", "display-case", "bookshelf"]
SIZE = 320

sc = bpy.context.scene
cam = bpy.data.objects["Camera"]; sun = bpy.data.objects["Light"]; fl = bpy.data.objects.get("render_floor")
keep = (sc.render.resolution_x, sc.render.resolution_y, sc.render.filepath, sc.render.film_transparent, fl.hide_render if fl else None)
os.makedirs(OUT, exist_ok=True)
done = []
try:
    sc.render.film_transparent = True
    sc.render.resolution_x = sc.render.resolution_y = SIZE
    if fl: fl.hide_render = True
    cam.data.type = 'ORTHO'
    a = math.radians(90 - 35); e = math.radians(24)
    d = Vector((math.cos(a) * math.cos(e), math.sin(a) * math.cos(e), math.sin(e)))
    cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
    sun.rotation_euler = (-Vector((-0.5, 0.75, 1.1)).normalized()).to_track_quat('-Z', 'Y').to_euler()
    for name in MODELS_SHOWN:
        o = bpy.data.objects.get(name)
        if not o: continue
        for lc in bpy.context.view_layer.layer_collection.children:
            if lc.name == "Collection": continue
            lc.exclude = lc.name != name
        cam.location = d * 20
        bpy.context.view_layer.update()
        inv = cam.matrix_world.inverted()
        vs = [inv @ (o.matrix_world @ v.co) for v in o.data.vertices]
        xs = [v.x for v in vs]; ys = [v.y for v in vs]
        cam.location = cam.matrix_world @ Vector(((max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2, 0))
        cam.data.ortho_scale = max(max(xs) - min(xs), max(ys) - min(ys)) * 1.08
        sc.render.filepath = os.path.join(OUT, name + ".png")
        bpy.ops.render.render(write_still=True)
        done.append(name)
finally:
    sc.render.resolution_x, sc.render.resolution_y, sc.render.filepath, sc.render.film_transparent, hide = keep
    if fl: fl.hide_render = hide

result = {"thumbs": done, "missing": [n for n in MODELS_SHOWN if n not in done]}
