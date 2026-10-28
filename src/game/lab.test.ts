import { describe, expect, it } from 'vitest';
import { entriesOf, overdosed, partsTotal, safetyIssues } from './blend';
import { clients } from './clients';
import { content, materialsById } from './content';
import { analyse, challengeBrief, lab, newLabState, recordChallenge, runSample, upgradeLab } from './lab';
import { rankById } from './ranks';
import { scorePerfume } from './scoring';
import { formulaSheet, parseFormula, sheetText } from './sheet';

describe('reconstruction challenges', () => {
  it('have invented names, safe targets in 100 parts, and known materials', () => {
    for (const c of lab.challenges) {
      const blend = entriesOf({ parts: c.target.formula, dilutions: c.target.dilutions });
      expect(partsTotal(blend)).toBe(100);
      for (const id of Object.keys(c.target.formula)) expect(materialsById.has(id)).toBe(true);
      expect({ id: c.id, safety: safetyIssues(blend, materialsById, content.model), harsh: overdosed(blend, materialsById, content.model) }).toEqual({ id: c.id, safety: [], harsh: [] });
      const self = scorePerfume(blend, challengeBrief(c).target, materialsById, content.model, clients.scoring);
      expect(self.stars).toBe(3);
    }
  });

  it('reward three stars once', () => {
    const s = newLabState();
    expect(recordChallenge(s, 'eau-imperiale', 2)).toBeNull();
    expect(recordChallenge(s, 'eau-imperiale', 3)).toEqual(lab.challenges[0].reward);
    expect(recordChallenge(s, 'eau-imperiale', 3)).toBeNull();
    expect(s.challenges['eau-imperiale'].best).toBe(3);
  });
});

describe('the lab', () => {
  const sample = entriesOf({ parts: { bergamot: 50, lavender: 30, labdanum: 15, vanillin: 5 } });
  it('shows more components, then percentages, as it is equipped', () => {
    expect(analyse(sample, lab.levels[0])).toEqual([{ material: 'bergamot' }, { material: 'lavender' }]);
    expect(analyse(sample, lab.levels[1])).toHaveLength(4);
    expect(analyse(sample, lab.levels[2])[0]).toEqual({ material: 'bergamot', percent: 50 });
  });

  it('is bought in levels, and costs a little per run', () => {
    const s = newLabState();
    const wallet = { money: 1000 };
    expect(runSample(s, wallet, 'eau-imperiale')).toMatch(/Equip/);
    expect(upgradeLab(s, wallet, 0)).toMatch(/reputation/);
    expect(upgradeLab(s, wallet, 99)).toBeNull();
    expect(runSample(s, wallet, 'eau-imperiale')).toBeNull();
    expect(s.analyses['eau-imperiale'].components).toHaveLength(lab.levels[0].reveal);
    expect(wallet.money).toBe(1000 - lab.levels[0].coins - lab.runCost);
  });
});

describe('masters', () => {
  it('work in up to 1000 parts', () => {
    expect(rankById('master').wearableParts).toContain(1000);
  });
});

describe('formula sheets and import', () => {
  const recipe = { parts: { bergamot: 6, oakmoss: 1, labdanum: 3 }, dilutions: { oakmoss: 10 as const } };

  it('list grams to weigh that add up to the batch', () => {
    const rows = formulaSheet(recipe, [], materialsById, 50);
    expect(rows.reduce((a, r) => a + r.grams, 0)).toBeCloseTo(50, 2);
    expect(rows.find((r) => r.material === 'oakmoss')).toMatchObject({ dilution: 10, grams: 5 });
  });

  it('read back what they write', () => {
    const text = sheetText('Test', formulaSheet(recipe, [], materialsById, 10), 10, 10);
    const parsed = parseFormula(text, content.materials);
    expect(parsed.unknown).toEqual([]);
    expect(parsed.parts).toEqual({ bergamot: 6, labdanum: 3, oakmoss: 1 });
    expect(parsed.dilutions).toEqual({ oakmoss: 10 });
  });

  it('read formulas typed by hand, and list what they can’t match', () => {
    const parsed = parseFormula('Bergamot, 30\nlavender 20\nOakmoss 2 at 10%\nUnobtainium: 5', content.materials);
    expect(parsed.parts).toEqual({ bergamot: 30, lavender: 20, oakmoss: 2 });
    expect(parsed.dilutions).toEqual({ oakmoss: 10 });
    expect(parsed.unknown).toEqual(['Unobtainium']);
  });
});
