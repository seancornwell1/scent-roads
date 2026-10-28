import { DILUTIONS, entriesOf, partsTotal, type Base, type Dilution, type Dilutions, type Recipe } from './blend';
import type { Formula, Material } from './types';

// Formula sheets you can weigh out at home, and importing your real formulas.
// A sheet lists each material as you'd weigh it: the stock it's taken from (neat or a
// dilution), its parts, its share of the formula, and grams for a chosen batch of
// concentrate. Bases are opened up into their materials. Wearable perfume is the
// concentrate diluted in perfumer's alcohol.

export interface SheetRow {
  material: string;
  name: string;
  dilution: Dilution;
  parts: number;
  percent: number;
  grams: number;
}

export function formulaSheet(recipe: Recipe, bases: Base[], materials: Map<string, Material>, batchGrams: number): SheetRow[] {
  const blend = entriesOf(recipe, bases);
  const total = partsTotal(blend);
  return blend
    .map((e) => ({
      material: e.material,
      name: materials.get(e.material)?.name ?? e.material,
      dilution: e.dilution,
      parts: Math.round(e.parts * 100) / 100,
      percent: total > 0 ? Math.round((e.parts / total) * 1000) / 10 : 0,
      grams: total > 0 ? Math.round((e.parts / total) * batchGrams * 1000) / 1000 : 0,
    }))
    .sort((a, b) => b.parts - a.parts);
}

/** The sheet as plain text (comma-separated, one material a line), which import reads back. */
export function sheetText(name: string, rows: SheetRow[], batchGrams: number, wearableConcentration: number): string {
  const lines = [
    `# ${name}`,
    `# Batch: ${batchGrams} g of concentrate. To wear, dilute to ${wearableConcentration}% in perfumer's alcohol (${batchGrams} g concentrate + ${Math.round((batchGrams * (100 - wearableConcentration)) / wearableConcentration)} g alcohol).`,
    'Material, Dilution %, Parts, % of formula, Grams to weigh',
    ...rows.map((r) => `${r.name}, ${r.dilution}, ${r.parts}, ${r.percent}, ${r.grams}`),
  ];
  return lines.join('\n') + '\n';
}

/**
 * Reads a formula typed or pasted in: one material a line, as "Name, parts" or
 * "Name, dilution %, parts" (as a sheet writes it), or "Name parts" / "Name: parts", with an
 * optional "at 10%". Lines starting with # and the header line are skipped.
 */
export function parseFormula(text: string, materials: Material[]): { parts: Formula; dilutions: Dilutions; unknown: string[] } {
  const parts: Formula = {};
  const dilutions: Dilutions = {};
  const unknown: string[] = [];
  const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const byName = (name: string) => {
    const n = norm(name);
    return materials.find((m) => norm(m.name) === n || norm(m.id) === n) ?? materials.find((m) => norm(m.name).startsWith(n) || n.startsWith(norm(m.name)));
  };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || /^material\s*,/i.test(line)) continue;
    let name: string;
    let numbers: number[];
    let dilution: number | undefined;
    const at = line.match(/\bat\s+(\d+(?:\.\d+)?)\s*%/i);
    if (at) dilution = Number(at[1]);
    const cleaned = line.replace(/\bat\s+\d+(?:\.\d+)?\s*%/i, '');
    if (cleaned.includes(',')) {
      const cells = cleaned.split(',').map((c) => c.trim());
      name = cells[0];
      numbers = cells.slice(1).map((c) => Number(c.replace('%', ''))).filter((n) => !Number.isNaN(n));
      // A sheet line: name, dilution, parts, percent, grams.
      if (numbers.length >= 2 && DILUTIONS.includes(numbers[0] as Dilution)) {
        dilution = numbers[0];
        numbers = numbers.slice(1);
      }
    } else {
      const m = cleaned.match(/^(.*?)[:\s]+(\d+(?:\.\d+)?)\s*$/);
      if (!m) {
        unknown.push(line);
        continue;
      }
      name = m[1];
      numbers = [Number(m[2])];
    }
    const material = byName(name);
    const amount = numbers[0];
    if (!material || !(amount > 0)) {
      unknown.push(name || line);
      continue;
    }
    parts[material.id] = (parts[material.id] ?? 0) + amount;
    if (dilution !== undefined && DILUTIONS.includes(dilution as Dilution) && dilution < 100) dilutions[material.id] = dilution as Dilution;
  }
  return { parts, dilutions, unknown };
}
