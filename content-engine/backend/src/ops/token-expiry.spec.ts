import { dueReminder, parseExpiry, reminderSubject } from './token-expiry';

const expires = new Date('2026-12-01T12:00:00.000Z');
const daysBefore = (d: number) => new Date(expires.getTime() - d * 86_400_000);

describe('token expiry reminders', () => {
  it('is quiet until 7 days before expiry', () => {
    expect(dueReminder(expires, daysBefore(8))).toBeNull();
    expect(dueReminder(expires, daysBefore(7.01))).toBeNull();
  });

  it('sends the 7-day, 1-day and expired reminders as each is reached', () => {
    expect(dueReminder(expires, daysBefore(7))).toBe(7);
    expect(dueReminder(expires, daysBefore(3))).toBe(7);
    expect(dueReminder(expires, daysBefore(1))).toBe(1);
    expect(dueReminder(expires, daysBefore(-2))).toBe(0);
  });

  it('never repeats a stage already sent for the same expiry', () => {
    const sent = { for: expires.toISOString(), stage: 7 as const };
    expect(dueReminder(expires, daysBefore(3), sent)).toBeNull();
    expect(dueReminder(expires, daysBefore(0.5), sent)).toBe(1);
    expect(dueReminder(expires, daysBefore(-1), { for: expires.toISOString(), stage: 0 })).toBeNull();
  });

  it('collapses missed stages into the most urgent one', () => {
    expect(dueReminder(expires, daysBefore(-1))).toBe(0);
  });

  it('starts over when the token is renewed with a new expiry', () => {
    const renewed = new Date('2027-02-01T12:00:00.000Z');
    const oldState = { for: expires.toISOString(), stage: 0 as const };
    expect(dueReminder(renewed, new Date('2027-01-28T12:00:00.000Z'), oldState)).toBe(7);
  });

  it('reads the expiry from channel config', () => {
    expect(parseExpiry({ tokenExpiresAt: '2026-12-01T12:00:00Z' })?.toISOString()).toBe(expires.toISOString());
    expect(parseExpiry({ tokenExpiresAt: 'soon' })).toBeNull();
    expect(parseExpiry({})).toBeNull();
    expect(parseExpiry(null)).toBeNull();
  });

  it('words the subject for each stage', () => {
    expect(reminderSubject('LinkedIn', 7)).toBe('LinkedIn connection expires in 7 days');
    expect(reminderSubject('LinkedIn', 1)).toBe('LinkedIn connection expires in 1 day');
    expect(reminderSubject('X', 0)).toBe('X connection has expired: posting is paused');
  });
});
