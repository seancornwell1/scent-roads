# Scent Roads

A cozy perfume-house game for phones. Play it at **https://seancornwell1.github.io/scent-roads/** — on iPhone, open it in Safari and use Share → Add to Home Screen.

- Spec: [`docs/SPEC.md`](docs/SPEC.md)
- Rules for Claude Code: [`CLAUDE.md`](CLAUDE.md)
- Facts awaiting confirmation: [`docs/FACT_CHECK.md`](docs/FACT_CHECK.md)
- Assets: [`ASSETS_NEEDED.md`](ASSETS_NEEDED.md), [`CREDITS.md`](CREDITS.md)

## Development

```sh
npm install
npm run dev      # serves on your network so you can open it on a phone
npm test
npm run build
```

Every push deploys to GitHub Pages via `.github/workflows/deploy.yml`.
