# The chibi kit's parts (Nov 9): body, heads, hair, hats, glasses, tops, bottoms, shoes, things to hold.
# Every part is modelled on the rest pose of chibi_rig.py and layered so any top goes with any bottom:
# body < trousers and shorts < close tops < skirt < jackets and coats. Tinted pieces are painted as shades
# of white (the game multiplies in the chosen colour); fixed pieces carry their full colour.
# Loaded with exec() after chibi_kit.py, chibi_shapes.py and chibi_rig.py.
import bpy, math, random
from mathutils import Vector, Matrix

SK = skin_paint(WHITE)
HP = hair_paint(Vector((0.66, 0.58, 0.62)), WHITE, Vector((0.36, 0.28, 0.34)))
INK = lin("#2A1B20"); GOLD = lin("#E2B25A"); CREAM = lin("#FBF6EE")


def shade(z0, z1, lo=0.62):
    """Cloth as a shade of its colour: darker and cooler towards z0, clear at z1."""
    a = Vector((lo * 0.94, lo * 0.92, min(1.0, lo * 1.08)))
    return lambda p, *k: mix(a, WHITE, sstep(z0, z1, p.z))


def side(p, sx): return V(p.x * sx, p.y, p.z)


def karm(P, sx, col, r=(0.045, 0.039, 0.035), puff=0.048, cuff=None, short=False):
    """A sleeve on the rest pose. cuff: (Part, colour). short ends above the elbow."""
    old = P.bind; oldc = cuff[0].bind if cuff else None
    P.bind = arm_w(sx); sh, el, wr = side(SH, sx), side(EL, sx), side(WR, sx)
    blob(P, sh, (puff, puff * 0.96, puff * 0.96), col, n=8, m=5)
    if short:
        e = mix(sh, el, 0.6); d = (el - sh).normalized()
        tube(P, [sh, e], [r[0], r[0] * 1.1], col, n=8)
        if cuff: cuff[0].bind = arm_w(sx); tube(cuff[0], [e - d * 0.012, e + d * 0.006], r[0] * 1.2, cuff[1], n=8)
    else:
        path = limb(P, [sh, el, wr], r, col, n=8, k=3); d = (path[-1] - path[-2]).normalized()
        if cuff: cuff[0].bind = arm_w(sx); tube(cuff[0], [wr - d * 0.014, wr + d * 0.008], r[2] * 1.22, cuff[1], n=8)
    if cuff: cuff[0].bind = oldc
    P.bind = old


# ---------------- body ----------------
BODY_ROWS = ((0.285, 0.07, 0.056), (0.315, 0.096, 0.074), (0.36, 0.09, 0.07), (0.40, 0.088, 0.068), (0.47, 0.08, 0.062),
             (0.53, 0.086, 0.066), (0.582, 0.084, 0.06), (0.612, 0.044, 0.04))


def body():
    K = KitPart("body", "body", "Body", bind=lower_w)
    S = K.part("skin", "skin", sharp=80)
    torso(S, BODY_ROWS, SK)
    tube(S, [V(0, 0, 0.585), V(0, 0, 0.68)], 0.04, SK, n=8)
    for sx in (-1, 1):
        S.bind = arm_w(sx); sh, el, wr = side(SH, sx), side(EL, sx), side(WR, sx)
        blob(S, sh, (0.034, 0.034, 0.034), SK, n=8, m=5)
        path = limb(S, [sh, el, wr], (0.032, 0.029, 0.026), SK, n=8, k=3)
        hand(S, wr, (path[-1] - path[-2]).normalized(), SK, sx)
        S.bind = lower_w
        limb(S, [(sx * 0.054, 0, 0.31), (sx * 0.057, 0, 0.19), (sx * 0.059, 0, 0.04)], (0.05, 0.042, 0.036), SK, n=8)
    return K


