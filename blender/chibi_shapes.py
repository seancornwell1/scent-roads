# Shapes shared by the chibi characters: heads, faces, hands, arms, shoes, coats, collars, bows.
# Used by characters-chibi.py (the style test) and chibi_parts.py (the kit). Loaded with exec() after chibi_kit.py.
import bpy, math
from mathutils import Vector, Matrix


def V(*a): return Vector(a)
RX90 = Matrix.Rotation(math.radians(90), 3, 'X')


# ---------------- shared pieces ----------------
def base_head(C, look, neck=True):
    skin = skin_paint(look["skin"])
    S = C.part("skin", "skin", sharp=80)
    C.head(S, skin)
    if neck: tube(S, [V(0, 0, 0.585), V(0, 0, 0.68)], 0.04, skin, n=8)
    for sx in (-1, 1):
        blob(S, C.head_pt(sx * 90, -10, -0.004)[0], (0.016, 0.03, 0.04), skin, n=8, m=5)   # ears
    return S, skin


def face(C, look, skin):
    E = C.part("eyes", "eyes", ao=0.0, occl=False, orient=HC, sharp=180)
    F = C.part("face", "skin", ao=0.0, occl=False, orient=HC, sharp=180)
    dark = lin(look.get("eye_dark", "#2A1B20")); iris = lin(look["iris"]); brow = lin(look["brow"])
    ez = HC.z - 0.045; ex = 0.09; bz = HC.z + 0.016
    for sx in (-1, 1):
        cx = sx * ex
        C.oval(E, cx, ez, 0.030, 0.042, 2, lambda u, v: mix(mix(iris, WHITE, 0.18), dark, sstep(-0.95, 0.2, v)))
        C.oval(E, cx - 0.009, ez + 0.017, 0.0085, 0.0105, 3.2, WHITE, seg=10, rings=1)            # highlight
        C.oval(E, cx + 0.009, ez - 0.021, 0.0045, 0.0045, 3.2, mix(iris, WHITE, 0.65), seg=8, rings=1)
        lash = [(cx + sx * 0.0325 * math.cos(math.radians(a)), ez + 0.0445 * math.sin(math.radians(a))) for a in (-14, 18, 52, 90, 128, 162)]
        C.stroke(E, lash, [0.002, 0.0065, 0.008, 0.0075, 0.0055, 0.002], 3, dark)
        C.stroke(F, [(cx - sx * 0.024, bz - 0.001), (cx, bz + 0.005), (cx + sx * 0.027, bz - 0.002)], [0.0055, 0.007, 0.003], 2, brow)
        sk = skin(V(sx * 0.138, 0, HC.z - 0.095)); pink = mix(sk, lin("#F08A8A"), 0.75)
        C.oval(F, sx * 0.138, HC.z - 0.095, 0.036, 0.021, 1.2, lambda u, v: mix(pink, sk, sstep(0.15, 1.0, math.hypot(u, v))), seg=12, rings=3)
    mz = HC.z - 0.118
    C.stroke(F, [(-0.017, mz + 0.004), (0, mz - 0.003), (0.017, mz + 0.004)], [0.002, 0.006, 0.002], 2, lin(look.get("mouth", "#A8504C")))
    C.oval(F, 0, HC.z - 0.082, 0.007, 0.005, 1.2, mix(skin(V(0, 0, HC.z - 0.08)), lin("#D98C7A"), 0.6), seg=8, rings=1)   # a dab for the nose


def hand(S, wr, d, skin, sx):
    c = wr + d * 0.028; M = d.to_track_quat('Z', 'Y').to_matrix()
    blob(S, c, (0.031, 0.026, 0.04), skin, n=8, m=5, M=M)
    f = V(0, -1, 0) - d * d.dot(V(0, -1, 0))
    if f.length < 0.3: f = V(-sx, 0, 0) - d * d.dot(V(-sx, 0, 0))
    f.normalize()
    blob(S, c + f * 0.024 - d * 0.006, (0.012, 0.012, 0.018), skin, n=6, m=4, M=M)      # thumb
    return c


def arm(P, S, sx, pts, col, skin, r=(0.045, 0.039, 0.035), cuff=None, puff=0.048):
    sh, el, wr = [V(*p) for p in pts]
    blob(P, sh, (puff, puff * 0.96, puff * 0.96), col, n=8, m=5)
    path = limb(P, [sh, el, wr], r, col, n=8, k=3)
    d = (path[-1] - path[-2]).normalized()
    if cuff is not None: tube(cuff[0], [wr - d * 0.014, wr + d * 0.008], [r[2] * 1.22, r[2] * 1.22], cuff[1], n=8)
    return hand(S, wr, d, skin, sx)


def shoe(P, x, col, sole, W=1.0, H=1.0, L=1.0, y0=0.0):
    prof = [(0.058, 0.55, 0.62), (0.036, 0.9, 0.95), (-0.004, 1.0, 1.0), (-0.05, 1.06, 0.9), (-0.085, 0.86, 0.7)]
    rings = []
    for y, fx, fz in prof:
        rz = 0.043 * H * fz
        rings.append(ring(V(x, y0 + y * L, rz * 0.9), 0.05 * W * fx, rz, 10, 2.4, X=V(1, 0, 0), Y=V(0, 0, 1)))
    b = len(P.v)
    loft(P, rings, lambda p, j, i: sole if p.z < 0.012 else _col(col, p, j, i), cap0=V(x, y0 + 0.07 * L, 0.02 * H), cap1=V(x, y0 - 0.105 * L, 0.018 * H))
    for v in P.v[b:]: v.z = max(v.z, 0.0)


