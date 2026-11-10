# Character style test #3 (Nov 9): stylised low-poly chibi. About 2.4 heads tall, soft geometric
# forms, smooth shading that keeps a little faceting, exaggerated silhouettes, and a hand-painted
# look carried in vertex colours (gradients, strand shading, tinted ambient occlusion): no textures.
# The same three people as test #2 (after Sean's reference image): the shopkeeper, a customer in a
# long coat, and a girl in a pleated skirt. Static and unrigged; faces are calm (portraits will
# carry emotion). Built with blender/chibi_kit.py.
import bpy, bmesh, math, os, random
from mathutils import Vector, Matrix
g = globals()
exec(open(r"C:\Users\seanc\Projects\scent-roads\blender\lib.py").read(), g)
exec(open(r"C:\Users\seanc\Projects\scent-roads\blender\chibi_kit.py").read(), g)
exec(open(r"C:\Users\seanc\Projects\scent-roads\blender\chibi_shapes.py").read(), g)


# ---------------- the shopkeeper ----------------
def shopkeeper():
    C = Char("chibi-shopkeeper")
    look = dict(skin="#F8DAC6", iris="#8A5A3C", brow="#5E1F2A")
    S, skin = base_head(C, look); face(C, look, skin)
    hp = hair_paint("#9A3040", "#E88A84", "#52141F")
    # blouse, trousers, shoes
    white = cloth("#F7F1E8", 0.3, 0.62, lo=0.8, hi=1.0)
    T = C.part("blouse", "top")
    torso(T, ((0.328, 0.112, 0.088), (0.40, 0.108, 0.084), (0.47, 0.096, 0.075), (0.53, 0.102, 0.079), (0.582, 0.098, 0.071), (0.615, 0.052, 0.046)), white)
    dark = cloth("#3A3846", 0.0, 0.4, lo=0.7, hi=1.2)
    L = C.part("trousers", "bottom")
    pelvis(L, dark)
    SH = C.part("shoes", "shoes")
    for sx in (-1, 1):
        limb(L, [(sx * 0.055, 0, 0.33), (sx * 0.058, 0, 0.19), (sx * 0.06, 0, 0.045)], (0.06, 0.05, 0.047), dark, n=8)
        shoe(SH, sx * 0.06, leather("#7A4A30"), lin("#3A2018"))
    # blazer: nipped at the waist, flared at the hip
    rows = [(0.285, 0.152, 0.120), (0.34, 0.140, 0.110), (0.40, 0.126, 0.099), (0.455, 0.116, 0.091), (0.53, 0.121, 0.094), (0.585, 0.117, 0.087), (0.622, 0.068, 0.058)]
    gap = [(0.285, 30), (0.40, 16), (0.455, 10), (0.53, 24), (0.585, 32), (0.622, 55)]
    green = cloth("#2F6048", 0.28, 0.62, lo=0.7, hi=1.22)
    K = C.part("blazer", "coat")
    coat(K, rows, gap, green)
    lap = cloth("#44805F", 0.4, 0.62, lo=0.85, hi=1.2)
    for sx in (-1, 1):
        lapel(K, rows, gap, sx, [(0.588, -3), (0.572, 22), (0.54, 30), (0.462, -2)], lap)
    D = C.part("detail", "metal")
    b = coat_pt(rows, 0.445, math.radians(3), 0.004)
    blob(D, b, (0.012, 0.007, 0.012), lin("#E2B25A"), n=8, m=4)
    # collar and ribbon
    Cl = C.part("collar", "top", sharp=60)
    collar(Cl, 0.642, (0.05, 0.045), 0.623, (0.092, 0.077), 26, lin("#FBF6EE"), tip=0.45, drop=0.03)
    R = C.part("ribbon", "detail")
    bow(R, V(0, -0.083, 0.59), lin("#2E2A36"), s=1.0, tails=True)
    # arms: her right hand holds up a little perfume bottle
    cuffs = (T, lin("#FBF6EE"))
    hr = arm(K, S, -1, [(-0.108, 0, 0.575), (-0.168, -0.03, 0.455), (-0.092, -0.132, 0.478)], green, skin, cuff=cuffs)
    arm(K, S, 1, [(0.108, 0, 0.575), (0.16, 0.005, 0.46), (0.172, -0.02, 0.365)], green, skin, cuff=cuffs)
    G = C.part("bottle", "glass")
    pink = lin("#F2A6BC")
    bc = hr + V(0.004, -0.012, 0.03)
    prof = [(0.012, 0.0), (0.025, 0.006), (0.028, 0.024), (0.024, 0.046), (0.011, 0.054), (0.011, 0.062)]
    loft(G, [[bc + V(math.cos(a) * r, math.sin(a) * r, z) for a in (2 * math.pi * (i + 0.5) / 8 for i in range(8))] for r, z in prof],
         lambda p, j, i: mix(pink, WHITE, 0.55 * sstep(0.0, -0.03, p.x - bc.x) * sstep(0.0, 0.03, p.z - bc.z)))
    blob(D, bc + V(0, 0, 0.074), (0.015, 0.015, 0.014), lin("#E2B25A"), n=8, m=4)
    # hair: pulled up into a big bun, a side-swept fringe, two loose locks by the cheeks
    H = C.part("hair", "hair", sharp=40)
    C.hair_cap(H, [(0, 46), (30, 43), (58, 30), (76, 8), (92, -6), (112, -26), (180, -34)], cap_paint(hp))
    a0 = 26
    for tip_az, tip_el, w in ((-62, 6, 0.05), (-44, 12, 0.055), (-24, 16, 0.055), (-4, 21, 0.05), (12, 30, 0.04)):
        C.strand(H, [(a0 - 4, 66, 0.004), (mix(a0, tip_az, 0.35), 52, 0.014), (mix(a0, tip_az, 0.75), mix(52, tip_el, 0.55), 0.018), (tip_az, tip_el, 0.014)], w, 0.016, hp)
    for tip_az, tip_el, w in ((48, 16, 0.05), (66, 4, 0.045)):
        C.strand(H, [(a0 + 4, 66, 0.004), (mix(a0, tip_az, 0.4), 52, 0.014), (mix(a0, tip_az, 0.8), mix(52, tip_el, 0.55), 0.018), (tip_az, tip_el, 0.014)], w, 0.016, hp)
    for sx in (-1, 1):
        C.strand(H, [(sx * 58, 36, 0.008), (sx * 61, 10, 0.014), (sx * 58, -16, 0.014), (sx * 52, -40, 0.016)], 0.046, 0.016, hp, tip=0.12)
    bun = HC + V(0, 0.05, 0.268)
    def bunc(p, j, i):
        c = mix(hp.lo, hp.base, sstep(bun.z - 0.085, bun.z - 0.01, p.z))
        c = mix(c, hp.hi, 0.55 * sstep(bun.z + 0.01, bun.z + 0.075, p.z) * sstep(0.06, -0.06, p.y - bun.y))
        return c * ((1.0 + 0.09 * ((i % 2) * 2 - 1)) if i >= 0 else 1.0)
    blob(H, bun, (0.105, 0.1, 0.086), bunc, n=10, m=6)
    torus(R, HC + V(0, 0.047, 0.212), 0.072, 0.012, lin("#E2B25A"), M=RX90, n=12, m=5)       # hair tie
    P = C.part("pencil", "detail")                                                           # the pencil she keeps in her bun
    a, b = HC + V(-0.165, 0.075, 0.222), HC + V(0.15, 0.03, 0.33); d = (b - a).normalized()
    tube(P, [a, b], 0.009, lin("#F2C14E"), n=6, cap1=False)
    tube(P, [b, b + d * 0.022], [0.009, 0.002], lin("#E8C9A0"), n=6, cap0=False, cap1=b + d * 0.028)
    blob(P, a - d * 0.004, (0.0105, 0.0105, 0.0105), lin("#F29AA8"), n=6, m=4)
    # round glasses
    Gl = C.part("glasses", "detail", ao=0.3)
    fr = lin("#3A2730"); ez = HC.z - 0.043
    for sx in (-1, 1):
        c = C.face_pt(sx * 0.09, ez, 0) + V(sx * 0.004, -0.02, 0)
        torus(Gl, c, 0.054, 0.0055, fr, M=Matrix.Rotation(math.radians(13 * sx), 3, 'Z'), n=16, m=4)
        tube(Gl, [c + V(sx * 0.054, 0.006, 0.008), V(sx * 0.238, -0.02, ez + 0.012)], 0.004, fr, n=4)
    cb = C.face_pt(0, ez, 0)
    tube(Gl, [V(-0.038, cb.y - 0.014, ez + 0.012), V(0, cb.y - 0.02, ez + 0.02), V(0.038, cb.y - 0.014, ez + 0.012)], 0.0045, fr, n=4)
    return C


