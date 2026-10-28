# Assets needed

Every placeholder or stand-in waiting for a real asset. Remove a line once the asset is in `assets/` and logged in `CREDITS.md`.

| Asset | Where it shows | Notes |
| ----- | -------------- | ----- |
| Sounds: door chime, footsteps, glass clinks, pouring, paper, crates, shop ambience | Throughout the shop (cues in `src/data/sounds.json`) | The game plays them once the files exist; until then it's silent. Fetch them with `npm run sounds` (CC0 from Freesound). That needs `FREESOUND_API_KEY` and network access to `freesound.org` and `cdn.freesound.org`. |
| Perfume bottles (flacons, atomizers) | Shelves, display tables, the organ, the app icon | Using Grab3D potion bottles as stand-ins. Grab3D has no perfume bottle; candidates: a CC BY model (credit welcome), or ask Grab3D via its requests page. |
| Painted world map | Back room, Map tab | Placeholder box; region cards list the regions for now. Nothing in the approved packs. |
| Glass display case | Display cases for signature perfumes | Grab3D has none; the potion shelf and bookshelf stand in. |
| Newspaper masthead and illustrations | News panel | Text only for now. Nothing in the approved packs. |
| Sitting animation | Customers on seating | The character kit has idle, walk, run, wave and jump only, so customers don't sit yet. |
| Her formula book and letter (paper, handwriting font) | Book panel, story intro, page cards | Text only for now: smudged amounts are plain italic words, not drawn effects. A handwriting font (OFL) and paper texture would suit it. |
| On-screen joystick (base and knob) | Bottom right of the shop | A plain labelled box for now. Candidate: Kenney's "Onscreen Controls" pack (CC0, https://kenney.nl/assets/onscreen-controls), waiting for Sean's OK. |
