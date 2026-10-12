import { Prisma, PrismaClient, ProjectKind } from '@prisma/client';
import { readFileSync } from 'fs';
import { join, resolve } from 'path';
import { slugify } from '../common/slug';
import { ProfileData, profileData } from '../profile/profile.schema';

export const DEFAULT_SEED_DIR = resolve(__dirname, '../../../seed/data');

interface SeedCaseStudy {
  id: string;
  name: string;
  url: string;
  focus: string[];
  context: string;
  role: string;
  architecture: string;
  decisions: string[];
  challenges: string;
  outcome: string;
  lessons: string;
}

interface SeedNote {
  title: string;
  date: string;
  excerpt: string;
  content: string;
  url: string;
}

/** How each existing case study's project is classified. Editable later via the admin API. */
const PROJECT_KINDS: Record<string, ProjectKind> = {
  'atlax-exchange': 'CLIENT',
  virtuo: 'PRODUCT',
  frootify: 'CLIENT',
  circlify: 'PRODUCT',
  nogic: 'CLIENT',
};

const CHANNELS = [
  { key: 'linkedin', name: 'LinkedIn', workflow: 'publish.linkedin', config: { maxLength: 3000, linkPlacement: 'post', hashtags: { min: 0, max: 5 } } },
  { key: 'x', name: 'X', workflow: 'publish.x', config: { maxLength: 280, linkPlacement: 'reply', hashtags: { min: 0, max: 2 } } },
  {
    key: 'instagram',
    name: 'Instagram',
    workflow: 'publish.instagram',
    config: { maxLength: 2200, requiresMedia: true, mediaKind: 'image', linkPlacement: 'bio', hashtags: { min: 3, max: 10 } },
  },
];

function readJson<T>(dir: string, file: string): T {
  return JSON.parse(readFileSync(join(dir, file), 'utf8')) as T;
}

/** The current hero copy, capabilities and philosophies, so the site looks the same until a CV-based profile is approved. */
export function initialProfile(dir: string): ProfileData {
  return profileData.parse({
    basics: {
      name: 'Abdulazeez Yisau Temitope',
      label: 'Systems Engineer & Technical Founder',
      email: 'i.am.abdulazeez.yisau@gmail.com',
      url: 'https://abdulazeez.usaiy.xyz',
      location: { city: 'Ibadan', countryCode: 'NG' },
      profiles: [
        { network: 'LinkedIn', username: 'abdulazeez-yisau-tech-ceo', url: 'https://www.linkedin.com/in/abdulazeez-yisau-tech-ceo/' },
        { network: 'GitHub', username: 'callmehalpha', url: 'https://github.com/callmehalpha' },
      ],
    },
    positioning: {
      headline: 'Systems & Architecture',
      tagline: 'I build high-integrity systems where trust, scale, and real-world constraints matter.',
      intro:
        "I design and build backend systems where failure is expensive — spanning fintech, SaaS, commerce, and compliance. My focus is architectural clarity: authority-first design, transactional correctness, and software built to survive physical and regulatory constraints. I've engineered 8+ production platforms including digital asset exchanges, cashless institutional payments, and multi-tenant architectures.",
    },
    heroStats: [{ label: 'Production platforms', value: '8+', evidence: 'Live production portfolio listed in the CV and on the portfolio' }],
    capabilities: readJson(dir, 'capabilities.json'),
    philosophies: readJson(dir, 'philosophies.json'),
  });
}

export interface SeedOptions {
  dir?: string;
  notifyEmailTo?: string;
}