# ---------------- heads: the same head, three faces ----------------
FACES = {
    "soft": dict(label="Soft eyes", rx=0.030, rz=0.042, lash=((-14, 18, 52, 90, 128, 162), (0.002, 0.0065, 0.008, 0.0075, 0.0055, 0.002)),
                 brow=((-0.024, -0.001), (0, 0.005), (0.027, -0.002)), mouth=((-0.017, 0.004), (0, -0.003), (0.017, 0.004))),
    "bright": dict(label="Bright eyes", rx=0.034, rz=0.04, lash=((-30, 10, 50, 90, 130, 170), (0.002, 0.006, 0.007, 0.007, 0.006, 0.003)),
                   brow=((-0.026, 0.004), (0, 0.013), (0.028, 0.006)), mouth=((-0.02, 0.006), (0, -0.007), (0.02, 0.006)), smile=True),
    "calm": dict(label="Sleepy eyes", rx=0.031, rz=0.03, lash=((-8, 20, 55, 90, 125, 172), (0.003, 0.009, 0.011, 0.011, 0.009, 0.004)),
                 brow=((-0.026, 0.002), (0, 0.003), (0.027, 0.0)), mouth=((-0.012, 0.0), (0, -0.001), (0.012, 0.001)), lid=True, freckles=True),
}


def head(key):
    st = FACES[key]
    K = KitPart("head_" + key, "head", st["label"], bind=rigid("head"))
    S = K.part("skin", "skin", sharp=80)
    K.head(S, SK)
    for sx in (-1, 1):
        blob(S, K.head_pt(sx * 90, -10, -0.004)[0], (0.016, 0.03, 0.04), SK, n=8, m=5)   # ears
    flat = dict(ao=0.0, occl=False, orient=HC, sharp=180)
    E = K.part("iris", "eyes", **flat); X = K.part("ink", "paint", **flat)
    B = K.part("brows", "hair", **flat); F = K.part("blush", "skin", **flat)
    ez = HC.z - 0.045; ex = 0.09; bz = HC.z + 0.016; rx, rz = st["rx"], st["rz"]
    deep = Vector((0.14, 0.09, 0.11)); pink = Vector((0.93, 0.42, 0.5)); browc = Vector((0.5, 0.42, 0.46))
    for sx in (-1, 1):
        cx = sx * ex
        K.oval(E, cx, ez, rx, rz, 2, lambda u, v: mix(WHITE, deep, sstep(-0.95, 0.2, v)))
        K.oval(X, cx - 0.009, ez + rz * 0.4, 0.0085, 0.0105, 3.2, WHITE, seg=10, rings=1)           # highlights
        K.oval(X, cx + 0.009, ez - rz * 0.5, 0.0045, 0.0045, 3.2, Vector((0.9, 0.9, 0.9)), seg=8, rings=1)
        angs, ws = st["lash"]
        K.stroke(X, [(cx + sx * (rx + 0.0025) * math.cos(math.radians(a)), ez + (rz + 0.0025) * math.sin(math.radians(a))) for a in angs], ws, 3, INK)
        if st.get("lid"):       # a heavy lid across the top of the iris
            K.stroke(X, [(cx - sx * rx * 0.9, ez + rz * 0.55), (cx, ez + rz * 0.7), (cx + sx * rx * 0.9, ez + rz * 0.55)], [0.006, 0.012, 0.006], 2.6, INK)
        K.stroke(B, [(cx + sx * dx, bz + dz) for dx, dz in st["brow"]], [0.0055, 0.007, 0.003], 2, browc)
        K.oval(F, sx * 0.138, HC.z - 0.095, 0.036, 0.021, 1.2, lambda u, v: mix(pink, WHITE, sstep(0.15, 1.0, math.hypot(u, v))), seg=12, rings=3)
        if st.get("freckles"):
            for dx, dz in ((-0.014, 0.012), (0.0, 0.02), (0.014, 0.011)):
                K.oval(F, sx * 0.132 + dx, HC.z - 0.082 + dz, 0.0042, 0.0036, 1.8, Vector((0.78, 0.5, 0.42)), seg=6, rings=1)
    mz = HC.z - 0.118
    if st.get("smile"):         # an open little smile
        K.oval(X, 0, mz - 0.002, 0.014, 0.009, 2, lambda u, v: mix(lin("#7A2E33"), lin("#E88A8A"), sstep(0.1, -0.9, v)), seg=10, rings=2)
    K.stroke(X, [(dx, mz + dz) for dx, dz in st["mouth"]], [0.002, 0.006, 0.002], 2.4, lin("#A8504C"))
    K.oval(F, 0, HC.z - 0.082, 0.007, 0.005, 1.2, Vector((0.9, 0.62, 0.6)), seg=8, rings=1)       # a dab for the nose
    return K


