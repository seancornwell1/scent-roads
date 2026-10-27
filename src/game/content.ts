import familiesJson from '../data/families.json';
import materialsJson from '../data/materials.json';
import accordsJson from '../data/accords.json';
import modelJson from '../data/model.json';
import { LAYERS, VOLATILITIES, type Content, type Material } from './types';

export const content: Content = {
  families: familiesJson,
  materials: materialsJson as unknown as Material[],
  accords: accordsJson as unknown as Content['accords'],
  model: modelJson,
};

/** Returns a list of problems with the content; empty when it is valid. */
export function validateContent(c: Content): string[] {
  const errors: string[] = [];
  const familyIds = new Set(c.families.map((f) => f.id));
  const materialIds = new Set<string>();

  for (const m of c.materials) {
    const at = `material "${m.id}"`;
    if (materialIds.has(m.id)) errors.push(`${at}: duplicate id`);
    materialIds.add(m.id);
    if (!familyIds.has(m.family)) errors.push(`${at}: unknown family "${m.family}"`);
    if (!LAYERS.includes(m.layer)) errors.push(`${at}: unknown layer "${m.layer}"`);
    if (!VOLATILITIES.includes(m.volatility)) errors.push(`${at}: unknown volatility "${m.volatility}"`);
    if (m.type !== 'natural' && m.type !== 'synthetic') errors.push(`${at}: type must be natural or synthetic`);
    if (m.verified !== (m.check.length === 0)) errors.push(`${at}: verified must be true exactly when check is empty`);
    if (!(m.model.strength >= 1 && m.model.strength <= 10)) errors.push(`${at}: strength must be 1–10`);
    if (!(m.model.halfLifeHours > 0)) errors.push(`${at}: halfLifeHours must be positive`);
  }

  const accordIds = new Set<string>();
  for (const a of c.accords) {
    const at = `accord "${a.id}"`;
    if (accordIds.has(a.id)) errors.push(`${at}: duplicate id`);
    accordIds.add(a.id);
    if (a.verified !== (a.check.length === 0)) errors.push(`${at}: verified must be true exactly when check is empty`);
    if (a.requires.length === 0) errors.push(`${at}: needs at least one requirement`);
    for (const r of a.requires) {
      const selectors = [r.materials, r.family, r.layer].filter((s) => s !== undefined).length;
      if (selectors !== 1) errors.push(`${at}: each requirement needs exactly one of materials, family, layer`);
      if (r.min === undefined && r.max === undefined) errors.push(`${at}: each requirement needs min or max`);
      for (const id of r.materials ?? []) if (!materialIds.has(id)) errors.push(`${at}: unknown material "${id}"`);
      if (r.family !== undefined && !familyIds.has(r.family)) errors.push(`${at}: unknown family "${r.family}"`);
      if (r.layer !== undefined && !LAYERS.includes(r.layer)) errors.push(`${at}: unknown layer "${r.layer}"`);
    }
  }

  const hours = c.model.stages.map((s) => s.hours);
  if (hours.length === 0 || hours.some((h, i) => i > 0 && h <= hours[i - 1])) {
    errors.push('model: stages must be listed in increasing hours');
  }
  return errors;
}

export const materialsById = new Map(content.materials.map((m) => [m.id, m]));
export const familiesById = new Map(content.families.map((f) => [f.id, f]));
