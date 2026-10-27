import type { Formula, Material, Model, Stage } from './types';

export interface StageShare {
  materialId: string;
  /** Percent of what the nose perceives at this stage. */
  share: number;
}

export interface StageProfile {
  stage: Stage;
  /** Total intensity relative to the opening (opening = 1). */
  loudness: number;
  loudnessLabel: string;
  shares: StageShare[];
}

/**
 * Perceived intensity of one material at a time after application.
 * Each strength step multiplies impact by `strengthBase`; each material
 * loses half its intensity every `halfLifeHours`.
 */
export function intensity(material: Material, parts: number, hours: number, model: Model): number {
  const impact = model.strengthBase ** (material.model.strength - model.strengthPivot);
  return parts * impact * 0.5 ** (hours / material.model.halfLifeHours);
}

/** The formula's profile at each stage in the model: who dominates, and how loud it still is. */
export function drydown(formula: Formula, materials: Map<string, Material>, model: Model): StageProfile[] {
  const entries = Object.entries(formula).flatMap(([id, parts]) => {
    const material = materials.get(id);
    return material && parts > 0 ? [{ material, parts }] : [];
  });

  let openingTotal = 0;
  return model.stages.map((stage, index) => {
    const values = entries.map(({ material, parts }) => ({
      materialId: material.id,
      value: intensity(material, parts, stage.hours, model),
    }));
    const total = values.reduce((sum, v) => sum + v.value, 0);
    if (index === 0) openingTotal = total;
    const loudness = openingTotal > 0 ? total / openingTotal : 0;
    const label = model.loudness.find((l) => loudness >= l.min)?.label ?? '';
    const shares = values
      .map((v) => ({ materialId: v.materialId, share: total > 0 ? (v.value / total) * 100 : 0 }))
      .sort((a, b) => b.share - a.share);
    return { stage, loudness, loudnessLabel: label, shares };
  });
}
