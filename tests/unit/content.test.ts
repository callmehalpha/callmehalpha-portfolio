import { describe, expect, it } from 'vitest';
import { FALLBACK_NOTES, FALLBACK_PROFILE, fallbackNote, formatMonth, formatRange, isoDate, slugify } from '../../src/lib/content';
import { CAPABILITIES, CASE_STUDIES, PHILOSOPHIES } from '../../src/data/constants';

describe('content helpers', () => {
  it('formats months and ranges', () => {
    expect(formatMonth('2025-07')).toBe('Jul 2025');
    expect(formatMonth('2019')).toBe('2019');
    expect(formatRange('2025-07')).toBe('Jul 2025 – Present');
    expect(formatRange('2020-04', '2024-02')).toBe('Apr 2020 – Feb 2024');
  });

  it('cuts ISO timestamps to dates', () => {
    expect(isoDate('2026-01-03T09:00:00.000Z')).toBe('2026-01-03');
    expect(isoDate(null)).toBe('');
  });

  it('slugifies like the backend', () => {
    expect(slugify('The Case for Modular Monoliths')).toBe('the-case-for-modular-monoliths');
    expect(slugify('MÍRÀ Africa!')).toBe('mira-africa');
  });

  it('shapes the static note like the API, with the same slug the seed uses', () => {
    expect(FALLBACK_NOTES[0]).toMatchObject({ slug: 'the-case-for-modular-monoliths', publishedAt: '2025-10-10T09:00:00.000Z' });
    expect(FALLBACK_NOTES[0].excerpt).toContain('building Virtuo');
  });

  it('serves the static note body and its LinkedIn link when the API is down', () => {
    const note = fallbackNote('the-case-for-modular-monoliths')!;
    expect(note.bodyMarkdown).toMatch(/^Early in Virtuo/);
    expect(note.publications[0]).toMatchObject({ channel: { key: 'linkedin' } });
    expect(fallbackNote('unknown')).toBeNull();
  });

  it('keeps the current homepage copy as the fallback profile', () => {
    expect(FALLBACK_PROFILE.positioning.tagline).toBe('I build high-integrity systems where trust, scale, and real-world constraints matter.');
    expect(FALLBACK_PROFILE.capabilities).toBe(CAPABILITIES);
    expect(FALLBACK_PROFILE.philosophies).toBe(PHILOSOPHIES);
    expect(FALLBACK_PROFILE.work).toEqual([]);
    expect(FALLBACK_PROFILE.heroStats).toEqual([{ label: 'Production platforms', value: String(CASE_STUDIES.length), evidence: 'Case studies live on the portfolio' }]);
  });
});
