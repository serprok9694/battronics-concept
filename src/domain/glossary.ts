// Plain-language definitions for every abbreviation and metric in the UI.
// One source of truth: tooltips, and later docs or an onboarding tour, read from here.

export const GLOSSARY = {
  share:
    "Country's production as a percentage of world production in the focus year.",
  rank: 'Position among producing countries by production volume in the focus year (#1 = largest).',
  yoy: 'Year-over-year change: production in the focus year compared with the year before.',
  cagr:
    'Compound annual growth rate: the average yearly growth between two years, as if production grew at a steady rate. Measured from the start of the period to the focus year.',
  shareChange:
    'Change in world share, in percentage points (pp). 10% → 25% is +15 pp. Not the same as % growth: a country can grow its volume and still lose share if the market grows faster.',
  hhi: 'Herfindahl–Hirschman Index: the sum of squared market shares (in %), from 0 to 10,000. Higher means supply sits in fewer countries. US DOJ/FTC 2023 thresholds: below 1,000 unconcentrated, 1,000–1,800 moderately concentrated, above 1,800 highly concentrated. Rest of World is excluded, so the value is a lower bound.',
  top1: 'World share of the largest producer: how much supply depends on a single country.',
  cr3: 'Concentration ratio (CR3): combined world share of the three largest producers.',
  rest: 'Rest of World: production not attributed to the listed countries (the remainder up to the world total). It is not ranked and not included in HHI.',
  worldProduction: 'Total world production of the product in the focus year.',
  chokepoints: 'Products where this country holds at least 25% of world supply: a disruption there would be felt globally.',
  status:
    'Actual: reported data (2010–2024). Estimate: preliminary figure for 2025. Forecast: projection for 2026. Growth figures that end in an estimate or forecast year are marked.',
  period: 'Years shown on the charts and played by ▶. Growth figures start at the beginning of the period.',
  focusYear:
    'The year shown on the map, in the values, shares and HHI. All changes are measured from the start of the period to this year.',
  valueChain:
    'The Li-ion battery value chain: mining → refining → battery materials → cells. Each card shows who leads that step and how concentrated it is.',
} as const;

export type GlossaryTerm = keyof typeof GLOSSARY;

const UNITS: Record<string, string> = {
  kt: 'kt = kilotonnes, i.e. thousand tonnes of material.',
  'kt LCE':
    'Thousand tonnes of lithium carbonate equivalent (LCE): lithium output converted to Li₂CO₃, the standard way to compare lithium from different sources.',
  'kt Co': 'Thousand tonnes of cobalt content (the cobalt in the ore or chemical, not the gross weight).',
  'kt Ni': 'Thousand tonnes of nickel content (the nickel in the ore, not the gross weight).',
  'kt Mn': 'Thousand tonnes of manganese content (the manganese in the ore, not the gross weight).',
  'kt REO': 'Thousand tonnes of rare-earth oxide equivalent (REO): rare-earth output expressed as oxides.',
  GWh: 'Gigawatt-hours: the energy storage capacity of the battery cells produced in a year.',
};

export const unitInfo = (unit: string): string => UNITS[unit] ?? `Unit: ${unit}`;
