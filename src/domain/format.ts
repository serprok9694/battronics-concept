import type { DataStatus } from '../api/types';
import type { Growth } from './metrics';

const compact = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const integer = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/** Volume with its unit. Units are always shown; volumes of different products are never summed. */
export function formatVolume(value: number | null | undefined, unit: string): string {
  if (value == null) return 'No data';
  const n = Math.abs(value) >= 100 ? integer.format(value) : compact.format(value);
  return `${n} ${unit}`;
}

export function formatShare(s: number | null | undefined): string {
  if (s == null) return 'n/a';
  if (s > 0 && s < 0.001) return '<0.1%';
  return `${(s * 100).toFixed(s >= 0.1 ? 0 : 1)}%`;
}

export function formatPp(delta: number | null | undefined): string {
  if (delta == null) return 'n/a';
  const pp = delta * 100;
  return `${pp >= 0 ? '+' : '−'}${Math.abs(pp).toFixed(1)} pp`;
}

export function formatRate(rate: number): string {
  const pct = rate * 100;
  return `${pct >= 0 ? '+' : '−'}${Math.abs(pct).toFixed(1)}%`;
}

export function formatGrowth(g: Growth, opts: { suffix?: string } = {}): string {
  switch (g.kind) {
    case 'value':
      return formatRate(g.rate) + (opts.suffix ?? '');
    case 'new':
      return `New since ${g.sinceYear}`;
    case 'na':
      return 'n/a';
  }
}

/** CAGR with the start year when production began inside the period (edge case E5). */
export function formatCagr(g: Growth, from: number): string {
  if (g.kind === 'value' && g.sinceYear !== from) return `${formatRate(g.rate)} since ${g.sinceYear}`;
  return formatGrowth(g);
}

export const STATUS_LABEL: Record<DataStatus, string> = {
  actual: 'Actual',
  estimate: 'Estimate',
  forecast: 'Forecast',
};

export const formatHhi = (v: number) => integer.format(v);
