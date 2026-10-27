import './style.css';
import { recognizeAccords } from './game/accords';
import { content, materialsById, validateContent } from './game/content';
import { addParts, totalParts } from './game/formula';
import { characterOptions, defaultCharacter, randomCharacter, type CharacterConfig } from './game/character';
import { shop, validateShop } from './game/shop';
import { CharacterKit } from './scene/characters';
import { ShopScene } from './scene/shopScene';
import { commit, onChange, setDraft, state, type Screen } from './state';
import { bookScreen } from './ui/book';
import { creatorScreen } from './ui/creator';
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
  customer: (index) => {
    scene.waveCustomer(index);
    state.ui.toast = 'A customer waves hello. Conversations, sometimes with a hint about what they would like, arrive with the clients step.';
    commit();
  },
});

let kit: CharacterKit | null = null;
let playerBuild = Promise.resolve();

function currentLook(): CharacterConfig {
  return state.save.character ?? defaultCharacter(kit!.style);
}

/** Rebuilds the player's model; builds run one after another so the last change wins. */
function refreshPlayer(): void {
  if (!kit) return;
  const look = currentLook();
  playerBuild = playerBuild.then(() => scene.setPlayer(kit!, look)).catch((e) => console.error(e));
}

CharacterKit.load(characterOptions.kit, characterOptions.style)
  .then(async (loaded) => {
    kit = loaded;
    refreshPlayer();
    const looks = Array.from({ length: characterOptions.customers.count }, () => randomCharacter(loaded.style, characterOptions, Math.random));
    await scene.setCustomers(loaded, looks, Math.random);
    if (!state.save.character) openPanel('creator');
  })
  .catch((e) => {
    console.error(e);
    state.ui.toast = 'Characters could not load. Check your connection and reopen the app.';
    commit();
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
  scene.focusOnPlayer(screen === 'creator');

  const panel = panelRoot.querySelector<HTMLElement>('.panel');
  const scroll = panel && !scrollToTop ? panel.scrollTop : 0;
  scrollToTop = false;
  if (screen === 'shop') {
    panelRoot.innerHTML = '';
    return;
  }
  if (screen === 'creator') {
    if (!kit) return;
    // No backdrop: the player stays visible above the panel while you change their look.
    panelRoot.innerHTML = `<section class="panel panel--creator">${creatorScreen(kit.style, currentLook(), state.ui.creatorTab)}</section>`;
  } else {
    panelRoot.innerHTML = `<div class="panel-backdrop" data-action="close-panel"></div>
    <section class="panel">${screen === 'organ' ? organScreen() : bookScreen()}</section>`;
  }
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
      if (ui.screen === 'creator' && kit) save.character = currentLook();
      ui.screen = 'shop';
      ui.detail = null;
      break;
    case 'look-tab':
      ui.creatorTab = target.dataset.value!;
      break;
    case 'look-fit':
    case 'look-part':
    case 'look-color': {
      if (!kit) return;
      const look = structuredClone(currentLook());
      const { key, value } = target.dataset as { key: string; value: string };
      if (action === 'look-fit') look.fit = value;
      else if (action === 'look-color') look.colors[key] = value;
      else if (value) look.parts[key] = value;
      else delete look.parts[key];
      save.character = look;
      refreshPlayer();
      break;
    }
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
