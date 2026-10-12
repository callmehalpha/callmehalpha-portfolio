export function slugify(input: string, maxLength = 80): string {
  const slug = input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
  return slug || 'untitled';
}

/** Returns `base`, or `base-2`, `base-3`, … — the first one `isTaken` says is free. */
export async function uniqueSlug(base: string, isTaken: (slug: string) => Promise<boolean>): Promise<string> {
  const root = slugify(base);
  if (!(await isTaken(root))) return root;
  for (let n = 2; n < 1000; n++) {
    const candidate = `${root}-${n}`;
    if (!(await isTaken(candidate))) return candidate;
  }
  throw new Error(`No free slug for "${root}"`);
}
