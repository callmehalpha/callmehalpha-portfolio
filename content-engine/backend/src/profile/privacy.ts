export type Visibility = 'public' | 'private';
export type PrivacyMap = Record<string, Visibility>;

/** Fields that stay private unless the privacy map explicitly makes them public. */
export const DEFAULT_PRIVATE_PATHS = ['basics.phone', 'basics.location.address', 'basics.location.postalCode'];

function deletePath(target: Record<string, unknown>, path: string[]): void {
  const [head, ...rest] = path;
  if (target == null || typeof target !== 'object' || !(head in target)) return;
  if (rest.length === 0) {
    delete target[head];
    return;
  }
  const next = target[head];
  if (Array.isArray(next)) {
    for (const item of next) deletePath(item as Record<string, unknown>, rest);
  } else {
    deletePath(next as Record<string, unknown>, rest);
  }
}

/**
 * Returns a copy of `data` without private fields. A path is private when the
 * map says "private", or when it is a default-private path the map doesn't make public.
 * Paths go through arrays, so `work.phone` applies to every work entry.
 */
export function applyPrivacy<T>(data: T, privacy: PrivacyMap = {}): T {
  const copy = structuredClone(data) as Record<string, unknown>;
  const privatePaths = new Set(DEFAULT_PRIVATE_PATHS.filter((p) => privacy[p] !== 'public'));
  for (const [path, visibility] of Object.entries(privacy)) {
    if (visibility === 'private') privatePaths.add(path);
  }
  for (const path of privatePaths) deletePath(copy, path.split('.'));
  return copy as T;
}
