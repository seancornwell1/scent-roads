import './style.css';
import { recognizeAccords } from './game/accords';
import { content, materialsById, validateContent } from './game/content';
import { addParts, totalParts } from './game/formula';
import { characterOptions, defaultCharacter, randomCharacter, type CharacterConfig } from './game/character';
import { clients } from './game/clients';
import { completeReview, handOver, tick, type Visit } from './game/customers';
import { afterReview, meet, pageById, pageFormula, storyTick } from './game/story';
import { seededRandom } from './game/random';
import { applyQuality, scorePerfume } from './game/scoring';
import { setClockSpeed } from './game/clock';
import { DILUTION_BATCH_GRAMS, consume, contractStage, dilute, harvest, missingFor, order, qualityWord, signContract, sourcing, tickSourcing, unpack, type Crate } from './game/sourcing';
import { addCustomLabel, addHousePerfume, fairPrice, house, rateHouse, restock, setTier, settleHouse, suggestName, takeDown, unlockBlockers } from './game/house';
import { priceMultiplier, shippingDelay, weekOf, yieldMultiplier } from './game/events';
import { parseSave, writeSave, type SavedFormula } from './game/save';
import { buyItem, buyProcess, itemById, place, processStats, unplace } from './game/upgrades';
import { CHEMIST, answer, chapterInfo, crateLetter, markRead, routeById, routeOpen, routesTick } from './game/routes';
import { arrivalConditions, clueContext, knownTargets, newsFor, ownedMaterials, shopAppeal } from './game/world';
import { setTimeSpeed } from './game/time';
import { tierIndex, unlocks } from './game/unlocks';
import { backRoom, shop, validateBackRoom, validateShop } from './game/shop';
import { CharacterKit } from './scene/characters';
import { ShopScene } from './scene/shopScene';
import { SoundBoard } from './scene/audio';
import { commit, currentRank, draftBlend, nowGame, onChange, setDraft, state, type Screen } from './state';
import { backroomScreen } from './ui/backroom';
import { newsScreen } from './ui/news';
import { optionsScreen } from './ui/options';
import { allSpots, upgradesScreen } from './ui/upgradesPanel';
import { bookScreen } from './ui/book';
import { creatorScreen } from './ui/creator';
import { customerScreen, lookOf, reactionScreen, unlockScreen } from './ui/customer';
import { chapterScreen } from './ui/chapter';
import { sheetData, sheetScreen } from './ui/sheet';
import { lab, recordChallenge, runSample, upgradeLab } from './game/lab';
import { parseFormula } from './game/sheet';
import { feedbackLines } from './game/feedback';
import { epilogueScreen, signatureScreen } from './ui/signature';
import { cluesFound, jarReady, signature, startJar } from './game/signature';
import { awards, entriesOpen, settleAwards, yearAt } from './game/awards';
import { examBlockers, examStage, nextRank, rankById, startExam } from './game/ranks';
import { currentOrder } from './ui/organ';
import { entriesOf, isBaseKey, written, type Dilution } from './game/blend';
import { blockers, checkPerfume, sellable } from './game/checks';
import { blendProfile, recordStyle } from './game/style';
import { trainingScreen } from './ui/training';
import { answerQuestion, dayNumber, recordUse, startToday } from './game/learning';
import { introScreen } from './ui/intro';
import { hud } from './ui/hud';
import { organScreen } from './ui/organ';
import { examScreen } from './ui/exam';
import { houseNewScreen, houseUnlocked, reportScreen, slotsNow } from './ui/house';

const hudRoot = document.querySelector<HTMLDivElement>('#hud')!;
const panelRoot = document.querySelector<HTMLDivElement>('#panel-root')!;

// Debug: game time speed. Set in the back room, or with ?speed=60 in the URL.
const urlSpeed = Number(new URLSearchParams(location.search).get('speed'));
if (urlSpeed > 0) setClockSpeed(state.save.clock!, urlSpeed, Date.now());
setTimeSpeed(state.save.clock!.speed);

const problems = [...validateContent(content), ...validateShop(shop), ...validateBackRoom(backRoom)];
if (problems.length > 0) console.error('Content problems:\n' + problems.join('\n'));

