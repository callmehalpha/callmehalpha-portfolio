/** Resume variants. `default` is the brand positioning; the others keep job titles for applications. */
export const RESUME_VARIANTS = {
  default: {
    label: null as string | null, // the profile's own label (Technical Product Builder)
    fileSuffix: '',
    leadSkillGroups: [] as string[],
  },
  backend: {
    label: 'Backend Engineer',
    fileSuffix: '-Backend',
    leadSkillGroups: ['Backend', 'Payments and fintech', 'Platform'],
  },
  fullstack: {
    label: 'Full Stack Engineer',
    fileSuffix: '-FullStack',
    leadSkillGroups: ['Backend', 'Frontend', 'Mobile'],
  },
} as const;

export type ResumeVariant = keyof typeof RESUME_VARIANTS;
export const VARIANT_NAMES = Object.keys(RESUME_VARIANTS) as ResumeVariant[];

export function isVariant(v: unknown): v is ResumeVariant {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(RESUME_VARIANTS, v);
}

/** Bump when the template or curation rules change, so every variant rebuilds once. */
export const RESUME_TEMPLATE_VERSION = 1;