# ---------------- tops ----------------
CLOSE_ROWS = ((0.328, 0.113, 0.089), (0.40, 0.106, 0.083), (0.47, 0.097, 0.075), (0.53, 0.102, 0.079), (0.582, 0.098, 0.071), (0.615, 0.052, 0.046))
CHEST = rigid("chest")


def dim(fn, k): return lambda p, *a: fn(p) * k


def top_blouse():
    K = KitPart("top_blouse", "top", "Blouse", bind=lower_w, tint="#F4EEE4")
    T = K.part("cloth", "primary"); sh = shade(0.3, 0.62, lo=0.76)
    torso(T, CLOSE_ROWS, sh)
    X = K.part("trim", "paint", bind=CHEST, sharp=60)
    collar(X, 0.634, (0.05, 0.045), 0.606, (0.09, 0.076), 22, WHITE, tip=0.12, drop=0.012)
    bow(X, V(0, -0.084, 0.59), lin("#B5384A"), s=1.15, tails=True)
    for sx in (-1, 1): karm(T, sx, sh, puff=0.054, cuff=(X, WHITE))
    return K


def top_tee():
    K = KitPart("top_tee", "top", "T-shirt", bind=lower_w, tint="#E08A6A")
    T = K.part("cloth", "primary"); sh = shade(0.3, 0.62, lo=0.68)
    torso(T, CLOSE_ROWS, sh)
    X = K.part("trim", "paint", bind=CHEST)
    tube(X, [V(0, 0, 0.606), V(0, 0, 0.624)], [0.062, 0.05], CREAM, n=12, flat=0.86)
    for sx in (-1, 1): karm(T, sx, sh, r=(0.047, 0.04, 0.036), puff=0.05, cuff=(X, CREAM), short=True)
    return K


def top_sweater():
    """Chunky and cropped: a rolled neck, ribbed cuffs and hem."""
    K = KitPart("top_sweater", "top", "Sweater", bind=lower_w, tint="#E3C27A")
    T = K.part("knit", "primary"); sh = shade(0.4, 0.63, lo=0.7); rib = dim(sh, 0.8)
    torso(T, ((0.43, 0.126, 0.1), (0.47, 0.118, 0.092), (0.53, 0.117, 0.09), (0.582, 0.11, 0.08), (0.618, 0.062, 0.054)), sh)
    tube(T, [V(0, 0, 0.412), V(0, 0, 0.446)], 0.129, rib, n=12, flat=0.8)
    T.bind = CHEST
    torus(T, V(0, 0, 0.63), 0.05, 0.02, rib, M=RX90, n=12, m=5)
    T.bind = lower_w
    for sx in (-1, 1): karm(T, sx, sh, r=(0.052, 0.047, 0.042), puff=0.056, cuff=(T, rib))
    return K


def _inner(K, hexc):
    """The blouse or shirt worn under a jacket: fixed colour."""
    I = K.part("shirt", "paint")
    torso(I, CLOSE_ROWS, cloth(hexc, 0.3, 0.62, lo=0.8, hi=1.0))
    return I


