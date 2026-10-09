import { describe, expect, it } from 'vitest';
import { MATRICES } from './generate';

// Invariants of the mock dataset: shares must be honest for the UI to be.
describe('mock data', () => {
  for (const m of Object.values(MATRICES)) {
    it(`${m.productId}: countries + Rest of World never exceed the world total`, () => {
      m.years.forEach((_, i) => {
        const reported = m.rows.reduce((s, r) => s + (r.values[i] ?? 0), 0);
        const rest = m.rest.values[i]!;
        expect(rest).toBeGreaterThanOrEqual(0);
        expect(reported + rest).toBeLessThanOrEqual(m.world[i]! + 1); // rounding tolerance
      });
    });
  }

  it('keeps a reporting gap as null, not zero (Myanmar rare earths 2021)', () => {
    const m = MATRICES['rare-earths'];
    const mmr = m.rows.find((r) => r.iso3 === 'MMR')!;
    expect(mmr.values[m.years.indexOf(2021)]).toBeNull();
  });
});
