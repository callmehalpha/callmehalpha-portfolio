import { previewText } from './preview';

describe('previewText', () => {
  it('strips markdown syntax, code blocks, images and html', () => {
    const md = '## Context\n\nWe chose a **modular monolith** — see [the post](https://x.y).\n\n```ts\nconst x = 1;\n```\n\n![diagram](d.png) <b>done</b>\n- `queue` workers';
    expect(previewText(md)).toBe('Context We chose a modular monolith — see the post. done queue workers');
  });

  it('cuts long text at a word boundary with an ellipsis', () => {
    const out = previewText('word '.repeat(100), 50);
    expect(out.length).toBeLessThanOrEqual(51);
    expect(out.endsWith('word…')).toBe(true);
  });

  it('leaves short text alone', () => {
    expect(previewText('Short note.')).toBe('Short note.');
  });
});
