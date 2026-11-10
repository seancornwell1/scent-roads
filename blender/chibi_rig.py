# The chibi kit's skeleton, skin weights, export and animation clips (Nov 9).
# Same bone names and hierarchy as the Grab3D Character Mixer kit, so the game's loader
# (src/scene/characters.ts) can bind these parts the same way. Loaded with exec() after chibi_kit.py.
import bpy, math, os, json, struct
from mathutils import Vector, Matrix, Quaternion

RIG_NAME = "chibi-rig"          # renamed to "rig" in the exported files (see patch_glb)
KIT_DIR = os.path.join(REPO, "assets", "custom", "chibi")

# Rest pose: a relaxed A, arms about 22 degrees out from the body. (head, tail) per bone.
SH = Vector((0.108, 0, 0.575)); EL = Vector((0.150, 0, 0.476)); WR = Vector((0.192, -0.008, 0.378)); HT = Vector((0.208, -0.012, 0.335))
HIP = Vector((0.056, 0, 0.33)); KN = Vector((0.058, 0, 0.19)); AN = Vector((0.06, 0, 0.05)); TOE = Vector((0.06, -0.09, 0.012))
BONES = [  # name, parent, head, tail
    ("hips", None, (0, 0, 0.33), (0, 0, 0.40)),
    ("spine", "hips", (0, 0, 0.40), (0, 0, 0.50)),
    ("chest", "spine", (0, 0, 0.50), (0, 0, 0.60)),
    ("neck", "chest", (0, 0, 0.60), (0, 0, 0.67)),
    ("head", "neck", (0, 0, 0.67), (0, 0, 1.05)),
]
for sfx, sx in ((".L", 1), (".R", -1)):
    def m(p, sx=sx): return (p.x * sx, p.y, p.z)
    BONES += [
        ("shoulder" + sfx, "chest", (0.03 * sx, 0, 0.575), (0.104 * sx, 0, 0.577)),
        ("upperArm" + sfx, "shoulder" + sfx, m(SH), m(EL)),
        ("lowerArm" + sfx, "upperArm" + sfx, m(EL), m(WR)),
        ("hand" + sfx, "lowerArm" + sfx, m(WR), m(HT)),
        ("upperLeg" + sfx, "hips", m(HIP), m(KN)),
        ("lowerLeg" + sfx, "upperLeg" + sfx, m(KN), m(AN)),
        ("foot" + sfx, "lowerLeg" + sfx, m(AN), m(TOE)),
    ]
BONE_NAMES = [b[0] for b in BONES]


def build_rig():
    old = bpy.data.objects.get(RIG_NAME)
    if old: bpy.data.objects.remove(old, do_unlink=True)
    for a in list(bpy.data.armatures):
        if a.users == 0 and a.name.startswith(RIG_NAME): bpy.data.armatures.remove(a)
    coll = bpy.data.collections.get("chibi-kit")
    if not coll:
        coll = bpy.data.collections.new("chibi-kit"); bpy.context.scene.collection.children.link(coll)
    bpy.context.view_layer.layer_collection.children["chibi-kit"].exclude = False
    arm = bpy.data.armatures.new(RIG_NAME); ob = bpy.data.objects.new(RIG_NAME, arm); coll.objects.link(ob)
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = ob; ob.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    for name, parent, h, t in BONES:
        b = arm.edit_bones.new(name); b.head = h; b.tail = t; b.roll = 0
        if parent: b.parent = arm.edit_bones[parent]
    bpy.ops.object.mode_set(mode="OBJECT")
    for pb in ob.pose.bones: pb.rotation_mode = "QUATERNION"
    arm.display_type = "STICK"; ob.show_in_front = True
    return ob


# ---------------- skin weights: functions of a vertex's rest position ----------------
def _norm(w):
    w = {k: v for k, v in w.items() if v > 1e-3}
    top = sorted(w.items(), key=lambda kv: -kv[1])[:4]; s = sum(v for _, v in top)
    return {k: v / s for k, v in top}


