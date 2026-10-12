import { z } from 'zod';

/** JSON Resume (https://jsonresume.org/schema) basics, plus the fields the portfolio needs. */
const link = z.object({ network: z.string(), username: z.string().optional(), url: z.string().url() });

export const profileData = z.object({
  basics: z.object({
    name: z.string().min(1),
    label: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    url: z.string().url().optional(),
    summary: z.string().optional(),
    location: z
      .object({
        address: z.string().optional(),
        postalCode: z.string().optional(),
        city: z.string().optional(),
        countryCode: z.string().optional(),
        region: z.string().optional(),
      })
      .optional(),
    profiles: z.array(link).default([]),
  }),
  positioning: z.object({
    headline: z.string().min(1),
    tagline: z.string().min(1),
    intro: z.string().min(1),
  }),
  heroStats: z
    .array(
      z.object({
        label: z.string(),
        value: z.string(),
        evidence: z.string().min(1),
        /** Computed when served instead of typed in, so it can't go stale. */
        derive: z.enum(['case_study_count']).optional(),
      }),
    )
    .default([]),
  capabilities: z.array(z.object({ title: z.string(), description: z.string(), items: z.array(z.string()) })).default([]),
  philosophies: z.array(z.object({ title: z.string(), description: z.string() })).default([]),
  work: z
    .array(
      z.object({
        name: z.string(),
        position: z.string(),
        url: z.string().url().optional(),
        location: z.string().optional(),
        startDate: z.string(),
        endDate: z.string().optional(),
        summary: z.string().optional(),
        highlights: z.array(z.string()).default([]),
        projectSlug: z.string().optional(),
      }),
    )
    .default([]),
  education: z
    .array(
      z.object({
        institution: z.string(),
        area: z.string().optional(),
        studyType: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
    )
    .default([]),
  skills: z.array(z.object({ name: z.string(), keywords: z.array(z.string()).default([]) })).default([]),
  leadSkills: z.array(z.string()).default([]),
  certificates: z.array(z.object({ name: z.string(), issuer: z.string().optional(), date: z.string().optional() })).default([]),
  awards: z.array(z.object({ title: z.string(), awarder: z.string().optional(), date: z.string().optional() })).default([]),
  languages: z.array(z.object({ language: z.string(), fluency: z.string().optional() })).default([]),
});
export type ProfileData = z.infer<typeof profileData>;

export const privacyMap = z.record(z.enum(['public', 'private'])).default({});

export const profileRevisionInput = z.object({
  data: profileData,
  privacy: privacyMap,
  changelog: z.string().min(1),
  sourceIds: z.array(z.string()).default([]),
  llmMeta: z.record(z.unknown()).optional(),
});
export type ProfileRevisionInput = z.infer<typeof profileRevisionInput>;
