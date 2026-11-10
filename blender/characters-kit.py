# The chibi character kit (Nov 9): one skeleton, animation clips and swappable, recolourable parts in the
# style of characters-chibi.py, exported to assets/custom/chibi/ with a manifest shaped like the Grab3D
# Character Mixer's, so the game's loader (src/scene/characters.ts) can read it.
# Globals: ONLY (part ids to rebuild; default all), EXPORT (write the .glb files and manifest),
# THUMBS (render the creator thumbnails), SHOOT (render the preview sheets).
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


def shoot(path, d, target, scale, res, clear=False):
    """Renders the preview collection. clear: no floor, a transparent background, saved as WebP."""
    sc = bpy.context.scene; vl = bpy.context.view_layer
    for lc in vl.layer_collection.children:
        if lc.name != "Collection": lc.exclude = lc.name != "chibi-preview"
    fl = bpy.data.objects.get("render_floor"); fl.hide_render = clear; fl.location.z = 0; fl.scale = (8, 8, 1)
    cam = bpy.data.objects["Camera"]; cam.data.type = "ORTHO"
    li = bpy.data.objects["Light"]; li.data.energy = 3.0
    li.rotation_euler = (-Vector((0.45, -0.7, 1.1)).normalized()).to_track_quat("-Z", "Y").to_euler()
    d = Vector(d).normalized()
    cam.location = Vector(target) + d * 20; cam.rotation_euler = (-d).to_track_quat("-Z", "Y").to_euler(); cam.data.ortho_scale = scale
    sc.render.resolution_x, sc.render.resolution_y = res
    im = sc.render.image_settings; old = (sc.render.film_transparent, im.file_format, im.color_mode); sc.render.film_transparent = clear
    im.file_format = "WEBP" if clear else "PNG"; im.color_mode = "RGBA" if clear else "RGB"
    if clear: im.quality = 86
    sc.render.filepath = os.path.join(REPO, "blender", "previews", path); bpy.ops.render.render(write_still=True)
    sc.render.film_transparent, im.file_format, im.color_mode = old; fl.hide_render = False
    vl.layer_collection.children["chibi-kit"].exclude = False


# ---------------- export: skeleton, clips, parts and the manifest ----------------
PALETTES = {
    "skin": ["#FBE3D2", "#F8DAC6", "#F0C6A8", "#DFA883", "#C98A62", "#A96E4C", "#8A5A44", "#643F30"],
    "hair": ["#2E2230", "#4A3228", "#6B4431", "#8A5A3C", "#B5524E", "#C9773F", "#C9A45C", "#E6CF8A", "#D9D3CC", "#8E8A98", "#5A5A8C", "#C98AA6"],
    "eyes": ["#3A2A20", "#6A4A3A", "#8A5A3C", "#5C7A4A", "#4A6A8A", "#6A5A8A"],
    "cloth": ["#F4EEE4", "#E3C27A", "#E08A6A", "#C9605A", "#B5443C", "#F2A0B4", "#C98AA6", "#8A6AA6", "#4F6FA8", "#7FA8C9",
              "#8FC0B0", "#4F8A5E", "#3F7A5C", "#7C9E64", "#C9A66B", "#8A5636", "#6A3A40", "#4A4858", "#3A2E38"],
    "leather": ["#3A2E38", "#4A4858", "#6A3A40", "#8A5636", "#9A6238", "#8B5E3F", "#C9A66B", "#B5443C", "#4F6FA8", "#F4EEE4"],      # shoes and glasses frames
}
DEFAULTS = {"fit": "classic", "parts": {"body": "body", "head": "head_soft", "hair": "hair_bob", "top": "top_blouse", "bottom": "bottom_trousers", "shoes": "shoes_loafers"},
            "colors": {"skin": "#F8DAC6", "hair": "#6B4431", "eyes": "#6A4A3A"}}
