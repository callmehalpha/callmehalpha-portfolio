import { mergeConfig } from './registry.service';

describe('mergeConfig', () => {
  it('keeps existing keys, replaces patched ones and removes nulls', () => {
    expect(mergeConfig({ maxLength: 3000, to: 'a@b.c', events: ['approval'] }, { tokenExpiresAt: '2026-12-01', to: null, events: [] })).toEqual({
      maxLength: 3000,
      tokenExpiresAt: '2026-12-01',
      events: [],
    });
  });

  it('leaves config alone when the patch has none', () => {
    expect(mergeConfig({ a: 1 }, undefined)).toBeUndefined();
  });

  it('handles an empty current config', () => {
    expect(mergeConfig(null, { a: 1 })).toEqual({ a: 1 });
  });
});