def rigid(bone): return lambda p: {bone: 1.0}


def torso_w(p):
    z = p.z
    a = sstep(0.365, 0.435, z); b = sstep(0.465, 0.535, z); c = sstep(0.585, 0.625, z); d = sstep(0.65, 0.68, z)
    return _norm({"hips": 1 - a, "spine": a * (1 - b), "chest": b * (1 - c), "neck": c * (1 - d), "head": d})


_D1 = (EL - SH).normalized(); _D2 = (WR - EL).normalized(); _DE = (_D1 + _D2).normalized()


def arm_w(sx):
    sfx = ".L" if sx > 0 else ".R"
    def fn(p):
        q = Vector((p.x * sx, p.y, p.z))
        ts = sstep(-0.034, 0.03, (q - SH).dot(_D1)); te = sstep(-0.026, 0.026, (q - EL).dot(_DE)); tw = sstep(-0.012, 0.012, (q - WR).dot(_D2))
        w = {"upperArm" + sfx: ts * (1 - te), "lowerArm" + sfx: ts * te * (1 - tw), "hand" + sfx: ts * te * tw}
        for k, v in torso_w(p).items(): w[k] = w.get(k, 0) + v * (1 - ts)
        return _norm(w)
    return fn


def lower_w(p):
    """Hips and legs; above the hip line it hands over to torso_w."""
    z = p.z
    if z >= 0.365: return torso_w(p)
    th = sstep(0.365, 0.295, z); tk = sstep(0.215, 0.165, z); ta = sstep(0.066, 0.036, z)
    wd = mix(0.004, 0.03, sstep(0.27, 0.31, z)); l = sstep(-wd, wd, p.x)
    w = {"hips": 1 - th}
    for sfx, s in ((".L", l), (".R", 1 - l)):
        w["upperLeg" + sfx] = th * (1 - tk) * s; w["lowerLeg" + sfx] = th * tk * (1 - ta) * s; w["foot" + sfx] = th * tk * ta * s
    return _norm(w)


def foot_w(p): return {"foot.L" if p.x > 0 else "foot.R": 1.0}


def skirt_w(follow=0.6, z1=0.37, z0=0.22):
    """Skirts and coat tails: hang from the hips and follow the thighs more towards the hem."""
    def fn(p):
        if p.z >= z1: return torso_w(p)
        f = follow * sstep(z1, z0, p.z); l = sstep(-0.09, 0.09, p.x)
        return _norm({"hips": 1 - f, "upperLeg.L": f * l, "upperLeg.R": f * (1 - l)})
    return fn


# ---------------- body shapes (morph targets) ----------------
def _fit(p, k, belly):
    """Widens (k > 0) or narrows the trunk round the waist; the arms ride out with it instead of fattening."""
    if p.z > 0.63: return Vector(p)
    g = k * math.exp(-((p.z - 0.41) / 0.125) ** 2) * (1 - sstep(0.57, 0.63, p.z))
    ax = min(abs(p.x), 0.105); inner = 1 - sstep(0.115, 0.15, abs(p.x))
    fy = g * (1 + (belly if p.y < 0 else 0.0)) * inner
    return Vector((p.x + math.copysign(ax * g, p.x), p.y * (1 + fy), p.z))


FITS = [("classic", None, None), ("chubby", "chubby", lambda p: _fit(p, 0.26, 0.35)), ("slim", "slim", lambda p: _fit(p, -0.1, 0.0))]


# ---------------- materials ----------------
TINTED = ("skin", "hair", "eyes", "primary")       # the game colours these by name
KROUGH = {"hair": 0.62, "eyes": 0.3, "gloss": 0.25}


