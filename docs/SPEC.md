# Field & Flacon — Game Spec

_Formerly "Scent Roads" (working title)._

Oct 26, 2026 · @Sean Cornwell

A cozy phone game about running a small perfume house. While I'm away, harvests ripen and shipments travel real sourcing routes; when I open the game, I compose perfumes for clients who come in with memories instead of orders. Every material, region and technique is real, so playing reinforces the perfumery course. Working title.

## The two loops

The game is two halves that feed each other: the world map gathers materials while I'm away, and the atelier spends them when I'm playing.

|              | World map (idle)                                 | Atelier (active)                                      |
| ------------ | ------------------------------------------------ | ----------------------------------------------------- |
| When         | Runs on real time, even with the app closed      | Played in sessions of 5 to 20 minutes                 |
| What I do    | Sign harvest contracts, pick processing, send shipments | Read client briefs, compose formulas, collect reviews |
| Produces     | Raw materials in my inventory                    | Money, reputation and new formula discoveries         |
| Spends       | Money                                            | Materials                                             |

Money and reputation from the atelier buy new regions and better processing on the map, and better materials make better perfumes. A typical check-in: collect shipments, restart harvests, serve two or three clients, check reviews from earlier clients, done.

## Sourcing

A world map of where materials really come from. Each region has its own crops, season and quirks.

| Region                      | Starting materials                  | Real quirk to model                                          |
| --------------------------- | ----------------------------------- | ------------------------------------------------------------ |
| Grasse, France              | Jasmine, rose centifolia, tuberose  | Jasmine is picked at dawn; late picks lose quality           |
| Bulgaria (Valley of Roses)  | Rose damascena                      | Short harvest window in late spring                          |
| Calabria, Italy             | Bergamot                            | Winter citrus harvest; cold-pressed peel                     |
| Haiti                       | Vetiver                             | Roots harvested year-round; earthy, smoky base               |
| Indonesia                   | Patchouli                           | Leaves are dried and aged before distilling; age improves it |
| Madagascar                  | Vanilla                             | Months of curing before it's usable                          |
| Somalia / Oman              | Frankincense                        | Resin tapped from trees, collected over weeks                |

The region list is a starting draft. Claude Code should check every fact here against my course notes and flag anything uncertain.

### How it runs

- Game time runs on real time. Default: 1 real hour = 1 game day, so a game year is about 15 real days and every season comes around regularly. Tunable.
- **Harvest contracts:** pay to start a harvest in a region during its season. It ripens over real time. Collecting inside the ideal window gives top quality; collecting late gives less.
- **Processing:** each material lists which methods apply, with real trade-offs.
  - Steam distillation: fast, gives an essential oil.
  - Cold pressing: citrus only.
  - Solvent extraction: slower, gives an absolute, richer and pricier.
  - Enfleurage: very slow, small yield, top quality; unlocked late.
  - Tincture and aging: patchouli, vanilla and resins improve the longer they sit.
- **Shipping:** materials travel back to the atelier over real hours, with distance-based times.
- **Events:** occasional bumper crops, storms or price swings, announced in a small newspaper.
- Offline progress is calculated from timestamps when I reopen the app.

## The atelier

Clients describe a memory, not a product. I translate it into a formula, and the perfume is judged across its whole drydown, not just the first spray.

### Clients

- Each brings a short brief: "My grandfather's workshop," "The first cold day of the year," "A wedding in a lemon grove."
- Behind each brief is a hidden target: the olfactive families it wants, its mood, how strong it should be and how long it should last.
- A few regulars return over time with new requests and remember what I made them before.

### Composing

