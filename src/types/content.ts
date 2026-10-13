/** Shapes served by the content engine's public API (content-engine/backend). */

export interface NoteSummary {
  slug: string;
  title: string;
  excerpt: string;
  preview: string;
  tags: string[];
  pillars: string[];
  coverImageUrl: string | null;
  publishedAt: string;
  project: { slug: string; name: string } | null;
}

export interface NoteList {
  items: NoteSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface NotePublication {
  externalUrl: string | null;
  publishedAt: string | null;
  channel: { key: string; name: string };
}

export interface NoteDetail extends Omit<NoteSummary, 'preview'> {
  bodyMarkdown: string;
  seo: { title?: string; description?: string; image?: string } | null;
  publications: NotePublication[];
}

export interface OssContribution {
  kind: string;
  title: string;
  url: string;
  mergedAt: string | null;
  summary: string | null;
}

export interface OssProject {
  slug: string;
  name: string;
  url: string | null;
  repoUrl: string | null;
  role: 'AUTHOR' | 'MAINTAINER' | 'CONTRIBUTOR';
  summary: string;
  myImpact: string;
  stack: string[];
  highlights: string[];
  githubStats: { stars?: number; forks?: number; language?: string | null } | null;
  contributions: OssContribution[];
}

export interface ResumeDownload {
  variant: 'default' | 'backend' | 'fullstack';
  publishedAt: string;
  pages: number | null;
  url: string;
}

export interface WorkEntry {
  name: string;
  position: string;
  url?: string;
  location?: string;
  startDate: string;
  endDate?: string;
  summary?: string;
  highlights: string[];
  projectSlug?: string;
}

export interface Profile {
  basics: {
    name: string;
    label: string;
    email?: string;
    url?: string;
    summary?: string;
    location?: { city?: string; countryCode?: string; region?: string };
    profiles: { network: string; username?: string; url: string }[];
  };
  positioning: { headline: string; tagline: string; intro: string };
  heroStats: { label: string; value: string; evidence: string }[];
  capabilities: { title: string; description: string; items: string[] }[];
  philosophies: { title: string; description: string }[];
  work: WorkEntry[];
  education: { institution: string; area?: string; studyType?: string; startDate?: string; endDate?: string }[];
  skills: { name: string; keywords: string[] }[];
  leadSkills: string[];
  version?: number;
}