def kit_mat(role, hexc=None):
    """Painted vertex colours times one flat colour. Named ck_<role>[_<hex>]; exported under the role's name."""
    name = "ck_" + role + ("_" + hexc.lstrip("#").upper() if hexc else "")
    m = bpy.data.materials.get(name)
    if m: return m
    m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    a = nt.nodes.new("ShaderNodeVertexColor"); a.layer_name = "Col"
    mx = nt.nodes.new("ShaderNodeMix"); mx.data_type = "RGBA"; mx.blend_type = "MULTIPLY"; mx.inputs[0].default_value = 1.0
    nt.links.new(a.outputs["Color"], mx.inputs[6]); mx.inputs[7].default_value = hexcol(hexc) if hexc else (1, 1, 1, 1)
    nt.links.new(mx.outputs[2], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = KROUGH.get(role, 0.9)
    b.inputs["Specular IOR Level"].default_value = 0.5 if role in ("eyes", "gloss") else 0.15
    m.use_backface_culling = True
    return m


# ---------------- kit parts ----------------
FORM = Char("form"); FORM.head(Part("form", "skin"), WHITE)      # the head's surface, for hair and faces to sit on
TINTS = {"skin": "#F8DAC6", "hair": "#B5524E", "eyes": "#8A5A3C"}


class KitPart(Char):
    """One swappable part: pieces (Part) each with a material role (skin, hair, eyes, primary: tinted by the
    game; paint, gloss: fixed colours) and a weight function. bind is the default for pieces without one."""

    def __init__(self, pid, slot, label, bind=None, tint=None):
        Char.__init__(self, "ck_" + pid); self.id, self.slot, self.label, self.bind, self.tint = pid, slot, label, bind, tint
        self.bvh = FORM.bvh

    def part(self, tag, role, tint=None, bind=None, **kw):
        if role in TINTED and tint is None: tint = self.tint if role == "primary" else TINTS[role]
        p = Part(f"{self.name}_{tag}", role, tint=tint, bind=bind or self.bind, **kw); self.parts.append(p); return p


def _geo(kits):
    V, F = [], []
    for K in kits:
        for P in K.parts:
            if not P.occl: continue
            o = len(V); V += [tuple(v) for v in P.v]; F += [tuple(i + o for i in f) for f in P.f]
    return V, F


def finish_kit(K, rig, base=()):
    """Builds the part's skinned mesh: paint and occlusion (shaded by itself and the base parts, i.e. the
    body and a head), vertex groups from the weight functions, and the body-shape morph targets."""
    V, F = _geo([K] + [b for b in base if b is not K])
    bvh = BVHTree.FromPolygons(V, F)
    coll = bpy.data.collections["chibi-kit"]
    old = bpy.data.objects.get(K.name)
    if old: bpy.data.objects.remove(old, do_unlink=True)
    for me in list(bpy.data.meshes):
        if me.users == 0 and me.name.startswith(K.name): bpy.data.meshes.remove(me)
    objs = []
    for P in K.parts:
        if not P.v: continue
        me = part_mesh(P, bvh, kit_mat(P.slot, P.tint if P.slot in TINTED else None))
        ob = bpy.data.objects.new(P.name, me); coll.objects.link(ob); objs.append(ob)
        groups = {}
        for i, v in enumerate(P.v):
            for bone, w in (P.b[i] or K.bind)(v).items():
                vg = groups.get(bone) or groups.setdefault(bone, ob.vertex_groups.new(name=bone))
                vg.add([i], w, "REPLACE")
    bpy.ops.object.select_all(action="DESELECT")
    for ob in objs: ob.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.join()
    ob = bpy.context.object; ob.name = K.name; ob.data.name = K.name
    me = ob.data; rest = [v.co.copy() for v in me.vertices]
    moved = [(nm, fn) for _, nm, fn in FITS if fn and any((fn(c) - c).length > 2e-4 for c in rest)]
    if moved:
        ob.shape_key_add(name="Basis")
        for nm, fn in moved:
            k = ob.shape_key_add(name=nm, from_mix=False); k.value = 0.0
            for i, c in enumerate(rest): k.data[i].co = fn(c)
    ob.parent = rig; md = ob.modifiers.new("Armature", "ARMATURE"); md.object = rig
    me.calc_loop_triangles(); K.tris = len(me.loop_triangles); K.obj = ob
    return ob


# ---------------- export ----------------
def patch_glb(path):
    """Renames things to what the game's loader looks for: the armature node and skin become "rig", materials
    take their role's name with the default colour as baseColorFactor; morph weights start at 0; drops the
    specular extension (it would make three.js use its heavier physical material)."""
    b = open(path, "rb").read(); n = struct.unpack("<I", b[12:16])[0]; j = json.loads(b[20:20 + n]); rest = b[20 + n:]
    for nd in j["nodes"]:
        if nd.get("name") == RIG_NAME: nd["name"] = "rig"
    for sk in j.get("skins", []): sk["name"] = "rig"
    for an in j.get("animations", []): an["name"] = an["name"].replace("ck_", "")
    for m in j.get("materials", []):
        bits = m["name"].split("_"); role = bits[1]; m["name"] = role
        pbr = m.setdefault("pbrMetallicRoughness", {}); pbr.pop("baseColorTexture", None)
        pbr["baseColorFactor"] = [round(c, 5) for c in hexcol(bits[2])] if len(bits) > 2 else [1, 1, 1, 1]
        pbr["metallicFactor"] = 0; m.pop("extensions", None); m["doubleSided"] = False
    for me in j.get("meshes", []):
        if "weights" in me: me["weights"] = [0] * len(me["weights"])
    for key in ("extensionsUsed", "extensionsRequired"):
        if key in j:
            j[key] = [e for e in j[key] if e != "KHR_materials_specular"]
            if not j[key]: del j[key]
    out = json.dumps(j, separators=(",", ":")).encode("utf-8"); out += b" " * (-len(out) % 4)
    total = 12 + 8 + len(out) + len(rest)
    open(path, "wb").write(b[:8] + struct.pack("<I", total) + struct.pack("<I", len(out)) + b[16:20] + out + rest)
    return j


def _export(path, objs, rig, anims=False):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs + [rig]: o.select_set(True)
    bpy.context.view_layer.objects.active = rig
    sc = bpy.context.scene; fps0 = sc.render.fps; sc.render.fps = FPS      # clip times are frames / the scene's frame rate
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_apply=False, export_yup=True,
                              export_skins=True, export_animations=anims, export_animation_mode="ACTIONS", export_materials="EXPORT",
                              export_cameras=False, export_lights=False, export_morph=True, export_morph_normal=False,
                              export_vertex_color="NAME", export_vertex_color_name="Col", export_all_vertex_colors=False,
                              export_optimize_animation_size=False, export_force_sampling=True)
    sc.render.fps = fps0
    return patch_glb(path)


