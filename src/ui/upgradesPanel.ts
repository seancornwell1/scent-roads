import { shop } from '../game/shop';
import { processes } from '../game/sourcing';
import { furniture, inStorage, itemById, nextAppealLevel, processLevel, processStats } from '../game/upgrades';
import { shopAppeal } from '../game/world';
import { shopStyle } from '../game/style';
import { familiesById } from '../game/content';
import { state } from '../state';
import { esc } from './html';
import { houseTab } from './house';

// The Shop panel: furniture and decor, house perfumes and processing. (Routes to
// growers open through their letters in the back room.)

const TABS = [
  { id: 'furniture', label: 'Furniture' },
  { id: 'house', label: 'House perfumes' },
  { id: 'processing', label: 'Processing' },
] as const;

export interface Spot {
  id: string;
  label: string;
  kind: 'floor' | 'surface';
}

export function allSpots(): Spot[] {
  const floor = shop.zones.filter((z) => z.kind === 'upgrade').map((z, i) => ({ id: z.id, label: `Floor spot ${i + 1}`, kind: 'floor' as const }));
  const surfaces = shop.surfaces.map((s) => ({ id: s.id, label: s.label, kind: 'surface' as const }));
  return [...floor, ...surfaces];
}

export function upgradesScreen(): string {
  const tab = state.ui.upgradesTab;
  const { appeal, level } = shopAppeal(state.save);
  const next = nextAppealLevel(appeal);
  const tabs = TABS.map((t) => `<button class="tab-chip ${t.id === tab ? 'on' : ''}" data-action="upgrades-tab" data-value="${t.id}">${t.label}</button>`).join('');
  const body = tab === 'furniture' ? furnitureTab() : tab === 'house' ? houseTab() : processingTab();
  return `<header class="bar-top">
      <button class="link" data-action="close-panel">Close</button>
      <h1>Shop</h1>
      <span></span>
    </header>
    <p class="small"><strong>Appeal ${appeal} · ${esc(level.name)}.</strong> Customers pay ×${level.payMultiplier}${level.strictness ? ' and expect a little more' : ''}.${next ? ` <span class="muted">${esc(next.name)} at ${next.min}.</span>` : ''}</p>
    <p class="muted small">${state.save.customers!.money} coins · reputation ${state.save.customers!.reputation}</p>
    <p class="small">${styleLine()}</p>
    <nav class="tab-chips">${tabs}</nav>
    <main class="backroom">${body}</main>`;
}

