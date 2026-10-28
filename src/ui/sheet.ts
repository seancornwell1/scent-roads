import { content, materialsById } from '../game/content';
import { formulaSheet, sheetText } from '../game/sheet';
import { state } from '../state';
import { esc, header } from './html';

// A formula sheet to weigh out at home: every material as you'd weigh it, in grams.

const BATCHES = [10, 50, 100];

export function sheetData(): { name: string; text: string } | null {
  const f = state.save.formulas.find((x) => x.id === state.ui.sheetId);
  if (!f) return null;
  const rows = formulaSheet(f, state.save.bases ?? [], materialsById, state.ui.sheetBatch);
  return { name: f.name, text: sheetText(f.name, rows, state.ui.sheetBatch, content.model.wearableConcentration) };
}

export function sheetScreen(): string {
  const f = state.save.formulas.find((x) => x.id === state.ui.sheetId);
  if (!f) return `${header('Formula sheet')}<main class="customer"><p>No formula chosen.</p></main>`;
  const batch = state.ui.sheetBatch;
  const rows = formulaSheet(f, state.save.bases ?? [], materialsById, batch);
  const conc = content.model.wearableConcentration;
  const table = rows
    .map((r) => `<tr><td>${esc(r.name)}${r.dilution < 100 ? ` <span class="muted small">at ${r.dilution}%</span>` : ''}</td><td class="num">${r.parts}</td><td class="num">${r.percent}%</td><td class="num"><strong>${r.grams} g</strong></td></tr>`)
    .join('');
  return `${header('Formula sheet')}
    <main class="customer">
      <h2>${esc(f.name)}</h2>
      <div class="row-between"><span class="muted small">Batch of concentrate</span><div class="chips">${BATCHES.map((b) => `<button class="chip ${b === batch ? 'on' : ''}" data-action="sheet-batch" data-value="${b}">${b} g</button>`).join('')}</div></div>
      <table class="sheet-table"><thead><tr><th>Material</th><th class="num">Parts</th><th class="num">%</th><th class="num">Weigh</th></tr></thead><tbody>${table}</tbody></table>
      <p class="small">Weigh each material from its own stock: a diluted one from its dilution, not neat. To wear it, dilute the concentrate to ${conc}% in perfumer's alcohol: ${batch} g of concentrate with ${Math.round((batch * (100 - conc)) / conc)} g of alcohol.</p>
      <p class="muted small">Check each material's safety limit before wearing it; the game's limits are unconfirmed.</p>
      <div class="row-between"><button class="link" data-action="sheet-copy">Copy as text</button><button class="primary" data-action="sheet-download">Download the sheet</button></div>
    </main>`;
}