PRESETS = [
    {"id": "shopkeeper", "name": {"en": "Shopkeeper"}, "fit": "classic",
     "parts": {"body": "body", "head": "head_soft", "hair": "hair_bun", "top": "top_blazer", "bottom": "bottom_trousers", "shoes": "shoes_loafers"},
     "colors": {"skin": "#F8DAC6", "hair": "#B5524E", "eyes": "#6A4A3A", "top": "#3F7A5C", "bottom": "#4A4858", "shoes": "#8A5636"}},
    {"id": "rambler", "name": {"en": "Rambler"}, "fit": "chubby",
     "parts": {"body": "body", "head": "head_calm", "hair": "hair_spiky", "top": "top_coat", "bottom": "bottom_shorts", "shoes": "shoes_boots", "handL": "handL_book"},
     "colors": {"skin": "#F0C6A8", "hair": "#5A5A8C", "eyes": "#5C7A4A", "top": "#7C9E64", "bottom": "#4A4858", "shoes": "#8B5E3F", "handL": "#4F6FA8"}},
    {"id": "schoolgirl", "name": {"en": "Schoolgirl"}, "fit": "slim",
     "parts": {"body": "body", "head": "head_bright", "hair": "hair_long", "hat": "hat_flowers", "top": "top_blouse", "bottom": "bottom_skirt", "shoes": "shoes_maryjanes"},
     "colors": {"skin": "#F8DAC6", "hair": "#C9773F", "eyes": "#8A5A3C", "top": "#F4EEE4", "bottom": "#4F8A5E", "shoes": "#6A3A40", "hat": "#F2A0B4"}},
    {"id": "painter", "name": {"en": "Painter"}, "fit": "classic",
     "parts": {"body": "body", "head": "head_soft", "hair": "hair_bob", "hat": "hat_beret", "face": "face_round", "top": "top_sweater", "bottom": "bottom_shorts", "shoes": "shoes_loafers"},
     "colors": {"skin": "#C98A62", "hair": "#2E2230", "eyes": "#3A2A20", "top": "#E3C27A", "bottom": "#4F6FA8", "shoes": "#8A5636", "hat": "#B5443C", "face": "#3A2E38"}},
]
SLOTS = ["body", "head", "hair", "hat", "face", "top", "bottom", "shoes", "handL"]


def export_kit():
    """Writes skeleton.glb, parts/<id>.glb, animations.glb and manifest.json to assets/custom/chibi/.
    The manifest names a thumbnail for every part the creator offers; thumbs() renders them."""
    rig.animation_data_clear(); set_pose(rig, {})
    _export(os.path.join(KIT_DIR, "skeleton.glb"), [], rig)
    parts = []
    for K in sorted(ALL, key=lambda K: (SLOTS.index(K.slot), ALL.index(K))):
        export_part(K, rig)
        roles = []
        for P in K.parts:
            if P.v and P.slot in TINTED and P.slot not in roles: roles.append(P.slot)
        e = {"id": K.id, "slot": K.slot, "name": {"en": K.label}, "file": "parts/%s.glb" % K.id, "tris": K.tris, "colorSlots": roles,
             "defaultColors": {"primary": K.tint} if "primary" in roles else {}}
        keys = K.obj.data.shape_keys
        if keys: e["fitMorphs"] = [k.name for k in keys.key_blocks[1:]]
        if K.slot in THUMB_VIEW: e["thumb"] = "thumbs/%s.webp" % K.id
        parts.append(e)
    build_clips(rig)
    ja = _export(os.path.join(KIT_DIR, "animations.glb"), [], rig, anims=True)
    style = {"id": "chibi", "name": {"en": "Chibi"}, "skeleton": "skeleton.glb",
             "animations": {"file": "animations.glb", "fps": FPS, "clips": [dict({"name": n, "frames": f, "duration": round(f / FPS, 4), "loop": l}, **CLIP_NOTES.get(n, {})) for n, f, l, _ in CLIPS]},
             "defaults": DEFAULTS, "palettes": PALETTES, "fits": [{"id": i, "morph": m, "thumb": "thumbs/fit_%s.webp" % i} for i, m, _ in FITS], "parts": parts, "presets": PRESETS,
             "budget": {"maxTrisPerPart": 4000, "maxTrisPerFigure": 20000}}
    man = {"version": 1, "generator": "blender/characters-kit.py", "license": "Project's own (made for Scentshop Tale)", "units": "meter", "upAxis": "+Y", "forward": "+Z",
           "slots": SLOTS, "colorSlots": list(TINTED), "bones": BONE_NAMES, "styles": [style]}
    json.dump(man, open(os.path.join(KIT_DIR, "manifest.json"), "w", encoding="utf-8"), indent=1)
    return {"animations": [(a["name"], len(a["channels"])) for a in ja.get("animations", [])], "parts": len(parts)}


def kit_label(pid): return KITS[pid].label


result = {"tris": {K.id: getattr(K, "tris", None) for K in ALL}}


# ---------------- thumbnails for the character creator ----------------
THUMB_VIEW = {   # slot: (camera direction, target, width of the view in metres)
    "head": ((0.2, -1.0, 0.12), (0, 0, 0.83), 0.56), "hair": ((0.3, -1.0, 0.15), (0, 0, 0.8), 0.86), "hat": ((0.3, -1.0, 0.2), (0, 0, 0.9), 0.78),
    "face": ((0.2, -1.0, 0.12), (0, 0, 0.82), 0.5), "top": ((0.28, -1.0, 0.25), (0, 0, 0.45), 0.6), "bottom": ((0.28, -1.0, 0.25), (0, 0, 0.27), 0.5),
    "shoes": ((0.45, -1.0, 0.4), (0, -0.02, 0.07), 0.34), "handL": ((0.7, -1.0, 0.25), (0.2, 0, 0.3), 0.4)}


