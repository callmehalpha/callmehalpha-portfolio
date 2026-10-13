import { ResumeContent } from './curate';

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Only http(s) and mailto links make it into the PDF. */
function href(url: string | undefined): string | null {
  if (!url) return null;
  return /^(https?:\/\/|mailto:)/i.test(url) ? escape(url) : null;
}

function link(text: string, url?: string): string {
  const h = href(url);
  return h ? `<a href="${h}">${escape(text)}</a>` : escape(text);
}

const section = (title: string, body: string) => (body.trim() ? `<section><h2>${escape(title)}</h2>${body}</section>` : '');

/**
 * ATS-friendly HTML for Gotenberg: one column, real text, standard section names,
 * no tables, no text in images. Print CSS keeps it to A4 with sensible breaks.
 */
export function renderResumeHtml(c: ResumeContent): string {
  const contact = c.contact.map((x) => link(x.label, x.url)).join(' <span class="sep">·</span> ');

  const experience = c.experience
    .map(
      (job) => `<article class="job">
<div class="row"><h3>${escape(job.position)} <span class="at">· ${link(job.company, job.link)}</span></h3><span class="dates">${escape(job.dates)}${job.location ? ` · ${escape(job.location)}` : ''}</span></div>
${job.summary ? `<p class="summary">${escape(job.summary)}</p>` : ''}
${job.bullets.length ? `<ul>${job.bullets.map((b) => `<li>${escape(b)}</li>`).join('')}</ul>` : ''}
</article>`,
    )
    .join('\n');

  const projects = c.projects.length
    ? `<ul class="compact">${c.projects.map((p) => `<li><strong>${link(p.name, p.url)}</strong>: ${escape(p.line)} <span class="more">(${link('case study', p.link)})</span></li>`).join('')}</ul>`
    : '';

  const oss = c.openSource.length
    ? `<ul class="compact">${c.openSource.map((o) => `<li><strong>${link(o.name, o.url)}</strong>: ${escape(o.line)}</li>`).join('')}</ul>`
    : '';

  const skills = c.skills.length
    ? `<ul class="skills">${c.skills.map((s) => `<li><strong>${escape(s.group)}:</strong> ${escape(s.items.join(', '))}</li>`).join('')}</ul>`
    : '';

  const education = c.education.length
    ? `<ul class="compact">${c.education.map((e) => `<li>${escape(e.line)}${e.dates ? ` <span class="dates">${escape(e.dates)}</span>` : ''}</li>`).join('')}</ul>`
    : '';

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${escape(c.name)} – Resume</title>
<style>
@page { size: A4; margin: 14mm 15mm; }
* { box-sizing: border-box; }
body { font-family: "Liberation Sans", Arial, Helvetica, sans-serif; font-size: 10pt; line-height: 1.38; color: #111; margin: 0; }
header { margin-bottom: 10pt; }
h1 { font-size: 20pt; margin: 0; }
.label { font-size: 11.5pt; font-weight: 600; color: #3730a3; margin: 2pt 0 4pt; }
.contact { font-size: 9pt; color: #333; }
.contact a { color: #333; }
.sep { color: #999; }
h2 { font-size: 10.5pt; text-transform: uppercase; color: #3730a3; border-bottom: 0.8pt solid #c7c9e8; padding-bottom: 2pt; margin: 11pt 0 5pt; }
h3 { font-size: 10.5pt; margin: 0; }
.at { font-weight: 400; color: #333; }
a { color: inherit; text-decoration: none; }
.row { display: flex; justify-content: space-between; align-items: baseline; gap: 8pt; }
.dates { font-size: 9pt; color: #555; white-space: nowrap; }
.job { margin-bottom: 7pt; break-inside: avoid; }
.summary { margin: 1pt 0 2pt; color: #333; font-style: italic; }
ul { margin: 2pt 0 0; padding-left: 13pt; }
li { margin: 0 0 1.5pt; }
.compact li, .skills li { margin-bottom: 2pt; }
.skills { list-style: none; padding-left: 0; }
.more { color: #555; font-size: 9pt; }
.highlights { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 3pt 14pt; }
.highlights li { font-weight: 600; }
section { break-inside: auto; }
h2 { break-after: avoid; }
</style></head>
<body>
<header>
<h1>${escape(c.name)}</h1>
<p class="label">${escape(c.label)}</p>
<p class="contact">${contact}</p>
</header>
${section('Summary', `<p>${escape(c.summary)}</p>${c.highlights.length ? `<ul class="highlights">${c.highlights.map((h) => `<li>${escape(h)}</li>`).join('')}</ul>` : ''}`)}
${section('Experience', experience)}
${section('Selected Projects', projects)}
${section('Open Source', oss)}
${section('Skills', skills)}
${section('Education', education)}
</body></html>`;
}
