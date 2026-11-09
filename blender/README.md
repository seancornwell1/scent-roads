# Blender sources for custom models

Models made in Blender for Scentshop Tale's cozy overhaul (Nov 8, 2026). Each script rebuilds its models from scratch, exports them to `assets/custom/models/` and renders a preview into `previews/`. Everything here sits outside the served `assets/` folder.

Since Nov 9 the game uses them in place of the Grab3D kit (`src/data/shop.json`, `backroom.json`, `furniture.json`); the Grab3D files stay in `assets/grab3d/` for the pieces not yet remade. They don't follow `docs/ASSET_STYLE.md` on purpose. Sean asked for a full cozy overhaul rather than a match to the current kit.

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
| `room-shell.py` | `floor-planks`, `wall-plain`, `wall-window`, `wall-doorway`, `door-arched` |
| `shopfront.py` | `wall-shopfront`, `wall-shelf` |
| `decor.py` | `floor-lamp`, `wall-clock`, `round-table`, `armchair`, `bookshelf` |
| `furniture.py` | the buyable furniture: `cushion-bench`, `bar-stool`, `rocking-chair`, `sofa`, `snake-plant`, `fern`, `table-lamp`, `candle-cluster`, `star-lantern`, `flower-vase`, `globe`, `standing-mirror`, `vanity-table` |
| `character-parts.py` | character kit parts `hat_beret`, `hat_flowercrown`, `handL_perfume` (to `assets/custom/characters/`, rigidly skinned to the kit skeleton) |
| `ui-icons.py` | the counter's interface pictures in `assets/custom/ui/`: a bottle per radar spoke, an unknown bottle, stars, coin, sparkle |
| `room-preview.py` | renders `previews/room-preview.png`, a corner of the shop built from the models (run the model scripts first) |
| `lineup.py` | renders a side-by-side contact sheet of named models |

`perfume-bottles.blend` holds the scene as last built, including the first two style studies (heart and gumdrop).

## Conventions (`lib.py`)

- Metres, Z up in Blender (Y up in the glTF), origin at the bottom centre, base exactly at height 0. The exceptions are wall-hung pieces built with `Model(name, ground=False)`, which keep real mounting heights (`wall-shelf`).
- Models are built with the front facing +Y in Blender. `export_glb` turns them 180° on export, so in the glTF the front faces +Z, the same as the Grab3D kit. The rotations in `shop.json` and `backroom.json` work for both.
- Wall panels are 2 m wide, 3 m tall and 0.2 m thick, centred on their wall line with the room side at +Y. Floor tiles are 2 × 2 m and 0.1 m thick. Both match `shop.json`.
- Each model is one mesh with a few flat-colour Principled materials, named by part (`counter_top`, `rack_shelf`…). There are no textures.
- The perfume bottles and the stock bottle share the material names `glass`, `liquid`, `collar`/`cap` and `label`, so code can tint the liquid and cap, and put label art on `label` (its UVs fill 0–1).
- Palette: the `PAL` table in `lib.py` (honey and light woods, cream, sage, and pink, mint, lilac, sky and butter accents).
