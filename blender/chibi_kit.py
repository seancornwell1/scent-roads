# Builder kit for the stylised low-poly chibi characters (style test #3, Nov 9).
# Everything is made of lofted low-poly surfaces (rings joined into quads), smooth-shaded with
# sharp edges kept above an angle, and painted per vertex: each builder takes a colour function,
# and Char.finish() multiplies in a tinted ambient-occlusion pass, so the model carries its own
# hand-painted gradients and contact shadows in the "Col" colour attribute (COLOR_0 in glTF).
# Characters face -Y in Blender, like the current kit. Loaded with exec() after lib.py.
import bpy, bmesh, math, os, random
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

HC = Vector((0, 0, 0.845))            # head centre
WHITE = Vector((1, 1, 1))
SHADOW = Vector((0.50, 0.36, 0.46))   # occluded paint is multiplied towards this plum, not grey
AO_DIST = 0.13
AO_DIRS = [(math.cos(math.radians(e)) * math.cos(a), math.cos(math.radians(e)) * math.sin(a), math.sin(math.radians(e)))
           for e, n in ((18, 8), (45, 6), (72, 4)) for a in (2 * math.pi * (i + 0.5 * (n % 3)) / n for i in range(n))] + [(0, 0, 1)]
AO_NORM = sum(d[2] for d in AO_DIRS)


def lin(h): return Vector(h) if isinstance(h, Vector) else Vector(hexcol(h)[:3])
def mix(a, b, t): return a + (b - a) * t
def clamp(x, a=0.0, b=1.0): return max(a, min(b, x))


def sstep(a, b, x):
    t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t)


def sdir(az, el):
    """Direction from the head centre: az 0 = front (-Y), +90 = the character's left (+X); el 90 = up."""
    a, e = math.radians(az), math.radians(el)
    return Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e)))


def interp(tbl, x):
    """Piecewise-smooth lookup in [(x, y), ...] (x ascending); x is taken as |x|."""
    x = abs(x)
    if x <= tbl[0][0]: return tbl[0][1]
    for (x0, y0), (x1, y1) in zip(tbl, tbl[1:]):
        if x <= x1: return mix(y0, y1, sstep(x0, x1, x))
    return tbl[-1][1]


def cr(pts, k):
    """Catmull-Rom through pts, k samples per span."""
    P = [pts[0]] + list(pts) + [pts[-1]]; out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for s in range(k):
            t = s / k
            out.append(0.5 * ((2 * p1) + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t))
    out.append(pts[-1])
    return out


def lerp_list(vals, m):
    """Resample a list of numbers to m values."""
    out = []
    for i in range(m):
        u = i / (m - 1) * (len(vals) - 1); j = min(int(u), len(vals) - 2)
        out.append(mix(vals[j], vals[j + 1], u - j))
    return out


class Part:
    """One painted piece. slot names the material; ao scales the occlusion it receives;
    occl says whether it shades others; orient (a point) is for open patches: faces turn away from it."""

    def __init__(self, name, slot, ao=1.0, occl=True, orient=None, sharp=48, tint=None, bind=None):
        self.name, self.slot, self.ao, self.occl, self.orient, self.sharp = name, slot, ao, occl, orient, sharp
        self.tint, self.bind = tint, bind      # kit parts: the default colour of a tinted material; the skin-weight function
        self.v, self.f, self.c, self.fc, self.b = [], [], [], {}, []

    def vert(self, p, c):
        self.v.append(Vector(p)); self.c.append(Vector(c)); self.b.append(self.bind); return len(self.v) - 1


def _col(col, *a):
    return col(*a) if callable(col) else col


def loft(P, rings, col, cap0=True, cap1=True, wrap=False, fcol=None):
    """Joins rings (lists of points, equal length) with quads. col: colour or col(p, j, i).
    cap0/cap1: True closes with a fan at the ring's centre, a Vector closes to that apex.
    wrap joins the last ring back to the first. fcol(j, i) may return a flat colour for a quad."""
    n = len(rings[0]); base = len(P.v); R = len(rings)
    for j, r in enumerate(rings):
        for i, p in enumerate(r): P.vert(p, _col(col, Vector(p), j, i))
    for j in range(R if wrap else R - 1):
        j2 = (j + 1) % R
        for i in range(n):
            a = base + j * n + i; b = base + j * n + (i + 1) % n
            c = base + j2 * n + (i + 1) % n; d = base + j2 * n + i
            P.f.append((a, b, c, d))
            if fcol:
                fc = fcol(j, i)
                if fc is not None: P.fc[len(P.f) - 1] = Vector(fc)
    if not wrap:
        for cap, j in ((cap0, 0), (cap1, R - 1)):
            if cap is False: continue
            cen = sum(rings[j], Vector()) / n if cap is True else Vector(cap)
            ci = P.vert(cen, _col(col, cen, j, -1))
            for i in range(n):
                P.f.append((base + j * n + i, base + j * n + (i + 1) % n, ci))
    return P


