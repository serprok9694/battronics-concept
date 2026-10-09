import { keepPreviousData, queryOptions, useQuery } from '@tanstack/react-query';
import * as api from '../api/endpoints';
import type { Iso3, ProductId } from '../api/types';

// Query key factory: one place that defines cache identity for every endpoint.
export const queryKeys = {
  meta: ['meta'] as const,
  reference: ['reference'] as const,
  availability: ['availability'] as const,
  products: (country: Iso3 | null) => ['products', { country }] as const,
  countries: (product: ProductId | null) => ['countries', { product }] as const,
  productMatrix: (product: ProductId) => ['product-matrix', product] as const,
  countryProfile: (country: Iso3) => ['country-profile', country] as const,
};

// Reference data changes rarely (dataset releases), so it is cached for the session.
const STATIC = { staleTime: Infinity, gcTime: Infinity } as const;

export const metaQuery = () =>
  queryOptions({ queryKey: queryKeys.meta, queryFn: ({ signal }) => api.getMeta(signal), ...STATIC });

export const referenceQuery = () =>
  queryOptions({ queryKey: queryKeys.reference, queryFn: ({ signal }) => api.getReference(signal), ...STATIC });

export const availabilityQuery = () =>
  queryOptions({
    queryKey: queryKeys.availability,
    queryFn: ({ signal }) => api.getAvailability(signal),
    ...STATIC,
  });

export const useMeta = () => useQuery(metaQuery());
export const useReference = () => useQuery(referenceQuery());
export const useAvailability = () => useQuery(availabilityQuery());

export const useProductOptions = (country: Iso3 | null) =>
  useQuery({
    queryKey: queryKeys.products(country),
    queryFn: ({ signal }) => api.getProducts({ country }, signal),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });

export const useCountryOptions = (product: ProductId | null) =>
  useQuery({
    queryKey: queryKeys.countries(product),
    queryFn: ({ signal }) => api.getCountries({ product }, signal),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });

export const useProductMatrix = (product: ProductId | null) =>
  useQuery({
    queryKey: queryKeys.productMatrix(product ?? ('' as ProductId)),
    queryFn: ({ signal }) => api.getProductMatrix({ product: product! }, signal),
    enabled: product !== null,
    // Keep the previous product on screen while the next one loads (no flashing).
    // Consumers must read units/labels from matrix.productId, not from the selection.
    placeholderData: keepPreviousData,
    staleTime: 5 * 60_000,
  });

export const useCountryProfile = (country: Iso3 | null) =>
  useQuery({
    queryKey: queryKeys.countryProfile(country ?? ''),
    queryFn: ({ signal }) => api.getCountryProfile({ country: country! }, signal),
    enabled: country !== null,
    staleTime: 5 * 60_000,
  });
