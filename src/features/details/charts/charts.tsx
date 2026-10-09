import type { CountryProfile, Product, ProductId, ProductMatrix } from '../../../api/types';
import { formatShare, formatVolume } from '../../../domain/format';
import { share } from '../../../domain/metrics';
import { CHART_INK, OTHER_COLOR, SERIES_COLORS, baseAxes, projectionArea, valueAxis } from './chartTheme';
import { EChart, type ChartOption } from './EChart';

const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 });
const sliceYears = (years: number[], [from, to]: [number, number]) => {
  const a = years.indexOf(from);
  const b = years.indexOf(to);
  return { a, b, years: years.slice(a, b + 1) };
};

const tooltipBase = {
  trigger: 'axis' as const,
  axisPointer: { type: 'line' as const, lineStyle: { color: CHART_INK.axis } },
  textStyle: { fontSize: 11, color: CHART_INK.primary },
  confine: true,
};

/** Product mode: who supplies the world over the period — top 5 producers + everyone else, stacked. */
export function SupplyStackChart(props: {
  matrix: ProductMatrix;
  product: Product;
  range: [number, number];
  latestActualYear: number;
  name: (iso3: string) => string;
}) {
  const { matrix, product, range, latestActualYear, name } = props;
  const { a, b, years } = sliceYears(matrix.years, range);
  // Top 5 by volume at the end of the period: stable while the focus year moves,
  // and colour follows the country, not its rank in a given year.
  const top = [...matrix.rows].sort((x, y) => (y.values[b] ?? 0) - (x.values[b] ?? 0)).slice(0, 5);
  const topIds = new Set(top.map((r) => r.iso3));
  const others = years.map((_, k) => {
    const i = a + k;
    const rest = matrix.rest.values[i] ?? 0;
    return matrix.rows.filter((r) => !topIds.has(r.iso3)).reduce((s, r) => s + (r.values[i] ?? 0), rest);
  });

  const option: ChartOption = {
    ...baseAxes(years),
    yAxis: valueAxis((v) => compact.format(v)),
    legend: { top: 0, left: 0, itemWidth: 10, itemHeight: 8, textStyle: { fontSize: 10, color: CHART_INK.secondary } },
    tooltip: { ...tooltipBase, valueFormatter: (v) => formatVolume(v as number, product.unit) },
    series: [
      ...top.map((r, idx) => ({
        name: name(r.iso3),
        type: 'line' as const,
        stack: 'supply',
        areaStyle: { opacity: 0.85 },
        lineStyle: { width: 1, color: '#fff' },
        showSymbol: false,
        color: SERIES_COLORS[idx],
        data: r.values.slice(a, b + 1),
      })),
      {
        name: 'All others (incl. Rest of World)',
        type: 'line' as const,
        stack: 'supply',
        areaStyle: { opacity: 0.85 },
        lineStyle: { width: 1, color: '#fff' },
        showSymbol: false,
        color: OTHER_COLOR,
        data: others,
        markArea: projectionArea(years, latestActualYear),
      },
    ],
  };
  return <EChart option={option} height={240} />;
}

/** Pair mode: the country's volume (bars) — one measure, one axis. */
export function VolumeChart(props: {
  values: Array<number | null>;
  years: number[];
  unit: string;
  range: [number, number];
  latestActualYear: number;
  focusYear: number;
}) {
  const { a, b, years } = sliceYears(props.years, props.range);
  const option: ChartOption = {
    ...baseAxes(years),
    yAxis: valueAxis((v) => compact.format(v)),
    tooltip: { ...tooltipBase, valueFormatter: (v) => formatVolume(v as number | null, props.unit) },
    series: [
      {
        name: 'Production',
        type: 'bar',
        barMaxWidth: 18,
        data: props.values.slice(a, b + 1).map((v, k) => ({
          value: v ?? undefined,
          itemStyle: {
            color: years[k]! > props.latestActualYear ? '#9ec5f4' : '#2a78d6',
            borderRadius: [3, 3, 0, 0],
            borderColor: years[k] === props.focusYear ? CHART_INK.primary : undefined,
            borderWidth: years[k] === props.focusYear ? 1.5 : 0,
          },
        })),
        markArea: projectionArea(years, props.latestActualYear),
      },
    ],
  };
  return <EChart option={option} height={190} />;
}

/** Pair mode: the country's share of world supply — separate chart instead of a dual axis. */
export function ShareChart(props: {
  values: Array<number | null>;
  world: number[];
  years: number[];
  range: [number, number];
  latestActualYear: number;
}) {
  const { a, b, years } = sliceYears(props.years, props.range);
  const shares = props.values.slice(a, b + 1).map((v, k) => share(v, props.world[a + k]));
  const option: ChartOption = {
    ...baseAxes(years),
    yAxis: { ...valueAxis((v) => `${Math.round(v * 100)}%`), min: 0 },
    tooltip: { ...tooltipBase, valueFormatter: (v) => formatShare(v as number | null) },
    series: [
      {
        name: 'World share',
        type: 'line',
        color: '#eb6834',
        lineStyle: { width: 2 },
        symbolSize: 6,
        data: shares,
        markArea: projectionArea(years, props.latestActualYear),
      },
    ],
  };
  return <EChart option={option} height={160} />;
}

/** Country mode: how important the country is for each product (shares are unitless, so comparable). */
export function PortfolioShareChart(props: {
  profile: CountryProfile;
  products: Map<ProductId, Product>;
  focusYear: number;
}) {
  const i = props.profile.years.indexOf(props.focusYear);
  const items = props.profile.products
    .map((p) => ({ name: props.products.get(p.productId)?.name ?? p.productId, s: share(p.values[i], p.world[i]) }))
    .sort((x, y) => (x.s ?? 0) - (y.s ?? 0)); // ascending: largest ends up on top
  const option: ChartOption = {
    grid: { left: 8, right: 40, top: 8, bottom: 8, containLabel: true },
    xAxis: { ...valueAxis((v) => `${Math.round(v * 100)}%`), max: 1 },
    yAxis: {
      type: 'category',
      data: items.map((x) => x.name),
      axisTick: { show: false },
      axisLine: { lineStyle: { color: CHART_INK.axis } },
      axisLabel: { color: CHART_INK.secondary, fontSize: 11 },
    },
    tooltip: { ...tooltipBase, trigger: 'item', valueFormatter: (v) => formatShare(v as number | null) },
    series: [
      {
        name: `World share ${props.focusYear}`,
        type: 'bar',
        barMaxWidth: 14,
        color: '#2a78d6',
        itemStyle: { borderRadius: [0, 3, 3, 0] },
        label: { show: true, position: 'right', fontSize: 10, color: CHART_INK.secondary, formatter: (p) => formatShare(p.value as number) },
        data: items.map((x) => x.s),
      },
    ],
  };
  return <EChart option={option} height={Math.max(120, items.length * 28 + 20)} />;
}