def top_blazer():
    """Nipped at the waist and cropped at the hip, over a white blouse with a ribbon at the collar."""
    K = KitPart("top_blazer", "top", "Blazer", bind=lower_w, tint="#3F7A5C")
    I = _inner(K, "#F7F1E8")
    rows = [(0.385, 0.143, 0.114), (0.42, 0.131, 0.104), (0.465, 0.119, 0.093), (0.53, 0.122, 0.095), (0.585, 0.117, 0.087), (0.622, 0.068, 0.058)]
    gap = [(0.385, 24), (0.42, 15), (0.465, 10), (0.53, 24), (0.585, 32), (0.622, 55)]
    sh = shade(0.36, 0.62, lo=0.6); bodyc = dim(sh, 0.8)
    J = K.part("jacket", "primary")
    coat(J, rows, gap, bodyc)
    for sx in (-1, 1):
        lapel(J, rows, gap, sx, [(0.588, -3), (0.572, 22), (0.54, 30), (0.47, -2)], sh)
        karm(J, sx, bodyc, cuff=(I, CREAM))
    D = K.part("button", "gloss")
    blob(D, coat_pt(rows, 0.452, math.radians(3), 0.004), (0.012, 0.007, 0.012), GOLD, n=8, m=4)
    X = K.part("trim", "paint", bind=CHEST, sharp=60)
    collar(X, 0.642, (0.05, 0.045), 0.623, (0.092, 0.077), 26, CREAM, tip=0.45, drop=0.03)
    bow(X, V(0, -0.083, 0.59), lin("#2E2A36"), s=1.0, tails=True)
    return K


def top_coat():
    """A long coat flaring to the knee, wide collar, over a cream shirt."""
    K = KitPart("top_coat", "top", "Long coat", bind=lower_w, tint="#7C9E64")
    _inner(K, "#EFE6D6")
    rows = [(0.2, 0.2, 0.158), (0.26, 0.182, 0.144), (0.34, 0.158, 0.125), (0.44, 0.132, 0.103), (0.53, 0.128, 0.098), (0.585, 0.123, 0.09), (0.625, 0.074, 0.062)]
    gap = [(0.2, 26), (0.34, 20), (0.44, 15), (0.53, 20), (0.585, 30), (0.625, 55)]
    sh = shade(0.2, 0.62, lo=0.56); bodyc = dim(sh, 0.8); tails = skirt_w(0.62)
    J = K.part("coat", "primary", bind=tails)
    coat(J, rows, gap, bodyc)
    for sx in (-1, 1): karm(J, sx, bodyc)
    C2 = K.part("collar", "primary", bind=CHEST, sharp=60)
    collar(C2, 0.645, (0.062, 0.055), 0.592, (0.13, 0.1), 30, shade(0.55, 0.66, lo=0.85), tip=0.22, drop=0.035, th=0.01)
    D = K.part("buttons", "gloss", bind=tails)
    for z in (0.5, 0.42, 0.34):
        blob(D, coat_pt(rows, z, math.radians(interp(gap, z) + 9), 0.004), (0.011, 0.011, 0.011), lin("#C9A25A"), n=8, m=4)
    return K


# ---------------- bottoms ----------------
PELVIS = ((0.275, 0.075, 0.062), (0.31, 0.108, 0.084), (0.36, 0.1, 0.078), (0.40, 0.096, 0.074), (0.472, 0.089, 0.069))


def bottom_trousers():
    K = KitPart("bottom_trousers", "bottom", "Trousers", bind=lower_w, tint="#4A4858")
    L = K.part("cloth", "primary"); sh = shade(0.0, 0.42, lo=0.58)
    torso(L, PELVIS, sh)
    for sx in (-1, 1):
        limb(L, [(sx * 0.055, 0, 0.33), (sx * 0.058, 0, 0.19), (sx * 0.06, 0, 0.045)], (0.06, 0.05, 0.047), sh, n=8)
    return K


def bottom_shorts():
    K = KitPart("bottom_shorts", "bottom", "Shorts", bind=lower_w, tint="#C9A66B")
    L = K.part("cloth", "primary"); sh = shade(0.2, 0.46, lo=0.66); cuff = dim(sh, 0.78)
    torso(L, PELVIS, sh)
    for sx in (-1, 1):
        limb(L, [(sx * 0.055, 0, 0.33), (sx * 0.057, 0, 0.275), (sx * 0.058, 0, 0.228)], (0.062, 0.061, 0.063), sh, n=8)
        tube(L, [V(sx * 0.058, 0, 0.222), V(sx * 0.058, 0, 0.244)], 0.068, cuff, n=8)
    return K


