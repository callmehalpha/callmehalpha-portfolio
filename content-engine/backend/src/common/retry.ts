export interface RetryOptions {
  attempts: number;
  baseDelayMs: number;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Retries `fn` with exponential backoff: base, 2×base, 4×base, … Rethrows the last error. */
export async function withRetry<T>(fn: (attempt: number) => Promise<T>, opts: RetryOptions): Promise<T> {
  const sleep = opts.sleep ?? defaultSleep;
  let lastError: unknown;
  for (let attempt = 1; attempt <= opts.attempts; attempt++) {
    try {
      return await fn(attempt);
    } catch (err) {
      lastError = err;
      if (attempt < opts.attempts) await sleep(opts.baseDelayMs * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}
