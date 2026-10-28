import './style.css';
import { recognizeAccords } from './game/accords';
import { content, materialsById, validateContent } from './game/content';
import { addParts, totalParts } from './game/formula';
import { characterOptions, defaultCharacter, randomCharacter, type CharacterConfig } from './game/character';
import { clients, findBrief } from './game/clients';
import { completeReview, handOver, tick, type Visit } from './game/customers';
import { afterReview, meet, pageById, pageFormula, storyTick } from './game/story';
import { seededRandom } from './game/random';
import { applyQuality, scorePerfume } from './game/scoring';
import { setClockSpeed } from './game/clock';
import { consume, contractStage, harvest, missingFor, order, qualityWord, signContract, sourcing, tickSourcing, unpack, type Crate } from './game/sourcing';
import { listPerfume, removeListing, settleSales } from './game/display';
import { priceMultiplier, shippingDelay, weekOf, yieldMultiplier } from './game/events';
import { parseSave, writeSave } from './game/save';
import { buyItem, buyProcess, displayCapacity, furniture, itemById, place, processStats, unplace } from './game/upgrades';
import { CHEMIST, answer, chapterInfo, crateLetter, markRead, routeById, routeOpen, routesTick } from './game/routes';
import { arrivalConditions, newsFor, ownedMaterials, shopAppeal } from './game/world';
import { setTimeSpeed } from './game/time';
import { tierIndex, unlocks } from './game/unlocks';
import { shop, validateShop } from './game/shop';
import { CharacterKit } from './scene/characters';
import { ShopScene } from './scene/shopScene';
import { SoundBoard } from './scene/audio';
import { commit, nowGame, onChange, setDraft, state, type Screen } from './state';
import { backroomScreen } from './ui/backroom';
import { newsScreen } from './ui/news';
import { optionsScreen } from './ui/options';
import { allSpots, upgradesScreen } from './ui/upgradesPanel';
import { bookScreen } from './ui/book';
import { creatorScreen } from './ui/creator';
import { customerScreen, lookOf, reactionScreen, unlockScreen } from './ui/customer';
import { chapterScreen } from './ui/chapter';
import { trainingScreen } from './ui/training';
import { answerQuestion, dayNumber, recordUse, startToday } from './game/learning';
import { introScreen } from './ui/intro';
import { hud } from './ui/hud';
import { organScreen } from './ui/organ';

const hudRoot = document.querySelector<HTMLDivElement>('#hud')!;
const panelRoot = document.querySelector<HTMLDivElement>('#panel-root')!;

// Debug: game time speed. Set in the back room, or with ?speed=60 in the URL.
const urlSpeed = Number(new URLSearchParams(location.search).get('speed'));
if (urlSpeed > 0) setClockSpeed(state.save.clock!, urlSpeed, Date.now());
setTimeSpeed(state.save.clock!.speed);

const problems = [...validateContent(content), ...validateShop(shop)];
if (problems.length > 0) console.error('Content problems:\n' + problems.join('\n'));

// What tapping each interactive fixture does once the player reaches it (from shop.json).
const FIXTURE_ACTIONS: Record<string, () => void> = {
  organ: () => openPanel('organ'),
  'back-room': () => openPanel('backroom'),
};

const sounds = new SoundBoard(state.save.sound ?? 0.8);
sounds.loop('ambience', true);

const scene = new ShopScene(
  document.querySelector<HTMLDivElement>('#scene')!,
  shop,
  {
    arrive: (fixture) => fixture.interact && FIXTURE_ACTIONS[fixture.interact.action]?.(),
    customer: (id) => {
      scene.waveCustomer(id);
      state.ui.visitId = id;
      const visit = state.save.customers!.visits.find((v) => v.id === id);
      if (visit && meet(state.save.story!, visit, state.save.sourcing!, nowGame()).length > 0) sounds.play('glass');
      openPanel('customer');
    },
    walking: (on) => sounds.loop('footsteps', on),
    customerEntered: () => sounds.play('door-chime'),
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
    look: lookOf(v) ?? randomCharacter(kit!.style, characterOptions, seededRandom(v.lookSeed)),
    label: v.status === 'returning' ? `${v.name} · review` : v.name,
    instant,
  }));
  scene.syncCustomers(kit, entries).catch((e) => console.error(e));
}

