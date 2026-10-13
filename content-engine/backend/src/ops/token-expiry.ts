const DAY_MS = 86_400_000;

/** Reminder stages, in days before expiry. 0 means "it has expired". */
export const REMINDER_STAGES = [7, 1, 0] as const;
export type ReminderStage = (typeof REMINDER_STAGES)[number];

export interface ExpiryState {
  /** ISO timestamp the reminders below were sent for. A new expiry date starts over. */
  for: string;
  /** The most urgent stage already emailed for that expiry. */
  stage: ReminderStage;
}

/**
 * Which reminder, if any, is due now. Returns the most urgent stage that has been reached
 * and not yet sent for this expiry date; null when nothing is due. Skipped stages
 * (e.g. the service was down at T-7) collapse into the most urgent one, so one email goes out.
 */
export function dueReminder(expiresAt: Date, now: Date, sent?: ExpiryState | null): ReminderStage | null {
  const daysLeft = (expiresAt.getTime() - now.getTime()) / DAY_MS;
  const reached = REMINDER_STAGES.filter((stage) => daysLeft <= stage);
  if (reached.length === 0) return null;
  const due = reached[reached.length - 1];
  const alreadySent = sent && sent.for === expiresAt.toISOString() ? sent.stage : null;
  if (alreadySent !== null && alreadySent <= due) return null;
  return due;
}

export function reminderSubject(channelName: string, stage: ReminderStage): string {
  if (stage === 0) return `${channelName} connection has expired: posting is paused`;
  return `${channelName} connection expires in ${stage === 1 ? '1 day' : `${stage} days`}`;
}

/** Parses `config.tokenExpiresAt`; null when missing or not a valid date. */
export function parseExpiry(config: unknown): Date | null {
  const raw = (config as { tokenExpiresAt?: unknown } | null)?.tokenExpiresAt;
  if (typeof raw !== 'string') return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}
