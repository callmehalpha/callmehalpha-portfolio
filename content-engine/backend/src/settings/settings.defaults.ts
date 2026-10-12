import { z } from 'zod';

/** Runtime toggles. Every key is declared here with its type and default; unknown keys are rejected. */
export const SETTINGS = {
  'approval.required.note': { schema: z.boolean(), default: true },
  'approval.required.case_study': { schema: z.boolean(), default: true },
  'approval.required.oss': { schema: z.boolean(), default: true },
  'approval.required.profile': { schema: z.boolean(), default: true },
  'approval.required.resume': { schema: z.boolean(), default: true },
  'approval.required.social': { schema: z.boolean(), default: false },
  'caseStudy.announce': { schema: z.boolean(), default: false },
  'resume.debounceMinutes': { schema: z.number().int().min(0).max(1440), default: 10 },
} as const;

export type SettingKey = keyof typeof SETTINGS;
export type SettingValues = { [K in SettingKey]: z.infer<(typeof SETTINGS)[K]['schema']> };

export function isSettingKey(key: string): key is SettingKey {
  return Object.prototype.hasOwnProperty.call(SETTINGS, key);
}

export function defaultSettings(): SettingValues {
  return Object.fromEntries(Object.entries(SETTINGS).map(([k, v]) => [k, v.default])) as SettingValues;
}

/** Overlays stored rows on the defaults, ignoring rows that are unknown or no longer valid. */
export function resolveSettings(rows: { key: string; value: unknown }[]): SettingValues {
  const out: Record<string, unknown> = { ...defaultSettings() };
  for (const row of rows) {
    if (!isSettingKey(row.key)) continue;
    const parsed = SETTINGS[row.key].schema.safeParse(row.value);
    if (parsed.success) out[row.key] = parsed.data;
  }
  return out as SettingValues;
}
