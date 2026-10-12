import { createApprovalToken, verifyApprovalToken } from './approval-token';

const secret = 's'.repeat(32);
const now = 1_800_000_000;

describe('approval tokens', () => {
  it('round-trips a valid token', () => {
    const token = createApprovalToken({ itemId: 'abc', action: 'approve', exp: now + 60 }, secret);
    expect(verifyApprovalToken(token, secret, now)).toEqual({
      ok: true,
      payload: { itemId: 'abc', action: 'approve', exp: now + 60 },
    });
  });

  it('rejects a token signed with another secret', () => {
    const token = createApprovalToken({ itemId: 'abc', action: 'approve', exp: now + 60 }, 'other'.repeat(8));
    expect(verifyApprovalToken(token, secret, now)).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('rejects a reject-link edited into an approve-link', () => {
    const token = createApprovalToken({ itemId: 'abc', action: 'reject', exp: now + 60 }, secret);
    const [, sig] = token.split('.');
    const forgedBody = Buffer.from(JSON.stringify({ itemId: 'abc', action: 'approve', exp: now + 60 })).toString('base64url');
    expect(verifyApprovalToken(`${forgedBody}.${sig}`, secret, now)).toEqual({ ok: false, reason: 'bad_signature' });
  });

  it('rejects an expired token', () => {
    const token = createApprovalToken({ itemId: 'abc', action: 'approve', exp: now }, secret);
    expect(verifyApprovalToken(token, secret, now)).toEqual({ ok: false, reason: 'expired' });
  });

  it.each(['', 'abc', 'a.b.c', '.sig'])('rejects malformed token %p', (token) => {
    expect(verifyApprovalToken(token, secret, now).ok).toBe(false);
  });

  it('rejects a correctly signed body that is not a valid payload', () => {
    const { createHmac } = jest.requireActual('crypto');
    const body = Buffer.from(JSON.stringify({ itemId: 1, action: 'delete' })).toString('base64url');
    const sig = createHmac('sha256', secret).update(body).digest('base64url');
    expect(verifyApprovalToken(`${body}.${sig}`, secret, now)).toEqual({ ok: false, reason: 'malformed' });
  });
});
