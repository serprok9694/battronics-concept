import type { Availability, Iso3, ProductId } from '../api/types';

// Linked filters "country ↔ product" as a pure reducer.
// Model: whichever filter the user picks first is PRIMARY (its list is never
// filtered); the other is DEPENDENT (its list is filtered by the primary).
// Availability is evaluated over the whole 2010–2026 horizon, so lists do not
// jump while the period slider moves.

export type Dimension = 'country' | 'product';

export interface Notice {
  /** Which filter was cleared and why. */
  cleared: Dimension;
  country: Iso3;
  product: ProductId;
}

export interface Selection {
  primary: Dimension | null;
  country: Iso3 | null;
  product: ProductId | null;
  range: [number, number];
  focusYear: number;
  notice: Notice | null;
}

export interface Bounds {
  firstYear: number;
  lastYear: number;
  defaultFocusYear: number;
}

export type AvailabilityIndex = {
  has: (country: Iso3, product: ProductId) => boolean;
  hasCountry: (country: Iso3) => boolean;
  hasProduct: (product: ProductId) => boolean;
};

export function indexAvailability(a: Availability): AvailabilityIndex {
  const pairs = new Set(a.pairs.map((p) => `${p.iso3}:${p.productId}`));
  const countries = new Set(a.pairs.map((p) => p.iso3));
  const products = new Set<string>(a.pairs.map((p) => p.productId));
  return {
    has: (c, p) => pairs.has(`${c}:${p}`),
    hasCountry: (c) => countries.has(c),
    hasProduct: (p) => products.has(p),
  };
}

export type SelectionAction =
  | { type: 'setProduct'; product: ProductId | null; availability: AvailabilityIndex }
  | { type: 'setCountry'; country: Iso3 | null; availability: AvailabilityIndex }
  | { type: 'toggleCountry'; country: Iso3; availability: AvailabilityIndex }
  | { type: 'setRange'; range: [number, number] }
  | { type: 'setFocusYear'; year: number }
  | { type: 'reset'; bounds: Bounds }
  | { type: 'hydrate'; state: Selection };

export const initialSelection = (b: Bounds): Selection => ({
  primary: null,
  country: null,
  product: null,
  range: [b.firstYear, b.lastYear],
  focusYear: b.defaultFocusYear,
  notice: null,
});

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function setDimension(
  s: Selection,
  dim: Dimension,
  value: string | null,
  availability: AvailabilityIndex,
): Selection {
  const other: Dimension = dim === 'country' ? 'product' : 'country';
  const next: Selection = { ...s, notice: null, [dim]: value };

  // R6: clearing a filter. If it was primary and the other is set, promote the other.
  if (value === null) {
    if (s.primary === dim) next.primary = s[other] !== null ? other : null;
    return next;
  }

  // R1: first choice becomes primary.
  if (s.primary === null || (s.primary === other && s[other] === null)) {
    next.primary = dim;
    return next;
  }

  const country = (dim === 'country' ? value : s.country) as Iso3 | null;
  const product = (dim === 'product' ? value : s.product) as ProductId | null;
  const compatible = country === null || product === null || availability.has(country, product);

  // R3: dependent lists are pre-filtered; an incompatible value is ignored defensively.
  if (s.primary === other) return compatible ? next : s;

  // R4 / R5: changing the primary keeps a compatible dependent, clears an incompatible one.
  if (!compatible && country && product) {
    next[other] = null;
    next.notice = { cleared: other, country, product };
  }
  return next;
}

export function selectionReducer(s: Selection, a: SelectionAction): Selection {
  switch (a.type) {
    case 'setProduct':
      return setDimension(s, 'product', a.product, a.availability);
    case 'setCountry':
      return setDimension(s, 'country', a.country, a.availability);
    case 'toggleCountry': // R10: clicking the selected country deselects it
      return setDimension(s, 'country', s.country === a.country ? null : a.country, a.availability);
    case 'setRange': {
      const [from, to] = a.range[0] <= a.range[1] ? a.range : [a.range[1], a.range[0]];
      // E2: keep the focus year inside the period.
      return { ...s, notice: null, range: [from, to], focusYear: clamp(s.focusYear, from, to) };
    }
    case 'setFocusYear':
      return { ...s, notice: null, focusYear: clamp(a.year, s.range[0], s.range[1]) };
    case 'reset':
      return initialSelection(a.bounds);
    case 'hydrate':
      return a.state;
  }
}

// ---- URL (shareable link) ------------------------------------------------

export function toSearchParams(s: Selection, b: Bounds): URLSearchParams {
  const p = new URLSearchParams();
  if (s.product) p.set('product', s.product);
  if (s.country) p.set('country', s.country);
  if (s.product && s.country && s.primary) p.set('first', s.primary);
  if (s.range[0] !== b.firstYear) p.set('from', String(s.range[0]));
  if (s.range[1] !== b.lastYear) p.set('to', String(s.range[1]));
  if (s.focusYear !== b.defaultFocusYear) p.set('year', String(s.focusYear));
  return p;
}

/** E12: parse and sanitise URL state. Unknown values are dropped, an incompatible pair keeps the primary. */
export function fromSearchParams(
  p: URLSearchParams,
  b: Bounds,
  availability: AvailabilityIndex,
): { state: Selection; dropped: string[] } {
  const dropped: string[] = [];
  const s = initialSelection(b);
  const year = (key: string, fallback: number) => {
    const raw = p.get(key);
    if (raw === null) return fallback;
    const n = Number(raw);
    if (Number.isInteger(n) && n >= b.firstYear && n <= b.lastYear) return n;
    dropped.push(key);
    return fallback;
  };

  let product = p.get('product') as ProductId | null;
  let country = p.get('country')?.toUpperCase() ?? null;
  if (product && !availability.hasProduct(product)) {
    dropped.push('product');
    product = null;
  }
  if (country && !availability.hasCountry(country)) {
    dropped.push('country');
    country = null;
  }

  let primary: Dimension | null = product ? 'product' : country ? 'country' : null;
  if (product && country) {
    primary = p.get('first') === 'country' ? 'country' : 'product';
    if (!availability.has(country, product)) {
      dropped.push(primary === 'product' ? 'country' : 'product');
      if (primary === 'product') country = null;
      else product = null;
    }
  }

  const from = year('from', b.firstYear);
  const to = year('to', b.lastYear);
  const range: [number, number] = from <= to ? [from, to] : [to, from];
  return {
    state: {
      ...s,
      primary,
      product,
      country,
      range,
      focusYear: clamp(year('year', b.defaultFocusYear), range[0], range[1]),
    },
    dropped,
  };
}
