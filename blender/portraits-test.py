# Portrait test (Nov 10): one way to make the conversation portraits. Expression faces are painted with the
# face recipe of the kit (head() in chibi_parts.py), worn by the look of a cast member from story.json or
# clients.json, posed on the kit skeleton and rendered as busts on a clear background to
# blender/previews/portraits-test/<who>_<expression>.webp. A test only: nothing here is exported to the game.
# Run in the same globals as characters-kit.py, after it. Globals: PORTRAITS = [(who, [expression, ...])].
import bpy, math, os, json
from mathutils import Vector, Quaternion

# An expression changes the paint of the face the character already has (FACES[...]) and the pose of the bust.
#   eyes: "open" (default) or "arc" (closed in a smile); wide: scale of an open eye; shine: scale of its highlights
#   lid: (cut, slant) lowers the lid to cut (in eye heights above the middle), tipped down towards the nose by slant
#   brow, browL, browR: three points from the nose outwards (across, up) from the usual brow line
#   mouth: points of the mouth line (None: no line); open: ("o", rx, rz) or ("d", depth) under the line
#   blush: strength; sweat: a drop beside the eye; pose: {bone: rotation}; hips: offset of the hips
EXPRESSIONS = {
    "neutral": dict(label="Neutral"),            # the face as the kit paints it
    "happy": dict(label="Happy", eyes="arc", brow=((-0.026, 0.010), (0, 0.020), (0.028, 0.011)),
                  mouth=((-0.024, 0.007), (0, -0.003), (0.024, 0.007)), open=("d", 0.021), blush=1.7,
                  pose={"head": lean(7) @ nod(-3), "chest": lean(2)}),
    "delighted": dict(label="Delighted", wide=1.1, shine=1.5, brow=((-0.026, 0.014), (0, 0.025), (0.028, 0.015)),
                      mouth=((-0.026, 0.008), (0, -0.002), (0.026, 0.008)), open=("d", 0.027), blush=2.0,
                      pose={"head": nod(-5), "shoulder.L": out(1, 10), "shoulder.R": out(-1, 10),
                            "upperArm.L": fwd(48) @ out(1, -4), "upperArm.R": fwd(48) @ out(-1, -4),
                            "lowerArm.L": turn(-38) @ fwd(112), "lowerArm.R": turn(38) @ fwd(112)}),
    "surprised": dict(label="Surprised", wide=1.16, shine=1.15, brow=((-0.026, 0.022), (0, 0.033), (0.028, 0.022)),
                      mouth=None, open=("o", 0.0085, 0.0115), blush=0.8,
                      pose={"head": nod(-6), "chest": nod(-3), "shoulder.L": out(1, 12), "shoulder.R": out(-1, 12)}),
    "thoughtful": dict(label="Thoughtful", lid=(0.5, 0.0), browL=((-0.026, 0.012), (0, 0.022), (0.028, 0.012)),
                       browR=((-0.026, -0.003), (0, 0.002), (0.028, -0.002)),
                       mouth=((-0.004, -0.001), (0.006, -0.002), (0.016, 0.003)), blush=0.8,
                       pose={"head": lean(-8) @ turn(6) @ nod(-2), "upperArm.R": fwd(52) @ out(-1, -14), "lowerArm.R": turn(52) @ fwd(126)}),
    "worried": dict(label="Worried", wide=1.04, brow=((-0.024, 0.019), (0.002, 0.011), (0.027, -0.003)),
                    mouth=((-0.014, -0.005), (0, 0.002), (0.014, -0.005)), blush=0.5, sweat=True,
                    pose={"head": nod(6) @ lean(-4), "shoulder.L": out(1, 8), "shoulder.R": out(-1, 8)}),
    "annoyed": dict(label="Annoyed", lid=(0.3, 0.007), brow=((-0.026, -0.011), (0, -0.001), (0.027, 0.008)),
                    mouth=((-0.013, -0.004), (0.001, 0.001), (0.014, -0.002)), blush=0.35,
                    pose={"head": turn(-9) @ lean(5) @ nod(3)}),
    "sad": dict(label="Sad", lid=(0.42, -0.006), brow=((-0.024, 0.016), (0.002, 0.009), (0.027, -0.005)),
                mouth=((-0.012, -0.006), (0, 0.0), (0.012, -0.006)), blush=0.5,
                pose={"head": nod(10) @ lean(5), "chest": nod(3), "shoulder.L": out(1, -4), "shoulder.R": out(-1, -4)}),
}


PORTRAIT_VIEW = ((0.2, -1.0, 0.1), (0.0, 0, 0.83), 0.74)     # camera direction, target, height of the frame in metres
BROW_THROUGH = 0.035        # how far the brows come towards the camera, to show through a fringe as drawn faces do


