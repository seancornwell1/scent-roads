# Fact check

Facts Sean should confirm against the perfumery course. When a fact is confirmed, set `"verified": true` in its data file and move it to **Confirmed**.

No data files exist yet. The items below come from the draft region table and processing list in `docs/SPEC.md`; they will become data in steps 2 and 4.

## To confirm

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
