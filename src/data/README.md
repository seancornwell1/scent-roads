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
| `moods` | string[] | Moods the family lends a perfume. Not used in scoring since Direction change #2; kept for writing briefs and hints |

## `materials.json`

| Field | Type | Meaning |
| ----- | ---- | ------- |
| `id` | string | Stable id, kebab-case. Saves store this, so never rename it. |
| `name` | string | Display name |
| `type` | `"natural"` \| `"synthetic"` | Natural extract or lab-made aroma chemical |
| `family` | family id | Olfactive family |
| `subfamily` | string | A finer description within the family (`rose`, `powdery`, `smoky wood`) |
| `layer` | `"top"` \| `"heart"` \| `"base"` | Where it sits in the pyramid |
| `volatility` | `"very high"` … `"very low"` | How fast it evaporates, in words |
| `character` | string | What it smells like, in standard perfumery terms (Sean's personal notes stay in `docs/COURSE.md`) |
| `behaviour` | string? | How perfumers use it and how it behaves in a blend |
| `origin` | object | Naturals: `plant`, `region`, `method`. Synthetics: `note`. A region with no fixed answer is omitted. |
| `course` | object | `mission`: course mission that introduces it (`"01"`…), or `null` if outside the roadmap. `onBench`: in Sean's real inventory (reference only; the game unlocks materials through `unlocks.json`). |
| `verified`, `check` | | See above |
| `model.strength` | 1–10 | Game tuning, not a fact: odour impact. Each step doubles impact (see `model.json`). |
| `model.halfLifeHours` | number > 0 | Game tuning, not a fact: hours until the material's intensity halves |
| `ref` | object | Reference numbers from public sources, with their own `verified` and `check` (Phase C): `year` (when a synthetic came into use, or the era a natural was in use by; before 1500 shows as antiquity), `tenacityHours` (time on a smelling strip), `dilution` (100, 10 or 1: the strength it's usually worked at), `ifraLimit` (maximum percent in a finished fine fragrance, IFRA category 4, or `null` if unrestricted), `costPerKg` (rough euros) |

After editing materials, run `npm run factcheck` to regenerate the materials tables in `docs/FACT_CHECK.md`; a test fails if an unverified material is missing from them.

## `accords.json`

An accord is recognized when the formula meets every one of its `requires` conditions.

| Field | Type | Meaning |
| ----- | ---- | ------- |
| `id`, `name`, `description` | string | |
| `course.mission` | string \| null | Course mission that teaches it |
| `verified`, `check` | | See above. The structure (which materials) is the fact; the percentages are tuning. |
| `lesson` | string | Her lesson on the accord, shown in the book |
| `example` | object | An example to try at the organ: `parts`, and `dilutions` for materials that must be diluted (to stay within safety limits) |
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
| `wearableParts` | Parts an early brief's target totals (10); later briefs total ten times that (100). What your own perfumes may total comes from your rank (`ranks.json`). |
| `wearableConcentration` | Percent of concentrate in a finished, wearable perfume (the rest is alcohol): 10, from the course. Safety limits are checked against the finished perfume. |
| `overdose` | Materials usually worked at `dilution`% (1, the very strong ones) smell harsh above `maxPercent` of a formula, which costs `penalty` of the score and draws a "harsh" remark. Dilute them. |
| `stages` | The moments a perfume is judged: `id`, `name`, `hours` after application, `label`. Increasing hours. They mirror the course's blotter checks at 5 minutes, 1 hour and later. |
| `strengthBase`, `strengthPivot` | How strength turns into impact. With 2 and 5, strength 5 is ×1 and each step up doubles it. |
| `loudness` | Labels for how loud a stage is relative to the opening, highest `min` first |

`src/game/evaporation.test.ts` encodes observations from Sean's formula log. Run `npm test` after changing any tuning.

## `shop.json`

The shop interior for the 3D scene (`src/scene/shopScene.ts`) and pathfinding (`src/game/pathfinding.ts`). Floor coordinates are `[x, z]` in metres, centred on the room. The camera looks in from the front-right corner, so the visible walls are the left wall (`x = -width/2`) and the back wall (`z = -depth/2`). Model paths are relative to `assets/`.

| Field | Meaning |
| ----- | ------- |
| `room` | `width` (x), `depth` (z), `wallHeight`, in metres |
| `floorColor` | Colour of the plane under the floor tiles (shows only past the tiles' edges) |
| `floorTile` | Optional `{ model, size, height }`: a square floor model in metres, repeated across the room and sunk by `height` so its top is at floor level |
| `camera` | `focus`: `[x, z]` the view starts on (the spawn point). `defaultZoom`, `minZoom`, `maxZoom`: zoom 1 fits the whole room across the screen; the game opens close in (3.4) and follows you; players pinch between min and max and drag to pan. |
| `spawn` | Where the player starts, and where they stand while dressing in the character creator (keep it on open floor) |
| `walkSpeed` | Metres per second |
| `playerRadius` | How close the player may get to walls and fixtures |
| `gridStep` | Pathfinding grid size in metres |
| `walls` | `panels`: panel kind → model. `back`: panel kinds left to right along the back wall; `left`: back to front along the left wall. Panels are 2 m wide, so these must cover the room exactly. |
| `fixtures` | Furniture you walk around or use, below |
| `decor` | Models only for looks, below |
| `zones` | Marked floor areas, below |
| `customers` | `entrance` where customers come in, `queue` spots at the counter (front first), their `walkSpeed` |
| `crates` | Arrived crates: `model`, the `spots` they stand on by the back-room door, and `stackHeights` (to stack one on top) |
| `surfaces` | Table and counter tops for small decor: `id`, `label`, `position`, `y` (height) |

Each fixture:

| Field | Meaning |
| ----- | ------- |
| `id` | Stable id |
| `label` | Text shown over it in the scene, or `null` |
| `model` | Model path, or `null` for a labelled placeholder box |
| `position` | `[x, z]` of its centre on the floor |
| `rotation` | Degrees around the vertical axis |
| `size` | World-space footprint `[width, height, depth]` in metres, for walking and tapping (swap width and depth when rotated 90°) |
| `blocks` | Whether the player has to walk around it |
| `interact` | `null`, or `{ "action", "standAt" }`: tapping it walks the player to `standAt`, then runs `action` (`organ` opens the composing desk; `back-room` opens the back room) |

Each decor item: `model`, `position` `[x, z]`, `y` (height, e.g. a table top) and `rotation` in degrees.

Each zone:

| Field | Meaning |
| ----- | ------- |
| `id`, `label` | |
| `kind` | `customers`: an invisible area where customers stand around. `upgrade`: a floor spot where bought furniture can be placed. |
| `rect` | `[centre x, centre z, width, depth]` |

`validateShop` (run in the tests and at start-up) checks that everything is inside the room, the walls cover it, and every `standAt`, zone centre and the spawn are reachable.

## `character.json`

Options for the player's character and for customers, built from the Grab3D Character Mixer kit (`assets/grab3d/characters/manifest.json`, which lists every part, palette, body fit and animation).

| Field | Meaning |
| ----- | ------- |
| `kit`, `style` | Manifest path under `assets/` and which style in it to use (`cozy`) |
| `slots` | The creator's pages, in order: `id` (a kit slot, or `body` for the body shape), `label`, `optional` (offers "None") |
| `allowedParts` | Slot → part ids offered in the creator and used for customers. Leave out parts that don't suit a perfume shop. |
| `colors` | Colour pickers: `id` (`skin`, `hair`, `eyes`, or a clothing slot whose main colour it sets), `label`, `palette` (a kit palette), `tab` (the creator page that shows it) |
| `customers` | `count` standing in the shop; `optionalChance` that a customer wears an optional part |

A saved look (`character` in the save) is `{ fit, parts: { slot: partId }, colors: { id: "#hex" } }`. `src/game/character.test.ts` checks every allowed part exists in the kit, in the right slot, and that its file is downloaded.

## `unlocks.json`

How the player gains materials. `src/game/unlocks.ts`; a test checks every material is unlocked exactly once.

| Field | Meaning |
| ----- | ------- |
| `sources` | `natural` and `synthetic`: a name and a plain explanation of where they'll come from (grown on the map, or ordered from the catalogue) |
| `tiers` | In order: `id`, `name`, `reputation` needed, `teaches` (one line), `materials` (ids). Tier 0 is her bench; since Phase C the tiers follow perfumery's history (old waters and resins, the 19th-century garden, woods and roots, the first molecules, aldehydes and chypres, mid-century, the modern palette, newer naturals), and a test checks each tier is roughly no older than the one before. |

A material may instead be given by the story (`gives` in `story.json`, like vanillin in week 1); the test counts those as unlocked.

## `clients.json`

Customers, briefs and how perfumes are judged. Logic in `src/game/customers.ts` (visits), `src/game/scoring.ts` (judging) and `src/game/clients.ts` (types and validation).

| Field | Meaning |
| ----- | ------- |
| `timing` | `arrivalEveryRealMinutes`, `maxInShop`, `reviewAfterGameHours` (how long a perfume is worn before the review), `regularReturnsAfterGameHours`, `browseSeconds` `[min, max]`, `regularChance` (that an arrival is a regular who's due), `maxRegularsInShop` |
| `scoring` | `difficulty` (`cozy` now; `realistic` later) and per-difficulty `stars`: the closeness needed for 2 and 3 stars. `weights` of the stages, strength and longevity in the closeness. `tolerance`: family-share differences smaller than this aren't mentioned. `longevityFadeAt` (fraction of the opening's intensity that counts as faded) and `longevityMaxHours` |
| `economy` | `reputationForStars` (change for 1, 2 and 3 stars), `payForStars` (share of the brief's pay the customer hands over for 1, 2 and 3 stars: nothing for one star, so a poor perfume only costs its materials) and `threeStarBonus` (share of the brief's pay added when a 3-star review comes in; only 3 stars earns it) |
| `lines` | What customers say: `impression` and `stageWords` bands (`min` closeness → text), `stageNames`, `letDown`/`allGood`, `chatter`, and `feedback` (below) |
| `walkInNames` | Names for walk-in customers |
| `briefs` | The walk-in pool, below |
| `regulars` | Two or three people who come back, below |

A brief:

| Field | Meaning |
| ----- | ------- |
| `id` | Stable id |
| `memory` | What the customer asks for, as a memory |
| `hints` | Revealed one at a time when you ask about it |
| `target` | Hidden: `formula`, a reference formula in whole parts totalling `wearableParts` (10) or, for briefs that need materials from later tiers, 100, and `dilutions` (material → 10 or 1) for any it uses diluted. The customer judges your perfume by how close it smells to this one at each stage, how strong it is and how long it lasts. They only bring it in once you have every material in it, and once your rank allows it: dilutions, budgets, and a target in 100 parts need a rank whose `orderParts` reach 100. A test checks every target is within safety limits and not harsh. |
| `budget` | Optional: most they'll pay for materials, in euros per 100 g of concentrate. A perfume over budget can't be handed over. Budget briefs come once you're a Perfumer. |
| `pay` | Coins paid on hand-over (times the shop's pay multiplier) |
| `page` | Story requests only: the page of her book it recreates |

`lines.feedback` turns the score's directions into perfumer's language, never numbers (`src/game/feedback.ts`):

| Field | Meaning |
| ----- | ------- |
| `stages` | Stage id → phrase (`at the start`, `after an hour`, `as it dries down`) |
| `amounts` | Bands of how far off (`min` → `much`, `a little`, `a touch`) |
| `families` | Family id → `more` and `less` words (`brighter` / `less sharp` for citrus, `sweeter` / `less sweet` for gourmand) |
| `vague` | The first impression on the wrist: one remark, no amount (`{Word}`, `{stage}`) |
| `specific` | Templates for the review and later visits (`{amount}`/`{Amount}`, `{word}`, `{stage}`), used in turn |
| `strength`, `longevity` | `more` and `less` lines (`It was gone by lunchtime.`) |
| `perfect` | When there's nothing to change |
| `lastTime` | Introduces what a customer said last time, when they come back |

A regular: `id`, `name`, `about`, a fixed `look` (same shape as the player's saved look), a `greeting`, `remember` lines (highest `minStars` first; `{perfume}` and `{stage}` fill in from their last review) and their own `briefs`, which they bring in order. `comesWhen` (optional): they only come to a shop whose style has these `families` adding up to at least `min` (Céleste for florals, Gaspard for woods and smoke).

`style`: the shop's style is the average family profile (about an hour in) of the last `historySize` perfumes handed over; each walk-in brief's chance is multiplied by 1 + `weight` × how much its own target overlaps that style (`src/game/style.ts`).

## `time.json`

`gameDaysPerRealDay`: how fast game time runs (7 = one real day per game week, so a game year takes about 52 real days). `seasons`: each season's `name` and calendar `months` (1–12, northern hemisphere), shown in the HUD. The game clock (`src/game/clock.ts`, saved as `clock`) counts game hours from real timestamps; the debug speed (back room, or `?speed=N` in the URL) re-anchors it so changing speed never jumps.

## `regions.json`

Where naturals grow, for harvest contracts on the back room's map (`src/game/sourcing.ts`). A test checks every natural material grows somewhere.

| Field | Meaning |
| ----- | ------- |
| `id`, `name`, `country` | |
| `lat`, `lon` | Location, for distance-based shipping (and the painted map later) |
| `quirk` | One real fact shown in the game |
| `crops` | What can be contracted there, below |

Each crop:

| Field | Meaning |
| ----- | ------- |
| `material` | Material id |
| `months` | The season: months (1–12) when a contract can be signed. A fact: verify it. |
| `growGameHours` | How long it takes to ripen (tuning) |
| `bestWindowGameHours` | How long it stays at top quality once ripe (tuning; jasmine's is short because it must be picked at dawn) |
| `spoilGameHours` | Hours after ripening when quality bottoms out (tuning) |
| `grams` | Yield before processing (tuning) |
| `cost` | Coins to sign (tuning) |
| `methods` | Processing method ids that suit it |
| `verified`, `check` | As for materials; `check` names `months` or `region` |

## `processes.json`

Processing methods. `about` is the fact to verify; the numbers are tuning.

| Field | Meaning |
| ----- | ------- |
| `id`, `name`, `output` (what it makes), `about` | |
| `gameHours` | Processing time |
| `yield` | Share of the harvest's grams that comes out |
| `quality` | Multiplies the harvest's quality |
| `cost` | Coins |
| `unlock` | `{ coins, reputation }` to buy it, or `null` if you start with it |
| `upgrades` | Levels you can buy: `name`, `coins`, `reputation`, `quality` (added), `speed` (multiplies the time) |
| `verified`, `check` | |

## `sourcing.json`

| Field | Meaning |
| ----- | ------- |
| `startingCoins` | Coins a new shop starts with (there's no free stock) |
| `calendarStart` | The date at game hour 0 (`month`, `day`) |
| `shop` | A placeholder location for distance-based shipping |
| `shipping` | `baseGameHours` plus distance ÷ `kmPerGameHour` |
| `quality` | `inWindow` and `spoiled` harvest quality, `words` for quality bands, and `scoreEffect` (how much material quality shifts a perfume's score) |
| `aging` | Material id → `perGameDay` quality gained in stock, up to `max` |
| `supplier` | Every material needs a price; Phase C priced the new ones from their `ref.costPerKg` (4 + 6 × log10 of the cost per kilo). The town apothecary (`name`, `shippingGameHours`), which sells naturals from a broker's stock all year at `brokerQuality`; her chemist (`chemistName`, `chemistShippingGameHours`), which sells aroma chemicals at `catalogueQuality` once you've answered their letter; `lotGrams` per order and `prices` (coins per lot, every material) |
| `perfumeGrams` | Grams of material one perfume uses in total, split by its formula |

## `furniture.json`

Furniture and decor for the Shop panel (`src/game/upgrades.ts`), and the display case (`src/game/display.ts`).

| Field | Meaning |
| ----- | ------- |
| `appeal.levels` | Highest `min` reached wins: `name`, `payMultiplier` (customers' pay), `strictness` (added to every star threshold), `arrivalMultiplier` (time between customers and between display sales; below 1 is faster) |
| `kinds` | Catalogue sections: kind id → heading |
| `items` | Below |
| `display` | `saleEveryGameHours` (before appeal), and pricing: `basePrice` + `pricePerAccord` × accords + `pricePerLayer` × layers + `pricePerLongevityHour` × hours, capped at `maxPrice`, times material quality and appeal pay; `bottleOptions` offered |

Each item: `id`, `name`, `kind`, `model`, `placement` (`floor` spot or `surface` top), `price`, `appeal`, `reputation` (to buy), `size` `[width, depth]` (floor pieces become obstacles) and, for display cases, `capacity`.

## `events.json`

The newspaper (`src/game/events.ts`). Each game week prints `perWeek` `[min, max]` events, chosen from a seed and remembered in the save.

Each type: `id`, `target` (`crop`, `region`, `material` or `none`, picked from what you have open), `headline` and `body` templates (`{region}`, `{material}`), and `effect`: `yield` (contracts signed that week), `shippingExtraGameHours` (shipments leaving the region that week), `price` (supplier price), `arrivals` (time between customers).

## `sounds.json`

Sound cues the game plays. Files are recorded sounds under `assets/` (fetched by `npm run sounds`, CC0 only, each logged in `CREDITS.md`); nothing is synthesized, and a cue whose `file` is `null` stays silent.

| Field | Meaning |
| ----- | ------- |
| `cues.<id>.file` | Path under `assets/` (e.g. `sounds/glass.mp3`), or `null` until fetched |
| `cues.<id>.volume` | Playback volume, 0–1, before the player's volume setting |
| `cues.<id>.loop` | Whether it loops (footsteps while walking, ambience) |
| `cues.<id>.search` | Freesound search words the fetch script uses |
| `cues.<id>.duration` | `[min, max]` seconds the fetch script accepts |

Cue ids are fixed in code (`src/scene/audio.ts`): `door-chime`, `footsteps`, `glass`, `pouring`, `paper`, `crate`, `ambience`.

## `story.json`

Mireille's shop, her formula book and the townspeople who remember her perfumes. Logic in `src/game/story.ts`; story times are game hours.

| Field | Meaning |
| ----- | ------- |
| `grandmother` | Her name |
| `retryAfterGameHours` | How long before someone comes back to try a page again after fewer than 3 stars |
| `intro` | The opening panel: `title`, `paragraphs`, her `letter` (`heading`, `body`, `signoff`) and the `start` button |
| `bench` | Her bottles left on the organ: `material` and `grams` you start with |
| `people` | Townspeople: `id`, `name`, `about`, a fixed `look` (same shape as the player's) |
| `requests` | Story visits, below |
| `pages` | Her book's pages, below |

A request:

| Field | Meaning |
| ----- | ------- |
| `id`, `person` | Stable id and who brings it |
| `after` | When it comes in; all must hold: `gameHours` since the start, `reviews` heard, requests `done`, and `hoursAfter` the last of those |
| `latestGameHours` | Comes in by then even if `after` hasn't happened (Josette brings vanillin within the first week either way) |
| `greeting`, `retryGreeting`, `thanks` | What they say first, when they come back to try again, and at 3 stars |
| `gives`, `giveText` | Materials (`material`, `grams`) they hand over the first time you talk to them, and what they say |
| `brief` | A brief as in `clients.json`. With `page`, its target is her formula for that page: 3 stars recovers the page, fewer brings them back with more specific hints. |

A page: `id`, `title`, `dated`, `hiddenNames` (materials whose names have run as well as their amounts, until it's recovered), `margin` (her note, a clue), `signature` (the last, nearly blank page), and a `lesson` shown once it's recovered (`text`, with `verified` and `check` like materials; unverified lessons are listed in `docs/FACT_CHECK.md`). Her formula is the target of the request that recreates the page.

## `letters.json`

Her supply network (`src/game/routes.ts`). Every route starts closed: growers and her chemist went quiet when she died. Each season is a chapter in which some of them write; writing back reopens their route once their reply comes, and you wait on one reply at a time, so you choose who's next. Crates from an open route carry a note. A test checks every region has a grower and everyone writes in exactly one chapter.

| Field | Meaning |
| ----- | ------- |
| `replyGameHours` | How long a grower takes to write back after you answer |
| `routes` | One per region (same `id` as in `regions.json`) plus `chemist`: `from` (who signs), `about` (one line), `first` (their first letter, paragraphs), `reply` (when the route opens), `crate` (notes tucked into crates, in turn; `{material}` and `{quality}` fill in) |
| `chapters` | In order from the first spring, one per season: `title`, `text`, and `letters` (route ids whose first letter arrives when the chapter begins). Past the last one, chapters are just the season and year. |

The letters are story, not facts: where one mentions a season or method, it repeats the region's own (possibly unverified) data in `regions.json`.

## `training.json`

Nose training and the compendium (`src/game/learning.ts`).

| Field | Meaning |
| ----- | ------- |
| `questionsPerDay` | Questions in a day's session |
| `intervalsDays` | Days until a material comes up again, by the box (mastery) it has just moved to; a wrong answer sends it back to box 0 |
| `maxMastery` | The top box |
| `kinds` | Question kinds, taken in turn by mastery: `identify` (name it from its description), `family`, `layer` |
| `prompts` | The question for each kind (`{name}` fills in) |
| `layerNames` | How layers read in questions and pages |
| `reveal` | When parts of a compendium page fill in: `behaviour` (how it behaves in a blend, and its origin), `reference` (tenacity, dilution, era) and `safety` (IFRA limit and cost), each after `uses` perfumes or that much `mastery` |

Training days are real calendar days, so the streak means coming back each day. Uses count perfumes handed over, bottled or saved.

## `ranks.json`

Ranks and their exams (`src/game/ranks.ts`), in order. You start as the first.

| Field | Meaning |
| ----- | ------- |
| `id`, `name`, `about` | |
| `wearableParts` | Totals your perfumes may have, exactly (10; then 10 or 100; 1000 comes later) |
| `orderParts` | Totals a perfume for a customer, her signature or a reconstruction must have: 10 for an apprentice, then 100 (a master may also use 1000) |
| `stars` | Closeness needed for two and three stars, `[two, three]`, stricter at each rank. An exam is judged by the thresholds of the rank being sat for. |
| `dilutions` | Whether you can use materials at 10% and 1% (and make dilutions in the stock room) |
| `bases` | Whether you can save accords as bases and use them inside formulas |
| `budgets` | Whether customers with budgets come to you |
| `payMultiplier` | Customers pay this much more |
| `exam` | To reach this rank: `reputation` and `mastered` (`count` materials at mastery `level`) to sit it; `identify` (`questions`, and how many right to `pass`) for blind identification; `accord`, a brief (as in `clients.json`) to build at the organ to three stars |

## `signature.json`

Her signature perfume, the ending (`src/game/signature.ts`).

| Field | Meaning |
| ----- | ------- |
| `title` | Her last page's title |
| `needed` | Clues that unlock the final brief, from any mix of paths (about two-thirds) |
| `jar` | The aged material: `material` and `grams` taken neat from stock to start it, `gameDays` it must age, `name` and `about` |
| `brief` | The final brief (as in `clients.json`); judged at once, like an exam, and needs the jar ready. Three stars recovers her last page and opens the epilogue. |
| `clues` | Each: `id`, `path` (`town`, `routes` or `craft`), `when` (one of: `request` done, `route` open, `page` recovered, `rank` reached, `reviews` heard), `from` and `text` |
| `epilogue` | `title`, `opening` paragraphs, a paragraph `byPath` for the path that gave the most clues, then `pages` (`{pages}`), `style` (`{style}`), `rank` (`{rank}`) and `closing` |

## `awards.json`

The Town Perfume Awards (`src/game/awards.ts`): an open brief once a year.

| Field | Meaning |
| ----- | ------- |
| `name` | |
| `openDays` | Entries open for the last this-many days of December; results come when the year turns |
| `themes` | A theme per year, in turn |
| `weights` | How the four judges' scores add up: `structure` (top, heart and base present; a recognisable accord), `balance` (no one material drowning a stage, nothing harsh, lasts the day), `originality` (unlike every brief and lesson, and not too simple), `cost` |
| `costScale` | Euros per 100 g at which the cost score reaches zero |
| `prizes` | Highest `min` reached wins: `name`, `coins`, `reputation` |

## `lab.json`

The analysis lab and reconstruction challenges (`src/game/lab.ts`).

| Field | Meaning |
| ----- | ------- |
| `runCost` | Coins to run one sample |
| `levels` | Equipment bought in order: `name`, `coins`, `reputation`, `reveal` (how many of the biggest components a run shows), `percent` (whether it shows rough percentages), `about` |
| `challenges` | Well-known perfume styles under invented names: `id`, `name`, `era`, `structure` (`top`, `heart`, `base`, in words), `about`, `reputation` it appears at, `target` (100 parts, with `dilutions`; a test checks it's safe and not harsh), and `reward` (`coins`, `reputation`) for the first three-star reconstruction |

The lab shows materials, not molecules: a natural shows up as itself, which a real chromatograph wouldn't do.

Formula sheets and import (`src/game/sheet.ts`) need no data: a sheet lists each material's dilution, parts, share and grams for a batch of concentrate, and import reads lines like "Bergamot, 30", "Oakmoss 2 at 10%" or a sheet's own lines.
