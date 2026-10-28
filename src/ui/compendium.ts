import { content, familiesById } from '../game/content';
import { mastery, revealed, training } from '../game/learning';
import type { Material } from '../game/types';
import { ownedMaterials } from '../game/world';
import { state } from '../state';
import { esc } from './html';

// The compendium: a page per material you have. It fills in as you use the material (or
// master it in nose training), and keeps a space for your own smelling notes, which the
// game never writes in.

export function masteryDots(level: number): string {
  return `<span class="mastery" aria-label="mastery ${level} of ${training.maxMastery}">${'●'.repeat(level)}${'○'.repeat(training.maxMastery - level)}</span>`;
}

function era(year: number): string {
  return year < 1500 ? 'since antiquity or the Middle Ages' : year < 1800 ? `since about ${Math.round(year / 50) * 50}` : `since about ${Math.round(year / 10) * 10}`;
}

function locked(text: string): string {
  return `<p class="muted small locked">${esc(text)}</p>`;
}

/** One material's page. `actions` adds buttons (e.g. "Add 1 part" at the organ). */
export function compendiumEntry(m: Material, actions = ''): string {
  const learning = state.save.learning!;
  const uses = learning.uses[m.id] ?? 0;
  const level = mastery(learning, m.id);
  const r = m.ref;
  const o = m.origin;
  const origin = [o.plant, o.region, o.method, o.note].filter(Boolean).map((x) => `<li>${esc(x!)}</li>`).join('');
  const unverified = m.verified ? '' : `<p class="tag tag--warn block">Unverified: ${esc(m.check.map((field) => field.split('.').pop()).join(', '))}. Listed in the fact check.</p>`;
  const refNote = r.verified ? '' : ' <span class="tag tag--warn">unverified</span>';

  const behaviour = revealed(learning, m.id, 'behaviour')
    ? `${m.behaviour ? `<p><strong>In blends:</strong> ${esc(m.behaviour)}</p>` : ''}<h3>Origin</h3><ul class="plain">${origin}</ul>`
    : locked('Use it in a perfume to learn how it behaves in a blend and where it comes from.');
  const reference = revealed(learning, m.id, 'reference')
    ? `<h3>On the strip${refNote}</h3><ul class="plain small">
        <li>Lasts about ${r.tenacityHours >= 48 ? `${Math.round(r.tenacityHours / 24)} days` : `${r.tenacityHours} hours`} on a smelling strip</li>
        <li>Usually worked at ${r.dilution}%${r.dilution < 100 ? ' (diluted)' : ''}</li>
        <li>In perfumery ${era(r.year)}</li>
      </ul>`
    : locked(`Use it ${training.reveal.reference.uses} times, or train your nose on it, to learn how long it lasts and how it's worked.`);
  const safety = revealed(learning, m.id, 'safety')
    ? `<h3>Safety and cost${refNote}</h3><ul class="plain small">
        <li>${r.ifraLimit === null ? 'No IFRA limit in fine fragrance' : `IFRA limit: at most ${r.ifraLimit}% of a finished fine fragrance`}</li>
        <li>Costs roughly €${r.costPerKg.toLocaleString('en')} a kilo</li>
      </ul>`
    : locked(`Use it ${training.reveal.safety.uses} times, or master it, to learn its safety limit and cost.`);

  return `<h2>${esc(m.name)}</h2>
    <p class="muted small">${m.type === 'natural' ? 'Natural' : 'Synthetic'} · ${esc(familiesById.get(m.family)?.name ?? m.family)}, ${esc(m.subfamily)} · ${training.layerNames[m.layer]} · ${esc(m.volatility)} volatility</p>
    <p class="small">Mastery ${masteryDots(level)} · used in ${uses} perfume${uses === 1 ? '' : 's'}</p>
    ${unverified}
    <p>${esc(m.character)}</p>
    ${behaviour}
    ${reference}
    ${safety}
    <h3>My notes</h3>
    <textarea class="my-notes" data-note="${esc(m.id)}" rows="4" placeholder="What do you smell? Only you write here.">${esc(learning.notes[m.id] ?? '')}</textarea>
    ${actions}`;
}

/** Every material you have, by family, with your mastery. */
export function compendiumList(): string {
  const owned = ownedMaterials(state.save);
  const learning = state.save.learning!;
  const id = state.ui.compendiumId;
  if (id && owned.has(id)) {
    const m = content.materials.find((x) => x.id === id)!;
    return `<button class="link" data-action="close-entry">← All materials</button><article class="card compendium-entry">${compendiumEntry(m)}</article>`;
  }
  const groups = content.families
    .map((f) => {
      const items = content.materials.filter((m) => m.family === f.id && owned.has(m.id)).sort((a, b) => a.name.localeCompare(b.name));
      if (items.length === 0) return '';
      const rows = items
        .map((m) => `<li><button class="material-add" data-action="open-entry" data-id="${esc(m.id)}"><span class="material-name">${esc(m.name)}</span><span class="muted small">${esc(m.subfamily)} · ${masteryDots(mastery(learning, m.id))}${learning.notes[m.id] ? ' · noted' : ''}</span></button></li>`)
        .join('');
      return `<h3>${esc(f.name)}</h3><ul class="list">${rows}</ul>`;
    })
    .join('');
  return `<p class="muted small">${owned.size} of ${content.materials.length} materials discovered. Pages fill in as you use each material and train your nose on it.</p>${groups}`;
}
