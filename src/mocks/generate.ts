import { ROW, type DataStatus, type ProductId, type ProductMatrix } from '../api/types';
import { statusOfYear } from '../domain/status';
import { SCENARIOS, type Keyframe } from './keyframes';
import { FIRST_YEAR, LAST_YEAR, LATEST_ACTUAL_YEAR } from './reference';

/** Share of world output always left to the Rest of World residual. */
const MIN_REST_SHARE = 0.015;
const NOISE = 0.03; // ±3% multiplicative noise on shares in actual years

export const YEARS: number[] = Array.from(
  { length: LAST_YEAR - FIRST_YEAR + 1 },
  (_, i) => FIRST_YEAR + i,
);

export const statusOf = (year: number): DataStatus => statusOfYear(year, { latestActualYear: LATEST_ACTUAL_YEAR });

/** Linear interpolation; 0 before the first keyframe, last value held after. */
function interpolate(frames: readonly Keyframe[], year: number): number {
  const first = frames[0];
  if (!first || year < first[0]) return 0;
  for (let i = 1; i < frames.length; i++) {
    const [y1, v1] = frames[i - 1]!;
    const [y2, v2] = frames[i]!;
    if (year <= y2) return v1 + ((v2 - v1) * (year - y1)) / (y2 - y1);
  }
  return frames[frames.length - 1]![1];
}

/** Deterministic pseudo-random in [-1, 1] from a string key (FNV-1a + mulberry32 step). */
function noise(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let t = (h + 0x6d2b79f5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (((t ^ (t >>> 14)) >>> 0) / 4294967296) * 2 - 1;
}

const round = (v: number) => Math.round(v * 10) / 10;

function generateMatrix(productId: ProductId): ProductMatrix {
  const scenario = SCENARIOS[productId];
  const entries = Object.entries(scenario.shares);
  const world = YEARS.map((y) => round(interpolate(scenario.world, y)));

  const shareTable = YEARS.map((year) => {
    const raw = entries.map(([iso3, series]) => {
      const base = interpolate(series!.shares, year);
      const jitter = statusOf(year) === 'actual' ? 1 + NOISE * noise(`${productId}:${iso3}:${year}`) : 1;
      return base * jitter;
    });
    // Keep the sum of countries below the world total so Rest of World stays >= 0.
    const sum = raw.reduce((a, b) => a + b, 0);
    const cap = 1 - MIN_REST_SHARE;
    return sum > cap ? raw.map((v) => (v * cap) / sum) : raw;
  });

  const rows = entries.map(([iso3, series], c) => ({
    iso3,
    values: YEARS.map((year, y) =>
      series!.gaps?.includes(year) ? null : round(shareTable[y]![c]! * world[y]!),
    ),
  }));

  // Rest of World is computed from the underlying shares, so a reporting gap
  // (null) shows up as "unreported" rather than being silently moved into ROW.
  const rest = {
    iso3: ROW,
    values: YEARS.map((_, y) =>
      round(world[y]! * (1 - shareTable[y]!.reduce((a, b) => a + b, 0))),
    ),
  };

  return { productId, years: YEARS, status: YEARS.map(statusOf), world, rows, rest };
}

export const MATRICES: Record<ProductId, ProductMatrix> = Object.fromEntries(
  (Object.keys(SCENARIOS) as ProductId[]).map((id) => [id, generateMatrix(id)]),
) as Record<ProductId, ProductMatrix>;