/** Storms in the news slow shipping from their region in the week a batch ships. */
const stormDelay = (regionId: string, at: number) => shippingDelay(newsFor(state.save, at), regionId);

/** Game hours between display-case sales: a more appealing shop sells faster. */
const saleInterval = () => furniture.display.saleEveryGameHours * shopAppeal(state.save).level.arrivalMultiplier;

/** Sells from the display case; returns what sold. */
function runSales(): { bottles: number; coins: number } {
  const sold = settleSales(state.save.display!, nowGame(), saleInterval());
  state.save.customers!.money += sold.coins;
  return sold;
}

// Notifications: only for things that newly happen while the app is in the background.
const ripeNotified = new Set<string>();
function notify(title: string, body: string): void {
  if (!state.save.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
  if (document.visibilityState === 'visible') return;
  navigator.serviceWorker?.ready.then((reg) => reg.showNotification(title, { body, tag: title })).catch(() => {});
}

/** Brings arrivals, reviews, harvests, shipments and sales up to date from timestamps. */
/**
 * The post: a new season's chapter brings letters, replies that come back reopen routes, and
 * crates from open routes carry a note. Returns whether anything arrived.
 */
function runPost(crates: Crate[]): boolean {
  const { save, ui } = state;
  const now = nowGame();
  const r = save.routes!;
  for (const crate of crates) {
    const item = crate.items[0];
    if (crate.route && item) crateLetter(r, crate.route, now, { material: materialsById.get(item.material)?.name ?? item.material, quality: qualityWord(item.quality) });
  }
  const { chapter, opened } = routesTick(r, now, sourcing.calendarStart);
  for (const id of opened) {
    const from = routeById(id)?.from ?? id;
    ui.toast = id === CHEMIST ? `${from} has written back: aroma chemicals are on order again from the back room.` : `${from} has written back: the route is open. Sign harvests from the back room.`;
    notify('A letter has come back', `${from} wrote back.`);
  }
  // A new chapter is announced over the shop (the first comes in quietly after the intro).
  if (chapter !== null && chapter > 0) {
    if (ui.screen === 'shop') openPanel('chapter');
    else ui.toast = `A new chapter: ${chapterInfo(chapter, sourcing.calendarStart).title}. New letters are in the back room.`;
    notify('A new season', chapterInfo(chapter, sourcing.calendarStart).title);
  } else if (chapter === 0) ui.toast = 'Letters have come for you from her old suppliers. Read them in the back room.';
  return chapter !== null || opened.length > 0 || crates.some((k) => k.route);
}

function runTick(): void {
  const { save } = state;
  const c = save.customers!;
  const now = nowGame();
  const changed = [...storyTick(save.story!, c, now, Date.now()), ...tick(c, Date.now(), ownedMaterials(save), Math.random, arrivalConditions(save, now))];
  const crates = tickSourcing(save.sourcing!, now, stormDelay);
  const sold = runSales();
  const post = runPost(crates);
  if (crates.length > 0) {
    const note = crates.some((k) => k.route) ? ' There’s a letter in it.' : '';
    state.ui.toast = (crates.length === 1 ? `A crate has arrived from ${crates[0].from}. It's by the back-room door.` : `${crates.length} crates have arrived. They're by the back-room door.`) + note;
    void scene.setCrates(save.sourcing!.crates.length);
    sounds.play('crate');
    notify('A crate has arrived', `From ${crates.map((k) => k.from).join(', ')}.`);
  }
  if (sold.bottles > 0) {
    state.ui.toast = `Sold ${sold.bottles} bottle${sold.bottles === 1 ? '' : 's'} from the display case: +${sold.coins} coins.`;
    save.display!.unseen = { bottles: 0, coins: 0 };
  }
  for (const k of save.sourcing!.contracts) {
    if (contractStage(k, now) === 'best' && !ripeNotified.has(k.id)) {
      ripeNotified.add(k.id);
      notify('A harvest is ripe', `${materialsById.get(k.material)?.name} is at its best now. Harvest it soon.`);
    }
  }
  const returning = c.visits.filter((v) => changed.includes(v.id) && v.status === 'returning');
  if (returning.length > 0) notify('A customer is back', `${returning.map((v) => v.name).join(', ')} came back to tell you how their perfume wore.`);
  if (changed.length > 0) syncCrowd();
  // Keep countdowns fresh in panels that show them.
  if (changed.length > 0 || crates.length > 0 || sold.bottles > 0 || post || ['backroom', 'upgrades'].includes(state.ui.screen)) commit();
}

/** Puts placed furniture in the scene. */
function refreshFurniture(): void {
  const spots = new Map(allSpots().map((spot) => [spot.id, spot]));
  const pieces = state.save.upgrades!.placed.flatMap((p) => {
    const item = itemById(p.item);
    const spot = spots.get(p.spot);
    if (!item || !spot) return [];
    if (spot.kind === 'floor') {
      const zone = shop.zones.find((z) => z.id === p.spot)!;
      const extent = (item.size[0] + item.size[1]) / Math.SQRT2; // turned 45° towards the room
      return [{ spot: p.spot, model: item.model, position: [zone.rect[0], zone.rect[1]] as [number, number], y: 0, size: [extent, extent] as [number, number], floor: true }];
    }
    const surface = shop.surfaces.find((x) => x.id === p.spot)!;
    return [{ spot: p.spot, model: item.model, position: surface.position, y: surface.y, size: item.size, floor: false }];
  });
  void scene.setFurniture(pieces);
}

CharacterKit.load(characterOptions.kit, characterOptions.style)
  .then((loaded) => {
    kit = loaded;
    refreshPlayer();
    storyTick(state.save.story!, state.save.customers!, nowGame(), Date.now());
    tick(state.save.customers!, Date.now(), ownedMaterials(state.save), Math.random, arrivalConditions(state.save, nowGame()));
    runPost(tickSourcing(state.save.sourcing!, nowGame(), stormDelay));
    runSales();
    const away = state.save.display!.unseen;
    if (away.bottles > 0) {
      state.ui.toast = `While you were away, ${away.bottles} bottle${away.bottles === 1 ? '' : 's'} sold from the display case: +${away.coins} coins.`;
      state.save.display!.unseen = { bottles: 0, coins: 0 };
    }
    void scene.setCrates(state.save.sourcing!.crates.length);
    refreshFurniture();
    syncCrowd();
    commit();
    window.setInterval(runTick, 5000);
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && runTick());
    if (!state.save.story!.introSeen) openPanel('intro');
    else if (!state.save.character) openPanel('creator');
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
  // Frame the room below the HUD's buttons and stats (the toast sits at the bottom, over the floor).
  const stats = hudRoot.querySelector<HTMLElement>('.hud-hint') ?? hudRoot;
  scene.setTopInset(stats.getBoundingClientRect().bottom + 8);
  scene.enabled = screen === 'shop';
  scene.focusOnPlayer(screen === 'creator');

  // Don't redraw a panel under someone typing (a note, a formula's name): it would lose
  // what they've typed. Their change is saved when they leave the box.
  const typing = document.activeElement?.matches('textarea[data-note], #save-name') && panelRoot.contains(document.activeElement);
  if (typing && screen !== 'shop') return;
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
    // The intro can't be dismissed by tapping outside it: the story starts from its button.
    panelRoot.innerHTML = `<div class="panel-backdrop" ${screen === 'intro' ? '' : 'data-action="close-panel"'}></div>
    <section class="panel">${panelContent(screen, visit)}</section>`;
  }
  panelRoot.querySelector<HTMLElement>('.panel')!.scrollTop = scroll;
}

