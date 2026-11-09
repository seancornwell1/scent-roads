# Empty supplies rack for the back room: rounded posts, honey shelves whose tops
# sit at 0.42, 0.80 and 1.16 m (backroom.json rack.levels) plus a top shelf,
# a scalloped pink crown and a cream back panel. Six bottles fit per shelf.
import math
g = globals()
exec(open(r"C:\Users\seanc\Projects\scent-roads\blender\lib.py").read(), g)

M = Model("supplies-rack")
post = mat("rack_post", "lightwood", 0.55)
shelf = mat("rack_shelf", "honey", 0.5)
back = mat("rack_back", "cream", 0.75)
crown = mat("rack_crown", "pink", 0.6)

W, D = 1.24, 0.4
T = 0.04
levels = [0.06, 0.42, 0.80, 1.16, 1.52]   # shelf tops
for sx in (-1, 1):
    for sy in (-1, 1):
        x = sx * (W / 2 - 0.03); y = sy * (D / 2 - 0.03)
        M.cyl(post, 0.03, 1.6, (x, y, 0), verts=12, bevel=0.012)
        M.sphere(post, 0.04, (x, y, 1.62), seg=12, rings=8)                 # round finials
for z in levels:
    M.box(shelf, (W - 0.02, D - 0.01, T), (0, 0, z - T), bevel=0.014)
    M.box(post, (W - 0.1, 0.025, 0.05), (0, D / 2 - 0.02, z - T - 0.035), bevel=0.01)  # front lip under each shelf
M.box(back, (W - 0.08, 0.02, 1.48), (0, -D / 2 + 0.03, 0.06), bevel=0.008)
# scalloped crown along the back top
for k in range(7):
    x = -W / 2 + 0.11 + k * (W - 0.22) / 6
    M.cyl(crown, 0.07, 0.03, (x, -D / 2 + 0.03, 1.55), verts=16, rot=(math.radians(90), 0, 0), bevel=0.008)
M.box(crown, (W - 0.1, 0.03, 0.06), (0, -D / 2 + 0.045, 1.52), bevel=0.01)

result = M.finish()
