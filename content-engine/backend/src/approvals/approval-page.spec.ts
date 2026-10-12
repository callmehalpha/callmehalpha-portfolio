import { confirmPage, resultPage } from './approval-page';

describe('approval pages', () => {
  it('puts the decision behind a POST form', () => {
    const html = confirmPage({ token: 'a.b', action: 'approve', entityLabel: 'technical note' });
    expect(html).toContain('<form method="post" action="/approvals/decide">');
    expect(html).toContain('<input type="hidden" name="token" value="a.b">');
    expect(html).toContain('<meta name="robots" content="noindex">');
  });

  it('escapes everything it prints', () => {
    const html = confirmPage({ token: '"><script>x</script>', action: 'reject', entityLabel: '<b>x</b>' });
    expect(html).not.toContain('<script>x</script>');
    expect(html).not.toContain('<b>x</b>');
    expect(resultPage('<i>', '<u>')).not.toMatch(/<i>|<u>/);
  });
});