def export_part(K, rig): return _export(os.path.join(KIT_DIR, "parts", K.id + ".glb"), [K.obj], rig)


# ---------------- posing ----------------
# Rotations are given in the character's own axes (X to its left, -Y ahead, Z up) relative to the rest
# pose, and turned into each bone's local rotation here, so the clips don't depend on bone rolls.
AX, AY, AZ = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))


def fwd(deg): return Quaternion(AX, math.radians(-deg))            # swings a hanging limb forward
def out(sx, deg): return Quaternion(AY, math.radians(-sx * deg))   # lifts the arm or leg of side sx away from the body
def turn(deg): return Quaternion(AZ, math.radians(deg))            # turns to the character's left
def lean(deg): return Quaternion(AY, math.radians(deg))            # tips an upright bone towards the character's left
def nod(deg): return Quaternion(AX, math.radians(deg))             # tips an upright bone forward


def set_pose(rig, rots, hips=(0, 0, 0)):
    """rots: {bone: Quaternion in character axes}; hips: offset of the hips in metres."""
    for pb in rig.pose.bones:
        R = pb.bone.matrix_local.to_3x3(); q = rots.get(pb.name)
        pb.rotation_quaternion = (R.inverted() @ q.to_matrix() @ R).to_quaternion() if q else Quaternion()
        pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
    hb = rig.pose.bones["hips"]; hb.location = hb.bone.matrix_local.to_3x3().inverted() @ Vector(hips)


