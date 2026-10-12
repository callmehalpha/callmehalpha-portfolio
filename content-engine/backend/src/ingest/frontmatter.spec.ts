import { parseMarkdown, sha256 } from './frontmatter';

describe('parseMarkdown', () => {
  it('splits frontmatter from the body', () => {
    const doc = parseMarkdown(`---\nproject: atlax-exchange\noutputs: [note, case_study]\npublish: true\n---\n\n## Commits\n- abc fix`);
    expect(doc.frontmatter).toEqual({ project: 'atlax-exchange', outputs: ['note', 'case_study'], publish: true });
    expect(doc.body.trim()).toBe('## Commits\n- abc fix');
    expect(doc.warnings).toEqual([]);
  });

  it('accepts a document with no frontmatter', () => {
    const doc = parseMarkdown('# Just notes');
    expect(doc.frontmatter).toEqual({});
    expect(doc.body).toBe('# Just notes');
  });

  it('keeps valid fields and warns about invalid ones', () => {
    const doc = parseMarkdown(`---\nproject: circlify\nkind: spaceship\noutputs: [tweet]\n---\nbody`);
    expect(doc.frontmatter).toEqual({ project: 'circlify' });
    expect(doc.warnings).toEqual([
      'Ignored invalid frontmatter field "kind"',
      'Ignored invalid frontmatter field "outputs"',
    ]);
  });

  it('keeps unknown extra fields for the router', () => {
    expect(parseMarkdown(`---\nmood: proud\n---\nx`).frontmatter).toEqual({ mood: 'proud' });
  });

  it('survives broken YAML', () => {
    const doc = parseMarkdown(`---\nproject: [unclosed\n---\nbody`);
    expect(doc.frontmatter).toEqual({});
    expect(doc.warnings[0]).toMatch(/could not be parsed/);
  });
});

describe('sha256', () => {
  it('is stable and content-sensitive', () => {
    expect(sha256('a')).toBe(sha256(Buffer.from('a')));
    expect(sha256('a')).not.toBe(sha256('a '));
  });
});
