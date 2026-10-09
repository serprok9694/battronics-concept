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
  const [from, to] = selection.range;

  const year = useMemo(
    () => (matrix ? summarizeYear(matrix, selection.focusYear) : null),
    [matrix, selection.focusYear],
  );
  const period = useMemo(() => (matrix ? summarizePeriod(matrix, from, to) : null), [matrix, from, to]);

  return {
    matrix,
    product: matrix ? products.get(matrix.productId) ?? null : null,
    year,
    period,
    isStale: query.isPlaceholderData,
    isLoading: selection.product !== null && !matrix,
    error: query.error,
    refetch: query.refetch,
  };
}