- An organ (the perfumer's desk) shows my materials, sorted by family and by layer: top, heart and base.
- I add materials in parts, like drops, and the formula updates live.
- Each material has real properties: family, volatility, strength and character notes, written in plain language.
- Recognized accords are named when I hit them (chypre, fougère, amber, cologne) and added to a formula book.

### Drydown and reviews

- Each material evaporates at its own rate, so the perfume's character changes over time.
- The perfume is scored at three moments: the opening, about an hour in, and the drydown hours later.
- The client gives a first impression right away, then returns later in game time with a review of how it wore. A great opening with a weak base gets a mixed review, and the review says which stage let it down.
- A small drydown graph shows which notes dominate at each stage, which makes it a learning tool.
- My own creations can be saved, named and put on the shop shelf for passive sales.

## Progression and idle time

- Money from clients and shelf sales buys harvest contracts, new regions and processing upgrades.
- Reputation grows with good reviews and brings more demanding clients with better pay.
- New regions unlock in stages, each adding new materials and new client types.
- The formula book fills with discovered accords and my saved creations.
- The shelf sells my saved perfumes slowly while I'm away, so the idle side earns too.
- Aging: some materials improve with real time, rewarding patience.
- No ads, no real-money purchases, no energy timers. Waiting is only for things that really take time, like harvests, curing and shipping.

## Look, sound and phone

- **Look:** warm, illustrated and cozy. Painted map, sunlit atelier, apothecary bottles. All art is generated or sourced, never drawn in code.
- **Sound:** soft ambient music per screen, glass clinks, pouring, paper rustle. Sourced from CC0 libraries such as Freesound, never synthesized.
- **Phone:** portrait, one-handed, installable from Safari with Add to Home Screen, and playable offline.
- **Notifications:** optional alerts when harvests ripen or shipments arrive, if the phone allows them for home-screen web apps.
- **Saves:** stored on the phone, with export and import from day one.
- Built as a web app in TypeScript rather than Godot. It's mostly menus, a map and a desk, which a web app handles best on an iPhone.

## Assets

- Never draw sprites, icons, backgrounds or effects in code, and never synthesize audio. Code only loads and displays asset files.
- Find assets from free libraries first: Kenney.nl (CC0), Freesound (CC0 filter, API key in .env), itch.io free packs, OpenGameArt. Download them into assets/ yourself.
- Keep one consistent style. Before downloading, propose the pack(s) you plan to use with a preview link and wait for my OK.
- Log every asset in CREDITS.md: source, author, license, URL. Only use CC0, CC BY, or licenses that allow use in my own game; skip anything "non-commercial" or unclear.
- If nothing suitable exists, add it to ASSETS_NEEDED.md and use a plain labeled placeholder box. Never improvise art in code.

## Decisions

Answers to the open questions, Oct 27, 2026.

- **Name.** Field & Flacon. (The repo and URL stay `scent-roads`.)
- **Time speed.** 1 real hour = 1 game day, for now. Keep it a single tunable setting.
- **Difficulty.** Mostly easy for now, but build towards a harder, realistic mode later. Scoring takes a strictness setting from the start, so a realistic mode is a new setting value rather than a rewrite.
- **Course link.** Yes. Materials and accords follow the order of my perfumery course, unlocking as I learn them, starting with my current bench inventory. See `docs/COURSE.md`.

## Claude Code prompts

Built from the desktop with Claude Code, played on the phone through GitHub Pages.

Before Prompt 1: create a GitHub repo, set Settings → Pages → Source to "GitHub Actions", clone it, open Claude Code in the folder, and export this doc as Markdown to paste in.

### Prompt 1: setup

```
Set up this repo for a cozy perfume-house phone game. Do these things,
then stop:

1. Create docs/SPEC.md containing exactly the spec I paste at the end.

2. Create CLAUDE.md with these rules:
   - Read docs/SPEC.md before any work; it's the source of truth.
   - Perfumery facts must be real. Every material, region, season and
     technique lives in data files with a "verified" flag; anything you
     aren't sure of is marked unverified and listed in
     docs/FACT_CHECK.md for me to confirm against my course.
   - All content (materials, regions, processes, clients, accords) is
     data in documented schemas, never hard-coded.
   - Never draw art or synthesize sound in code. Use plain placeholder
     boxes and labels until real assets exist; list needs in
     ASSETS_NEEDED.md.
   - Game time runs on real time from timestamps, so progress happens
     while the app is closed.
   - No ads, no purchases, no energy timers.
   - Build only the step I ask for. Commit each step.

3. Scaffold a TypeScript web app (portrait, iPhone Safari, Add to Home
   Screen, offline-capable) with a GitHub Actions workflow that deploys
   to GitHub Pages on every push. Deploy a placeholder home screen and
   give me the URL.

SPEC:
[paste the exported doc here]
```

### Prompt 2: materials and the organ

```
Step 2: the material data and the composing desk, no map yet.
- Draft materials.json with about 20 real materials across top, heart
  and base, each with family, volatility, strength, character notes
  and region. Mark uncertain facts unverified.
- The organ screen: browse materials by family and layer, add parts,
  see the formula update.
- An evaporation model that gives the formula's profile at the opening,
  about one hour, and the drydown, with a small drydown graph.
- Accord recognition for chypre, fougere, amber and cologne, saved to
  a formula book.
Start me with a free stock of every material for testing.
Deploy and tell me what to try.
```

### Prompt 3: clients and reviews

```
Step 3: clients. Briefs written as memories, each with a hidden target
(families, mood, strength, longevity). Score the three drydown stages
against the target. First impression immediately; the full review
arrives later in game time and says which stage let it down. Money
and reputation, and two or three regulars who remember past perfumes.
Deploy and give me the link.
```

### Prompt 4: the world map

```
Step 4: the idle sourcing map. Regions from the spec, real seasons,
harvest contracts that ripen on real time with a best-quality window,
processing methods with their trade-offs, aging materials, shipping
times and offline progress from timestamps. Remove the free starting
stock; materials now come only from the map. Add a debug option to
speed time up for testing. Deploy and give me the link.
```

### Prompt 5: progression

```
Step 5: region unlocks, processing upgrades, harder clients as
reputation grows, saved creations on a shop shelf that sells while
I'm away, a small newspaper for events, save export and import, and
optional notifications for ripe harvests and arrivals.
Deploy and give me the link.
```

### Prompt 6: art and sound

```
Step 6: replace the placeholders. First propose image generators with
an official API and free tier, and wait for my OK. Generate a warm,
illustrated look: painted world map, atelier, bottles and material
icons. Source CC0 sounds from Freesound through its API (key as a
secret) for glass, pouring, paper and ambience. Show candidates on a
/review page for me to pick by number. Deploy when done.
```
