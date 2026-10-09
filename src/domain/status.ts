import type { DataStatus, DatasetMeta } from '../api/types';

export function statusOfYear(year: number, meta: Pick<DatasetMeta, 'latestActualYear'>): DataStatus {
  if (year <= meta.latestActualYear) return 'actual';
  return year === meta.latestActualYear + 1 ? 'estimate' : 'forecast';
}
