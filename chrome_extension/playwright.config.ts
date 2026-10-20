import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  retries: 1,
  workers: 1,
  reporter: [
    ['list'],
  ],
  use: {
    // The new headless mode runs extensions without opening a window.
    channel: 'chromium',
    headless: true,
    viewport: { width: 1280, height: 800 },
    locale: 'zh-TW',
    // Kobo's bot filter blocks the default headless user agent.
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    screenshot: 'only-on-failure',
  },
});
