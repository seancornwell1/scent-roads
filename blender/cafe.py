# The coffee corner that arrives later in the game (Nov 10), in the warm shop look:
#   coffee-bar (a counter with a copper lever machine, a grinder, cups and a pastry dome),
#   cafe-table (a small round pedestal table laid for two), cafe-chair (a hoop-backed bistro
#   chair; its seat is SEAT_H high, the `height` of a seat in shop.json), menu-board (a chalk
#   A-board) and coffee-sacks (two sacks of beans and a small one lying in front).
# Set ONLY = ["cafe-chair", ...] before running to rebuild just those.
import math, random
from mathutils import Matrix
g = globals()
exec(open(r"C:\Users\seanc\Projects\scent-roads\blender\lib.py").read(), g)
out = []
ONLY = g.get("ONLY")


def want(name):
    return not ONLY or name in ONLY


walnut = mat("w_walnut", "walnut", 0.6)
walnut_lt = mat("w_walnut_lt", "walnut_lt", 0.6)
walnut_dk = mat("w_walnut_dk", "walnut_dk", 0.6)
mahog = mat("w_mahogany", "mahogany", 0.55)
gold = mat("w_gold", "gold", 0.3)
brass = mat("w_brass", "brass", 0.35, metal=1.0)
copper = mat("c_copper", "#C8743F", 0.3, metal=1.0)
burgundy = mat("w_burgundy", "burgundy", 0.85)
forest = mat("w_forest", "forest", 0.7)
china = mat("w_china", "white", 0.3)
ink = mat("c_ink", "ink", 0.5)
slate = mat("c_slate", "#2C3835", 0.9)
chalk = mat("c_chalk", "#F3E9D2", 0.9)
chalk_pink = mat("c_chalk_pink", "#E9A2A0", 0.9)
chalk_gold = mat("c_chalk_gold", "#EBC56A", 0.9)
coffee = mat("c_coffee", "#3A2216", 0.35)
bean = mat("c_bean", "#4A2C1C", 0.6)
pastry = mat("c_pastry", "#D79A52", 0.7)
pastry_dk = mat("c_pastry_dk", "#B8732F", 0.7)
burlap = mat("c_burlap", "#BE9A6A", 0.95)
burlap_dk = mat("c_burlap_dk", "#A07E52", 0.95)
glass = mat("c_glass", "#F4FBFF", 0.05, alpha=0.2)
leaf = mat("w_leaf", "leaf", 0.7)
rose = mat("c_rose", "#D9788A", 0.7)
vase = mat("c_vase", "#3E6B8C", 0.25)

SEAT_H = 0.32
CUP = [(0, 0), (0.026, 0), (0.04, 0.022), (0.043, 0.05), (0.036, 0.05), (0.03, 0.02), (0, 0.012)]


def even(o, lo=1.0, span=None):
    o["shade"] = lo
    if span: o["zspan"] = span
    return o


def cup(M, x, y, z, s=1.0, full=True, saucer=True, handle=0.0):
    """A coffee cup on its saucer, standing at (x, y, z); handle is the angle it points."""
    if saucer:
        even(M.cyl(china, 0.058 * s, 0.01 * s, (x, y, z), verts=14, r2=0.066 * s, bevel=0.003))
        z += 0.01 * s
    even(M.lathe(china, [(r * s, h * s) for r, h in CUP], (x, y, z), verts=12))
    if full:
        even(M.cyl(coffee, 0.036 * s, 0.004 * s, (x, y, z + 0.04 * s), verts=12, bevel=0))
    M.torus(china, 0.016 * s, 0.006 * s, (x + math.cos(handle) * 0.05 * s, y + math.sin(handle) * 0.05 * s, z + 0.028 * s),
            rot=(math.pi / 2, 0, handle), maj=10, mn=5)


def cup_stack(M, x, y, z, n):
    for k in range(n):
        even(M.lathe(china, CUP, (x, y, z + k * 0.024), verts=12))


