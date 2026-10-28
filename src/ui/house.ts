import { entriesOf, written } from '../game/blend';
import { dateAt, MONTH_NAMES } from '../game/clock';
import { materialsById } from '../game/content';
import {
  bottleCost,
  bottlesPossible,
  fairPrice,
  house,
  houseSlots,
  labelImage,
  labelName,
  priceAt,
  rateHouse,
  ratingWords,
  stockQualityFor,
  unlockBlockers,
  type DayReport,
  type HouseLabel,
  type HousePerfume,
  type HouseRating,
} from '../game/house';
import { sourcing } from '../game/sourcing';
import { displayCapacity } from '../game/upgrades';
import { knownTargets, shopAppeal } from '../game/world';
import { nowGame, state } from '../state';
import { esc, starsText } from './html';

// House perfumes: the Shop panel's tab, the screen for setting a new one up, and the end of
// day sales report. Labels are a generic set (placeholder boxes until their art arrives, see
// ASSETS_NEEDED.md) or an image you upload.

export function houseUnlocked(): boolean {
  return state.save.house!.unlockedAt !== undefined;
}

export function slotsNow(): number {
  return houseSlots(state.save.rank ?? 'apprentice', displayCapacity(state.save.upgrades!));
}

export function dayName(day: number): string {
  const d = dateAt(day * 24, sourcing.calendarStart);
  return `${d.day} ${MONTH_NAMES[d.month - 1]}`;
}

