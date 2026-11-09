# Room shell for the cozy overhaul, sized like the current modules
# (shop.json: 2 m floor tiles 0.1 m thick; 2 m wall panels, 3 m tall):
#   floor-planks, wall-plain, wall-window, wall-doorway, door-arched.
# Wall panels are 0.2 m thick, centred on y = 0; the room side faces +Y.
import math, random
g = globals()
exec(open(r"C:\Users\seanc\Projects\scent-roads\blender\lib.py").read(), g)
random.seed(11)
out = []

# ---------- floor planks ----------
M = Model("floor-planks")
shades = [mat("floor_plank_a", "#E9B67E", 0.7), mat("floor_plank_b", "#DFA56C", 0.7), mat("floor_plank_c", "#F0C38F", 0.7)]
N = 8; pw = 2.0 / N
for i in range(N):
    y = -1 + pw / 2 + i * pw
    # each row has a joint at a different place
    cut = random.uniform(-0.6, 0.6)
    for (x0, x1) in ((-1, cut), (cut, 1)):
        M.box(random.choice(shades), (x1 - x0 - 0.008, pw - 0.008, 0.1), ((x0 + x1) / 2, y, 0), bevel=0.012, segs=2)
out.append(M.finish(elev=45, pad=1.2))

# ---------- shared wall pieces ----------
W, H, T = 2.0, 3.0, 0.2
plaster = mat("wall_plaster", "cream", 0.85)
wains = mat("wall_wainscot", "sage", 0.7)
trim = mat("wall_trim", "white", 0.6)
wood = mat("wall_wood", "honey", 0.55)


def plaster_block(M, x0, x1, z0, z1):
    M.box(plaster, (x1 - x0, T, z1 - z0), ((x0 + x1) / 2, 0, z0), bevel=0)  # no bevel: panels butt together


def wainscot(M, x0, x1):
    # sage panelling to 1.0 m with a rail, skirting and little raised panels
    M.box(wains, (x1 - x0, T + 0.02, 1.0), ((x0 + x1) / 2, 0.01, 0), bevel=0.01, segs=1)
    M.box(wood, (x1 - x0, T + 0.06, 0.06), ((x0 + x1) / 2, 0.03, 1.0), bevel=0.02)          # chair rail
    M.box(wood, (x1 - x0, T + 0.05, 0.12), ((x0 + x1) / 2, 0.025, 0), bevel=0.02)           # skirting
    n = max(1, round((x1 - x0) / 0.5))
    pw = (x1 - x0) / n
    for k in range(n):
        cx = x0 + pw / 2 + k * pw
        M.box(trim, (pw - 0.12, 0.02, 0.62), (cx, T / 2 + 0.02, 0.22), bevel=0.012)
        M.box(wains, (pw - 0.18, 0.02, 0.56), (cx, T / 2 + 0.032, 0.25), bevel=0.012)


def crown(M, x0, x1):
    # top sits 1.5 cm above the plaster so the two top faces don't fight
    M.box(wood, (x1 - x0, T + 0.08, 0.115), ((x0 + x1) / 2, 0.04, H - 0.1), bevel=0.03)


# ---------- plain wall ----------
M = Model("wall-plain")
plaster_block(M, -W / 2, W / 2, 1.0, H)
wainscot(M, -W / 2, W / 2)
crown(M, -W / 2, W / 2)
out.append(M.finish())

# ---------- window wall ----------
M = Model("wall-window")
ow, z0, z1 = 1.0, 1.15, 2.45
plaster_block(M, -W / 2, -ow / 2, 1.0, H); plaster_block(M, ow / 2, W / 2, 1.0, H)
plaster_block(M, -ow / 2, ow / 2, z1, H); plaster_block(M, -ow / 2, ow / 2, 1.0, z0)
wainscot(M, -W / 2, W / 2)
crown(M, -W / 2, W / 2)
fr = 0.07
for x in (-ow / 2 - fr / 2 + 0.01, ow / 2 + fr / 2 - 0.01):
    M.box(trim, (fr, T + 0.06, z1 - z0 + 2 * fr), (x, 0.0, z0 - fr), bevel=0.02)
M.box(trim, (ow + 2 * fr, T + 0.06, fr), (0, 0.0, z1), bevel=0.02)
M.box(wood, (ow + 0.24, T + 0.16, 0.06), (0, 0.06, z0 - 0.06), bevel=0.02)              # deep sill
M.box(mat("wall_glass", "#CFEFFF", 0.05, alpha=0.3), (ow, 0.02, z1 - z0), (0, 0, z0), bevel=0.0, segs=1)
M.box(trim, (0.04, 0.05, z1 - z0), (0, 0, z0), bevel=0.012)                             # mullions
M.box(trim, (ow, 0.05, 0.04), (0, 0, z0 + (z1 - z0) * 0.55), bevel=0.012)
# a little pot on the sill
M.lathe(mat("wall_pot", "terracotta", 0.7), [(0, 0), (0.05, 0), (0.065, 0.1), (0, 0.1)], (0.3, 0.13, z0), verts=12)
M.sphere(mat("wall_plant", "leaf", 0.6), 0.075, (0.3, 0.13, z0 + 0.15), scale=(1, 1, 0.85), seg=12, rings=8)
M.sphere(mat("wall_bloom", "pink", 0.6), 0.025, (0.33, 0.17, z0 + 0.2), seg=8, rings=6)
out.append(M.finish())