# ---------------- the customer ----------------
def customer():
    C = Char("chibi-customer")
    look = dict(skin="#F1CBB0", iris="#5E7F6C", brow="#1E1B25", mouth="#9A4E48")
    S, skin = base_head(C, look); face(C, look, skin)
    hp = hair_paint("#2C2A38", "#7C7FA6", "#121019")
    cream = cloth("#EFE6D6", 0.3, 0.62, lo=0.78, hi=1.0)
    T = C.part("shirt", "top")
    torso(T, ((0.322, 0.117, 0.093), (0.40, 0.11, 0.086), (0.47, 0.102, 0.078), (0.53, 0.108, 0.082), (0.582, 0.106, 0.074), (0.615, 0.054, 0.047)), cream)
    dark = cloth("#34333F", 0.0, 0.4, lo=0.7, hi=1.2)
    L = C.part("trousers", "bottom")
    pelvis(L, dark)
    SH = C.part("boots", "shoes")
    brown = leather("#7B5136"); bl = lin("#7B5136")
    for sx in (-1, 1):
        limb(L, [(sx * 0.057, 0, 0.33), (sx * 0.06, 0, 0.19), (sx * 0.062, 0, 0.05)], (0.06, 0.052, 0.05), dark, n=8)
        shoe(SH, sx * 0.064, brown, lin("#33211A"), W=1.22, H=1.25, L=1.12)
        tube(SH, [V(sx * 0.063, 0.0, 0.035), V(sx * 0.063, 0.0, 0.165)], [0.059, 0.065], lambda p, *a: bl * mix(0.8, 1.05, sstep(0.03, 0.17, p.z)), n=8)
        tube(SH, [V(sx * 0.063, 0.0, 0.158), V(sx * 0.063, 0.0, 0.182)], 0.071, bl * 1.3, n=8)
    # long coat flaring to the knee, with a wide collar
    rows = [(0.2, 0.2, 0.158), (0.26, 0.182, 0.144), (0.34, 0.158, 0.125), (0.44, 0.132, 0.103), (0.53, 0.128, 0.098), (0.585, 0.123, 0.09), (0.625, 0.074, 0.062)]
    gap = [(0.2, 26), (0.34, 20), (0.44, 15), (0.53, 20), (0.585, 30), (0.625, 55)]
    olive = cloth("#5F8050", 0.2, 0.62, lo=0.66, hi=1.2)
    K = C.part("coat", "coat")
    coat(K, rows, gap, olive)
    Cl = C.part("collar", "coat", sharp=60)
    collar(Cl, 0.645, (0.062, 0.055), 0.592, (0.13, 0.1), 30, cloth("#7C9E64", 0.55, 0.66, lo=0.85, hi=1.15), tip=0.22, drop=0.035, th=0.01)
    D = C.part("detail", "metal")
    for z in (0.5, 0.42, 0.34):
        blob(D, coat_pt(rows, z, math.radians(interp(gap, z) + 9), 0.004), (0.011, 0.011, 0.011), lin("#C9A25A"), n=8, m=4)
    hl = arm(K, S, 1, [(0.112, 0, 0.575), (0.178, -0.025, 0.455), (0.045, -0.142, 0.5)], olive, skin)
    arm(K, S, -1, [(-0.112, 0, 0.575), (-0.172, 0.005, 0.46), (-0.192, -0.02, 0.36)], olive, skin)
    # satchel on the left hip, its strap over the right shoulder
    B = C.part("bag", "detail")
    tan = lin("#9A6238"); flap = lin("#7A4526")
    pts, nors = [], []
    for q in range(18):
        ang = 2 * math.pi * q / 18; z = 0.475 - 0.14 * math.sin(ang)
        pts.append(coat_pt(rows, z, ang, 0.007)); nors.append(V(math.sin(ang), -math.cos(ang), 0))
    band(B, pts, nors, 0.014, 0.006, flap, loop=True)
    bx, bz = 0.208, 0.215
    zs = [bz, bz + 0.012, bz + 0.06, bz + 0.112, bz + 0.124]; fs = [0.8, 1.0, 1.05, 1.0, 0.84]
    loft(B, [ring(V(bx, 0.0, z), 0.036 * f, 0.082 * f, 12, 3.6) for z, f in zip(zs, fs)], lambda p, j, i: tan * mix(0.8, 1.1, sstep(bz, bz + 0.12, p.z)),
         fcol=lambda j, i: flap if (j >= 2 and i in (10, 11, 0)) else None)
    blob(D, V(bx + 0.039, 0, bz + 0.056), (0.008, 0.013, 0.013), lin("#E2B25A"), n=8, m=4)
    # hair: a messy mop of spikes whirling out from the crown
    H = C.part("hair", "hair", sharp=40)
    C.hair_cap(H, [(0, 40), (40, 36), (62, 22), (80, 2), (95, -12), (115, -28), (180, -32)], cap_paint(hp))
    rng = random.Random(11); N = 13; sw = 11
    for i in range(N):
        az = -180 + 360 * (i + 0.5) / N + rng.uniform(-6, 6)
        if abs(az) < 62:      # the fringe: shorter, falling over the forehead
            C.strand(H, [(az - 2 * sw, 74, 0.004), (az - sw, 54, 0.016), (az, 34, 0.02), (az + sw * 0.6, rng.uniform(11, 19), 0.018)], 0.052, 0.016, hp)
        elif abs(az) < 112:    # the sides: short tufts over the ears
            C.strand(H, [(az - 2 * sw, 76, 0.004), (az - sw, 50, 0.016), (az, 22, 0.024), (az + sw * 0.6, rng.uniform(-10, -2), 0.03)], 0.066, 0.024, hp)
        else:                  # the back: longer, flicking out at the tips
            C.strand(H, [(az - 2 * sw, 76, 0.004), (az - sw, 50, 0.016), (az, 20, 0.028), (az + sw, rng.uniform(-24, -6), 0.05 + rng.uniform(0, 0.025))], 0.062, 0.028, hp)
    H2 = C.part("tufts", "hair", ao=0.35, sharp=40)
    for i in range(5):         # tufts standing up at the crown
        az = 360 * i / 5 + 20
        C.strand(H2, [(az, 86, 0.0), (az + 16, 68, 0.026), (az + 36, 52, 0.045 + 0.035 * (i % 2))], 0.052, 0.022, hp, tip=0.05)
    return C