# ---------- the coffee bar ----------
if want("coffee-bar"):
    M = Model("coffee-bar")
    Wd, D, Ht = 1.9, 0.6, 0.78
    M.box(mahog, (Wd - 0.04, D - 0.06, 0.08), (0, 0, 0), bevel=0.012)                      # plinth
    even(M.box(walnut, (Wd, D, Ht - 0.12), (0, 0, 0.08), bevel=0.012), 0.8)
    n = 3; w = (Wd - 0.08) / n                                                               # the front: green panels in gold beading
    for k in range(n):
        cx = -Wd / 2 + 0.04 + w / 2 + k * w
        M.box(walnut_dk, (w - 0.04, 0.02, Ht - 0.24), (cx, D / 2, 0.13), bevel=0.01)
        even(M.box(gold, (w - 0.11, 0.02, Ht - 0.31), (cx, D / 2 + 0.008, 0.165), bevel=0.008), 1)
        even(M.box(forest, (w - 0.14, 0.02, Ht - 0.34), (cx, D / 2 + 0.014, 0.18), bevel=0.008), 0.82)
    for sx in (-1, 1):                                                                       # panelled ends
        M.box(walnut_dk, (0.02, D - 0.1, Ht - 0.24), (sx * Wd / 2, 0, 0.13), bevel=0.01)
        even(M.box(forest, (0.02, D - 0.2, Ht - 0.34), (sx * (Wd / 2 + 0.012), 0, 0.18), bevel=0.008), 0.82)
    M.box(mahog, (Wd + 0.1, D + 0.1, 0.05), (0, 0, Ht - 0.05), bevel=0.016)                # top
    even(M.box(gold, (Wd + 0.105, D + 0.105, 0.012), (0, 0, Ht - 0.065), bevel=0.004), 1)
    z = Ht
    # a little chalk board hung on the middle panel: a cup and three lines
    by = D / 2 + 0.03
    M.box(walnut_lt, (0.36, 0.02, 0.3), (0, by, 0.3), bevel=0.008)
    even(M.box(slate, (0.31, 0.02, 0.25), (0, by + 0.006, 0.325), bevel=0), 1)
    cy = by + 0.018
    even(M.box(chalk, (0.07, 0.004, 0.05), (-0.07, cy, 0.5), bevel=0), 1)                  # cup
    even(M.box(chalk, (0.1, 0.004, 0.008), (-0.07, cy, 0.487), bevel=0), 1)                # saucer
    even(M.box(chalk, (0.008, 0.004, 0.03), (-0.025, cy, 0.51), bevel=0), 1)               # handle
    even(M.box(chalk_gold, (0.1, 0.004, 0.012), (0.075, cy, 0.515), bevel=0), 1)
    for k, (wl, m) in enumerate(((0.22, chalk), (0.17, chalk), (0.2, chalk_pink))):
        even(M.box(m, (wl, 0.004, 0.011), (-0.13 + wl / 2 + 0.02, cy, 0.44 - k * 0.036), bevel=0), 1)

    # the machine, at the far end from the door: a copper boiler under a dome, on a dark base
    mx = -0.56
    M.box(ink, (0.5, 0.4, 0.05), (mx, -0.02, z), bevel=0.012)
    even(M.box(brass, (0.42, 0.1, 0.012), (mx, -0.2, z + 0.05), bevel=0.004))             # drip tray, on the side of whoever works it
    M.cyl(copper, 0.15, 0.3, (mx, 0, z + 0.05), verts=24, bevel=0.01)
    for zz in (0.07, 0.2, 0.33):
        M.torus(brass, 0.152, 0.012, (mx, 0, z + zz), maj=24, mn=6)
    M.lathe(copper, [(0.15, 0), (0.14, 0.04), (0.1, 0.085), (0.04, 0.11), (0, 0.115)], (mx, 0, z + 0.35), verts=24)
    M.cyl(brass, 0.02, 0.03, (mx, 0, z + 0.46), verts=10, bevel=0.004)
    M.sphere(brass, 0.03, (mx, 0, z + 0.51), seg=10, rings=8)
    even(M.cyl(brass, 0.05, 0.012, (mx, 0.152, z + 0.2), verts=12, rot=(-math.pi / 2, 0, 0), bevel=0.003))   # the badge on its front
    even(M.cyl(china, 0.035, 0.012, (mx, 0.158, z + 0.2), verts=12, rot=(-math.pi / 2, 0, 0), bevel=0.003))
    for sx in (-1, 1):                                                                       # levers with black grips
        M.cyl(brass, 0.011, 0.24, (mx + sx * 0.09, -0.13, z + 0.2), verts=8, rot=(math.radians(28), 0, 0), bevel=0.002)
        M.sphere(ink, 0.024, (mx + sx * 0.09, -0.13 - 0.24 * math.sin(math.radians(28)), z + 0.2 + 0.24 * math.cos(math.radians(28))), seg=8, rings=6)
        M.cyl(brass, 0.022, 0.06, (mx + sx * 0.09, -0.16, z + 0.12), verts=10, bevel=0.004)   # group heads
    M.cyl(brass, 0.007, 0.16, (mx + 0.2, 0.04, z + 0.1), verts=6, rot=(0, math.radians(18), 0), bevel=0)   # steam wand
    cup_stack(M, mx + 0.19, -0.12, z + 0.05, 3)
    cup_stack(M, mx - 0.19, 0.12, z + 0.05, 2)

    # the grinder beside it
    gx = -0.12
    M.box(ink, (0.15, 0.17, 0.2), (gx, -0.04, z), bevel=0.02)
    M.cyl(brass, 0.05, 0.02, (gx, -0.04, z + 0.2), verts=12, bevel=0.004)
    even(M.lathe(bean, [(0, 0), (0.035, 0), (0.07, 0.08), (0, 0.08)], (gx, -0.04, z + 0.225), verts=12), 0.85)
    M.lathe(glass, [(0.04, 0), (0.085, 0.13), (0.085, 0.15), (0, 0.15)], (gx, -0.04, z + 0.22), verts=14)
    M.sphere(brass, 0.016, (gx, -0.04, z + 0.38), seg=8, rings=6)

    # cups ready on the side the customers stand, and a bell
    cup(M, 0.14, 0.12, z, 1.1, full=True, handle=0.6)
    cup(M, 0.32, 0.16, z, 1.1, full=True, handle=2.4)
    M.lathe(brass, [(0.05, 0), (0.05, 0.008), (0.042, 0.03), (0.02, 0.045), (0, 0.048)], (0.2, -0.12, z), verts=12)
    M.sphere(brass, 0.01, (0.2, -0.12, z + 0.052), seg=6, rings=4)

    # the pastry stand under its dome, at the door end
    px = 0.66
    M.lathe(china, [(0, 0), (0.09, 0), (0.07, 0.015), (0.025, 0.03), (0.025, 0.07), (0.17, 0.09), (0.175, 0.1), (0, 0.1)], (px, 0, z), verts=16)
    zt = z + 0.1
    for k in range(5):
        a = k * 2 * math.pi / 5 + 0.3; r = 0.085
        even(M.sphere(pastry if k % 2 else pastry_dk, 0.05, (px + r * math.cos(a), r * math.sin(a), zt + 0.028),
                      scale=(1.25, 0.62, 0.55), seg=8, rings=5, rot=(0, 0, a + math.pi / 2)), 0.85)
    even(M.sphere(pastry, 0.05, (px, 0, zt + 0.07), scale=(1.25, 0.62, 0.55), seg=8, rings=5, rot=(0, 0, 0.5)), 0.85)
    prof = [(0.155, 0)] + [(0.155 * math.cos(t), 0.08 + 0.13 * math.sin(t)) for t in [i * math.pi / 2 / 6 for i in range(6)]]
    M.lathe(glass, prof + [(0.02, 0.21)], (px, 0, zt), verts=18)
    M.sphere(brass, 0.022, (px, 0, zt + 0.225), seg=8, rings=6)
    # a jar of biscuits by it
    jx = 0.4
    M.cyl(glass, 0.055, 0.14, (jx, -0.13, z), verts=12, bevel=0.01)
    even(M.cyl(pastry_dk, 0.045, 0.08, (jx, -0.13, z + 0.008), verts=10, bevel=0.004), 0.85)
    M.cyl(walnut_lt, 0.045, 0.025, (jx, -0.13, z + 0.14), verts=12, bevel=0.006)
    out.append(M.finish())

