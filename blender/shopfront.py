# Shop front and display, each its own model:
#   wall-shopfront: 2 m wall panel (like wall-plain) with a big display window
#                   and a cushioned window seat on the room side (+Y).
#   wall-shelf:     a wall-hung display shelf for house perfumes, three tiers
#                   on scalloped brackets; back at y = 0, origin on the floor below it,
#                   so shelf tops stay at 1.0 / 1.35 / 1.7 m.
import math
g = globals()
exec(open(r"C:\Users\seanc\Projects\scent-roads\blender\lib.py").read(), g)
out = []

W, H, T = 2.0, 3.0, 0.2
plaster = mat("wall_plaster", "cream", 0.85)
wains = mat("wall_wainscot", "sage", 0.7)
trim = mat("wall_trim", "white", 0.6)
wood = mat("wall_wood", "honey", 0.55)

# ---------- shop front ----------
M = Model("wall-shopfront")
ow, z0, z1 = 1.7, 0.75, 2.6
M.box(plaster, (W, T, H - z1), (0, 0, z1), bevel=0)
for x0, x1 in ((-W / 2, -ow / 2), (ow / 2, W / 2)):
    M.box(plaster, (x1 - x0, T, z1), ((x0 + x1) / 2, 0, 0), bevel=0)
M.box(wains, (ow, T + 0.02, z0), (0, 0.01, 0), bevel=0.01, segs=1)              # under the window
M.box(wood, (W, T + 0.05, 0.12), (0, 0.025, 0), bevel=0.02)                     # skirting
M.box(wood, (W, T + 0.08, 0.1), (0, 0.04, H - 0.1), bevel=0.03)                 # crown
fr = 0.08
for x in (-ow / 2 - fr / 2 + 0.01, ow / 2 + fr / 2 - 0.01):
    M.box(trim, (fr, T + 0.06, z1 - z0 + fr), (x, 0, z0), bevel=0.02)
M.box(trim, (ow + 2 * fr, T + 0.06, fr), (0, 0, z1), bevel=0.02)
M.box(mat("wall_glass", "#CFEFFF", 0.05, alpha=0.3), (ow, 0.02, z1 - z0), (0, 0, z0), bevel=0, segs=1)
for x in (-ow / 6, ow / 6):                                                       # three tall lights
    M.box(trim, (0.04, 0.05, z1 - z0), (x, 0, z0), bevel=0.012)
M.box(trim, (ow, 0.05, 0.04), (0, 0, z1 - 0.45), bevel=0.012)                   # transom bar
# scalloped valance across the top of the window
val = mat("wall_valance", "pink", 0.8)
M.box(val, (ow + 0.1, 0.04, 0.12), (0, T / 2 + 0.04, z1 - 0.1), bevel=0.015)
for k in range(9):
    x = -ow / 2 + 0.05 + k * (ow - 0.1) / 8
    M.cyl(val, 0.1, 0.04, (x, T / 2 + 0.06, z1 - 0.1), verts=16, rot=(math.radians(-90), 0, 0), bevel=0.01)
# window seat with cushions and pillows
seat_d = 0.45
M.box(wood, (ow + 0.1, seat_d, z0 - 0.05), (0, T / 2 + seat_d / 2, 0), bevel=0.025)
for x in (-0.4, 0.4):
    M.box(trim, (0.6, 0.02, 0.4), (x, T / 2 + seat_d + 0.002, 0.15), bevel=0.012)
M.box(mat("seat_cushion", "pink", 0.85), (ow, seat_d - 0.04, 0.1), (0, T / 2 + seat_d / 2, z0 - 0.06), bevel=0.045, segs=4)
for x, c, r in ((-0.6, "butter", 0), (-0.32, "mint", 12), (0.62, "lilac", -10)):
    M.sphere(mat(f"seat_pillow_{c}", c, 0.85), 0.16, (x, T / 2 + 0.12, z0 + 0.17), scale=(1, 0.45, 0.85), seg=12, rings=8,
             rot=(math.radians(-12), 0, math.radians(r)))
out.append(M.finish())

# ---------- wall shelf for house perfumes ----------
M = Model("wall-shelf", ground=False)   # keeps real mounting heights
shelf = mat("shelf_wood", "honey", 0.5)
back = mat("shelf_back", "lightwood", 0.55)
bracket = mat("shelf_bracket", "pink", 0.6)
SW, SD = 1.2, 0.24
M.box(back, (SW, 0.03, 1.0), (0, 0.015, 0.8), bevel=0.012)                       # backboard
M.cyl(back, SW / 2, 0.03, (0, 0.0, 1.8), verts=28, rot=(math.radians(-90), 0, 0), bevel=0.012)
M.cyl(bracket, SW / 2 - 0.06, 0.035, (0, 0.0, 1.8), verts=28, rot=(math.radians(-90), 0, 0), bevel=0.01)
for z in (1.0, 1.35, 1.7):
    M.box(shelf, (SW + 0.04, SD, 0.035), (0, 0.03 + SD / 2, z - 0.035), bevel=0.012)
    M.box(shelf, (SW, 0.02, 0.03), (0, 0.03 + SD - 0.01, z), bevel=0.008)        # little lip
    for x in (-SW / 2 + 0.08, SW / 2 - 0.08):                                     # scalloped brackets
        M.cyl(bracket, 0.1, 0.03, (x - 0.015, 0.03, z - 0.035), verts=16, rot=(0, math.radians(90), 0), bevel=0.008)
M.sphere(bracket, 0.04, (0, 0.03, 2.38), scale=(1, 0.6, 1), seg=12, rings=8)      # heart-ish top knob
out.append(M.finish())

result = {"models": out}
