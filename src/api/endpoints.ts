import { MATRICES, YEARS, statusOf } from '../mocks/generate';
import { COUNTRIES, FIRST_YEAR, LAST_YEAR, LATEST_ACTUAL_YEAR, PRODUCTS } from '../mocks/reference';
import { simulateRequest } from './client';
import type {
  Availability,
  Country,
  CountryOption,
  CountryProfile,
  DatasetMeta,
  Iso3,
  Product,
  ProductId,
  ProductMatrix,
  ProductOption,
} from './types';

// Each function mirrors a REST endpoint, e.g. getCountries({ product }) ≈ GET /countries?product=…

const latestIdx = YEARS.indexOf(LATEST_ACTUAL_YEAR);

const produces = (matrix: ProductMatrix, iso3: Iso3) =>
  matrix.rows.some((r) => r.iso3 === iso3 && r.values.some((v) => (v ?? 0) > 0));

/** GET /meta */
export const getMeta = (signal?: AbortSignal) =>
  simulateRequest<DatasetMeta>(
    () => ({
      source: 'Mock data · Battronics FE concept',
      updatedAt: '2026-09-30',
      firstYear: FIRST_YEAR,
      lastYear: LAST_YEAR,
      latestActualYear: LATEST_ACTUAL_YEAR,
      statusByYear: {
        actual: `${FIRST_YEAR}–${LATEST_ACTUAL_YEAR}: reported production`,
        estimate: `${LATEST_ACTUAL_YEAR + 1}: preliminary estimate`,
        forecast: `${LAST_YEAR}: forecast`,
      },
    }),
    signal,
  );

/** GET /reference — countries and products dictionaries. */
export const getReference = (signal?: AbortSignal) =>
  simulateRequest<{ countries: Country[]; products: Product[] }>(
    () => ({ countries: COUNTRIES, products: PRODUCTS }),
    signal,
  );

/** GET /availability — which country produces which product (any year of the horizon). */
export const getAvailability = (signal?: AbortSignal) =>
  simulateRequest<Availability>(
    () => ({
      pairs: PRODUCTS.flatMap((p) =>
        COUNTRIES.filter((c) => produces(MATRICES[p.id], c.iso3)).map((c) => ({
          iso3: c.iso3,
          productId: p.id,
        })),
      ),
    }),
    signal,
  );

/** GET /products?country= — sorted by the country's world share (latest actual year). */
export const getProducts = (params: { country: Iso3 | null }, signal?: AbortSignal) =>
  simulateRequest<ProductOption[]>(() => {
    const { country } = params;
    if (!country) return PRODUCTS.map((product) => ({ product, latestShare: null }));
    return PRODUCTS.filter((p) => produces(MATRICES[p.id], country))
      .map((product) => {
        const m = MATRICES[product.id];
        const v = m.rows.find((r) => r.iso3 === country)?.values[latestIdx] ?? null;
        const w = m.world[latestIdx] ?? 0;
        return { product, latestShare: v === null || w === 0 ? null : v / w };
      })
      .sort((a, b) => (b.latestShare ?? -1) - (a.latestShare ?? -1));
  }, signal);

/** GET /countries?product= — sorted by production volume (latest actual year). */
export const getCountries = (params: { product: ProductId | null }, signal?: AbortSignal) =>
  simulateRequest<CountryOption[]>(() => {
    const { product } = params;
    if (!product) return COUNTRIES.map((country) => ({ country, latestValue: null }));
    const m = MATRICES[product];
    return COUNTRIES.filter((c) => produces(m, c.iso3))
      .map((country) => ({
        country,
        latestValue: m.rows.find((r) => r.iso3 === country.iso3)?.values[latestIdx] ?? null,
      }))
      .sort((a, b) => (b.latestValue ?? -1) - (a.latestValue ?? -1));
  }, signal);

/**
 * GET /products/{id}/matrix — every country × every year of one product.
 * One payload per product: the map, ranking, KPIs and the Play animation are
 * all derived from it on the client, so numbers stay consistent and Play needs no requests.
 */
export const getProductMatrix = (params: { product: ProductId }, signal?: AbortSignal) =>
  simulateRequest<ProductMatrix>(() => MATRICES[params.product], signal, { failable: true });

/** GET /countries/{iso3}/profile — the country's series for each product it produces. */
export const getCountryProfile = (params: { country: Iso3 }, signal?: AbortSignal) =>
  simulateRequest<CountryProfile>(
    () => ({
      iso3: params.country,
      years: YEARS,
      status: YEARS.map(statusOf),
      products: PRODUCTS.filter((p) => produces(MATRICES[p.id], params.country)).map((p) => {
        const m = MATRICES[p.id];
        return {
          productId: p.id,
          values: m.rows.find((r) => r.iso3 === params.country)!.values,
          world: m.world,
        };
      }),
    }),
    signal,
    { failable: true },
  );
