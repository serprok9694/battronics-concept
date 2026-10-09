import { describe, expect, it } from 'vitest';
import {
  fromSearchParams,
  indexAvailability,
  initialSelection,
  selectionReducer,
  toSearchParams,
  type Bounds,
  type Selection,
  type SelectionAction,
} from './selection';

const bounds: Bounds = { firstYear: 2010, lastYear: 2026, defaultFocusYear: 2024 };

// COD mines cobalt; CHN mines and refines it; CHL makes lithium only.
const availability = indexAvailability({
  pairs: [
    { iso3: 'COD', productId: 'cobalt-mined' },
    { iso3: 'CHN', productId: 'cobalt-mined' },
    { iso3: 'CHN', productId: 'cobalt-refined' },
    { iso3: 'CHL', productId: 'lithium' },
  ],
});

const run = (...actions: Array<(s: Selection) => SelectionAction>) =>
  actions.reduce((s, a) => selectionReducer(s, a(s)), initialSelection(bounds));
const product = (p: string | null) => () => ({ type: 'setProduct', product: p, availability }) as SelectionAction;
const country = (c: string | null) => () => ({ type: 'setCountry', country: c, availability }) as SelectionAction;

describe('selectionReducer: linked filters', () => {
  it('R1: the first choice becomes primary', () => {
    expect(run(product('cobalt-mined')).primary).toBe('product');
    expect(run(country('COD')).primary).toBe('country');
  });

  it('R4: changing the primary keeps a compatible dependent', () => {
    const s = run(product('cobalt-mined'), country('CHN'), product('cobalt-refined'));
    expect(s).toMatchObject({ primary: 'product', product: 'cobalt-refined', country: 'CHN', notice: null });
  });

  it('R5: changing the primary clears an incompatible dependent and explains why', () => {
    const s = run(product('cobalt-mined'), country('COD'), product('cobalt-refined'));
    expect(s.country).toBeNull();
    expect(s.notice).toEqual({ cleared: 'country', country: 'COD', product: 'cobalt-refined' });
  });

  it('R5 works the other way round (country first)', () => {
    const s = run(country('CHN'), product('cobalt-refined'), country('COD'));
    expect(s).toMatchObject({ primary: 'country', country: 'COD', product: null });
    expect(s.notice?.cleared).toBe('product');
  });

  it('R3: an incompatible dependent value is ignored', () => {
    const before = run(country('CHL'));
    expect(selectionReducer(before, product('cobalt-mined')())).toBe(before);
  });

  it('R6: clearing the primary promotes the dependent', () => {
    const s = run(product('cobalt-mined'), country('COD'), product(null));
    expect(s).toMatchObject({ primary: 'country', country: 'COD', product: null });
  });

  it('R10: clicking the selected country again deselects it', () => {
    const s = run(product('cobalt-mined'), country('COD'), () => ({ type: 'toggleCountry', country: 'COD', availability }));
    expect(s).toMatchObject({ country: null, primary: 'product' });
  });

  it('E2: narrowing the period clamps the focus year', () => {
    const s = run(() => ({ type: 'setRange', range: [2012, 2018] }));
    expect(s.focusYear).toBe(2018);
  });

  it('any action clears a previous notice', () => {
    const s = run(product('cobalt-mined'), country('COD'), product('cobalt-refined'), () => ({ type: 'setFocusYear', year: 2020 }));
    expect(s.notice).toBeNull();
  });
});

describe('URL state', () => {
  it('round-trips a selection and omits defaults', () => {
    const s = run(product('cobalt-mined'), country('COD'), () => ({ type: 'setFocusYear', year: 2020 }));
    const params = toSearchParams(s, bounds);
    expect(params.toString()).toBe('product=cobalt-mined&country=COD&first=product&year=2020');
    expect(fromSearchParams(params, bounds, availability).state).toMatchObject({
      primary: 'product',
      product: 'cobalt-mined',
      country: 'COD',
      focusYear: 2020,
    });
  });

  it('E12: drops unknown values and out-of-range years', () => {
    const { state, dropped } = fromSearchParams(
      new URLSearchParams('product=unobtainium&country=xyz&year=2031'),
      bounds,
      availability,
    );
    expect(dropped).toEqual(['product', 'country', 'year']);
    expect(state).toMatchObject({ product: null, country: null, focusYear: 2024 });
  });

  it('E12: an incompatible pair keeps the primary', () => {
    const { state, dropped } = fromSearchParams(
      new URLSearchParams('product=cobalt-refined&country=COD&first=product'),
      bounds,
      availability,
    );
    expect(state).toMatchObject({ product: 'cobalt-refined', country: null });
    expect(dropped).toEqual(['country']);
  });
});