/** A label: its image if there is one, else a plain box naming the label style. */
export function labelBox(label: HouseLabel, name: string, size: 'small' | 'large' = 'small'): string {
  const image = labelImage(state.save.house!, label);
  return image
    ? `<img class="house-label house-label--${size}" src="${esc(image)}" alt="${esc(name)} label" />`
    : `<span class="house-label house-label--${size} house-label--placeholder"><span>${esc(name)}</span><small>${esc(labelName(label))} label</small></span>`;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

function stars(r: HouseRating): string {
  return `<span class="stars" aria-label="${r.stars} of 5 stars">${starsText(r.stars, 5)}</span>`;
}

function ratingList(r: HouseRating): string {
  return `<ul class="plain small rating-list">${ratingWords(r)
    .map((w) => `<li><strong>${esc(w.name)}:</strong> ${esc(w.text)}</li>`)
    .join('')}</ul>`;
}

/** The Shop panel's House perfumes tab. */
export function houseTab(): string {
  const { save } = state;
  const h = save.house!;
  if (!houseUnlocked()) {
    const why = unlockBlockers(save.customers!.reputation, save.sourcing!);
    return `<p class="small">Compose your own perfumes, name them, give them a label and sell them from the shelves. They sell while you're away, and each day ends with a sales report.</p>
      <h2>Not yet</h2><ul class="plain small">${why.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>`;
  }
  const slots = slotsNow();
  const payMultiplier = shopAppeal(save).level.payMultiplier;
  const shelf = h.perfumes
    .map((p) => {
      const fair = fairPrice(p.rating, payMultiplier);
      const tiers = house.pricing.tiers
        .map((t) => `<button class="chip ${t.id === p.tier ? 'on' : ''}" data-action="house-set-tier" data-id="${p.id}" data-value="${t.id}">${esc(t.name)} ${priceAt(fair, t.id)}</button>`)
        .join('');
      const more = house.bottleOptions.map((n) => `<button class="chip" data-action="house-restock" data-id="${p.id}" data-value="${n}">+${n}</button>`).join('');
      return `<li class="card house-card">
        ${labelBox(p.label, p.name)}
        <div>
          <strong>${esc(p.name)}</strong> ${stars(p.rating)}<br>
          <span class="muted small">${p.bottles ? `${p.bottles} bottle${p.bottles === 1 ? '' : 's'} left` : '<span class="warn-text">Sold out</span>'} · ${p.price} coins each · ${p.sold} sold for ${p.coins} coins</span>
          <div class="chips">${tiers}</div>
          <div class="row-between"><span class="chips"><span class="muted small">Make more</span>${more}</span><button class="link" data-action="house-take-down" data-id="${p.id}">Take down</button></div>
        </div>
      </li>`;
    })
    .join('');
  const formulas = save.formulas
    .map((f) => `<li class="card row-between"><span><strong>${esc(f.name)}</strong></span><button class="chip" data-action="house-new" data-id="${esc(f.id)}" ${h.perfumes.length >= slots ? 'disabled' : ''}>Make it a house perfume</button></li>`)
    .join('');
  const reports = [...h.reports]
    .reverse()
    .slice(0, 7)
    .map((r) => `<li class="card row-between"><span>${esc(dayName(r.day))}: ${r.lines.reduce((a, l) => a + l.sold, 0)} sold · ${r.coins} coins</span><button class="link" data-action="open-report" data-value="${r.day}">Report</button></li>`)
    .join('');
  return `<p class="muted small">Your own perfumes, sold from the shelves. Each bottle uses 1 g of materials from stock. Better perfumes, at a fair price, in an appealing shop, sell more; sales happen while you're away, and each day ends with a report.</p>
    <p class="small"><strong>${h.perfumes.length} of ${slots}</strong> places on the shelves. ${esc(house.slots.about)} Higher ranks get more.</p>
    ${shelf ? `<ul class="list cards">${shelf}</ul>` : ''}
    <h2>Your formulas</h2>
    <ul class="list cards">${formulas || '<li class="muted">Save a formula at the organ first.</li>'}</ul>
    <h2>Sales reports</h2>
    <ul class="list cards">${reports || '<li class="muted">No days on the shelves yet.</li>'}</ul>`;
}

/** Setting up a new house perfume: name, label, price and bottles, with its rating. */
export function houseNewScreen(): string {
  const { save, ui } = state;
  const draft = ui.houseNew!;
  const formula = save.formulas.find((f) => f.id === draft.formulaId);
  if (!formula) return `<header class="bar-top"><button class="link" data-action="close-panel">Close</button><h1>House perfume</h1><span></span></header><p>That formula is gone.</p>`;
  const blend = entriesOf(formula, save.bases);
  const quality = stockQualityFor(save.sourcing!, blend, nowGame());
  const rating = rateHouse(blend, knownTargets(), quality);
  const fair = fairPrice(rating, shopAppeal(save).level.payMultiplier);
  const can = bottlesPossible(save.sourcing!, blend);
  const materialCost = Math.max(1, Math.round(bottleCost(blend)));
  const full = save.house!.perfumes.length >= slotsNow();
  const parts = Object.entries(written(blend))
    .sort((a, b) => b[1] - a[1])
    .map(([id, p]) => `${esc(materialsById.get(id)?.name ?? id)} ${Math.round(p * 10) / 10}`)
    .join(' · ');

  const generic = house.labels
    .map((l) => `<button class="chip ${'generic' in draft.label && draft.label.generic === l.id ? 'on' : ''}" data-action="house-label" data-value="${l.id}">${esc(l.name)}</button>`)
    .join('');
  const custom = save.house!.labels
    .map((l, i) => `<button class="chip ${'custom' in draft.label && draft.label.custom === l.id ? 'on' : ''}" data-action="house-label-custom" data-value="${l.id}">Yours ${i + 1}</button>`)
    .join('');
  const tiers = house.pricing.tiers
    .map((t) => `<button class="chip ${t.id === draft.tier ? 'on' : ''}" data-action="house-tier" data-value="${t.id}">${esc(t.name)} · ${priceAt(fair, t.id)} coins</button>`)
    .join('');
  const bottles = house.bottleOptions
    .map((n) => `<button class="chip ${n === draft.bottles ? 'on' : ''}" data-action="house-bottles" data-value="${n}" ${n > can ? 'disabled' : ''}>${n}</button>`)
    .join('');
  const why = full ? 'Every place on the shelves is taken: take one down first.' : can === 0 ? 'Not enough materials in stock for even one bottle.' : null;

  return `<header class="bar-top"><button class="link" data-action="close-panel">Close</button><h1>House perfume</h1><span></span></header>
    <main class="customer house-new">
      <p class="muted small">From “${esc(formula.name)}”: ${parts}</p>
      <h2>Name</h2>
      <div class="save-row">
        <input id="house-name" type="text" maxlength="40" value="${esc(draft.name)}" />
        <button class="chip" data-action="house-suggest">Suggest</button>
      </div>
      <p class="muted small">Suggested from how it smells: the opening, and what it dries down to.</p>
      <h2>Label</h2>
      <div class="house-preview">${labelBox(draft.label, draft.name, 'large')}</div>
      <div class="chips">${generic}${custom}</div>
      <label class="file-pick small">Upload your own label <input type="file" id="label-upload" accept="image/*" /></label>
      <h2>How good it is ${stars(rating)}</h2>
      ${ratingList(rating)}
      <p class="muted small">Rated on structure, balance, how long it lasts, strength, richness, originality and the quality of your stock. Customers' briefs don't come into it.</p>
      <h2>Price</h2>
      <div class="chips">${tiers}</div>
      <p class="muted small">A fair price for a perfume this good is ${fair} coins. Cheaper sells faster; dearer sells slower. Materials cost about ${materialCost} coin${materialCost === 1 ? '' : 's'} a bottle.</p>
      <h2>Bottles to make</h2>
      <div class="chips">${bottles}</div>
      <p class="muted small">Stock for ${can} bottle${can === 1 ? '' : 's'}.</p>
      ${why ? `<p class="small warn-text">${esc(why)}</p>` : ''}
      <div class="row-between"><button class="link" data-action="close-panel">Not now</button><button class="primary" data-action="house-create" ${why ? 'disabled' : ''}>Put it on the shelf</button></div>
    </main>`;
}

function reportBody(r: DayReport): string {
  const perfumes = new Map(state.save.house!.perfumes.map((p) => [p.id, p] as [string, HousePerfume]));
  const rows = r.lines
    .map((l) => `<tr><td>${esc(l.name)}</td><td>${l.sold}</td><td>${l.coins}</td><td>${l.left === 0 && perfumes.has(l.id) ? '<span class="warn-text">sold out</span>' : l.left}</td></tr>`)
    .join('');
  const soldOut = r.lines.some((l) => l.left === 0 && perfumes.get(l.id)?.bottles === 0);
  return `<table class="sheet-table"><thead><tr><th>Perfume</th><th>Sold</th><th>Coins</th><th>Left</th></tr></thead><tbody>${rows}</tbody></table>
    <p><strong>${r.coins} coins</strong> today.</p>
    <p class="hint">“${esc(r.comment)}”</p>
    ${soldOut ? `<p class="small warn-text">${esc(house.comments.soldOut)}</p>` : ''}`;
}

/** The end-of-day sales report: the chosen (or latest) day, and a summary of the others since you last looked. */
export function reportScreen(): string {
  const h = state.save.house!;
  const day = state.ui.reportDay;
  const report = (day === null ? h.reports[h.reports.length - 1] : h.reports.find((r) => r.day === day)) ?? null;
  const earlier = day === null ? h.reports.slice(Math.max(0, h.reports.length - h.unseen), -1) : [];
  const summary = earlier.length
    ? `<h2>Earlier, while you were away</h2><p class="small">${earlier.length} more day${earlier.length === 1 ? '' : 's'}: ${plural(earlier.reduce((a, r) => a + r.lines.reduce((x, l) => x + l.sold, 0), 0), 'bottle')}, ${plural(earlier.reduce((a, r) => a + r.coins, 0), 'coin')}.</p>`
    : '';
  return `<header class="bar-top"><button class="link" data-action="report-done">Close</button><h1>End of day</h1><span></span></header>
    <main class="customer">
      ${report ? `<h2>${esc(dayName(report.day))}</h2>${reportBody(report)}` : '<p class="muted">No sales yet.</p>'}
      ${summary}
      <div class="row-between"><button class="link" data-action="report-shelves">To the shelves</button><button class="primary" data-action="report-done">Lovely</button></div>
    </main>`;
}
