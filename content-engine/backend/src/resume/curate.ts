import { RESUME_VARIANTS, ResumeVariant } from './variants';

/** The subset of the public profile the resume uses (private fields are already removed). */
export interface ResumeProfileInput {
  basics: {
    name: string;
    label: string;
    email?: string;
    url?: string;
    summary?: string;
    location?: { city?: string; countryCode?: string; region?: string };
    profiles?: { network: string; username?: string; url: string }[];
  };
  positioning: { headline: string; tagline: string; intro: string };
  heroStats?: { label: string; value: string }[];
  work?: {
    name: string;
    position: string;
    url?: string;
    location?: string;
    startDate: string;
    endDate?: string;
    summary?: string;
    highlights?: string[];
    projectSlug?: string;
  }[];
  education?: { institution: string; area?: string; studyType?: string; startDate?: string; endDate?: string }[];
  skills?: { name: string; keywords: string[] }[];
}

export interface ResumeCaseStudyInput {
  id: string;
  name: string;
  url: string;
  context: string;
  role: string;
  focus: string[];
}

export interface ResumeOssInput {
  slug: string;
  name: string;
  repoUrl: string | null;
  role: string;
  myImpact: string;
}

export interface ResumeContent {
  variant: ResumeVariant;
  name: string;
  label: string;
  contact: { label: string; url?: string }[];
  summary: string;
  highlights: string[];
  experience: { position: string; company: string; dates: string; location?: string; summary?: string; bullets: string[]; link?: string }[];
  projects: { name: string; url?: string; line: string; link: string }[];
  openSource: { name: string; url?: string; line: string }[];
  skills: { group: string; items: string[] }[];
  education: { line: string; dates?: string }[];
}

/** Limits that keep the default template to two A4 pages. */
export const LIMITS = {
  recentRoles: 2,
  bulletsRecent: 4,
  bulletsOlder: 3,
  maxRoles: 7,
  maxBullets: 20,
  projects: 4,
  openSource: 3,
  highlights: 4,
  skillGroups: 6,
  skillsPerGroup: 8,
  bulletChars: 260,
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatMonth(value: string): string {
  const [year, month] = value.split('-');
  const m = month ? MONTHS[Number(month) - 1] : undefined;
  return m ? `${m} ${year}` : year;
}

export function formatDates(start: string, end?: string): string {
  return `${formatMonth(start)} – ${end ? formatMonth(end) : 'Present'}`;
}

/** Trims to a word boundary so a long bullet can't push the resume onto a third page. */
export function clamp(text: string, max = LIMITS.bulletChars): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s.,;:–-]+$/, '')}…`;
}

function firstSentence(text: string): string {
  const m = /^(.+?[.!?])(\s|$)/.exec(text.trim());
  return clamp(m ? m[1] : text, 200);
}

/**
 * Deterministic curation: everything comes from approved, public data, ordered and trimmed
 * to fit. Nothing is invented: every line is a field or a clamp of a field.
 */
export function curateResume(
  profile: ResumeProfileInput,
  caseStudies: ResumeCaseStudyInput[],
  oss: ResumeOssInput[],
  variant: ResumeVariant,
  siteUrl: string,
): ResumeContent {
  const v = RESUME_VARIANTS[variant];
  const site = siteUrl.replace(/\/+$/, '');
  const caseStudyIds = new Set(caseStudies.map((c) => c.id));

  const contact: ResumeContent['contact'] = [];
  const loc = [profile.basics.location?.city, profile.basics.location?.countryCode].filter(Boolean).join(', ');
  if (loc) contact.push({ label: loc });
  if (profile.basics.email) contact.push({ label: profile.basics.email, url: `mailto:${profile.basics.email}` });
  if (profile.basics.url) contact.push({ label: profile.basics.url.replace(/^https?:\/\//, ''), url: profile.basics.url });
  for (const p of profile.basics.profiles ?? []) contact.push({ label: p.url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''), url: p.url });

  let bulletBudget = LIMITS.maxBullets;
  const experience = (profile.work ?? []).slice(0, LIMITS.maxRoles).map((job, i) => {
    const max = Math.min(i < LIMITS.recentRoles ? LIMITS.bulletsRecent : LIMITS.bulletsOlder, bulletBudget);
    const bullets = (job.highlights ?? []).slice(0, Math.max(max, 0)).map((h) => clamp(h));
    bulletBudget -= bullets.length;
    return {
      position: job.position,
      company: job.name,
      dates: formatDates(job.startDate, job.endDate),
      location: job.location,
      summary: job.summary ? clamp(job.summary, 180) : undefined,
      bullets,
      link: job.projectSlug && caseStudyIds.has(job.projectSlug) ? `${site}/#${job.projectSlug}` : undefined,
    };
  });

  // Case studies not already told through a role become "selected projects".
  const coveredByWork = new Set((profile.work ?? []).map((w) => w.projectSlug).filter(Boolean));
  const projects = caseStudies
    .filter((c) => !coveredByWork.has(c.id))
    .slice(0, LIMITS.projects)
    .map((c) => ({ name: c.name, url: c.url || undefined, line: firstSentence(c.context), link: `${site}/#${c.id}` }));

  const openSource = oss.slice(0, LIMITS.openSource).map((o) => ({
    name: `${o.name} (${o.role.charAt(0)}${o.role.slice(1).toLowerCase()})`,
    url: o.repoUrl ?? undefined,
    line: clamp(o.myImpact, 200),
  }));

  const groups = [...(profile.skills ?? [])].sort((a, b) => {
    const rank = (g: string) => {
      const i = (v.leadSkillGroups as readonly string[]).indexOf(g);
      return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    };
    return rank(a.name) - rank(b.name);
  });

  return {
    variant,
    name: profile.basics.name,
    label: v.label ?? profile.basics.label,
    contact,
    summary: clamp(profile.basics.summary ?? profile.positioning.intro, 700),
    highlights: (profile.heroStats ?? []).slice(0, LIMITS.highlights).map((s) => `${s.value} ${s.label.charAt(0).toLowerCase()}${s.label.slice(1)}`),
    experience,
    projects,
    openSource,
    skills: groups.slice(0, LIMITS.skillGroups).map((g) => ({ group: g.name, items: g.keywords.slice(0, LIMITS.skillsPerGroup) })),
    education: (profile.education ?? []).map((e) => ({
      line: [e.studyType, e.area].filter(Boolean).join(' ') + (e.institution ? `, ${e.institution}` : ''),
      dates: e.startDate || e.endDate ? [e.startDate, e.endDate].filter(Boolean).join(' – ') : undefined,
    })),
  };
}
