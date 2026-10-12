import { defineConfig } from '@playwright/test';

const API_PORT = 4010;
const SITE_PORT = 4173;
const API_URL = `http://127.0.0.1:${API_PORT}`;

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  workers: 1, // the mock API's up/down switch is shared
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${SITE_PORT}`,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } : {},
  },
  webServer: [
    {
      command: 'node tests/e2e/mock-api.mjs',
      url: `${API_URL}/health`,
      env: { MOCK_API_PORT: String(API_PORT) },
      reuseExistingServer: !process.env.CI,
    },
    {
      // The browser and server.mjs both talk to the mock API.
      command: `npx vite build --outDir dist && node server.mjs`,
      url: `http://127.0.0.1:${SITE_PORT}/`,
      env: { PORT: String(SITE_PORT), VITE_CONTENT_API_URL: API_URL, CONTENT_API_URL: API_URL },
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
