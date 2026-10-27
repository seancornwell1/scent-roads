import { content, materialsById } from '../game/content';
import { state } from '../state';
import type { Formula } from '../game/types';
import { esc, formatDate, formatParts, header } from './html';

function formulaText(formula: Formula): string {
  return Object.entries(formula)
    .sort((a, b) => b[1] - a[1])
    .map(([id, parts]) => `${materialsById.get(id)?.name ?? id} ${formatParts(parts)}`)
    .join(', ');
}

export function bookScreen(): string {
  const { save } = state;
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

  return `${header('Formula book')}
    <main class="book">
      <h2>Accords</h2><ul class="list cards">${accords}</ul>
      <h2>My formulas</h2><ul class="list cards">${formulas}</ul>
    </main>`;
}
