# Builds the gumdrop perfume bottle in the open Blender scene and exports it.
# Run inside Blender (Scripting tab, or the Blender MCP bridge):
#   exec(open(r"<repo>/blender/perfume-bottle-gumdrop.py").read())
# Follows docs/ASSET_STYLE.md: origin at the bottom centre, front (label) facing
# +Y in Blender (-Z in glTF), parts named perfume-bottle-gumdrop_<part>.
import bpy, bmesh, math, os
from mathutils import Vector

NAME = "perfume-bottle-gumdrop"
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) if "__file__" in globals() else None
K = 1.1  # overall scale, so the bottle is about 0.125 m tall


def hexcol(h):
    h = h.lstrip('#')
    c = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    return (*[x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c], 1.0)


def material(name, hexc, rough, alpha=1.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = hexcol(hexc)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = 0.0
    b.inputs["Alpha"].default_value = alpha
    m.surface_render_method = 'BLENDED' if alpha < 1 else 'DITHERED'
    m.use_backface_culling = True  # glTF: single-sided
    return m


MATS = {
    "glass": material("glass", "#DDF5E8", 0.1, alpha=0.38),
    "liquid": material("liquid", "#F3D9A0", 0.3),   # recoloured in code per perfume
    "collar": material("collar", "#A6E8C6", 0.5),   # mint: collar ring, sprout and cap dots
    "cap": material("cap", "#F5A7C2", 0.45),        # pink; recolourable in code
    "label": material("label", "#FBEBD3", 0.6),     # cream round sticker, UV fills 0-1
}


def new_obj(name):
    o = bpy.context.object
    o.name = name; o.data.name = name
    return o


def apply_all(o):
    bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.convert(target='MESH')  # applies modifiers
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def sphere(name, r, loc, scale, seg, rings):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, radius=r, location=loc)
    o = new_obj(name); o.scale = scale; apply_all(o); return o


def squash_below(o, z, k):
    for v in o.data.vertices:
        if v.co.z < z:
            v.co.z = z + (v.co.z - z) * k


def cut_above(o, z):
    bm = bmesh.new(); bm.from_mesh(o.data)
    res = bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:],
                                 plane_co=(0, 0, z), plane_no=(0, 0, 1), clear_outer=True)
    bmesh.ops.holes_fill(bm, edges=[e for e in res['geom_cut'] if isinstance(e, bmesh.types.BMEdge)])
    bm.to_mesh(o.data); bm.free()


def join(name, objs, mat):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    if len(objs) > 1: bpy.ops.object.join()
    o = bpy.context.object; o.name = name; o.data.name = name
    o.data.materials.clear(); o.data.materials.append(mat)
    for p in o.data.polygons: p.use_smooth = True
    return o


# ---- fresh collection ----
coll = bpy.data.collections.get(NAME)
if coll:
    for o in list(coll.objects): bpy.data.objects.remove(o, do_unlink=True)
else:
    coll = bpy.data.collections.new(NAME); bpy.context.scene.collection.children.link(coll)
# drop old meshes so the new ones keep their exact names (no ".001")
for m in list(bpy.data.meshes):
    if m.users == 0: bpy.data.meshes.remove(m)
layer = bpy.context.view_layer.layer_collection.children[NAME]
bpy.context.view_layer.active_layer_collection = layer

R = 0.05 * K
base = -R * 0.62            # where the body's squashed base sits, relative to its centre
zc = -base                  # body centre, so the base touches z = 0
ztop = zc + R * 0.8 - 0.004 * K

# glass: squat sphere + short neck
body = sphere("body", R, (0, 0, zc), (1, 1, 0.8), 20, 12)
squash_below(body, 0.0 + 0.002 * K, 0.15)
bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=0.014 * K, depth=0.012 * K, location=(0, 0, ztop + 0.002 * K))
neck = new_obj("neck"); apply_all(neck)
glass = join(f"{NAME}_glass", [body, neck], MATS["glass"])

# liquid: smaller copy, about 70 % full
liq = sphere("liq", R * 0.88, (0, 0, zc + 0.002 * K), (1, 1, 0.78), 20, 12)
squash_below(liq, 0.006 * K, 0.15)
cut_above(liq, zc + 0.012 * K)
liquid = join(f"{NAME}_liquid", [liq], MATS["liquid"])

