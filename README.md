# Hush

A tiny midnight heist. The shop is shut, the bottles are not yours, and the watchmen have lamps.

Play: https://seancornwell1.github.io/scent-roads/

- Drag anywhere to move: a little to creep, far to run. Running is loud, and watchmen come to look.
- Stay out of the lamp light. Tall furniture hides you; low furniture doesn't.
- Sit down somewhere while nobody is watching and you're just someone having a sit.
- Take enough bottles and the door opens. Leave, or get greedy. Each night is bigger.
- Keys: WASD or arrows, Shift to creep, Space to sit.

## Code

Vite + TypeScript + Three.js, deployed to GitHub Pages on every push.

- `src/level.ts` lays out a night's room from a seed; `src/nav.ts` is path-finding and sight lines (both unit-tested).
- `src/game.ts` is the 3D scene, the sneak, the watchmen and the rules; `src/kit.ts` builds people from the chibi kit.
- `src/main.ts` and `src/style.css` are the screens and controls.
- Models and people are in `assets/custom/` (made in Blender; sources in `blender/`). `ASSET_WISHLIST.md` lists what would make it better. Everything is credited in `CREDITS.md`.

`npm run dev`, `npm test`, `npm run build`.
