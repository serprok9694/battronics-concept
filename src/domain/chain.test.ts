import { describe, expect, it } from 'vitest';
import { BATTERY_CHAIN, chainFor } from './chain';

describe('chainFor', () => {
  it('follows a raw material down to cells', () => {
    expect(chainFor('cobalt-mined')).toEqual(['cobalt-mined', 'cobalt-refined', 'cathode', 'cells']);
    expect(chainFor('graphite')).toEqual(['graphite', 'anode', 'cells']);
  });

  it('includes all inputs of an intermediate product', () => {
    expect(chainFor('cathode')).toEqual(['lithium', 'nickel', 'cobalt-mined', 'manganese', 'cobalt-refined', 'cathode', 'cells']);
  });

  it('covers the whole battery chain for cells', () => {
    expect(chainFor('cells')?.sort()).toEqual([...BATTERY_CHAIN].sort());
  });

  it('returns null for products outside the battery chain', () => {
    expect(chainFor('rare-earths')).toBeNull();
  });
});
