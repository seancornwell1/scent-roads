import { MONTH_NAMES, dateAt } from '../game/clock';
import { clients } from '../game/clients';
import { content, materialsById } from '../game/content';
import { sourcing } from '../game/sourcing';
import { pageFormula, personById, requestForPage, story, type Page, type StoryState } from '../game/story';
import { ownedMaterials } from '../game/world';
import { state } from '../state';
import type { Formula } from '../game/types';
import { esc, formatDate, formatParts, header, starsText } from './html';
import { compendiumList } from './compendium';

const TABS = [
  { id: 'pages', label: 'Her pages' },
  { id: 'compendium', label: 'Compendium' },
  { id: 'accords', label: 'Accords' },
  { id: 'formulas', label: 'My formulas' },
  { id: 'reviews', label: 'Reviews' },
] as const;

// The formula book: Mireille's pages, the compendium of materials, accords, my own
// formulas and reviews, in tabs.

function formulaText(formula: Formula): string {
  return Object.entries(formula)
    .sort((a, b) => b[1] - a[1])
    .map(([id, parts]) => `${materialsById.get(id)?.name ?? id} ${formatParts(parts)}`)
    .join(', ');
}

function gameDate(gameHours: number): string {
  const d = dateAt(gameHours, sourcing.calendarStart);
  return `${d.day} ${MONTH_NAMES[d.month - 1]}`;
}

/**
 * One page of her book. Until it's recovered every amount is smudged, and the names of
 * materials you don't have yet have run too.
 */
export function pageCard(page: Page, s: StoryState, actions = true): string {
  const recovered = s.pages[page.id];
  const head = `<div><strong>${esc(page.title)}</strong>${page.dated ? ` <span class="muted small">${esc(page.dated)}</span>` : ''}</div>`;
  if (page.signature) {
    return `<li class="card page page--blank">${head}<p class="muted small"><em>${esc(page.margin)}</em></p></li>`;
  }
  const formula = pageFormula(page.id) ?? {};
  const owned = ownedMaterials(state.save);
  const rows = Object.entries(formula)
    .sort((a, b) => b[1] - a[1])
    .map(([id, parts]) => {
      const named = recovered || (!page.hiddenNames.includes(id) && owned.has(id));
      const name = named ? esc(materialsById.get(id)?.name ?? id) : '<span class="smudge">the ink has run</span>';
      const amount = recovered ? `${formatParts(parts)} parts` : '<span class="smudge">smudged</span>';
      return `<li><span>${name}</span><span>${amount}</span></li>`;
    })
    .join('');
  const request = requestForPage(page.id);
  const person = request ? personById(request.person) : undefined;
  const rs = request ? s.requests[request.id] : undefined;
  const status = recovered
    ? `Recovered for ${esc(recovered.for)}, ${gameDate(recovered.at)}.`
    : rs && person
      ? `${esc(person.name)} remembers this one.`
      : 'Nobody has asked for this one yet.';
  const lesson = recovered && page.lesson
    ? `<p class="small lesson">${esc(page.lesson.text)}${page.lesson.verified ? '' : ' <span class="tag tag--warn">unverified</span>'}</p>`
    : '';
  const load = actions && recovered ? `<div class="row-between"><span></span><button class="primary" data-action="load-page" data-id="${esc(page.id)}">Open on the organ</button></div>` : '';
  return `<li class="card page">${head}
    <ul class="plain page-lines">${rows}</ul>
    <p class="small margin-note"><em>In the margin: “${esc(page.margin)}”</em></p>
    ${lesson}
    <p class="muted small">${status}</p>
    ${load}
  </li>`;
}

export function bookScreen(): string {
  const { save } = state;
  const s = save.story!;
  const recoveredCount = story.pages.filter((p) => s.pages[p.id]).length;
  const pages = story.pages.map((p) => pageCard(p, s)).join('');

  const accords = content.accords
    .map((a) => {
      const found = save.discoveredAccords[a.id];
      const warn = a.verified ? '' : ' <span class="tag tag--warn">unverified</span>';
      if (!found) {
        const hint = a.course.mission ? `Taught in course mission ${esc(a.course.mission)}.` : '';
        return `<li class="card"><div><strong>${esc(a.name)}</strong>${warn}</div><p class="muted small">Not discovered yet. ${hint}</p></li>`;
      }
      return `<li class="card"><div><strong>${esc(a.name)}</strong>${warn}</div>
        <p>${esc(a.description)}</p>
        <p class="muted small">Discovered ${formatDate(found.at)} in: ${esc(formulaText(found.formula))}</p></li>`;
    })
    .join('');

  const formulas = save.formulas.length
    ? save.formulas
        .slice()
        .sort((a, b) => b.createdAt - a.createdAt)
        .map(
          (f) => `<li class="card">
            <div><strong>${esc(f.name)}</strong> <span class="muted small">${formatDate(f.createdAt)}</span></div>
            <p class="small">${esc(formulaText(f.parts))}</p>
            ${f.accords.length ? `<div class="chips">${f.accords.map((id) => `<span class="chip on">${esc(content.accords.find((a) => a.id === id)?.name ?? id)}</span>`).join('')}</div>` : ''}
            <div class="row-between">
              <button class="link danger" data-action="delete-formula" data-id="${esc(f.id)}">Delete</button>
              <button class="primary" data-action="load-formula" data-id="${esc(f.id)}">Open on the organ</button>
            </div>
          </li>`,
        )
        .join('')
    : '<li class="muted">No saved formulas yet. Save one from the organ.</li>';

  const reviews = (save.customers?.reviews ?? [])
    .slice()
    .reverse()
    .map(
      (r) => `<li class="card">
        <div><strong>${esc(r.name)}</strong> <span class="muted small">${formatDate(r.at)}</span></div>
        <p class="small">“${esc(r.perfume)}” · ${starsText(r.stars)} · reputation ${r.reputation >= 0 ? '+' : ''}${r.reputation}</p>
        ${r.weakStage ? `<p class="muted small">Let down by ${esc(clients.lines.stageNames[r.weakStage] ?? r.weakStage)}.</p>` : ''}
      </li>`,
    )
    .join('');

  const tab = state.ui.bookTab;
  const tabs = TABS.map((t) => `<button class="tab-chip ${t.id === tab ? 'on' : ''}" data-action="book-tab" data-value="${t.id}">${t.label}</button>`).join('');
  const body =
    tab === 'pages'
      ? `<p class="muted small">${esc(story.grandmother)}'s pages: ${recoveredCount} of ${story.pages.filter((p) => !p.signature).length} recovered so far. When someone remembers one of her perfumes, recreate it for them: a three-star match fills in her page.</p><ul class="list cards">${pages}</ul>`
      : tab === 'compendium'
        ? compendiumList()
        : tab === 'accords'
          ? `<ul class="list cards">${accords}</ul>`
          : tab === 'formulas'
            ? `<ul class="list cards">${formulas}</ul>`
            : `<ul class="list cards">${reviews || '<li class="muted">No reviews yet. Customers come back to tell you how their perfume wore.</li>'}</ul>`;
  return `${header('Formula book')}
    <nav class="tab-chips">${tabs}</nav>
    <main class="book">${body}</main>`;
}
