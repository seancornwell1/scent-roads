# Shared helpers for the cozy-overhaul models. Loaded by each model script:
#   exec(open(LIB).read(), g)
# Conventions: metres, Z up in Blender, origin at the bottom centre (z = 0),
# front faces +Y in Blender (-Z in glTF), like perfume-bottle-gumdrop.
import bpy, bmesh, math, os
from mathutils import Vector

REPO = r"C:\Users\seanc\Projects\scent-roads"
MODELS = os.path.join(REPO, "assets", "custom", "models")
PREVIEWS = os.path.join(REPO, "blender", "previews")

# Cozy palette: soft, warm, pastel accents.
PAL = {
    "honey": "#E8A25C", "lightwood": "#F2C48D", "darkwood": "#A8643F", "cream": "#FBEBD3",
    "peach": "#F6D6AE", "mint": "#A6E8C6", "sage": "#8FC9A0", "pink": "#F5A7C2",
    "lilac": "#B7A2EA", "sky": "#9DD4F2", "butter": "#F6D774", "brass": "#D9A84E",
    "terracotta": "#E0806A", "leaf": "#7CC27A", "deepleaf": "#5DA864", "rose": "#EE8FA6",
    "white": "#FFF8EE", "ink": "#5B4350", "straw": "#F1D48A", "berry": "#C8608A",
}


def hexcol(h):
    h = h.lstrip('#')
    c = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    return (*[x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c], 1.0)


def mat(name, hexc, rough=0.6, metal=0.0, alpha=1.0):
    """Material named by part; hexc may be a palette key."""
    hexc = PAL.get(hexc, hexc)
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = hexcol(hexc)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    b.inputs["Alpha"].default_value = alpha
    m.surface_render_method = 'BLENDED' if alpha < 1 else 'DITHERED'
    m.use_backface_culling = True
    return m


class Model:
    """Collects parts for one model; join() makes a single multi-material mesh."""

    def __init__(self, name):
        self.name = name
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
        return self._take(o, m, bevel=bevel, segs=segs)

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

    # -- output --
    def join(self):
        bpy.ops.object.select_all(action='DESELECT')
        for o in self.parts:
            o.select_set(True)
            bpy.context.view_layer.objects.active = o
            bpy.ops.object.convert(target='MESH')
        for o in self.parts: o.select_set(True)
        bpy.context.view_layer.objects.active = self.parts[0]
        bpy.ops.object.join()
        o = bpy.context.object
        o.name = self.name; o.data.name = self.name
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
        bpy.ops.object.select_all(action='DESELECT'); self.obj.select_set(True)
        bpy.ops.export_scene.gltf(filepath=os.path.join(MODELS, self.name + ".glb"), export_format='GLB',
                                  use_selection=True, export_apply=True, export_yup=True,
                                  export_materials='EXPORT', export_cameras=False, export_lights=False,
                                  export_animations=False)

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
        cam.data.ortho_scale = max(w, dp, h) * pad + 0.02
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
