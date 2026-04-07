import { test, expect, chromium, BrowserContext } from '@playwright/test';
import path from 'path';

const EXTENSION_PATH = path.resolve(__dirname, '../dist');
const BOKELAI_URL = 'https://www.books.com.tw/web/sys_bbotm/books/010101';

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

test('Bokelai bestseller page: extension injects ratings', async () => {
  const page = await context.newPage();
  await page.goto(BOKELAI_URL, { waitUntil: 'domcontentloaded' });

  // Wait for extension to process books
  await page.waitForSelector('.bra-processed', { timeout: 15000 });

  const processedCount = await page.locator('.bra-processed').count();
  console.log(`Bokelai - Processed book items: ${processedCount}`);
  expect(processedCount).toBeGreaterThan(0);

  // Wait for Goodreads API responses
  await page.waitForTimeout(5000);

  const ratingCount = await page.locator('.bra-rating-wrapper').count();
  console.log(`Bokelai - Rating wrappers injected: ${ratingCount}`);

  // Screenshot
  await page.locator('.bra-rating-wrapper').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'e2e/screenshots/bokelai-bestseller.png', fullPage: false });

  expect(ratingCount).toBeGreaterThan(0);

  const firstRating = page.locator('.bra-rating-wrapper').first();
  await expect(firstRating.locator('.bra-rating-score')).toBeVisible();
});
