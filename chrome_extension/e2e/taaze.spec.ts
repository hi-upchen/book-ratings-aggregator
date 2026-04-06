import { test, expect, chromium, BrowserContext } from '@playwright/test';
import path from 'path';

const EXTENSION_PATH = path.resolve(__dirname, '../dist');
const TAAZE_HOME_URL = 'https://www.taaze.tw/';

let context: BrowserContext;

test.beforeAll(async () => {
  context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  });
});

test.afterAll(async () => {
  await context.close();
});

test('Taaze homepage: extension injects ratings', async () => {
  const page = await context.newPage();
  await page.goto(TAAZE_HOME_URL, { waitUntil: 'networkidle', timeout: 20000 });

  // Wait for extension to process books
  await page.waitForSelector('.bra-processed', { timeout: 15000 });

  const processedCount = await page.locator('.bra-processed').count();
  console.log(`Taaze - Processed book items: ${processedCount}`);
  expect(processedCount).toBeGreaterThan(0);

  // Wait for Goodreads API responses
  await page.waitForTimeout(5000);

  const ratingCount = await page.locator('.bra-rating-wrapper').count();
  console.log(`Taaze - Rating wrappers injected: ${ratingCount}`);

  // Screenshot the book area
  const bestSell = page.locator('.bestSell').first();
  if (await bestSell.count() > 0) {
    await bestSell.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: 'e2e/screenshots/taaze-home.png', fullPage: false });

  // Scroll down to see more books with ratings
  const ratingEl = page.locator('.bra-rating-wrapper').first();
  if (await ratingEl.count() > 0) {
    await ratingEl.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'e2e/screenshots/taaze-home-ratings.png', fullPage: false });
  }

  expect(ratingCount).toBeGreaterThan(0);

  const firstRating = page.locator('.bra-rating-wrapper').first();
  await expect(firstRating.locator('.bra-rating-score')).toBeVisible();
});
