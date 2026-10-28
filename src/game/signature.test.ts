import { describe, expect, it } from 'vitest';
import { entriesOf } from './blend';
import { awards, entriesOpen, judge, judgesWords, newAwardsState, settleAwards, themeOf, yearAt } from './awards';
import { clients } from './clients';
import { content, materialsById } from './content';
import { letters } from './routes';
import { ranks } from './ranks';
import { overdosed, safetyIssues } from './blend';
import { newSourcingState, sourcing, stockOf } from './sourcing';
import { briefUnlocked, cluesFound, epilogueText, jarHoursLeft, jarReady, mainPath, newSignatureState, signature, startJar, validateSignature, type ClueContext } from './signature';
import { story } from './story';

const none: ClueContext = { requestsDone: new Set(), routesOpen: new Set(), pages: new Set(), ranks: new Set(['apprentice']), reviews: 0 };
const start = sourcing.calendarStart;
const DAY = 24;

describe('her signature', () => {
  it('is valid, safe, and has clues on all three paths', () => {
    expect(
      validateSignature(signature, new Set(content.materials.map((m) => m.id)), {
        requests: new Set(story.requests.map((r) => r.id)),
        routes: new Set(letters.routes.map((r) => r.id)),
        pages: new Set(story.pages.map((p) => p.id)),
        ranks: new Set(ranks.map((r) => r.id)),
      }),
    ).toEqual([]);
    const blend = entriesOf({ parts: signature.brief.target.formula });
    expect(safetyIssues(blend, materialsById, content.model)).toEqual([]);
    expect(overdosed(blend, materialsById, content.model)).toEqual([]);
    expect(signature.needed).toBeLessThan(signature.clues.length); // about two-thirds, from any mix
  });

  it('opens once enough clues are found, from any mix of paths', () => {
    expect(briefUnlocked(cluesFound(none))).toBe(false);
    const ctx: ClueContext = {
      requestsDone: new Set(['agathe-wedding', 'henri-amber', 'lucien-sunday']),
      routesOpen: new Set(['andalusia', 'provence', 'chemist']),
      pages: new Set(['wedding-cologne', 'winter-amber']),
      ranks: new Set(['apprentice']),
      reviews: 0,
    };
    expect(cluesFound(ctx)).toHaveLength(8);
    expect(briefUnlocked(cluesFound(ctx))).toBe(true);
  });

  it('needs her jar, aged in real time', () => {
    const s = newSignatureState();
    const stock = newSourcingState();
    expect(startJar(s, stock, 0)).toMatch(/neat/);
    stock.inventory.push({ id: 'l1', material: 'labdanum', grams: 10, quality: 1, since: 0 });
    expect(startJar(s, stock, 100)).toBeNull();
    expect(stockOf(stock, 'labdanum')).toBeCloseTo(10 - signature.jar.grams);
    expect(jarReady(s, 100 + signature.jar.gameDays * DAY - 1)).toBe(false);
    expect(jarHoursLeft(s, 100)).toBe(signature.jar.gameDays * DAY);
    expect(jarReady(s, 100 + signature.jar.gameDays * DAY)).toBe(true);
  });

  it('ends with an epilogue that follows the path you took', () => {
    const routes = signature.clues.filter((c) => c.path === 'routes');
    expect(mainPath(routes)).toBe('routes');
    const text = epilogueText(routes, { pages: 2, style: 'floral', rank: 'Perfumer' });
    expect(text).toContain(signature.epilogue.byPath.routes);
    expect(text.join(' ')).toContain('floral');
    expect(text.join(' ')).not.toMatch(/\{/);
  });
});

describe('the awards', () => {
  it('open in the last weeks of December and are judged when the year turns', () => {
    const dec1 = 275 * DAY;
    expect(entriesOpen(dec1, start)).toBe(false);
    expect(entriesOpen(dec1 + (31 - awards.openDays + 1) * DAY, start)).toBe(true);
    expect(yearAt(dec1 + 31 * DAY, start)).toBe(2);
    const a = newAwardsState();
    a.entries[1] = { name: 'Mine', entries: entriesOf({ parts: { bergamot: 3, 'rose-damascena': 3, sandalwood: 2, vanillin: 2 } }) };
    expect(settleAwards(a, dec1 + 10 * DAY, start, [])).toBeNull();
    const settled = settleAwards(a, dec1 + 31 * DAY, start, []);
    expect(settled?.year).toBe(1);
    expect(settleAwards(a, dec1 + 32 * DAY, start, [])).toBeNull(); // only once
    expect(themeOf(1)).toBe(awards.themes[0]);
  });

  it('reward a full, balanced, original perfume over a single material', () => {
    const known = clients.briefs.map((b) => b.target);
    const good = judge(entriesOf({ parts: { bergamot: 2, 'pink-pepper': 1, 'rose-damascena': 2, orris: 1, sandalwood: 2, vanillin: 1, ambroxan: 1 } }), known, 'Good');
    const plain = judge(entriesOf({ parts: { bergamot: 10 } }), known, 'Plain');
    expect(good.total).toBeGreaterThan(plain.total);
    expect(good.scores.structure).toBeGreaterThan(plain.scores.structure);
    for (const w of judgesWords(good)) expect(w).not.toMatch(/\d/);
  });
});
