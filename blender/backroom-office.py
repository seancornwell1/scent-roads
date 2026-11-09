# Back-room office set, three separate models: writing-desk, desk-chair, laptop.
# Fronts face +Y (where you sit).
import math
g = globals()
exec(open(r"C:\Users\seanc\Projects\scent-roads\blender\lib.py").read(), g)
out = []

# ---------- writing desk ----------
M = Model("writing-desk")
top = mat("desk_top", "honey", 0.5)
wood = mat("desk_wood", "lightwood", 0.55)
brass = mat("desk_brass", "brass", 0.35, metal=1.0)
W, D, H = 1.1, 0.56, 0.76
for sx in (-1, 1):
    for sy in (-1, 1):
        M.cyl(wood, 0.022, H - 0.06, (sx * (W / 2 - 0.07), sy * (D / 2 - 0.07), 0), r2=0.035, verts=12, bevel=0.008)
M.box(wood, (W - 0.08, D - 0.08, 0.12), (0, 0, H - 0.17), bevel=0.02)              # apron
M.box(top, (W, D, 0.055), (0, 0, H - 0.055), bevel=0.025)
M.box(mat("desk_drawer", "sage", 0.6), (0.44, 0.02, 0.085), (0, D / 2 - 0.035, H - 0.155), bevel=0.012)
M.sphere(brass, 0.016, (0, D / 2 - 0.02, H - 0.112), seg=10, rings=6)
# little gallery shelf at the back with a cubby
M.box(wood, (W - 0.06, 0.12, 0.02), (0, -D / 2 + 0.07, H + 0.16), bevel=0.008)
for x in (-W / 2 + 0.04, W / 2 - 0.04, -0.15):
    M.box(wood, (0.025, 0.12, 0.16), (x, -D / 2 + 0.07, H), bevel=0.008)
M.box(mat("desk_paper", "cream", 0.8), (0.14, 0.09, 0.11), (-0.33, -D / 2 + 0.07, H), bevel=0.01)
M.box(mat("desk_book", "pink", 0.6), (0.04, 0.1, 0.13), (-0.08, -D / 2 + 0.07, H), bevel=0.006)
M.box(mat("desk_book2", "sky", 0.6), (0.035, 0.1, 0.12), (-0.03, -D / 2 + 0.07, H), bevel=0.006)
out.append(M.finish())

# ---------- desk chair ----------
M = Model("desk-chair")
wood = mat("chair_wood", "lightwood", 0.55)
cush = mat("chair_cushion", "pink", 0.7)
SH = 0.46
for sx in (-1, 1):
    for sy in (-1, 1):
        M.cyl(wood, 0.026, SH - 0.03, (sx * 0.19, sy * 0.19, 0), r2=0.02, verts=10, bevel=0.006,
              rot=(math.radians(5 * sy), math.radians(-5 * sx), 0))
M.cyl(wood, 0.23, 0.045, (0, 0, SH - 0.06), verts=24, bevel=0.015)               # seat
M.cyl(cush, 0.2, 0.06, (0, 0, SH - 0.02), verts=24, bevel=0.025)                 # cushion
# spindle back (behind the sitter, -Y)
for x in (-0.12, -0.04, 0.04, 0.12):
    M.cyl(wood, 0.012, 0.36, (x, -0.17, SH - 0.02), verts=8, bevel=0.004)
for sx in (-1, 1):
    M.cyl(wood, 0.018, 0.42, (sx * 0.19, -0.17, SH - 0.04), verts=10, bevel=0.006)
M.box(wood, (0.46, 0.05, 0.09), (0, -0.17, SH + 0.32), bevel=0.022)
M.sphere(mat("chair_heart", "rose", 0.6), 0.028, (0, -0.14, SH + 0.365), scale=(1, 0.5, 1), seg=12, rings=8)
out.append(M.finish())

# ---------- laptop ----------
M = Model("laptop")
shell = mat("laptop_shell", "lilac", 0.45)
screen = mat("laptop_screen", "#BFE6FF", 0.2)
keys = mat("laptop_keys", "white", 0.6)
sticker = mat("laptop_sticker", "mint", 0.6)
LW, LD = 0.34, 0.24
M.box(shell, (LW, LD, 0.022), (0, 0, 0), bevel=0.009)
for i in range(4):
    M.box(keys, (LW - 0.06, 0.022, 0.006), (0, 0.03 - i * 0.03 + 0.02, 0.02), bevel=0.003)
M.box(keys, (0.1, 0.06, 0.004), (0, 0.075, 0.02), bevel=0.003)                    # trackpad
# lid, tilted back 15 degrees around the back hinge
t = math.radians(15)
hinge = Vector((0, -LD / 2 + 0.009, 0.018))
u = Vector((0, -math.sin(t), math.cos(t)))      # up the lid
n = Vector((0, math.cos(t), math.sin(t)))       # lid's inner face normal (toward you)
def at(v, h):  # box helper takes a bottom-centre point; shift down half its height along world z
    return (v.x, v.y, v.z - h / 2)
LH = 0.23
M.box(shell, (LW, 0.018, LH), at(hinge + u * (LH / 2), LH), bevel=0.008, rot=(t, 0, 0))
M.box(screen, (LW - 0.04, 0.004, 0.18), at(hinge + u * (LH / 2 + 0.005) + n * 0.01, 0.18), bevel=0.002, rot=(t, 0, 0))
base = hinge + u * 0.15 - n * 0.013
M.cyl(sticker, 0.03, 0.004, (0.07, base.y, base.z), verts=16, rot=(t - math.radians(90), 0, 0), bevel=0.0015)
out.append(M.finish(pad=1.6))

result = {"models": out}