// What tapping each interactive fixture does once the player reaches it (shop.json, backroom.json).
// A door's action names the room it leads to.
const FIXTURE_ACTIONS: Record<string, () => void> = {
  organ: () => openPanel('organ'),
  'back-room': () => void scene.travel('back'),
  shop: () => void scene.travel('shop'),
  laptop: () => openPanel('backroom'),
  rack: () => {
    state.ui.backroomTab = 'stock';
    openPanel('backroom');
  },
  crates: () => {
    state.ui.backroomTab = 'letters';
    openPanel('backroom');
  },
  outside: () => {
    state.ui.toast = "The street outside isn't open yet. Deliveries come in through this door.";
    commit();
  },
};

const sounds = new SoundBoard(state.save.sound ?? 0.8);
sounds.loop('ambience', true);

const scene = new ShopScene(
  document.querySelector<HTMLDivElement>('#scene')!,
  { shop, back: backRoom },
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

/**
 * Opens the organ for an order. A formula made for a different brief is cleared first, so
 * one customer's perfume is never handed to the next by mistake; the same brief (a retry)
 * keeps what you had, and so does one you composed with no order open.
 */
function composeFor(orderId: string): void {
  const { ui, save } = state;
  ui.orderId = orderId;
  ui.organTab = 'materials';
  const briefId = currentOrder()?.brief.id ?? orderId;
  if (save.draftFor !== briefId) {
    const stale = save.draftFor !== undefined;
    save.draftFor = briefId;
    if (stale && totalParts(save.draft) > 0) {
      setDraft({}, {});
      ui.toast = 'A clean organ for this order.';
    }
  }
  openPanel('organ');
}

/** Saves the organ's formula to the book. */
function saveDraftFormula(name: string): SavedFormula {
  const { save } = state;
  const now = Date.now();
  recordUse(save.learning!, written(draftBlend()));
  const formula: SavedFormula = {
    id: `f${now}`,
    name,
    parts: { ...save.draft },
    dilutions: { ...save.draftDilutions },
    accords: recognizeAccords(written(draftBlend()), content.accords, materialsById).map((a) => a.id),
    createdAt: now,
  };
  save.formulas.push(formula);
  return formula;
}

/**
 * House perfumes: unlocks them once you have the reputation and enough materials in stock to
 * compose freely, and settles the shelves' sales for every game day that has ended. A more
 * appealing shop draws more people. Returns whether anything happened.
 */
function runHouse(): boolean {
  const { save, ui } = state;
  const h = save.house!;
  let happened = false;
  if (h.unlockedAt === undefined && unlockBlockers(save.customers!.reputation, save.sourcing!).length === 0) {
    h.unlockedAt = nowGame();
    ui.toast = 'You have enough materials to compose freely: make house perfumes to sell from the shelves (Shop → House perfumes).';
    happened = true;
  }
  const { level } = shopAppeal(save);
  const reports = settleHouse(h, nowGame(), 1 / level.arrivalMultiplier, (p) => fairPrice(p.rating, level.payMultiplier));
  if (reports.length > 0) {
    save.customers!.money += reports.reduce((a, r) => a + r.coins, 0);
    happened = true;
  }
  return happened;
}

/** Shows the end-of-day report over the shop when one is waiting. */
function showReport(): void {
  if (state.save.house!.unseen > 0 && state.ui.screen === 'shop') {
    state.ui.reportDay = null;
    openPanel('report');
  }
}

/** The old display case's bottles become house perfumes on the shelves (once, for older saves). */
function migrateDisplay(): void {
  const { save } = state;
  const d = save.display;
  if (!d) return;
  for (const l of d.listings) {
    const rating = rateHouse(l.entries, knownTargets());
    save.house!.perfumes.push({ id: `h${save.house!.nextId++}`, name: l.name, entries: l.entries, label: { generic: 'plain' }, rating, price: l.price, tier: 'fair', bottles: l.bottles, sold: 0, coins: 0, listedAt: nowGame() });
  }
  delete save.display;
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
    const info = chapterInfo(chapter, sourcing.calendarStart);
    // Past the written chapters a season has nothing to tell: a note is enough.
    if (!info.text && !info.letters.length) ui.toast = `A new season: ${info.title}.`;
    else if (ui.screen === 'shop') openPanel('chapter');
    else ui.toast = `A new chapter: ${chapterInfo(chapter, sourcing.calendarStart).title}. New letters are in the back room.`;
    notify('A new season', chapterInfo(chapter, sourcing.calendarStart).title);
  } else if (chapter === 0) ui.toast = 'Letters have come for you from her old suppliers. Read them in the back room.';
  return chapter !== null || opened.length > 0 || crates.some((k) => k.route);
}

