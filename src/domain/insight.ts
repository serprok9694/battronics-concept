import type { Product } from '../api/types';
import { formatHhi, formatPp, formatShare, formatVolume } from './format';
import { HHI_LABEL, type PeriodSummary, type YearSummary } from './metrics';

// One-sentence takeaways for executives. Template-based and deterministic.

export function productInsight(
  product: Product,
  year: YearSummary,
  period: PeriodSummary,
  name: (iso3: string) => string,
): string {
  const top = year.top1;
  if (!top || top.value === null) return `No recorded ${product.name} production in ${year.year}.`;
  const parts = [
    `${name(top.iso3)} produced ${formatShare(top.share)} of world ${product.name.toLowerCase()} in ${year.year} (${formatVolume(top.value, product.unit)}).`,
    `The market is ${HHI_LABEL[year.hhi.category].toLowerCase()} (HHI ${formatHhi(year.hhi.value)}; top-3 hold ${formatShare(year.cr3)}).`,
  ];
  if (period.to > period.from) {
    const change = period.hhiChange;
    parts.push(
      change === 0
        ? `Concentration is unchanged since ${period.from}.`
        : `Since ${period.from} concentration has ${change > 0 ? 'increased' : 'decreased'} by ${formatHhi(Math.abs(change))} HHI points.`,
    );
    // Diversification signal for procurement: the producer GAINING world share fastest
    // (volume growth alone can hide a shrinking share in a growing market).
    const gainer = year.ranking
      .filter((r) => (r.share ?? 0) >= 0.01 && r.iso3 !== top.iso3)
      .map((r) => ({ iso3: r.iso3, delta: period.countries.get(r.iso3)?.shareChange ?? null }))
      .filter((x): x is { iso3: string; delta: number } => x.delta !== null && x.delta > 0)
      .sort((a, b) => b.delta - a.delta)[0];
    if (gainer) parts.push(`Gaining share fastest: ${name(gainer.iso3)} (${formatPp(gainer.delta)} since ${period.from}).`);
  }
  return parts.join(' ');
}

export function pairInsight(
  product: Product,
  countryName: string,
  year: YearSummary,
  period: PeriodSummary,
  iso3: string,
): string {
  const row = year.ranking.find((r) => r.iso3 === iso3);
  if (!row || row.value === null) return `${countryName}: no reported ${product.name} data for ${year.year}.`;
  if (!row.rank) return `${countryName} did not produce ${product.name} in ${year.year}.`;
  const stats = period.countries.get(iso3);
  const parts = [`${countryName} is #${row.rank} in the world for ${product.name} in ${year.year} with ${formatShare(row.share)} of supply.`];
  if (stats && stats.shareChange !== null && period.to > period.from) {
    const dir = stats.shareChange >= 0 ? 'gained' : 'lost';
    parts.push(`It ${dir} ${formatPp(Math.abs(stats.shareChange)).replace(/^[+−]/, '')} of world share since ${period.from}.`);
  }
  return parts.join(' ');
}
