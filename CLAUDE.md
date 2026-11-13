# Hush — notes for Claude Code

A stealth game made from this repo's assets (Nov 13, 2026); the perfume-shop game that came before it is in the git history. See `README.md` for how it plays and where the code is.

- Vite + TypeScript + Three.js; portrait phones first, keyboard too. Deployed to GitHub Pages on every push (`.github/workflows/deploy.yml`, which also runs `npm test`).
- Never hard-code `/scent-roads/`: the base path comes from `BASE_PATH`; use `assetUrl` in `src/assets.ts`.
- Files in `assets/` are served from the site root. Models face south (+Z) and stand on y = 0; `rot` in `src/level.ts` is quarter turns.
- `src/level.ts` and `src/nav.ts` have no DOM and are unit-tested; keep it that way.
- New assets: log them in `CREDITS.md` (CC0 or CC BY only) and take them off `ASSET_WISHLIST.md`. Custom models follow the conventions in `blender/README.md`.
- `window.hush` is the running game, for poking at it from the console.
