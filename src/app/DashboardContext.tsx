import { useEffect, useMemo, useReducer, useState, type ReactNode } from 'react';
import type { Country, DatasetMeta, Product } from '../api/types';
import type { SelectionAction } from '../domain/selection';
import {
  fromSearchParams,
  selectionReducer,
  toSearchParams,
  type AvailabilityIndex,
  type Bounds,
} from '../domain/selection';
import { DashboardCtx, type DashboardContextValue } from './useDashboard';

interface ProviderProps {
  meta: DatasetMeta;
  availability: AvailabilityIndex;
  countries: Country[];
  products: Product[];
  children: ReactNode;
}

export function DashboardProvider({ meta, availability, countries, products, children }: ProviderProps) {
  const bounds = useMemo<Bounds>(
    () => ({ firstYear: meta.firstYear, lastYear: meta.lastYear, defaultFocusYear: meta.latestActualYear }),
    [meta],
  );

  // Initial state comes from the URL, so a shared link reproduces the view.
  const [initial] = useState(() =>
    fromSearchParams(new URLSearchParams(window.location.search), bounds, availability),
  );
  const [selection, dispatch] = useReducer(selectionReducer, initial.state);
  const [playing, setPlaying] = useState(false);

  // Keep the URL in sync (replaceState: no history entry per slider tick).
  useEffect(() => {
    const params = toSearchParams(selection, bounds);
    const keep = new URLSearchParams(window.location.search);
    if (keep.has('fail')) params.set('fail', '1');
    const qs = params.toString();
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  }, [selection, bounds]);

  const value = useMemo<DashboardContextValue>(() => {
    // E9: every filter change pauses playback; only the focus year keeps it running.
    const pauseAnd = (action: SelectionAction) => {
      setPlaying(false);
      dispatch(action);
    };
    return {
      selection,
      bounds,
      meta,
      availability,
      countries: new Map(countries.map((c) => [c.iso3, c])),
      products: new Map(products.map((p) => [p.id, p])),
      droppedParams: initial.dropped,
      playing,
      setPlaying,
      actions: {
        setProduct: (product) => pauseAnd({ type: 'setProduct', product, availability }),
        setCountry: (country) => pauseAnd({ type: 'setCountry', country, availability }),
        toggleCountry: (country) => pauseAnd({ type: 'toggleCountry', country, availability }),
        setRange: (range) => pauseAnd({ type: 'setRange', range }),
        setFocusYear: (year) => dispatch({ type: 'setFocusYear', year }),
        reset: () => pauseAnd({ type: 'reset', bounds }),
      },
    };
  }, [selection, bounds, meta, availability, countries, products, initial.dropped, playing],
  );

  return <DashboardCtx.Provider value={value}>{children}</DashboardCtx.Provider>;
}
