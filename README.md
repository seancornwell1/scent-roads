# Scent Roads

A cozy perfume-house game for phones. Mobile-first web app (installable as a PWA), built with Vite + TypeScript.

## Getting started

```sh
npm install
npm run dev      # serves on your LAN so you can open it on a phone
```

## Scripts

| Command             | What it does                    |
| ------------------- | ------------------------------- |
| `npm run dev`       | Dev server with hot reload      |
| `npm run build`     | Typecheck and build to `dist/`  |
| `npm run preview`   | Serve the production build      |
| `npm run typecheck` | TypeScript only                 |
| `npm test`          | Run unit tests (Vitest)         |

## Layout

- `src/game/` — game logic, kept free of DOM code so it is easy to test
- `src/main.ts` — UI entry point
- `public/` — manifest and icons
