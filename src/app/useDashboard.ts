import { createContext, useContext } from 'react';
import type { Country, DatasetMeta, Iso3, Product, ProductId } from '../api/types';
import type { AvailabilityIndex, Bounds, Selection } from '../domain/selection';

export interface DashboardContextValue {
  selection: Selection;
  bounds: Bounds;
  meta: DatasetMeta;
  availability: AvailabilityIndex;
  countries: Map<Iso3, Country>;
  products: Map<ProductId, Product>;
  /** Parameters that were in the shared link but could not be applied (E12). */
  droppedParams: string[];
  playing: boolean;
  setPlaying: (v: boolean) => void;
  actions: {
    setProduct: (p: ProductId | null) => void;
    setCountry: (c: Iso3 | null) => void;
    toggleCountry: (c: Iso3) => void;
    setRange: (r: [number, number]) => void;
    setFocusYear: (y: number) => void;
    reset: () => void;
  };
}

export const DashboardCtx = createContext<DashboardContextValue | null>(null);

export function useDashboard() {
  const ctx = useContext(DashboardCtx);
  if (!ctx) throw new Error('useDashboard must be used inside <DashboardProvider>');
  return ctx;
}

