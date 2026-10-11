import { describe, expect, it } from 'vitest';
import { PRODUCTS } from '../mocks/reference';
import { unitInfo } from './glossary';

describe('glossary', () => {
  it('explains every unit used by the products', () => {
    for (const p of PRODUCTS) expect(unitInfo(p.unit), p.unit).not.toMatch(/^Unit: /);
  });
});
