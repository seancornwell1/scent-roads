# Course order and bench inventory

The game unlocks materials and accords in the order of Sean's perfumery course (see **Decisions** in `docs/SPEC.md`). This file is the reference for that order. It summarizes the course roadmap and formula log; the source PDFs stay out of the repo.

Facts here come from Sean's own course notes, so they count as course-confirmed. Anything Claude adds beyond them still needs a `verified` flag and an entry in `docs/FACT_CHECK.md`.

## Where Sean is now (Oct 27, 2026)

- Mission 01 (amber) done; Mission 02 (fig) in progress, paused for Christmas gift drafts.
- The game starts with her bench of three (bergamot, lavender, labdanum); vanillin comes back in the first game week with a customer (Direction change #2, Oct 28, 2026). Since Phase C (Oct 28, 2026) the rest unlock in roughly historical order as reputation grows, not course order (see "Materials and how they unlock" in `docs/SPEC.md`). The inventory below is reference only.

## Course methods worth modelling

These map directly onto game mechanics.

- **Three smelling moments.** Every material is studied on a blotter at 5 minutes, 1 hour and the next morning. The game's opening / about an hour / drydown stages mirror this.
- **Formulas in parts per 100** of actual material, never grams of stock.
- **The accord ladder.** Two materials at nine ratios, 90:10 through 10:90; pick a winner and a runner-up, then add a third material at 10, 20 and 30% of total.
- **Strength mismatches.** At equal dilution some materials swamp others (Stemone over gamma octalactone, gamma decalactone over phenylethyl alcohol), so the winning ratio is rarely 50:50.
- **Maceration.** Blends are left 7–14 days in the dark before judging; fresh blends smell harsh and then settle.
- **Wearables** are 10% total material in perfumer's alcohol, built from stock, not from 10% working dilutions.
- **Olfactory fatigue** sets in after about six to eight blotters; five materials per session at most.

## Phase 1 missions

| # | Mission | Accord | Materials on the roadmap | Status |
| - | ------- | ------ | ------------------------ | ------ |
| 01 | The amber accord | Amber: labdanum + vanillin, bergamot on top | Labdanum resinoid, vanillin, bergamot EO (Calabria), Iso E Super, Ambroxan | Done |
| 02 | Fig and lactones | Fig; fig–amber | Stemone, cis-3-hexenol, gamma-nonalactone, gamma-undecalactone, cedarwood Virginia, Ligustral | In progress (bought gamma octalactone and gamma decalactone instead of nonalactone and undecalactone; no Ligustral yet) |
| 03 | Chypre | Chypre: bergamot, labdanum, oakmoss, patchouli | Oakmoss absolute (untreated), patchouli EO, Hedione, phenylethyl alcohol, benzyl acetate, coumarin | Hedione, PEA and coumarin owned; oakmoss, patchouli, benzyl acetate not yet |
| 04 | Fougère | Fougère: lavender, coumarin, oakmoss, bergamot | Lavender EO (or lavandin), geranium EO, dihydromyrcenol, eugenol, Evernyl, Cashmeran | Lavender, dihydromyrcenol, Cashmeran owned |
| 05 | Dry woods | Dry woods | Sandalore (or Javanol), vetiver EO (Haiti), cypriol / nagarmotha, Norlimbanol, guaiacwood, birch tar | Not started |
| 06 | Metal, dust, aldehydes → Brass v0.1 | Brass | Aldehyde C-11 undecylenic, methyl heptine carbonate, orris (Givco 204/20 or alpha-irone), geosmin, ethylene brassylate, isobutyl quinoline | Aldehyde C-11 and ethylene brassylate owned |

Phase 2 (sketched, order not fixed): 07 florals (rose and jasmine from parts), 08 musks and fixatives, 09 gourmand and tobacco, 10 leather and smoke, 11 reproduction of Thé Noir 29, 12 reproduction of Radio Bombay or By the Fireplace.

## Current bench inventory

26 materials. Reference only; all of them are in the game, unlocked over time.

| Material | Stock as bought | Level | Course mission | Notes |
| -------- | --------------- | ----- | -------------- | ----- |
| Labdanum resinoid | 50% in TEC | Out (a little 10% working left) | 01 | Restocking Oct 29 |
| Bergamot EO | neat | Out | 01 | Restocking Oct 29 |
| Vanillin crystals | 99% | ~85 g of 100 g | 01 | Plus 20% and 10% stocks |
| Iso E Super | neat | ~¼ | 01 | Half spilled, then used |
| Ambroxan | 10% in DPG | Mostly full | 01 | Barely used |
| Hedione | neat | ~½ | 03 | In nearly everything lately |
| Lavender EO | neat | ~½ | 04 | |
| Cedarwood Virginia | neat | ~⅓ | 02 | |
| Cashmeran | neat | Mostly full | 04 | Used at 1–4 parts |
| Coumarin | 10% in DPG | ~½ | 03 | |
| Dihydromyrcenol | neat | Mostly full | 04 | Barely used |
| Phenylethyl alcohol | neat | ~½ | 03 | |
| Stemone | neat | ~½ | 02 | |
| Gamma octalactone | neat | Low, ~¼ | 02 | Bought for the fig in place of gamma-nonalactone |
| Gamma decalactone | neat | ~⅔ | 02 | Bought for the fig in place of gamma-undecalactone |
| cis-3-Hexenol | neat | Mostly full | 02 | Trace use |
| Aldehyde C-11 | neat | Full | 06 | |
| Ethylene brassylate | neat | Full ×2 | 06 | |
| Allyl amyl glycolate | neat | Full ×2 | — (October order) | |
| Black tea SFE | neat | Full | — (October order) | |
| Beta-damascone | neat | Full ×2 | — (October order) | |
| Beta-ionone | neat | Full ×2 | — (October order) | |
| Delta-decalactone | neat | Full | — (October order) | |
| Douglas fir needle EO | neat | Nearly full | — (October order) | Kept in the fridge |
| Isobornyl acetate | neat | Full | — (October order) | |
| Pink peppercorn | neat | Full | — (October order) | |

Materials marked "October order" came in for the Christmas gift drafts and are outside the Phase 1 roadmap; several fit Phase 2 (beta-damascone for 07 florals).

## Sean's material notes

Descriptors and behaviour from the formula log. Reference only: the game uses standard descriptors (see `src/data/materials.json`), and unlocks materials through `src/data/unlocks.json` rather than this inventory.

| Material | What it smells like | Behaviour learned |
| -------- | ------------------- | ----------------- |
| Bergamot | Bright citrus zest, floral background | Gone in 10–30 minutes; doubling it gives a louder opening, not a longer one |
| Vanillin | Warm, straightforward vanilla | Strong up close, little reach; outlives everything and dominates late drydowns |
| Labdanum | Hazelnut, toffee, new baseball glove, coffee and caramel | At 70% of an accord it turns "vitamin B" and invades personal space |
| Iso E Super | Neutral mustiness, then velvety and woodsy | Made the fig musty |
| Ambroxan | Like Iso E but wider and warmer; takes up space | Inaudible at 2 parts |
| Cedarwood Virginia | Sappy, cutting wood | Grows in share as a blend ages; too sappy at 10 parts in amber |
| Lavender | Astringent, almost menthol, camphor | Needs about twice its weight of vanillin to stop reading medicinal |
| Coumarin | Wet paper, cardboard, hay, almond; very strong | Drowns a blend at 5 parts; useful range 1–3 |
| Hedione | Faint, sweet, honeyed floral | Brightened bergamot and made the base louder and longer |
| Cashmeran | Wet paper, musk, a little spicy tang | Made the amber deeper and fuller at 2 parts |
| Dihydromyrcenol | Witch hazel, menthol, violet | Ate the amber at 2 parts; context decides |
| cis-3-Hexenol | Cut grass with pear underneath | Becomes an effect rather than a note after maceration |
| Stemone | Dirt and woodiness ("grassy knees on jeans"); minty at strength | Mint top burns off overnight, leaving green grass |
| Gamma octalactone | Fatty, creamy coconut | Cloying in late drydown at 56 parts |
| Gamma decalactone | Peach in cream, easily cloying | Much stronger than PEA at equal dilution |
| Phenylethyl alcohol | Imitation rose, rose liquor | |

## Accords Sean has built

| Accord | Formula (parts / 100) |
| ------ | --------------------- |
| Amber base (the control) | Vanillin 35, labdanum 35, bergamot 30 |
| Fig accord | Stemone 24, gamma octalactone 56, cedarwood 20 |
