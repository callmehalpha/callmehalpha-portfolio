import { useEffect, useState } from 'react';

export type ContentStatus = 'loading' | 'live' | 'fallback';

/**
 * Renders `fallback` straight away (no empty flash, works with the API down), then swaps in
 * the live data when `load` resolves. `deps` re-runs the load, like useEffect.
 */
export function useContent<T>(
  load: (signal: AbortSignal) => Promise<T>,
  fallback: T,
  deps: unknown[] = [],
): { data: T; status: ContentStatus } {
  const [state, setState] = useState<{ data: T; status: ContentStatus }>({ data: fallback, status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    setState((s) => ({ ...s, status: 'loading' }));
    load(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ data, status: 'live' });
      },
      () => {
        if (!controller.signal.aborted) setState({ data: fallback, status: 'fallback' });
      },
    );
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
