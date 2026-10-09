// Choropleth scale on WORLD SHARE with fixed thresholds: identical for every
// product and year, so colours stay comparable while scrubbing / playing.
// Single-hue sequential ramp (blue 100→700), light = near zero.

export interface ShareBucket {
  min: number; // inclusive
  label: string;
  color: string;
}

export const SHARE_BUCKETS: ShareBucket[] = [
  { min: 0, label: '0%', color: '#cde2fb' },
  { min: 1e-9, label: '<1%', color: '#9ec5f4' },
  { min: 0.01, label: '1–5%', color: '#6da7ec' },
  { min: 0.05, label: '5–10%', color: '#3987e5' },
  { min: 0.1, label: '10–25%', color: '#256abf' },
  { min: 0.25, label: '25–50%', color: '#184f95' },
  { min: 0.5, label: '>50%', color: '#0d366b' },
];

export const MAP_COLORS = {
  background: '#f4f5f2',
  notProducer: '#dcdbd5', // in dataset, but never produces the selected product
  noData: '#ecebe7', // outside the dataset or value not reported
  neutral: '#c9d6e8', // country with data, nothing selected
  outline: '#ffffff',
  selected: '#eb6834',
  hover: '#0b0b0b',
} as const;

export function shareColor(share: number | null): string {
  if (share == null) return MAP_COLORS.noData;
  let color = SHARE_BUCKETS[0]!.color;
  for (const b of SHARE_BUCKETS) if (share >= b.min) color = b.color;
  return color;
}
