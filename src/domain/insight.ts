import type { Product } from '../api/types';
import { formatGrowth, formatHhi, formatPp, formatShare, formatVolume } from './format';
import { HHI_LABEL, type PeriodSummary, type YearSummary } from './metrics';

// One-sentence takeaways for executives. Template-based and deterministic.

export function productInsight(
  product: Product,
  year: YearSummary,
  period: PeriodSummary,
  range: [number, number],
  name: (iso3: string) => string,
): string {
  const top = year.top1;
  if (!top || top.value === null) return `No recorded ${product.name} production in ${year.year}.`;
  const parts = [
    `${name(top.iso3)} produced ${formatShare(top.share)} of world ${product.name.toLowerCase()} in ${year.year} (${formatVolume(top.value, product.unit)}).`,
    `The market is ${HHI_LABEL[year.hhi.category].toLowerCase()} (HHI ${formatHhi(year.hhi.value)}; top-3 hold ${formatShare(year.cr3)}).`,
  ];
  if (range[1] > range[0]) {
    const dir = period.hhiChange > 0 ? 'increased' : 'decreased';
    parts.push(`Over ${range[0]}–${range[1]} concentration ${dir} by ${formatHhi(Math.abs(period.hhiChange))} HHI points.`);
    // Fastest-growing meaningful producer (≥1% share in focus year) — a diversification signal.
    const growers = year.ranking
      .filter((r) => (r.share ?? 0) >= 0.01 && r.iso3 !== top.iso3)
      .map((r) => ({ r, g: period.countries.get(r.iso3)!.cagr }))
      .filter((x) => x.g.kind === 'value');
    growers.sort((a, b) => (b.g.kind === 'value' ? b.g.rate : 0) - (a.g.kind === 'value' ? a.g.rate : 0));
    const best = growers[0];
    if (best && best.g.kind === 'value' && best.g.rate > 0)
      parts.push(`Fastest-growing alternative: ${name(best.r.iso3)} (${formatGrowth(best.g)} per year since ${best.g.sinceYear}).`);
  }
  return parts.join(' ');
}

export function pairInsight(
  product: Product,
  countryName: string,
  year: YearSummary,
  period: PeriodSummary,
  iso3: string,
  range: [number, number],
): string {
  const row = year.ranking.find((r) => r.iso3 === iso3);
  if (!row || row.value === null) return `${countryName}: no reported ${product.name} data for ${year.year}.`;
  if (!row.rank) return `${countryName} did not produce ${product.name} in ${year.year}.`;
  const stats = period.countries.get(iso3);
  const parts = [`${countryName} is #${row.rank} in the world for ${product.name} in ${year.year} with ${formatShare(row.share)} of supply.`];
  if (stats && stats.shareChange !== null && range[1] > range[0]) {
    const dir = stats.shareChange >= 0 ? 'gained' : 'lost';
    parts.push(`It ${dir} ${formatPp(Math.abs(stats.shareChange)).replace(/^[+−]/, '')} of world share over ${range[0]}–${range[1]}.`);
  }
  return parts.join(' ');
}
