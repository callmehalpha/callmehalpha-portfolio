import { markdownToHtml, renderEmail, safeUrl } from './email-template';

describe('email template', () => {
  it('renders headings, bullets, paragraphs and bold', () => {
    const html = markdownToHtml('# Draft ready\n\nA **new** note.\nSecond line\n\n- one\n- two');
    expect(html).toContain('<h2 style="margin:16px 0 8px">Draft ready</h2>');
    expect(html).toContain('A <strong>new</strong> note.<br>Second line');
    expect(html).toContain('<ul><li>one</li><li>two</li></ul>');
  });

  it('escapes HTML coming from LLM output', () => {
    const html = markdownToHtml('<script>alert(1)</script> & "quotes"');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;quotes&quot;');
  });

  it('renders only http(s) action links as buttons', () => {
    const out = renderEmail({
      subject: 'Approve',
      markdown: 'x',
      actions: [
        { label: 'Approve', url: 'https://api.example.com/approvals/confirm?token=a.b', style: 'primary' },
        { label: 'Evil', url: 'javascript:alert(1)' },
      ],
    });
    expect(out.html).toContain('href="https://api.example.com/approvals/confirm?token=a.b"');
    expect(out.html).toContain('background:#4f46e5');
    expect(out.html).not.toContain('Evil');
    expect(out.text).toContain('Approve: https://api.example.com/approvals/confirm?token=a.b');
  });

  it('strips newlines from the subject (header injection)', () => {
    expect(renderEmail({ subject: 'Hi\r\nBcc: x@y.z', markdown: 'x' }).subject).toBe('Hi Bcc: x@y.z');
  });

  it('validates URLs', () => {
    expect(safeUrl('not a url')).toBeNull();
    expect(safeUrl('data:text/html,hi')).toBeNull();
    expect(safeUrl('http://localhost:3000/x')).toBe('http://localhost:3000/x');
  });
});
