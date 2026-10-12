import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { BuildLogEntry } from '../../src/components/BuildLogEntry';
import { ExperienceTimeline } from '../../src/components/ExperienceTimeline';
import { Markdown } from '../../src/components/Markdown';
import { OssProjectCard } from '../../src/components/OssProjectCard';
import type { OssProject, WorkEntry } from '../../src/types/content';

const oss: OssProject = {
  slug: 'nest-mailer',
  name: 'Nest Mailer',
  url: null,
  repoUrl: 'https://github.com/acme/nest-mailer',
  role: 'CONTRIBUTOR',
  summary: 'A mail module for NestJS',
  myImpact: 'Added streaming attachments',
  stack: ['TypeScript'],
  highlights: [],
  githubStats: { stars: 120, language: 'TypeScript' },
  contributions: [{ kind: 'pr', title: 'Stream attachments', url: 'https://github.com/acme/nest-mailer/pull/7', mergedAt: '2026-09-01T00:00:00Z', summary: null }],
};

describe('OssProjectCard', () => {
  it('shows role, stars, impact and contributions that open in a new tab', () => {
    render(<OssProjectCard project={oss} />);
    expect(screen.getByText('Contributor')).toBeInTheDocument();
    expect(screen.getByLabelText('120 stars')).toBeInTheDocument();
    expect(screen.getByText('Added streaming attachments')).toBeInTheDocument();
    const pr = within(screen.getByRole('list', { name: 'Recent contributions' })).getByRole('link');
    expect(pr).toHaveAttribute('href', 'https://github.com/acme/nest-mailer/pull/7');
    expect(pr).toHaveAttribute('rel', 'noopener noreferrer');
    expect(screen.getByRole('link', { name: /Repository/ })).toHaveAttribute('href', oss.repoUrl);
    expect(screen.queryByRole('link', { name: /Website/ })).toBeNull();
  });

  it('hides stats and contributions it does not have', () => {
    render(<OssProjectCard project={{ ...oss, githubStats: null, contributions: [] }} />);
    expect(screen.queryByLabelText(/stars/)).toBeNull();
    expect(screen.queryByRole('list', { name: 'Recent contributions' })).toBeNull();
  });
});

describe('ExperienceTimeline', () => {
  const work: WorkEntry[] = [
    { name: 'Atlax Exchange', position: 'Full Stack Engineer', startDate: '2025-07', location: 'Remote', highlights: ['Built failover'], projectSlug: 'atlax-exchange' },
    { name: 'Vascon Solutions', position: 'Full Stack Engineer', startDate: '2020-04', endDate: '2024-02', highlights: ['Led phase one'], projectSlug: 'no-case-study' },
  ];

  it('shows each role with its dates, and links to case studies that exist', () => {
    render(<ExperienceTimeline work={work} caseStudyIds={['atlax-exchange']} />);
    expect(screen.getByText('Jul 2025 – Present · Remote')).toBeInTheDocument();
    expect(screen.getByText('Apr 2020 – Feb 2024')).toBeInTheDocument();
    const links = screen.getAllByRole('link', { name: /case study/ });
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '#atlax-exchange');
  });
});

describe('Markdown', () => {
  it('renders markdown and GFM tables', () => {
    const { container } = render(<Markdown>{'## Title\n\n| a | b |\n|---|---|\n| 1 | 2 |'}</Markdown>);
    expect(screen.getByRole('heading', { level: 2, name: 'Title' })).toBeInTheDocument();
    expect(container.querySelector('table')).not.toBeNull();
  });

  it('never renders raw HTML or script from note bodies', () => {
    const { container } = render(<Markdown>{'Hi <script>window.pwned=1</script><img src=x onerror="alert(1)"> **there**'}</Markdown>);
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
    expect(container.innerHTML).not.toContain('onerror');
    expect(screen.getByText('there').tagName).toBe('STRONG');
  });

  it('drops javascript: links and opens external links safely', () => {
    render(<Markdown>{'[bad](javascript:alert(1)) [good](https://example.com) [local](/notes)'}</Markdown>);
    expect(screen.getByText('bad').closest('a')?.getAttribute('href') ?? '').not.toMatch(/javascript/);
    expect(screen.getByRole('link', { name: 'good' })).toHaveAttribute('target', '_blank');
    expect(screen.getByRole('link', { name: 'local' })).not.toHaveAttribute('target');
  });
});

describe('BuildLogEntry', () => {
  it('links to the note page on the site, not to LinkedIn', () => {
    render(
      <MemoryRouter>
        <BuildLogEntry
          note={{ slug: 'my-note', title: 'My note', excerpt: 'e', preview: 'p', tags: [], pillars: [], coverImageUrl: null, publishedAt: '2026-01-03T09:00:00Z', project: null }}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('link', { name: /Read Full Note/ })).toHaveAttribute('href', '/notes/my-note');
    expect(screen.getByText('2026-01-03')).toBeInTheDocument();
  });
});
