import type { MarkAreaComponentOption } from 'echarts/components';

export const CHART_INK = {
  primary: '#0b0b0b',
  secondary: '#52514e',
  muted: '#898781',
  grid: '#e1e0d9',
  axis: '#c3c2b7',
  surface: '#ffffff',
};

/** Categorical slots in fixed order (validated reference palette), "Other" is neutral gray. */
export const SERIES_COLORS = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
export const OTHER_COLOR = '#c3c2b7';

/** Shaded band over estimate/forecast years, so projections never read as facts. */
export function projectionArea(years: number[], latestActualYear: number): MarkAreaComponentOption | undefined {
  const last = years[years.length - 1];
  if (last === undefined || last <= latestActualYear) return undefined;
  const start = Math.max(latestActualYear + 1, years[0]!);
  return {
    silent: true,
    itemStyle: { color: 'rgba(235,104,52,0.07)' },
    label: { show: true, position: 'insideTop', color: CHART_INK.muted, fontSize: 10, formatter: 'est. / forecast' },
    data: [[{ xAxis: String(start) }, { xAxis: String(last) }]],
  };
}

export const baseAxes = (years: number[]) => ({
  grid: { left: 8, right: 12, top: 28, bottom: 8, containLabel: true },
  xAxis: {
    type: 'category' as const,
    data: years.map(String),
    axisLine: { lineStyle: { color: CHART_INK.axis } },
    axisTick: { show: false },
    axisLabel: { color: CHART_INK.muted, fontSize: 10 },
  },
});

export const valueAxis = (formatter: (v: number) => string) => ({
  type: 'value' as const,
  splitLine: { lineStyle: { color: CHART_INK.grid } },
  axisLabel: { color: CHART_INK.muted, fontSize: 10, formatter },
});