/** New clues to her signature, and the awards when the year turns. Returns whether anything happened. */
function runStoryProgress(): boolean {
  const { save, ui } = state;
  const sig = save.signature!;
  let happened = false;
  for (const clue of cluesFound(clueContext(save))) {
    if (sig.cluesSeen.includes(clue.id)) continue;
    sig.cluesSeen.push(clue.id);
    ui.toast = `A clue to her own perfume, from ${clue.from}. It's on her last page in the book.`;
    happened = true;
  }
  const settled = settleAwards(save.awards!, nowGame(), sourcing.calendarStart, knownTargets());
  if (settled) {
    const { prize } = settled.result;
    save.customers!.money += prize.coins;
    save.customers!.reputation += prize.reputation;
    ui.toast = `${awards.name}, year ${settled.year}: “${settled.result.name}” wins ${prize.name}! +${prize.coins} coins, reputation +${prize.reputation}.`;
    notify(awards.name, `${prize.name} for “${settled.result.name}”.`);
    happened = true;
  }
  return happened;
}

function runTick(): void {
  const { save } = state;
  const c = save.customers!;
  const now = nowGame();
  const changed = [...storyTick(save.story!, c, now, Date.now()), ...tick(c, Date.now(), ownedMaterials(save), Math.random, arrivalConditions(save, now))];
  const crates = tickSourcing(save.sourcing!, now, stormDelay);
  const sold = runHouse();
  const post = runPost(crates);
  const story = runStoryProgress();
  if (crates.length > 0) {
    const note = crates.some((k) => k.route) ? ' There’s a letter in it.' : '';
    state.ui.toast = (crates.length === 1 ? `A crate has arrived from ${crates[0].from}. It's by the back room's outside door.` : `${crates.length} crates have arrived. They're by the back room's outside door.`) + note;
    void scene.setCrates(save.sourcing!.crates.length);
    sounds.play('crate');
    notify('A crate has arrived', `From ${crates.map((k) => k.from).join(', ')}.`);
  }
  if (sold) showReport();
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
  if (changed.length > 0 || crates.length > 0 || sold || post || story || ['backroom', 'upgrades'].includes(state.ui.screen)) commit();
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
    migrateDisplay();
    runHouse();
    void scene.setCrates(state.save.sourcing!.crates.length);
    refreshFurniture();
    syncCrowd();
    commit();
    window.setInterval(runTick, 5000);
    document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && runTick());
    if (!state.save.story!.introSeen) openPanel('intro');
    else if (!state.save.character) openPanel('creator');
    else showReport();
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

/** Materials on hand (any dilution), in the order they were first stocked: what the back room's rack shows. */
function onHand(): string[] {
  return [...new Set(state.save.sourcing!.inventory.filter((l) => l.grams > 0).map((l) => l.material))];
}

function render(): void {
  const { screen } = state.ui;
  hudRoot.innerHTML = hud();
  // Frame the room below the HUD's buttons and stats (the toast sits at the bottom, over the floor).
  const stats = hudRoot.querySelector<HTMLElement>('.hud-hint') ?? hudRoot;
  scene.setTopInset(stats.getBoundingClientRect().bottom + 8);
  scene.enabled = screen === 'shop';
  scene.focusOnPlayer(screen === 'creator');
  void scene.setRack(onHand());

  // Don't redraw a panel under someone typing (a note, a formula's name): it would lose
  // what they've typed. Their change is saved when they leave the box.
  const typing = document.activeElement?.matches('textarea[data-note], #save-name, #formula-import, #import-text, #house-name') && panelRoot.contains(document.activeElement);
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
    case 'exam':
      return examScreen();
    case 'signature':
      return signatureScreen();
    case 'epilogue':
      return epilogueScreen();
    case 'sheet':
      return sheetScreen();
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
    case 'house-new':
      return houseNewScreen();
    case 'report':
      return reportScreen();
    default:
      return bookScreen();
  }
}

