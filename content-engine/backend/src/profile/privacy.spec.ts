import { applyPrivacy } from './privacy';

const profile = {
  basics: {
    name: 'Abdulazeez Yisau Temitope',
    email: 'me@example.com',
    phone: '000',
    location: { city: 'Ibadan', countryCode: 'NG', address: '1 Street', postalCode: '200001' },
  },
  work: [
    { name: 'Atlax', phone: '111' },
    { name: 'Virtuo', phone: '222' },
  ],
};

describe('applyPrivacy', () => {
  it('hides phone and street address by default', () => {
    const out = applyPrivacy(profile);
    expect(out.basics).not.toHaveProperty('phone');
    expect(out.basics.location).toEqual({ city: 'Ibadan', countryCode: 'NG' });
    expect(out.basics.email).toBe('me@example.com');
  });

  it('lets the map make a default-private field public', () => {
    expect(applyPrivacy(profile, { 'basics.phone': 'public' }).basics.phone).toBe('000');
  });

  it('hides fields the map marks private, through arrays', () => {
    const out = applyPrivacy(profile, { 'basics.email': 'private', 'work.phone': 'private' });
    expect(out.basics).not.toHaveProperty('email');
    expect(out.work).toEqual([{ name: 'Atlax' }, { name: 'Virtuo' }]);
  });

  it('ignores paths that do not exist and never mutates the input', () => {
    const out = applyPrivacy(profile, { 'nope.deep.path': 'private' });
    expect(out).toEqual(applyPrivacy(profile));
    expect(profile.basics.phone).toBe('000');
  });
});
