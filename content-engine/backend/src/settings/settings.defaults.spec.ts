import { defaultSettings, isSettingKey, resolveSettings } from './settings.defaults';

describe('settings defaults', () => {
  it('requires approval for every content type by default, but not for social copy', () => {
    const d = defaultSettings();
    expect(d['approval.required.note']).toBe(true);
    expect(d['approval.required.case_study']).toBe(true);
    expect(d['approval.required.oss']).toBe(true);
    expect(d['approval.required.profile']).toBe(true);
    expect(d['approval.required.resume']).toBe(true);
    expect(d['approval.required.social']).toBe(false);
    expect(d['caseStudy.announce']).toBe(false);
  });

  it('overlays stored values on the defaults', () => {
    const s = resolveSettings([{ key: 'approval.required.note', value: false }]);
    expect(s['approval.required.note']).toBe(false);
    expect(s['approval.required.oss']).toBe(true);
  });

  it('ignores unknown keys and values of the wrong type', () => {
    const s = resolveSettings([
      { key: 'nope', value: 1 },
      { key: 'approval.required.oss', value: 'false' },
      { key: 'resume.debounceMinutes', value: -5 },
    ]);
    expect(s).not.toHaveProperty('nope');
    expect(s['approval.required.oss']).toBe(true);
    expect(s['resume.debounceMinutes']).toBe(10);
  });

  it('recognises declared keys only', () => {
    expect(isSettingKey('approval.required.note')).toBe(true);
    expect(isSettingKey('toString')).toBe(false);
  });
});
