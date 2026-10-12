// Server-side SEO for the SPA: picks the title/description/image per route and injects them
// into index.html, so link previews (LinkedIn, X, WhatsApp) and crawlers see the right page.

export const SITE_URL = 'https://abdulazeez.usaiy.xyz';

export const DEFAULT_SEO = {
  title: 'Callmehalpha | Systems Engineer & Technical Founder',
  description:
    'Portfolio of Callmehalpha - A systems-focused software engineer and technical founder specializing in scalable infrastructure and distributed systems.',
  image: `${SITE_URL}/logo.png`,
};

export const PRODUCT_SEO = {
  'ai-job-kit': {
    title: 'AI Job Hunter Kit | Land Interviews in 11 Days',
    description:
      'The plug-and-play AI prompt system engineered to help you bypass ATS filters and land your dream role. 53+ battle-tested prompts for every stage of the job search.',
    image: `${SITE_URL}/product-assets/ai-job-kit/Gumroad_Cover_1280x720.png`,
  },
};

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ENTITIES[c]);
}

/** JSON for a <script> block: `</script>` and friends can't break out. */
export function safeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

/** Path without query string or hash, never empty. */
export function pathOf(url) {
  const path = String(url ?? '/').split(/[?#]/)[0] || '/';
  return path.startsWith('/') ? path : `/${path}`;
}

/** schema.org Person for the homepage, from the public profile. */
export function personJsonLd(profile) {
  if (!profile?.basics?.name) return null;
  const { basics } = profile;
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: basics.name,
    alternateName: 'Callmehalpha',
    jobTitle: basics.label,
    url: basics.url ?? SITE_URL,
    ...(basics.email ? { email: `mailto:${basics.email}` } : {}),
    ...(basics.location?.city ? { address: { '@type': 'PostalAddress', addressLocality: basics.location.city, addressCountry: basics.location.countryCode } } : {}),
    sameAs: (basics.profiles ?? []).map((p) => p.url),
    ...(profile.leadSkills?.length ? { knowsAbout: profile.leadSkills } : {}),
  };
}

/** Caches lookups for `ttlMs`; failures are cached briefly so a down API doesn't slow every request. */
export function cached(fn, { ttlMs = 60_000, errorTtlMs = 10_000, now = () => Date.now() } = {}) {
  const store = new Map();
  return async (key) => {
    const hit = store.get(key);
    if (hit && hit.expires > now()) return hit.value;
    let value = null;
    let ok = true;
    try {
      value = await fn(key);
    } catch {
      ok = false;
    }
    store.set(key, { value, expires: now() + (ok ? ttlMs : errorTtlMs) });
    return value;
  };
}

/**
 * Fetches JSON from the content API with a short timeout. A 4xx (e.g. no such note) is a real
 * answer and returns null; a 5xx or network error throws, so `cached` only keeps it briefly.
 */
export function apiFetcher(baseUrl, { timeoutMs = 1500, fetchImpl = fetch } = {}) {
  const base = String(baseUrl ?? '').replace(/\/+$/, '');
  return async (path) => {
    if (!base) return null;
    const res = await fetchImpl(`${base}${path}`, { signal: AbortSignal.timeout(timeoutMs) });
    if (res.status >= 500) throw new Error(`Content API ${path}: HTTP ${res.status}`);
    if (!res.ok) return null;
    return res.json();
  };
}

/** Decides the SEO block for a path. `getJson(path)` returns parsed API JSON or null. */
export async function resolveSeo(url, getJson) {
  const path = pathOf(url);

  const product = /^\/products\/([^/]+)\/?$/.exec(path);
  if (product && PRODUCT_SEO[product[1]]) return { ...PRODUCT_SEO[product[1]] };

  const note = /^\/notes\/([^/]+)\/?$/.exec(path);
  if (note) {
    const data = await getJson(`/api/notes/${encodeURIComponent(decodeURIComponent(note[1]))}`);
    if (data?.title) {
      return {
        title: data.seo?.title ?? `${data.title} | Callmehalpha`,
        description: data.seo?.description ?? data.excerpt ?? DEFAULT_SEO.description,
        image: data.seo?.image ?? data.coverImageUrl ?? DEFAULT_SEO.image,
        type: 'article',
      };
    }
    return { ...DEFAULT_SEO };
  }

  if (/^\/notes\/?$/.test(path)) {
    return {
      ...DEFAULT_SEO,
      title: 'Technical Notes | Callmehalpha',
      description: 'Notes on building products: technical decisions, trade-offs and lessons from shipping.',
    };
  }

  if (path === '/' || path === '/index.html') {
    const profile = await getJson('/api/profile');
    const jsonLd = personJsonLd(profile);
    return jsonLd ? { ...DEFAULT_SEO, jsonLd } : { ...DEFAULT_SEO };
  }

  return { ...DEFAULT_SEO };
}

/** Writes the SEO block into index.html. Every value is escaped. */
export function injectSEO(html, seo, url) {
  const fullUrl = escapeHtml(`${SITE_URL}${pathOf(url)}`);
  const title = escapeHtml(seo.title);
  const description = escapeHtml(seo.description);
  const image = escapeHtml(seo.image);
  const set = (attr, key, value) => (h) =>
    h.replace(new RegExp(`(<meta\\s+${attr}="${key}"\\s+content=")[^"]*(")`), `$1${value}$2`);

  let out = html;
  if (/rel="canonical"/.test(out)) {
    out = out.replace(/(<link\s+rel="canonical"\s+href=")[^"]*(")/, `$1${fullUrl}$2`);
  } else {
    out = out.replace('</head>', `  <link rel="canonical" href="${fullUrl}">\n</head>`);
  }
  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
  for (const fn of [
    set('name', 'title', title),
    set('name', 'description', description),
    set('property', 'og:title', title),
    set('property', 'og:description', description),
    set('property', 'og:image', image),
    set('property', 'og:url', fullUrl),
    set('property', 'og:type', escapeHtml(seo.type ?? 'website')),
    set('property', 'twitter:title', title),
    set('property', 'twitter:description', description),
    set('property', 'twitter:image', image),
    set('property', 'twitter:url', fullUrl),
  ]) {
    out = fn(out);
  }
  if (seo.jsonLd) {
    out = out.replace('</head>', `  <script type="application/ld+json">${safeJson(seo.jsonLd)}</script>\n</head>`);
  }
  return out;
}