# ---------------- animation clips ----------------
# Each clip is a function of u (0 to 1 through the clip) giving ({bone: rotation}, hips offset). Same names,
# lengths and frame rate as the Grab3D kit's clips, so the game plays them the same way.
FPS = 30
LEG = (HIP - KN).length          # thigh and shin are the same length


def _legs(aL, bL, aR, bR, level=1.0):
    """Thighs swung forward by a, knees bent by b (degrees); the feet stay level. Returns the rotations and
    how far the hips must drop for the lower foot to stay on the ground."""
    r = {}; reach = []
    for sfx, a, b in ((".L", aL, bL), (".R", aR, bR)):
        r["upperLeg" + sfx] = fwd(a); r["lowerLeg" + sfx] = fwd(-b); r["foot" + sfx] = fwd(-(a - b) * level)
        reach.append(LEG * (math.cos(math.radians(a)) + math.cos(math.radians(a - b))))
    return r, max(reach) - 2 * LEG


def _squat(d):
    """Both feet planted and the hips lowered by d: the knees fold so the feet stay under the hips."""
    th = math.degrees(math.acos(clamp(1 - d / (2 * LEG), 0.0, 1.0)))
    return _legs(th, 2 * th, th, 2 * th)[0]


def _ease(a, b, x): return sstep(a, b, x)


def clip_idle(u):
    s = 0.5 - 0.5 * math.cos(2 * math.pi * u); w = math.sin(2 * math.pi * u)        # a breath; a slow sway
    r = _squat(0.005 * s)
    r.update({"spine": nod(1.2 * s), "chest": nod(-2.2 * s) @ lean(0.8 * w), "head": nod(1.4 * s) @ lean(-1.6 * w) @ turn(2.0 * w)})
    for sfx, sx in ((".L", 1), (".R", -1)):
        r["upperArm" + sfx] = out(sx, -6 + 2.5 * s) @ fwd(2 * w * sx); r["lowerArm" + sfx] = fwd(8 + 3 * s)
    return r, (0.003 * w, 0, -0.005 * s)


def _gait(u, stride, lift, knee0, arm, elbow, pitch, drop, twist):
    ph = 2 * math.pi * u; s, c = math.sin(ph), math.cos(ph)
    def knee(cc): return knee0 + lift * max(0.0, cc) ** 1.5         # the leg folds while it swings forward
    r, dz = _legs(pitch * 0.6 + stride * s, knee(c), pitch * 0.6 - stride * s, knee(-c), level=0.85)
    r.update({"hips": turn(-twist * s), "spine": nod(pitch) @ turn(1.6 * twist * s), "chest": turn(0.6 * twist * s),
              "neck": nod(-pitch * 0.4), "head": nod(-pitch * 0.5 + 1.5 * math.cos(2 * ph)) @ turn(-1.2 * twist * s)})
    for sfx, sx in ((".L", 1), (".R", -1)):
        sw = -sx * s                                                 # each arm swings against its own leg
        r["upperArm" + sfx] = fwd(arm * sw - pitch) @ out(sx, -9); r["lowerArm" + sfx] = fwd(elbow + 0.35 * arm * max(0.0, sw))
        r["hand" + sfx] = fwd(6)
    return r, (-0.007 * c, 0, dz * drop)


def clip_walk(u): return _gait(u, stride=27, lift=46, knee0=5, arm=26, elbow=14, pitch=2.5, drop=1.0, twist=5)
def clip_run(u): return _gait(u, stride=38, lift=78, knee0=14, arm=46, elbow=62, pitch=9, drop=0.6, twist=8)