def mouth_open(K, P, pts, depth, layer):
    """An open mouth hanging under the mouth line: dark inside, the tongue at the bottom."""
    top = cr([Vector((x, z, 0)) for x, z in pts], 4); n = len(top) - 1; base = len(P.v)
    dark = lin("#6E262C"); tongue = lin("#EE8E8E")
    for i, p in enumerate(top):
        t = 2 * i / n - 1; d = depth * math.sqrt(max(1 - t * t, 0))
        for f, c in ((0, dark), (0.55, dark), (1, tongue)): P.vert(K.face_pt(p.x, p.y - d * f, layer), c)
    for i in range(n):
        for j in range(2):
            a = base + 3 * i + j; P.f.append((a, a + 3, a + 4, a + 1))


def expression_head(base, name):
    """The head of the face named base (a key of FACES) repainted with an expression. Same pieces and roles as head()."""
    st = FACES[base]; ex = EXPRESSIONS[name]
    K = KitPart("head_x_%s_%s" % (base, name), "head", ex["label"], bind=rigid("head"))
    S = K.part("skin", "skin", sharp=80)
    K.head(S, SK)
    for sx in (-1, 1):
        blob(S, K.head_pt(sx * 90, -10, -0.004)[0], (0.016, 0.03, 0.04), SK, n=8, m=5)
    flat = dict(ao=0.0, occl=False, orient=HC, sharp=180)
    E = K.part("iris", "eyes", **flat); X = K.part("ink", "paint", **flat)
    W = K.part("brows", "hair", **flat); F = K.part("blush", "skin", **flat)
    ez = HC.z - 0.045; bz = HC.z + 0.016
    wide = ex.get("wide", 1.0); shine = ex.get("shine", 1.0)
    rx, rz = st["rx"] * (1 + (wide - 1) * 0.5), st["rz"] * wide
    deep = Vector((0.14, 0.09, 0.11)); pink = Vector((0.93, 0.42, 0.5)); browc = Vector((0.5, 0.42, 0.46))
    k = ex.get("blush", 1.0)
    pose = ex.get("pose", {}); q = Quaternion()
    for bone in ("spine", "chest", "neck", "head"): q = q @ pose.get(bone, Quaternion())
    through = q.inverted() @ (Vector(PORTRAIT_VIEW[0]).normalized() * BROW_THROUGH)
    cheek = mix(WHITE, pink, k) if k <= 1 else mix(pink, Vector((0.92, 0.26, 0.4)), (k - 1) * 0.6)
    for sx in (-1, 1):
        cx = sx * 0.09
        if ex.get("eyes") == "arc":
            K.stroke(X, [(cx - sx * rx * 1.08, ez - rz * 0.3), (cx - sx * rx * 0.6, ez + rz * 0.2), (cx, ez + rz * 0.4),
                         (cx + sx * rx * 0.6, ez + rz * 0.2), (cx + sx * rx * 1.08, ez - rz * 0.3)], [0.004, 0.008, 0.0095, 0.008, 0.004], 3, INK)
        else:
            lid = ex.get("lid"); top = ez + rz * 0.4
            K.oval(E, cx, ez, rx, rz, 2, lambda u, v: mix(WHITE, deep, sstep(-0.95, 0.2, v)))
            if lid:     # skin over the top of the eye, and the lash line along its edge
                cut, slant = lid; zin, zmid, zout = ez + rz * cut - slant, ez + rz * cut, ez + rz * cut + slant
                h = rz * (1.3 - cut) + abs(slant) + 0.006; skin = SK(K.face_pt(cx, ez + rz, 0))
                K.stroke(F, [(cx - sx * rx * 1.35, zin + h / 2), (cx, zmid + h / 2), (cx + sx * rx * 1.35, zout + h / 2)], [h, h, h], 3.6, skin)
                K.stroke(X, [(cx - sx * rx * 1.1, zin), (cx, zmid + 0.001), (cx + sx * rx * 1.14, zout)], [0.004, 0.009, 0.005], 4.4, INK)
                top = min(top, zmid - 0.013)
            else:
                angs, ws = st["lash"]
                K.stroke(X, [(cx + sx * (rx + 0.0025) * math.cos(math.radians(a)), ez + (rz + 0.0025) * math.sin(math.radians(a))) for a in angs], ws, 3, INK)
                if st.get("lid"):
                    K.stroke(X, [(cx - sx * rx * 0.9, ez + rz * 0.55), (cx, ez + rz * 0.7), (cx + sx * rx * 0.9, ez + rz * 0.55)], [0.006, 0.012, 0.006], 2.6, INK)
            K.oval(X, cx - 0.009, top, 0.0085 * shine, 0.0105 * shine, 4.8 if lid else 3.2, WHITE, seg=10, rings=1)
            K.oval(X, cx + 0.009, ez - rz * 0.5, 0.0045 * shine, 0.0045 * shine, 3.2, Vector((0.9, 0.9, 0.9)), seg=8, rings=1)
            if shine > 1.3: K.oval(X, cx + 0.013, ez + rz * 0.15, 0.0035, 0.0035, 3.2, WHITE, seg=8, rings=1)
        brow = ex.get("browL" if sx > 0 else "browR") or ex.get("brow") or st["brow"]
        n0 = len(W.v); K.stroke(W, [(cx + sx * dx, bz + dz) for dx, dz in brow], [0.0075, 0.0095, 0.004], 2, browc * 0.8)      # heavier than on the model: they carry the mood
        for v in W.v[n0:]: v += through      # in front of a fringe, where the portrait camera sees them in the same place
        K.oval(F, sx * 0.138, HC.z - 0.095, 0.036 * (1 + 0.08 * max(k - 1, 0)), 0.021 * (1 + 0.08 * max(k - 1, 0)), 1.2,
               lambda u, v: mix(cheek, WHITE, sstep(0.15, 1.0, math.hypot(u, v))), seg=12, rings=3)
        if st.get("freckles"):
            for dx, dz in ((-0.014, 0.012), (0.0, 0.02), (0.014, 0.011)):
                K.oval(F, sx * 0.132 + dx, HC.z - 0.082 + dz, 0.0042, 0.0036, 1.8, Vector((0.78, 0.5, 0.42)), seg=6, rings=1)
    if ex.get("sweat"):
        K.oval(X, 0.168, HC.z + 0.004, 0.0105, 0.0165, 3, lambda u, v: mix(Vector((0.62, 0.84, 1.0)), Vector((0.86, 0.95, 1.0)), sstep(-0.6, 0.8, v)), seg=10, rings=2)
        K.oval(X, 0.166, HC.z + 0.0, 0.0034, 0.005, 3.4, WHITE, seg=6, rings=1)
    mz = HC.z - 0.118; op = ex.get("open")
    line = [(dx, mz + dz) for dx, dz in (ex["mouth"] if "mouth" in ex else st["mouth"]) or ()]
    if op and op[0] == "o":
        K.oval(X, 0, mz - 0.004, op[1], op[2], 2, lambda u, v: mix(lin("#6E262C"), lin("#C8605E"), sstep(0.2, -1.0, v)), seg=12, rings=2)
    elif op: mouth_open(K, X, line, op[1], 2)
    elif "mouth" not in ex and st.get("smile"):
        K.oval(X, 0, mz - 0.002, 0.014, 0.009, 2, lambda u, v: mix(lin("#7A2E33"), lin("#E88A8A"), sstep(0.1, -0.9, v)), seg=10, rings=2)
    if line: K.stroke(X, line, [0.002, 0.006, 0.002], 2.4, lin("#A8504C"))
    K.oval(F, 0, HC.z - 0.082, 0.007, 0.005, 1.2, Vector((0.9, 0.62, 0.6)), seg=8, rings=1)
    return K