def bottom_skirt():
    """A pleated skirt that bells out, in a tonal plaid; worn over the top's hem."""
    K = KitPart("bottom_skirt", "bottom", "Pleated skirt", bind=skirt_w(0.72, z1=0.41, z0=0.25), tint="#4F8A5E")
    S = K.part("pleats", "primary", sharp=30)
    z1, z0, top, hem, pleats, depth = 0.478, 0.245, (0.105, 0.086), (0.192, 0.176), 12, 0.17
    ts = [0.0, 0.14, 0.40, 0.50, 0.74, 0.84, 1.0]; rings = []
    for t in ts:
        z = mix(z1, z0, t); f = t ** 1.15; rx = mix(top[0], hem[0], f); ry = mix(top[1], hem[1], f); r = []
        for k in range(pleats):
            for da, o in ((0.0, 1), (0.36, 1), (0.68, 0)):
                a = 2 * math.pi * (k + da) / pleats; rr = 1 - depth * t * (1 - o)
                r.append(V(rx * rr * math.sin(a), -ry * rr * math.cos(a), z))
        rings.append(r)
    def plaid(j, i):
        b = j in (2, 4); m = i % 3; s = mix(0.8, 1.0, j / 5)
        return WHITE * ((1.0 if b else 0.84) if m == 0 else (0.62 if b else 0.5) if m == 1 else (0.84 if b else 0.68)) * s
    loft(S, rings, WHITE * 0.4, fcol=plaid)
    tube(S, [V(0, 0, 0.462), V(0, 0, 0.492)], 0.108, WHITE * 0.5, n=12, flat=0.82)
    return K


# ---------------- shoes ----------------
def hide(lo=0.6):
    """Leather as a shade of its colour: a shine on the toe."""
    return lambda p, *a: WHITE * (lo + (1 - lo) * sstep(0.0, -0.09, p.y) * sstep(0.012, 0.04, p.z))


SOLE = WHITE * 0.3


def shoes_loafers():
    K = KitPart("shoes_loafers", "shoes", "Loafers", bind=foot_w, tint="#8A5636")
    S = K.part("leather", "primary")
    for sx in (-1, 1): shoe(S, sx * 0.06, hide(), SOLE)
    return K


def shoes_boots():
    K = KitPart("shoes_boots", "shoes", "Boots", bind=lower_w, tint="#8B5E3F")
    S = K.part("leather", "primary")
    for sx in (-1, 1):
        S.bind = foot_w; shoe(S, sx * 0.064, hide(), SOLE, W=1.22, H=1.25, L=1.12); S.bind = lower_w
        tube(S, [V(sx * 0.063, 0, 0.035), V(sx * 0.063, 0, 0.165)], [0.059, 0.065], lambda p, *a: WHITE * mix(0.58, 0.8, sstep(0.03, 0.17, p.z)), n=8)
        tube(S, [V(sx * 0.063, 0, 0.158), V(sx * 0.063, 0, 0.182)], 0.071, WHITE, n=8)
    return K


def shoes_maryjanes():
    K = KitPart("shoes_maryjanes", "shoes", "Mary Janes", bind=lower_w, tint="#6A3A40")
    S = K.part("leather", "primary", bind=foot_w); X = K.part("socks", "paint")
    sock = cloth("#FAF5EC", 0.03, 0.13, lo=0.8, hi=1.0)
    for sx in (-1, 1):
        shoe(S, sx * 0.058, hide(), SOLE)
        tube(S, [V(sx * 0.058 - 0.042, -0.008, 0.03), V(sx * 0.058, -0.01, 0.07), V(sx * 0.058 + 0.042, -0.008, 0.03)], 0.008, WHITE * 0.75, n=5)
        limb(X, [(sx * 0.0585, 0, 0.115), (sx * 0.059, 0, 0.08), (sx * 0.059, 0, 0.04)], (0.044, 0.043, 0.042), sock, n=8)
        tube(X, [V(sx * 0.0585, 0, 0.106), V(sx * 0.0585, 0, 0.124)], 0.0465, lin("#FAF5EC"), n=8)
    return K


PARTS = [top_blouse, top_tee, top_sweater, top_blazer, top_coat, bottom_trousers, bottom_shorts, bottom_skirt,
         shoes_loafers, shoes_boots, shoes_maryjanes]