# ---------- cafe table ----------
if want("cafe-table"):
    M = Model("cafe-table")
    R, Ht = 0.31, 0.6
    M.lathe(ink, [(0, 0), (0.2, 0), (0.2, 0.015), (0.06, 0.05), (0.03, 0.09), (0.028, Ht - 0.1), (0.06, Ht - 0.06), (0.14, Ht - 0.04), (0, Ht - 0.04)], (0, 0, 0), verts=14)
    M.cyl(mahog, R, 0.04, (0, 0, Ht - 0.04), verts=24, bevel=0.012)
    even(M.cyl(walnut_lt, R - 0.03, 0.006, (0, 0, Ht - 0.003), verts=24, bevel=0), 1)
    M.torus(brass, R, 0.009, (0, 0, Ht - 0.02), maj=28, mn=5)
    z = Ht + 0.003
    cup(M, 0.15, 0.0, z, 1.05, handle=1.2)          # for whoever sits to the left of the table (seen from the front)
    cup(M, 0.0, -0.15, z, 1.05, handle=-0.4)        # and for the chair behind it
    M.lathe(vase, [(0, 0), (0.025, 0), (0.035, 0.03), (0.02, 0.07), (0.024, 0.085), (0, 0.08)], (-0.1, 0.1, z), verts=10)
    even(M.cyl(leaf, 0.005, 0.09, (-0.1, 0.1, z + 0.07), verts=5, bevel=0))
    M.sphere(rose, 0.028, (-0.1, 0.1, z + 0.17), scale=(1, 1, 0.8), seg=8, rings=6)
    out.append(M.finish())