def leather(hexc, y0=0.0):
    b = lin(hexc)
    return lambda p, *a: b * (0.85 + 0.6 * sstep(0.0, -0.09, p.y - y0) * sstep(0.012, 0.04, p.z))


def rows_at(rows, z):
    if z <= rows[0][0]: return rows[0][1], rows[0][2]
    for (z0, a0, b0), (z1, a1, b1) in zip(rows, rows[1:]):
        if z <= z1:
            t = (z - z0) / (z1 - z0); return mix(a0, a1, t), mix(b0, b1, t)
    return rows[-1][1], rows[-1][2]


def coat_pt(rows, z, ang, out=0.0):
    """A point on a coat: ang in radians from the front (0) towards the character's left (+X)."""
    rx, ry = rows_at(rows, z)
    return V((rx + out) * math.sin(ang), -(ry + out) * math.cos(ang), z)


def coat(P, rows, gap, col, n=16, th=0.012):
    """An open-fronted shell; gap is [(z, half-angle in degrees of the opening)]."""
    outer, inner = [], []
    for z, rx, ry in rows:
        g0 = math.radians(interp(gap, z)); ro, ri = [], []
        for i in range(n + 1):
            ang = g0 + (2 * math.pi - 2 * g0) * i / n
            ro.append(V(rx * math.sin(ang), -ry * math.cos(ang), z)); ri.append(V((rx - th) * math.sin(ang), -(ry - th) * math.cos(ang), z))
        outer.append(ro); inner.append(ri)
    sheet(P, outer, inner, lambda p, j, i, s: col(p) * (0.6 if s else 1.0))


def prism(P, outer, inner, col):
    b = len(P.v); n = len(outer)
    for p in outer: P.vert(p, _col(col, Vector(p)))
    for p in inner: P.vert(p, _col(col, Vector(p)) * 0.7)
    P.f.append(tuple(range(b, b + n))); P.f.append(tuple(range(b + 2 * n - 1, b + n - 1, -1)))
    for i in range(n):
        j = (i + 1) % n; P.f.append((b + i, b + j, b + n + j, b + n + i))


def lapel(P, rows, gap, sx, shape, col, lift=0.008):
    """shape: [(z, degrees past the opening's edge)], a polygon folded back along the opening."""
    def pt(z, extra, out):
        p = coat_pt(rows, z, math.radians(interp(gap, z) + extra), out); p.x *= sx; return p
    prism(P, [pt(z, e, lift + 0.007) for z, e in shape], [pt(z, e, 0.001) for z, e in shape], col)


def collar(P, zi, ri, zo, ro, gap, col, tip=0.3, n=10, th=0.008, drop=0.02):
    """A turned-down collar from the neck (zi, ri) out to (zo, ro), open at the front, with longer points there."""
    outer, inner = [[], []], [[], []]; g0 = math.radians(gap)
    for i in range(n + 1):
        ang = g0 + (2 * math.pi - 2 * g0) * i / n
        k = math.exp(-(min(ang - g0, 2 * math.pi - g0 - ang) / 0.5) ** 2); s, c = math.sin(ang), -math.cos(ang)
        pin = V(ri[0] * s, ri[1] * c, zi); pout = V(ro[0] * (1 + tip * k) * s, ro[1] * (1 + tip * k) * c, zo - drop * k)
        off = V(-s, -c, -1.5).normalized() * th
        outer[0].append(pin); outer[1].append(pout); inner[0].append(pin + off); inner[1].append(pout + off)
    sheet(P, outer, inner, lambda p, j, i, s: _col(col, p) * (0.7 if s else 1.0))


def torus(P, c, R, r, col, M=None, n=14, m=5):
    M = M or Matrix.Identity(3); rings = []
    for i in range(n):
        a = 2 * math.pi * i / n; rad = V(math.cos(a), 0, math.sin(a))
        rings.append([Vector(c) + M @ (rad * (R + r * math.cos(b)) + V(0, 1, 0) * (r * math.sin(b))) for b in (2 * math.pi * (q + 0.5) / m for q in range(m))])
    loft(P, rings, col, wrap=True)


def bow(P, c, col, s=1.0, tails=False):
    for sx in (-1, 1):
        blob(P, c + V(sx * 0.021 * s, 0, 0.002), (0.021 * s, 0.009 * s, 0.015 * s), col, n=8, m=4, M=Matrix.Rotation(math.radians(-12 * sx), 3, 'Y'))
        if tails:
            tube(P, [c + V(sx * 0.006, -0.002, -0.004), c + V(sx * 0.02 * s, -0.004, -0.05 * s)], [0.008 * s, 0.011 * s], col, n=5, flat=0.5)
    blob(P, c + V(0, -0.004, 0), (0.009 * s, 0.009 * s, 0.01 * s), col, n=6, m=4)


def pelvis(P, col, w=1.0):
    loft(P, [ring(V(0, 0, z), rx * w, ry * w, 12, 2.3) for z, rx, ry in ((0.275, 0.075, 0.062), (0.31, 0.108, 0.084), (0.36, 0.1, 0.078))], col)


def torso(P, rows, col):
    loft(P, [ring(V(0, 0, z), rx, ry, 12, 2.3) for z, rx, ry in rows], col)


def cap_paint(hp):
    """The close layer of hair: the strand paint, with alternate columns a touch lighter and darker."""
    return lambda p, j, i: hp(p, 0.5, 1) * ((1.0 + 0.08 * ((i % 2) * 2 - 1)) if i >= 0 else 1.0)
