import { createHash } from 'crypto';
import matter from 'gray-matter';
import { z } from 'zod';

export const frontmatterSchema = z
  .object({
    project: z.string().min(1).optional(),
    kind: z.enum(['client', 'product', 'oss']).optional(),
    repo: z.string().optional(),
    role: z.enum(['author', 'maintainer', 'contributor']).optional(),
    period: z.string().optional(),
    audience: z.string().optional(),
    angle: z.string().optional(),
    outputs: z.array(z.enum(['note', 'case_study', 'oss'])).optional(),
    channels: z.array(z.string()).optional(),
    publish: z.boolean().optional(),
  })
  .passthrough();

export type Frontmatter = z.infer<typeof frontmatterSchema>;

export interface ParsedDocument {
  frontmatter: Frontmatter;
  body: string;
  /** Problems with the frontmatter; the document is still accepted and the router decides. */
  warnings: string[];
}

export function sha256(content: string | Buffer): string {
  return createHash('sha256').update(content).digest('hex');
}

export function parseMarkdown(raw: string): ParsedDocument {
  let data: Record<string, unknown> = {};
  let body = raw;
  const warnings: string[] = [];
  try {
    const parsed = matter(raw);
    data = parsed.data ?? {};
    body = parsed.content;
  } catch (err) {
    warnings.push(`Frontmatter could not be parsed: ${(err as Error).message}`);
  }

  const result = frontmatterSchema.safeParse(data);
  if (result.success) return { frontmatter: result.data, body, warnings };

  // Keep the valid fields, drop the invalid ones, and say which.
  const bad = new Set(result.error.issues.map((i) => String(i.path[0])));
  for (const key of bad) warnings.push(`Ignored invalid frontmatter field "${key}"`);
  const cleaned = Object.fromEntries(Object.entries(data).filter(([k]) => !bad.has(k)));
  return { frontmatter: frontmatterSchema.parse(cleaned), body, warnings };
}
