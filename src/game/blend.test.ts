import { describe, expect, it } from 'vitest';
import { baseKey, blendCost, concentrations, effective, entriesOf, overdosed, partsTotal, safetyIssues, written, type Base } from './blend';
import { blockers, checkPerfume, sellable } from './checks';
import { content, materialsById } from './content';

const amberBase: Base = { id: 'b1', name: 'My amber', parts: { labdanum: 5, vanillin: 5 }, createdAt: 0 };

describe('blends', () => {
  it('count a diluted part as one part, but smell (and cost) a tenth of it', () => {
    const blend = entriesOf({ parts: { bergamot: 9, oakmoss: 1 }, dilutions: { oakmoss: 10 } });
    expect(partsTotal(blend)).toBe(10);
    expect(effective(blend)).toEqual({ bergamot: 9, oakmoss: 0.1 });
    expect(written(blend)).toEqual({ bergamot: 9, oakmoss: 1 });
    expect(concentrations(blend).oakmoss).toBeCloseTo(1);
  });

  it('open bases up into their materials, in proportion', () => {
    const blend = entriesOf({ parts: { [baseKey('b1')]: 4, bergamot: 6 } }, [amberBase]);
    expect(written(blend)).toEqual({ labdanum: 2, vanillin: 2, bergamot: 6 });
  });

  it('check safety limits in the finished perfume', () => {
    // Oakmoss neat at 1 part in 10 is 10% of the concentrate, so 1% of a 10% perfume: over its 0.1% limit.
    const neat = entriesOf({ parts: { bergamot: 9, oakmoss: 1 } });
    expect(safetyIssues(neat, materialsById, content.model).map((x) => x.material)).toEqual(['oakmoss']);
    const diluted = entriesOf({ parts: { bergamot: 9, oakmoss: 1 }, dilutions: { oakmoss: 10 } });
    expect(safetyIssues(diluted, materialsById, content.model)).toEqual([]);
  });

  it('find strong materials used too strong', () => {
    expect(overdosed(entriesOf({ parts: { bergamot: 9, indole: 1 } }), materialsById, content.model)).toEqual(['indole']);
    expect(overdosed(entriesOf({ parts: { bergamot: 9, indole: 1 }, dilutions: { indole: 10 } }), materialsById, content.model)).toEqual([]);
  });

  it('cost more with precious materials, less when diluted', () => {
    const rose = blendCost(entriesOf({ parts: { 'rose-damascena': 1, bergamot: 9 } }), materialsById);
    const roseDiluted = blendCost(entriesOf({ parts: { 'rose-damascena': 1, bergamot: 9 }, dilutions: { 'rose-damascena': 10 } }), materialsById);
    expect(rose).toBeGreaterThan(roseDiluted);
  });
});

describe('perfume checks', () => {
  it('need an allowed total, safety, and the budget', () => {
    const ok = checkPerfume(entriesOf({ parts: { bergamot: 6, lavender: 4 } }), [10]);
    expect(sellable(ok)).toBe(true);
    const short = checkPerfume(entriesOf({ parts: { bergamot: 6 } }), [10, 100]);
    expect(sellable(short)).toBe(false);
    expect(blockers(short)[0]).toMatch(/10 or 100/);
    const dear = checkPerfume(entriesOf({ parts: { 'rose-damascena': 10 } }), [10], 5);
    expect(dear.overBudget).toBe(true);
  });
});
