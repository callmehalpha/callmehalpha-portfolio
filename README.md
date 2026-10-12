<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Callmehalpha portfolio

React + Vite single-page site served by `server.mjs`, which also injects per-page SEO
(link previews for notes and products, Person structured data on the homepage).

Content (Technical Notes, Case Studies, Open Source Projects, hero copy and Experience) comes
from the [content engine](content-engine/README.md). When the engine isn't configured or is
down, the site falls back to the copy in `src/data/constants.tsx`, so it always renders.

## Run locally

```bash
npm install
npm run dev                                   # static content only
VITE_CONTENT_API_URL=http://localhost:3000 npm run dev   # with a local content engine
```

## Production

```bash
VITE_CONTENT_API_URL=https://api.usaiy.xyz npm run build      # API the browser calls
CONTENT_API_URL=http://localhost:3000 npm start               # API server.mjs calls for SEO
```

## Tests

```bash
npm run typecheck
npm run test:unit     # Vitest: API client, fallbacks, components, markdown sanitising, server SEO
npm run test:e2e      # Playwright: builds the site, runs server.mjs against a mock content API
```

In this repo's cloud sandbox, point Playwright at the preinstalled browser:
`PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:e2e`.
