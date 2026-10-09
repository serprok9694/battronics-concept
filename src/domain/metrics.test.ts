import { describe, expect, it } from 'vitest';
import type { ProductMatrix } from '../api/types';
import { cagr, hhi, share, summarizePeriod, summarizeYear, yoy } from './metrics';

const years = [2020, 2021, 2022, 2023];

describe('share', () => {
  it('is n/a without data or world total', () => {
    expect(share(null, 100)).toBeNull();
    expect(share(10, 0)).toBeNull();
    expect(share(25, 100)).toBe(0.25);
  });
});

describe('yoy', () => {
  it('computes year-over-year growth', () => {
    expect(yoy([100, 110, 0, 0], years, 2021)).toEqual({ kind: 'value', rate: expect.closeTo(0.1), sinceYear: 2020 });
  });
  it('E4: is n/a for the first year and "new" after a zero year', () => {
    expect(yoy([1, 2, 3, 4], years, 2020).kind).toBe('na');
    expect(yoy([0, 5, 6, 7], years, 2021)).toEqual({ kind: 'new', sinceYear: 2021 });
  });
  it('is n/a when a year is not reported', () => {
    expect(yoy([1, null, 3, 4], years, 2021).kind).toBe('na');
  });
});

describe('cagr', () => {
  it('compounds over the period', () => {
    const g = cagr([100, 0, 0, 121], years, 2020, 2023);
    expect(g).toEqual({ kind: 'value', rate: expect.closeTo(0.0656, 3), sinceYear: 2020 });
  });
  it('E3: needs at least two years', () => {
    expect(cagr([1, 2, 3, 4], years, 2021, 2021).kind).toBe('na');
  });
  it('E5: starts from the first year with output for new entrants', () => {
    const g = cagr([0, 0, 10, 20], years, 2020, 2023);
    expect(g).toEqual({ kind: 'value', rate: expect.closeTo(1), sinceYear: 2022 });
  });
  it('reports a producer that appears only in the last year as new', () => {
    expect(cagr([0, 0, 0, 5], years, 2020, 2023)).toEqual({ kind: 'new', sinceYear: 2023 });
  });
});

describe('hhi', () => {
  it('uses DOJ/FTC 2023 thresholds', () => {
    expect(hhi([0.25, 0.25, 0.25, 0.25])).toEqual({ value: 2500, category: 'high' });
    expect(hhi([0.3, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1])).toMatchObject({ category: 'moderate' });
    expect(hhi(Array(20).fill(0.05))).toMatchObject({ value: 500, category: 'unconcentrated' });
    expect(hhi([0.8, 0, 0])).toMatchObject({ category: 'monopoly' });
  });
});

const matrix: ProductMatrix = {
  productId: 'nickel',
  years,
  status: ['actual', 'actual', 'actual', 'estimate'],
  world: [100, 100, 100, 100],
  rows: [
    { iso3: 'AAA', values: [60, 50, 40, 30] },
    { iso3: 'BBB', values: [20, 30, 40, 50] },
    { iso3: 'CCC', values: [0, 0, 10, null] },
  ],
  rest: { iso3: 'ROW', values: [20, 20, 10, 10] },
};

describe('summarizeYear', () => {
  it('ranks producers and keeps Rest of World out of the ranking and HHI', () => {
    const s = summarizeYear(matrix, 2020);
    expect(s.ranking.map((r) => [r.iso3, r.rank])).toEqual([
      ['AAA', 1],
      ['BBB', 2],
      ['CCC', null],
    ]);
    expect(s.top1?.iso3).toBe('AAA');
    expect(s.hhi.value).toBe(60 ** 2 + 20 ** 2);
    expect(s.cr3).toBeCloseTo(0.8);
  });
});

describe('summarizePeriod', () => {
  it('measures share change and HHI change between the two given years', () => {
    const p = summarizePeriod(matrix, 2020, 2022);
    expect(p.countries.get('BBB')?.shareChange).toBeCloseTo(0.2);
    expect(p.hhiChange).toBe(40 ** 2 + 40 ** 2 + 10 ** 2 - (60 ** 2 + 20 ** 2));
    expect(p.includesEstimates).toBe(false);
    expect(summarizePeriod(matrix, 2020, 2023).includesEstimates).toBe(true);
  });
});