# ---------------- the girl ----------------
def girl():
    C = Char("chibi-girl")
    look = dict(skin="#F9DECB", iris="#7A5A3A", brow="#7A4E2E")
    S, skin = base_head(C, look); face(C, look, skin)
    hp = hair_paint("#A9744A", "#EDC08A", "#6A4226")
    white = cloth("#FAF5EC", 0.35, 0.62, lo=0.8, hi=1.0)
    T = C.part("blouse", "top")
    torso(T, ((0.4, 0.1, 0.08), (0.47, 0.094, 0.074), (0.53, 0.1, 0.078), (0.582, 0.096, 0.07), (0.615, 0.052, 0.046)), white)
    # pleated plaid skirt, belling out
    K = C.part("skirt", "bottom", sharp=30)
    gr, grl, grd, crm = lin("#3F6B4A"), lin("#5C8E62"), lin("#2B4A36"), lin("#D9D49A")
    z1, z0, top, hem, pleats, depth = 0.478, 0.245, (0.098, 0.078), (0.225, 0.205), 12, 0.17
    ts = [0.0, 0.14, 0.40, 0.50, 0.74, 0.84, 1.0]; rings = []
    for t in ts:
        z = mix(z1, z0, t); f = t ** 0.75; rx = mix(top[0], hem[0], f); ry = mix(top[1], hem[1], f); r = []
        for k in range(pleats):
            for da, out in ((0.0, 1), (0.36, 1), (0.68, 0)):
                a = 2 * math.pi * (k + da) / pleats; rr = 1 - depth * t * (1 - out)
                r.append(V(rx * rr * math.sin(a), -ry * rr * math.cos(a), z))
        rings.append(r)
    def plaid(j, i):
        b = j in (2, 4); m = i % 3; sh = mix(0.82, 1.08, j / 5)
        if m == 0: return (crm if b else grl) * sh
        if m == 1: return (grl * 0.75 if b else grd) * sh
        return (grl if b else gr) * sh
    loft(K, rings, grd * 0.6, fcol=plaid)
    tube(K, [V(0, 0, 0.462), V(0, 0, 0.49)], 0.1, grd, n=12, flat=0.8)                    # waistband
    # legs, socks, shoes
    SK = C.part("socks", "top"); SH = C.part("shoes", "shoes")
    sockc = cloth("#FAF5EC", 0.03, 0.18, lo=0.8, hi=1.0)
    for sx in (-1, 1):
        limb(S, [(sx * 0.05, 0, 0.3), (sx * 0.052, 0, 0.17), (sx * 0.054, 0, 0.05)], (0.05, 0.042, 0.037), skin, n=8)
        limb(SK, [(sx * 0.0525, 0, 0.16), (sx * 0.054, 0, 0.1), (sx * 0.054, 0, 0.04)], (0.046, 0.043, 0.041), sockc, n=8)
        tube(SK, [V(sx * 0.0525, 0, 0.15), V(sx * 0.0525, 0, 0.172)], 0.05, lin("#FAF5EC"), n=8)
        shoe(SH, sx * 0.055, leather("#4A3030"), lin("#241616"))
        tube(SH, [V(sx * 0.055 - 0.042, -0.008, 0.03), V(sx * 0.055, -0.01, 0.07), V(sx * 0.055 + 0.042, -0.008, 0.03)], 0.008, lin("#4A3030"), n=5)
    Cl = C.part("collar", "top", sharp=60)
    collar(Cl, 0.634, (0.05, 0.045), 0.606, (0.09, 0.076), 22, lin("#FFFFFF"), tip=0.12, drop=0.012)
    R = C.part("ribbon", "detail")
    bow(R, V(0, -0.084, 0.59), lin("#B5384A"), s=1.15, tails=True)
    cuffs = (T, lin("#FFFFFF"))
    for sx in (-1, 1):       # hands together in front
        arm(T, S, sx, [(sx * 0.104, 0, 0.572), (sx * 0.16, -0.025, 0.47), (sx * 0.03, -0.145, 0.432)], white, skin, cuff=cuffs, puff=0.054)
    # hair: long, with a blunt fringe, locks over the shoulders, and a back that fans out
    H = C.part("hair", "hair", sharp=40)
    C.hair_cap(H, [(0, 44), (45, 42), (70, 30), (85, 0), (100, -20), (180, -30)], cap_paint(hp))
    for a in (-46, -23, 0, 23, 46):
        C.strand(H, [(a * 0.3, 83, 0.012), (a * 0.7, 54, 0.018), (a * 0.95, 34, 0.02), (a, 12, 0.016)], 0.052, 0.016, hp, tip=0.5, wmax=0.5)
    for sx in (-1, 1):
        C.strand(H, [(sx * 60, 56, 0.006), (sx * 74, 24, 0.018), ((sx * 0.234, -0.06, HC.z - 0.07), (sx, -0.35, 0)), ((sx * 0.218, -0.085, 0.6), (sx, -0.6, 0)),
                     ((sx * 0.188, -0.1, 0.47), (sx * 0.8, -0.8, 0))], 0.045, 0.018, hp, tip=0.25)
    for i in range(-3, 4):
        az = 180 + i * 26; h = sdir(az, 0)
        C.strand(H, [(az, 85, 0.005 + 0.003 * (i % 3)), (az, 34, 0.018), (az, 0, 0.022), (h * 0.237 + V(0, 0, 0.66), h), (h * 0.252 + V(0, 0, 0.5), h), (h * 0.295 + V(0, 0, 0.35 + 0.04 * (i % 2)), h + V(0, 0, 0.3))],
                 0.07, 0.022, hp, tip=0.18, wmax=0.6)
    D = C.part("detail", "metal")
    p, d = C.head_pt(40, 27, 0.034)
    blob(D, p, (0.03, 0.009, 0.012), lin("#F2C14E"), n=8, m=4, M=Matrix.Rotation(math.radians(40), 3, 'Z') @ Matrix.Rotation(math.radians(-25), 3, 'Y'))
    return C