function panelContent(screen: Screen, visit: Visit | undefined): string {
  switch (screen) {
    case 'organ':
      return organScreen();
    case 'intro':
      return introScreen();
    case 'customer':
      return customerScreen(visit!, state.save.customers!, state.save.story!);
    case 'reaction':
      return reactionScreen(visit!);
    case 'chapter':
      return chapterScreen();
    case 'training':
      return trainingScreen();
    case 'unlock':
      return unlockScreen(unlocks.tiers[state.save.announcedTier ?? 0]);
    case 'backroom':
      return backroomScreen();
    case 'upgrades':
      return upgradesScreen();
    case 'news':
      return newsScreen();
    case 'options':
      return optionsScreen(optionsMessage);
    default:
      return bookScreen();
  }
}

let optionsMessage: string | null = null;

function importSave(text: string): void {
  const data = parseSave(text.trim());
  if (!data) {
    optionsMessage = "That doesn't look like a Field & Flacon save.";
    commit();
    return;
  }
  if (!confirm('Replace this game with the imported one?')) return;
  writeSave(data);
  location.reload();
}

document.body.addEventListener('change', (event) => {
  // Your own notes on a material: saved when you leave the box.
  const note = (event.target as HTMLElement).closest<HTMLTextAreaElement>('textarea[data-note]');
  if (note) {
    const text = note.value.trim();
    if (text) state.save.learning!.notes[note.dataset.note!] = text;
    else delete state.save.learning!.notes[note.dataset.note!];
    writeSave(state.save);
    return;
  }
  const input = event.target as HTMLInputElement;
  if (input.id !== 'import-file' || !input.files?.[0]) return;
  void input.files[0].text().then(importSave);
});

