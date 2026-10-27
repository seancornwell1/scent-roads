import './style.css';
import { recognizeAccords } from './game/accords';
import { content, materialsById, validateContent } from './game/content';
import { addParts, totalParts } from './game/formula';
import { characterOptions, defaultCharacter, randomCharacter, type CharacterConfig } from './game/character';
import { clients, findBrief } from './game/clients';
import { completeReview, handOver, tick, type Visit } from './game/customers';
import { seededRandom } from './game/random';
import { scorePerfume } from './game/scoring';
import { setTimeSpeed } from './game/time';
import { tierIndex, unlocks } from './game/unlocks';
import { shop, validateShop } from './game/shop';
import { CharacterKit } from './scene/characters';
import { ShopScene } from './scene/shopScene';
import { commit, onChange, setDraft, state, type Screen } from './state';
import { bookScreen } from './ui/book';
import { creatorScreen } from './ui/creator';
import { customerScreen, reactionScreen, regularOf, unlockScreen } from './ui/customer';
import { hud } from './ui/hud';
import { organScreen } from './ui/organ';

const hudRoot = document.querySelector<HTMLDivElement>('#hud')!;
const panelRoot = document.querySelector<HTMLDivElement>('#panel-root')!;

// Testing aid: ?speed=60 makes game time (reviews, arrivals) pass 60 times faster.
const speed = Number(new URLSearchParams(location.search).get('speed'));
if (speed > 0) setTimeSpeed(speed);

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

const scene = new ShopScene(
  document.querySelector<HTMLDivElement>('#scene')!,
  shop,
  {
    arrive: (fixture) => fixture.interact && FIXTURE_ACTIONS[fixture.interact.action]?.(),
    customer: (id) => {
      scene.waveCustomer(id);
      state.ui.visitId = id;
      openPanel('customer');
    },
  },
  clients.timing.browseSeconds,
);

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

/** Customers in the shop (waiting, or back with a review) as the scene should show them. */
let firstSync = true;
function syncCrowd(): void {
  if (!kit) return;
  const visits = state.save.customers!.visits.filter((v) => v.status !== 'away');
  const instant = firstSync; // whoever arrived while the app was closed is already at the counter
  firstSync = false;
  const entries = visits.map((v) => ({
    id: v.id,
    look: regularOf(v)?.look ?? randomCharacter(kit!.style, characterOptions, seededRandom(v.lookSeed)),
    label: v.status === 'returning' ? `${v.name} · review` : v.name,
    instant,
  }));
  scene.syncCustomers(kit, entries).catch((e) => console.error(e));
}

/** Brings arrivals and returning reviews up to date from timestamps. */
function runTick(): void {
  const c = state.save.customers!;
  const changed = tick(c, Date.now(), tierIndex(c.reputation), Math.random);
  if (changed.length > 0) {
    commit();
    syncCrowd();
  }
}

CharacterKit.load(characterOptions.kit, characterOptions.style)
  .then((loaded) => {
    kit = loaded;
    refreshPlayer();
    tick(state.save.customers!, Date.now(), tierIndex(state.save.customers!.reputation), Math.random);
    syncCrowd();
    commit();
    window.setInterval(runTick, 5000);
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && runTick());
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
  const visit = state.save.customers!.visits.find((v) => v.id === state.ui.visitId);
  if ((screen === 'customer' || screen === 'reaction') && !visit) {
    state.ui.screen = 'shop';
    panelRoot.innerHTML = '';
    return;
  }
  if (screen === 'creator') {
    if (!kit) return;
    // No backdrop: the player stays visible above the panel while you change their look.
    panelRoot.innerHTML = `<section class="panel panel--creator">${creatorScreen(kit.style, currentLook(), state.ui.creatorTab)}</section>`;
  } else {
    panelRoot.innerHTML = `<div class="panel-backdrop" data-action="close-panel"></div>
    <section class="panel">${panelContent(screen, visit)}</section>`;
  }
  panelRoot.querySelector<HTMLElement>('.panel')!.scrollTop = scroll;
}

function panelContent(screen: Screen, visit: Visit | undefined): string {
  switch (screen) {
    case 'organ':
      return organScreen();
    case 'customer':
      return customerScreen(visit!, state.save.customers!);
    case 'reaction':
      return reactionScreen(visit!);
    case 'unlock':
      return unlockScreen(unlocks.tiers[state.save.announcedTier ?? 0]);
    default:
      return bookScreen();
  }
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
    case 'ask-hint': {
      const visit = save.customers!.visits.find((v) => v.id === ui.visitId);
      if (visit) visit.hintsAsked += 1;
      break;
    }
    case 'compose-for':
      ui.orderId = ui.visitId;
      ui.organTab = 'materials';
      return openPanel('organ');
    case 'drop-order':
      ui.orderId = null;
      break;
    case 'hand-over': {
      const c = save.customers!;
      const visit = c.visits.find((v) => v.id === ui.orderId);
      const brief = visit && findBrief(visit.briefId);
      if (!visit || !brief || totalParts(save.draft) === 0) return;
      const result = scorePerfume(save.draft, brief.target, materialsById, content.families, content.model, clients.scoring);
      const typed = document.querySelector<HTMLInputElement>('#save-name')?.value.trim();
      handOver(c, visit.id, { name: typed || `${visit.name}'s perfume`, parts: { ...save.draft } }, result, Date.now());
      ui.orderId = null;
      ui.visitId = visit.id;
      syncCrowd(); // they head for the door
      return openPanel('reaction');
    }
    case 'complete-review': {
      const c = save.customers!;
      const change = completeReview(c, ui.visitId!, Date.now());
      ui.visitId = null;
      syncCrowd();
      const reached = tierIndex(c.reputation);
      if (reached > (save.announcedTier ?? 0)) {
        save.announcedTier = reached;
        return openPanel('unlock');
      }
      ui.screen = 'shop';
      ui.toast = `Reputation ${change >= 0 ? '+' : ''}${change}.`;
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
