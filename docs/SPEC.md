# Field & Flacon — Game Spec

_Formerly "Scent Roads" (working title)._

Oct 26, 2026 · @Sean Cornwell

> **Direction change — Oct 27, 2026.** The atelier is no longer a flat screen. The game now takes place in a small 3D perfume shop seen from a fixed isometric (orthographic) camera, in portrait. A character I create in a character creator walks the shop, serves customers and upgrades the store. The organ stands behind the counter; tapping it opens the composing desk from step 2 as a panel over the scene, with its logic unchanged. The world map becomes a back-room screen, reached through a door in the shop. Art is free low-poly 3D in one consistent style (see **Assets**). Where older text below says "atelier", read "the shop"; where it says "world map", read "the back room". Step 3 is now the shop; clients, sourcing and progression move to later steps (see **Claude Code prompts**).

> **Shop and customers — Oct 27, 2026.** The shop is long (now 10 × 18 m) with room for customers to hang around and for upgrades and furniture. There is no suggestion booth: customers stand around the shop (and sit, once seating upgrades exist) and can engage me in conversation. Sometimes a conversation gives a hint towards the final product they'll like. Art comes from Grab3D (CC0, one cozy pastel style, approved Oct 27, 2026); I'm happy to credit artists, so CC BY assets that fit the style are fine too.

## Direction change #2 — Oct 28, 2026: progression, story and education

This section overrides anything below that conflicts with it. Older sections have been edited to match; where an older line still disagrees, this section wins.

### Goals

- The game must be both addictive and genuinely educational. By late game I should be writing formulas comparable to real finished perfumes.
- All perfumery facts must be real. Keep the `verified` flag and `docs/FACT_CHECK.md` for anything uncertain.
- Never use real perfume brand or product names in the game; use invented names.

### Time

- 1 real day = 1 game week, so one game year is about 52 real days.
- Seasons drive harvests, letters and story chapters.

### The story

I inherited the shop from my grandmother, the town's perfumer.

- **Her formula book:** smudged pages with missing amounts. Townspeople ask for "the one she made for my wedding", and I recreate it from their memories. Each recovered formula fills a page.
- **Her supply network:** growers around the world who went quiet when she died. Reopening a route means answering a grower's letter, and I choose which letter to answer next. Shipments arrive with short letters (memories of her, harvest news), delivered in the back room.
- **A chemist's supply house:** her old synthetics supplier, a second route for aroma chemicals.
- **The ending:** her signature perfume, the final, nearly blank page.
  - Its makeup is revealed by clues from three paths: the town (customer memories), the routes (grower letters) and the craft (book pages, margin notes).
  - About two-thirds of the clues, from any mix, unlock the final brief.
  - It also needs a material aged in real time that I started long before.
  - The epilogue reflects my path.
- **Eras:** her book spans eras, so materials and accords unlock roughly in the historical order they appeared in perfumery.

### Composing

- **Formula resolution by rank:** wearables must total exactly 10 parts at first, then 100 parts, then 1000 parts at master rank.
- **Dilutions:** materials can be stocked at 100%, 10% or 1%. One part of a dilution counts as one part but contributes proportionally. Using strong materials undiluted should smell wrong.
- **Safety limits:** real per-material maximums. A formula over a limit can't be sold.
- **Cost:** each material has a cost per kilo, and later briefs set budgets.
- **Accords:** learn classic accords as lessons from the book, then save any accord as a reusable base inside larger formulas.

### Customers and scoring

- Each brief has a hidden target balance. Score = closeness, shown as 1 to 3 stars, with tolerance. Only 3 stars earns the bonus.
- Feedback is directional and in perfumer's language, never numbers ("a little too sweet," "gone by lunchtime," "brighter at the start"). Returning customers give more specific hints.
- My shop's style shapes who visits: lean floral and I get wedding requests; lean woody and smoky and I get different regulars.

### Materials and learning

- Grow the database to several hundred materials over time (naturals, isolates, aroma chemicals). Each one has:
  - family and subfamily
  - layer
  - strength
  - tenacity in hours
  - typical dilution
  - safety limit
  - cost
  - plain-language character notes

  Draft them from public references and mark anything uncertain as unverified.