def ring(c, rx, ry, n=12, p=2.0, ryb=None, X=Vector((1, 0, 0)), Y=Vector((0, -1, 0)), ph=0.5):
    """A superellipse ring round c; ry is the +Y-axis radius (the front by default), ryb the other side's."""
    out = []; ex = 2.0 / p
    for i in range(n):
        a = 2 * math.pi * (i + ph) / n; ca, sa = math.cos(a), math.sin(a)
        out.append(Vector(c) + X * (rx * math.copysign(abs(ca) ** ex, ca))
                   + Y * ((ry if sa >= 0 else (ryb or ry)) * math.copysign(abs(sa) ** ex, sa)))
    return out


def frames(pts, up=Vector((0, -1, 0)), loop=False):
    out = []; u = None; m = len(pts)
    for i in range(m):
        a = pts[(i + 1) % m] if loop else pts[min(i + 1, m - 1)]
        b = pts[(i - 1) % m] if loop else pts[max(i - 1, 0)]
        t = (a - b).normalized()
        if u is None:
            u = up - t * up.dot(t)
            if u.length < 1e-3: u = Vector((1, 0, 0)) - t * t.x
        else:
            u = u - t * u.dot(t)
        u.normalize()
        out.append((t, u, t.cross(u)))
    return out


def tube(P, pts, radii, col, n=8, flat=1.0, cap0=True, cap1=True, loop=False, up=Vector((0, -1, 0)), fcol=None):
    pts = [Vector(p) for p in pts]
    if not isinstance(radii, (list, tuple)): radii = [radii] * len(pts)
    rings = []
    for (t, u, s), p, r in zip(frames(pts, up, loop), pts, radii):
        rings.append([p + (s * math.cos(a) + u * (math.sin(a) * flat)) * r for a in (2 * math.pi * (i + 0.5) / n for i in range(n))])
    return loft(P, rings, col, cap0, cap1, wrap=loop, fcol=fcol)


def limb(P, ctrl, radii, col, n=8, k=3, **kw):
    pts = cr([Vector(c) for c in ctrl], k)
    tube(P, pts, lerp_list(list(radii), len(pts)), col, n=n, **kw)
    return pts


def blob(P, c, r, col, n=10, m=6, M=None):
    """A low-poly ellipsoid (radii r) at c, optionally turned by the 3x3 matrix M."""
    M = M or Matrix.Identity(3); c = Vector(c)
    def tf(v): return c + M @ Vector(v)
    rings = []
    for j in range(1, m):
        e = -math.pi / 2 + math.pi * j / m
        rings.append([tf((math.cos(a) * math.cos(e) * r[0], math.sin(a) * math.cos(e) * r[1], math.sin(e) * r[2]))
                      for a in (2 * math.pi * (i + 0.5) / n for i in range(n))])
    return loft(P, rings, col, cap0=tf((0, 0, -r[2])), cap1=tf((0, 0, r[2])))


def sheet(P, outer, inner, col):
    """A thin closed solid between two grids of points (rows x columns). col: colour or col(p, j, i, side)."""
    R = len(outer); C = len(outer[0]); base = len(P.v)
    for s, grid in enumerate((outer, inner)):
        for j, row in enumerate(grid):
            for i, p in enumerate(row): P.vert(p, _col(col, Vector(p), j, i, s))
    def ix(s, j, i): return base + s * R * C + j * C + i
    for j in range(R - 1):
        for i in range(C - 1):
            P.f.append((ix(0, j, i), ix(0, j, i + 1), ix(0, j + 1, i + 1), ix(0, j + 1, i)))
            P.f.append((ix(1, j, i), ix(1, j + 1, i), ix(1, j + 1, i + 1), ix(1, j, i + 1)))
    for i in range(C - 1):
        P.f.append((ix(0, 0, i), ix(1, 0, i), ix(1, 0, i + 1), ix(0, 0, i + 1)))
        P.f.append((ix(0, R - 1, i), ix(0, R - 1, i + 1), ix(1, R - 1, i + 1), ix(1, R - 1, i)))
    for j in range(R - 1):
        P.f.append((ix(0, j, 0), ix(0, j + 1, 0), ix(1, j + 1, 0), ix(1, j, 0)))
        P.f.append((ix(0, j, C - 1), ix(1, j, C - 1), ix(1, j + 1, C - 1), ix(0, j + 1, C - 1)))
    return P


