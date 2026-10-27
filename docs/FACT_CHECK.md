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

## Accords — `src/data/accords.json`

| id | Accord | To confirm | Course |
| -- | ------ | ---------- | ------ |
| `cologne` | Cologne | **definition**: mostly citrus (at least 40% of the formula) with aromatic herbs (at least 5%) and a light base (base layer at most 15%). Not in your course yet; written from general knowledge. | Not in the roadmap |

The minimum percentages in every accord's requirements (e.g. labdanum and vanillin at least 15% each for amber) are game tuning, not course facts.

## Regions and processes — from the spec, data arrives in step 4

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
