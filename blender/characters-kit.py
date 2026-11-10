# The chibi character kit (Nov 9): one skeleton, animation clips and swappable, recolourable parts in the
# style of characters-chibi.py, exported to assets/custom/chibi/ with a manifest shaped like the Grab3D
# Character Mixer's, so the game's loader (src/scene/characters.ts) can read it.
# Globals: ONLY (part ids to rebuild; default all), EXPORT (write the .glb files and manifest),
# SHOOT (preview names to render).
import bpy, bmesh, math, os, random, json, struct
from mathutils import Vector, Matrix, Quaternion
g = globals()
for f in ("lib.py", "chibi_kit.py", "chibi_shapes.py", "chibi_rig.py", "chibi_parts.py"):
    exec(open(os.path.join(r"C:\Users\seanc\Projects\scent-roads\blender", f)).read(), g)

rig = build_rig()
B = body(); HEADS = [head(k) for k in FACES]
ALL = [B] + HEADS + [fn() for fn in PARTS]
only = g.get("ONLY")
KITS = {K.id: K for K in ALL}
for K in ALL:
    if only and K.id not in only and bpy.data.objects.get(K.name): K.obj = bpy.data.objects[K.name]; continue
    finish_kit(K, rig, base=[B, HEADS[0]])


# ---------------- previews: characters put together from the parts ----------------
def assemble(name, parts, colors, x=0.0, fit=None, pose=None, hips=(0, 0, 0), facing=0.0):
    coll = bpy.data.collections.get("chibi-preview")
    if not coll:
        coll = bpy.data.collections.new("chibi-preview"); bpy.context.scene.collection.children.link(coll)
    r = rig.copy(); r.name = "pv_" + name; coll.objects.link(r); r.animation_data_clear()
    r.location.x = x; r.rotation_euler.z = math.radians(facing); r.hide_render = True
    set_pose(r, pose or {}, hips)
    for pid in parts:
        src = KITS[pid].obj; ob = src.copy(); ob.data = src.data.copy(); ob.name = "pv_%s_%s" % (name, pid); coll.objects.link(ob)
        ob.parent = r; ob.modifiers["Armature"].object = r
        for i, m in enumerate(ob.data.materials):
            role = m.name.split("_")[1]; hexc = colors.get(role if role != "primary" else KITS[pid].slot)
            if hexc and role in TINTED: ob.data.materials[i] = kit_mat(role, hexc)
        if fit and ob.data.shape_keys and fit in ob.data.shape_keys.key_blocks: ob.data.shape_keys.key_blocks[fit].value = 1.0
    return r


def clear_previews():
    coll = bpy.data.collections.get("chibi-preview")
    if coll:
        for o in list(coll.objects): bpy.data.objects.remove(o, do_unlink=True)
    for me in list(bpy.data.meshes):
        if me.users == 0 and me.name.startswith("ck_"): bpy.data.meshes.remove(me)


def shoot(path, d, target, scale, res):
    sc = bpy.context.scene; vl = bpy.context.view_layer
    for lc in vl.layer_collection.children:
        if lc.name != "Collection": lc.exclude = lc.name != "chibi-preview"
    fl = bpy.data.objects.get("render_floor"); fl.hide_render = False; fl.location.z = 0; fl.scale = (8, 8, 1)
    cam = bpy.data.objects["Camera"]; cam.data.type = "ORTHO"
    li = bpy.data.objects["Light"]; li.data.energy = 3.0
    li.rotation_euler = (-Vector((0.45, -0.7, 1.1)).normalized()).to_track_quat("-Z", "Y").to_euler()
    d = Vector(d).normalized()
    cam.location = Vector(target) + d * 20; cam.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler(); cam.data.ortho_scale = scale
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.filepath = os.path.join(REPO, "blender", "previews", path); bpy.ops.render.render(write_still=True)
    vl.layer_collection.children["chibi-kit"].exclude = False


result = {"tris": {K.id: getattr(K, "tris", None) for K in ALL}}
