# Game content

All game content lives here as JSON. Code never hard-codes materials, families, accords or tuning. `src/game/content.ts` loads these files, and `validateContent` checks them. That check runs in the tests and when the app starts. Types are in `src/game/types.ts`.

## Verification

Every material and accord has:

- `verified` — `true` only when every fact in the entry is confirmed (from the course notes or by Sean).
- `check` — the fields still to confirm, as dot paths (`"origin.region"`, `"layer"`). It must be empty exactly when `verified` is `true`.

Every unverified entry must be listed in `docs/FACT_CHECK.md` (a test enforces this). The UI marks unverified materials so they are never presented as certain.

## `families.json`

The olfactive families materials are sorted by on the organ, in display order.

| Field | Type | Meaning |
| ----- | ---- | ------- |
| `id` | string | Stable id, referenced by materials and accords |
| `name` | string | Display name |
| `description` | string | One plain-language line |

## `materials.json`

| Field | Type | Meaning |
| ----- | ---- | ------- |
| `id` | string | Stable id, kebab-case. Saves store this, so never rename it. |
| `name` | string | Display name |
| `type` | `"natural"` \| `"synthetic"` | Natural extract or lab-made aroma chemical |
| `family` | family id | Olfactive family |
| `layer` | `"top"` \| `"heart"` \| `"base"` | Where it sits in the pyramid |
| `volatility` | `"very high"` … `"very low"` | How fast it evaporates, in words |
| `character` | string | What it smells like, in plain language. Sean's own descriptors where the course has them. |
| `behaviour` | string? | How it behaves in blends, from the formula log |
| `origin` | object | Naturals: `plant`, `region`, `method`. Synthetics: `note`. A region with no fixed answer is omitted. |
| `course` | object | `mission`: course mission that introduces it (`"01"`…), or `null` if outside the roadmap. `onBench`: in Sean's current inventory. |
| `verified`, `check` | | See above |
| `model.strength` | 1–10 | Game tuning, not a fact: odour impact. Each step doubles impact (see `model.json`). |
| `model.halfLifeHours` | number > 0 | Game tuning, not a fact: hours until the material's intensity halves |

## `accords.json`

An accord is recognized when the formula meets every one of its `requires` conditions.

| Field | Type | Meaning |
| ----- | ---- | ------- |
| `id`, `name`, `description` | string | |
| `course.mission` | string \| null | Course mission that teaches it |
| `verified`, `check` | | See above. The structure (which materials) is the fact; the percentages are tuning. |
| `requires` | condition[] | All must hold |

A condition selects exactly one of `materials` (list of material ids, any of which count), `family` (family id) or `layer`. It then bounds their combined share of the formula's total parts, in percent, with `min` and/or `max`.

```json
{ "materials": ["labdanum"], "min": 10 }
{ "family": "citrus", "min": 40 }
{ "layer": "base", "max": 15 }
```

## `model.json`

Tuning for the evaporation model in `src/game/evaporation.ts`:

`intensity = parts × strengthBase^(strength − strengthPivot) × 0.5^(hours / halfLifeHours)`

| Field | Meaning |
| ----- | ------- |
| `stages` | The moments a perfume is judged: `id`, `name`, `hours` after application, `label`. Increasing hours. They mirror the course's blotter checks at 5 minutes, 1 hour and later. |
| `strengthBase`, `strengthPivot` | How strength turns into impact. With 2 and 5, strength 5 is ×1 and each step up doubles it. |
| `loudness` | Labels for how loud a stage is relative to the opening, highest `min` first |
| `testStockGrams` | Grams of every material in a new save. Testing only; the world map replaces it in step 4. |

`src/game/evaporation.test.ts` encodes observations from Sean's formula log. Run `npm test` after changing any tuning.
