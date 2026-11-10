# Shared helpers for the cozy-overhaul models. Loaded by each model script:
#   exec(open(LIB).read(), g)
# Conventions: metres, Z up in Blender, origin at the bottom centre (z = 0),
# front faces +Y in Blender; export_glb turns it to face +Z in the glTF, like the Grab3D kit.
import bpy, bmesh, math, os
from mathutils import Vector

REPO = r"C:\Users\seanc\Projects\scent-roads"
MODELS = os.path.join(REPO, "assets", "custom", "models")
PREVIEWS = os.path.join(REPO, "blender", "previews")

# The warm shop palette (Nov 10): walnut and mahogany wood, cream plaster, burgundy and
# forest green cloth, old gold. The first set of names comes from the pastel palette the
# earlier models were written with; each now gives the nearest colour of the new one.
PAL = {
    "honey": "#8F5236", "lightwood": "#B0714A", "darkwood": "#633626", "cream": "#F6E7CF",
    "peach": "#E3BE8E", "mint": "#5F8F72", "sage": "#4E7A62", "pink": "#9E3447",
    "lilac": "#8C6DB0", "sky": "#7FB6CC", "butter": "#E6B655", "brass": "#D6A446",
    "terracotta": "#C56A42", "leaf": "#63A555", "deepleaf": "#3F8248", "rose": "#BC4C60",
    "white": "#FFF6E4", "ink": "#3B2A2A", "straw": "#DDBA78", "berry": "#7F2538",
    # new names
    "walnut": "#8F5236", "walnut_lt": "#A9663F", "walnut_dk": "#633626", "mahogany": "#4E281E",
    "plaster": "#F6E7CF", "plaster_dk": "#EAD4B4", "parquet": "#CC8A4A", "burgundy": "#8E2B3D",
    "wine": "#6E1F30", "forest": "#3E6B55", "moss": "#557F52", "gold": "#DDAE4E", "paper": "#F3E4C4",
    "glow": "#FFD58A",
}

SHADE = 0.8   # painted shading: how dark the foot of each part is (1 = none)


def hexcol(h):
    h = h.lstrip('#')
    c = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    return (*[x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c], 1.0)


def mat(name, hexc, rough=0.6, metal=0.0, alpha=1.0, emit=0.0, paint=True):
    """Material named by part; hexc may be a palette key. emit makes it glow in its own colour.
    Plain materials (opaque, not metal, not glowing) are merged into one painted material when
    the model is joined (see Model._paint); paint=False keeps one on its own."""
    hexc = PAL.get(hexc, hexc)
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = hexcol(hexc)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    b.inputs["Alpha"].default_value = alpha
    b.inputs["Emission Color"].default_value = hexcol(hexc) if emit else (0, 0, 0, 1)
    b.inputs["Emission Strength"].default_value = emit
    m.surface_render_method = 'BLENDED' if alpha < 1 else 'DITHERED'
    m.use_backface_culling = True
    m["paint"] = bool(paint)
    return m


def paint_kind(m):
    """Which painted material a part with material m is merged into: matte, gloss, or none
    (glass, metal, glowing or textured parts, and materials made with paint=False)."""
    if not m.get("paint", False): return ""
    nt = m.node_tree
    if any(n.type == 'TEX_IMAGE' for n in nt.nodes): return ""
    b = nt.nodes["Principled BSDF"].inputs
    if b["Alpha"].default_value < 1 or b["Metallic"].default_value > 0 or b["Emission Strength"].default_value > 0: return ""
    return "gloss" if b["Roughness"].default_value < 0.4 else "matte"


def paint_mat(kind="matte"):
    """The material every plain part ends up with: its colour comes from the painted vertex
    colours (attribute Col), so a whole piece of furniture is drawn in one go. There are two,
    matte (wood, cloth, plaster) and gloss (glazed and polished things)."""
    name = "paint" if kind == "matte" else "paint-gloss"
    m = bpy.data.materials.get(name)
    if m: return m
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    a = nt.nodes.new("ShaderNodeVertexColor"); a.layer_name = "Col"
    nt.links.new(a.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.72 if kind == "matte" else 0.25
    m.use_backface_culling = True
    m["paint"] = False
    return m


def export_glb(objs, path):
    """Exports objs as one .glb, turned 180 degrees so the front (+Y in Blender) ends up
    facing +Z in the glTF, the way the Grab3D kit and the game's rotations expect."""
    from mathutils import Matrix
    turn = Matrix.Rotation(math.pi, 4, 'Z')
    for o in objs: o.data.transform(turn)
    try:
        bpy.ops.object.select_all(action='DESELECT')
        for o in objs: o.select_set(True)
        bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_apply=True,
                                  export_yup=True, export_materials='EXPORT', export_cameras=False,
                                  export_lights=False, export_animations=False, export_vertex_color='NAME',
                                  export_vertex_color_name='Col', export_all_vertex_colors=False)
    finally:
        for o in objs: o.data.transform(turn)  # turning 180 twice puts it back


