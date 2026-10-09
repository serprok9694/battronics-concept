import type { DataStatus, Iso3, ProductMatrix } from '../api/types';

// Pure metric functions. Every metric that can be undefined returns an explicit
// "not available" reason instead of a misleading number (0%, Infinity, NaN).

export type Growth =
  | { kind: 'value'; rate: number; sinceYear: number }
  | { kind: 'new'; sinceYear: number } // previous value was 0: new entrant
  | { kind: 'na'; reason: string };

export const yearIndex = (m: { years: number[] }, year: number) => m.years.indexOf(year);

export function share(value: number | null | undefined, world: number | null | undefined): number | null {
  if (value == null || world == null || world <= 0) return null;
  return value / world;
}

export function yoy(values: Array<number | null>, years: number[], year: number): Growth {
  const i = years.indexOf(year);
  if (i <= 0) return { kind: 'na', reason: `no data before ${year}` };
  const prev = values[i - 1];
  const curr = values[i];
  if (prev == null || curr == null) return { kind: 'na', reason: 'missing data' };
  if (prev === 0) return curr > 0 ? { kind: 'new', sinceYear: year } : { kind: 'na', reason: 'no production' };
  return { kind: 'value', rate: curr / prev - 1, sinceYear: year - 1 };
}

/**
 * CAGR over [from, to]. If production starts inside the period, CAGR is computed
 * from the first non-zero year and `sinceYear` says so (edge case E5).
 */
export function cagr(values: Array<number | null>, years: number[], from: number, to: number): Growth {
  if (to <= from) return { kind: 'na', reason: 'needs at least 2 years' };
  const end = values[years.indexOf(to)];
  if (end == null) return { kind: 'na', reason: `no data for ${to}` };
  for (let y = from; y < to; y++) {
    const start = values[years.indexOf(y)];
    if (start == null) continue;
    if (start > 0) {
      if (end === 0) return { kind: 'value', rate: -1, sinceYear: y };
      return { kind: 'value', rate: (end / start) ** (1 / (to - y)) - 1, sinceYear: y };
    }
  }
  return end > 0 ? { kind: 'new', sinceYear: to } : { kind: 'na', reason: 'no production in period' };
}

export type HhiCategory = 'unconcentrated' | 'moderate' | 'high' | 'monopoly';

/** Herfindahl–Hirschman Index on shares in % (0–10 000). Thresholds: DOJ/FTC 2023. */
export function hhi(shares: number[]): { value: number; category: HhiCategory } {
  const value = Math.round(shares.reduce((sum, s) => sum + (100 * s) ** 2, 0));
  const category: HhiCategory =
    shares.filter((s) => s > 0).length === 1
      ? 'monopoly'
      : value > 1800
        ? 'high'
        : value >= 1000
          ? 'moderate'
          : 'unconcentrated';
  return { value, category };
}

export const HHI_LABEL: Record<HhiCategory, string> = {
  unconcentrated: 'Unconcentrated',
  moderate: 'Moderately concentrated',
  high: 'Highly concentrated',
  monopoly: 'Monopoly',
};

export interface RankedCountry {
  iso3: Iso3;
  value: number | null;
  share: number | null;
  rank: number | null; // null when no production that year
  yoy: Growth;
}

export interface YearSummary {
  year: number;
  status: DataStatus;
  world: number;
  ranking: RankedCountry[]; // sorted, producers first
  rest: { value: number; share: number | null };
  hhi: { value: number; category: HhiCategory };
  top1: RankedCountry | null;
  cr3: number;
}

/** Everything the map, KPI cards and ranking table need for one product-year. */
export function summarizeYear(m: ProductMatrix, year: number): YearSummary {
  const i = yearIndex(m, year);
  const world = m.world[i] ?? 0;
  const ranking: RankedCountry[] = m.rows
    .map((r) => {
      const value = r.values[i] ?? null;
      return { iso3: r.iso3, value, share: share(value, world), rank: null, yoy: yoy(r.values, m.years, year) };
    })
    .sort((a, b) => (b.value ?? -1) - (a.value ?? -1));
  let rank = 0;
  for (const r of ranking) if ((r.value ?? 0) > 0) r.rank = ++rank;

  // ROW is excluded from HHI (it is many small producers), so HHI is a lower bound.
  const shares = ranking.map((r) => r.share ?? 0);
  return {
    year,
    status: m.status[i] ?? 'actual',
    world,
    ranking,
    rest: { value: m.rest.values[i] ?? 0, share: share(m.rest.values[i], world) },
    hhi: hhi(shares),
    top1: ranking[0] && ranking[0].rank === 1 ? ranking[0] : null,
    cr3: shares.slice(0, 3).reduce((a, b) => a + b, 0),
  };
}

export interface PeriodStats {
  iso3: Iso3;
  cagr: Growth;
  cumulative: number;
  shareChange: number | null; // percentage points / 100
}

export function summarizePeriod(m: ProductMatrix, from: number, to: number) {
  const a = yearIndex(m, from);
  const b = yearIndex(m, to);
  const countries = new Map<Iso3, PeriodStats>(
    m.rows.map((r) => {
      const sa = share(r.values[a], m.world[a]);
      const sb = share(r.values[b], m.world[b]);
      return [
        r.iso3,
        {
          iso3: r.iso3,
          cagr: cagr(r.values, m.years, from, to),
          cumulative: r.values.slice(a, b + 1).reduce<number>((sum, v) => sum + (v ?? 0), 0),
          shareChange: sa === null || sb === null ? null : sb - sa,
        },
      ];
    }),
  );
  const startHhi = summarizeYear(m, from).hhi.value;
  const endHhi = summarizeYear(m, to).hhi.value;
  return {
    countries,
    worldCagr: cagr(m.world, m.years, from, to),
    hhiChange: endHhi - startHhi,
    includesEstimates: m.status.slice(a, b + 1).some((s) => s !== 'actual'),
  };
}
export type PeriodSummary = ReturnType<typeof summarizePeriod>;
