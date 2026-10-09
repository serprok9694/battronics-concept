import { useMemo } from 'react';
import { useDashboard } from '../app/useDashboard';
import { summarizePeriod, summarizeYear } from '../domain/metrics';
import { useProductMatrix } from '../queries/hooks';

/**
 * Data for the selected product: raw matrix + focus-year and period summaries.
 * During a product switch the previous matrix stays on screen (`isStale`), so
 * labels and units are always taken from `matrix.productId`, never from the selection.
 */
export function useProductView() {
  const { selection, products } = useDashboard();
  const query = useProductMatrix(selection.product);
  const matrix = selection.product ? query.data : undefined;
  const from = selection.range[0];
  const focus = selection.focusYear;

  const year = useMemo(
    () => (matrix ? summarizeYear(matrix, selection.focusYear) : null),
    [matrix, selection.focusYear],
  );
  // Growth is measured from the start of the period to the FOCUS year, so deltas
  // always share the end year of the values they sit next to.
  const period = useMemo(() => (matrix ? summarizePeriod(matrix, from, focus) : null), [matrix, from, focus]);

  return {
    matrix,
    product: matrix ? products.get(matrix.productId) ?? null : null,
    year,
    period,
    isStale: query.isPlaceholderData,
    /** The product the user selected (available before its data arrives, unlike `product`). */
    selectedProduct: selection.product ? products.get(selection.product) ?? null : null,
    isLoading: selection.product !== null && !matrix && !query.error,
    error: selection.product ? query.error : null,
    refetch: query.refetch,
  };
}