# collar ring, sprout and dots (all mint)
bpy.ops.mesh.primitive_torus_add(major_radius=0.016 * K, minor_radius=0.0058 * K, major_segments=20,
                                 minor_segments=6, location=(0, 0, ztop + 0.008 * K))
ring = new_obj("ring"); apply_all(ring)
capz = ztop + 0.018 * K
capr = 0.027 * K
bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.0024 * K, depth=0.014 * K, location=(0, 0, capz + capr * 0.72 + 0.003 * K),
                                    end_fill_type='NOTHING')
stem = new_obj("stem"); apply_all(stem)
leaves = []
for side in (-1, 1):
    lf = sphere(f"leaf{side}", 0.0095 * K, (0, 0, 0), (1, 0.55, 0.22), 8, 5)
    lf.location = (side * 0.0085 * K, 0, capz + capr * 0.72 + 0.008 * K)
    lf.rotation_euler = (0, math.radians(-28 * side), 0)
    apply_all(lf); leaves.append(lf)
dots = []
for i in range(5):
    a = math.radians(i * 72 + 90)  # one dot straight to the front
    n = Vector((math.cos(a) * 0.62, math.sin(a) * 0.62, 0.6)).normalized()
    p = Vector((0, 0, capz)) + Vector((n.x * capr, n.y * capr, n.z * capr * 0.72))
    d = sphere(f"dot{i}", 0.0045 * K, (0, 0, 0), (1, 1, 0.4), 8, 4)
    d.location = p; d.rotation_euler = n.to_track_quat('Z', 'Y').to_euler()
    apply_all(d); dots.append(d)
collar = join(f"{NAME}_collar", [ring, stem] + leaves + dots, MATS["collar"])

# cap: big squishy mushroom dome
capo = sphere("capdome", capr, (0, 0, capz), (1, 1, 0.72), 20, 10)
squash_below(capo, capz - 0.004 * K, 0.2)
cap = join(f"{NAME}_cap", [capo], MATS["cap"])

# label: round sticker projected onto the front of the body, UV filling 0-1
lr = 0.019 * K
lz = zc + 0.004 * K
bm = bmesh.new()
bmesh.ops.create_circle(bm, cap_ends=True, cap_tris=True, segments=16, radius=lr)
bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=1, use_grid_fill=True)
me = bpy.data.meshes.new("labelmesh"); bm.to_mesh(me); bm.free()
lab = bpy.data.objects.new("label", me); coll.objects.link(lab)
lab.location = (0, R + 0.01, lz); lab.rotation_euler = (math.radians(-90), 0, 0)  # faces +Y
sw = lab.modifiers.new("Wrap", 'SHRINKWRAP'); sw.target = glass; sw.wrap_method = 'PROJECT'
sw.use_project_z = True; sw.use_negative_direction = True; sw.use_positive_direction = True
sw.offset = 0.0008 * K
bpy.context.view_layer.update()
apply_all(lab)
uv = lab.data.uv_layers.new(name="UVMap")
for loop in lab.data.loops:
    co = lab.data.vertices[loop.vertex_index].co
    uv.data[loop.index].uv = ((co.x + lr) / (2 * lr), (co.z - lz + lr) / (2 * lr))
label = join(f"{NAME}_label", [lab], MATS["label"])

# ---- report ----
parts = [glass, liquid, collar, cap, label]
tris = 0
for o in parts:
    o.data.calc_loop_triangles(); tris += len(o.data.loop_triangles)
zmin = min(v.co.z for o in parts for v in o.data.vertices)
for o in parts:  # sit exactly on z = 0
    for v in o.data.vertices: v.co.z -= zmin
zs = [v.co.z for o in parts for v in o.data.vertices]


def export(path):
    bpy.ops.object.select_all(action='DESELECT')
    for o in parts: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True,
                              export_yup=True, export_materials='EXPORT', export_cameras=False,
                              export_lights=False, export_animations=False)


build_info = {"tris": tris, "height": max(zs), "min_z": min(zs)}