def band(P, pts, nors, w, th, col, loop=False):
    """A flat strap along pts, lying on the surface whose normals are nors."""
    m = len(pts); rings = []
    for i in range(m):
        a = pts[(i + 1) % m] if loop else pts[min(i + 1, m - 1)]
        b = pts[(i - 1) % m] if loop else pts[max(i - 1, 0)]
        t = (a - b).normalized(); n = nors[i].normalized(); s = t.cross(n).normalized()
        p = pts[i]
        rings.append([p - s * w, p - s * w + n * th, p + s * w + n * th, p + s * w])
    return loft(P, rings, col, wrap=loop)


# ---------------- paint ----------------
def cloth(hexc, z0, z1, lo=0.66, hi=1.12):
    """Cloth colour: darker and cooler towards z0, lighter and warmer towards z1."""
    b = lin(hexc)
    def fn(p, *a):
        f = sstep(z0, z1, p.z)
        c = mix(Vector((b.x * lo * 0.94, b.y * lo * 0.92, b.z * lo * 1.08)), Vector((b.x * hi * 1.04, b.y * hi, b.z * hi * 0.94)), f)
        return Vector((min(c.x, 1), min(c.y, 1), min(c.z, 1)))
    return fn


def skin_paint(hexc):
    b = lin(hexc); warm = Vector((b.x * 0.98, b.y * 0.76, b.z * 0.72))
    def fn(p, *a):
        if p.z > 0.6: return mix(b, warm, 0.45 * sstep(HC.z + 0.03, HC.z - 0.21, p.z))
        return mix(b, warm, 0.3)
    return fn


def hair_paint(base, hi, lo, band=(24, 36, 48, 60), amt=0.75):
    """Hair strand colour by t (root to tip) and k (0/3 the strand's edges, 1/2 its top, 4 underneath):
    dark roots, a light band across the crown, lighter tips, darker edges so each strand reads as painted."""
    base, hi, lo = lin(base), lin(hi), lin(lo)
    def fn(p, t, k):
        c = mix(lo, base, sstep(0.0, 0.3, t))
        c = mix(c, hi, 0.3 * sstep(0.7, 1.0, t))
        d = p - HC; el = math.degrees(math.asin(clamp(d.z / max(d.length, 1e-6), -1, 1)))
        b = sstep(band[0], band[1], el) * (1 - sstep(band[2], band[3], el)) * amt
        if k in (1, 2): c = mix(c, hi, b)
        elif k in (0, 3): c = mix(c, hi, b * 0.35) * 0.82
        elif k == 4: c = c * 0.55
        return c
    fn.base, fn.hi, fn.lo = base, hi, lo
    return fn


# ---------------- the head and what lies on it ----------------
HEAD_ROWS = [  # (z from the head centre, half width, depth to the front, depth to the back)
    (-0.186, 0.092, 0.086, 0.090), (-0.150, 0.160, 0.146, 0.150), (-0.100, 0.208, 0.182, 0.190),
    (-0.045, 0.230, 0.198, 0.212), (0.010, 0.234, 0.203, 0.222), (0.065, 0.224, 0.198, 0.220),
    (0.115, 0.199, 0.180, 0.200), (0.160, 0.157, 0.143, 0.160), (0.195, 0.094, 0.086, 0.098)]