let optionsMessage: string | null = null;

/** Your own label: the picture you chose, scaled down to keep the save small. */
async function uploadLabel(file: File): Promise<void> {
  try {
    const bitmap = await createImageBitmap(file);
    const { sizePx, jpegQuality } = house.customLabels;
    const scale = Math.min(1, sizePx / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const id = addCustomLabel(state.save.house!, canvas.toDataURL('image/jpeg', jpegQuality));
    if (state.ui.houseNew) state.ui.houseNew.label = { custom: id };
  } catch {
    state.ui.toast = "That picture couldn't be opened.";
  }
  commit();
}

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
  // A house perfume's name: kept as you type it, so redraws don't lose it.
  if (input.id === 'house-name' && state.ui.houseNew) {
    state.ui.houseNew.name = input.value;
    return;
  }
  if (input.id === 'label-upload' && input.files?.[0]) {
    void uploadLabel(input.files[0]);
    return;
  }
  if (input.id !== 'import-file' || !input.files?.[0]) return;
  void input.files[0].text().then(importSave);
});

document.body.addEventListener('click', (event) => {
  const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
  if (!target) return;
  // Tapping a button ends any typing (saving a note through its change event), so the panel can redraw.
  const active = document.activeElement;
  if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
    if (active !== target && !(active.type === 'file')) active.blur();
  }
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
      return composeFor(ui.visitId!);
    case 'drop-order':
      ui.orderId = null;
      break;
    case 'hand-over': {
      const c = save.customers!;
      const order = currentOrder();
      if (!order) return;
      const blend = draftBlend();
      const check = checkPerfume(blend, order.parts, order.brief.budget);
      if (!sellable(check)) {
        ui.toast = blockers(check)[0];
        break;
      }
      if (ui.orderId === 'signature' && !jarReady(save.signature!, nowGame())) {
        ui.toast = 'Her labdanum jar is not ready yet.';
        break;
      }
      if (order.fromStock && missingFor(save.sourcing!, blend).length > 0) {
        ui.toast = 'Not enough of every material in stock. Order, harvest or dilute more in the back room.';
        break;
      }
      const quality = order.fromStock ? consume(save.sourcing!, blend, nowGame())! : 1;
      if (ui.orderId?.startsWith('challenge:')) {
        // A reconstruction: compared with the sample at once.
        const challengeId = ui.orderId.slice('challenge:'.length);
        const result = scorePerfume(blend, order.brief.target, materialsById, content.model, order.scoring);
        const reward = recordChallenge(save.lab!, challengeId, result.stars);
        if (reward) {
          save.customers!.money += reward.coins;
          save.customers!.reputation += reward.reputation;
        }
        const words = feedbackLines(result, 3).join(' ');
        ui.toast = `${'★'.repeat(result.stars)}${'☆'.repeat(3 - result.stars)} ${result.stars >= 3 ? `A faithful reconstruction.${reward ? ` +${reward.coins} coins, reputation +${reward.reputation}.` : ''}` : words}`;
        ui.orderId = null;
        ui.backroomTab = 'lab';
        return openPanel('backroom');
      }
      if (ui.orderId === 'signature') {
        // Her perfume: judged against her last page, using the aged labdanum from her jar.
        const sig = save.signature!;
        sig.result = scorePerfume(blend, order.brief.target, materialsById, content.model, order.scoring);
        ui.orderId = null;
        if (sig.result.stars >= 3) {
          sig.completedAt = nowGame();
          save.story!.pages[signature.brief.page ?? 'her-signature'] = { at: nowGame(), for: 'the shop' };
          sounds.play('pouring');
          return openPanel('epilogue');
        }
        return openPanel('signature');
      }
      if (order.exam) {
        // The examiners judge it straight away, with their own materials.
        save.exam!.accord = scorePerfume(blend, order.brief.target, materialsById, content.model, order.scoring);
        ui.orderId = null;
        return openPanel('exam');
      }
      const visit = c.visits.find((v) => v.id === ui.orderId)!;
      const raw = scorePerfume(blend, order.brief.target, materialsById, content.model, order.scoring);
      const result = applyQuality(raw, quality, sourcing.quality.scoreEffect, order.scoring, visit.strictness ?? 0);
      const typed = document.querySelector<HTMLInputElement>('#save-name')?.value.trim();
      handOver(c, visit.id, { name: typed || `${visit.name}'s perfume`, parts: written(blend), entries: blend }, result, Date.now());
      recordUse(save.learning!, written(blend));
      recordStyle(save.styleHistory!, blendProfile(blend, materialsById, content.model));
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
    case 'start-exam': {
      const next = nextRank(save.rank);
      if (!next) return;
      const owned = content.materials.filter((m) => ownedMaterials(save).has(m.id));
      const why = examBlockers(next, save.customers!.reputation, save.learning!, owned);
      if (why.length) {
        ui.toast = why[0];
        break;
      }
      save.exam = startExam(next, owned, content.families, Math.random);
      return openPanel('exam');
    }
    case 'exam-answer': {
      const e = save.exam;
      const index = Number(target.dataset.index);
      if (!e || e.answers[index] !== null) return;
      e.answers[index] = Number(target.dataset.value);
      sounds.play('paper');
      break;
    }
    case 'start-jar': {
      const why = startJar(save.signature!, save.sourcing!, nowGame());
      ui.toast = why ?? 'You start her jar. Now it needs time.';
      break;
    }
    case 'signature-compose':
      return composeFor('signature');
    case 'enter-awards': {
      const formula = save.formulas.find((f) => f.id === id);
      const now = nowGame();
      if (!formula || !entriesOpen(now, sourcing.calendarStart)) return;
      const blend = entriesOf(formula, save.bases);
      const check = checkPerfume(blend, currentRank().wearableParts);
      if (!sellable(check)) {
        ui.toast = `The judges won't accept it: ${blockers(check)[0]}`;
        break;
      }
      if (missingFor(save.sourcing!, blend).length > 0) {
        ui.toast = 'Not enough of every material in stock to make the bottle for the judges.';
        break;
      }
      consume(save.sourcing!, blend, now);
      save.awards!.entries[yearAt(now, sourcing.calendarStart)] = { name: formula.name, entries: blend };
      ui.toast = `“${formula.name}” is entered. The judges announce the results when the year turns.`;
      break;
    }
    case 'lab-upgrade': {
      const why = upgradeLab(save.lab!, save.customers!, save.customers!.reputation);
      ui.toast = why ?? `The lab now has ${lab.levels[save.lab!.level - 1].name.toLowerCase()}.`;
      break;
    }
    case 'lab-run': {
      const why = runSample(save.lab!, save.customers!, id!);
      ui.toast = why;
      if (!why) sounds.play('glass');
      break;
    }
    case 'challenge-compose':
      return composeFor(`challenge:${id}`);
    case 'open-sheet':
      ui.sheetId = id!;
      return openPanel('sheet');
    case 'sheet-batch':
      ui.sheetBatch = Number(target.dataset.value);
      break;
    case 'sheet-download': {
      const data = sheetData();
      if (!data) return;
      const blob = new Blob([data.text], { type: 'text/plain' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${data.name.replace(/[^\w -]+/g, '').trim() || 'formula'}.txt`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
      return;
    }
    case 'sheet-copy': {
      const data = sheetData();
      if (!data) return;
      void navigator.clipboard?.writeText(data.text).then(
        () => ((ui.toast = 'Sheet copied.'), commit()),
        () => ((ui.toast = 'Copying failed on this device; download it instead.'), commit()),
      );
      return;
    }
    case 'import-formula': {
      const text = document.querySelector<HTMLTextAreaElement>('#formula-import')?.value ?? '';
      const parsed = parseFormula(text, content.materials);
      if (Object.keys(parsed.parts).length === 0) {
        ui.toast = parsed.unknown.length ? `Couldn't read: ${parsed.unknown.slice(0, 3).join(', ')}.` : 'Paste a formula first.';
        break;
      }
      ui.screen = 'organ';
      ui.organTab = 'formula';
      ui.orderId = null;
      scrollToTop = true;
      setDraft(parsed.parts, parsed.dilutions);
      ui.toast = parsed.unknown.length ? `Opened. Not recognised: ${parsed.unknown.slice(0, 4).join(', ')}.` : 'Opened on the organ: see its drydown below.';
      break;
    }
    case 'exam-compose':
      return composeFor('exam');
    case 'exam-retry-accord':
      if (save.exam) delete save.exam.accord;
      ui.orderId = 'exam';
      ui.organTab = 'formula';
      return openPanel('organ');
    case 'exam-finish': {
      const e = save.exam;
      if (!e || examStage(e) !== 'passed') return;
      save.rank = e.rank;
      save.exam = null;
      ui.screen = 'shop';
      ui.toast = `You are now a ${rankById(e.rank).name.toLowerCase()}. Your new abilities are at the organ.`;
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
      return setDraft({ ...parts }, {});
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
    case 'house-new':
    case 'house-from-draft': {
      if (!houseUnlocked()) return;
      let formulaId = id;
      if (action === 'house-from-draft') {
        // Sell what's on the organ: save it first if it isn't in the book yet.
        const blend = draftBlend();
        const check = checkPerfume(blend, currentRank().wearableParts);
        if (!sellable(check)) {
          ui.toast = `It can't be bottled yet: ${blockers(check)[0]}`;
          break;
        }
        const same = save.formulas.find((f) => JSON.stringify(f.parts) === JSON.stringify(save.draft) && JSON.stringify(f.dilutions ?? {}) === JSON.stringify(save.draftDilutions ?? {}));
        formulaId = same?.id ?? saveDraftFormula(document.querySelector<HTMLInputElement>('#save-name')?.value.trim() || suggestName(blend, 1)).id;
      }
      const formula = save.formulas.find((f) => f.id === formulaId);
      if (!formula) return;
      const blend = entriesOf(formula, save.bases);
      const named = /^Formula \d+$/.test(formula.name) ? suggestName(blend, 1) : formula.name;
      ui.houseNew = { formulaId: formula.id, name: named, seed: 1, label: { generic: house.labels[0].id }, tier: 'fair', bottles: house.bottleOptions[0] };
      scrollToTop = true;
      return openPanel('house-new');
    }
    case 'house-suggest': {
      const n = ui.houseNew;
      const formula = n && save.formulas.find((f) => f.id === n.formulaId);
      if (!n || !formula) return;
      n.seed += 1;
      n.name = suggestName(entriesOf(formula, save.bases), n.seed);
      break;
    }
    case 'house-label':
      if (ui.houseNew) ui.houseNew.label = { generic: target.dataset.value! };
      break;
    case 'house-label-custom':
      if (ui.houseNew) ui.houseNew.label = { custom: target.dataset.value! };
      break;
    case 'house-tier':
      if (ui.houseNew) ui.houseNew.tier = target.dataset.value!;
      break;
    case 'house-bottles':
      if (ui.houseNew) ui.houseNew.bottles = Number(target.dataset.value);
      break;
    case 'house-create': {
      const n = ui.houseNew;
      const formula = n && save.formulas.find((f) => f.id === n.formulaId);
      if (!n || !formula) return;
      const blend = entriesOf(formula, save.bases);
      const check = checkPerfume(blend, currentRank().wearableParts);
      if (!sellable(check)) {
        ui.toast = `It can't be bottled: ${blockers(check)[0]}`;
        break;
      }
      const name = document.querySelector<HTMLInputElement>('#house-name')?.value.trim() || n.name;
      const made = addHousePerfume(save.house!, save.sourcing!, { name, formulaId: formula.id, entries: blend, label: n.label, tier: n.tier, bottles: n.bottles }, slotsNow(), knownTargets(), shopAppeal(save).level.payMultiplier, nowGame());
      if (typeof made === 'string') {
        ui.toast = made;
        break;
      }
      sounds.play('pouring');
      recordUse(save.learning!, written(blend));
      ui.houseNew = null;
      ui.toast = `“${made.name}” is on the shelf: ${made.bottles} bottle${made.bottles === 1 ? '' : 's'} at ${made.price} coins.`;
      ui.upgradesTab = 'house';
      return openPanel('upgrades');
    }
    case 'house-restock': {
      const made = restock(save.house!, save.sourcing!, id!, Number(target.dataset.value), nowGame());
      ui.toast = made > 0 ? `Made ${made} more bottle${made === 1 ? '' : 's'}.` : 'Not enough materials in stock to make another bottle.';
      if (made > 0) sounds.play('pouring');
      break;
    }
    case 'house-set-tier':
      setTier(save.house!, id!, target.dataset.value!, shopAppeal(save).level.payMultiplier);
      break;
    case 'house-take-down':
      if (!confirm('Take it off the shelf? Any bottles left are given away to regulars.')) return;
      takeDown(save.house!, id!);
      break;
    case 'open-report':
      ui.reportDay = Number(target.dataset.value);
      return openPanel('report');
    case 'report-done':
      save.house!.unseen = 0;
      ui.screen = 'shop';
      break;
    case 'report-shelves':
      save.house!.unseen = 0;
      ui.upgradesTab = 'house';
      return openPanel('upgrades');
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
    case 'inc': {
      const max = Math.max(...currentRank().wearableParts);
      const step = max > 10 ? ui.step : 1;
      if (totalParts(save.draft) + step > max) {
        ui.toast = `That would be over ${max} parts, a full formula. Take some out to add more.`;
        break;
      }
      sounds.play('glass');
      return setDraft(addParts(save.draft, id!, step));
    }
    case 'dec':
      return setDraft(addParts(save.draft, id!, -(Math.max(...currentRank().wearableParts) > 10 ? ui.step : 1)));
    case 'step':
      ui.step = Number(target.dataset.step);
      break;
    case 'set-dilution': {
      const dilution = Number(target.dataset.value) as Dilution;
      const next = { ...save.draftDilutions };
      if (dilution === 100) delete next[id!];
      else next[id!] = dilution;
      return setDraft(save.draft, next);
    }
    case 'scale-up':
      return setDraft(Object.fromEntries(Object.entries(save.draft).map(([k, v]) => [k, v * 10])));
    case 'dilute': {
      const why = dilute(save.sourcing!, id!, Number(target.dataset.value) as 10 | 1, nowGame());
      ui.toast = why ?? `Made ${DILUTION_BATCH_GRAMS} g of ${materialsById.get(id!)?.name} at ${target.dataset.value}%.`;
      break;
    }
    case 'load-example': {
      const accord = content.accords.find((a) => a.id === id);
      if (!accord) return;
      ui.screen = 'organ';
      ui.organTab = 'formula';
      scrollToTop = true;
      return setDraft({ ...accord.example.parts }, accord.example.dilutions ?? {});
    }
    case 'save-base': {
      if (totalParts(save.draft) === 0) return;
      if (Object.keys(save.draft).some(isBaseKey)) {
        ui.toast = 'A base can only hold materials, not other bases.';
        break;
      }
      const input = document.querySelector<HTMLInputElement>('#save-name');
      const name = input?.value.trim() || `Base ${save.bases!.length + 1}`;
      save.bases!.push({ id: `b${Date.now()}`, name, parts: { ...save.draft }, dilutions: { ...save.draftDilutions }, createdAt: Date.now() });
      ui.toast = `Saved “${name}” as a base: find it under My bases at the top of Materials.`;
      break;
    }
    case 'delete-base': {
      const base = save.bases!.find((b) => b.id === id);
      if (base && confirm(`Delete the base "${base.name}"? Formulas that use it will lose it.`)) save.bases = save.bases!.filter((b) => b.id !== id);
      break;
    }
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
      saveDraftFormula(input?.value.trim() || `Formula ${save.formulas.length + 1}`);
      return openPanel('book');
    }
    case 'load-formula': {
      const formula = save.formulas.find((f) => f.id === id);
      if (!formula) return;
      ui.screen = 'organ';
      ui.organTab = 'formula';
      scrollToTop = true;
      return setDraft({ ...formula.parts }, formula.dilutions ?? {});
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
