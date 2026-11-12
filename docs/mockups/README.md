# Mock-ups (Nov 12, 2026)

Still pictures to judge a look before anything is built. Nothing in this folder is loaded by the game.

| Picture | Page | What it shows |
| ------- | ---- | ------------- |
| `bench-mockup.png` | `bench.html` | The counter round as a mixing bench: a rack of dropper bottles, a beaker on a scale, the pipette in hand, the radar and the formula slip |
| `shop-mockup.png` | `shop.html` | The Shop panel as a catalogue with pictures of the furniture |
| `hud-mockup.png` | `shop.html?panel=0` | The HUD as plaques and badges, and the scene labels, over the shop |

- `theme.css` is the draft theme: the colours are the rooms' Blender palette (`blender/lib.py`).
- The bench is a Blender render (`blender/previews/bench-mockup.png`) and `bench-points.js` says where its bottles, name plates and scale display are in the picture; both are written by `blender/bench-mockup.py`. In the game the bench would be made of rendered image files, with the names and counts set on them as here.
- `thumbs/` are the buyable furniture models rendered one by one (`blender/mockup-thumbs.py`). `scene.png` is a screenshot of the game with its HUD hidden.
- The pages load three fonts from Google Fonts (Fraunces, Nunito, Caveat) in the browser, to try them. None is in the repo; before any is added it needs Sean's OK, a licence check and a row in `CREDITS.md`.
- The numbers in the Shop picture (coins, reputation, what is placed) are made up to show every state of a card. Names, prices, appeal and reputation are the game's.
- The bench practice shown (a pipette per bottle, drops counted into a beaker on a scale, smelling strips) has not been checked against the course. If the bench is built, it goes in `docs/FACT_CHECK.md` first.

To retake the pictures, open a page at 462 × 1000 in a browser and screenshot it.
