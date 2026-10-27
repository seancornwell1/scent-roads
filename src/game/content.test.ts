import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { content, validateContent } from './content';

describe('content', () => {
  it('is valid', () => {
    expect(validateContent(content)).toEqual([]);
  });

  it('lists every unverified material and accord in docs/FACT_CHECK.md', () => {
    const factCheck = readFileSync(new URL('../../docs/FACT_CHECK.md', import.meta.url), 'utf8');
    const unverified = [...content.materials, ...content.accords].filter((x) => !x.verified);
    const missing = unverified.map((x) => x.id).filter((id) => !factCheck.includes(`\`${id}\``));
    expect(missing).toEqual([]);
  });

  it('includes the whole bench inventory', () => {
    expect(content.materials.filter((m) => m.course.onBench)).toHaveLength(26);
  });
});
