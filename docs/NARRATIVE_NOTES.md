# Narrative notes (Oct 28, 2026)

Sean's description of the game as a story, and how it lines up with what's built. **Notes only: nothing here is built yet, and `docs/SPEC.md` stays the source of truth until Sean decides what to adopt.**

## Sean's vision, as notes

1. **Opening cutscene.** The main character works a dead-end job (a warehouse). Word comes from an uncle: the grandmother's perfume shop, which he has been liquidating, passes to you. He offers to liquidate the rest for money, or you can reopen it. You reopen it.
2. **The shop starts nearly empty**, because the uncle sold most of it. That's why it needs furniture.
3. **An old man who knew your grandmother** comes in on day one. He's a master perfumer but only hints at it. He has you make his favourite perfume, a simple **bergamot, labdanum and vanilla accord**, and teaches you how a perfume is built and what an accord is.
4. **Grandma's old stash:** you find a few more supplies and make more simple accords, for customers or the old man.
5. **Then suppliers open.** They restock bergamot, labdanum and vanillin, plus **one or two new ingredients of your choosing** (enough for another accord or two).
6. **After a few days of simple accords for customers who just want something wearable**, you unlock **your own products**: a custom perfume to stock the shelves, which starts passive sales. You tinker with the formula until you like it. More shelves bring more slots.
7. **Customers' demands grow:** simple accords, then accord combinations and altered accords, then full perfumes.
8. **Three systems feed each other:** customer orders, house perfumes, and **competitions** that take your custom perfumes and act as **checkpoints** on your journey as a perfumer.
9. **Very narrative and cozy.** Regulars (the old man and others) slowly reveal their backstories, and things about your grandmother, perhaps something a little tragic.

## What already fits

- **Inheriting the grandmother's shop and reopening it** is the current story (Mireille, her shop on the square).
- **Her stash:** the game starts with her three bottles on the organ, and crates are already a mechanic in the back room.
- **The first perfume is almost exactly the old man's accord.** Henri's winter amber is labdanum, vanillin and bergamot, and the junior exam's accord is "the classic amber accord".
- **Accords as lessons:** accords are taught as lessons in her book and can be saved as bases.
- **Suppliers reopening:** her growers' letters and her chemist reopen routes, and you choose whose letter to answer next.
- **House perfumes** unlock early (reputation 4 plus eight materials in stock, i.e. enough to freestyle), sell passively with daily reports, and get more slots from shelves. Tinkering is natural: make a new formula, put it up and take the old one down.
- **Customers asking for more over time:** ranks move customers from 10-part to 100-part perfumes with stricter judging, and later briefs need more materials.
- **Competitions:** the yearly Town Perfume Awards judge any perfume on structure, balance, originality and cost, which is close to the house-perfume rating.
- **Backstories and grandmother lore:** townspeople's memories of her, growers' letters about her, margin notes, and clues to her own perfume leading to an epilogue that reflects your path.
- **Cozy:** no ads, no energy timers; time only for real things.

## Conflicts and gaps

| # | Your vision | What's built | Suggestion |
| - | ----------- | ------------ | ---------- |
| 1 | Warehouse-job cutscene; the uncle; a choice to liquidate or reopen | A short intro: her letter in the book, then "Open the shop". No uncle, no choice. | Add the uncle as a character (a letter or call, later a visitor). Make the choice real but gentle: "liquidate" gives a short bittersweet ending with an offer to start again, or the uncle says "sleep on it" and the game goes on. Cutscene pictures are art: text panels until illustrations exist (ASSETS_NEEDED). |
| 2 | The shop starts nearly empty | Starts with a counter, organ, shelves, tables, a rug, a lamp and bookcases | Strip it to the organ, the counter and a bare shelf; everything else comes back through furniture, which you already buy and place. |
| 3 | An old master perfumer mentor who hints at it | No mentor. Henri (a clockmaker) asks for the amber; "examiners" run the rank exams. | **A new character** whose favourite is the bergamot–labdanum–vanilla accord. He could quietly be the examiner, and the awards' founder or judge (fits "hints"). Henri keeps his own story, or his amber becomes the mentor's. |
| 4 | Vanilla on day one for his accord | Day one has bergamot, lavender and labdanum; vanillin comes from Josette in week 1 (also in the spec) | Grandma's stash includes vanillin, or the mentor brings a vial. Josette then needs a different gift. |
| 5 | A guided first lesson in how perfume is built | No tutorial: you're dropped at the organ with a customer | The mentor's first visit is a scripted tutorial: top, heart and base, parts, what an accord is, then hand it over. |
| 6 | Suppliers open after a few simple accords | Four letters are waiting at minute one | Hold the letters until the tutorial and a few accords are done. The mentor could suggest writing to them. |
| 7 | Restocks include one or two **new ingredients you choose** | Materials unlock by reputation in historical tiers (8–23 at a time) | Keep the historical order but let you **pick** 1–2 from the next tier each time, steered towards a new accord ("Pick what you'd need for a fougère"). The biggest system change here. |
| 8 | Customers want simple accords → combos/altered accords → full perfumes | Every brief is a full perfume (3–7 materials) from the start; the size of the order changes with rank, not its kind | Tag briefs by kind (accord, combination, altered accord, full perfume) and open each kind by chapter or rank. Early briefs become 2–3 material accords. |
| 9 | Custom products after "a few days" | Reputation 4 plus eight materials (possible within the first real hour) | Gate on a story beat as well: the mentor suggests a house perfume once you've made a handful of accords. |
| 10 | Competitions as **checkpoints** | One award a year, about every 52 real days; rank exams are the checkpoints | Make competitions the checkpoints: seasonal (about every 13 real days), each with a theme and an entry bar, and passing one moves you up a rank. Merge the exams into them, or keep exams for nose identification only. |
| 11 | Regulars reveal backstories over many visits | Regulars have a one-line description and a few briefs; story townspeople give clues about her perfume | Give each regular, and the mentor and uncle, a chain of short scenes unlocked by visits. A gentle tragedy around the grandmother (why the shop closed, the uncle's grief or money troubles, the mentor's history with her) would tie into her signature perfume. |
| 12 | "His uncle", a male main character | You design your character; the game never assumes a gender | Keep the text neutral (works for any character), or add a pronoun choice in the creator. |
| 13 | Three main systems | Also nose training, the compendium, harvest contracts and routes, the lab and reconstructions, formula sheets, her signature perfume and its jar | Not in conflict, but worth deciding which stay central and which become side activities, so the three loops stay clear. |

## Questions for Sean

1. What happens if the player chooses to liquidate?
2. Is the mentor a new character, or does an existing one (Henri) become him?
3. Should competitions replace the rank exams, or sit beside them?
4. Should picking new ingredients replace the reputation tiers, or work within them?
5. Does her signature perfume and its epilogue stay as the ending?