class Char:
    def __init__(self, name):
        self.name = name; self.parts = []; self.bvh = None

    def part(self, tag, slot, **kw):
        p = Part(f"{self.name}_{tag}", slot, **kw); self.parts.append(p); return p

    # -- head --
    def head(self, P, col, rows=HEAD_ROWS, n=20, p=2.12):
        base = len(P.v); f0 = len(P.f)
        rings = [ring(HC + Vector((0, 0, dz)), rx, ryf, n, p, ryb) for dz, rx, ryf, ryb in rows]
        loft(P, rings, col, cap0=HC + Vector((0, 0, rows[0][0] - 0.016)), cap1=HC + Vector((0, 0, rows[-1][0] + 0.019)))
        self.bvh = BVHTree.FromPolygons([tuple(v) for v in P.v[base:]], [tuple(i - base for i in f) for f in P.f[f0:]])

    def head_pt(self, az, el, lift=0.0):
        d = sdir(az, el)
        loc = self.bvh.ray_cast(HC + d, -d)[0]
        return loc + d * lift, d

    def face_pt(self, x, z, layer):
        loc = self.bvh.ray_cast(Vector((x, -1.0, z)), Vector((0, 1, 0)))[0]
        return loc + (loc - HC).normalized() * (0.0016 * layer)

    # -- painted face details: patches that hug the head --
    def oval(self, P, cx, cz, rx, rz, layer, col, seg=14, rings=2):
        base = len(P.v)
        def add(u, v): return P.vert(self.face_pt(cx + u * rx, cz + v * rz, layer), _col(col, u, v))
        add(0, 0)
        for j in range(1, rings + 1):
            for i in range(seg):
                a = 2 * math.pi * i / seg; add(math.cos(a) * j / rings, math.sin(a) * j / rings)
        for i in range(seg): P.f.append((base, base + 1 + i, base + 1 + (i + 1) % seg))
        for j in range(rings - 1):
            for i in range(seg):
                a = base + 1 + j * seg + i; b = base + 1 + j * seg + (i + 1) % seg
                P.f.append((a, b, b + seg, a + seg))

    def stroke(self, P, pts, widths, layer, col, k=4):
        pts = cr([Vector((x, z, 0)) for x, z in pts], k); ws = lerp_list(list(widths), len(pts)); base = len(P.v)
        for i, (p, w) in enumerate(zip(pts, ws)):
            t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized(); q = Vector((-t.y, t.x, 0)) * (w / 2)
            for s in (-1, 1):
                P.vert(self.face_pt(p.x + s * q.x, p.y + s * q.y, layer), _col(col, i / (len(pts) - 1), s))
        for i in range(len(pts) - 1):
            a = base + 2 * i; P.f.append((a, a + 1, a + 3, a + 2))

    # -- hair --
    def hair_cap(self, P, line, col, n=24, rows=6, lift=0.014):
        """The close layer of hair: from the hairline (elevation by azimuth, see interp) up to the crown."""
        rings = []
        for j in range(-1, rows + 1):
            r = []
            for i in range(n):
                az = -180 + 360 * (i + 0.5) / n; e0 = interp(line, az)
                if j < 0: r.append(self.head_pt(az, e0 - 4, -0.008)[0])     # the rim tucks into the head
                else: r.append(self.head_pt(az, mix(e0, 90, j / (rows + 1)), lift)[0])
            rings.append(r)
        loft(P, rings, col, cap0=Vector(HC), cap1=self.head_pt(0, 90, lift)[0])

    def strand(self, P, ctrl, w, th, col, k=3, root=0.55, tip=0.1, wmax=0.45, sink=0.4):
        """A leaf-shaped lock of hair. ctrl points are (az, el, lift) on the head, or ((x, y, z), (normal))
        once the hair leaves it. Width swells from root*w to w at wmax, then narrows to tip*w."""
        pts, nors = [], []
        for c in ctrl:
            if isinstance(c[0], (int, float)): p, n = self.head_pt(*c)
            else: p, n = Vector(c[0]), Vector(c[1]).normalized()
            pts.append(p); nors.append(n)
        pts = cr(pts, k); nors = [n.normalized() for n in cr(nors, k)]; m = len(pts); rings = []
        for i, (p, n) in enumerate(zip(pts, nors)):
            t = i / (m - 1)
            tan = (pts[min(i + 1, m - 1)] - pts[max(i - 1, 0)]).normalized()
            side = tan.cross(n).normalized(); nn = side.cross(tan).normalized()
            ws = w * mix(root, 1, sstep(0, wmax, t)) * mix(1, tip, sstep(wmax, 1, t) ** 1.3)
            ts = th * mix(0.6, 1, sstep(0, 0.35, t)) * mix(1, 0.35, sstep(0.6, 1, t))
            rings.append([p - side * ws, p - side * (ws * 0.45) + nn * ts, p + side * (ws * 0.45) + nn * ts, p + side * ws, p - nn * (ts * sink)])
        loft(P, rings, lambda p, j, i: col(p, j / (m - 1), i))
        return pts

    # -- finish: meshes, ambient occlusion, paint, join --
    def finish(self, x=0.0):
        V, F = [], []
        for P in self.parts:
            if not P.occl: continue
            o = len(V); V += [tuple(v) for v in P.v]; F += [tuple(i + o for i in f) for f in P.f]
        bvh = BVHTree.FromPolygons(V, F)
        coll = bpy.data.collections.get(self.name)
        if not coll:
            coll = bpy.data.collections.new(self.name); bpy.context.scene.collection.children.link(coll)
        for o in list(coll.objects): bpy.data.objects.remove(o, do_unlink=True)
        for me in list(bpy.data.meshes):
            if me.users == 0 and me.name.startswith(self.name): bpy.data.meshes.remove(me)
        bpy.context.view_layer.layer_collection.children[self.name].exclude = False
        objs = []
        for P in self.parts:
            if not P.v: continue
            ob = bpy.data.objects.new(P.name, part_mesh(P, bvh, paint_mat(P.slot))); coll.objects.link(ob); objs.append(ob)
        bpy.ops.object.select_all(action='DESELECT')
        for ob in objs: ob.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        bpy.ops.object.join()
        ob = bpy.context.object; ob.name = self.name; ob.data.name = self.name
        ob.location.x = x
        self.obj = ob
        return ob


