import { safeCompare } from './safe-compare';

describe('safeCompare', () => {
  it('matches identical strings', () => expect(safeCompare('abc', 'abc')).toBe(true));
  it('rejects different strings of the same length', () => expect(safeCompare('abc', 'abd')).toBe(false));
  it('rejects strings of different length', () => expect(safeCompare('abc', 'abcd')).toBe(false));
});
