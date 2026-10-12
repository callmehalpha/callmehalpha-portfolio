import { createHmac } from 'crypto';
import { safeCompare } from '../common/safe-compare';

export type ApprovalAction = 'approve' | 'reject';

export interface ApprovalTokenPayload {
  itemId: string;
  action: ApprovalAction;
  /** Expiry, seconds since epoch. */
  exp: number;
}

const b64url = (buf: Buffer | string) => Buffer.from(buf).toString('base64url');

function sign(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('base64url');
}

/** `<base64url(json payload)>.<base64url(hmac)>` — the item id, the action and the expiry are all signed. */
export function createApprovalToken(payload: ApprovalTokenPayload, secret: string): string {
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body, secret)}`;
}

export type VerifyResult =
  | { ok: true; payload: ApprovalTokenPayload }
  | { ok: false; reason: 'malformed' | 'bad_signature' | 'expired' };

export function verifyApprovalToken(token: string, secret: string, nowSeconds = Math.floor(Date.now() / 1000)): VerifyResult {
  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: 'malformed' };
  const [body, sig] = parts;
  if (!safeCompare(sig, sign(body, secret))) return { ok: false, reason: 'bad_signature' };

  let payload: ApprovalTokenPayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return { ok: false, reason: 'malformed' };
  }
  if (
    typeof payload?.itemId !== 'string' ||
    (payload.action !== 'approve' && payload.action !== 'reject') ||
    typeof payload.exp !== 'number'
  ) {
    return { ok: false, reason: 'malformed' };
  }
  if (payload.exp <= nowSeconds) return { ok: false, reason: 'expired' };
  return { ok: true, payload };
}
