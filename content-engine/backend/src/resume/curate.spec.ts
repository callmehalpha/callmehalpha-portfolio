import { clamp, curateResume, formatDates, LIMITS, ResumeProfileInput } from './curate';
import { renderResumeHtml } from './template';

const job = (n: number, extra: Partial<NonNullable<ResumeProfileInput['work']>[number]> = {}) => ({
  name: `Company ${n}`,
  position: `Role ${n}`,
  startDate: `20${10 + n}-01`,
  endDate: n === 1 ? undefined : `20${11 + n}-01`,
  highlights: Array.from({ length: 6 }, (_, i) => `Highlight ${n}.${i}`),
  ...extra,
});

const profile: ResumeProfileInput = {
  basics: {
    name: 'Abdulazeez Yisau Temitope',
    label: 'Technical Product Builder',
    email: 'abdulazeezyisau@gmail.com',
    url: 'https://abdulazeez.usaiy.xyz',
    summary: 'Builds products.',
    location: { city: 'Ibadan', countryCode: 'NG' },
    profiles: [{ network: 'GitHub', url: 'https://github.com/callmehalpha' }],
  },
  positioning: { headline: 'h', tagline: 't', intro: 'Intro text.' },
  heroStats: [{ label: 'Active users on a platform I co-founded', value: '15,000+' }],
  work: [job(1, { projectSlug: 'atlax-exchange' }), job(2, { projectSlug: 'not-a-case-study' }), job(3), job(4), job(5), job(6), job(7), job(8)],
  education: [{ institution: 'Olabisi Onabanjo University', studyType: 'BSc', area: 'Computer Science', startDate: '2019', endDate: '2022' }],
  skills: [
    { name: 'Frontend', keywords: ['React'] },
    { name: 'Backend', keywords: ['NestJS', 'Go'] },
    { name: 'Mobile', keywords: ['React Native'] },
  ],
};

const caseStudies = [
  { id: 'atlax-exchange', name: 'Atlax Exchange', url: 'https://atlaxchange.com', context: 'An exchange. More text.', role: 'r', focus: [] },
  { id: 'circlify', name: 'Circlify', url: 'https://circlify.io', context: 'Rotational savings for diaspora groups. Second sentence.', role: 'r', focus: [] },
];

const oss = [{ slug: 'nest-mailer', name: 'Nest Mailer', repoUrl: 'https://github.com/acme/nest-mailer', role: 'MAINTAINER', myImpact: 'Streaming attachments.' }];

describe('resume curation', () => {
  const c = curateResume(profile, caseStudies, oss, 'default', 'https://abdulazeez.usaiy.xyz/');

  it('uses the profile label by default and job titles for the other variants', () => {
    expect(c.label).toBe('Technical Product Builder');
    expect(curateResume(profile, [], [], 'backend', 'https://x').label).toBe('Backend Engineer');
    expect(curateResume(profile, [], [], 'fullstack', 'https://x').label).toBe('Full Stack Engineer');
  });

  it('builds contact lines from public fields only', () => {
    expect(c.contact.map((x) => x.label)).toEqual(['Ibadan, NG', 'abdulazeezyisau@gmail.com', 'abdulazeez.usaiy.xyz', 'github.com/callmehalpha']);
  });

  it('keeps more bullets for recent roles and caps roles and total bullets', () => {
    expect(c.experience).toHaveLength(LIMITS.maxRoles);
    expect(c.experience.map((e) => e.bullets.length)).toEqual([4, 4, 3, 3, 3, 3, 0]);
    expect(c.experience.flatMap((e) => e.bullets).length).toBeLessThanOrEqual(LIMITS.maxBullets);
    expect(c.experience[0]).toMatchObject({ dates: 'Jan 2011 – Present', link: 'https://abdulazeez.usaiy.xyz/#atlax-exchange' });
    expect(c.experience[1].link).toBeUndefined(); // no case study for that project
  });

  it('lists case studies not already told through a role, linking back to the site', () => {
    expect(c.projects).toEqual([
      { name: 'Circlify', url: 'https://circlify.io', line: 'Rotational savings for diaspora groups.', link: 'https://abdulazeez.usaiy.xyz/#circlify' },
    ]);
  });

  it('formats open source, highlights, education and leads skills per variant', () => {
    expect(c.openSource).toEqual([{ name: 'Nest Mailer (Maintainer)', url: 'https://github.com/acme/nest-mailer', line: 'Streaming attachments.' }]);
    expect(c.highlights).toEqual(['15,000+ active users on a platform I co-founded']);
    expect(c.education).toEqual([{ line: 'BSc Computer Science, Olabisi Onabanjo University', dates: '2019 – 2022' }]);
    expect(curateResume(profile, [], [], 'backend', 'x').skills.map((s) => s.group)).toEqual(['Backend', 'Frontend', 'Mobile']);
    expect(curateResume(profile, [], [], 'fullstack', 'x').skills.map((s) => s.group)).toEqual(['Backend', 'Frontend', 'Mobile']);
    expect(c.skills.map((s) => s.group)).toEqual(['Frontend', 'Backend', 'Mobile']); // profile order by default
  });

  it('falls back to the positioning intro without a summary', () => {
    expect(curateResume({ ...profile, basics: { ...profile.basics, summary: undefined } }, [], [], 'default', 'x').summary).toBe('Intro text.');
  });

  it('formats dates and clamps long text at a word boundary', () => {
    expect(formatDates('2020-04', '2024-02')).toBe('Apr 2020 – Feb 2024');
    expect(formatDates('2019')).toBe('2019 – Present');
    const long = clamp('word '.repeat(100), 40);
    expect(long.length).toBeLessThanOrEqual(41);
    expect(long.endsWith('…')).toBe(true);
  });
});

describe('resume template', () => {
  const html = renderResumeHtml(curateResume(profile, caseStudies, oss, 'default', 'https://abdulazeez.usaiy.xyz'));

  it('is one column of real text with standard section names and no tables', () => {
    for (const h of ['Summary', 'Experience', 'Selected Projects', 'Open Source', 'Skills', 'Education']) expect(html).toContain(`<h2>${h}</h2>`);
    expect(html).not.toMatch(/<table|<img|<script/i);
    expect(html).toContain('@page { size: A4;');
  });

  it('escapes everything and drops unsafe links', () => {
    const evil = renderResumeHtml({
      ...curateResume(profile, [], [], 'default', 'x'),
      name: '<script>alert(1)</script>',
      contact: [{ label: 'x', url: 'javascript:alert(1)' }],
    });
    expect(evil).not.toContain('<script>alert(1)</script>');
    expect(evil).not.toContain('javascript:');
  });

  it('omits empty sections', () => {
    const bare = renderResumeHtml({ ...curateResume(profile, [], [], 'default', 'x'), projects: [], openSource: [] });
    expect(bare).not.toContain('<h2>Open Source</h2>');
    expect(bare).not.toContain('<h2>Selected Projects</h2>');
  });
});