# ---------------- build and render ----------------
chars = [(shopkeeper(), -0.5), (customer(), 0.0), (girl(), 0.5)]
objs = [c.finish(x) for c, x in chars]

sc = bpy.context.scene
for lc in bpy.context.view_layer.layer_collection.children:
    if lc.name == "Collection": continue
    lc.exclude = not lc.name.startswith("chibi-")
fl = bpy.data.objects.get("render_floor"); fl.hide_render = False; fl.location.z = 0; fl.scale = (8, 8, 1)
cam = bpy.data.objects["Camera"]; cam.data.type = 'ORTHO'
li = bpy.data.objects["Light"]; li.data.energy = 3.0
li.rotation_euler = (-Vector((0.45, -0.7, 1.1)).normalized()).to_track_quat('-Z', 'Y').to_euler()
out = os.path.join(REPO, "blender", "previews")


def shoot(path, d, target, scale, res):
    d = Vector(d).normalized()
    cam.location = Vector(target) + d * 20; cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler(); cam.data.ortho_scale = scale
    sc.render.resolution_x, sc.render.resolution_y = res
    sc.render.filepath = os.path.join(out, path); bpy.ops.render.render(write_still=True)


SHOTS = {
    "front": ("characters-chibi.png", (0.28, -1.0, 0.3), (0, 0, 0.6), 1.75, (1500, 1200)),
    "iso": ("characters-chibi-iso.png", (0.75, -1.0, 0.85), (0, 0, 0.58), 1.9, (1300, 1050)),
    "back": ("characters-chibi-back.png", (-0.5, 1.0, 0.35), (0, 0, 0.6), 1.75, (1500, 1200)),
}
for k in g.get("SHOOT", ("front", "iso", "back")): shoot(*SHOTS[k])
tris = {}
for o in objs:
    o.data.calc_loop_triangles(); tris[o.name] = len(o.data.loop_triangles)
result = {"tris": tris}