document.body.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!target) return;
  const { action, id } = target.dataset;
  const { ui, save } = state;

  switch (action) {
    case 'nav':
      if (target.dataset.to === 'news') {
        state.save.newsSeenWeek = weekOf(nowGame());
        sounds.play('paper');
      }
      if (target.dataset.to === 'options') optionsMessage = null;
      if (target.dataset.to === 'training') {
        const owned = content.materials.filter((m) => ownedMaterials(save).has(m.id));
        startToday(save.learning!, owned, content.families, dayNumber(new Date()), Math.random);
        ui.trainingFeedback = null;
      }
      return openPanel(target.dataset.to as Screen);
    case 'close-panel':
      if (ui.screen === 'creator' && kit) save.character = currentLook();
      if (ui.screen === 'backroom' && ui.backroomTab === 'letters') markRead(save.routes!);
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
      sounds.play('paper');
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
      if (!visit || !brief) return;
      if (totalParts(save.draft) !== content.model.wearableParts) {
        ui.toast = `A perfume needs exactly ${content.model.wearableParts} parts.`;
        break;
      }
      const missing = missingFor(save.sourcing!, save.draft);
      if (missing.length > 0) {
        ui.toast = `Not enough ${missing.map((m) => materialsById.get(m)?.name ?? m).join(', ')}. Order or harvest more in the back room.`;
        break;
      }
      const quality = consume(save.sourcing!, save.draft, nowGame())!;
      const raw = scorePerfume(save.draft, brief.target, materialsById, content.model, clients.scoring);
      const result = applyQuality(raw, quality, sourcing.quality.scoreEffect, clients.scoring, visit.strictness ?? 0);
      const typed = document.querySelector<HTMLInputElement>('#save-name')?.value.trim();
      handOver(c, visit.id, { name: typed || `${visit.name}'s perfume`, parts: { ...save.draft } }, result, Date.now());
      recordUse(save.learning!, save.draft);
      ui.orderId = null;
      ui.visitId = visit.id;
      sounds.play('pouring');
      syncCrowd(); // they head for the door
      return openPanel('reaction');
    }
    case 'complete-review': {
      const c = save.customers!;
      const reviewed = c.visits.find((v) => v.id === ui.visitId);
      const page = reviewed ? afterReview(save.story!, reviewed, nowGame()) : null;
      const change = completeReview(c, ui.visitId!, Date.now());
      ui.visitId = null;
      syncCrowd();
      const reached = tierIndex(c.reputation);
      if (reached > (save.announcedTier ?? 0)) {
        save.announcedTier = reached;
        return openPanel('unlock');
      }
      ui.screen = 'shop';
      ui.toast = page ? `A page of her book is whole again: “${pageById(page)?.title}”.` : `Reputation ${change >= 0 ? '+' : ''}${change}.`;
      break;
    }
    case 'book-tab':
      ui.bookTab = target.dataset.value as typeof ui.bookTab;
      ui.compendiumId = null;
      scrollToTop = true;
      break;
    case 'open-entry':
      ui.compendiumId = id!;
      scrollToTop = true;
      break;
    case 'close-entry':
      ui.compendiumId = null;
      break;
    case 'train-answer': {
      const index = Number(target.dataset.index);
      const right = answerQuestion(save.learning!, index, Number(target.dataset.value), dayNumber(new Date()));
      if (right === null) return;
      ui.trainingFeedback = index;
      sounds.play(right ? 'glass' : 'paper');
      break;
    }
    case 'train-next':
      ui.trainingFeedback = null;
      break;
    case 'start-story': {
      save.story!.introSeen = true;
      if (!save.character) return openPanel('creator');
      ui.screen = 'shop';
      break;
    }
    case 'load-page': {
      const parts = pageFormula(id!);
      if (!parts) return;
      ui.screen = 'organ';
      ui.organTab = 'formula';
      scrollToTop = true;
      return setDraft({ ...parts });
    }
    case 'backroom-tab':
      // Letters count as read once you've looked at them and moved on.
      if (ui.backroomTab === 'letters') markRead(save.routes!);
      ui.backroomTab = target.dataset.value as typeof ui.backroomTab;
      scrollToTop = true;
      break;
    case 'read-letters':
      ui.backroomTab = 'letters';
      return openPanel('backroom');
    case 'answer-letter': {
      const why = answer(save.routes!, id!, nowGame());
      ui.toast = why ?? `You've written back to ${routeById(id!)?.from}. Their answer will take a little while.`;
      if (!why) sounds.play('paper');
      break;
    }
    case 'sign': {
      const region = target.dataset.region!;
      const material = target.dataset.material!;
      const why = signContract(save.sourcing!, save.customers!, region, material, nowGame(), ownedMaterials(save), {
        regionOpen: routeOpen(save.routes!, region),
        yieldMultiplier: yieldMultiplier(newsFor(save, nowGame()), region, material),
      });
      ui.toast = why ?? 'Contract signed. Watch it ripen under Harvests.';
      break;
    }
    case 'harvest': {
      const method = target.dataset.method!;
      const why = harvest(save.sourcing!, save.customers!, id!, method, nowGame(), processStats(save.upgrades!, method));
      ui.toast = why ?? "Harvested and off to be processed. It ships to you when it's done.";
      break;
    }
    case 'order': {
      const material = target.dataset.material!;
      const natural = materialsById.get(material)?.type === 'natural';
      const multiplier = priceMultiplier(newsFor(save, nowGame()), material);
      const why = order(save.sourcing!, save.customers!, material, natural, nowGame(), ownedMaterials(save), multiplier, routeOpen(save.routes!, CHEMIST));
      ui.toast = why ?? `Ordered ${materialsById.get(material)?.name}. It's on its way.`;
      break;
    }
    case 'unpack': {
      const items = unpack(save.sourcing!, id!, nowGame());
      ui.toast = items.length ? `Unpacked ${items.map((i) => `${i.grams} g of ${materialsById.get(i.material)?.name}`).join(', ')} into stock.` : null;
      void scene.setCrates(save.sourcing!.crates.length);
      if (items.length) sounds.play('crate');
      break;
    }
    case 'upgrades-tab':
      ui.upgradesTab = target.dataset.value as typeof ui.upgradesTab;
      ui.pickSpot = null;
      scrollToTop = true;
      break;
    case 'pick-spot':
      ui.pickSpot = ui.pickSpot === id ? null : id!;
      break;
    case 'place': {
      const spot = allSpots().find((x) => x.id === id)!;
      const why = place(save.upgrades!, target.dataset.item!, spot.id, spot.kind);
      ui.toast = why;
      ui.pickSpot = null;
      refreshFurniture();
      break;
    }
    case 'unplace':
      unplace(save.upgrades!, id!);
      refreshFurniture();
      break;
    case 'buy-item': {
      const why = buyItem(save.upgrades!, save.customers!, id!, save.customers!.reputation);
      ui.toast = why ?? `Bought ${itemById(id!)?.name}. Place it from the spots above.`;
      break;
    }
    case 'list': {
      const formula = save.formulas.find((f) => f.id === id);
      if (!formula) return;
      if (totalParts(formula.parts) !== content.model.wearableParts) {
        ui.toast = `Only a formula of exactly ${content.model.wearableParts} parts can be bottled.`;
        break;
      }
      const why = listPerfume(save.display!, save.sourcing!, formula, Number(target.dataset.bottles), displayCapacity(save.upgrades!), nowGame(), shopAppeal(save).level.payMultiplier);
      ui.toast = why ?? `“${formula.name}” is on display.`;
      if (!why) {
        sounds.play('pouring');
        recordUse(save.learning!, formula.parts);
      }
      break;
    }
    case 'unlist':
      removeListing(save.display!, id!);
      break;
    case 'buy-process': {
      const why = buyProcess(save.upgrades!, save.customers!, id!, save.customers!.reputation);
      ui.toast = why ?? 'Done: the new equipment is ready.';
      break;
    }
    case 'sound-volume':
      save.sound = Number(target.dataset.value);
      sounds.volume = save.sound;
      break;
    case 'toggle-notify':
      if (save.notify) save.notify = false;
      else {
        void Notification.requestPermission().then((p) => {
          save.notify = p === 'granted';
          optionsMessage = p === 'granted' ? null : 'Notifications were not allowed.';
          commit();
        });
        return;
      }
      break;
    case 'export-save': {
      const blob = new Blob([JSON.stringify(save)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `field-and-flacon-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
      return;
    }
    case 'copy-save':
      void navigator.clipboard?.writeText(JSON.stringify(save)).then(
        () => ((optionsMessage = 'Save copied. Paste it somewhere safe.'), commit()),
        () => ((optionsMessage = 'Copying failed on this device; use Export instead.'), commit()),
      );
      return;
    case 'import-text':
      importSave(document.querySelector<HTMLTextAreaElement>('#import-text')?.value ?? '');
      return;
    case 'debug-speed': {
      const value = Number(target.dataset.value);
      setClockSpeed(save.clock!, value, Date.now());
      setTimeSpeed(value);
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
    case 'add':
    case 'inc':
      if (totalParts(save.draft) >= content.model.wearableParts) {
        ui.toast = `That's ${content.model.wearableParts} parts, a full formula. Take a part out to add another.`;
        break;
      }
      sounds.play('glass');
      return setDraft(addParts(save.draft, id!, 1));
    case 'dec':
      return setDraft(addParts(save.draft, id!, -1));
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
      recordUse(save.learning!, save.draft);
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