# ---------- cafe chair ----------
if want("cafe-chair"):
    M = Model("cafe-chair")
    sr = 0.18
    for sx in (-1, 1):
        for sy in (-1, 1):
            M.cyl(mahog, 0.02, SEAT_H - 0.03, (sx * 0.125, sy * 0.125, 0), verts=8, r2=0.016, bevel=0.003)
    M.torus(mahog, 0.165, 0.01, (0, 0, 0.13), maj=18, mn=5)                                # the stretcher ring
    M.cyl(mahog, sr, 0.03, (0, 0, SEAT_H - 0.045), verts=20, bevel=0.01)
    even(M.cyl(burgundy, sr - 0.02, 0.022, (0, 0, SEAT_H - 0.022), verts=20, bevel=0.01), 0.9)
    # the hoop back, rising from the back of the seat (-Y), and a smaller hoop inside it
    by = -sr + 0.025
    M.torus(mahog, 0.15, 0.014, (0, by, SEAT_H + 0.17), rot=(math.pi / 2, 0, 0), scale=(1, 1.35, 1), maj=22, mn=6)
    M.torus(mahog, 0.085, 0.01, (0, by, SEAT_H + 0.12), rot=(math.pi / 2, 0, 0), scale=(1, 1.5, 1), maj=18, mn=5)
    out.append(M.finish())

