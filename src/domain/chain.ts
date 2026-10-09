import type { ProductId } from '../api/types';

// The Li-ion battery value chain as a small directed graph:
//   mining → refining → battery materials → cells.
// Rare earths are tracked but are NOT part of this chain (they go into EV motors).

export type ChainStep = 'mining' | 'refining' | 'materials' | 'cells';

export const CHAIN_STEPS: Array<{ id: ChainStep; label: string }> = [
  { id: 'mining', label: 'Mining' },
  { id: 'refining', label: 'Refining' },
  { id: 'materials', label: 'Materials' },
  { id: 'cells', label: 'Cells' },
];

export const STEP_OF: Partial<Record<ProductId, ChainStep>> = {
  lithium: 'mining',
  nickel: 'mining',
  'cobalt-mined': 'mining',
  manganese: 'mining',
  graphite: 'mining',
  'cobalt-refined': 'refining',
  cathode: 'materials',
  anode: 'materials',
  cells: 'cells',
};

/** input → output. Simplification: only refined cobalt is modelled as a separate refining step. */
const EDGES: Array<[from: ProductId, to: ProductId]> = [
  ['lithium', 'cathode'],
  ['nickel', 'cathode'],
  ['manganese', 'cathode'],
  ['cobalt-mined', 'cobalt-refined'],
  ['cobalt-refined', 'cathode'],
  ['graphite', 'anode'],
  ['cathode', 'cells'],
  ['anode', 'cells'],
];

const ORDER = Object.keys(STEP_OF) as ProductId[];

/** All products of the battery chain, in step order. */
export const BATTERY_CHAIN: ProductId[] = ORDER;

function walk(start: ProductId, next: (p: ProductId) => ProductId[]): Set<ProductId> {
  const seen = new Set<ProductId>();
  const stack = [start];
  while (stack.length) {
    for (const n of next(stack.pop()!)) {
      if (!seen.has(n)) {
        seen.add(n);
        stack.push(n);
      }
    }
  }
  return seen;
}

/**
 * The chain a product belongs to: everything upstream of it (its inputs),
 * the product itself and everything downstream (what it ends up in).
 * Returns null for products outside the battery chain.
 */
export function chainFor(product: ProductId): ProductId[] | null {
  if (!STEP_OF[product]) return null;
  const up = walk(product, (p) => EDGES.filter(([, to]) => to === p).map(([from]) => from));
  const down = walk(product, (p) => EDGES.filter(([from]) => from === p).map(([, to]) => to));
  const members = new Set([...up, product, ...down]);
  return ORDER.filter((p) => members.has(p));
}
