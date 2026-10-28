# Fact check

Facts Sean should confirm against the perfumery course. When a fact is confirmed, set `"verified": true` in its data file and move it to **Confirmed**.

Each data file entry has `"verified"` and a `"check"` list naming the fields to confirm. To confirm one, fix the value if needed, remove the field from `check`, and set `"verified": true` once `check` is empty. A test fails if an unverified entry is missing from this file.

Facts from your formula log and roadmap (course roles) count as course-backed. Everything else was written by Claude from general knowledge.

**Oct 27, 2026:** every material's `character` and `behaviour` text was rewritten by Claude in standard perfumery terms, replacing your personal notes (which stay in `docs/COURSE.md`). These are widely used descriptions, so they're not all listed below one by one; please skim them in the game's material info and flag anything that doesn't match your course. Oakmoss's IFRA note is listed below.

Not facts: each material's `model.strength` and `model.halfLifeHours` are game tuning, not measurements. They are tuned so the drydown matches the observations in your formula log, and tests check that it does (`src/game/evaporation.test.ts`).

## Materials — `src/data/materials.json`

| id | Material | To confirm (current value) | Course |
| -- | -------- | -------------------------- | ------ |
| `labdanum` | Labdanum resinoid | **origin.region**: Spain (Andalusia) | Course mission 01 |
| `iso-e-super` | Iso E Super | **layer**: base | Course mission 01 |
| `stemone` | Stemone | **layer**: heart | Course mission 02 |
| `gamma-octalactone` | Gamma octalactone | **layer**: heart | Course mission 02 |
| `gamma-decalactone` | Gamma decalactone | **layer**: heart | Course mission 02 |
| `cedarwood-virginia` | Cedarwood Virginia | **origin.region**: Southeastern United States | Course mission 02 |
| `coumarin` | Coumarin | **family**: gourmand | Course mission 03 |
| `oakmoss` | Oakmoss absolute | **origin.region**: Balkans and Morocco<br>**behaviour**: restricted by IFRA because it can cause skin sensitisation | Course mission 03 |
| `lavender` | Lavender | **origin.region**: France (Provence) | Course mission 04 |
| `dihydromyrcenol` | Dihydromyrcenol | **family**: aromatic | Course mission 04 |
| `aldehyde-c11` | Aldehyde C-11 undecylenic | **layer**: top<br>**volatility**: high | Course mission 06 |
| `allyl-amyl-glycolate` | Allyl amyl glycolate | **family**: green<br>**character**: Sharp, green and fruity, like pineapple skin and galbanum.<br>**volatility**: high | October order (outside the roadmap) |
| `black-tea` | Black tea SFE | **family**: aromatic<br>**layer**: heart<br>**character**: Dark, dry tea leaf with smoky, hay-like and slightly leathery facets. | October order (outside the roadmap) |
| `beta-damascone` | Beta-damascone | **character**: Rosy and fruity, like plum, blackcurrant and apple, with a hint of tobacco. Extremely strong; used in trace.<br>**family**: fruity | October order (outside the roadmap) |
| `beta-ionone` | Beta-ionone | **character**: Violet and orris with a woody, slightly fruity edge. | October order (outside the roadmap) |
| `delta-decalactone` | Delta-decalactone | **character**: Creamy, milky coconut with a soft peach note.<br>**layer**: base | October order (outside the roadmap) |
| `douglas-fir` | Douglas fir needle | **family**: woody<br>**character**: Fresh, sweet conifer needles; green and slightly citrusy.<br>**origin.region**: Pacific Northwest, North America | October order (outside the roadmap) |
| `isobornyl-acetate` | Isobornyl acetate | **family**: woody<br>**character**: Pine needles and camphor, clean and balsamic. | October order (outside the roadmap) |
| `pink-pepper` | Pink peppercorn | **character**: Fresh, rosy pepper with a juicy, slightly citrus lift.<br>**origin.plant**: Schinus molle or Schinus terebinthifolius (berries)<br>**origin.region**: Varies by supplier (e.g. Réunion, Peru) | October order (outside the roadmap) |
| `jasmine` | Jasmine absolute | **origin.region**: Grasse, France | Added in step 5 (spec region) |
| `rose-centifolia` | Rose de mai absolute | **origin.region**: Grasse, France<br>**character**: Rich, honeyed, deep rose with a green, slightly waxy edge. | Added in step 5 (spec region) |
| `tuberose` | Tuberose absolute | **origin.region**: Grasse, France | Added in step 5 (spec region) |
| `vetiver` | Vetiver | **behaviour**: A deep, very tenacious base; Haitian vetiver is known for being clean and bright. | Added in step 5 (spec region) |
| `frankincense` | Frankincense | **layer**: heart<br>**family**: amber | Added in step 5 (spec region) |

## Accords — `src/data/accords.json`

| id | Accord | To confirm | Course |
| -- | ------ | ---------- | ------ |
| `cologne` | Cologne | **definition**: mostly citrus (at least 40% of the formula) with aromatic herbs (at least 5%) and a light base (base layer at most 15%). Not in your course yet; written from general knowledge. | Not in the roadmap |

The minimum percentages in every accord's requirements (e.g. labdanum and vanillin at least 15% each for amber) are game tuning, not course facts.

## Regions and seasons — `src/data/regions.json`

Seasons are the months a harvest contract can be signed. Grow times, quality windows, yields and costs are game tuning, not facts.

