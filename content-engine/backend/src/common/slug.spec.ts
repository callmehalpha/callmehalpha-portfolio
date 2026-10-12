import { slugify, uniqueSlug } from './slug';

describe('slugify', () => {
  it('lowercases, strips accents and joins words with dashes', () => {
    expect(slugify('MÍRÀ Africa: Multi-Tenant Storefronts!')).toBe('mira-africa-multi-tenant-storefronts');
  });

  it('trims leading and trailing separators', () => {
    expect(slugify('  --The Case for Modular Monoliths--  ')).toBe('the-case-for-modular-monoliths');
  });

  it('caps the length without leaving a trailing dash', () => {
    const s = slugify('a'.repeat(10) + ' ' + 'b'.repeat(10), 11);
    expect(s).toBe('aaaaaaaaaa');
  });

  it('never returns an empty slug', () => {
    expect(slugify('!!!')).toBe('untitled');
  });
});

describe('uniqueSlug', () => {
  it('returns the base slug when it is free', async () => {
    expect(await uniqueSlug('Hello World', async () => false)).toBe('hello-world');
  });

  it('appends the first free numeric suffix', async () => {
    const taken = new Set(['hello', 'hello-2']);
    expect(await uniqueSlug('Hello', async (s) => taken.has(s))).toBe('hello-3');
  });
});
