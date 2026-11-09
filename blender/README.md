# Blender sources for custom models

Models made in Blender for Scentshop Tale's cozy overhaul (Nov 8, 2026). Each script rebuilds its models from scratch, exports them to `assets/custom/models/` and renders a preview into `previews/`. Everything here sits outside the served `assets/` folder.

None of these models are placed in the scene yet: the game still uses the Grab3D kit. They don't follow `docs/ASSET_STYLE.md` on purpose. Sean asked for a full cozy overhaul rather than a match to the current kit.

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
| `room-preview.py` | renders `previews/room-preview.png`, a corner of the shop built from the models (run the model scripts first) |
| `lineup.py` | renders a side-by-side contact sheet of named models |

`perfume-bottles.blend` holds the scene as last built, including the first two style studies (heart and gumdrop).

## Conventions (`lib.py`)

- Metres, Z up in Blender (Y up in the glTF), origin at the bottom centre, base exactly at height 0. The exceptions are wall-hung pieces built with `Model(name, ground=False)`, which keep real mounting heights (`wall-shelf`).
- The front faces +Y in Blender, which is −Z in the glTF, the same as the gumdrop. The game will need to turn each model to face the room.
- Wall panels are 2 m wide, 3 m tall and 0.2 m thick, centred on their wall line with the room side at +Y. Floor tiles are 2 × 2 m and 0.1 m thick. Both match `shop.json`.
- Each model is one mesh with a few flat-colour Principled materials, named by part (`counter_top`, `rack_shelf`…). There are no textures.
- The perfume bottles and the stock bottle share the material names `glass`, `liquid`, `collar`/`cap` and `label`, so code can tint the liquid and cap, and put label art on `label` (its UVs fill 0–1).
- Palette: the `PAL` table in `lib.py` (honey and light woods, cream, sage, and pink, mint, lilac, sky and butter accents).
