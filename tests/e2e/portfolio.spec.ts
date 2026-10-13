import { expect, test } from '@playwright/test';

const API = 'http://127.0.0.1:4010';
const setApiDown = (request: import('@playwright/test').APIRequestContext, down: boolean) =>
  request.post(`${API}/__mode`, { data: { down } });

test.afterEach(async ({ request }) => {
  await setApiDown(request, false);
});

test.describe('homepage, live content from the API', () => {
  test('hero, highlights and capabilities come from the profile', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('I turn business problems into shipped technology products.')).toBeVisible();
    await expect(page.getByText('Fixture intro from the API.')).toBeVisible();
    const stats = page.getByLabel('Highlights');
    await expect(stats.getByText('15,000+')).toBeVisible();
    await expect(stats.getByText('Active users on a platform I co-founded')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Fixture Capability' })).toBeVisible();
    await expect(page.getByText('Fixture philosophy')).toBeVisible();
  });

  test('offers the approved resume for download in the hero and contact sections', async ({ page }) => {
    await page.goto('/');
    const links = page.getByRole('link', { name: /Download Resume|^Resume$/ });
    await expect(links).toHaveCount(2);
    for (const link of await links.all()) {
      await expect(link).toHaveAttribute('href', 'http://127.0.0.1:4010/api/resume.pdf');
      await expect(link).toHaveAttribute('download', '');
    }
  });

  test('case studies come from the API', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#fixture-exchange')).toContainText('Fixture Exchange');
    await expect(page.locator('#atlax-exchange')).toHaveCount(0);
  });

  test('experience links each role to its case study', async ({ page }) => {
    await page.goto('/');
    const experience = page.locator('#experience');
    await expect(experience).toContainText('Full Stack Engineer · Atlax Exchange');
    await expect(experience).toContainText('Jul 2025 – Present · Remote');
    await expect(experience.getByRole('link', { name: /case study/ })).toHaveAttribute('href', '#fixture-exchange');
  });

  test('navigation has Notes and Open Source, and no Products', async ({ page }) => {
    await page.goto('/');
    const nav = page.locator('nav').first();
    await expect(nav.getByRole('link', { name: 'Open Source' })).toHaveAttribute('href', '#open-source');
    await expect(nav.getByRole('link', { name: 'Notes' })).toHaveAttribute('href', '#build-logs');
    await expect(nav.getByRole('link', { name: 'Experience' })).toBeVisible();
    await expect(nav.getByRole('link', { name: 'Products' })).toHaveCount(0);
    await expect(page.locator('#products')).toHaveCount(0);
  });

  test('open source section shows projects with their contributions', async ({ page }) => {
    await page.goto('/');
    const section = page.locator('#open-source');
    await expect(section.getByRole('heading', { name: 'Open Source Projects' })).toBeVisible();
    await expect(section.getByText('Maintainer')).toBeVisible();
    await expect(section.getByLabel('321 stars')).toBeVisible();
    await expect(section.getByRole('link', { name: /Stream attachments/ })).toHaveAttribute('href', 'https://github.com/acme/nest-mailer/pull/7');
  });

  test('technical notes open on the site, not on LinkedIn', async ({ page }) => {
    await page.goto('/');
    const notes = page.locator('#build-logs');
    await expect(notes.getByText('Fixture note 12')).toBeVisible();
    await notes.getByRole('link', { name: /Read Full Note/ }).first().click();
    await expect(page).toHaveURL(/\/notes\/note-12$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Fixture note 12' })).toBeVisible();
  });
});

