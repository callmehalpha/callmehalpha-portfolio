import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useContent } from '../../src/lib/useContent';

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

const Probe = ({ load }: { load: () => Promise<string> }) => {
  const { data, status } = useContent(load, 'fallback');
  return <p>{`${status}:${data}`}</p>;
};

describe('useContent', () => {
  it('shows the fallback at once, then the live data', async () => {
    const d = deferred<string>();
    render(<Probe load={() => d.promise} />);
    expect(screen.getByText('loading:fallback')).toBeInTheDocument();
    await act(async () => d.resolve('live'));
    expect(screen.getByText('live:live')).toBeInTheDocument();
  });

  it('stays on the fallback when the API fails', async () => {
    const d = deferred<string>();
    render(<Probe load={() => d.promise} />);
    await act(async () => d.reject(new Error('down')));
    expect(screen.getByText('fallback:fallback')).toBeInTheDocument();
  });

  it('ignores a late answer after unmount', async () => {
    const d = deferred<string>();
    const { unmount } = render(<Probe load={() => d.promise} />);
    unmount();
    await act(async () => d.resolve('late'));
    expect(screen.queryByText(/late/)).toBeNull();
  });
});