- **Starting set:** bergamot, lavender, labdanum. Vanillin arrives in the first game week with a customer who wants something sweeter.
- **Compendium:** a page per material that fills in as I use it, with a space for MY OWN smelling notes, which the game never fills in.
- **Daily nose training at the organ:** a short spaced-repetition quiz (identify a material from its description, family or layer).
  - A streak counter tracks consecutive days.
  - Correct answers raise in-game mastery of that material.
- **Ranks:** apprentice, junior perfumer, perfumer, master.
  - Each rank ends in an exam: blind identification, plus building an accord to a brief.
  - Ranks unlock formula resolution and features.

### Late game

- **Annual perfume awards** at each year's end: an open brief judged by structure, balance, originality and cost. It encourages experimenting.
- **Analysis lab** (inspired by gas chromatography): running a sample reveals some of its main components; higher levels reveal more.
- **Reconstruction challenges:** well-known perfume styles described by their public structure, under invented names.
- **Formula export** as a real formula sheet (grams and percentages, dilutions noted) that I can weigh out at home. **Import** of my real formulas to see their simulated drydown.

### Build phases

Each phase gets its own session, started when I say "Next phase."

- **A.** Time scale; 10-part wearables; starting materials and vanillin arrival; directional feedback and star scoring; story intro and the formula book with her first recoverable formulas. Also fix the shop camera to frame the whole room with no cropped labels.
- **B.** Grower letters, route choice, seasons as chapters, the chemist's supply house.
- **C.** Materials database expansion, compendium with my notes, daily nose training with streaks.
- **D.** Ranks and exams, 100 parts, dilutions, safety limits, cost, saved accords, shop style shaping customers.
- **E.** Clues across the three paths, the aged material, the signature ending and epilogue, annual awards.
- **F.** Analysis lab, reconstruction challenges, 1000 parts, formula export and import.

A cozy phone game about running a small perfume house. While I'm away, harvests ripen and shipments travel real sourcing routes; when I open the game, I compose perfumes for clients who come in with memories instead of orders. Every material, region and technique is real, so playing reinforces the perfumery course. Working title.

## The two loops

The game is two halves that feed each other: the world map (now a back-room screen) gathers materials while I'm away, and the shop spends them when I'm playing.

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

