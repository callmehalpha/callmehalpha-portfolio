const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function layout(title: string, body: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>${escape(title)}</title>
<style>body{font-family:system-ui,sans-serif;background:#0a0a0a;color:#e4e4e7;display:grid;place-items:center;min-height:100vh;margin:0;padding:16px}
main{max-width:480px;width:100%;background:#18181b;border:1px solid #27272a;border-radius:12px;padding:32px}
h1{font-size:20px;margin:0 0 8px}p{color:#a1a1aa;line-height:1.5}
button{font:inherit;font-weight:600;border:0;border-radius:8px;padding:12px 20px;cursor:pointer;color:#fff}
.approve{background:#4f46e5}.reject{background:#b91c1c}</style></head>
<body><main>${body}</main></body></html>`;
}

/**
 * Step one of a decision: a page with a button. The decision only happens on POST,
 * so email link scanners that pre-fetch links can't approve anything.
 */
export function confirmPage(opts: { token: string; action: 'approve' | 'reject'; entityLabel: string }): string {
  const verb = opts.action === 'approve' ? 'Approve' : 'Reject';
  return layout(
    `${verb} ${opts.entityLabel}`,
    `<h1>${verb} ${escape(opts.entityLabel)}?</h1>
<p>This can't be undone from here.</p>
<form method="post" action="/approvals/decide">
<input type="hidden" name="token" value="${escape(opts.token)}">
<button type="submit" class="${opts.action}">${verb}</button>
</form>`,
  );
}

export function resultPage(title: string, message: string): string {
  return layout(title, `<h1>${escape(title)}</h1><p>${escape(message)}</p>`);
}