function furnitureTab(): string {
  const u = state.save.upgrades!;
  const reputation = state.save.customers!.reputation;
  const money = state.save.customers!.money;
  const picking = state.ui.pickSpot;

  const spots = allSpots()
    .map((spot) => {
      const placed = u.placed.find((p) => p.spot === spot.id);
      if (placed) {
        const item = itemById(placed.item)!;
        return `<li class="card"><div class="row-between"><span><strong>${esc(spot.label)}</strong> · ${esc(item.name)} <span class="muted small">+${item.appeal}</span></span>
          <button class="link" data-action="unplace" data-id="${spot.id}">Put away</button></div></li>`;
      }
      const fits = furniture.items.filter((i) => i.placement === spot.kind && inStorage(u, i.id) > 0);
      const choices =
        picking === spot.id
          ? `<div class="chips">${fits.length ? fits.map((i) => `<button class="chip" data-action="place" data-id="${spot.id}" data-item="${i.id}">${esc(i.name)}</button>`).join('') : `<span class="muted small">Nothing in storage fits here: buy something for the ${spot.kind === 'floor' ? 'floor' : 'tables and counter'} below.</span>`}</div>`
          : '';
      return `<li class="card"><div class="row-between"><span><strong>${esc(spot.label)}</strong> <span class="muted small">empty · ${spot.kind === 'floor' ? 'floor' : 'table top'}</span></span>
        <button class="link" data-action="pick-spot" data-id="${spot.id}">${picking === spot.id ? 'Cancel' : 'Place…'}</button></div>${choices}</li>`;
    })
    .join('');

  const storage = furniture.items
    .filter((i) => inStorage(u, i.id) > 0)
    .map((i) => `${esc(i.name)}${inStorage(u, i.id) > 1 ? ` ×${inStorage(u, i.id)}` : ''}`)
    .join(', ');

  const catalogue = Object.entries(furniture.kinds)
    .map(([kind, label]) => {
      const rows = furniture.items
        .filter((i) => i.kind === kind)
        .map((i) => {
          const locked = reputation < i.reputation;
          const note = `${i.placement === 'floor' ? 'floor' : 'table top'} · appeal +${i.appeal}${i.capacity ? ` · holds ${i.capacity} perfumes` : ''}`;
          return `<li class="card"><div class="row-between"><div><strong>${esc(i.name)}</strong><br><span class="muted small">${note}</span></div>
            ${locked ? `<span class="muted small">Reputation ${i.reputation}</span>` : `<button class="primary" data-action="buy-item" data-id="${i.id}" ${money < i.price ? 'disabled' : ''}>${i.price} coins</button>`}</div></li>`;
        })
        .join('');
      return `<h3>${esc(label)}</h3><ul class="list cards">${rows}</ul>`;
    })
    .join('');

  return `<p class="muted small">Buy pieces into storage, then place them. Everything placed adds to the shop's appeal.</p>
    <h2>Your shop</h2><ul class="list cards">${spots}</ul>
    <p class="small"><strong>Storage:</strong> ${storage || '<span class="muted">empty</span>'}</p>
    <h2>Catalogue</h2>${catalogue}`;
}

function processingTab(): string {
  const u = state.save.upgrades!;
  const reputation = state.save.customers!.reputation;
  const money = state.save.customers!.money;
  const rows = processes
    .map((p) => {
      const level = processLevel(u, p);
      const stats = processStats(u, p.id);
      let action: string;
      let cost: { coins: number; reputation: number; name: string } | null;
      if (level === null) cost = { ...p.unlock!, name: 'Buy' };
      else cost = p.upgrades[level] ? { ...p.upgrades[level], name: p.upgrades[level].name } : null;
      if (!cost) action = '<span class="muted small">Fully upgraded</span>';
      else if (reputation < cost.reputation) action = `<span class="muted small">${esc(cost.name)}: reputation ${cost.reputation}</span>`;
      else action = `<button class="primary" data-action="buy-process" data-id="${p.id}" ${money < cost.coins ? 'disabled' : ''}>${esc(cost.name)} · ${cost.coins} coins</button>`;
      const status = level === null ? 'Not owned' : `Level ${level + 1} · quality ×${stats.quality.toFixed(2)} · ${stats.gameHours} game hours`;
      return `<li class="card"><div><strong>${esc(p.name)}</strong> <span class="muted small">${status}</span></div><p class="muted small">${esc(p.about)}</p><div class="row-between"><span></span>${action}</div></li>`;
    })
    .join('');
  return `<p class="muted small">Buy new processing methods and upgrade the ones you have: each upgrade gives better quality, faster.</p><ul class="list cards">${rows}</ul>`;
}

/** What the shop is known for: the families of the perfumes you've handed over lately. */
function styleLine(): string {
  const style = Object.entries(shopStyle(state.save.styleHistory ?? []))
    .sort((a, b) => b[1] - a[1])
    .filter(([, v]) => v >= 0.1)
    .slice(0, 3);
  if (style.length === 0) return '<span class="muted">Your shop has no style yet: it grows from the perfumes you hand over.</span>';
  return `<strong>Your shop leans</strong> ${esc(style.map(([f, v]) => `${familiesById.get(f)?.name.toLowerCase() ?? f} (${Math.round(v * 100)}%)`).join(', '))}. Customers who love that come more often, and some regulars only come to a shop like yours.`;
}
