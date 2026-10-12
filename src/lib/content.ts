import { BUILD_LOGS, CAPABILITIES, PHILOSOPHIES } from '../data/constants';
import type { NoteDetail, NoteSummary, Profile } from '../types/content';

export function slugify(input: string): string {
  return (
    input
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'untitled'
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2025-07" → "Jul 2025"; "2019" → "2019". */
export function formatMonth(value: string): string {
  const [year, month] = value.split('-');
  if (!month) return year;
  const m = MONTHS[Number(month) - 1];
  return m ? `${m} ${year}` : year;
}

export function formatRange(start: string, end?: string): string {
  return `${formatMonth(start)} – ${end ? formatMonth(end) : 'Present'}`;
}

/** "2026-01-03T09:00:00.000Z" → "2026-01-03". */
export function isoDate(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : '';
}

/** The static note, used when the API is down, shaped like the API's. */
export const FALLBACK_NOTES: NoteSummary[] = BUILD_LOGS.map((log) => ({
  slug: slugify(log.title),
  title: log.title,
  excerpt: log.excerpt.replace(/\s+/g, ' ').trim(),
  preview: log.content,
  tags: [],
  pillars: [],
  coverImageUrl: null,
  publishedAt: `${log.date}T09:00:00.000Z`,
  project: null,
}));

export function fallbackNote(slug: string): NoteDetail | null {
  const log = BUILD_LOGS.find((l) => slugify(l.title) === slug);
  if (!log) return null;
  const summary = FALLBACK_NOTES.find((n) => n.slug === slug)!;
  const { preview: _preview, ...rest } = summary;
  return {
    ...rest,
    bodyMarkdown: log.content,
    seo: null,
    publications: log.url.includes('linkedin.com')
      ? [{ externalUrl: log.url, publishedAt: null, channel: { key: 'linkedin', name: 'LinkedIn' } }]
      : [],
  };
}

/** Today's hand-written homepage copy, shaped like the API profile. */
export const FALLBACK_PROFILE: Profile = {
  basics: {
    name: 'Abdulazeez Yisau Temitope',
    label: 'Systems Engineer & Technical Founder',
    profiles: [
      { network: 'LinkedIn', url: 'https://www.linkedin.com/in/abdulazeez-yisau-tech-ceo/' },
      { network: 'GitHub', url: 'https://github.com/callmehalpha' },
    ],
  },
  positioning: {
    headline: 'Systems & Architecture',
    tagline: 'I build high-integrity systems where trust, scale, and real-world constraints matter.',
    intro:
      "I design and build backend systems where failure is expensive — spanning fintech, SaaS, commerce, and compliance. My focus is architectural clarity: authority-first design, transactional correctness, and software built to survive physical and regulatory constraints. I've engineered 8+ production platforms including digital asset exchanges, cashless institutional payments, and multi-tenant architectures.",
  },
  heroStats: [],
  capabilities: CAPABILITIES,
  philosophies: PHILOSOPHIES,
  work: [],
  education: [],
  skills: [],
  leadSkills: [],
};
