import { describe, expect, it } from 'vitest';
import type { Product, ProductMatrix } from '../api/types';
import { productInsight } from './insight';
import { summarizePeriod, summarizeYear } from './metrics';

const product: Product = { id: 'nickel', name: 'Nickel', stage: 'upstream', unit: 'kt', description: '', aliases: [] };

// World doubles. BIG keeps 60%. GROW gains share (10% → 25%). SLIP grows in
// volume (+50%) but loses share (25% → ~19%) — it must NOT be called an alternative.
const matrix: ProductMatrix = {
  productId: 'nickel',
  years: [2020, 2024],
  status: ['actual', 'actual'],
  world: [100, 200],
  rows: [
    { iso3: 'BIG', values: [60, 120] },
    { iso3: 'SLIP', values: [25, 37.5] },
    { iso3: 'GROW', values: [10, 50] },
  ],
  rest: { iso3: 'ROW', values: [5, 0] },
};

describe('productInsight', () => {
  it('names the producer gaining world share, not the one growing volume in a growing market', () => {
    const text = productInsight(product, summarizeYear(matrix, 2024), summarizePeriod(matrix, 2020, 2024), (i) => i);
    expect(text).toContain('Gaining share fastest: GROW (+15.0 pp since 2020)');
    expect(text).not.toContain('SLIP (');
  });

  it('does not report a change for a single-year period', () => {
    const text = productInsight(product, summarizeYear(matrix, 2024), summarizePeriod(matrix, 2024, 2024), (i) => i);
    expect(text).not.toContain('since');
  });
});
