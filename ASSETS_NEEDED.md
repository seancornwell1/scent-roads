# Assets needed

Every placeholder or stand-in waiting for a real asset. Remove a line once the asset is in `assets/` and logged in `CREDITS.md`.

| Asset | Where it shows | Notes |
| ----- | -------------- | ----- |
| Sounds: door chime, footsteps, glass clinks, pouring, paper, crates, shop ambience | Throughout the shop (cues in `src/data/sounds.json`) | The game plays them once the files exist; until then it's silent. Fetch them with `npm run sounds` (CC0 from Freesound). That needs `FREESOUND_API_KEY` and network access to `freesound.org` and `cdn.freesound.org`. |
| Perfume bottles (flacons, atomizers) | Shelves, display tables, the organ, the app icon | Using Grab3D potion bottles as stand-ins. Custom bottles are made (`assets/custom/models/perfume-bottle-gumdrop.glb`, `-tall`, `-moon`, `-atomizer`, `-bell`), now in the game (Nov 9). Grab3D has no perfume bottle; candidates: a CC BY model (credit welcome), or ask Grab3D via its requests page. |
| Painted world map | Back room, Map tab | Placeholder box; region cards list the regions for now. Nothing in the approved packs. |
| Glass display case | Display pieces for house perfumes | Grab3D has none; the potion shelf and bookshelf stand in. A custom `display-case.glb` and `wall-shelf.glb` are made (cozy overhaul, `blender/`), now in the game (Nov 9). |
| Newspaper masthead and illustrations | News panel | Text only for now. Nothing in the approved packs. |
| Customers sitting | Customers on seating | The chibi kit now has a `sit` clip (`assets/custom/chibi/animations.glb`; `seat` in the manifest is the seat height it was posed for), but the game doesn't seat anyone yet: customers still stand. |
| Her formula book and letter (paper, handwriting font) | Book panel, story intro, page cards | Text only for now: smudged amounts are plain italic words, not drawn effects. A handwriting font (OFL) and paper texture would suit it. |
| Bottle labels: plain paper, botanical, apothecary, art deco, watercolour, night sky | House perfumes (`labels` in `src/data/house.json`) | Plain labelled boxes for now; set each label's `image` once its art is in `assets/`. Players can already upload their own. Needs a CC0 or CC BY source in one style. |
| House perfume bottles on the shelves | The shop's shelves, showing what's for sale | Not shown in the scene yet; would use the perfume bottle models above. |
| Desk, laptop and desk chair | Back room | Plain labelled boxes for now. Grab3D has none; candidates need Sean's OK (e.g. Kenney's CC0 Furniture Kit, if its style fits). Custom `writing-desk.glb`, `laptop.glb` and `desk-chair.glb` are made (cozy overhaul, `blender/`), now in the game (Nov 9). |
| A proper shop front (big display window, glazed door) | The shop's street wall | Three of Grab3D's small wall windows stand in between the two doors. A custom `wall-shopfront.glb` (big window with a window seat) is made (cozy overhaul), now in the game (Nov 9). |
| An empty rack or shelf for supplies | Back room rack | Grab3D's shelf unit has books and baskets built in; supply bottles (potion bottles, standing in) sit at the front of each shelf and on top. A custom empty `supplies-rack.glb` matching `rack.levels` and a `stock-bottle.glb` are made (cozy overhaul), now in the game (Nov 9). |
| Accord discovery reward art (a burst or sparkle effect) and its sound | The counter and test bench, when a mix first hits an accord | For now a large text card with the accord's spokes lit on the radar; the `accord` sound cue in `src/data/sounds.json` has no file yet. Candidate: a Kenney CC0 particle pack, waiting for Sean's OK. |
