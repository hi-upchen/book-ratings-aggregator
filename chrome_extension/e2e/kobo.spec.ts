import { test, expect, chromium, BrowserContext } from '@playwright/test';
import path from 'path';

const EXTENSION_PATH = path.resolve(__dirname, '../dist');
const KOBO_BESTSELLERS_URL = 'https://www.kobo.com/tw/zh/list/qi-shi-ni-yi-jing-hen-cong-ming-le/Wg-go13NRjaz8NYFsmt1Gg';

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

test('Kobo book list page: extension injects ratings', async () => {
  const page = await context.newPage();
  await page.goto(KOBO_BESTSELLERS_URL, { waitUntil: 'domcontentloaded' });

  // Wait for Kobo to render book items
  await page.waitForSelector('.item-detail, .book-detail, a[href*="/ebook/"]', { timeout: 15000 });

  // Wait for extension to process books
  await page.waitForSelector('.bra-processed', { timeout: 15000 });

  const processedCount = await page.locator('.bra-processed').count();
  console.log(`Kobo - Processed book items: ${processedCount}`);
  expect(processedCount).toBeGreaterThan(0);

  // Wait for Goodreads API responses
  await page.waitForTimeout(5000);

  const ratingCount = await page.locator('.bra-rating-wrapper').count();
  console.log(`Kobo - Rating wrappers injected: ${ratingCount}`);

  // Scroll to book area and screenshot
  await page.locator('.bra-rating-wrapper').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'e2e/screenshots/kobo-list.png', fullPage: false });

  expect(ratingCount).toBeGreaterThan(0);

  // Verify rating content structure
  const firstRating = page.locator('.bra-rating-wrapper').first();
  await expect(firstRating.locator('.bra-rating-score')).toBeVisible();
});