class Model:
    """Collects parts for one model; join() makes a single mesh: one painted material for the
    plain parts, plus one each for glass, metal and glowing parts."""

    def __init__(self, name, ground=True, shade=None):
        self.name = name
        self.ground = ground  # False keeps real heights (wall-hung pieces)
        self.shade = SHADE if shade is None else shade  # painted shading at the foot of each part
        for o in list(bpy.data.objects):
            if o.name.startswith(name + "_") or o.name == name:
                bpy.data.objects.remove(o, do_unlink=True)
        for m in list(bpy.data.meshes):
            if m.users == 0: bpy.data.meshes.remove(m)
        c = bpy.data.collections.get(name)
        if not c:
            c = bpy.data.collections.new(name); bpy.context.scene.collection.children.link(c)
        self.coll = c
        bpy.context.view_layer.layer_collection.children[name].exclude = False
        bpy.context.view_layer.active_layer_collection = bpy.context.view_layer.layer_collection.children[name]
        self.parts = []
        self.n = 0

    # -- internals --
    def _take(self, o, m, bevel=0.0, segs=3, smooth=True, wn=True):
        self.n += 1
        o.name = f"{self.name}_p{self.n}"; o.data.name = o.name
        for uc in list(o.users_collection): uc.objects.unlink(o)
        self.coll.objects.link(o)
        o.data.materials.clear(); o.data.materials.append(m)
        if bevel > 0:
            b = o.modifiers.new("Bevel", 'BEVEL'); b.width = bevel; b.segments = segs
            b.limit_method = 'ANGLE'; b.angle_limit = math.radians(40)
        for p in o.data.polygons: p.use_smooth = smooth
        if smooth and wn:
            o.modifiers.new("WN", 'WEIGHTED_NORMAL').keep_sharp = False
        self.parts.append(o)
        return o

    @staticmethod
    def _apply(o):
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

    # -- primitives (z is the bottom of the part unless noted) --
    def box(self, m, size, loc=(0, 0, 0), bevel=None, rot=(0, 0, 0), segs=3):
        sx, sy, sz = size
        bpy.ops.mesh.primitive_cube_add(size=1, location=(loc[0], loc[1], loc[2] + sz / 2), rotation=rot)
        o = bpy.context.object; o.scale = (sx, sy, sz); self._apply(o)
        if bevel is None: bevel = min(size) * 0.18
        # an unbevelled box is flat-shaded: smooth normals on sharp corners shade unevenly
        return self._take(o, m, bevel=bevel, segs=segs, smooth=bevel > 0)

    def cyl(self, m, r, h, loc=(0, 0, 0), verts=20, r2=None, bevel=None, rot=(0, 0, 0), caps=True, segs=3):
        bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r if r2 is None else r2, depth=h,
                                        location=(0, 0, 0), end_fill_type='NGON' if caps else 'NOTHING')
        o = bpy.context.object
        for v in o.data.vertices: v.co.z += h / 2
        o.rotation_euler = rot; o.location = loc; self._apply(o)
        bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
        if bevel is None: bevel = min(r, h) * 0.2
        return self._take(o, m, bevel=bevel, segs=segs)

    def sphere(self, m, r, loc, scale=(1, 1, 1), seg=16, rings=10, rot=(0, 0, 0), smooth=True):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=rings, radius=r, location=loc, rotation=rot)
        o = bpy.context.object
        # scale in local space before rotation
        for v in o.data.vertices: v.co = Vector((v.co.x * scale[0], v.co.y * scale[1], v.co.z * scale[2]))
        self._apply(o)
        return self._take(o, m, smooth=smooth, wn=False)

    def torus(self, m, R, r, loc, rot=(0, 0, 0), scale=(1, 1, 1), maj=20, mn=8):
        bpy.ops.mesh.primitive_torus_add(major_radius=R, minor_radius=r, major_segments=maj, minor_segments=mn,
                                         location=loc, rotation=rot)
        o = bpy.context.object; o.scale = scale; self._apply(o)
        return self._take(o, m, wn=False)

    def lathe(self, m, profile, loc=(0, 0, 0), verts=20, smooth=True):
        """profile: [(radius, z), ...] from bottom to top; closed with caps at r=0 points."""
        bm = bmesh.new()
        rings = []
        for r, z in profile:
            ring = []
            for i in range(verts):
                a = 2 * math.pi * i / verts
                ring.append(bm.verts.new((r * math.cos(a), r * math.sin(a), z)))
            rings.append(ring)
        for a, b in zip(rings, rings[1:]):
            for i in range(verts):
                j = (i + 1) % verts
                bm.faces.new((a[i], a[j], b[j], b[i]))
        if profile[0][0] > 0: bm.faces.new(list(reversed(rings[0])))
        if profile[-1][0] > 0: bm.faces.new(rings[-1])
        bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-6)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        # cylindrical UVs: u around, v up (so a label texture wraps the band)
        uvl = bm.loops.layers.uv.new("UVMap")
        z0 = min(p[1] for p in profile); z1 = max(p[1] for p in profile); hz = (z1 - z0) or 1
        for f in bm.faces:
            us = [(math.atan2(l.vert.co.y, l.vert.co.x) / (2 * math.pi)) % 1.0 for l in f.loops]
            seam = max(us) - min(us) > 0.5
            for l, u in zip(f.loops, us):
                l[uvl].uv = (u + 1.0 if seam and u < 0.5 else u, (l.vert.co.z - z0) / hz)
        me = bpy.data.meshes.new("lathe"); bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new("lathe", me); self.coll.objects.link(o)
        o.location = loc
        bpy.ops.object.select_all(action='DESELECT'); o.select_set(True)
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.transform_apply(location=True)
        return self._take(o, m, smooth=smooth, wn=False)

    def mesh(self, m, verts, faces, bevel=0.0, smooth=True):
        me = bpy.data.meshes.new("m"); me.from_pydata(verts, [], faces); me.update()
        o = bpy.data.objects.new("m", me); self.coll.objects.link(o)
        return self._take(o, m, bevel=bevel, smooth=smooth)

    def prism(self, m, outline, a0, a1, axis='Y', bevel=0.0, smooth=False):
        """A flat outline pushed through from a0 to a1 along an axis, with flat ends.
        axis Y: outline is (x, z) points; X: (y, z) points; Z: (x, y) points."""
        put = {'Y': lambda u, v, a: (u, a, v), 'X': lambda u, v, a: (a, u, v), 'Z': lambda u, v, a: (u, v, a)}[axis]
        n = len(outline)
        vs = [put(u, v, a0) for u, v in outline] + [put(u, v, a1) for u, v in outline]
        fs = [tuple(range(n)), tuple(range(n, 2 * n))]
        fs += [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
        o = self.mesh(m, vs, fs, bevel=bevel, smooth=smooth)
        bm = bmesh.new(); bm.from_mesh(o.data)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        bm.to_mesh(o.data); bm.free()
        return o

    def _paint(self, o):
        """Writes the colour of a part into its vertex colours, darker towards its foot, and gives
        plain parts the shared painted material. Glass, metal and glowing parts keep their own
        (painted white). A part can set its own foot shade: o["shade"] = 1 leaves it even;
        o["zspan"] = (z0, z1) shades it over that height instead of its own."""
        me = o.data
        m = me.materials[0]
        plain = paint_kind(m)
        col = me.color_attributes.get("Col") or me.color_attributes.new("Col", 'FLOAT_COLOR', 'CORNER')
        base = tuple(m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value)[:3] if plain else (1.0, 1.0, 1.0)
        zs = [v.co.z for v in me.vertices]
        z0 = min(zs); tall = max(zs) - z0
        lo = o.get("shade", self.shade)
        if o.get("zspan"):   # shade over a given height instead (parts that make one surface together)
            z0 = o["zspan"][0]; tall = o["zspan"][1] - z0
        ks = [1.0] * len(zs)
        if plain and tall > 0.06 and lo < 1:
            ks = [lo + (1 - lo) * min(1.0, max(0.0, (z - z0) / tall)) ** 0.8 for z in zs]
        flat = [0.0] * (len(me.loops) * 4)
        for i, l in enumerate(me.loops):
            k = ks[l.vertex_index]
            flat[i * 4:i * 4 + 4] = (base[0] * k, base[1] * k, base[2] * k, 1.0)
        col.data.foreach_set("color", flat)
        if plain:
            me.materials.clear(); me.materials.append(paint_mat(plain))

    # -- output --
    def join(self):
        bpy.ops.object.select_all(action='DESELECT')
        for o in self.parts:
            o.select_set(True)
            bpy.context.view_layer.objects.active = o
            bpy.ops.object.convert(target='MESH')
        for o in self.parts: self._paint(o)
        for o in self.parts: o.select_set(True)
        bpy.context.view_layer.objects.active = self.parts[0]
        bpy.ops.object.join()
        o = bpy.context.object
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)  # origin back to world 0
        old = bpy.data.meshes.get(self.name)
        if old and old != o.data: old.name = self.name + "-old"   # e.g. still used by room-preview
        o.name = self.name; o.data.name = self.name
        if self.ground:
            zmin = min(v.co.z for v in o.data.vertices)
            for v in o.data.vertices: v.co.z -= zmin  # sit exactly on z = 0
        o.data.update()
        self.obj = o
        return o

    def stats(self):
        me = self.obj.data; me.calc_loop_triangles()
        xs = [v.co.x for v in me.vertices]; ys = [v.co.y for v in me.vertices]; zs = [v.co.z for v in me.vertices]
        return {"name": self.name, "tris": len(me.loop_triangles),
                "size": [round(max(xs) - min(xs), 3), round(max(ys) - min(ys), 3), round(max(zs), 3)],
                "materials": [m.name for m in me.materials]}

    def export(self):
        os.makedirs(MODELS, exist_ok=True)
        export_glb([self.obj], os.path.join(MODELS, self.name + ".glb"))

    def preview(self, elev=28, azim_deg=-35, pad=1.4, res=(1000, 1000)):
        """Render a front three-quarter view to blender/previews/<name>.png, other models hidden."""
        sc = bpy.context.scene
        for lc in bpy.context.view_layer.layer_collection.children:
            if lc.name == "Collection": continue
            lc.exclude = lc.name != self.name
        fl = bpy.data.objects.get("render_floor")
        if fl: fl.scale = (8, 8, 1)
        cam = bpy.data.objects["Camera"]
        cam.data.type = 'ORTHO'
        # camera sits in front (+Y), swung azim_deg around Z, raised by elev
        a = math.radians(90 + azim_deg); e = math.radians(elev)
        d = Vector((math.cos(a) * math.cos(e), math.sin(a) * math.cos(e), math.sin(e)))
        st = self.stats(); w, dp, h = st["size"]
        target = Vector((0, 0, h * 0.5))
        cam.location = target + d * 20
        cam.rotation_euler = (-d).to_track_quat('-Z', 'Y').to_euler()
        cam.data.clip_end = 100
        # fit the bounding box as seen by the camera
        bpy.context.view_layer.update()
        inv = cam.matrix_world.inverted()
        vs = [inv @ v.co for v in self.obj.data.vertices]
        ex = max(max(v.x for v in vs) - min(v.x for v in vs), max(v.y for v in vs) - min(v.y for v in vs))
        cx = (max(v.x for v in vs) + min(v.x for v in vs)) / 2; cy = (max(v.y for v in vs) + min(v.y for v in vs)) / 2
        cam.location = cam.matrix_world @ Vector((cx, cy, 0))
        cam.data.ortho_scale = ex * (1 + (pad - 1) * 0.5) + 0.02
        li = bpy.data.objects["Light"]
        ld = Vector((-0.5, 0.75, 1.1)).normalized()
        li.rotation_euler = (-ld).to_track_quat('-Z', 'Y').to_euler()
        sc.render.resolution_x, sc.render.resolution_y = res
        os.makedirs(PREVIEWS, exist_ok=True)
        sc.render.filepath = os.path.join(PREVIEWS, self.name + ".png")
        bpy.ops.render.render(write_still=True)
        return sc.render.filepath

    def finish(self, **pv):
        self.join(); self.export(); path = self.preview(**pv)
        r = self.stats(); r["preview"] = path
        return r
