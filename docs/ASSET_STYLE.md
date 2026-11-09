# Asset style guide (Nov 9, 2026)

How custom models for Scentshop Tale should look and be built, so that anything made in Blender (by Sean, or by Claude through a Blender bridge) sits naturally beside the Grab3D kit already in the shop. Numbers below were measured from the kit in `assets/grab3d/models/` and the scene setup in `src/scene/shopScene.ts`.

Custom models are files like any other asset: they live in `assets/`, are loaded through `src/scene/assets.ts`, and are logged in `CREDITS.md`. The rule against drawing art in code still holds: geometry is modelled in Blender and exported, never built from primitives in the game's TypeScript.

## 1. The look in one paragraph

Cozy, soft, toy-like low poly. Rounded edges everywhere (no knife-sharp corners), slightly chunky proportions (about 10–20 % thicker than real life), and clean shapes that read at a glance from far above. Colour does the work, not texture detail: warm honey wood, cream walls, a peach floor, and small pastel accents (mint, lilac, pink, sky blue, butter yellow). Surfaces are matte to satin; only glass and the odd brass fitting shine. Nothing grimy, worn or realistic.

## 2. How it will be seen

- **Camera:** orthographic and isometric, looking down from (10, 10, 10), so every object is seen from about 35° above, from its front-left and front-right. The back and underside are almost never seen. Spend detail on the top and the two front faces.
- **Zoom:** the game opens at zoom 3 (`shop.json` `defaultZoom`); a 0.2 m bottle is then about 20–30 px tall on an iPhone. Silhouette and colour matter far more than fine detail. Anything under about 5 mm disappears.
- **Light:** a warm hemisphere light, a warm sun from (6, 12, 8), and a soft room environment map at 0.7, through Neutral tone mapping. Don't bake lighting or shadows into textures; a little ambient occlusion in the base colour is fine.

## 3. Palette

These are approximate colours sampled by eye from the current kit. Match them rather than introducing new hues.

| Use | Colour |
| --- | --- |
| Honey wood (shelves, counter tops) | `#E8A25C` |
| Dark wood (counter panels) | `#9A5636` |
| Cream (walls, labels, paper) | `#FBEBD3` |
| Peach (floor) | `#F6D6AE` |
| Brick accent | `#E0806A` |
| Mint | `#A6E8C6` |
| Lilac | `#B7A2EA` |
| Pink | `#F5A7C2` |
| Sky | `#9DD4F2` |
| Butter | `#F6D774` |
| Brass | `#D9A84E` (metallic 1, roughness 0.35) |
| Ink (outlines in UI only, never on models) | `#4A3340` |

Keep saturation gentle: pastels, not neon. A model may use one or two accents, not all of them.

## 4. Technical rules

| Rule | Value |
| --- | --- |
| Format | glTF 2.0 binary, `.glb`, one model per file |
| Units and axes | metres, +Y up (Blender's exporter does this: keep "+Y Up" ticked) |
| Origin | bottom centre of the object, at y = 0, so it stands on whatever surface it's placed on |
| Facing | front faces −Z in Blender's export (+Y forward in Blender), matching the kit |
| Transforms | applied before export (Ctrl+A, All Transforms); scale 1, no rotation |
| Size | real-world size, a touch chunky (see the sizes below) |
| Triangles | small props (bottles, jars) ≤ 3,000; furniture ≤ 12,000; the whole model under about 20,000. The kit's potion bottle is about 11,700, which is more than needed |
| Materials | Principled BSDF only (it exports cleanly as glTF PBR); at most 4 materials per model; name them by part (`glass`, `liquid`, `cap`, `label`) |
| Textures | prefer flat material colours with no texture at all. If a texture is needed: PNG or JPEG, power of two, at most 512 × 512 (`npx gltf-transform resize` if bigger) |
| Glass | Alpha Blend material, base colour tinted very slightly, alpha 0.25–0.4, roughness 0.05–0.15, double-sided off. No transmission or refraction (too costly on phones) |
| Liquid | a separate solid mesh inside the glass, slightly smaller, opaque, roughness 0.3 |
| Shading | Smooth shading with auto smooth (or weighted normals) so bevels look soft; no flat-shaded facets |
| Naming | file `kebab-case.glb`; mesh objects `<file>_<part>` like the kit (`perfume-bottle-round_glass`) |
| Folder | `assets/custom/models/` for models made for this game |

### Reference sizes (metres)

| Object | Height | Notes |
| --- | --- | --- |
| Perfume bottle | 0.12–0.18 | a touch larger than a real 50 ml bottle so it reads on shelves |
| Stock bottle on the rack | 0.15–0.2 | the kit's potion bottle is 0.2 |
| Counter | 0.95–1.05 | |
| Table | 0.75 | |
| Shelf unit | 1.6–1.9 | |
| Door | 2.1 | |
| Player character | about 1.0 | chibi proportions: big head |

## 5. Modelling habits

1. Block out with simple primitives at the right size, check it beside the kit (append a kit `.glb` into the scene for scale), then refine.
2. Bevel every hard edge (width about 2–4 % of the object's size, 2–3 segments). This is the single most important thing for the cozy look.
3. Exaggerate the features that identify an object: a bottle's cap and shoulder, a jar's lid. Drop anything that can't be seen at 25 px.
4. Keep cylinders to 16–24 sides, spheres to about 16 × 12.
5. For anything that will show a label or a player's colours, make it a separate material with a clear name, UV-unwrapped to fill the 0–1 square, so the game can swap its colour or texture.
6. Export with: glTF Binary; Include Selected Objects; Apply Modifiers; +Y Up; Materials Export; no cameras, lights or animation (unless the model needs it).

## 6. Checking a model before it goes in

- `npx @gltf-transform/cli inspect model.glb`: check the bounding box (height, and min y = 0), triangle count and texture sizes.
- Put it in the game and look at it at zoom 3 and zoom 4.5 in both rooms. Does it read? Does it match the colours next to it?
- Log it in `CREDITS.md` (made for this game, by whom, license) and remove its placeholder from `ASSETS_NEEDED.md`.

## 7. First asset: the house perfume bottle

The first custom model replaces the potion-bottle stand-in (`backroom.json` `rack.bottle`, and the bottles on display shelves later).

- **File:** `assets/custom/models/perfume-bottle-round.glb`
- **Shape:** a short, rounded-square flacon about 0.14 m tall: a softly bevelled glass body (about 0.09 × 0.09 × 0.035 m at the shoulder, gently rounded sides), a short brass collar, and a chunky cap: a faceted sphere or a squat cylinder.
- **Parts and materials:**
  - `glass`: Alpha Blend glass, as above.
  - `liquid`: opaque and fills about 80 % of the body. Its colour is set in code per perfume, so name the material `liquid` and give it a neutral pale gold (`#F3D9A0`).
  - `collar`: brass.
  - `cap`: a pastel accent (lilac by default). It can be recoloured in code.
  - `label`: a thin rounded-rectangle plane on the front face, cream, UV filling 0–1 at a 4 : 5 aspect, ready for the generic or uploaded label art.
- **Budget:** about 1,500–2,500 triangles, no textures.
- **Variants later:** tall (`perfume-bottle-tall`), apothecary (`perfume-bottle-apothecary`), with the same part and material names so the code treats them alike.