# ---------- menu board ----------
if want("menu-board"):
    M = Model("menu-board")
    Wd, Ht, lean = 0.5, 0.88, math.radians(13)
    for side in (1, -1):               # two leaves hinged at the top; the front one (+Y) is the menu
        n0 = len(M.parts)
        M.box(walnut_lt, (Wd, 0.03, Ht), (0, 0, 0), bevel=0.008)
        even(M.box(slate, (Wd - 0.08, 0.02, Ht - 0.2), (0, 0.012, 0.13), bevel=0), 1)
        y = 0.026
        if side == 1:
            even(M.box(chalk_gold, (0.26, 0.004, 0.03), (0, y, 0.7), bevel=0), 1)          # heading
            even(M.box(chalk, (0.34, 0.004, 0.006), (0, y, 0.675), bevel=0), 1)
            for k, (wl, m) in enumerate(((0.2, chalk), (0.26, chalk), (0.16, chalk_pink), (0.23, chalk), (0.19, chalk))):
                even(M.box(m, (wl, 0.004, 0.014), (-0.17 + wl / 2, y, 0.6 - k * 0.062), bevel=0), 1)
            even(M.box(chalk, (0.09, 0.004, 0.06), (0.0, y, 0.19), bevel=0), 1)            # a cup drawn at the foot
            even(M.box(chalk, (0.14, 0.004, 0.01), (0.0, y, 0.172), bevel=0), 1)
            even(M.box(chalk, (0.01, 0.004, 0.035), (0.058, y, 0.205), bevel=0), 1)
            for k in (-1, 0, 1):
                even(M.box(chalk, (0.008, 0.004, 0.03), (k * 0.025, y, 0.265 + 0.006 * (k % 2)), bevel=0), 1)   # steam
        else:
            for k, wl in enumerate((0.26, 0.2, 0.24)):
                even(M.box(chalk, (wl, 0.004, 0.014), (0, y, 0.6 - k * 0.07), bevel=0), 1)
        # lean the leaf back about the hinge at the top, then turn the back leaf round
        tilt = Matrix.Translation((0, 0, Ht)) @ Matrix.Rotation(lean, 4, 'X') @ Matrix.Translation((0, 0, -Ht))
        bpy.context.view_layer.update()
        for o in M.parts[n0:]:
            o.data.transform(o.matrix_world); o.matrix_world = Matrix.Identity(4)   # boxes keep their place on the object
            o.data.transform(tilt)
            if side == -1: o.data.transform(Matrix.Rotation(math.pi, 4, 'Z'))
    out.append(M.finish())

# ---------- sacks of beans ----------
if want("coffee-sacks"):
    M = Model("coffee-sacks")
    rnd = random.Random(5)
    # a full sack, tied
    even(M.sphere(burlap, 0.2, (-0.16, 0, 0.2), scale=(1.0, 0.85, 1.05), seg=12, rings=8), 0.78)
    M.cyl(burlap_dk, 0.05, 0.05, (-0.16, 0, 0.39), verts=10, r2=0.07, bevel=0.01)
    M.torus(walnut_dk, 0.05, 0.01, (-0.16, 0, 0.395), maj=12, mn=5)
    even(M.box(bean, (0.16, 0.006, 0.05), (-0.16, 0.168, 0.2), bevel=0), 1)               # a stencilled mark
    even(M.box(bean, (0.1, 0.006, 0.014), (-0.16, 0.166, 0.165), bevel=0), 1)
    # an open one with its top rolled down, full of beans
    even(M.sphere(burlap, 0.2, (0.2, 0.03, 0.16), scale=(1.0, 0.9, 0.85), seg=12, rings=8), 0.78)
    M.torus(burlap_dk, 0.135, 0.032, (0.2, 0.03, 0.3), maj=16, mn=6)
    even(M.sphere(bean, 0.125, (0.2, 0.03, 0.3), scale=(1, 1, 0.3), seg=12, rings=6), 0.9)
    for k in range(9):
        a = rnd.uniform(0, 6.28); r = rnd.uniform(0, 0.09)
        even(M.sphere(coffee, 0.02, (0.2 + r * math.cos(a), 0.03 + r * math.sin(a), 0.335), scale=(1.3, 0.9, 0.7), seg=6, rings=4, rot=(0, 0, a)))
    # a small sack lying in front
    even(M.sphere(burlap_dk, 0.13, (0.0, 0.22, 0.09), scale=(1.3, 0.8, 0.65), seg=10, rings=6), 0.8)
    out.append(M.finish())

result = {"models": out}
