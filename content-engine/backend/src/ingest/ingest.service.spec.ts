import { personaKindFor } from './ingest.service';

describe('personaKindFor', () => {
  it.each([
    ['personality.md', 'PERSONALITY'],
    ['Personality-v2.md', 'PERSONALITY'],
    ['branding-plan.md', 'BRANDING'],
    ['/data/persona/branding.md', 'BRANDING'],
  ])('maps %s to %s', (file, kind) => {
    expect(personaKindFor(file)).toBe(kind);
  });

  it.each(['README.md', 'branding-plan.txt', 'notes.md', 'personality'])('ignores %s', (file) => {
    expect(personaKindFor(file)).toBeNull();
  });
});