/** Idempotent: safe to run on every deploy. Existing rows are left alone. */
export async function seed(prisma: PrismaClient, opts: SeedOptions = {}) {
  const dir = opts.dir ?? DEFAULT_SEED_DIR;
  const caseStudies = readJson<SeedCaseStudy[]>(dir, 'case-studies.json');
  const notes = readJson<SeedNote[]>(dir, 'notes.json');

  for (const [i, cs] of caseStudies.entries()) {
    const project = await prisma.project.upsert({
      where: { slug: cs.id },
      create: { slug: cs.id, name: cs.name, url: cs.url, kind: PROJECT_KINDS[cs.id] ?? 'CLIENT', sortOrder: i },
      update: {},
    });
    const caseStudy = await prisma.caseStudy.upsert({ where: { projectId: project.id }, create: { projectId: project.id }, update: {} });
    if (!caseStudy.currentRevisionId) {
      const rev = await prisma.caseStudyRevision.create({
        data: {
          caseStudyId: caseStudy.id,
          version: 1,
          focus: cs.focus,
          context: cs.context,
          role: cs.role,
          architecture: cs.architecture,
          decisions: cs.decisions,
          challenges: cs.challenges,
          outcome: cs.outcome,
          lessons: cs.lessons,
          changelog: 'Imported from the portfolio',
          sourceIds: [],
          status: 'PUBLISHED',
        },
      });
      await prisma.caseStudy.update({ where: { id: caseStudy.id }, data: { currentRevisionId: rev.id } });
    }
  }

  for (const ch of CHANNELS) {
    await prisma.channel.upsert({
      where: { key: ch.key },
      create: { ...ch, enabled: false, config: ch.config as Prisma.InputJsonValue },
      update: {},
    });
  }

  await prisma.notifier.upsert({
    where: { key: 'email' },
    create: {
      key: 'email',
      name: 'Email',
      workflow: 'notify.email',
      enabled: Boolean(opts.notifyEmailTo),
      config: { to: opts.notifyEmailTo ?? null, events: ['approval', 'failure', 'published', 'token_expiry'] },
    },
    update: {},
  });

  const linkedin = await prisma.channel.findUniqueOrThrow({ where: { key: 'linkedin' } });
  for (const n of notes) {
    const slug = slugify(n.title);
    const note = await prisma.note.upsert({
      where: { slug },
      create: {
        slug,
        title: n.title,
        excerpt: n.excerpt.replace(/\s+/g, ' ').trim(),
        bodyMarkdown: n.content,
        tags: ['architecture'],
        pillars: ['Engineering'],
        status: 'PUBLISHED',
        publishedAt: new Date(`${n.date}T09:00:00Z`),
      },
      update: {},
    });
    if (n.url.includes('linkedin.com')) {
      await prisma.publication.upsert({
        where: { noteId_channelId: { noteId: note.id, channelId: linkedin.id } },
        create: {
          noteId: note.id,
          channelId: linkedin.id,
          content: n.excerpt,
          status: 'PUBLISHED',
          externalUrl: n.url,
          publishedAt: new Date(`${n.date}T09:00:00Z`),
          attempts: 1,
        },
        update: {},
      });
    }
  }

  const profile = await prisma.profile.upsert({ where: { id: 'me' }, create: { id: 'me' }, update: {} });
  if (!profile.currentRevisionId) {
    const rev = await prisma.profileRevision.create({
      data: {
        profileId: 'me',
        version: 1,
        data: initialProfile(dir) as unknown as Prisma.InputJsonValue,
        privacy: {},
        changelog: 'Imported from the current portfolio copy',
        sourceIds: [],
        status: 'PUBLISHED',
      },
    });
    await prisma.profile.update({ where: { id: 'me' }, data: { currentRevisionId: rev.id } });
  }

  // The CV-based profile goes in as a draft: it changes the positioning, so it waits for my approval.
  const cvChangelog = 'Profile from the three CVs, reconciled (see seed/profile-v1-review.md)';
  if (!(await prisma.profileRevision.findFirst({ where: { profileId: 'me', changelog: cvChangelog } }))) {
    const latest = await prisma.profileRevision.findFirstOrThrow({ where: { profileId: 'me' }, orderBy: { version: 'desc' } });
    await prisma.profileRevision.create({
      data: {
        profileId: 'me',
        version: latest.version + 1,
        data: cvProfile(dir) as unknown as Prisma.InputJsonValue,
        privacy: {},
        changelog: cvChangelog,
        sourceIds: [],
        status: 'DRAFT',
      },
    });
  }
}

/** The reconciled CV profile, keeping today's capability cards and philosophies. */
export function cvProfile(dir: string): ProfileData {
  return profileData.parse({
    ...readJson<Record<string, unknown>>(dir, 'profile-cv.json'),
    capabilities: readJson(dir, 'capabilities.json'),
    philosophies: readJson(dir, 'philosophies.json'),
  });
}