| crop | To confirm | Region quirk shown in the game (also to confirm) |
| ---- | ---------- | ----------------------- |
| `calabria/bergamot` | **season**: Nov, Dec, Jan, Feb, Mar | Bergamot is a winter citrus; the oil is cold-pressed from the peel. |
| `provence/lavender` | **season**: Jun, Jul, Aug | Lavender is cut in high summer, when the fields are in full flower. |
| `andalusia/labdanum` | **season**: Jun, Jul, Aug, Sep | Rockrose sweats its sticky labdanum gum in the summer heat. |
| `grasse/jasmine` | **season**: Aug, Sep, Oct | Jasmine is picked at dawn: late picks lose quality fast. |
| `grasse/tuberose` | **season**: Jul, Aug, Sep, **region**: Grasse, France | Jasmine is picked at dawn: late picks lose quality fast. |
| `bulgaria/rose-damascena` | **season**: May, Jun | A short harvest window in late spring; roses are picked in the early morning. |
| `haiti/vetiver` | **region**: Les Cayes, Haiti | Vetiver roots are dug up all year round; the oil is earthy and smoky. |
| `indonesia/patchouli` | **region**: Aceh, Sumatra, Indonesia, **season**: Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec | Patchouli leaves are dried and fermented before distilling, and the oil improves with age. |
| `madagascar/vanilla` | **season**: Jun, Jul, Aug, Sep | Vanilla pods need months of curing before they're usable. |
| `oman/frankincense` | **season**: Mar, Apr, May, Jun, Jul, Aug, Sep | Frankincense resin is tapped from the trees and collected over weeks as it hardens. |
| `reunion/pink-pepper` | **season**: May, Jun, Jul, Aug, **region**: Réunion, France (overseas) | Pink peppercorns are the berries of the Brazilian pepper tree. |
| `virginia/cedarwood-virginia` | **region**: Virginia & the Carolinas, United States | Cedarwood oil is distilled from sawmill wood, so it's available all year. |
| `balkans/oakmoss` | **season**: Oct, Nov, Dec, Jan, Feb, Mar, Apr, **region**: The Balkans, North Macedonia & Bosnia | Oakmoss is a lichen gathered from oak bark in the damp months. |
| `pacific-northwest/douglas-fir` | **season**: Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec | Douglas fir needles are distilled from the forest's prunings. |
| `assam/black-tea` | **region**: Assam, India, **season**: Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov | Tea is plucked in flushes from spring to late autumn. |

## Processing — `src/data/processes.json`

Times, yields, quality and costs are game tuning. The descriptions below are the facts to confirm.

| id | To confirm |
| -- | ---------- |
| `solvent-extraction` | Solvent extraction: **about**: A solvent draws out a waxy concrete, which is washed into an absolute. Slower and pricier, but richer. |
| `co2-extraction` | CO₂ extraction: **about**: Supercritical carbon dioxide gently extracts a very true-to-nature oil. Slow and costly. |
| `enfleurage` | Enfleurage: **about**: Flowers laid on fat for days, replaced again and again. Very slow, tiny yield, the finest result. Almost never done today. |
| `curing` | Curing, then extraction: **gameHours**: 2160 |

## Original spec claims (checked against the step 5 data above)


| # | Claim (from the spec) | Notes from Claude | Will live in |
| - | --------------------- | ----------------- | ------------ |
| 1 | Grasse grows jasmine, rose centifolia and tuberose | Jasmine and rose centifolia: yes. Tuberose was historically grown around Grasse, but today it is mostly sourced from India; Grasse production is small for all three. | regions |
| 2 | Jasmine is picked at dawn; late picks lose quality | Widely reported: flowers open overnight and are picked early, before heat degrades the scent. | regions / materials |
| 3 | Bulgarian rose damascena has a short late-spring harvest | Commonly given as roughly mid-May to mid-June, picked in the early morning. Exact window to confirm. | regions |
| 4 | Calabrian bergamot: winter harvest, cold-pressed peel | Commonly given as roughly November to March. | regions / processes |
| 5 | Haitian vetiver roots are harvested year-round | Believed true; confirm. | regions |
| 6 | Patchouli leaves are dried and aged before distilling; age improves it | Leaves are dried (often lightly fermented) before steam distillation, and the oil is known to improve with age. Confirm whether "age improves it" should apply to leaves, oil, or both. | materials / processes |
| 7 | Madagascar vanilla needs months of curing | Curing (blanching, sweating, drying, conditioning) takes several months. Confirm the duration to model. | materials / processes |
| 8 | Frankincense from Somalia / Oman, resin tapped and collected over weeks | Resin is tapped by scoring the bark, then left to harden for some weeks before collection. Species differ by region (e.g. Boswellia sacra in Oman). | regions / materials |
| 9 | Steam distillation is fast and gives an essential oil | Gives an essential oil; "fast" is relative to extraction and enfleurage. | processes |
| 10 | Cold pressing is citrus only | True in practice for perfumery (expression of citrus peels). | processes |
| 11 | Solvent extraction is slower, gives an absolute, richer and pricier | It first gives a concrete, then an absolute after alcohol washing. "Slower" and "pricier" to confirm. | processes |
| 12 | Enfleurage is very slow, small yield, top quality | Very slow and labor-intensive; today it is essentially obsolete commercially. "Top quality" is a game simplification to confirm. | processes |
| 13 | Patchouli, vanilla and resins improve the longer they sit (tincture and aging) | Plausible for these materials; confirm which to model as improving and roughly how fast. | processes |

## Confirmed

None yet.