def thumbs(size=144):
    """assets/custom/chibi/thumbs/<part id>.webp: each part worn by the default character, on a clear background;
    and fit_<fit id>.webp, the default character in each body shape."""
    os.makedirs(os.path.join(KIT_DIR, "thumbs"), exist_ok=True); n = 0
    for K in ALL:
        if K.slot not in THUMB_VIEW: continue
        parts = dict(DEFAULTS["parts"]); parts[K.slot] = K.id
        clear_previews(); assemble("thumb", list(parts.values()), DEFAULTS["colors"])
        d, target, scale = THUMB_VIEW[K.slot]
        shoot(os.path.join(KIT_DIR, "thumbs", K.id + ".webp"), d, target, scale, (size, size), clear=True); n += 1
    for fit, morph, _ in FITS:
        clear_previews(); assemble("thumb", list(DEFAULTS["parts"].values()), DEFAULTS["colors"], fit=morph)
        shoot(os.path.join(KIT_DIR, "thumbs", "fit_%s.webp" % fit), (0.28, -1.0, 0.25), (0, 0, 0.54), 1.14, (size, size), clear=True); n += 1
    clear_previews()
    return n


# ---------------- preview sheets ----------------
def previews():
    """blender/previews/chibi-kit.png (parts mixed and recoloured, the three body shapes) and
    chibi-kit-animations.png (frames from the clips)."""
    looks = [(p["parts"], p["colors"], p["fit"]) for p in PRESETS] + [
        ({"body": "body", "head": "head_bright", "hair": "hair_short", "face": "face_square", "top": "top_tee", "bottom": "bottom_trousers", "shoes": "shoes_boots", "handL": "handL_bottle"},
         {"skin": "#8A5A44", "hair": "#2E2230", "eyes": "#3A2A20", "top": "#E08A6A", "bottom": "#3F7A5C", "shoes": "#8B5E3F", "face": "#8A4B3A", "handL": "#8FC0B0"}, "slim"),
        ({"body": "body", "head": "head_calm", "hair": "hair_long", "hat": "hat_beret", "top": "top_coat", "bottom": "bottom_skirt", "shoes": "shoes_boots"},
         {"skin": "#FBE3D2", "hair": "#E6CF8A", "eyes": "#4A6A8A", "top": "#8A6AA6", "bottom": "#4A4858", "shoes": "#3A2E38", "hat": "#4F6FA8"}, "classic"),
        ({"body": "body", "head": "head_soft", "hair": "hair_spiky", "top": "top_sweater", "bottom": "bottom_trousers", "shoes": "shoes_loafers", "handL": "handL_book"},
         {"skin": "#DFA883", "hair": "#D9D3CC", "eyes": "#6A5A8A", "top": "#7FA8C9", "bottom": "#C9A66B", "shoes": "#6A3A40", "handL": "#C9605A"}, "chubby"),
        ({"body": "body", "head": "head_calm", "hair": "hair_short", "face": "face_moustache", "top": "top_apron", "bottom": "bottom_trousers", "shoes": "shoes_boots", "handL": "handL_satchel"},
         {"skin": "#F0C6A8", "hair": "#4A3228", "eyes": "#5C7A4A", "top": "#8FB79A", "bottom": "#4A4858", "shoes": "#8A5636", "handL": "#9A6238"}, "classic"),
    ]
    clear_previews()
    for i, (parts, colors, fit) in enumerate(looks):
        assemble("look%d" % i, list(parts.values()), colors, x=(i - (len(looks) - 1) / 2) * 0.56, fit=fit)
    shoot("chibi-kit.png", (0.28, -1.0, 0.3), (0, 0, 0.58), 4.9, (2740, 800))
    clear_previews()
    sheet = [("idle", 0.5, 0), ("walk", 0.0, -60), ("walk", 0.25, -60), ("walk", 0.5, -60), ("walk", 0.75, -60), ("run", 0.25, -60), ("run", 0.75, -60),
             ("wave", 0.35, 0), ("wave", 0.5, 0), ("jump", 0.22, -35), ("jump", 0.5, -35), ("jump", 0.8, -35), ("sit", 0.5, -60), ("sit", 0.5, 25)]
    for i, (clip, u, facing) in enumerate(sheet):
        parts, colors, fit = looks[(0, 2, 3, 7)[(i // 2) % 4]]
        r, h = clip_pose(clip, u)
        assemble("pose%d" % i, list(parts.values()), colors, x=(i - (len(sheet) - 1) / 2) * 0.56, fit=fit, pose=r, hips=h, facing=facing)
    shoot("chibi-kit-animations.png", (0.12, -1.0, 0.22), (0, 0, 0.6), 8.1, (3480, 700))


if g.get("EXPORT"): result["export"] = export_kit()
if g.get("THUMBS"): result["thumbs"] = thumbs()
if g.get("SHOOT"): previews()
