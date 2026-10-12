import { describe, expect, it, vi } from 'vitest';
import * as seoModule from '../../server/seo.mjs';

const { DEFAULT_SEO, apiFetcher, cached, escapeHtml, injectSEO, pathOf, personJsonLd, resolveSeo, safeJson } = seoModule as Record<string, any>;

const HTML = `<html><head>
  <title>Old</title>
  <meta name="title" content="Old">
  <meta name="description"
    content="Old description">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://abdulazeez.usaiy.xyz/">
  <meta property="og:title" content="Old">
  <meta property="og:description"
    content="Old">
  <meta property="og:image" content="old.png">
  <meta property="twitter:title" content="Old">
  <meta property="twitter:description"
    content="Old">
  <meta property="twitter:image" content="old.png">
  <meta property="twitter:url" content="https://abdulazeez.usaiy.xyz/">
  <link rel="canonical" href="https://abdulazeez.usaiy.xyz/">
</head><body></body></html>`;

describe('server SEO helpers', () => {
  it('escapes HTML and JSON for safe injection', () => {
    expect(escapeHtml(`"><script>x</script>&'`)).toBe('&quot;&gt;&lt;script&gt;x&lt;/script&gt;&amp;&#39;');
    expect(safeJson({ a: '</script><script>alert(1)</script>' })).not.toContain('</script>');
  });

  it('normalises request paths', () => {
    expect(pathOf('/notes/a?utm=1#x')).toBe('/notes/a');
    expect(pathOf('')).toBe('/');
    expect(pathOf(undefined)).toBe('/');
  });

  it('builds schema.org Person data from the profile', () => {
    const ld = personJsonLd({
      basics: { name: 'Abdulazeez', label: 'Technical Product Builder', location: { city: 'Ibadan', countryCode: 'NG' }, profiles: [{ url: 'https://github.com/callmehalpha' }] },
      leadSkills: ['NestJS'],
    });
    expect(ld).toMatchObject({ '@type': 'Person', jobTitle: 'Technical Product Builder', sameAs: ['https://github.com/callmehalpha'], knowsAbout: ['NestJS'] });
    expect(personJsonLd(null)).toBeNull();
  });

  it('caches results and failures for different lengths of time', async () => {
    let t = 0;
    const fn = vi.fn().mockResolvedValueOnce('a').mockRejectedValueOnce(new Error('x')).mockResolvedValue('b');
    const get = cached(fn, { ttlMs: 100, errorTtlMs: 10, now: () => t });
    expect(await get('k')).toBe('a');
    expect(await get('k')).toBe('a');
    t = 101;
    expect(await get('k')).toBeNull(); // failure
    t = 105;
    expect(await get('k')).toBeNull(); // failure still cached
    t = 112;
    expect(await get('k')).toBe('b');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('treats 4xx as "no content" but 5xx as a failure, so outages are cached briefly', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response('{"title":"T"}', { status: 200 }))
      .mockResolvedValueOnce(new Response('', { status: 404 }))
      .mockResolvedValueOnce(new Response('', { status: 503 }));
    const get = apiFetcher('https://api.test/', { fetchImpl });
    expect(await get('/api/notes/a')).toEqual({ title: 'T' });
    expect(await get('/api/notes/b')).toBeNull();
    await expect(get('/api/notes/c')).rejects.toThrow('HTTP 503');
    expect(fetchImpl.mock.calls[0][0]).toBe('https://api.test/api/notes/a');
    expect(await apiFetcher('')('/api/profile')).toBeNull();
  });

  describe('resolveSeo', () => {
    const note = { title: 'Why "modular" wins', excerpt: 'Trade-offs', coverImageUrl: null, seo: null };

    it('uses the note for /notes/:slug', async () => {
      const getJson = vi.fn().mockResolvedValue(note);
      const seo = await resolveSeo('/notes/why-modular?ref=li', getJson);
      expect(getJson).toHaveBeenCalledWith('/api/notes/why-modular');
      expect(seo).toMatchObject({ title: 'Why "modular" wins | Callmehalpha', description: 'Trade-offs', image: DEFAULT_SEO.image, type: 'article' });
    });

    it('prefers the note SEO fields when present', async () => {
      const seo = await resolveSeo('/notes/x', async () => ({ ...note, seo: { title: 'Custom', description: 'D', image: 'https://img' } }));
      expect(seo).toMatchObject({ title: 'Custom', description: 'D', image: 'https://img' });
    });

    it('falls back to the default when the note or the API is missing', async () => {
      expect(await resolveSeo('/notes/x', async () => null)).toEqual(DEFAULT_SEO);
    });

    it('adds Person data on the homepage when the profile is available', async () => {
      const seo = await resolveSeo('/', async () => ({ basics: { name: 'A', label: 'L', profiles: [] } }));
      expect(seo.jsonLd).toMatchObject({ '@type': 'Person', name: 'A' });
      expect((await resolveSeo('/', async () => null)).jsonLd).toBeUndefined();
    });

    it('keeps product pages and has a notes index title', async () => {
      const getJson = vi.fn();
      expect((await resolveSeo('/products/ai-job-kit', getJson)).title).toMatch(/AI Job Hunter Kit/);
      expect((await resolveSeo('/notes', getJson)).title).toBe('Technical Notes | Callmehalpha');
      expect(await resolveSeo('/anything', getJson)).toEqual(DEFAULT_SEO);
      expect(getJson).not.toHaveBeenCalled();
    });
  });

  describe('injectSEO', () => {
    it('replaces every tag, including multi-line ones, and escapes values', () => {
      const out = injectSEO(HTML, { title: 'A "quoted" <b>title</b>', description: 'New "desc"', image: 'https://img/x.png', type: 'article' }, '/notes/a?x=1');
      expect(out).toContain('<title>A &quot;quoted&quot; &lt;b&gt;title&lt;/b&gt;</title>');
      expect(out).toMatch(/<meta name="description"\s+content="New &quot;desc&quot;">/);
      expect(out).toMatch(/<meta property="og:description"\s+content="New &quot;desc&quot;">/);
      expect(out).toContain('<meta property="og:type" content="article">');
      expect(out).toContain('<meta property="og:image" content="https://img/x.png">');
      expect(out).toContain('<link rel="canonical" href="https://abdulazeez.usaiy.xyz/notes/a">');
      expect(out).not.toContain('Old');
    });

    it('adds JSON-LD that cannot break out of its script tag', () => {
      const out = injectSEO(HTML, { ...DEFAULT_SEO, jsonLd: { name: '</script><script>alert(1)</script>' } }, '/');
      expect(out).toContain('<script type="application/ld+json">');
      expect(out.match(/<\/script>/g)).toHaveLength(1);
    });

    it('adds a canonical link when the page has none', () => {
      const out = injectSEO('<html><head></head></html>', DEFAULT_SEO, '/x');
      expect(out).toContain('<link rel="canonical" href="https://abdulazeez.usaiy.xyz/x">');
    });
  });
});