- Game time runs on real time: 1 real day = 1 game week, so a game year is about 52 real days (Direction change #2). Tunable.
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

Since the direction change, this is a small 3D perfume shop: front door, counter, the organ behind it, shelves, and a door to the back room. My character walks where I tap, serves customers at the counter, and composes at the organ. The shop itself can be upgraded.

Clients describe a memory, not a product. I translate it into a formula, and the perfume is judged across its whole drydown, not just the first spray.

### Clients

- Customers stand around the shop (sitting once seating is upgraded) and can be talked to. Conversations are where briefs come from, and sometimes they drop a hint about what the customer will like in the final perfume.
- Each brings a short brief: "My grandfather's workshop," "The first cold day of the year," "A wedding in a lemon grove."
- Behind each brief is a hidden target balance: what it should smell like at each stage, how strong it should be and how long it should last. Score = closeness, shown as 1 to 3 stars with tolerance; only 3 stars earns the bonus (Direction change #2).
- A few regulars return over time with new requests and remember what I made them before.

### Composing

- An organ (the perfumer's desk) shows my materials, sorted by family and by layer: top, heart and base.
- I add materials in whole parts, like drops, and the formula updates live. A wearable perfume must total exactly 10 parts at first, then 100, then 1000 at master rank (Direction change #2).
- Each material has real properties: family, volatility, strength and character notes, written in plain language.
- Recognized accords are named when I hit them (chypre, fougère, amber, cologne) and added to the formula book, which is my grandmother's book (see **The story** above).

### Drydown and reviews

- Each material evaporates at its own rate, so the perfume's character changes over time.
- The perfume is scored at three moments: the opening, about an hour in, and the drydown hours later.
- The client gives a first impression right away, then returns later in game time with a review of how it wore. Feedback is directional and in perfumer's language, never numbers ("a little too sweet," "gone by lunchtime," "brighter at the start"). The review is more specific than the first impression, and customers who come back again are more specific still.
- A small drydown graph shows which notes dominate at each stage, which makes it a learning tool.
- My own creations can be saved, named and put on the shop shelf for passive sales.

## Materials and how they unlock

_Added Oct 27, 2026; revised Oct 28, 2026 by Direction change #2: the starting set is bergamot, lavender and labdanum, and vanillin arrives in the first game week with a customer who wants something sweeter. From Phase C, materials unlock roughly in the historical order they appeared in perfumery; the table below holds until then._ The player starts with very few materials and gains more as their reputation grows. Each step is small and themed, and each material comes from one of two places that the idle side of the game will model:

- **Grown (naturals):** each grows in a real region. They'll be sourced on the world map in the back room through harvest contracts.
- **Catalogue (synthetics):** aroma chemicals ordered from a supplier's catalogue, shipped to the shop.

| Reputation | Era | New materials | Teaches |
| ---------- | --- | ------------- | ------- |
| 0 | Her bench | Bergamot, Lavender, Labdanum resinoid (vanillin arrives with a customer in week 1) | Three of her bottles, one for each layer: enough for a cologne. Vanillin comes back to the shop in your first week. |
| 4 | Waters and resins | Lemon, Sweet orange, Petitgrain bigarade, Neroli, Rosemary, Benzoin Siam, Myrrh, Frankincense | The oldest palette: citrus and herb waters from the 1700s, and resins burned since antiquity. |
| 9 | The old garden | Bulgarian rose oil, Rose de mai absolute, Jasmine absolute, Tuberose absolute, Orange flower absolute, Geranium, Ylang-ylang extra, Clove bud, Mandarin, Clary sage, Peppermint | Flowers and spices of the 19th-century perfumer. |
| 15 | Woods and roots | Cedarwood Virginia, Sandalwood, Vetiver, Patchouli, Orris butter, Tonka absolute, Vanilla absolute, Opoponax, Ambrette seed, Nutmeg, Cardamom | Long-lasting bases from roots, woods and resins. |
| 22 | The first molecules | Coumarin, Oakmoss absolute, Heliotropin, Beta-ionone, Ethyl vanillin, Benzyl acetate, Linalool, Linalyl acetate, Geraniol, Citronellol, Eugenol, Benzaldehyde, Indole, Isobutyl quinoline, Birch tar (rectified), Phenylethyl alcohol | 1868 to 1900: chemists make coumarin, heliotropin and the ionones, and the fougère is born. |
| 30 | Aldehydes and chypres | Aldehyde C-10 (decanal), Aldehyde C-11 undecylenic, Aldehyde C-12 lauric, Aldehyde C-12 MNA, Hydroxycitronellal, Aldehyde C-14 (peach), Aldehyde C-18 (coconut), Methyl ionone, Benzyl salicylate, Exaltolide, Ambrettolide, Treemoss absolute, Violet leaf absolute, Mimosa absolute, Citral, Isobornyl acetate, Guaiac wood, Cypress, Atlas cedarwood, Grapefruit, Lime (distilled), Black pepper, Ginger | 1900 to 1930: sparkling aldehydes, peach lactones and the chypre. |
| 40 | Mid-century | cis-3-Hexenol, cis-3-Hexenyl acetate, Galbanum, Ligustral (Triplal), Allyl amyl glycolate, Allyl caproate, Gamma octalactone, Gamma decalactone, Delta-decalactone, Hedione, Helional, Rose oxide, Ambroxan, Galaxolide, Ethylene brassylate, Evernyl, Vertofix, Raspberry ketone, Blackcurrant bud absolute, Lavandin grosso, Basil | 1930 to 1970: green notes, transparent jasmine, ambergris and clean musks. |
| 52 | The modern palette | Iso E Super, Cashmeran, Dihydromyrcenol, Beta-damascone, Ethyl maltol, Stemone, Javanol, Habanolide, Helvetolide | 1970 to today: radiant woods, damascones, sweet gourmands and modern musks. |
| 65 | Far harvests | Pink peppercorn, Douglas fir needle, Black tea SFE, Cocoa absolute, Cypriol | Newer naturals: pink pepper, fir needles, tea and cocoa, smoky cypriol. |

Since Phase C (Oct 28, 2026) the tiers follow perfumery's history rather than the course, as Direction change #2 asks: her book spans eras. Customers only bring briefs that the materials you have can answer, and new materials are bought from the apothecary or the chemist, or harvested once a grower's route is open. Material descriptions in the game use standard perfumery descriptors; Sean's own notes stay in `docs/COURSE.md` as reference.

## Progression and idle time

- Money from clients and shelf sales buys harvest contracts, new regions and processing upgrades.
- Reputation grows with good reviews and brings more demanding clients with better pay.
- New regions open in stages: since Phase B, by answering growers' letters, which arrive with the seasons (see **The story**).
- The formula book fills with discovered accords and my saved creations.
- The shelf sells my saved perfumes slowly while I'm away, so the idle side earns too.
- Aging: some materials improve with real time, rewarding patience.
- No ads, no real-money purchases, no energy timers. Waiting is only for things that really take time, like harvests, curing and shipping.

## Look, sound and phone

- **Look:** warm and cozy low-poly 3D, seen from a fixed isometric camera. A small sunlit shop, apothecary bottles, a player-made character. All models are sourced from free libraries in one consistent style, never drawn in code.
- **Sound:** soft ambient music per screen, glass clinks, pouring, paper rustle. Sourced from CC0 libraries such as Freesound, never synthesized.
- **Phone:** portrait, one-handed, installable from Safari with Add to Home Screen, and playable offline.
- **Notifications:** optional alerts when harvests ripen or shipments arrive, if the phone allows them for home-screen web apps.
- **Saves:** stored on the phone, with export and import from day one.
- Built as a web app in TypeScript rather than Godot, with Three.js for the shop scene. It must stay smooth on iPhone Safari.

## Assets

Since the direction change (3D shop):

- Never draw models, sprites, icons or effects in code, and never synthesize audio. Code only loads asset files.
- Use free low-poly 3D libraries in one consistent style: Kenney.nl (CC0) and Quaternius (CC0) first, Poly Pizza for gaps. Download them into assets/ yourself. Propose the packs with preview links and wait for my OK before downloading.
- Log every asset in CREDITS.md (source, author, license, URL). CC0 or CC BY only.

Original rules, still in force where they don't conflict:

- Never draw sprites, icons, backgrounds or effects in code, and never synthesize audio. Code only loads and displays asset files.
- Find assets from free libraries first: Kenney.nl (CC0), Freesound (CC0 filter, API key in .env), itch.io free packs, OpenGameArt. Download them into assets/ yourself.
- Keep one consistent style. Before downloading, propose the pack(s) you plan to use with a preview link and wait for my OK.
- Log every asset in CREDITS.md: source, author, license, URL. Only use CC0, CC BY, or licenses that allow use in my own game; skip anything "non-commercial" or unclear.
- If nothing suitable exists, add it to ASSETS_NEEDED.md and use a plain labeled placeholder box. Never improvise art in code.

## Decisions

Answers to the open questions, Oct 27, 2026.

- **Name.** Field & Flacon. (The repo and URL stay `scent-roads`.)
- **Time speed.** 1 real day = 1 game week (changed Oct 28, 2026 from 1 real hour = 1 game day). Keep it a single tunable setting.
- **Difficulty.** Mostly easy for now, but build towards a harder, realistic mode later. Scoring takes a strictness setting from the start, so a realistic mode is a new setting value rather than a rewrite.
- **Story.** I inherited the shop from my grandmother (Direction change #2, Oct 28, 2026).
- **Course link.** Yes. Materials and accords follow the order of my perfumery course. Revised Oct 27, 2026: the player starts with a small bench of four rather than my real inventory, and unlocks the rest by reputation (see **Materials and how they unlock**). My notes are reference only.

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

### Prompt 3: the shop (after the direction change)

```
Then build step 3, the shop:
- Three.js scene, fixed isometric (orthographic) camera, portrait,
  smooth on iPhone Safari.
- A small shop interior: front door, counter, the organ behind it, a
  few shelves, and a door to the back room.
- Character creator: a few faces, hairstyles, outfits and colors,
  using modular character parts from the approved pack.
- Tap to walk. Tapping the organ opens the existing composing desk
  from step 2 as a panel over the scene. Keep its logic unchanged.
- The back-room door is a placeholder for now.
Deploy and give me the link.
```

The prompts below were written before the direction change and will be renumbered when they come up.

### Prompt 4: customers in the shop (after the direction change)

```
Step 4: customers in the shop.
- Animated customers walk in, browse the shelves, and come to the
  counter. Tapping one shows their memory brief.
- Each brief has a hidden target (families, mood, strength,
  longevity). I compose at the organ and hand over the perfume.
- Score the opening, about one hour, and the drydown against the
  target. They react right away, then return later in game time with
  a full review that says which stage let them down.
- Money, reputation, and two or three regulars who remember past
  perfumes and look the same each visit.
Deploy and give me the link.
```

### Prompt 5: the back room (after the direction change)

```
Step 5: the back-room door opens the idle sourcing map from the spec:
real regions and seasons, harvest contracts that ripen on real time
with a best-quality window, processing methods, aging materials,
shipping times, and offline progress from timestamps. Shipments
arrive as crates in the back room. Remove the free starting stock.
Add a debug option to speed up time. Deploy and give me the link.
```

How it was built (Oct 28, 2026):

- **Calendar:** a new game starts on 1 March (spring); originally 1 real hour = 1 game day; since Direction change #2, 1 real day = 1 game week, so a year takes about 52 real days.
- **Regions:** the spec's seven regions plus the places the other naturals grow (Haute-Provence, Andalusia, Réunion, Virginia, the Balkans, the Pacific Northwest, Assam). Seven new naturals came with them: jasmine, rose de mai, tuberose, Bulgarian rose, vetiver, vanilla absolute and frankincense, placed in two new unlock groups ("Roots and resins" at 42, "The great flowers" at 60).
- **Harvests:** sign a contract in season → it ripens → collect in the best window for full quality, later for less → pick a processing method → it ships, with time based on distance → a crate appears by the back-room door → unpack it into stock.
- **Supplier (added so a new shop is never stuck between seasons):** aroma chemicals from a catalogue, and naturals from a broker all year at a premium and of only fair quality. Harvesting yourself is cheaper and better, but seasonal and slower.
- **Stock:** the free samples are gone. A new shop starts with 80 coins. Each perfume uses 1 g of material in total; better materials raise the score, and patchouli, vetiver, vanilla, labdanum, frankincense and oakmoss improve while they sit in stock.
- **Debug:** time speed ×1, ×60 or ×600 at the bottom of the back room, or `?speed=N` in the URL.

### Prompt 6: store upgrades and progression (after the direction change)

```
Step 6: store upgrades and progression.
- Buy and place furniture, display cases, lighting and decor. Decor
  raises the shop's appeal, which brings more demanding,
  better-paying customers.
- A display case for my saved signature perfumes, which sell while
  I'm away.
- Region unlocks and processing upgrades bought with money and
  reputation.
- A small newspaper for events, save export and import, and optional
  notifications for ripe harvests and arrivals.
Deploy and give me the link.
```

How it was built (Oct 28, 2026):

- **Shop panel:** buy furniture into storage, then place it on 7 floor spots or 4 table and counter tops. Every placed piece adds appeal. Appeal levels (Humble, Charming, Elegant, Renowned) raise pay (×1–×2), make customers stricter (star thresholds rise), bring them more often and make the display case sell faster.
- **Display case:** the Signature shelf (3 places) or Display bookcase (6) holds bottles of saved formulas. Bottling uses stock; bottles sell on a timer from timestamps, so they sell while the app is closed. Price depends on accords, layers, longevity and material quality.
- **Regions and processing:** Calabria, Provence and Andalusia start open; the rest cost coins and reputation. Steam distillation, cold pressing and solvent extraction start owned; CO₂ extraction, curing and enfleurage are bought; every method can be upgraded twice for quality and speed.
- **Newspaper:** The Flacon Gazette prints one or two events a week (bumper crops, storms, price swings, scent fairs), fixed once printed, with real effects in the game.
- **Saves:** export a file or copy text; import a file or pasted text (More panel).
- **Notifications:** optional; shown for ripe harvests, crates and returning customers while the app is open in the background. Alerts while it's fully closed would need a push server.

### Prompt 7: sound and finishing touches (after the direction change)

```
Step 7: sound and finishing touches. Source CC0 sounds through the
Freesound API (key in .env): door chime, footsteps, glass clinks,
pouring, paper, crates, and calm shop ambience. Fill any remaining
ASSETS_NEEDED.md items from the approved packs, and replace any
leftover placeholders. Deploy and give me the link.
```

How it was built (Oct 28, 2026):

- **Sound:** cues are data (`src/data/sounds.json`): door chime when a customer comes in, footsteps while you walk, a glass clink as you add a material, pouring when you hand over a perfume or bottle one for display, paper for the newspaper and taking an order, crates when one arrives or is unpacked, and a looping shop ambience. The game only plays recorded files; it starts on the first tap (phones require it) and pauses while the app is hidden. Volume (Off, Quiet, Normal) is under More.
- **Fetching sounds:** `npm run sounds` searches Freesound for CC0 sounds only, saves the high-quality MP3 previews to `assets/sounds/`, fills in `sounds.json` and logs each in `CREDITS.md`. Not run yet: this environment's network can't reach freesound.org and has no `FREESOUND_API_KEY`. Until then the game is silent.
- **From the approved packs:** the Grab3D wooden floor tile now covers the floor, the Grab3D door stands open in the front doorway, and the app icon is a render of the Grab3D potion bottle (CC0).
- **Still waiting** (nothing in the approved packs): perfume bottles, a painted world map, a glass display case, a newspaper masthead and a sitting animation. See `ASSETS_NEEDED.md`.

### Prompt 8: Direction change #2, Phase A

```
DIRECTION CHANGE #2: progression, story and education overhaul.
Before building, update docs/SPEC.md with everything below under a
dated "Direction change" heading, and replace anything it conflicts
with. Then build PHASE A ONLY and stop. Each later phase gets its
own session when I say "Next phase."
```

The full direction is recorded under **Direction change #2** at the top of this spec.

How it was built (Oct 28, 2026):

- **Time:** 1 real day = 1 game week (`time.json`). The HUD shows the date, season and week. A customer's review comes back after the 8-hour drydown, about an hour of real time.
- **Story intro:** a new game opens on Mireille's shop and her letter, then the character creator. Saves from before this change start a new game (save version 2).
- **Her bench:** you start with 10 g each of bergamot, lavender and labdanum, plus coins for the supplier. Vanillin comes back with Josette, the baker, after your first review or by day two at the latest.
- **10-part wearables:** each tap adds one whole part. A perfume must total exactly 10 parts to hand over or bottle.
- **Scoring:** every brief's hidden target is a reference formula in 10 parts. Your perfume is judged on how close it smells to it at each stage, plus its strength and how long it lasts. That closeness becomes 1–3 stars with some tolerance: about a part either way still earns 3 stars, but a swapped material doesn't. Customers pay on hand-over; only 3 stars adds a bonus (half the pay) when the review comes in.
- **Feedback:** directional, in perfumer's words, never numbers.
  - On the wrist, customers say one thing about the opening ("Brighter at the start, I think.").
  - Their review gives up to two, with how much ("I'd like it a little less sweet as it dries down.", "It was gone by lunchtime.").
  - Someone coming back to try a page again repeats up to three things they noticed last time.
- **Her formula book:** her pages come first in the Book.
  - Each page lists her materials with the amounts smudged; some names have run too.
  - The margin note is a clue.
  - Agathe, Henri and Lucien ask for the perfumes she made them. A 3-star match recovers the page, revealing her amounts and a short lesson; fewer stars brings them back later.
  - The last page, her signature, is nearly blank.
- **Camera:** zoom 1 frames the whole room below the HUD and stays put; pinch to zoom in and pan. Labels never go under the HUD or off screen, overlapping labels stack, and tapping a name label counts as tapping that person or fixture. Upgrade-spot labels show only when zoomed in.

### Prompt 9: Direction change #2, Phase B

```
Next phase
```

Phase B from **Direction change #2**: grower letters, route choice, seasons as chapters, the chemist's supply house.

How it was built (Oct 28, 2026):

- **Routes start closed.** Every region and her chemist went quiet when she died. Paying coins and reputation to open a region is gone, and so is the Shop panel's Regions tab.
- **Seasons are chapters.**
  - Chapter 1 (spring) brings letters from the growers of her bench (Calabria, Haute-Provence, Andalusia) and from her chemist, Varenne & Fils.
  - Summer, autumn and winter bring three more growers each.
  - The second spring brings Grasse and the Valley of Roses.
  - Each new chapter is announced over the shop. The HUD shows the chapter number.
- **Route choice.** The back room's new Letters tab holds their letters. Write back to one, and their answer comes about 12 game hours later (under 2 real hours) and opens the route. Only one reply can be on its way at a time, so you choose who comes first.
- **Crates carry letters.** Every crate from an open route has a short note (memories of her, harvest news) kept in Letters. The HUD counts unread letters.
- **Two suppliers.**
  - Varenne & Fils is the only source of aroma chemicals, including more vanillin, once you've written back.
  - The town apothecary sells naturals all year at a premium and fair quality, so you can't get stuck while routes are closed.
- **Unchanged:** materials still unlock by reputation, so an open route can show crops you can't sign for yet.

### Prompt 10: Direction change #2, Phase C

```
Next
```

Phase C from **Direction change #2**: materials database expansion, the compendium with my notes, daily nose training with streaks.

How it was built (Oct 28, 2026):

- **Materials:** from 35 to 108 materials across all 13 families, naturals and aroma chemicals.
  - Each has a subfamily and a `ref` block of reference numbers: era, tenacity on a strip, typical dilution, IFRA limit and rough cost per kilo.
  - All the reference numbers are unconfirmed and listed in `docs/FACT_CHECK.md`. That file's materials tables are now generated from the data (`npm run factcheck`).
  - Phase D uses dilution, safety limits and cost.
- **Historical unlocks:** nine tiers by era, from her bench through "Waters and resins" (1700s), "The old garden", "Woods and roots", "The first molecules" (1868–1900), "Aldehydes and chypres" (1900–1930), "Mid-century", "The modern palette", and newer naturals. Twelve new walk-in briefs cover the early eras.
- **Compendium:** a Book tab with a page per material you have.
  - A page starts with the material's description.
  - It adds how it behaves in a blend and where it comes from once you've used it.
  - Tenacity, dilution and era come after three uses (or some mastery); safety limit and cost after six (or more mastery).
  - Each page has a "My notes" box that only you write in. The organ's Info sheet shows the same page.
- **Nose training:** a few spaced-repetition questions a day at the organ.
  - Name a material from its description, its family, or its layer.
  - A right answer raises that material's mastery (0–5) and spaces it out; a wrong one sends it back to the start.
  - Training days are real calendar days, with a streak for consecutive days.

### Prompt 11: Direction change #2, Phase D

```
Next
```

Phase D from **Direction change #2**: ranks and exams, 100 parts, dilutions, safety limits, cost, saved accords, shop style shaping customers.

How it was built (Oct 28, 2026):

- **Ranks:** Apprentice (10 parts), Junior perfumer (10 or 100 parts, dilutions, saved bases), Perfumer (budget briefs, pay ×1.5) and Master (pay ×2; 1000 parts come in Phase F).
  - Each exam needs some reputation and a number of materials mastered in nose training.
  - Part one is blind identification: name the material from its description alone.
  - Part two is building a classic accord (amber, then chypre, then fougère) at the organ to three stars, judged at once.
  - Your rank and the next exam are under More.
- **100 parts:** with Junior perfumer, a perfume totals exactly 10 or 100 parts. The organ adds 1, 5 or 10 parts a tap, and can scale a 10-part formula to 100. Customers judge proportions, so both work.
- **Dilutions:** each material in a formula can be used at 100%, 10% or 1%. A diluted part counts as one part but smells, costs and counts for safety as a tenth or a hundredth of it.
  - Dilutions are made in the stock room from neat stock: 10 g at 10% takes 1 g.
  - Strong materials (those usually worked at 1%) smell harsh above 5% of a formula. Customers say so, and it costs stars.
- **Safety limits:** each material's IFRA limit is checked against the finished perfume at 10% concentrate (the course's figure). A formula over a limit can't be handed over or bottled, and the organ explains why.
  - Every brief target was checked to be safe. Where a target needs a material diluted (oakmoss, coumarin, the green and fruity powerhouses), that brief only comes once you can dilute.
- **Cost:** the organ shows each formula's cost per 100 g of concentrate. Some later briefs set a budget, and a perfume over it can't be handed over.
- **Accords as lessons:** the Book's Accords tab now teaches each classic accord with an example to try at the organ. Junior perfumers can save any formula as a base and add it as one ingredient to larger formulas.
  - The accord descriptions no longer name real perfumes or houses.
- **Shop style:** the families of the last eight perfumes you've handed over make the shop's style, shown in the Shop panel. Walk-in briefs like your style come more often.
  - Two new regulars only come to a shop that leans their way: Céleste, a wedding planner, for florals; Gaspard, a cabinetmaker, for woods and smoke.

### Prompt 12: Direction change #2, Phase E

```
Next, continue through remaining steps without pause
```

Phase E from **Direction change #2**: clues across the three paths, the aged material, the signature ending and epilogue, annual awards.

How it was built (Oct 28, 2026):

- **Clues:** twelve clues to her own perfume, four on each path.
  - **The town:** Agathe, Henri and Lucien once their requests are done, and a customer's remark after many reviews.
  - **Her growers:** opening the routes to Bulgaria, Andalusia, Provence and the chemist.
  - **The craft:** recovering her three pages, and passing the first exam.
  - Each new clue is announced, and all of them are collected on her last page (Book → Her pages → Open her last page).
- **The final brief:** eight clues, from any mix of paths, unlock it.
- **The aged material:** it also needs labdanum from her jar.
  - You start the jar on her last page with 5 g of neat labdanum, and it ages 60 game days (about nine real days) in real time.
  - Her letter in the intro now tells you to start it early.
- **The ending:** her perfume is judged at once against her formula. Three stars recovers her last page and opens the epilogue.
  - The epilogue reflects the path that gave you the most clues, how many pages you recovered, your shop's style and your rank.
  - The game carries on afterwards.
- **Annual awards:** The Town Perfume Awards, with a theme each year.
  - Entries open in the last three weeks of December; enter any saved perfume within the safety limits from the newspaper.
  - At the turn of the year the judges score structure, balance, originality (against every brief and lesson) and cost. They give their remarks in words and award Gold, Silver, Bronze or Commended, with coins and reputation.

### Prompt 13: Direction change #2, Phase F

Continued from Prompt 12 ("continue through remaining steps without pause").

Phase F from **Direction change #2**: analysis lab, reconstruction challenges, 1000 parts, formula export and import.

How it was built (Oct 28, 2026):

- **Analysis lab:** a back-room tab, inspired by gas chromatography.
  - Bought in three levels: a bench chromatograph shows a sample's two biggest components, a longer column the four biggest, and a mass spectrometer every component with rough percentages.
  - Each run costs a few coins.
  - The lab shows materials, not molecules; a simplification.
- **Reconstruction challenges:** seven well-known styles under invented names, each described by its public structure (top, heart, base), appearing as reputation grows.
  - Eau Impériale du Square (an 18th-century cologne)
  - Green Bracken (a 19th-century fougère)
  - Mousse d'Or (a 1917-style chypre)
  - Ambre Lointain (a 1920s amber)
  - Ballroom Aldehydes (a 1920s aldehydic floral)
  - Ocean Linen (a 1990s fresh musk)
  - Modern Woods (a 2000s woody amber)

  Analyse the sample, rebuild it at the organ, and it is compared at once. Three stars pays a one-time reward.
- **1000 parts:** masters work in 10, 100 or 1000 parts, adding 1, 10, 50 or 100 parts a tap. 100-part formulas scale up to 1000.
- **Formula export:** every saved formula has a formula sheet.
  - The sheet lists each material, its dilution, parts, share and the grams to weigh for 10, 50 or 100 g of concentrate, plus how much alcohol makes it a 10% wearable.
  - It can be copied or downloaded as text.
- **Import:** paste one of your real formulas into the Book (My formulas), one material a line ("Bergamot, 30", "Oakmoss 2 at 10%", or a sheet's own lines). It opens on the organ with its simulated drydown, and anything it can't match is listed.
- Tapping any button now ends typing in a text box, so panels update straight away on a phone.

### Prompt 3 (original): clients and reviews

```
Step 3: clients. Briefs written as memories, each with a hidden target
(families, mood, strength, longevity). Score the three drydown stages
against the target. First impression immediately; the full review
arrives later in game time and says which stage let it down. Money
and reputation, and two or three regulars who remember past perfumes.
Deploy and give me the link.
```

### Prompt 4 (original): the world map

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
