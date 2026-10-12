// A stand-in for the content engine's public API, serving fixtures. `POST /__mode` with
// {"down": true} makes every /api route answer 503, to test the static fallbacks.
import http from 'http';

const PORT = Number(process.env.MOCK_API_PORT || 4010);
let down = false;

const note = (n) => ({
  slug: `note-${n}`,
  title: `Fixture note ${n}`,
  excerpt: `Excerpt for note ${n}`,
  preview: `Preview text for note ${n}`,
  tags: n === 1 ? ['fintech'] : ['ai'],
  pillars: ['Engineering'],
  coverImageUrl: null,
  publishedAt: `2026-0${(n % 9) + 1}-01T09:00:00.000Z`,
  project: null,
});

const NOTES = Array.from({ length: 12 }, (_, i) => note(12 - i));

export const FIXTURES = {
  profile: {
    basics: {
      name: 'Abdulazeez Yisau Temitope',
      label: 'Technical Product Builder',
      url: 'https://abdulazeez.usaiy.xyz',
      location: { city: 'Ibadan', countryCode: 'NG' },
      profiles: [{ network: 'GitHub', url: 'https://github.com/callmehalpha' }],
    },
    positioning: {
      headline: 'Technical Product Builder',
      tagline: 'I turn business problems into shipped technology products.',
      intro: 'Fixture intro from the API.',
    },
    heroStats: [{ label: 'Active users on a platform I co-founded', value: '15,000+', evidence: 'Virtuo' }],
    capabilities: [{ title: 'Fixture Capability', description: 'From the API', items: ['NestJS'] }],
    philosophies: [{ title: 'Fixture philosophy', description: 'From the API' }],
    work: [
      { name: 'Atlax Exchange', position: 'Full Stack Engineer', startDate: '2025-07', location: 'Remote', highlights: ['Built provider failover'], projectSlug: 'fixture-exchange' },
    ],
    education: [],
    skills: [],
    leadSkills: ['NestJS', 'Go'],
    version: 2,
  },
  caseStudies: [
    {
      id: 'fixture-exchange',
      name: 'Fixture Exchange',
      url: 'https://example.com',
      focus: ['Go'],
      context: 'Fixture context',
      role: 'Full Stack Engineer',
      architecture: 'Fixture architecture',
      decisions: ['Fixture decision'],
      challenges: 'Fixture challenges',
      outcome: 'Fixture outcome',
      lessons: 'Fixture lessons',
      version: 2,
    },
  ],
  oss: [
    {
      slug: 'nest-mailer',
      name: 'Nest Mailer',
      url: null,
      repoUrl: 'https://github.com/acme/nest-mailer',
      role: 'MAINTAINER',
      summary: 'A mail module for NestJS',
      myImpact: 'Streaming attachments',
      stack: ['TypeScript'],
      highlights: [],
      githubStats: { stars: 321, language: 'TypeScript' },
      contributions: [{ kind: 'pr', title: 'Stream attachments', url: 'https://github.com/acme/nest-mailer/pull/7', mergedAt: '2026-09-01T00:00:00Z', summary: null }],
    },
  ],
  noteDetail: {
    ...note(1),
    title: 'Why "modular" wins & when it does not',
    bodyMarkdown: '## The context\n\nWe chose a **modular monolith**.\n\n<script>window.__pwned = true</script>\n\n[Read more](https://example.com)',
    seo: null,
    publications: [{ externalUrl: 'https://www.linkedin.com/feed/update/urn:li:1', publishedAt: null, channel: { key: 'linkedin', name: 'LinkedIn' } }],
  },
};

function send(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
    'cache-control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

http
  .createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (url.pathname === '/__mode' && req.method === 'POST') {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        down = Boolean(JSON.parse(raw || '{}').down);
        send(res, 200, { down });
      });
      return;
    }
    if (url.pathname === '/health') return send(res, 200, { status: 'ok' });
    if (down) return send(res, 503, { message: 'down' });

    if (url.pathname === '/api/profile') return send(res, 200, FIXTURES.profile);
    if (url.pathname === '/api/case-studies') return send(res, 200, FIXTURES.caseStudies);
    if (url.pathname === '/api/oss') return send(res, 200, FIXTURES.oss);
    if (url.pathname === '/api/notes') {
      const page = Number(url.searchParams.get('page') || 1);
      const pageSize = Number(url.searchParams.get('pageSize') || 10);
      const items = NOTES.slice((page - 1) * pageSize, page * pageSize);
      return send(res, 200, { items, total: NOTES.length, page, pageSize });
    }
    const m = /^\/api\/notes\/([^/]+)$/.exec(url.pathname);
    if (m) {
      if (m[1] === 'note-1') return send(res, 200, FIXTURES.noteDetail);
      const found = NOTES.find((n) => n.slug === m[1]);
      if (found) return send(res, 200, { ...found, bodyMarkdown: `Body of ${found.title}`, seo: null, publications: [] });
      return send(res, 404, { message: 'Not found' });
    }
    send(res, 404, { message: 'Not found' });
  })
  .listen(PORT, '127.0.0.1', () => console.log(`mock content API on ${PORT}`));
