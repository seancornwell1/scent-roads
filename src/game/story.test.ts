import { describe, expect, it } from 'vitest';
import { content } from './content';
import { newCustomerState } from './customers';
import type { ScoreResult } from './scoring';
import { newSourcingState, stockOf } from './sourcing';
import { afterReview, meet, newStoryState, pageFormula, story, storyTick, validateStory } from './story';

const result = (stars: number): ScoreResult => ({
  stages: [], strengthRatio: 1, strengthScore: 1, longevityHours: 8, targetLongevityHours: 8, longevityScore: 1, total: 0.8, stars, impression: 0.8, weakStage: null,
  directions: [{ kind: 'family', family: 'gourmand', stage: 'drydown', want: 'less', size: 0.2 }],
});

/** Simulates the customer handing over and coming back for a story visit. */
function review(s: ReturnType<typeof newStoryState>, c: ReturnType<typeof newCustomerState>, requestId: string, stars: number, now: number) {
  const v = c.visits.find((x) => x.storyId === requestId)!;
  v.result = result(stars);
  const page = afterReview(s, v, now);
  c.visits = c.visits.filter((x) => x !== v);
  c.reviews.push({ perfume: 'x', stars, weakStage: null, at: now, name: v.name, briefId: v.briefId, reputation: 0 });
  return page;
}

describe('story', () => {
  it('is valid', () => {
    expect(validateStory(story, new Set(content.materials.map((m) => m.id)))).toEqual([]);
  });

  it('every page but the last has her formula, in 10 whole parts', () => {
    for (const p of story.pages.filter((x) => !x.signature)) {
      const f = pageFormula(p.id)!;
      expect(Object.values(f).reduce((a, b) => a + b, 0)).toBe(content.model.wearableParts);
    }
  });

  it('Agathe comes first; a page below 3 stars brings her back; 3 stars recovers it', () => {
    const s = newStoryState();
    const c = newCustomerState(0);
    expect(storyTick(s, c, 0, 0)).toHaveLength(1);
    expect(c.visits[0].name).toBe('Agathe');
    expect(storyTick(s, c, 1, 0)).toHaveLength(0); // already in the shop

    expect(review(s, c, 'agathe-wedding', 2, 10)).toBeNull();
    expect(s.requests['agathe-wedding'].status).toBe('waiting');
    expect(storyTick(s, c, 10 + story.retryAfterGameHours - 0.1, 0).filter((id) => id.includes('agathe'))).toHaveLength(0);
    expect(storyTick(s, c, 10 + story.retryAfterGameHours, 0).filter((id) => id.includes('agathe'))).toHaveLength(1);
    // Coming back, she's told you all her hints and remembers what she said last time.
    expect(c.visits.find((v) => v.storyId === 'agathe-wedding')!.hintsAsked).toBe(2);
    expect(s.requests['agathe-wedding'].last?.directions.length).toBe(1);

    expect(review(s, c, 'agathe-wedding', 3, 30)).toBe('wedding-cologne');
    expect(s.pages['wedding-cologne'].for).toBe('Agathe');
  });

  it('Josette brings vanillin back in the first week, after your first review', () => {
    const s = newStoryState();
    const c = newCustomerState(0);
    const sourcing = newSourcingState();
    storyTick(s, c, 0, 0);
    expect(storyTick(s, c, 10, 0).some((id) => id.includes('josette'))).toBe(false);
    review(s, c, 'agathe-wedding', 2, 10);
    expect(storyTick(s, c, 11, 0).some((id) => id.includes('josette'))).toBe(true);

    const visit = c.visits.find((v) => v.storyId === 'josette-sweeter')!;
    expect(meet(s, visit, sourcing, 11)).toEqual([{ material: 'vanillin', grams: 10 }]);
    expect(meet(s, visit, sourcing, 12)).toEqual([]); // only once
    expect(stockOf(sourcing, 'vanillin')).toBe(10);
    expect(s.materials).toContain('vanillin');
  });

  it("Josette comes by day two even if you haven't served anyone", () => {
    const s = newStoryState();
    const c = newCustomerState(0);
    expect(storyTick(s, c, 47, 0).some((id) => id.includes('josette'))).toBe(false);
    expect(storyTick(s, c, 48, 0).some((id) => id.includes('josette'))).toBe(true);
  });

  it('Henri follows a few hours after Josette is done', () => {
    const s = newStoryState();
    const c = newCustomerState(0);
    storyTick(s, c, 48, 0);
    review(s, c, 'josette-sweeter', 1, 50);
    expect(s.requests['josette-sweeter'].status).toBe('done');
    expect(storyTick(s, c, 53.9, 0).some((id) => id.includes('henri'))).toBe(false);
    expect(storyTick(s, c, 54, 0).some((id) => id.includes('henri'))).toBe(true);
  });
});

describe('story facts', () => {
  it('lists every unverified page lesson in docs/FACT_CHECK.md', async () => {
    const { readFileSync } = await import('node:fs');
    const factCheck = readFileSync(new URL('../../docs/FACT_CHECK.md', import.meta.url), 'utf8');
    const missing = story.pages.filter((p) => p.lesson && !p.lesson.verified && !factCheck.includes(`\`${p.id}\``)).map((p) => p.id);
    expect(missing).toEqual([]);
  });
});
