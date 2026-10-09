// API contract. These shapes are what a real REST backend would return;
// the fake implementation in ./endpoints.ts is built to match them 1:1.

export type Iso3 = string;
export const ROW = 'ROW' as const; // "Rest of World" pseudo-country
export type RowId = typeof ROW;

export type ProductId =
  | 'lithium'
  | 'cobalt-mined'
  | 'cobalt-refined'
  | 'nickel'
  | 'graphite'
  | 'manganese'
  | 'rare-earths'
  | 'cathode'
  | 'anode'
  | 'cells';

export type SupplyChainStage = 'upstream' | 'midstream' | 'downstream';
export type DataStatus = 'actual' | 'estimate' | 'forecast';

export interface Country {
  iso3: Iso3;
  isoNumeric: string; // matches world-atlas feature ids
  name: string;
  region: string;
  aliases: string[];
}

export interface Product {
  id: ProductId;
  name: string;
  stage: SupplyChainStage;
  /** Short unit label, e.g. "kt LCE", "GWh". */
  unit: string;
  description: string;
  aliases: string[];
}

/** Country × product availability over the whole horizon (value > 0 in any year). */
export interface Availability {
  pairs: Array<{ iso3: Iso3; productId: ProductId }>;
}

export interface ProductOption {
  product: Product;
  /** Country's share of world production in the latest actual year (for sorting). */
  latestShare: number | null;
}

export interface CountryOption {
  country: Country;
  /** Production of the selected product in the latest actual year (for sorting). */
  latestValue: number | null;
}

export interface MatrixRow {
  iso3: Iso3 | RowId;
  /** Aligned with ProductMatrix.years. null = no data reported. */
  values: Array<number | null>;
}

/** Full time series of one product: every producing country × every year. */
export interface ProductMatrix {
  productId: ProductId;
  years: number[];
  status: DataStatus[];
  world: number[];
  rows: MatrixRow[]; // countries, without ROW
  rest: MatrixRow; // Rest of World (residual to world total)
}

export interface CountryProfile {
  iso3: Iso3;
  years: number[];
  status: DataStatus[];
  products: Array<{
    productId: ProductId;
    values: Array<number | null>;
    world: number[];
  }>;
}

export interface DatasetMeta {
  source: string;
  updatedAt: string;
  firstYear: number;
  lastYear: number;
  latestActualYear: number;
  statusByYear: Record<DataStatus, string>;
}