def cast_looks():
    """The looks of the townspeople and regulars, by id."""
    looks = {}
    for path, key in (("story.json", "people"), ("clients.json", "regulars")):
        with open(os.path.join(REPO, "src", "data", path), encoding="utf8") as f:
            for p in json.load(f)[key]: looks[p["id"]] = p["look"]
    return looks


def portraits(jobs, size=512):
    looks = cast_looks(); made = []; heads = []
    for who, names in jobs:
        look = looks[who]
        for name in names:
            ex = EXPRESSIONS[name]; hid = look["parts"]["head"]
            K = expression_head(hid.split("_", 1)[1], name)
            if K.id not in KITS:
                finish_kit(K, rig, base=[B, HEADS[0]]); KITS[K.id] = K; heads.append(K)
            hid = K.id
            parts = ["body"] + [hid if slot == "head" else pid for slot, pid in look["parts"].items()]
            clear_previews(); assemble("portrait", parts, look["colors"], fit=look["fit"], pose=ex.get("pose"), hips=ex.get("hips", (0, 0, 0)))
            d, target, scale = PORTRAIT_VIEW
            shoot(os.path.join("portraits-test", "%s_%s.webp" % (who, name)), d, target, scale, (size, size), clear=True)
            made.append("%s_%s" % (who, name))
    clear_previews()
    for K in heads:         # the test heads do not stay in the kit
        del KITS[K.id]; ob = bpy.data.objects.get(K.name)
        if ob: bpy.data.objects.remove(ob, do_unlink=True)
    return made


if g.get("PORTRAITS"): result["portraits"] = portraits(g["PORTRAITS"])
