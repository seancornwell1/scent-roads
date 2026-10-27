import './style.css';
import { recognizeAccords } from './game/accords';
import { content, materialsById, validateContent } from './game/content';
import { addParts, totalParts } from './game/formula';
import { shop, validateShop } from './game/shop';
import { ShopScene } from './scene/shopScene';
import { commit, onChange, setDraft, state, type Screen } from './state';
import { bookScreen } from './ui/book';
import { hud } from './ui/hud';
import { organScreen } from './ui/organ';

const hudRoot = document.querySelector<HTMLDivElement>('#hud')!;
const panelRoot = document.querySelector<HTMLDivElement>('#panel-root')!;

const problems = [...validateContent(content), ...validateShop(shop)];
if (problems.length > 0) console.error('Content problems:\n' + problems.join('\n'));

// What tapping each interactive fixture does once the player reaches it (from shop.json).
const FIXTURE_ACTIONS: Record<string, () => void> = {
  organ: () => openPanel('organ'),
  'back-room': () => {
    state.ui.toast = 'The back room is a placeholder for now. The world map moves in here in a later step.';
    commit();
  },
};

const scene = new ShopScene(document.querySelector<HTMLDivElement>('#scene')!, shop, {
  arrive: (fixture) => fixture.interact && FIXTURE_ACTIONS[fixture.interact.action]?.(),
});

let scrollToTop = false;

function openPanel(screen: Screen): void {
  state.ui.screen = screen;
  state.ui.detail = null;
  state.ui.toast = null;
  scrollToTop = true;
  commit();
}

function render(): void {
  const { screen } = state.ui;
  hudRoot.innerHTML = hud();
  scene.enabled = screen === 'shop';

  const panel = panelRoot.querySelector<HTMLElement>('.panel');
  const scroll = panel && !scrollToTop ? panel.scrollTop : 0;
  scrollToTop = false;
  if (screen === 'shop') {
    panelRoot.innerHTML = '';
    return;
  }
  panelRoot.innerHTML = `<div class="panel-backdrop" data-action="close-panel"></div>
    <section class="panel">${screen === 'organ' ? organScreen() : bookScreen()}</section>`;
  panelRoot.querySelector<HTMLElement>('.panel')!.scrollTop = scroll;
}

document.body.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!target) return;
  const { action, id } = target.dataset;
  const { ui, save } = state;

  switch (action) {
    case 'nav':
      return openPanel(target.dataset.to as Screen);
    case 'close-panel':
      ui.screen = 'shop';
      ui.detail = null;
      break;
    case 'dismiss-toast':
      ui.toast = null;
      break;
    case 'tab':
      ui.organTab = target.dataset.tab as typeof ui.organTab;
      scrollToTop = true;
      break;
    case 'browse':
      ui.browseBy = target.dataset.by as typeof ui.browseBy;
      break;
    case 'step':
      ui.step = Number(target.dataset.step);
      break;
    case 'add':
    case 'inc':
      return setDraft(addParts(save.draft, id!, ui.step));
    case 'dec':
      return setDraft(addParts(save.draft, id!, -ui.step));
    case 'detail':
      ui.detail = id!;
      break;
    case 'close-detail':
      ui.detail = null;
      break;
    case 'dismiss-accords':
      ui.newAccords = [];
      break;
    case 'clear':
      if (totalParts(save.draft) > 0 && confirm('Clear every material off the organ?')) setDraft({});
      return;
    case 'save': {
      if (totalParts(save.draft) === 0) return;
      const input = document.querySelector<HTMLInputElement>('#save-name');
      const name = input?.value.trim() || `Formula ${save.formulas.length + 1}`;
      const now = Date.now();
      save.formulas.push({
        id: `f${now}`,
        name,
        parts: { ...save.draft },
        accords: recognizeAccords(save.draft, content.accords, materialsById).map((a) => a.id),
        createdAt: now,
      });
      return openPanel('book');
    }
    case 'load-formula': {
      const formula = save.formulas.find((f) => f.id === id);
      if (!formula) return;
      ui.screen = 'organ';
      ui.organTab = 'formula';
      scrollToTop = true;
      return setDraft({ ...formula.parts });
    }
    case 'delete-formula': {
      const formula = save.formulas.find((f) => f.id === id);
      if (formula && confirm(`Delete "${formula.name}"?`)) save.formulas = save.formulas.filter((f) => f.id !== id);
      break;
    }
    default:
      return;
  }
  commit();
});

onChange(render);
render();