def clip_wave(u):
    """Raises the right hand beside the head and waves it, then lowers it."""
    e = _ease(0.0, 0.2, u) * (1 - _ease(0.8, 1.0, u)); wag = math.sin(2 * math.pi * 3 * clamp((u - 0.17) / 0.66)) * e
    s = 0.5 - 0.5 * math.cos(2 * math.pi * u)
    r = _squat(0.004 * s)
    r.update({"spine": lean(1.5 * e), "chest": lean(1.5 * e), "head": lean(-5 * e) @ turn(-4 * e) @ nod(-2 * e),
              "upperArm.R": turn(32 * e) @ out(-1, 74 * e - 6 * (1 - e)), "lowerArm.R": out(-1, (24 + 18 * wag) * e) @ fwd(8 * (1 - e)),
              "hand.R": out(-1, 12 * wag), "shoulder.R": out(-1, 8 * e),
              "upperArm.L": out(1, -6 + 3 * e), "lowerArm.L": fwd(8 + 6 * e)})
    return r, (-0.004 * e, 0, -0.004 * s)


def clip_jump(u):
    """Crouch, spring, hang in the air with the knees tucked, land with a bend and straighten."""
    f = u * 33
    if f < 8: h = -0.05 * _ease(0, 8, f)
    elif f < 18: h = mix(-0.05, 0.13, _ease(8, 18, f) ** 0.7)
    elif f < 25: h = mix(0.13, -0.04, _ease(18, 25, f) ** 1.6)
    else: h = -0.04 * (1 - _ease(25, 33, f))
    air = _ease(9, 13, f) * (1 - _ease(22, 25, f)); crouch = clamp(-h / 0.05)
    if h < 0: r = _squat(-h)
    else: r = _legs(22 * air, 46 * air, 14 * air, 34 * air, level=0.3)[0]
    r.update({"spine": nod(12 * crouch - 4 * air), "chest": nod(4 * crouch), "head": nod(-8 * crouch + 4 * air)})
    for sfx, sx in ((".L", 1), (".R", -1)):
        r["upperArm" + sfx] = fwd(-34 * crouch + 20 * air) @ out(sx, -6 + 62 * air); r["lowerArm" + sfx] = fwd(10 + 24 * crouch)
    return r, (0, 0, h)


CLIPS = [("idle", 60, True, clip_idle), ("walk", 30, True, clip_walk), ("run", 20, True, clip_run),
         ("wave", 48, False, clip_wave), ("jump", 33, False, clip_jump)]


def build_clips(rig):
    """One action per clip (named ck_<clip>), keyed on every frame and stashed on its own NLA track."""
    rig.animation_data_clear(); ad = rig.animation_data_create()
    for name, frames, loop, fn in CLIPS:
        old = bpy.data.actions.get("ck_" + name)
        if old: bpy.data.actions.remove(old)
        act = bpy.data.actions.new("ck_" + name); ad.action = act; prev = {}
        for f in range(frames + 1):
            rots, hips = fn((f % frames) / frames if loop else f / frames); set_pose(rig, rots, hips)
            for pb in rig.pose.bones:
                q = pb.rotation_quaternion.copy()
                if pb.name in prev and prev[pb.name].dot(q) < 0: q.negate(); pb.rotation_quaternion = q
                prev[pb.name] = q; pb.keyframe_insert("rotation_quaternion", frame=f)
            rig.pose.bones["hips"].keyframe_insert("location", frame=f)
        ad.action = None
        tr = ad.nla_tracks.new(); tr.name = name; st = tr.strips.new(name, 0, act); st.name = name
    set_pose(rig, {})


def clip_pose(name, u):
    """The pose of a clip at u (0 to 1), for previews: (rotations, hips offset)."""
    return {c[0]: c[3] for c in CLIPS}[name](u)