# ---------- doorway wall ----------
M = Model("wall-doorway")
# arched opening that matches door-arched: 1.1 m wide, straight sides to 1.6 m, round top to 2.15 m
DR, DS = 0.55, 1.6          # arch radius, height where the arch starts
NA = 16                     # segments in the half circle


def arc(r, a0, a1, n):
    return [(r * math.cos(a0 + (a1 - a0) * i / n), DS + r * math.sin(a0 + (a1 - a0) * i / n)) for i in range(n + 1)]


def slab(M, m, outline, y0, depth):
    """Extrudes a 2D outline in the XZ plane from y0 to y0 + depth (front at +Y)."""
    n = len(outline)
    vs = [(x, y0, z) for x, z in outline] + [(x, y0 + depth, z) for x, z in outline]
    fs = [tuple(range(n - 1, -1, -1)), tuple(range(n, 2 * n))]
    fs += [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    o = M.mesh(m, vs, fs, smooth=False)
    bm = bmesh.new(); bm.from_mesh(o.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])   # make every face point outward
    bm.to_mesh(o.data); bm.free()
    return o

plaster_block(M, -W / 2, -DR, 1.0, H); plaster_block(M, DR, W / 2, 1.0, H)
plaster_block(M, -DR, DR, DS + DR, H)
for side in (1, -1):        # spandrels: the plaster between the arch and the square above it
    pts = [(side * x, z) for x, z in arc(DR, 0, math.pi / 2, NA // 2)] + [(side * DR, DS + DR)]
    if side < 0: pts.reverse()
    slab(M, plaster, pts, -T / 2, T)
wainscot(M, -W / 2, -DR - 0.06); wainscot(M, DR + 0.06, W / 2)
crown(M, -W / 2, W / 2)
for x in (-DR - 0.05, DR + 0.05):                       # straight sides of the frame
    M.box(wood, (0.1, T + 0.08, DS + 0.01), (x, 0, 0), bevel=0.025)
ring = arc(DR + 0.1, 0, math.pi, NA) + list(reversed(arc(DR, 0, math.pi, NA)))
slab(M, wood, ring, -T / 2 - 0.04, T + 0.08)            # arched top of the frame
M.sphere(mat("wall_keystone", "pink", 0.6), 0.06, (0, T / 2 + 0.05, DS + DR + 0.05), scale=(1, 0.5, 1.1), seg=12, rings=8)
out.append(M.finish())

# ---------- arched door leaf ----------
M = Model("door-arched")
door = mat("door_paint", "mint", 0.6)
dtrim = mat("door_trim", "white", 0.6)
br = mat("door_brass", "brass", 0.35, metal=1.0)
R = 0.54; rect = 1.6; th = 0.06   # fills wall-doorway's arched opening (1.1 m wide, 2.15 m tall)
M.box(door, (2 * R, th, rect), (0, 0, 0), bevel=0.015)
M.cyl(door, R, th, (0, -th / 2, rect), verts=24, rot=(math.radians(-90), 0, 0), bevel=0.012)
for side in (1, -1):                          # both faces get panels, a window ring and a knob
    face = side * th / 2
    for x in (-0.22, 0.22):                   # two raised panels
        M.box(dtrim, (0.3, 0.02, 0.8), (x, face, 0.2), bevel=0.012)
        M.box(door, (0.24, 0.02, 0.74), (x, face + side * 0.01, 0.23), bevel=0.012)
    M.cyl(dtrim, 0.24, 0.025, (0, face - side * 0.005, rect + 0.05), verts=20, rot=(math.radians(-90 * side), 0, 0), bevel=0.008)
    M.sphere(br, 0.04, (0.38, face + side * 0.04, 1.0), seg=12, rings=8)
    M.cyl(br, 0.015, 0.04, (0.38, face, 1.0), verts=8, rot=(math.radians(-90 * side), 0, 0), bevel=0)
M.cyl(mat("door_glass", "#CFEFFF", 0.05), 0.19, th + 0.03, (0, -th / 2 - 0.015, rect + 0.05), verts=20, rot=(math.radians(-90), 0, 0), bevel=0.006)
for z in (0.3, 1.45):                         # hinges on the left edge (x = -R)
    M.cyl(br, 0.018, 0.14, (-R - 0.005, 0, z), verts=10, bevel=0.004)
out.append(M.finish())

result = {"models": out}
