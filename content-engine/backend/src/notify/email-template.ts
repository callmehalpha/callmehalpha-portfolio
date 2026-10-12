export interface EmailAction {
  label: string;
  url: string;
  style?: 'primary' | 'danger' | 'default';
}

export interface EmailContent {
  subject: string;
  /** Plain text with a few markdown conventions: blank-line paragraphs, `# ` headings, `- ` bullets, **bold**. */
  markdown: string;
  actions?: EmailAction[];
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const inline = (s: string) => escape(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

const COLORS = { primary: '#4f46e5', danger: '#b91c1c', default: '#3f3f46' };

/** Only http(s) links become buttons; anything else (javascript:, data:) is dropped. */
export function safeUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null;
  } catch {
    return null;
  }
}

export function markdownToHtml(md: string): string {
  return md
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      const heading = /^(#{1,3}) (.*)$/.exec(block);
      if (heading && !block.includes('\n')) {
        const level = heading[1].length + 1;
        return `<h${level} style="margin:16px 0 8px">${inline(heading[2])}</h${level}>`;
      }
      const lines = block.split('\n');
      if (lines.every((l) => /^[-*] /.test(l))) {
        return `<ul>${lines.map((l) => `<li>${inline(l.slice(2))}</li>`).join('')}</ul>`;
      }
      return `<p style="margin:0 0 12px;line-height:1.5">${lines.map(inline).join('<br>')}</p>`;
    })
    .join('\n');
}

export function renderEmail(content: EmailContent): { subject: string; html: string; text: string } {
  const buttons = (content.actions ?? [])
    .map((a) => ({ ...a, href: safeUrl(a.url) }))
    .filter((a): a is EmailAction & { href: string } => a.href !== null);

  const actionsHtml = buttons.length
    ? `<p style="margin:24px 0">${buttons
        .map(
          (a) =>
            `<a href="${escape(a.href)}" style="display:inline-block;margin:0 8px 8px 0;padding:12px 20px;border-radius:8px;background:${COLORS[a.style ?? 'default']};color:#fff;text-decoration:none;font-weight:600">${escape(a.label)}</a>`,
        )
        .join('')}</p>`
    : '';

  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f4f4f5;font-family:system-ui,sans-serif;color:#18181b">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;padding:32px">
${markdownToHtml(content.markdown)}
${actionsHtml}
</div></body></html>`;

  const text = [content.markdown, ...buttons.map((a) => `${a.label}: ${a.href}`)].join('\n\n');
  return { subject: content.subject.replace(/[\r\n]+/g, ' ').trim(), html, text };
}