test.describe('note pages', () => {
  test('renders markdown safely, with links to the social posts', async ({ page }) => {
    await page.goto('/notes/note-1');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Why "modular" wins & when it does not');
    await expect(page.getByRole('heading', { level: 2, name: 'The context' })).toBeVisible();
    await expect(page.locator('article strong')).toHaveText('modular monolith');
    expect(await page.evaluate(() => (window as unknown as { __pwned?: boolean }).__pwned)).toBeUndefined();
    await expect(page.locator('article script')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Read more' })).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(page.getByRole('link', { name: 'LinkedIn' })).toHaveAttribute('href', 'https://www.linkedin.com/feed/update/urn:li:1');
  });

  test('shows the 404 page for an unknown note', async ({ page }) => {
    await page.goto('/notes/does-not-exist');
    await expect(page.getByText(/404|not found/i).first()).toBeVisible();
  });

  test('the notes index paginates', async ({ page }) => {
    await page.goto('/notes');
    await expect(page.getByRole('heading', { level: 1, name: 'Technical Notes' })).toBeVisible();
    await expect(page.getByText('Page 1 of 2')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Fixture note 12' })).toBeVisible();
    await page.getByRole('button', { name: 'Older →' }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(page.getByText('Page 2 of 2')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Fixture note 2' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Fixture note 12' })).toHaveCount(0);
  });
});

test.describe('when the content API is down', () => {
  test('the homepage falls back to the built-in content', async ({ page, request }) => {
    await setApiDown(request, true);
    await page.goto('/');
    await expect(page.getByText('I build high-integrity systems where trust, scale, and real-world constraints matter.')).toBeVisible();
    await expect(page.locator('#atlax-exchange')).toContainText('Atlax Exchange');
    await expect(page.locator('#virtuo')).toContainText('Virtuo');
    await expect(page.locator('#build-logs')).toContainText('The Case for Modular Monoliths');
    await expect(page.locator('#experience')).toHaveCount(0);
    await expect(page.locator('#open-source')).toContainText('The first projects are on their way.');
    await expect(page.getByRole('link', { name: /Download Resume/ })).toHaveCount(0); // no resume to offer
  });

  test('the built-in note still opens on the site', async ({ page, request }) => {
    await setApiDown(request, true);
    await page.goto('/notes/the-case-for-modular-monoliths');
    await expect(page.getByRole('heading', { level: 1, name: 'The Case for Modular Monoliths' })).toBeVisible();
    await expect(page.getByText(/^Early in Virtuo/)).toBeVisible();
  });
});

test.describe('server-side SEO (what link previews see, before any JavaScript)', () => {
  test('note pages get the note title, description and canonical URL, escaped', async ({ request }) => {
    const res = await request.get('/notes/note-1?utm_source=linkedin');
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toContain('<title>Why &quot;modular&quot; wins &amp; when it does not | Callmehalpha</title>');
    expect(html).toMatch(/<meta property="og:title" content="Why &quot;modular&quot; wins &amp; when it does not \| Callmehalpha">/);
    expect(html).toMatch(/<meta name="description"\s+content="Excerpt for note 1">/);
    expect(html).toContain('<meta property="og:type" content="article">');
    expect(html).toContain('<link rel="canonical" href="https://abdulazeez.usaiy.xyz/notes/note-1">');
  });

  test('the homepage carries Person structured data from the profile', async ({ request }) => {
    const html = await (await request.get('/')).text();
    const json = /<script type="application\/ld\+json">(.*?)<\/script>/.exec(html)?.[1];
    expect(JSON.parse(json!)).toMatchObject({ '@type': 'Person', jobTitle: 'Technical Product Builder', knowsAbout: ['NestJS', 'Go'] });
  });

  test('product pages keep their SEO and still render', async ({ page, request }) => {
    const html = await (await request.get('/products/ai-job-kit')).text();
    expect(html).toContain('<title>AI Job Hunter Kit | Land Interviews in 11 Days</title>');
    await page.goto('/products/ai-job-kit');
    await expect(page.getByText('AI Job Hunter Kit').first()).toBeVisible();
  });

  test('rejects malformed and traversal URLs without crashing', async ({ request }) => {
    expect((await request.get('/%E0%A4%A')).status()).toBe(400);
    expect((await request.get('/..%2f..%2fpackage.json')).status()).toBe(403);
    expect((await request.get('/')).status()).toBe(200);
  });
});
