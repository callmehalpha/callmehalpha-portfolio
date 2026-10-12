import { withRetry } from './retry';

describe('withRetry', () => {
  it('returns as soon as an attempt succeeds', async () => {
    const sleep = jest.fn().mockResolvedValue(undefined);
    let calls = 0;
    const result = await withRetry(async () => {
      calls++;
      if (calls < 3) throw new Error('boom');
      return 'ok';
    }, { attempts: 5, baseDelayMs: 100, sleep });
    expect(result).toBe('ok');
    expect(calls).toBe(3);
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([100, 200]);
  });

  it('rethrows the last error after the final attempt without sleeping again', async () => {
    const sleep = jest.fn().mockResolvedValue(undefined);
    await expect(
      withRetry(async (n) => {
        throw new Error(`fail ${n}`);
      }, { attempts: 3, baseDelayMs: 10, sleep }),
    ).rejects.toThrow('fail 3');
    expect(sleep).toHaveBeenCalledTimes(2);
  });
});
