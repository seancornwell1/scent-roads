import { familiesById, materialsById } from '../game/content';
import type { StageProfile } from '../game/evaporation';
import { esc } from './html';

/**
 * The drydown graph: one bar per stage. Segments show who dominates, coloured
 * by family; the bar's length shows how loud the stage is next to the opening.
 */
export function drydownGraph(profiles: StageProfile[]): string {
  return `<div class="graph">${profiles.map(stageRow).join('')}</div>`;
}

function stageRow(p: StageProfile): string {
  const width = Math.max(p.loudness * 100, 4);
  const segments = p.shares
    .filter((s) => s.share >= 1)
    .map((s) => {
      const m = materialsById.get(s.materialId)!;
      return `<span class="seg fam-${esc(m.family)}" style="width:${s.share.toFixed(2)}%"></span>`;
    })
    .join('');
  const legend = p.shares
    .filter((s) => s.share >= 1)
    .slice(0, 3)
    .map((s) => {
      const m = materialsById.get(s.materialId)!;
      return `<span class="legend-item"><span class="swatch fam-${esc(m.family)}"></span>${esc(m.name)} ${Math.round(s.share)}%</span>`;
    })
    .join('');
  return `<div class="stage">
    <div class="stage-head"><strong>${esc(p.stage.name)}</strong><span class="muted small">${esc(p.stage.label)} · ${esc(p.loudnessLabel)}</span></div>
    <div class="track"><div class="fill" style="width:${width.toFixed(1)}%">${segments}</div></div>
    <div class="legend small">${legend}</div>
  </div>`;
}

export function familyName(id: string): string {
  return familiesById.get(id)?.name ?? id;
}
