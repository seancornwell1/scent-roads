# Blender sources for custom models

Models made in Blender for Scentshop Tale's cozy overhaul (Nov 8, 2026). Each script rebuilds its models from scratch, exports them to `assets/custom/models/` and renders a preview into `previews/`. Everything here sits outside the served `assets/` folder.

Since Nov 9 the game uses them in place of the Grab3D kit (`src/data/shop.json`, `backroom.json`, `furniture.json`); the Grab3D files stay in `assets/grab3d/` for the pieces not yet remade. On Nov 10 the rooms took a warm dark-wood look (see the note at the top of `docs/SPEC.md`): `lib.py` got a warm palette and painted vertex colours, every model was exported again, the shell was rebuilt and `shop-warm.py` added new pieces. `docs/ASSET_STYLE.md` is revised to describe that look.

## Running a script

Run the scripts inside Blender (5.2): paste `exec(open(r"<repo>\blender\<script>.py").read(), {"__name__": "__main__"})` into the Python console, or send it through the Blender MCP bridge. The paths in `lib.py` point at `C:\Users\seanc\Projects\scent-roads`; change `REPO` there if the repo moves.

| Script | Models |
| ------ | ------ |
| `perfume-bottle-gumdrop.py` | `perfume-bottle-gumdrop` (standalone, made before `lib.py`) |
| `perfume-bottles.py` | `perfume-bottle-tall`, `-moon`, `-atomizer`, `-bell` |
| `perfume-organ.py` | `perfume-organ` |
| `shop-counter.py` | `shop-counter` |
| `supplies-rack.py` | `supplies-rack` (shelf tops match `backroom.json` `rack.levels`) |
| `backroom-office.py` | `writing-desk`, `desk-chair`, `laptop` |
| `display-case.py` | `display-case` |
| `props.py` | `potted-plant`, `wooden-crate`, `stock-bottle`, `shop-rug` |
| `room-shell.py` | the rooms' shell: `floor-parquet` (herringbone), `floor-planks`, `floor-kerb`, `floor-kerb-corner`, `wall-plain`, `wall-window`, `wall-doorway`, `wall-corner`, `door-arched` |
| `shop-warm.py` | furniture and decoration for the warm look (Nov 10): `shelf-tall-a`, `shelf-tall-b`, `sideboard`, `display-table`, `rug-runner`, `rug-round`, `wall-sconce`, `shop-sign`, `door-curtain`, `plant-leafy`, `chest-armillary`, `ivy-window`. Set `ONLY` (a list of names) in the globals to build some of them |
| `cafe.py` | the coffee corner that arrives later in the game (Nov 10): `coffee-bar`, `cafe-table`, `cafe-chair`, `menu-board`, `coffee-sacks`. `SEAT_H` in the script is the chair's seat height, the `height` of a seat in `shop.json`. Set `ONLY` to build some of them |
| `shopfront.py` | `wall-shopfront`, `wall-shelf` |
| `decor.py` | `floor-lamp`, `wall-clock`, `round-table`, `armchair`, `bookshelf` |
| `furniture.py` | the buyable furniture: `cushion-bench`, `bar-stool`, `rocking-chair`, `sofa`, `snake-plant`, `fern`, `table-lamp`, `candle-cluster`, `star-lantern`, `flower-vase`, `globe`, `standing-mirror`, `vanity-table` |
| `character-parts.py` | character kit parts `hat_beret`, `hat_flowercrown`, `handL_perfume` (to `assets/custom/characters/`, rigidly skinned to the kit skeleton) |
| `ui-icons.py` | the counter's interface pictures in `assets/custom/ui/`: a bottle per radar spoke, an unknown bottle, stars, coin, sparkle |
| `character-parts-2.py` | character kit parts `top_apron` (built on the kit's T-shirt, keeping its weights and fit shapes), `hair_fluffy` (+ `__short`), `face_heartglasses`, `shoes_clogs` |
| `characters-chibi.py` (with `chibi_kit.py`) | character style test #3: three static, unrigged townspeople (`chibi-shopkeeper`, `chibi-customer`, `chibi-girl`) in a stylised low-poly chibi look, coloured with painted vertex colours and no textures. Renders `previews/characters-chibi*.png` only; nothing is exported to the game yet. `characters-test.py` and `characters-cozy.py` are the two earlier tests |
| `characters-kit.py` (with `chibi_kit.py`, `chibi_shapes.py`, `chibi_rig.py`, `chibi_parts.py`) | the chibi character kit in `assets/custom/chibi/`: `skeleton.glb` (19 bones named like the Grab3D kit), `animations.glb` (idle, walk, run, wave, jump, sit), 30 swappable parts in `parts/` (body with chubby and slim shapes, three heads, five hair styles, six tops, three bottoms, three pairs of shoes, two hats, two pairs of glasses, a moustache, a beard, three held items), a thumbnail per part and per body shape in `thumbs/` and `manifest.json` in the Character Mixer manifest format. Colours are painted vertex colours; skin, hair, eyes and each part's main colour are tinted through the material colour. Run with the globals `EXPORT` (write the files), `THUMBS` (render the creator thumbnails), `SHOOT` (render `previews/chibi-kit.png` and `chibi-kit-animations.png`) and `ONLY` (part ids to rebuild). The game builds every character from this kit (`src/data/character.json`) |
| `portraits-test.py` (run after `characters-kit.py` in the same globals, with `PORTRAITS` set) | a test of conversation portraits, not used by the game: expression faces (neutral, happy, delighted, surprised, thoughtful, worried, annoyed, sad) painted with the kit face recipe, worn by a cast member from `story.json` or `clients.json`, posed and rendered as 512 px busts on a clear background to `previews/portraits-test/`; `previews/chibi-portraits-test.png` is those laid out on one sheet. Nothing is exported to `assets/`. |
| `room-preview.py` | renders `previews/room-preview.png`, a corner of the shop built from the models (run the model scripts first) |
| `bench-mockup.py` | a mock-up, not used by the game (Nov 12): a perfumer's bench seen from above (a stepped rack of eight dropper bottles with name plates, a beaker on a scale, the pipette in hand, smelling strips, a flacon), rendered at phone size to `previews/bench-mockup.png` with its own camera and lamp. It also writes `docs/mockups/bench-points.js`, where the bottles, plates and scale display are in the picture, for `docs/mockups/bench.html` to set labels on. Exports nothing. `RES`, `ELEV`, `DIST`, `TARGET` and `LAMP` can be set in the globals |
| `mockup-thumbs.py` | a mock-up, not used by the game (Nov 12): renders each buyable furniture model alone on a clear background to `docs/mockups/thumbs/`, for the Shop panel mock-up (run the model scripts first) |
| `lineup.py` | renders a side-by-side contact sheet of named models |

`perfume-bottles.blend` holds the scene as last built, including the first two style studies (heart and gumdrop).

## Conventions (`lib.py`)

- Metres, Z up in Blender (Y up in the glTF), origin at the bottom centre, base exactly at height 0. The exceptions are wall-hung pieces built with `Model(name, ground=False)`, which keep real mounting heights (`wall-shelf`).
- Models are built with the front facing +Y in Blender. `export_glb` turns them 180° on export, so in the glTF the front faces +Z, the same as the Grab3D kit. The rotations in `shop.json` and `backroom.json` work for both.
- Wall panels are 2 m wide, 3 m tall and 0.2 m thick, centred on their wall line with the room side at +Y. Floor tiles are 2 × 2 m and 0.1 m thick. Both match `shop.json`.
- Each model is one mesh. Since Nov 10 its plain parts share two materials, `paint` (matte) and `paint-gloss`, and take their colour from a painted vertex-colour attribute (`Col`): the part's colour with a soft gradient and darker creases painted in. Parts that must stay their own material keep it: glass, anything that glows, metal, and the named parts below. There are no textures.
- The perfume bottles and the stock bottle share the material names `glass`, `liquid`, `collar`/`cap` and `label`, so code can tint the liquid and cap, and put label art on `label` (its UVs fill 0–1).
- Palette: the `PAL` table in `lib.py`. Since Nov 10 it is the warm look: walnut and mahogany woods, cream plaster, parquet, burgundy and wine, forest green, gold and brass. The pastel names of Nov 9 (mint, pink, lilac, sky, butter…) are still there, pointed at warm colours, so the earlier scripts build in the new look unchanged.