def part_mesh(P, bvh, material):
    """The mesh for one Part: consistent normals, its paint multiplied by tinted ambient occlusion against bvh."""
    me = bpy.data.meshes.new(P.name); me.from_pydata([tuple(v) for v in P.v], [], P.f); me.update()
    bm = bmesh.new(); bm.from_mesh(me); bm.normal_update()
    if P.orient is None: bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    else:
        for f in bm.faces:
            if f.normal.dot(f.calc_center_median() - P.orient) < 0: f.normal_flip()
    bm.to_mesh(me); bm.free(); me.update()
    shade = []
    for v in me.vertices:
        if P.ao <= 0: shade.append(WHITE); continue
        n = v.normal.normalized() if v.normal.length > 0 else Vector((0, 0, 1))
        o = v.co + n * 0.008; t = n.orthogonal().normalized(); b = n.cross(t); occ = 0.0
        for dx, dy, dz in AO_DIRS:
            hit = bvh.ray_cast(o, t * dx + b * dy + n * dz, AO_DIST)
            if hit[0] is not None: occ += (1 - hit[3] / AO_DIST) * dz
        shade.append(mix(WHITE, SHADOW, P.ao * clamp(occ / AO_NORM * 1.5)))
    ca = me.color_attributes.new("Col", 'FLOAT_COLOR', 'CORNER')
    for poly in me.polygons:
        for li in poly.loop_indices:
            vi = me.loops[li].vertex_index; c = P.fc.get(poly.index, P.c[vi]); s = shade[vi]
            ca.data[li].color = (min(c.x * s.x, 1.0), min(c.y * s.y, 1.0), min(c.z * s.z, 1.0), 1.0)
    me.materials.append(material)
    me.shade_smooth(); me.set_sharp_from_angle(angle=math.radians(P.sharp))
    return me


ROUGH = {"hair": 0.6, "eyes": 0.3, "metal": 0.35, "glass": 0.15, "accent": 0.6}


def paint_mat(slot):
    """One material per colour slot; the colour itself comes from the painted vertex colours."""
    name = "chibi_" + slot
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True; nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    a = nt.nodes.get("Col") or nt.nodes.new("ShaderNodeVertexColor"); a.name = "Col"; a.layer_name = "Col"
    nt.links.new(a.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = ROUGH.get(slot, 0.9)
    b.inputs["Metallic"].default_value = 0.7 if slot == "metal" else 0.0
    b.inputs["Specular IOR Level"].default_value = 0.5 if slot in ("eyes", "metal", "glass") else 0.15
    m.use_backface_culling = True
    return m
